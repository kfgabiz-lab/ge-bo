"use client";

import type React from "react";

/**
 * useWidgetPageState — 위젯 페이지 공통 상태 관리 훅
 *
 * /admin/widget/[slug]/page.tsx 와 TabRenderer 양쪽에서 공통으로 사용.
 * widgetItems를 받아 검색·테이블·폼·서브리스트·카테고리·파일업로드·멀티셀렉트 상태를 관리하고
 * PageGridRenderer에 필요한 모든 핸들러를 반환한다.
 *
 * 사용법:
 *   const state = useWidgetPageState(widgetItems, pageSlug);
 *   <PageGridRenderer mode="live" widgetItems={widgetItems} {...state.gridProps} />
 *
 * options.onGoBack: 저장/삭제 후 이동 처리. 운영 페이지는 router.back(), 탭은 undefined(이동 없음).
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useLeaveCheck } from "./useLeaveCheck";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import { buildDataJson, buildDataSavePayload, validateFormFields, validateSubListRows, uploadFiles, flattenPageDataItem, applySortChange, initFormDefaultValues, validateDataSaveWidgets, saveTableRows, processFormFilesAndSubList, evalFieldCondition, validateSearchDateRange, parseActionParams } from "../utils";
import { entityApiPath, entityItemPath, normalizeEntityRow, normalizeEntityPageEnvelope, buildEntityRequestBody, buildEntityDateFieldMeta, buildSubListEntityDateFieldMeta, restoreEntityDateFields } from "../utils/entityApi";
import { FILE_FIELD_TYPES } from "../constants";
import { useI18n } from "@/hooks/use-i18n";
import type { PageWidgetItem, PageTableData } from "../components/renderer/PageGridRenderer";
import type { AnyWidget } from "../components/renderer/types";
import type { TableWidget } from "../components/builder/TableBuilder";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { SubListWidget, MultiSelectWidget } from "../components/renderer/types";
import type { SubListRow } from "../components/renderer/SubListRenderer";
import type { ApiInfoOption } from "../components/builder/fields/ApiInfoSelectField";
import type { SearchFieldConfig } from "../types";
import type { ConnectedType } from "./useOutputMode";

const DEFAULT_PAGE_SIZE = 10;

/** widgetItems 배열을 평탄화하여 모든 위젯 반환 */
export function flatWidgets(items: PageWidgetItem[]): AnyWidget[] {
  return items.flatMap((item) => item.contents.map((c) => c.widget));
}

/** 대상 위젯의 connectedSlug가 비어있을 때만 기본값을 채운다(fill-if-empty).
 * 위젯 자신이 이미 값을 가지면 그대로 둔다(개별 지정 우선). defaultSlug가 빈 값이면 원본 그대로 반환.
 * - 위젯 빌더(widget/page.tsx)의 저장 시점(handleSaveConfirm)에서 공용 사용
 * - live 렌더링(이 파일의 useWidgetPageState 훅)은 위젯에 connectedSlug가 없으면
 *   데이터 저장/조회를 조용히 스킵하므로, 빌더 쪽에서 반드시 이 함수로 stamp 되어야 함
 * - item.contents 2단 구조로 순회(flatWidgets와 동일 구조, 탭 내부 재귀는 하지 않음 — 기존 동작 유지)
 * @param widgetItems  원본 위젯 목록 (불변 — 새 배열을 반환)
 * @param defaultSlug  비어있는 위젯에 채울 기본 slug
 * @param targetTypes  적용 대상 위젯 타입 (기본: form/table/sublist/multiselect 전부)
 * @example stampConnectedSlug(widgetItems, 'banner-list') // 대상 타입 중 connectedSlug 없는 위젯만 'banner-list'로 채움
 */
export function stampConnectedSlug<
  W extends { type: string; connectedSlug?: string },
  C extends { widget: W },
  T extends { contents: C[] },
>(widgetItems: T[], defaultSlug: string | undefined,
  targetTypes: string[] = ["form", "table", "sublist", "multiselect"]): T[] {
  if (!defaultSlug) return widgetItems;
  return widgetItems.map(item => ({
    ...item,
    contents: item.contents.map(c => {
      if (!targetTypes.includes(c.widget.type)) return c;
      if (c.widget.connectedSlug) return c;
      return { ...c, widget: { ...c.widget, connectedSlug: defaultSlug } };
    }),
  })) as T[];
}

/** Search 위젯 widgetId → 필드 목록 맵 */
function buildSearchFieldsMap(items: PageWidgetItem[]): Record<string, SearchFieldConfig[]> {
  const map: Record<string, SearchFieldConfig[]> = {};
  flatWidgets(items).forEach((w) => {
    if (w.type === "search") {
      map[w.widgetId] = w.rows.flatMap((r: { fields: SearchFieldConfig[] }) => r.fields);
    }
  });
  return map;
}

/** 훅 옵션 */
interface UseWidgetPageStateOptions {
  /** 저장/삭제 후 페이지 이동 콜백. 운영 페이지는 router.back(), 탭은 undefined(이동 없음). */
  onGoBack?: () => void;
  /**
   * URL ?id / ?group_id 기반 수정 모드 활성화 — widgetSub/page.tsx 전용
   * true 시: URL 파라미터에서 id/group_id 감지 → 기존 데이터 자동 복원
   */
  enableUrlEditMode?: boolean;
  /**
   * 탭 데이터 네임스페이스 키 (TabItem.contentKey)
   * 설정 시 buildDataJson 결과를 해당 키로 감싸서 저장:
   *   data_json = { [contentKey]: { ...폼데이터 } }
   * 수정 시 기존 data_json을 GET → 현재 탭 섹션만 교체 → PUT
   */
  contentKey?: string;
  /**
   * 같은 slug를 사용하는 탭들이 공유하는 row id
   * 최초 저장(POST) 후 생성된 id → 이후 탭 저장 시 해당 row를 수정 모드로 처리
   */
  sharedDataId?: number | null;
  /** 신규 저장(POST) 후 생성된 id와 connectedSlug를 상위(TabRenderer)로 전달 */
  onDataIdCreated?: (connectedSlug: string, id: number) => void;
  /** 저장 성공(POST/PUT 모두) 시 상위(TabRenderer)로 알림 — savedTabSet 갱신용 */
  onSaved?: () => void;
  /** 페이지 레벨 메인 연결 slug — buildDataJson _rel 분기 기준 */
  mainConnectedSlug?: string;
  /** true: 폼 변경 후 이탈 시 confirm 다이얼로그 표시 */
  leaveCheck?: boolean;
  /**
   * 페이지 레벨 메인 연결 타입 — Table 위젯 데이터 조회 API 분기 기준
   * 'entity' | 'data' 인 경우 mainConnectedSlug(및 이를 stamp 받은 Table.connectedSlug)가
   * Slug Entity 코드생성 REST API(/api/v1/{slug})를 가리키므로 fetchTableData가 해당 API로 조회한다.
   * 'none' | 'slug' | 미설정이면 기존과 동일하게 page_data API(/page-data/{slug})로 조회한다.
   */
  connectedType?: ConnectedType;
}

/**
 * contentKey로 dataJson 섹션 탐색
 * - 1단계: 최상위에서 직접 탐색
 * - 2단계: 탭 중첩 구조({ tabKey: { contentKey: {...} } }) 자동 감지
 */
function findSection(dataJson: Record<string, unknown>, contentKey: string | undefined): Record<string, unknown> {
  if (!contentKey) return dataJson;
  if (dataJson[contentKey] && typeof dataJson[contentKey] === 'object') {
    return dataJson[contentKey] as Record<string, unknown>;
  }
  for (const val of Object.values(dataJson)) {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const nested = (val as Record<string, unknown>)[contentKey];
      if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
        return nested as Record<string, unknown>;
      }
    }
  }
  return dataJson;
}

/**
 * Form/SubList/MultiSelect/파일 메타를 dataJson에서 복원하는 공통 순수 함수
 *
 * enableUrlEditMode useEffect와 sharedDataId useEffect 양쪽에서 재사용.
 * 훅 외부에 위치하여 클로저 의존성 없이 동작한다.
 *
 * 사용법:
 *   await restoreFormDataFromJson(dataJson, forms, sublists, multiSels,
 *     setFormValuesMap, setSubListRowsMap,
 *     setMultiSelectValuesMap, setMultiSelectExtraFieldValuesMap,
 *     setExistingFileMetaMap, setImgBlobUrls, isEntity);
 *
 * @param isEntity  true면 entity 연결 페이지 — 파일 메타/blob 조회를 page_file 시스템
 *                  (/page-files/meta, /page-files/{id}) 대신 file_meta 시스템
 *                  (/file-meta, /file-meta/{id}/download)으로 수행한다. (buildDataJson의
 *                  isEntity 파라미터와 동일한 패턴, 미전달 시 false = page_data 모드 그대로 동작)
 */
