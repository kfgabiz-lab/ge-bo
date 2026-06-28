"use client";

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
import api from "@/lib/api";
import { buildDataJson, validateFormFields, validateSubListRows, uploadFiles, buildTableRow, applySortChange, initFormDefaultValues, validateDataSaveWidgets, saveTableRows, processFormFilesAndSubList, evalFieldCondition, validateSearchDateRange } from "../utils";
import { FILE_FIELD_TYPES } from "../constants";
import { useI18n } from "@/hooks/use-i18n";
import type { PageWidgetItem, PageTableData } from "../components/renderer/PageGridRenderer";
import type { AnyWidget } from "../components/renderer/types";
import type { TableWidget } from "../components/builder/TableBuilder";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { SubListWidget, MultiSelectWidget } from "../components/renderer/types";
import type { SubListRow } from "../components/renderer/SubListRenderer";
import type { SearchFieldConfig } from "../types";

const DEFAULT_PAGE_SIZE = 10;

/** widgetItems 배열을 평탄화하여 모든 위젯 반환 */
export function flatWidgets(items: PageWidgetItem[]): AnyWidget[] {
  return items.flatMap((item) => item.contents.map((c) => c.widget));
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
    }: {
      tableWidget: TableWidget;
      connectedSlug: string;
      searchFields: SearchFieldConfig[];
      sv: Record<string, string>;
      page?: number;
      sk?: string | null;
      sd?: "asc" | "desc";
      append?: boolean;
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
          /* dateRangeStatus: drs_{linkedDateRangeKey}=before|in_range|after 형식으로 변환 */
          if (f.type === 'dateRangeStatus' && f.linkedDateRangeKey) {
            params[`drs_${f.linkedDateRangeKey}`] = val;
          } else {
            const paramKey = f.fieldKey || f.label;
            if (paramKey) params[paramKey] = val;
          }
        });

        const res = await api.get(`/page-data/${connectedSlug}`, { params });
        const rows = (
          res.data.content as {
            id: number;
            groupId?: string | null;
            dataJson: Record<string, unknown>;
            createdAt?: string | null;
            createdBy?: string | null;
            updatedAt?: string | null;
            updatedBy?: string | null;
          }[]
        ).map(buildTableRow);

        const hasMore = res.data.last === false;
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: {
            rows: append ? [...(prev[wid]?.rows ?? []), ...rows] : rows,
            totalElements: res.data.totalElements,
            totalPages: res.data.totalPages,
            currentPage: page,
            loading: false,
            appendLoading: false,
            hasMore,
            nextPage: hasMore ? page + 1 : page,
          },
        }));
      } catch {
        toast.error("데이터를 불러오는 중 오류가 발생했습니다.");
        setTableDataMap((prev) => ({
          ...prev,
          [wid]: { ...(prev[wid] ?? empty), loading: false, appendLoading: false },
        }));
      }
    },
    []
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
        if ((f.type === 'date' || f.type === 'yearMonth') && (f.defaultDateOffset !== undefined || f.defaultDate)) {
          /* dateSubType에 따라 날짜 포맷 분기 (yearMonth 기존 타입은 yearMonth subType으로 처리) */
          const subType = f.type === 'yearMonth' ? 'yearMonth' : (f.dateSubType ?? 'date');
          const calcDateBySubType = (offset: number): string => {
            const d = new Date(); d.setDate(d.getDate() - offset);
            const iso = d.toISOString();
            if (subType === 'yearMonth') return iso.slice(0, 7);
            if (subType === 'datetime') return iso.slice(0, 16);
            return iso.slice(0, 10);
          };
          const val = (f.defaultDateOffset !== undefined && f.defaultDateOffset !== 0) ? calcDateBySubType(f.defaultDateOffset) : (f.defaultDate ?? '');
          if (val) initVals[f.id] = val;
        } else if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
          /* rangeSubType에 따라 날짜 포맷 분기 */
          const subType = f.rangeSubType ?? (f.type === 'yearMonthRange' ? 'yearMonth' : 'date');
          const calcRangeDate = (offset: number): string => {
            const d = new Date(); d.setDate(d.getDate() - offset);
            const iso = d.toISOString();
            if (subType === 'yearMonth') return iso.slice(0, 7);
            if (subType === 'datetime') return iso.slice(0, 16);
            return iso.slice(0, 10);
          };
          const start = (f.defaultStartDateOffset !== undefined && f.defaultStartDateOffset !== 0) ? calcRangeDate(f.defaultStartDateOffset) : (f.defaultStartDate ?? '');
          const end   = (f.defaultEndDateOffset   !== undefined && f.defaultEndDateOffset   !== 0) ? calcRangeDate(f.defaultEndDateOffset)   : (f.defaultEndDate   ?? '');
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

    /** dataJson → 폼·SubList·MultiSelect 상태 복원 + 파일 메타·blob URL 로드 */
    const restoreFromDataJson = async (
      dataJson: Record<string, unknown>,
      forms: FormWidget[],
      sublists: SubListWidget[],
      multiSels: MultiSelectWidget[],
    ) => {
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

      multiSels.forEach(mw => {
        if (!mw.contentKey) return;
        /* _rel[connectedSlug] 우선 확인 — mainConnectedSlug 설정 시 해당 경로에 저장됨 */
        const rel = dataJson['_rel'] as Record<string, unknown> | undefined;
        const raw = (mw.connectedSlug && rel?.[mw.connectedSlug]) ?? dataJson[mw.contentKey];
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
          const metaRes = await api.get('/page-files/meta', { params: { ids: fileIds.join(',') } });
          const metaList = metaRes.data as { id: number; origName: string; fileSize: number; mimeType: string }[];
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
                  api.get(`/page-files/${id}`, { responseType: 'blob' })
                    .then(r => setImgBlobUrls(prev => ({ ...prev, [id]: URL.createObjectURL(r.data) })))
                    .catch(() => {});
                });
              }
            });
            setExistingFileMetaMap(prev => ({ ...prev, [fw.widgetId]: metaByFieldId }));
          });
        }
      } catch { /* 파일 없으면 조용히 처리 */ }
    };

    if (queryGroupId) {
      setCurrentGroupId(queryGroupId);
      const slugSet = new Set([
        ...formWidgets.map(fw => fw.connectedSlug),
        ...sublistWidgets.map(sw => sw.connectedSlug),
        ...multiSelWidgets.map(mw => mw.connectedSlug),
      ].filter((s): s is string => !!s));
      slugSet.forEach(s => {
        api.get(`/page-data/${s}/group/${queryGroupId}`)
          .then(async dataRes => {
            const dataJson = (dataRes.data.dataJson || {}) as Record<string, unknown>;
            await restoreFromDataJson(
              dataJson,
              formWidgets.filter(fw => fw.connectedSlug === s),
              sublistWidgets.filter(sw => sw.connectedSlug === s),
              multiSelWidgets.filter(mw => mw.connectedSlug === s),
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
        api.get(`/page-data/${connectedSlug}/${Number(queryId)}`)
          .then(async dataRes => {
            const dataJson = (dataRes.data.dataJson || {}) as Record<string, unknown>;
            await restoreFromDataJson(dataJson, formWidgets, sublistWidgets, multiSelWidgets);
            applyUrlParams();
          })
          .catch(() => toast.error('기존 데이터를 불러오는 중 오류가 발생했습니다.'));
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
   * 흐름: GET /page-data/{connectedSlug}/{sharedDataId}
   *   → dataJson[TabItem.contentKey] → section
   *   → section[FormWidget.contentKey] → 필드값
   *   → formValuesMap 세팅
   */
  useEffect(() => {
    if (!widgetItems.length) return;
    const id = options?.sharedDataId ?? null;
    if (!id) return;

    const forms = flatWidgets(widgetItems).filter((w) => w.type === 'form') as FormWidget[];
    if (!forms.length) return;

    const connectedSlug = forms[0].connectedSlug;
    if (!connectedSlug) return;

    api.get(`/page-data/${connectedSlug}/${id}`)
      .then((dataRes) => {
        const rawDataJson = (dataRes.data.dataJson ?? {}) as Record<string, unknown>;

        /* 폼 contentKey 레벨에서 바로 접근 (탭키 감싸기 제거) */
        const tabSection: Record<string, unknown> = rawDataJson;

        /* 파일 ID 수집 (메타 로드용) */
        const allFileIds: number[] = [];
        const collectIds = (obj: Record<string, unknown>) => {
          Object.values(obj).forEach((v) => {
            if (Array.isArray(v) && v.every((x) => typeof x === 'number')) allFileIds.push(...(v as number[]));
            else if (v && typeof v === 'object' && !Array.isArray(v)) collectIds(v as Record<string, unknown>);
          });
        };
        collectIds(rawDataJson);

        forms.forEach((fw) => {
          /* form contentKey 레벨 추출 (form1) */
          const section: Record<string, unknown> = fw.contentKey
            ? ((tabSection[fw.contentKey] as Record<string, unknown>) ?? tabSection)
            : tabSection;

          const vals: Record<string, string> = {};
          fw.fields.forEach((f) => {
            if (f.fieldKey && section[f.fieldKey] !== undefined) {
              const raw = section[f.fieldKey];
              if (!Array.isArray(raw)) vals[f.id] = String(raw ?? '');
            }
          });
          setFormValuesMap((prev) => ({ ...prev, [fw.widgetId]: vals }));
        });

        /* 파일 메타 복원 */
        if (allFileIds.length > 0) {
          api.get('/page-files/meta', { params: { ids: allFileIds.join(',') } })
            .then((metaRes) => {
              const metaList = metaRes.data as { id: number; fieldKey: string; origName: string; fileSize: number; mimeType: string }[];
              forms.forEach((fw) => {
                const section: Record<string, unknown> = fw.contentKey
                  ? ((tabSection[fw.contentKey] as Record<string, unknown>) ?? tabSection)
                  : tabSection;
                const metaByFieldId: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                fw.fields.forEach((f) => {
                  if (!f.fieldKey || !FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) return;
                  const ids = section[f.fieldKey];
                  if (!Array.isArray(ids)) return;
                  metaByFieldId[f.id] = (ids as number[]).map((id) => {
                    const m = metaList.find((m) => m.id === id);
                    return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                  });
                  /* 이미지/동영상/미디어 타입: blob URL 생성 → 미리보기·플레이어용 */
                  if (f.type === 'image' || f.type === 'video' || f.type === 'media') {
                    (ids as number[]).forEach((id) => {
                      api.get(`/page-files/${id}`, { responseType: 'blob' })
                        .then((blobRes) => setImgBlobUrls((prev) => ({ ...prev, [id]: URL.createObjectURL(blobRes.data) })))
                        .catch(() => {});
                    });
                  }
                });
                setExistingFileMetaMap((prev) => ({ ...prev, [fw.widgetId]: metaByFieldId }));
              });
            })
            .catch(() => {});
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
      if (!validateSearchDateRange(searchFields, sv)) return;

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
    [widgetItems, sortKeyMap, sortDirMap, fetchTableData]
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
        await api.delete(`/page-files/${fileId}`);
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
        toast.error("파일 삭제 중 오류가 발생했습니다.");
      }
    },
    []
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
          if (!isUpdate) { toast.info("삭제할 데이터가 없습니다."); return; }
          if (!confirm("삭제하시겠습니까?")) return;

          if (storedGroupId) {
            const firstSlug = slugGroupsMap.keys().next().value!;
            await api.delete(`/page-data/${firstSlug}/group/${storedGroupId}`);
          } else {
            const firstSlug = slugGroupsMap.keys().next().value!;
            await api.delete(`/page-data/${firstSlug}/${storedId}`);
          }
          toast.success("삭제되었습니다.");
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
            )
          )
            return;
        }

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

          /* 1. 파일 업로드 */
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
                fd.append("templateSlug", connectedSlug);
                fd.append("fieldKey", field.fieldKey);
                const uploadRes = await api.post("/page-files/upload", fd, {
                  headers: { "Content-Type": "multipart/form-data" },
                });
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

          /* 5. dataJson 구성 */
          const { dataJson, pkKeys } = buildDataJson(
            widgets as Parameters<typeof buildDataJson>[0],
            mapToUse,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap,
            multiSelectExtraFieldValuesMap,
            options?.mainConnectedSlug,
            allFormValues,
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

          let savedDataId: number;
          if (slugStoredId) {
            await api.put(`/page-data/${connectedSlug}/${slugStoredId}`, {
              dataJson: finalDataJson,
              ...(pageSlug && { templateSlug: pageSlug }),
            });
            savedDataId = slugStoredId;
          } else {
            const res = await api.post(`/page-data/${connectedSlug}`, {
              dataJson: finalDataJson,
              ...(pkKeys.length > 0 && { pkKeys }),
              ...(groupId && { groupId }),
              ...(pageSlug && { templateSlug: pageSlug }),
            });
            savedDataId = res.data.id;
            /* group_id가 새로 생성된 경우 상태에 저장 */
            if (groupId && !storedGroupId) setCurrentGroupId(groupId);
            /* 탭 신규 저장 후 생성된 id와 connectedSlug를 TabRenderer로 전달 (sharedDataId 공유) */
            options?.onDataIdCreated?.(connectedSlug, savedDataId);
          }
          /* POST/PUT 모두 성공 시 저장 완료 알림 — savedTabSet 갱신용 */
          options?.onSaved?.();

          /* 7. 업로드 파일 → page_data 레코드 연결 */
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
              const metaRes = await api.get("/page-files/meta", {
                params: { ids: fileIds.join(",") },
              });
              const metaList = metaRes.data as {
                id: number;
                fieldKey: string;
                origName: string;
                fileSize: number;
                mimeType: string;
              }[];

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
                      api
                        .get(`/page-files/${id}`, { responseType: "blob" })
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

        toast.success(isUpdate ? "수정되었습니다." : "저장되었습니다.");
        markClean();
        if (goBackAfterAction) options?.onGoBack?.();
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (action === "save" && status === 409) {
          toast.error("이미 동일한 키 값의 데이터가 존재합니다.");
        } else {
          toast.error(
            action === "save" ? "저장 중 오류가 발생했습니다." : "삭제 중 오류가 발생했습니다."
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

      if (targetWidgets.length === 0) { toast.warning("연결된 컨텐츠 위젯이 없습니다."); return; }

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

          const res = await api.post(`/page-data/${dataSaveSlug}`, {
            dataJson,
            ...(pkKeys.length > 0 && { pkKeys }),
            ...(pageSlug && { templateSlug: pageSlug }),
          });

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

          if (rowsToSave.length === 0) { toast.warning('저장할 데이터가 없습니다.'); return; }

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
          });
          if (saved > 0) anySaved = true;
        }

        if (anySaved) {
          toast.success("저장되었습니다.");
          markClean();
          if (goBackAfterAction) options?.onGoBack?.();
        }
      } catch {
        toast.error("저장 중 오류가 발생했습니다.");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [widgetItems, formValuesMap, fileValuesMap, subListRowsMap, subListFileMap, existingFileMetaMap, multiSelectValuesMap, tableSelectedRowsMap, urlParamSaveExtras, pageSlug, options, markClean]
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
  };

  return { gridProps, setSubListRowsMap, confirmLeave };
}