async function restoreFormDataFromJson(
  dataJson: Record<string, unknown>,
  forms: FormWidget[],
  sublists: SubListWidget[],
  multiSels: MultiSelectWidget[],
  setFormValuesMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, string>>>>,
  setSubListRowsMap: React.Dispatch<React.SetStateAction<Record<string, SubListRow[]>>>,
  setMultiSelectValuesMap: React.Dispatch<React.SetStateAction<Record<string, number[]>>>,
  setMultiSelectExtraFieldValuesMap: React.Dispatch<React.SetStateAction<Record<string, Record<number, Record<string, string>>>>>,
  setExistingFileMetaMap: React.Dispatch<React.SetStateAction<Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>>>,
  setImgBlobUrls: React.Dispatch<React.SetStateAction<Record<number, string>>>,
  isEntity?: boolean,
): Promise<void> {
  /* 폼 필드 값 복원 */
  forms.forEach(fw => {
    const section = findSection(dataJson, fw.contentKey);
    const vals: Record<string, string> = {};
    fw.fields.forEach(f => {
      if (!f.fieldKey) return;
      if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
        /* dateRange/yearMonthRange: dataJson에서 _from/_to 분리 키로 복원 */
        const fromVal = section[f.fieldKey + '_from'];
        const toVal = section[f.fieldKey + '_to'];
        if (fromVal !== undefined) vals[f.id + '_from'] = String(fromVal ?? '');
        if (toVal !== undefined) vals[f.id + '_to'] = String(toVal ?? '');
      } else if (section[f.fieldKey] !== undefined) {
        const raw = section[f.fieldKey];
        if (!Array.isArray(raw)) vals[f.id] = String(raw ?? '');
      }
    });
    setFormValuesMap(prev => ({ ...prev, [fw.widgetId]: vals }));
  });

  /* SubList 행 복원 */
  sublists.forEach(sw => {
    const raw = sw.contentKey ? dataJson[sw.contentKey] : null;
    /* { rows } 래핑 제거 후 배열 직접 저장 방식 */
    const rawRows = Array.isArray(raw) ? raw as Record<string, unknown>[] : [];
    setSubListRowsMap(prev => ({
      ...prev,
      [sw.widgetId]: rawRows.map((r, i) => ({
        _rowId: (r.id as string) ?? `row-${i}`,
        ...r,
      })),
    }));
  });

  /* MultiSelect 값 복원 */
  multiSels.forEach(mw => {
    if (!mw.contentKey) return;
    /* _rel[connectedSlug] 우선 확인 — mainConnectedSlug 설정 시 해당 경로에 저장됨 */
    const rel = dataJson['_rel'] as Record<string, unknown> | undefined;
    const raw = (mw.connectedSlug ? rel?.[mw.connectedSlug] : undefined) ?? dataJson[mw.contentKey];
    if (!Array.isArray(raw)) return;
    if (raw.length > 0 && typeof raw[0] === 'object' && raw[0] !== null && 'id' in (raw[0] as object)) {
      const items = raw as { id: number; [key: string]: unknown }[];
      setMultiSelectValuesMap(prev => ({ ...prev, [mw.widgetId]: items.map(i => i.id) }));
      const extraVals: Record<number, Record<string, string>> = {};
      items.forEach(item => {
        const { id, ...fields } = item;
        extraVals[id] = Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v ?? '')]));
      });
      setMultiSelectExtraFieldValuesMap(prev => ({ ...prev, [mw.widgetId]: extraVals }));
    } else {
      setMultiSelectValuesMap(prev => ({
        ...prev,
        [mw.widgetId]: (raw as unknown[]).filter(x => typeof x === 'number') as number[],
      }));
    }
  });

  /* 파일 메타 + blob URL 복원 */
  try {
    const fileIds: number[] = [];
    const collectIds = (obj: Record<string, unknown>) => {
      Object.values(obj).forEach(v => {
        if (Array.isArray(v) && v.every(x => typeof x === 'number')) fileIds.push(...v as number[]);
        else if (v && typeof v === 'object' && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
      });
    };
    collectIds(dataJson);

    if (fileIds.length > 0) {
      /* entity 모드: file_meta 전용 API 사용 — 응답 필드명이 origName이 아닌 originalName(camelCase)
       * 이라 조회 직후 기존 { id, origName, fileSize } 형태로 맞춰 이후 로직은 공용으로 재사용한다. */
      const metaList = isEntity
        ? await api.get('/file-meta', { params: { ids: fileIds.join(',') } })
            .then(r => (r.data as { id: number; originalName: string; fileSize: number; mimeType: string }[])
              .map(m => ({ id: m.id, origName: m.originalName, fileSize: m.fileSize })))
        : await api.get('/page-files/meta', { params: { ids: fileIds.join(',') } })
            .then(r => r.data as { id: number; origName: string; fileSize: number; mimeType: string }[]);
      forms.forEach(fw => {
        const section = findSection(dataJson, fw.contentKey);
        const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
        fw.fields.forEach(f => {
          if (!f.fieldKey || !FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) return;
          const ids = section[f.fieldKey];
          if (!Array.isArray(ids)) return;
          metaByFieldId[f.id] = (ids as number[]).map(id => {
            const m = metaList.find(m => m.id === id);
            return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
          });
          if (f.type === 'image' || f.type === 'video' || f.type === 'media') {
            (ids as number[]).forEach(id => {
              const blobReq = isEntity
                ? api.get(`/file-meta/${id}/download`, { responseType: 'blob' })
                : api.get(`/page-files/${id}`, { responseType: 'blob' });
              blobReq
                .then(r => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(r.data) })))
                .catch(() => {});
            });
          }
        });
        setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
      });
    }
  } catch { /* 파일 없으면 조용히 처리 */ }
}

/**
 * dataJson에서 _fetchedRel{id} 최상위 키만 추출 — FormRenderer의 rowData 확장용
 *
 * 사용법:
 *   const fetchRelData = extractFetchRelData(dataJson);
 *   // → { _fetchedRel8: { form1: { title: 'Electronics' } }, ... }
 */
function extractFetchRelData(dataJson: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  Object.entries(dataJson).forEach(([key, val]) => {
    if (key.startsWith('_fetchedRel')) {
      result[key] = val;
    }
  });
  return result;
}

export function useWidgetPageState(
  widgetItems: PageWidgetItem[],
  pageSlug?: string,
  options?: UseWidgetPageStateOptions,
) {
  /* URL 파라미터 — 폼 필드 초기값 세팅용 */
  const searchParams = useSearchParams();
  const { t } = useI18n();

  /* 이탈 감지 — leaveCheck 옵션이 true일 때만 활성화 */
  const { markDirty, markClean, confirmLeave } = useLeaveCheck(options?.leaveCheck ?? false);

  /* 페이지 레벨 메인 연결이 Slug Entity API(/api/v1/{slug})를 가리키는지 여부 —
   * connectedType이 'data'면 Table 위젯이 entity REST API로 데이터를 조회한다. */
  const pageIsEntity = options?.connectedType === 'data';

  /* 검색 */
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const searchValuesRef = useRef<Record<string, string>>({});

  /* 테이블 */
  const [tableDataMap, setTableDataMap] = useState<Record<string, PageTableData>>({});
  const tableDataMapRef = useRef<Record<string, PageTableData>>({});
  const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
  const [sortDirMap, setSortDirMap] = useState<Record<string, "asc" | "desc">>({});
  /* 테이블 행 선택 — key: tableWidget.widgetId, value: 선택된 행 ID 배열 */
  const [tableSelectedRowsMap, setTableSelectedRowsMap] = useState<Record<string, number[]>>({});

  /* 폼 */
  const [formValuesMap, setFormValuesMap] = useState<Record<string, Record<string, string>>>({});

  /* 서브리스트 */
  const [subListRowsMap, setSubListRowsMap] = useState<Record<string, SubListRow[]>>({});

  /* 카테고리 */
  const [categorySelections, setCategorySelections] = useState<Record<string, number | null>>({});

  /* 파일 업로드 — Form 위젯용 */
  const [fileValuesMap, setFileValuesMap] = useState<Record<string, Record<string, File[]>>>({});
  /** widgetId → fieldId → 기존 파일 메타 (수정 모드) */
  const [existingFileMetaMap, setExistingFileMetaMap] = useState<
    Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>
  >({});
  /** fileId → blob URL 캐시 (이미지 필드 미리보기용) */
  const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});
  /** SubList 파일 — widgetId → rowId → colId → 새로 선택한 파일 목록 */
  const [subListFileMap, setSubListFileMap] = useState<
    Record<string, Record<string, Record<string, File[]>>>
  >({});

  /* 멀티셀렉트 */
  const [multiSelectValuesMap, setMultiSelectValuesMap] = useState<Record<string, number[]>>({});
  /** widgetId → itemId → fieldKey → value */
  const [multiSelectExtraFieldValuesMap, setMultiSelectExtraFieldValuesMap] = useState<Record<string, Record<number, Record<string, string>>>>({});

  /* 수정 모드 group_id (신규 저장 후 다음 저장 시 수정 모드로 처리) */
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

  /* URL 파라미터 중 폼에 없는 값 — 저장 시 dataJson에 병합 (enableUrlEditMode 전용) */
  const [urlParamSaveExtras, setUrlParamSaveExtras] = useState<Record<string, unknown>>({});

  /** widgetId → _fetchedRel{id} 원본 데이터 맵 — FormRenderer rowData 구성용 */
  const [formFetchRelMap, setFormFetchRelMap] = useState<Record<string, Record<string, unknown>>>({});

  /* ── API 연동 — action-button connType='api' 전용 ──
   * 페이지 로드 시 1회 활성 API 정보 목록을 조회해 캐싱한다.
   * (위젯 빌더 widget/page.tsx의 apiInfoOptions 조회와 동일한 패턴 — mount 1회 useEffect) */
  const [apiInfoOptions, setApiInfoOptions] = useState<ApiInfoOption[]>([]);
  useEffect(() => {
    api.get('/api-infos/active')
      .then((res) => setApiInfoOptions(res.data || []))
      .catch(() => { /* 조회 실패 시 빈 배열 유지 — 버튼 클릭 시 "연결된 API 없음" 안내로 처리 */ });
  }, []);

  /* 테이블 데이터 fetch */
  const fetchTableData = useCallback(
    async ({
      tableWidget,
      connectedSlug,
      searchFields,
      sv,
      page = 0,
      sk,
      sd = "asc",
      append = false,
      /* 미지정 시 페이지 레벨 connectedType 기준값을 그대로 사용 — 호출부(검색/정렬/페이징 등)를
       * 일일이 수정하지 않아도 페이지가 entity 연결이면 모든 Table 조회가 자동으로 entity API를 탄다. */
      isEntity = pageIsEntity,
    }: {
      tableWidget: TableWidget;
      connectedSlug: string;
      searchFields: SearchFieldConfig[];
      sv: Record<string, string>;
      page?: number;
      sk?: string | null;
      sd?: "asc" | "desc";
      append?: boolean;
      /** true면 page_data API 대신 Slug Entity 코드생성 REST API(/api/v1/{slug})로 조회 */
      isEntity?: boolean;
    }) => {
      const wid = tableWidget.widgetId;
      const empty: PageTableData = {
        rows: [],
        totalElements: 0,
        totalPages: 0,
        currentPage: 0,
        loading: false,
        appendLoading: false,
        hasMore: true,
        nextPage: 0,
      };

      setTableDataMap((prev) => ({
        ...prev,
        [wid]: append ? { ...(prev[wid] ?? empty), appendLoading: true } : { ...(prev[wid] ?? empty), loading: true },
      }));

      try {
        const pageSize = tableWidget.pageSize || DEFAULT_PAGE_SIZE;
        const params: Record<string, string> = { page: String(page), size: String(pageSize) };
        if (sk) params.sort = `${sk},${sd}`;

        /* entity API는 검색조건 파라미터를 지원하지 않으므로 page/size/sort만 전송한다.
         * (page_data 전용 검색 파라미터 구성은 entity 모드에서는 건너뛴다) */
        if (!isEntity) {
          /* fieldKey → fieldId 역매핑 — hideCondition 평가용 */
          const keyToId: Record<string, string> = {};
          searchFields.forEach((f) => { if (f.fieldKey) keyToId[f.fieldKey] = f.id; });
          searchFields.forEach((f) => {
            /* 검색제외 필드는 API 파라미터에서 제외 */
            if (f.excludeFromSearch) return;
            /* hideCondition 충족 시 API 파라미터 제외 */
            const hideResult = f.hideCondition ? evalFieldCondition(f.hideCondition, keyToId, sv) : false;
            if (f.hideCondition && hideResult) return;
            /* dateRange/yearMonthRange: from/to 분리 저장이므로 각각 파라미터로 전송 */
            if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
              const paramKey = f.fieldKey || f.label;
              const from = sv[f.id + '_from'];
              const to   = sv[f.id + '_to'];
              if (paramKey) {
                /* singleDateRange=true: 단일 date 컬럼 범위 필터용 _gte/_lte 파라미터 전송 */
                if (f.singleDateRange) {
                  if (from?.trim()) params[`${paramKey}_gte`] = from;
                  if (to?.trim())   params[`${paramKey}_lte`] = to;
                } else {
                  if (from?.trim()) params[`${paramKey}_from`] = from;
                  if (to?.trim())   params[`${paramKey}_to`]   = to;
                }
              }
              return;
            }
            const val = sv[f.id];
            if (!val || !val.trim()) return;
            /* category + relationSlugId: FILTER slug_relation 파라미터 */
            if (f.type === 'category' && f.relationSlugId) {
              params[`rel_${f.relationSlugId}`] = val;
              return;
            }
            /* select + data(조건식 "cond?트루텍스트:펄스텍스트"): evalConditionExpr 문법 재사용 —
               condexpr_{fieldKey}=조건식 원문 + condval_{fieldKey}=선택값 그대로 전송, 필드명 파싱은 서버가 담당 */
            if (f.type === 'select' && f.data?.includes('?')) {
              const paramKey = f.fieldKey || f.label;
              if (paramKey) {
                params[`condexpr_${paramKey}`] = f.data;
                params[`condval_${paramKey}`] = val;
              }
              return;
            }
            /* dateRangeStatus: drs_{linkedDateRangeKey}=before|in_range|after 형식으로 변환 */
            if (f.type === 'dateRangeStatus' && f.linkedDateRangeKey) {
              params[`drs_${f.linkedDateRangeKey}`] = val;
            } else {
              const paramKey = f.fieldKey || f.label;
              if (paramKey) params[paramKey] = val;
            }
          });
        }

        /* entity 모드: /api/v1/{slug} (Slug Entity 코드생성 REST API) — 그 외: 기존 page_data API */
        const url = isEntity ? entityApiPath(connectedSlug) : `/page-data/${connectedSlug}`;
        const res = await api.get(url, { params });

        /* 페이징 envelope 필드명이 API마다 달라 entity 모드일 때만 먼저 정규화(number → page 등)한다 */
        const envelope = isEntity ? normalizeEntityPageEnvelope(res.data) : res.data;

        const rows = isEntity
          ? (envelope.content as Record<string, unknown>[]).map(normalizeEntityRow)
          : (
              envelope.content as {
                id: number;
                groupId?: string | null;
                dataJson: Record<string, unknown>;
                createdAt?: string | null;
                createdBy?: string | null;
                updatedAt?: string | null;
                updatedBy?: string | null;
              }[]
            ).map(flattenPageDataItem);

        const hasMore = envelope.last === false;
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: {
            rows: append ? [...(prev[wid]?.rows ?? []), ...rows] : rows,
            totalElements: envelope.totalElements,
            totalPages: envelope.totalPages,
            currentPage: page,
            loading: false,
            appendLoading: false,
            hasMore,
            nextPage: hasMore ? page + 1 : page,
          },
        }));
      } catch {
        toast.error(t("common.error.load_data"));
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: { ...(prev[wid] ?? empty), loading: false, appendLoading: false },
        }));
      }
    },
    [t, pageIsEntity]
  );

  /* widgetItems 변경 시 Table 위젯 초기 데이터 자동 fetch */
  useEffect(() => {
    if (!widgetItems.length) return;
    const fieldsMap = buildSearchFieldsMap(widgetItems);
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "table") return;
      const connectedSlug = (w as TableWidget).connectedSlug;
      if (!connectedSlug) return;
      const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv: {} });
    });
  }, [widgetItems, fetchTableData]);

  /* tableDataMap ref 동기화 — handleLoadMore 클로저에서 최신값 참조 */
  useEffect(() => {
    tableDataMapRef.current = tableDataMap;
  }, [tableDataMap]);

  /* widgetItems 로드 후 폼 필드 기본값 + URL 파라미터 초기화
   * 우선순위: URL 파라미터 > defaultValue/defaultDate/defaultOptionValue 등
   */
  useEffect(() => {
    if (!widgetItems.length) return;

    const formWidgets = flatWidgets(widgetItems).filter(w => w.type === 'form') as FormWidget[];

    /* 공통 함수로 모든 타입의 기본값 초기화 */
    const patch = initFormDefaultValues(formWidgets, t);

    /* URL 파라미터가 있으면 기본값 위로 오버라이드 */
    formWidgets.forEach((fw) => {
      (fw.fields ?? []).forEach((f) => {
        const fieldKey = f.fieldKey || f.label;
        if (!fieldKey) return;
        const urlVal = searchParams.get(fieldKey);
        if (urlVal !== null) {
          if (!patch[fw.widgetId]) patch[fw.widgetId] = {};
          patch[fw.widgetId][f.id] = urlVal;
        }
      });
    });

    if (Object.values(patch).every(v => Object.keys(v).length === 0)) return;

    setFormValuesMap((prev) => {
      const next = { ...prev };
      for (const [wid, vals] of Object.entries(patch)) {
        next[wid] = { ...(next[wid] ?? {}), ...vals };
      }
      return next;
    });
  }, [widgetItems, searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Search 위젯 날짜·옵션 기본값 초기화 — widgetSub 페이지 패턴 지원 */
  useEffect(() => {
    if (!widgetItems.length) return;
    const initVals: Record<string, string> = {};
    flatWidgets(widgetItems).forEach(w => {
      if (w.type !== 'search') return;
      (w.rows as { fields: SearchFieldConfig[] }[]).flatMap(r => r.fields).forEach((f: SearchFieldConfig) => {
        if ((f.type === 'date' || f.type === 'yearMonth') && (f.defaultToday || f.defaultDateOffset !== undefined || f.defaultDate)) {
          /* dateSubType에 따라 날짜 포맷 분기 (yearMonth 기존 타입은 yearMonth subType으로 처리) */
          const subType = f.type === 'yearMonth' ? 'yearMonth' : (f.dateSubType ?? 'date');
          const calcDateBySubType = (offset: number): string => {
            const d = new Date(); d.setDate(d.getDate() - offset);
            const iso = d.toISOString();
            if (subType === 'yearMonth') return iso.slice(0, 7);
            if (subType === 'datetime') return iso.slice(0, 16);
            return iso.slice(0, 10);
          };
          let val = '';
          if (f.defaultToday) {
            /* 오늘날짜 ON: 오늘 날짜를 subType 포맷으로 반환 */
            const iso = new Date().toISOString();
            if (subType === 'yearMonth') val = iso.slice(0, 7);
            else if (subType === 'datetime') val = iso.slice(0, 16);
            else val = iso.slice(0, 10);
          } else {
            val = (f.defaultDateOffset !== undefined && f.defaultDateOffset !== 0) ? calcDateBySubType(f.defaultDateOffset) : (f.defaultDate ?? '');
          }
          if (val) initVals[f.id] = val;
        } else if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
          /* rangeSubType에 따라 날짜 포맷 분기 */
          const subType = f.rangeSubType ?? (f.type === 'yearMonthRange' ? 'yearMonth' : 'date');
          const calcRangeDate = (offset: number): string => {
            const d = new Date(); d.setDate(d.getDate() - offset);
            const iso = d.toISOString();
            const pad = (n: number) => String(n).padStart(2, '0');
            if (subType === 'yearMonth') return iso.slice(0, 7);
            if (subType === 'datetime')  return iso.slice(0, 16);
            if (subType === 'time')      return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
            if (subType === 'timeSec')   return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            return iso.slice(0, 10);
          };
          /* 오늘날짜는 시작·종료 각각 독립 토글 — 켜진 쪽만 오늘 날짜(offset 0)로 대체 */
          const start = f.defaultStartToday
            ? calcRangeDate(0)
            : (f.defaultStartDateOffset !== undefined && f.defaultStartDateOffset !== 0) ? calcRangeDate(f.defaultStartDateOffset) : (f.defaultStartDate ?? '');
          const end = f.defaultEndToday
            ? calcRangeDate(0)
            : (f.defaultEndDateOffset !== undefined && f.defaultEndDateOffset !== 0) ? calcRangeDate(f.defaultEndDateOffset) : (f.defaultEndDate ?? '');
          /* dateRange/yearMonthRange: from/to 분리 저장 */
          if (start) initVals[f.id + '_from'] = start;
          if (end)   initVals[f.id + '_to']   = end;
        } else if ((f.type === 'select' || f.type === 'radio' || f.type === 'checkbox') && f.defaultOptionValue) {
          initVals[f.id] = f.defaultOptionValue;
        } else if (f.defaultValue) {
          initVals[f.id] = f.defaultValue;
        }
      });
    });
    if (Object.keys(initVals).length > 0) {
      setSearchValues(prev => ({ ...initVals, ...prev }));
      searchValuesRef.current = { ...initVals, ...searchValuesRef.current };
    }
  }, [widgetItems]); // eslint-disable-line react-hooks/exhaustive-deps

  /* URL ?id / ?group_id 기반 수정 모드 — enableUrlEditMode: true 시 동작 */
  useEffect(() => {
    if (!options?.enableUrlEditMode || !widgetItems.length) return;

    const allWidgets      = flatWidgets(widgetItems);
    const formWidgets     = allWidgets.filter(w => w.type === 'form')        as FormWidget[];
    const sublistWidgets  = allWidgets.filter(w => w.type === 'sublist')     as SubListWidget[];
    const multiSelWidgets = allWidgets.filter(w => w.type === 'multiselect') as MultiSelectWidget[];

    const queryGroupId = searchParams.get('group_id');
    const queryId      = searchParams.get('id');

    /** URL 파라미터 → 폼 필드 세팅, 폼에 없는 값은 urlParamSaveExtras에 보관 */
    const applyUrlParams = () => {
      const SKIP = new Set(['id', 'group_id', '_paramSave']);
      const isParamSave = searchParams.get('_paramSave') === 'true';
      const urlOverrides: Record<string, Record<string, string>> = {};
      const extras: Record<string, unknown> = {};
      searchParams.forEach((value, key) => {
        if (SKIP.has(key)) return;
        const dotIdx = key.indexOf('.');
        if (dotIdx !== -1) {
          const ck = key.slice(0, dotIdx);
          const fk = key.slice(dotIdx + 1);
          const fw = formWidgets.find(f => f.contentKey === ck);
          if (!fw) return;
          const field = fw.fields.find(f => (f.fieldKey || f.label) === fk);
          if (field) {
            if (!urlOverrides[fw.widgetId]) urlOverrides[fw.widgetId] = {};
            urlOverrides[fw.widgetId][field.id] = value;
          } else if (isParamSave) {
            if (!extras[ck]) extras[ck] = {};
            (extras[ck] as Record<string, string>)[fk] = value;
          }
        } else {
          let found = false;
          formWidgets.forEach(fw => {
            const field = fw.fields.find(f => (f.fieldKey || f.label) === key);
            if (field) {
              found = true;
              if (!urlOverrides[fw.widgetId]) urlOverrides[fw.widgetId] = {};
              urlOverrides[fw.widgetId][field.id] = value;
            }
          });
          if (!found && isParamSave) extras[key] = value;
        }
      });
      if (Object.keys(urlOverrides).length > 0) {
        setFormValuesMap(prev => {
          const next = { ...prev };
          Object.entries(urlOverrides).forEach(([wId, vals]) => {
            next[wId] = { ...(next[wId] ?? {}), ...vals };
          });
          return next;
        });
      }
      if (Object.keys(extras).length > 0) setUrlParamSaveExtras(extras);
    };

    if (queryGroupId) {
      setCurrentGroupId(queryGroupId);
      const slugSet = new Set([
        ...formWidgets.map(fw => fw.connectedSlug),
        ...sublistWidgets.map(sw => sw.connectedSlug),
        ...multiSelWidgets.map(mw => mw.connectedSlug),
      ].filter((s): s is string => !!s));
      slugSet.forEach(s => {
        /* entity 모드: entity는 group_id 개념이 없어(단일 id만 존재) URL의 group_id 값을
         * 그대로 entity 단건 id로 취급해 조회한다 — page_data 모드는 기존 group 조회 그대로 유지
         * 조회 직후 restoreEntityDateFields로 날짜/일시 필드를 FE input이 기대하는 로컬 문자열로 변환한다 */
        const fetchPromise = pageIsEntity
          ? api.get(entityItemPath(s, queryGroupId)).then(r => {
              const dateFieldMeta = buildEntityDateFieldMeta(
                formWidgets.filter(fw => fw.connectedSlug === s).flatMap(fw => fw.fields),
              );
              return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
            })
          : api.get(`/page-data/${s}/group/${queryGroupId}`).then(r => (r.data.dataJson || {}) as Record<string, unknown>);
        fetchPromise
          .then(async dataJson => {
            await restoreFormDataFromJson(
              dataJson,
              formWidgets.filter(fw => fw.connectedSlug === s),
              sublistWidgets.filter(sw => sw.connectedSlug === s),
              multiSelWidgets.filter(mw => mw.connectedSlug === s),
              setFormValuesMap, setSubListRowsMap,
              setMultiSelectValuesMap, setMultiSelectExtraFieldValuesMap,
              setExistingFileMetaMap, setImgBlobUrls,
              pageIsEntity,
            );
            applyUrlParams();
          })
          .catch(() => {});
      });
    } else if (queryId) {
      const connectedSlug = formWidgets[0]?.connectedSlug
        ?? multiSelWidgets[0]?.connectedSlug
        ?? sublistWidgets[0]?.connectedSlug;
      if (connectedSlug) {
        /* entity 모드: /api/v1/{slug}/{id} 단건 조회 + normalizeEntityRow로 케이싱 별칭 부여
         * + restoreEntityDateFields로 날짜/일시 필드를 FE input이 기대하는 로컬 문자열로 변환 */
        const fetchPromise = pageIsEntity
          ? api.get(entityItemPath(connectedSlug, Number(queryId))).then(r => {
              const dateFieldMeta = buildEntityDateFieldMeta(formWidgets.flatMap(fw => fw.fields));
              return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
            })
          : api.get(`/page-data/${connectedSlug}/${Number(queryId)}`).then(r => (r.data.dataJson || {}) as Record<string, unknown>);
        fetchPromise
          .then(async dataJson => {
            await restoreFormDataFromJson(
              dataJson, formWidgets, sublistWidgets, multiSelWidgets,
              setFormValuesMap, setSubListRowsMap,
              setMultiSelectValuesMap, setMultiSelectExtraFieldValuesMap,
              setExistingFileMetaMap, setImgBlobUrls,
              pageIsEntity,
            );
            // _fetchedRel{id} 추출 후 각 Form 위젯에 매핑
            const fetchRelData = extractFetchRelData(dataJson);
            if (Object.keys(fetchRelData).length > 0) {
              formWidgets.forEach(fw => {
                setFormFetchRelMap(prev => ({ ...prev, [fw.widgetId]: fetchRelData }));
              });
            }
            applyUrlParams();
          })
          .catch(() => toast.error(t('common.error.load_existing_data')));
      }
    } else {
      /* 신규 모드 — 기본값 초기화 */
      setCurrentGroupId(null);
      setMultiSelectValuesMap({});
      setFormValuesMap(initFormDefaultValues(formWidgets, t));
      applyUrlParams();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetItems, searchParams, options?.enableUrlEditMode]);

  /* 수정 모드 초기 데이터 로드 — sharedDataId(탭 공유 row id) 있을 때
   * Form/SubList/MultiSelect 모두 restoreFormDataFromJson 공통 함수로 복원
   */
  useEffect(() => {
    if (!widgetItems.length) return;
    const id = options?.sharedDataId ?? null;
    if (!id) return;

    const allWidgets    = flatWidgets(widgetItems);
    const forms         = allWidgets.filter((w) => w.type === 'form')        as FormWidget[];
    const sublists      = allWidgets.filter((w) => w.type === 'sublist')     as SubListWidget[];
    const multiSels     = allWidgets.filter((w) => w.type === 'multiselect') as MultiSelectWidget[];
    if (!forms.length) return;

    const connectedSlug = forms[0].connectedSlug;
    if (!connectedSlug) return;

    /* entity 모드: /api/v1/{slug}/{id} 단건 조회 + normalizeEntityRow로 케이싱 별칭 부여
     * + restoreEntityDateFields로 날짜/일시 필드를 FE input이 기대하는 로컬 문자열로 변환 */
    const fetchPromise = pageIsEntity
      ? api.get(entityItemPath(connectedSlug, id)).then(r => {
          const dateFieldMeta = buildEntityDateFieldMeta(forms.flatMap(fw => fw.fields));
          return restoreEntityDateFields(normalizeEntityRow(r.data), dateFieldMeta);
        })
      : api.get(`/page-data/${connectedSlug}/${id}`).then(r => (r.data.dataJson ?? {}) as Record<string, unknown>);

    fetchPromise
      .then(async (rawDataJson) => {
        await restoreFormDataFromJson(
          rawDataJson,
          forms, sublists, multiSels,
          setFormValuesMap, setSubListRowsMap,
          setMultiSelectValuesMap, setMultiSelectExtraFieldValuesMap,
          setExistingFileMetaMap, setImgBlobUrls,
          pageIsEntity,
        );
        // _fetchedRel{id} 추출 후 각 Form 위젯에 매핑
        const fetchRelData = extractFetchRelData(rawDataJson);
        if (Object.keys(fetchRelData).length > 0) {
          forms.forEach(fw => {
            setFormFetchRelMap(prev => ({ ...prev, [fw.widgetId]: fetchRelData }));
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetItems, options?.sharedDataId]);

  /* 검색 값 업데이트 */
  const updateSearchValue = useCallback((id: string, val: string) => {
    setSearchValues((prev) => {
      const next = { ...prev, [id]: val };
      searchValuesRef.current = next;
      return next;
    });
  }, []);

  /* 검색 실행 */
  const handleSearch = useCallback(
    (searchWidgetId: string) => {
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const sv = searchValuesRef.current;

      /* dateRange 최대 조회 기간 검증 — 초과 시 API 호출 차단 */
      const searchFields = fieldsMap[searchWidgetId] ?? [];
      if (!validateSearchDateRange(searchFields, sv, t)) return;

      flatWidgets(widgetItems).forEach((w) => {
        if (w.type !== "table") return;
        if (!(w as TableWidget).connectedSearchIds.includes(searchWidgetId)) return;
        const connectedSlug = (w as TableWidget).connectedSlug;
        if (!connectedSlug) return;
        const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
        fetchTableData({
          tableWidget: w as TableWidget,
          connectedSlug,
          searchFields,
          sv,
          page: 0,
          sk: sortKeyMap[(w as TableWidget).widgetId] ?? undefined,
          sd: sortDirMap[(w as TableWidget).widgetId] ?? "asc",
        });
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, fetchTableData, t]
  );

  /* 검색 초기화 */
  const handleReset = useCallback(
    (searchWidgetId: string) => {
      setSearchValues({});
      searchValuesRef.current = {};
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      flatWidgets(widgetItems).forEach((w) => {
        if (w.type !== "table") return;
        if (!(w as TableWidget).connectedSearchIds.includes(searchWidgetId)) return;
        const connectedSlug = (w as TableWidget).connectedSlug;
        if (!connectedSlug) return;
        const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
        fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv: {}, page: 0 });
      });
    },
    [widgetItems, fetchTableData]
  );

  /* 페이지 이동 */
  const handlePageChange = useCallback(
    (tableWidgetId: string, page: number) => {
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page,
        sk: sortKeyMap[tableWidgetId] ?? undefined,
        sd: sortDirMap[tableWidgetId] ?? "asc",
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, fetchTableData]
  );

  /* 정렬 변경 */
  const handleSortChange = useCallback(
    (tableWidgetId: string, accessor: string, dir: "asc" | "desc" | null) => {
      const { sk, sd } = applySortChange(tableWidgetId, accessor, dir, setSortKeyMap, setSortDirMap);
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);

      /* _pathMap 참조해 단순 fieldKey → 실제 JSONB 경로로 변환
       * row마다 구조가 다를 수 있으므로 모든 row를 순회해 유효한 경로를 첫 번째로 사용 */
      let resolvedSk = sk;
      if (sk) {
        const rows = tableDataMap[tableWidgetId]?.rows ?? [];
        for (const row of rows) {
          const pathMap = row._pathMap as Record<string, string> | undefined;
          if (pathMap?.[sk]) { resolvedSk = pathMap[sk]; break; }
        }
      }

      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page: 0,
        sk: resolvedSk,
        sd,
      });
    },
    [widgetItems, fetchTableData, tableDataMap]
  );

  /* 폼 값 업데이트 */
  const updateFormValue = useCallback((widgetId: string, fieldId: string, value: string) => {
    setFormValuesMap((prev) => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value } }));
    markDirty();
  }, [markDirty]);

  /**
   * 파일 선택 핸들러
   * - rowId 없음: Form 위젯 파일 → fileValuesMap
   * - rowId 있음: SubList 행 파일 → subListFileMap
   */
  const handleFileChange = useCallback(
    (widgetId: string, fieldId: string, files: File[], rowId?: string) => {
      if (rowId !== undefined) {
        setSubListFileMap((prev) => ({
          ...prev,
          [widgetId]: {
            ...(prev[widgetId] ?? {}),
            [rowId]: {
              ...(prev[widgetId]?.[rowId] ?? {}),
              [fieldId]: files,
            },
          },
        }));
        return;
      }
      setFileValuesMap((prev) => ({
        ...prev,
        [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: files },
      }));
      markDirty();
    },
    [markDirty]
  );

  /** 기존 파일 삭제 — API 호출 후 existingFileMetaMap 및 imgBlobUrls 갱신 */
  const handleRemoveExisting = useCallback(
    async (widgetId: string, fieldId: string, fileId: number) => {
      try {
        /* entity 모드: file_meta 전용 삭제 API 사용, page_data 모드: 기존 page-files API 유지 */
        if (pageIsEntity) {
          await api.delete(`/file-meta/${fileId}`);
        } else {
          await api.delete(`/page-files/${fileId}`);
        }
        setExistingFileMetaMap((prev) => ({
          ...prev,
          [widgetId]: {
            ...(prev[widgetId] ?? {}),
            [fieldId]: (prev[widgetId]?.[fieldId] ?? []).filter((f) => f.id !== fileId),
          },
        }));
        setImgBlobUrls((prev) => {
          const next = { ...prev };
          delete next[fileId];
          return next;
        });
      } catch {
        toast.error(t("common.error.file_delete"));
      }
    },
    [t, pageIsEntity]
  );

  /**
   * 컨텐츠(Form + SubList + MultiSelect) 저장/삭제 — 완전 버전
   *
   * [설계 원칙]
   * - connectedContentWidgetIds 내 위젯들을 connectedSlug 기준으로 그룹핑
   * - 같은 slug에 속한 Form + SubList + MultiSelect를 ONE page_data 레코드에 통합 저장
   * - 파일 필드: fieldKey 값에 파일 ID 배열 직접 저장
   * - goBackAfterAction: options.onGoBack 콜백 호출 (탭은 undefined → 페이지 이탈 없음)
   */
  const handleContentAction = useCallback(
    async (
      connectedContentWidgetIds: string[],
      action: "save" | "delete",
      goBackAfterAction?: boolean,
      resolvedFormValuesMap?: Record<string, Record<string, string>>,
      /** action-button 설정의 위젯별 검증 규칙 ID 맵 (key=위젯ID) — connType='content' 전용 */
      contentValidationRuleIds?: Record<string, number[]>,
    ) => {
      /* resolvedFormValuesMap: PageGridRenderer가 crossTab 값 병합 후 전달 — 없으면 내부 formValuesMap 사용 */
      const mapToUse = resolvedFormValuesMap ?? formValuesMap;
      const allFlat = flatWidgets(widgetItems);

      /* 대상 위젯 수집 — form / sublist / multiselect */
      const targetWidgets = connectedContentWidgetIds
        .map((wid) =>
          allFlat.find(
            (w) =>
              (w.type === "form" || w.type === "sublist" || w.type === "multiselect") &&
              (w as FormWidget | SubListWidget | MultiSelectWidget).widgetId === wid
          )
        )
        .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget)[];

      if (targetWidgets.length === 0) return;

      /* slug별 그룹핑 */
      const slugGroupsMap = new Map<string, (FormWidget | SubListWidget | MultiSelectWidget)[]>();
      for (const w of targetWidgets) {
        const s = (w as FormWidget | SubListWidget | MultiSelectWidget).connectedSlug;
        if (!s) continue;
        if (!slugGroupsMap.has(s)) slugGroupsMap.set(s, []);
        slugGroupsMap.get(s)!.push(w);
      }
      if (slugGroupsMap.size === 0) return;

      /* 수정 모드 구분
       * URL params 우선, 없으면 sharedDataId(탭 공유 row id) 확인 */
      const storedGroupId = searchParams.get("group_id") ?? currentGroupId;
      const storedId = searchParams.get("id")
        ? Number(searchParams.get("id"))
        : (options?.sharedDataId ?? null);
      const isUpdate = !!(storedGroupId || storedId);

      try {
        /* ── DELETE ── */
        if (action === "delete") {
          if (!isUpdate) { toast.info(t("common.info.no_data_to_delete")); return; }
          if (!confirm(t("common.confirm.delete"))) return;

          const firstSlug = slugGroupsMap.keys().next().value!;
          if (pageIsEntity) {
            /* entity 모드: group_id 개념이 없어 storedId 우선, 없으면 storedGroupId를 id로 취급 */
            const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
            if (entityRecordId) await api.delete(entityItemPath(firstSlug, entityRecordId));
          } else if (storedGroupId) {
            await api.delete(`/page-data/${firstSlug}/group/${storedGroupId}`);
          } else {
            await api.delete(`/page-data/${firstSlug}/${storedId}`);
          }
          toast.success(t("common.deleted"));
          markClean();
          if (goBackAfterAction) options?.onGoBack?.();
          return;
        }

        /* ── SAVE ── */

        /* 유효성 검사 — cross-form hideCondition 평가를 위해 전체 values/keyToId 통합 구성 */
        const allFormValues = Object.assign({}, ...Object.values(mapToUse)) as Record<string, string>;
        const allFieldKeyToId: Record<string, string> = {};
        flatWidgets(widgetItems)
          .filter(w => w.type === 'form')
          .forEach(w => {
            const fw = w as FormWidget;
            fw.fields?.forEach(f => {
              if (!f.fieldKey) return;
              allFieldKeyToId[f.fieldKey] = f.id;
              /* contentKey.fieldKey 형식 추가 — cross-form 명시 참조용 */
              if (fw.contentKey) allFieldKeyToId[`${fw.contentKey}.${f.fieldKey}`] = f.id;
            });
          });

        for (const w of targetWidgets) {
          if (w.type !== "form") continue;
          const fw = w as FormWidget;
          if (
            !validateFormFields(
              fw.fields,
              mapToUse[fw.widgetId] ?? {},
              fileValuesMap[fw.widgetId] ?? {},
              existingFileMetaMap[fw.widgetId] ?? {},
              allFormValues,
              allFieldKeyToId,
              t,
            )
          )
            return;
        }

        /* SubList 유효성 검사 — required/minLength/maxLength/pattern/파일제한 */
        const subWidgetsForValidation = targetWidgets.filter(
          (w) => w.type === "sublist"
        ) as Array<{ type: string; widgetId?: string; required?: boolean; title?: string; columns?: import('../components/renderer/types').SubListColumn[] }>;
        if (!validateSubListRows(subWidgetsForValidation, subListRowsMap, subListFileMap, t))
          return;

        /* mainConnectedSlug가 있으면 전체 위젯을 하나의 slug로 통합 저장 */
        const slugGroups = options?.mainConnectedSlug
            ? [[options.mainConnectedSlug, targetWidgets] as [string, (FormWidget | SubListWidget | MultiSelectWidget)[]]]
            : Array.from(slugGroupsMap.entries());

        /* group_id 결정 */
        const groupId =
          slugGroups.length > 1 ? (storedGroupId ?? crypto.randomUUID()) : undefined;

        /* slug 그룹별 반복 저장 */
        for (let groupIdx = 0; groupIdx < slugGroups.length; groupIdx++) {
          const [connectedSlug, widgets] = slugGroups[groupIdx];
          const isFirstSlugGroup = groupIdx === 0;
          const newFileIdsByFieldId: Record<string, number[]> = {};

          /* 이 slug 그룹에 속한 위젯들의 검증 규칙 ID를 모두 모아 중복 제거 — 위젯별로 각각 설정된 규칙이 있을 수 있음 */
          const groupValidationRuleIds = contentValidationRuleIds
            ? [...new Set(
                widgets.flatMap((w) => contentValidationRuleIds[(w as { widgetId: string }).widgetId] ?? []),
              )]
            : [];

          /* 1. 파일 업로드
           * entity 모드는 file_meta 전용 업로드 API(/file-meta/upload) 사용 —
           * templateSlug/fieldKey는 page_data 전용 파라미터라 file_meta 쪽에는 없으므로
           * file 필드만 전송한다. page_data 모드는 기존 /page-files/upload 그대로 유지. */
          for (const w of widgets) {
            if (w.type !== "form") continue;
            const fw = w as FormWidget;
            for (const [fieldId, files] of Object.entries(fileValuesMap[fw.widgetId] ?? {})) {
              const field = fw.fields.find((f) => f.id === fieldId);
              if (!field?.fieldKey || !files.length) continue;
              const ids: number[] = [];
              for (const file of files) {
                const fd = new FormData();
                fd.append("file", file);
                let uploadRes;
                if (pageIsEntity) {
                  uploadRes = await api.post("/file-meta/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                } else {
                  fd.append("templateSlug", connectedSlug);
                  fd.append("fieldKey", field.fieldKey);
                  uploadRes = await api.post("/page-files/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                }
                ids.push(uploadRes.data.id);
              }
              newFileIdsByFieldId[fieldId] = ids;
            }
          }

          /* 2. SubList rows 처리 — 파일 업로드 포함 */
          const processedSubListRowsMap: Record<string, Record<string, unknown>[]> = {};
          for (const w of widgets) {
            if (w.type !== "sublist") continue;
            const sw = w as SubListWidget;
            const processedRows: Record<string, unknown>[] = [];
            for (const row of subListRowsMap[sw.widgetId] ?? []) {
              const { _rowId, ...rest } = row;
              const processedRow: Record<string, unknown> = { ...rest };
              for (const col of sw.columns ?? []) {
                if (!["file", "image"].includes(col.type)) continue;
                const existingIds = Array.isArray(processedRow[col.key])
                  ? (processedRow[col.key] as number[])
                  : [];
                const newFiles = subListFileMap[sw.widgetId]?.[_rowId]?.[col.id] ?? [];
                const allIds = [...existingIds];
                for (const file of newFiles) {
                  const fd = new FormData();
                  fd.append("file", file);
                  fd.append("templateSlug", connectedSlug);
                  fd.append("fieldKey", col.key);
                  const uploadRes = await api.post("/page-files/upload", fd, {
                    headers: { "Content-Type": "multipart/form-data" },
                  });
                  const newId = uploadRes.data.id;
                  allIds.push(newId);
                  newFileIdsByFieldId[col.id] = [...(newFileIdsByFieldId[col.id] ?? []), newId];
                }
                processedRow[col.key] = allIds;
              }
              processedRows.push(processedRow);
            }
            processedSubListRowsMap[sw.widgetId] = processedRows;
          }

          /* 3. formFileIdsMap 구성 — 기존 메타 ID + 신규 업로드 ID 합산 */
          const formFileIdsMap: Record<string, Record<string, number[]>> = {};
          for (const w of widgets) {
            if (w.type !== "form") continue;
            const fw = w as FormWidget;
            formFileIdsMap[fw.widgetId] = {};
            for (const f of fw.fields) {
              if (!FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) continue;
              const existingIds = (existingFileMetaMap[fw.widgetId]?.[f.id] ?? []).map((m) => m.id);
              formFileIdsMap[fw.widgetId][f.id] = [...existingIds, ...(newFileIdsByFieldId[f.id] ?? [])];
            }
          }

          /* 4. multiSelect 맵 구성 */
          const multiSelectMap: Record<string, number[]> = {};
          for (const w of widgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          /* 5. dataJson 구성
           * pageIsEntity=true(entity 연결 페이지)면 contentKey가 있어도 flat 저장 —
           * entity 저장 바디는 중첩 객체를 지원하지 않음(buildDataJson isEntity 파라미터 참고) */
          const { dataJson, pkKeys } = buildDataJson(
            widgets as Parameters<typeof buildDataJson>[0],
            mapToUse,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            options?.mainConnectedSlug,
            allFormValues,
            pageIsEntity,
          );

          /* 5-1. urlParamSaveExtras 병합 — enableUrlEditMode 시 폼에 없던 URL 파라미터를 dataJson에 추가 */
          if (Object.keys(urlParamSaveExtras).length > 0) {
            Object.entries(urlParamSaveExtras).forEach(([key, val]) => {
              if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                const hasContentKey = widgets.some(w => w.type === 'form' && (w as FormWidget).contentKey === key);
                if (hasContentKey) {
                  dataJson[key] = { ...(dataJson[key] as Record<string, unknown> ?? {}), ...(val as Record<string, unknown>) };
                }
              } else if (isFirstSlugGroup) {
                dataJson[key] = val as unknown;
              }
            });
          }

          /* 6. 저장 (생성 or 수정) */
          let savedDataId: number;

          if (pageIsEntity) {
            /* entity 모드: page_data 전용 개념(group_id 조회/contentKey 병합)을 거치지 않고
             * dataJson을 flat entity DTO 바디로 변환해 단건 CRUD만 수행한다.
             * entity는 group_id 개념이 없어 storedId 우선, 없으면 storedGroupId를 id로 취급한다. */
            const entityRecordId = storedId ?? (storedGroupId ? Number(storedGroupId) : null);
            /* 이 slug 그룹에 속한 Form 위젯들의 fields에서 날짜/일시 필드 메타를 뽑아 변환에 사용 */
            const dateFieldMeta = buildEntityDateFieldMeta(
              widgets.filter(w => w.type === 'form').flatMap(w => (w as FormWidget).fields),
            );
            const entityBody = buildEntityRequestBody(dataJson, dateFieldMeta);
            if (entityRecordId) {
              await api.put(entityItemPath(connectedSlug, entityRecordId), entityBody);
              savedDataId = entityRecordId;
            } else {
              const res = await api.post(entityApiPath(connectedSlug), entityBody);
              savedDataId = res.data.id;
              /* 신규 저장 후 생성된 id와 connectedSlug를 TabRenderer로 전달 (sharedDataId 공유) */
              options?.onDataIdCreated?.(connectedSlug, savedDataId);
            }
            /* POST/PUT 모두 성공 시 저장 완료 알림 — savedTabSet 갱신용 */
            options?.onSaved?.();
          } else {
            const slugStoredId = storedGroupId
              ? await api
                  .get(`/page-data/${connectedSlug}/group/${storedGroupId}`)
                  .then((r) => r.data.id as number)
                  .catch(() => null)
              : storedId;

            /**
             * contentKey 방식(탭 데이터 네임스페이스)인 경우:
             * - 수정: 기존 data_json GET → 현재 탭 섹션만 교체 → PUT (다른 탭 섹션 보존)
             * - 신규: { [contentKey]: {...폼데이터} } 로 감싸서 POST
             */
            let finalDataJson = dataJson;
            if (options?.contentKey) {
              let baseDataJson: Record<string, unknown> = {};
              if (slugStoredId) {
                try {
                  const getRes = await api.get(`/page-data/${connectedSlug}/${slugStoredId}`);
                  baseDataJson = (getRes.data.dataJson ?? {}) as Record<string, unknown>;
                } catch {
                  /* 기존 데이터 없으면 빈 객체로 시작 */
                }
              }
              /* 탭키 없이 폼 섹션 직접 merge (다른 탭 섹션 보존) */
              finalDataJson = { ...baseDataJson, ...dataJson };
            }

            if (slugStoredId) {
              await api.put(`/page-data/${connectedSlug}/${slugStoredId}`, {
                dataJson: finalDataJson,
                ...(pageSlug && { templateSlug: pageSlug }),
                ...(groupValidationRuleIds.length > 0 && { validationRuleIds: groupValidationRuleIds }),
              });
              savedDataId = slugStoredId;
            } else {
              const res = await api.post(`/page-data/${connectedSlug}`, {
                dataJson: finalDataJson,
                ...(pkKeys.length > 0 && { pkKeys }),
                ...(groupId && { groupId }),
                ...(pageSlug && { templateSlug: pageSlug }),
                ...(groupValidationRuleIds.length > 0 && { validationRuleIds: groupValidationRuleIds }),
              });
              savedDataId = res.data.id;
              /* group_id가 새로 생성된 경우 상태에 저장 */
              if (groupId && !storedGroupId) setCurrentGroupId(groupId);
              /* 탭 신규 저장 후 생성된 id와 connectedSlug를 TabRenderer로 전달 (sharedDataId 공유) */
              options?.onDataIdCreated?.(connectedSlug, savedDataId);
            }
            /* POST/PUT 모두 성공 시 저장 완료 알림 — savedTabSet 갱신용 */
            options?.onSaved?.();
          }

          /* 7. 업로드 파일 → page_data 레코드 연결
           * entity 모드는 이 연결(link) 단계 자체가 필요 없다 — 업로드된 파일ID를 dataJson에 담아
           * entity 바디로 저장하는 것 자체가 이미 연결이며(buildEntityRequestBody가 처리), entity
           * row id를 page_data id인 것처럼 PATCH하면 서로 다른 테이블 간 id 이름공간이 충돌할 위험이
           * 있으므로 entity 모드에서는 이 블록 전체를 건너뛴다. */
          if (!pageIsEntity) {
            const allNewIds = Object.values(newFileIdsByFieldId).flat();
            if (allNewIds.length > 0) {
              await api.patch("/page-files/link", { fileIds: allNewIds, dataId: savedDataId });
              setFileValuesMap((prev) => {
                const next = { ...prev };
                widgets.forEach((w) => {
                  if (w.type === "form") delete next[(w as FormWidget).widgetId];
                });
                return next;
              });
            }
          }

          /* 8. 저장 후 파일 메타 재조회 */
          try {
            const fileIds: number[] = [];
            const collectIds = (obj: Record<string, unknown>) => {
              Object.values(obj).forEach((v) => {
                if (Array.isArray(v) && v.every((x) => typeof x === "number"))
                  fileIds.push(...(v as number[]));
                else if (v && typeof v === "object" && !Array.isArray(v))
                  collectIds(v as Record<string, unknown>);
              });
            };
            collectIds(dataJson);

            if (fileIds.length > 0) {
              /* entity 모드: file_meta 전용 API 사용 — 응답 필드명이 origName이 아닌
               * originalName(camelCase)이라 조회 직후 기존 { id, origName, fileSize } 형태로
               * 맞춰 이후 로직은 공용으로 재사용한다. (restoreFormDataFromJson과 동일 패턴) */
              const metaList = pageIsEntity
                ? await api
                    .get("/file-meta", { params: { ids: fileIds.join(",") } })
                    .then((r) =>
                      (r.data as { id: number; originalName: string; fileSize: number; mimeType: string }[]).map(
                        (m) => ({ id: m.id, origName: m.originalName, fileSize: m.fileSize })
                      )
                    )
                : await api
                    .get("/page-files/meta", { params: { ids: fileIds.join(",") } })
                    .then(
                      (r) =>
                        r.data as {
                          id: number;
                          fieldKey: string;
                          origName: string;
                          fileSize: number;
                          mimeType: string;
                        }[]
                    );

              for (const w of widgets) {
                if (w.type !== "form") continue;
                const fw = w as FormWidget;
                const section = fw.contentKey
                  ? (dataJson[fw.contentKey] as Record<string, unknown>)
                  : dataJson;
                const imageFieldIds = new Set(
                  fw.fields.filter((f) => f.type === "image").map((f) => f.id)
                );
                const metaByFieldId: Record<
                  string,
                  { id: number; origName: string; fileSize: number }[]
                > = {};
                fw.fields.forEach((f) => {
                  if (!f.fieldKey || !FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number]))
                    return;
                  const ids = section[f.fieldKey];
                  if (!Array.isArray(ids)) return;
                  metaByFieldId[f.id] = (ids as number[]).map((id) => {
                    const m = metaList.find((m) => m.id === id);
                    return m
                      ? { id: m.id, origName: m.origName, fileSize: m.fileSize }
                      : { id, origName: "", fileSize: 0 };
                  });
                  /* 이미지/동영상/미디어 타입은 blob URL 생성 */
                  if (imageFieldIds.has(f.id) || f.type === "video" || f.type === "media") {
                    (ids as number[]).forEach((id) => {
                      if (imgBlobUrls[id]) return;
                      const blobReq = pageIsEntity
                        ? api.get(`/file-meta/${id}/download`, { responseType: "blob" })
                        : api.get(`/page-files/${id}`, { responseType: "blob" });
                      blobReq
                        .then((blobRes) =>
                          setImgBlobUrls((prev) => ({
                            ...prev,
                            [id]: URL.createObjectURL(blobRes.data),
                          }))
                        )
                        .catch(() => {});
                    });
                  }
                });
                setExistingFileMetaMap((prev) => ({ ...prev, [fw.widgetId]: metaByFieldId }));
              }
            }
          } catch {
            /* 파일 메타 갱신 실패는 조용히 처리 */
          }
        } /* slug 그룹 반복 끝 */

        toast.success(isUpdate ? t("common.updated") : t("common.saved"));
        markClean();
        if (goBackAfterAction) options?.onGoBack?.();
      } catch (err: unknown) {
        const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
        if (action === "save" && response?.status === 409) {
          toast.error(response.data?.message || t("common.error.duplicate_key"));
        } else {
          toast.error(
            action === "save" ? t("common.error.save") : t("common.error.delete")
          );
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      widgetItems,
      formValuesMap,
      fileValuesMap,
      subListRowsMap,
      subListFileMap,
      existingFileMetaMap,
      imgBlobUrls,
      multiSelectValuesMap,
      searchParams,
      currentGroupId,
      pageSlug,
      options,
      markClean,
    ]
  );

  /**
   * 데이터저장 버튼 핸들러 — connType='datasave' 전용
   * form/sublist/multiselect/table 위젯 데이터를 dataSaveSlug 엔드포인트에 신규 저장
   */
  const handleDataSave = useCallback(
    async (
      connectedContentWidgetIds: string[],
      dataSaveSlug: string,
      goBackAfterAction?: boolean,
      paramSave?: string,
      /** action-button 설정의 검증 규칙 ID 목록 — connType='datasave' 전용, 요청 바디에 그대로 포함 */
      validationRuleIds?: number[],
    ) => {
      if (!dataSaveSlug) return;
      const allFlat = flatWidgets(widgetItems);

      /* 대상 위젯 수집 — form / sublist / multiselect / table */
      const targetWidgets = connectedContentWidgetIds
        .map((wid) =>
          allFlat.find(
            (w) =>
              (w.type === "form" || w.type === "sublist" || w.type === "multiselect" || w.type === "table") &&
              (w as FormWidget | SubListWidget | MultiSelectWidget | TableWidget).widgetId === wid
          )
        )
        .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget | TableWidget)[];

      if (targetWidgets.length === 0) { toast.warning(t("common.widget.no_content")); return; }

      /* 유효성 검사 — form / sublist / multiselect / table 통합 */
      if (!validateDataSaveWidgets({
        targetWidgets: targetWidgets as Parameters<typeof validateDataSaveWidgets>[0]['targetWidgets'],
        formValuesMap,
        fileValuesMap,
        existingFileMetaMap,
        subListRowsMap,
        subListFileMap,
        multiSelectValuesMap,
        tableSelectedRowsMap,
        t,
      })) return;

      const nonTableWidgets = targetWidgets.filter(w => w.type !== 'table') as (FormWidget | SubListWidget | MultiSelectWidget)[];
      const tableWidgets    = targetWidgets.filter(w => w.type === 'table') as TableWidget[];

      try {
        let anySaved = false;

        /* form / sublist / multiselect → 파일 업로드 + dataJson 저장 */
        if (nonTableWidgets.length > 0) {
          const { formFileIdsMap, processedSubListRowsMap, allNewIds } = await processFormFilesAndSubList({
            targetWidgets: nonTableWidgets as Parameters<typeof processFormFilesAndSubList>[0]['targetWidgets'],
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            dataSaveSlug,
          });

          const multiSelectMap: Record<string, number[]> = {};
          for (const w of nonTableWidgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          const dataSaveAllFormValues = Object.assign({}, ...Object.values(formValuesMap)) as Record<string, string>;
          const { dataJson, pkKeys } = buildDataJson(
            nonTableWidgets as Parameters<typeof buildDataJson>[0],
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            options?.mainConnectedSlug,
            dataSaveAllFormValues,
          );

          const res = await api.post(
            `/page-data/${dataSaveSlug}`,
            buildDataSavePayload({ dataJson, pkKeys, templateSlug: pageSlug, validationRuleIds }),
          );

          if (allNewIds.length > 0 && res.data.id) {
            await api.patch("/page-files/link", { fileIds: allNewIds, dataId: res.data.id });
          }
          anySaved = true;
        }

        /* table 위젯 행 저장 — 선택된 행(enableRowSelection=true) 또는 전체 행 */
        for (const tw of tableWidgets) {
          const allRows     = tableDataMapRef.current[tw.widgetId]?.rows ?? [];
          const selectedIds = tableSelectedRowsMap[tw.widgetId] ?? [];
          const rowsToSave  = tw.enableRowSelection
            ? allRows.filter(r => selectedIds.includes(Number(r['_id'])))
            : allRows;

          if (rowsToSave.length === 0) { toast.warning(t('common.table.no_save_data')); return; }

          const tableExtras = paramSave
            ? {}
            : (urlParamSaveExtras[tw.contentKey] ?? {}) as Record<string, unknown>;
          const saved = await saveTableRows({
            contentKey:   tw.contentKey,
            columns:      tw.columns,
            rows:         rowsToSave,
            extras:       tableExtras,
            dataSaveSlug,
            templateSlug: pageSlug,
            paramSave,
            validationRuleIds,
          });
          if (saved > 0) anySaved = true;
        }

        if (anySaved) {
          toast.success(t("common.saved"));
          markClean();
          if (goBackAfterAction) options?.onGoBack?.();
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, t("common.error.save")));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetItems, formValuesMap, fileValuesMap, subListRowsMap, subListFileMap, existingFileMetaMap, multiSelectValuesMap, tableSelectedRowsMap, urlParamSaveExtras, pageSlug, options, markClean]
  );

  /**
   * API 연동 실행 핸들러 — connType='api' 전용 (live 모드 전용, preview에서는 절대 호출 금지)
   *
   * apiInfoId로 캐싱된 API 정보(apiInfoOptions)를 찾아 실제 요청을 실행한다.
   * - urlPattern의 "/api/v1" 접두사는 axios baseURL과 중복되므로 제거
   * - urlPattern에 "{key}" 형태 path 변수가 있으면 파라미터 값으로 치환(사용된 키는 나머지 파라미터에서 제거)
   * - method가 GET/DELETE면 나머지 파라미터를 쿼리스트링으로, POST/PUT/PATCH면 요청 바디로 전송
   * - method가 POST/PUT/PATCH이고 connectedContentWidgetIds(Form/SubList/MultiSelect)가 선택된 경우,
   *   handleDataSave와 동일하게 파일 업로드+SubList 가공 → dataJson 구성 후 요청 바디에 함께 실어 보낸다
   *   (선택 위젯 데이터가 base, 고정 params가 오버레이 — 동일 key는 params가 우선)
   *
   * @param apiInfoId  action-button 설정에서 선택한 api_info.id
   * @param paramsStr  action-button 설정의 params 문자열 (예: "id='1',status='use'") — row 컨텍스트 없이 고정값만 유효
   * @param connectedContentWidgetIds  action-button 설정에서 선택한 Form/SubList/MultiSelect widgetId 배열 (Table 제외)
   */
  const handleApiCall = useCallback(
    async (apiInfoId: number, paramsStr?: string, connectedContentWidgetIds?: string[]) => {
      const apiInfo = apiInfoOptions.find((a) => a.id === apiInfoId);
      if (!apiInfo) {
        console.warn(`[handleApiCall] 연결된 API 정보를 찾을 수 없습니다. apiInfoId=${apiInfoId}`);
        toast.error("연결된 API를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
        return;
      }

      /* 파라미터 문자열 파싱 — row 컨텍스트 없음(빈 객체) → "key='값'" 고정값 형태만 유효하게 동작 */
      const parsedParams = parseActionParams(paramsStr, {});

      /* baseURL(/api/v1)과 중복되지 않도록 urlPattern 앞의 /api/v1 접두사 제거 */
      let url = apiInfo.urlPattern.startsWith("/api/v1")
        ? apiInfo.urlPattern.slice("/api/v1".length)
        : apiInfo.urlPattern;

      /* {key} 형태 path 변수를 파싱된 파라미터 값으로 치환 — 치환에 사용한 키는 나머지 파라미터에서 제거 */
      const restParams: Record<string, string> = { ...parsedParams };
      url = url.replace(/\{([^}]+)\}/g, (matched, key: string) => {
        if (!(key in restParams)) return matched;
        const val = restParams[key];
        delete restParams[key];
        return encodeURIComponent(val);
      });

      const method = (apiInfo.method || "GET").toUpperCase();
      const isBodyMethod = method === "POST" || method === "PUT" || method === "PATCH";

      /* 연결된 컨텐츠 위젯(Form/SubList/MultiSelect) 데이터 수집 — POST/PUT/PATCH에서만 적용 */
      let contentBody: Record<string, unknown> = {};
      /* 부모(Form)와 다른 Entity(connectedSlug)에 연결된 자식 SubList 목록 — connectedEntity가 있고
       * 부모 Form이 선택돼 있을 때만 채워진다. 부모 body에 함께 보내면 부모 entity DTO에 없는
       * 필드라 저장이 실패/무시되므로 부모 저장 성공 후 별도 엔드포인트로 개별 저장한다. */
      let childSubListWidgets: SubListWidget[] = [];
      /* 자식 SubList widgetId → 파일 업로드까지 완료된 행 목록 (processFormFilesAndSubList 결과) */
      let childSubListRowsMap: Record<string, Record<string, unknown>[]> = {};

      if (isBodyMethod && connectedContentWidgetIds && connectedContentWidgetIds.length > 0) {
        const allFlat = flatWidgets(widgetItems);
        const targetWidgets = connectedContentWidgetIds
          .map((wid) =>
            allFlat.find(
              (w) =>
                (w.type === "form" || w.type === "sublist" || w.type === "multiselect") &&
                (w as FormWidget | SubListWidget | MultiSelectWidget).widgetId === wid
            )
          )
          .filter(Boolean) as (FormWidget | SubListWidget | MultiSelectWidget)[];

        if (targetWidgets.length > 0) {
          /* 유효성 검사 — handleDataSave와 동일 공통함수 재사용 (Table 제외이므로 tableSelectedRowsMap 미전달) */
          if (!validateDataSaveWidgets({
            targetWidgets: targetWidgets as Parameters<typeof validateDataSaveWidgets>[0]['targetWidgets'],
            formValuesMap,
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            multiSelectValuesMap,
            t,
          })) return;

          /* 부모 Form(들) 및 그 connectedSlug — 부모와 다른 connectedSlug를 쓰는 SubList만 자식으로 분류.
           * 부모 Form이 아예 선택돼 있지 않으면(=단일 SubList API연동 등) 체이닝 대상이 없으므로
           * 기존과 동일하게 전부 하나의 body로 합쳐 보낸다. */
          const formWidgetsForParent = targetWidgets.filter((w) => w.type === "form") as FormWidget[];
          const parentConnectedSlug = formWidgetsForParent[0]?.connectedSlug;
          childSubListWidgets = (apiInfo.connectedEntity && formWidgetsForParent.length > 0)
            ? (targetWidgets.filter(
                (w) =>
                  w.type === "sublist" &&
                  (w as SubListWidget).connectedSlug &&
                  (w as SubListWidget).connectedSlug !== parentConnectedSlug,
              ) as SubListWidget[])
            : [];
          const childWidgetIds = new Set(childSubListWidgets.map((w) => w.widgetId));
          /* 부모 body 조립 대상 — 자식으로 분류된 SubList만 제외(나머지는 기존과 동일하게 합쳐 보냄) */
          const parentBodyWidgets = targetWidgets.filter(
            (w) => !(w.type === "sublist" && childWidgetIds.has((w as SubListWidget).widgetId)),
          );

          /* 파일 업로드 + SubList 행 가공 — buildDataJson 이전에 반드시 먼저 실행 (최신 fileIds 반영)
           * 자식 SubList의 파일 컬럼도 이 단계에서 함께 처리되므로 targetWidgets 전체를 넘긴다 */
          const { formFileIdsMap, processedSubListRowsMap } = await processFormFilesAndSubList({
            targetWidgets: targetWidgets as Parameters<typeof processFormFilesAndSubList>[0]['targetWidgets'],
            fileValuesMap,
            existingFileMetaMap,
            subListRowsMap,
            subListFileMap,
            /* 임의 API 엔드포인트라 저장 대상 slug가 없음 — 업로드 파일 메타 구분용으로 현재 페이지 slug 사용 */
            dataSaveSlug: pageSlug ?? "",
          });
          childSubListRowsMap = processedSubListRowsMap;

          const multiSelectMap: Record<string, number[]> = {};
          for (const w of targetWidgets) {
            if (w.type !== "multiselect") continue;
            const mw = w as MultiSelectWidget;
            multiSelectMap[mw.widgetId] = multiSelectValuesMap[mw.widgetId] ?? [];
          }

          /* apiInfo.connectedEntity가 있으면 entity 저장 API(예: TestDataController)이므로
           * contentKey 유무와 무관하게 항상 flat 바디로 보내야 함(entity 저장 바디는 중첩 객체 미지원).
           * connectedEntity가 없는 일반 외부 API는 기존과 동일하게 contentKey 기준 nested 처리 유지.
           *
           * mainConnectedSlug는 "현재 페이지 자체의 entity 연결 slug" — API연동(connType='api')은
           * 페이지와 무관한 임의의 다른 API를 호출하는 것이므로 여기서는 절대 전달하면 안 됨.
           * 전달하면 buildDataJson의 _rel 분기(utils.ts)가 선택 위젯의 connectedSlug를 페이지의
           * mainConnectedSlug와 비교해 엉뚱하게 _rel로 감싸버릴 수 있음. */
          const { dataJson } = buildDataJson(
            parentBodyWidgets as Parameters<typeof buildDataJson>[0],
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            undefined,
            undefined,
            !!apiInfo.connectedEntity,
          );

          /* connectedEntity가 있으면 entity 요청 DTO가 기대하는 camelCase 필드명 + 날짜 오프셋 포맷으로
           * 변환해서 보내야 한다 — handleContentAction의 entity 저장 분기(§02.builder_data_process.md)와
           * 동일한 패턴. 변환 없이 fieldKey(snake_case 등) 그대로 보내면 codegen DTO가 알 수 없는
           * 필드로 요청을 거부한다. connectedEntity가 없는 일반 외부 API는 기존과 동일하게 그대로 사용. */
          contentBody = apiInfo.connectedEntity
            ? buildEntityRequestBody(dataJson, buildEntityDateFieldMeta(formWidgetsForParent.flatMap((fw) => fw.fields)))
            : dataJson;
        }
      }

      try {
        if (method === "GET" || method === "DELETE") {
          await api.request({ method, url, params: restParams });
          toast.success(`${apiInfo.name} 요청이 완료되었습니다.`);
        } else if (childSubListWidgets.length > 0) {
          /* 부모(Form) + 자식(SubList, 다른 Entity) 체이닝 저장
           * 1) 부모를 먼저 저장(POST/PUT)해 생성/수정된 id를 응답에서 확보
           * 2) parentIdField가 설정된 자식 SubList만 각 행에 그 id를 주입해 자식 entity 엔드포인트로 개별 POST
           * 3) parentIdField 미설정 자식은 저장하지 않고 경고로 알린다(결함을 조용한 스킵으로 덮지 않는다) */
          const parentRes = await api.request({ method, url, data: { ...contentBody, ...restParams } });
          const parentId = (parentRes.data as { id?: number } | undefined)?.id;

          const warnings: string[] = [];
          let childOkCount = 0;
          let childFailCount = 0;

          for (const sw of childSubListWidgets) {
            const swLabel = sw.title || sw.contentKey || sw.widgetId;
            if (!sw.parentIdField) {
              warnings.push(`"${swLabel}" 항목은 부모 연결 필드가 설정되지 않아 저장되지 않았습니다.`);
              continue;
            }
            if (parentId == null) {
              warnings.push(`"${swLabel}" 항목은 부모 저장 응답에 id가 없어 저장되지 않았습니다.`);
              continue;
            }
            const rows = childSubListRowsMap[sw.widgetId] ?? [];
            const dateFieldMeta = buildSubListEntityDateFieldMeta(sw.columns ?? []);
            const childUrl = entityApiPath(sw.connectedSlug!);
            for (const row of rows) {
              /* row에는 SubList 내부 관리용 UUID인 id 필드가 섞여 있다(SubListRenderer의 행 추가/복사 시
               * _rowId와 함께 영속 저장됨). 자식 entity 요청 DTO에는 id 필드가 없어 그대로 보내면
               * MALFORMED_JSON(Unrecognized field "id")으로 거부되므로 제거 후 전송한다. */
              const { id: _rowId, ...rowData } = row;
              const rowBody = buildEntityRequestBody({ ...rowData, [sw.parentIdField]: parentId }, dateFieldMeta);
              try {
                await api.post(childUrl, rowBody);
                childOkCount++;
              } catch {
                childFailCount++;
              }
            }
          }

          if (childFailCount > 0) {
            toast.error(`${apiInfo.name} 요청은 완료됐지만 하위 항목 ${childFailCount}건 저장에 실패했습니다.`);
          } else if (warnings.length > 0) {
            toast.warning(warnings.join(" "));
          } else {
            toast.success(
              childOkCount > 0
                ? `${apiInfo.name} 요청이 완료되었습니다. (하위 ${childOkCount}건 저장)`
                : `${apiInfo.name} 요청이 완료되었습니다.`,
            );
          }
        } else {
          /* 위젯 데이터(contentBody)가 base, 고정 params(restParams)가 오버레이 */
          await api.request({ method, url, data: { ...contentBody, ...restParams } });
          toast.success(`${apiInfo.name} 요청이 완료되었습니다.`);
        }
      } catch (err) {
        toast.error(getApiErrorMessage(err, "요청을 실행할 수 없습니다."));
      }
    },
    [
      apiInfoOptions,
      widgetItems,
      formValuesMap,
      fileValuesMap,
      subListRowsMap,
      subListFileMap,
      existingFileMetaMap,
      multiSelectValuesMap,
      multiSelectExtraFieldValuesMap,
      pageSlug,
      options,
      t,
    ]
  );

  /* 테이블 전체 새로고침 */
  const handleRefresh = useCallback(() => {
    const fieldsMap = buildSearchFieldsMap(widgetItems);
    const sv = searchValuesRef.current;
    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== "table") return;
      const connectedSlug = (w as TableWidget).connectedSlug;
      if (!connectedSlug) return;
      const searchFields = (w as TableWidget).connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({ tableWidget: w as TableWidget, connectedSlug, searchFields, sv, page: 0 });
    });
  }, [widgetItems, fetchTableData]);

  /* 무한스크롤 다음 페이지 */
  const handleLoadMore = useCallback(
    (tableWidgetId: string) => {
      const td = tableDataMapRef.current[tableWidgetId];
      if (!td || !td.hasMore || td.loading || td.appendLoading) return;
      const fieldsMap = buildSearchFieldsMap(widgetItems);
      const tableWidget = flatWidgets(widgetItems).find(
        (w) => w.type === "table" && (w as TableWidget).widgetId === tableWidgetId
      ) as TableWidget | undefined;
      if (!tableWidget?.connectedSlug) return;
      const searchFields = tableWidget.connectedSearchIds.flatMap((sid: string) => fieldsMap[sid] ?? []);
      fetchTableData({
        tableWidget,
        connectedSlug: tableWidget.connectedSlug,
        searchFields,
        sv: searchValuesRef.current,
        page: td.nextPage,
        sk: sortKeyMap[tableWidgetId] ?? undefined,
        sd: sortDirMap[tableWidgetId] ?? "asc",
        append: true,
      });
    },
    [widgetItems, sortKeyMap, sortDirMap, fetchTableData]
  );

  /* 카테고리 선택 */
  const handleCategorySelect = useCallback((widgetId: string, selectedId: number | null) => {
    setCategorySelections((prev) => ({ ...prev, [widgetId]: selectedId }));
  }, []);

  /* 엑셀 다운로드용 현재 검색 파라미터 — hideCondition 충족 필드 제외 */
  const currentSearchParams = useMemo(() => {
    const fieldsMap = buildSearchFieldsMap(widgetItems);
    const keyToId: Record<string, string> = {};
    Object.values(fieldsMap).flat().forEach(f => { if (f.fieldKey) keyToId[f.fieldKey] = f.id; });
    const params: Record<string, string> = {};
    Object.values(fieldsMap).flat().forEach(f => {
      /* 검색제외 필드는 엑셀다운로드 파라미터에서도 제외 */
      if (f.excludeFromSearch) return;
      const hideResult = f.hideCondition ? evalFieldCondition(f.hideCondition, keyToId, searchValues) : false;
      if (f.hideCondition && hideResult) return;
      /* dateRange/yearMonthRange: from/to 분리 저장이므로 각각 파라미터로 전송 */
      if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
        const paramKey = f.fieldKey || f.label;
        const from = searchValues[f.id + '_from'];
        const to   = searchValues[f.id + '_to'];
        if (paramKey) {
          /* singleDateRange=true: 단일 date 컬럼 범위 필터용 _gte/_lte 파라미터 전송 */
          if (f.singleDateRange) {
            if (from?.trim()) params[`${paramKey}_gte`] = from;
            if (to?.trim())   params[`${paramKey}_lte`] = to;
          } else {
            if (from?.trim()) params[`${paramKey}_from`] = from;
            if (to?.trim())   params[`${paramKey}_to`]   = to;
          }
        }
        return;
      }
      const val = searchValues[f.id];
      if (!val || !val.trim()) return;
      /* category + relationSlugId: FILTER slug_relation 파라미터 */
      if (f.type === 'category' && f.relationSlugId) {
        params[`rel_${f.relationSlugId}`] = val;
        return;
      }
      if (f.type === 'dateRangeStatus' && f.linkedDateRangeKey) {
        params[`drs_${f.linkedDateRangeKey}`] = val;
      } else {
        const paramKey = f.fieldKey || f.label;
        if (paramKey) params[paramKey] = val;
      }
    });
    return params;
  }, [searchValues, widgetItems]);

  /* PageGridRenderer에 바로 spread할 수 있도록 묶어서 반환 */
  const gridProps = {
    searchValues,
    onSearchChange: updateSearchValue,
    onSearch: handleSearch,
    onReset: handleReset,
    formValuesMap,
    onFormValuesChange: updateFormValue,
    onContentAction: handleContentAction,
    onDataSave: handleDataSave,
    onApiCall: handleApiCall,
    subListRowsMap,
    onSubListRowsChange: (wId: string, rows: SubListRow[]) => {
      setSubListRowsMap((prev) => ({ ...prev, [wId]: rows }));
      markDirty();
    },
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort: handleSortChange,
    onPageChange: handlePageChange,
    onLoadMore: handleLoadMore,
    tableSelectedRowsMap,
    onTableRowsSelect: (wId: string, ids: number[]) =>
      setTableSelectedRowsMap((prev) => ({ ...prev, [wId]: ids })),
    categorySelections,
    onCategorySelect: handleCategorySelect,
    onRefresh: handleRefresh,
    pageSlug,
    currentSearchParams,
    leaveCheck: options?.leaveCheck ?? false,
    /* 파일 업로드 */
    fileValuesMap,
    existingFileMetaMap,
    imgBlobUrls,
    onFileChange: handleFileChange,
    onRemoveExisting: handleRemoveExisting,
    /* 멀티셀렉트 */
    multiSelectValuesMap,
    onMultiSelectChange: (wId: string, ids: number[]) => {
      setMultiSelectValuesMap((prev) => ({ ...prev, [wId]: ids }));
      markDirty();
    },
    multiSelectExtraFieldValuesMap,
    onMultiSelectExtraFieldChange: (wId: string, itemId: number, fieldKey: string, value: string) =>
      setMultiSelectExtraFieldValuesMap((prev) => ({
        ...prev,
        [wId]: {
          ...(prev[wId] ?? {}),
          [itemId]: { ...(prev[wId]?.[itemId] ?? {}), [fieldKey]: value },
        },
      })),
    /* _fetchedRel{id} 데이터 맵 — FormRenderer rowData 확장용 */
    formFetchRelMap,
    /* entity 연결 페이지 여부 — 파일 다운로드 경로 분기용 (FieldRenderer까지 전달) */
    pageIsEntity,
  };

  return { gridProps, setSubListRowsMap, confirmLeave };
}
