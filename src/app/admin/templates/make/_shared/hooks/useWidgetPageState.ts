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

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { buildDataJson, validateFormFields } from "../utils";
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
  /** 신규 저장(POST) 후 생성된 id를 상위(TabRenderer)로 전달 */
  onDataIdCreated?: (id: number) => void;
}

export function useWidgetPageState(
  widgetItems: PageWidgetItem[],
  pageSlug?: string,
  options?: UseWidgetPageStateOptions,
) {
  /* URL 파라미터 — 폼 필드 초기값 세팅용 */
  const searchParams = useSearchParams();

  /* 검색 */
  const [searchValues, setSearchValues] = useState<Record<string, string>>({});
  const searchValuesRef = useRef<Record<string, string>>({});

  /* 테이블 */
  const [tableDataMap, setTableDataMap] = useState<Record<string, PageTableData>>({});
  const tableDataMapRef = useRef<Record<string, PageTableData>>({});
  const [sortKeyMap, setSortKeyMap] = useState<Record<string, string | null>>({});
  const [sortDirMap, setSortDirMap] = useState<Record<string, "asc" | "desc">>({});

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

  /* 수정 모드 group_id (신규 저장 후 다음 저장 시 수정 모드로 처리) */
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);

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
        searchFields.forEach((f) => {
          const paramKey = f.fieldKey || f.label;
          const val = sv[f.id];
          if (paramKey && val && val.trim()) params[paramKey] = val;
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
        ).map((item) => {
          const flat: Record<string, unknown> = { _id: item.id, _groupId: item.groupId ?? null };
          Object.entries(item.dataJson ?? {}).forEach(([k, v]) => {
            if (k === "id") return;
            if (v && typeof v === "object" && !Array.isArray(v)) {
              Object.assign(flat, v);
            } else {
              flat[k] = v;
            }
          });
          flat["createdAt"] = item.createdAt ?? null;
          flat["createdBy"] = item.createdBy ?? null;
          flat["updatedAt"] = item.updatedAt ?? null;
          flat["updatedBy"] = item.updatedBy ?? null;
          return flat;
        });

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

  /* widgetItems 로드 후 URL 파라미터 → 폼 필드 초기값 세팅
   * URL ?fieldKey=값 이 폼 필드의 fieldKey와 일치하면 formValuesMap에 주입.
   * hidden 필드는 URL 파라미터 없을 때 defaultValue로 초기화.
   * 우선순위: URL 파라미터 > defaultValue > ''
   */
  useEffect(() => {
    if (!widgetItems.length) return;
    const patch: Record<string, Record<string, string>> = {};

    flatWidgets(widgetItems).forEach((w) => {
      if (w.type !== 'form') return;
      const fw = w as FormWidget;

      (fw.fields ?? []).forEach((f) => {
        const fieldKey = f.fieldKey || f.label;
        if (!fieldKey) return;

        const urlVal = searchParams.get(fieldKey);
        if (urlVal !== null) {
          /* URL 파라미터가 있으면 필드 타입 무관하게 set */
          if (!patch[fw.widgetId]) patch[fw.widgetId] = {};
          patch[fw.widgetId][f.id] = urlVal;
        } else if (f.type === 'hidden' && f.defaultValue !== undefined) {
          /* URL 파라미터 없는 hidden 필드는 defaultValue로 초기화 */
          if (!patch[fw.widgetId]) patch[fw.widgetId] = {};
          patch[fw.widgetId][f.id] = f.defaultValue;
        }
      });
    });

    if (Object.keys(patch).length === 0) return;

    setFormValuesMap((prev) => {
      const next = { ...prev };
      for (const [wid, vals] of Object.entries(patch)) {
        next[wid] = { ...(next[wid] ?? {}), ...vals };
      }
      return next;
    });
  }, [widgetItems, searchParams]);

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

        /* 탭 contentKey 레벨 추출 (tab1) */
        const tabSection: Record<string, unknown> = options?.contentKey
          ? ((rawDataJson[options.contentKey] as Record<string, unknown>) ?? rawDataJson)
          : rawDataJson;

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
                  if (!f.fieldKey || (f.type !== 'file' && f.type !== 'image' && f.type !== 'media')) return;
                  const ids = section[f.fieldKey];
                  if (!Array.isArray(ids)) return;
                  metaByFieldId[f.id] = (ids as number[]).map((id) => {
                    const m = metaList.find((m) => m.id === id);
                    return m ? { id: m.id, origName: m.origName, fileSize: m.fileSize } : { id, origName: '', fileSize: 0 };
                  });
                  /* 이미지/미디어 타입 blob URL 생성 */
                  if (f.type === 'image' || f.type === 'media') {
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
    (tableWidgetId: string, accessor: string, dir: "asc" | "desc") => {
      setSortKeyMap((prev) => ({ ...prev, [tableWidgetId]: accessor }));
      setSortDirMap((prev) => ({ ...prev, [tableWidgetId]: dir }));
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
        page: 0,
        sk: accessor,
        sd: dir,
      });
    },
    [widgetItems, fetchTableData]
  );

  /* 폼 값 업데이트 */
  const updateFormValue = useCallback((widgetId: string, fieldId: string, value: string) => {
    setFormValuesMap((prev) => ({ ...prev, [widgetId]: { ...(prev[widgetId] ?? {}), [fieldId]: value } }));
  }, []);

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
    },
    []
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
    ) => {
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
          if (goBackAfterAction) options?.onGoBack?.();
          return;
        }

        /* ── SAVE ── */

        /* 유효성 검사 */
        for (const w of targetWidgets) {
          if (w.type !== "form") continue;
          const fw = w as FormWidget;
          if (
            !validateFormFields(
              fw.fields,
              formValuesMap[fw.widgetId] ?? {},
              fileValuesMap[fw.widgetId] ?? {},
              existingFileMetaMap[fw.widgetId] ?? {}
            )
          )
            return;
        }

        /* 다중 slug 저장 시 confirm */
        const slugGroups = Array.from(slugGroupsMap.entries());
        if (slugGroups.length > 1 && !isUpdate) {
          const slugNames = slugGroups.map(([s]) => s).join(", ");
          if (!confirm(`다음 ${slugGroups.length}개 항목에 저장됩니다:\n${slugNames}\n\n계속하시겠습니까?`)) return;
        }

        /* group_id 결정 */
        const groupId =
          slugGroups.length > 1 ? (storedGroupId ?? crypto.randomUUID()) : undefined;

        /* slug 그룹별 반복 저장 */
        for (const [connectedSlug, widgets] of slugGroups) {
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
              if (f.type !== "file" && f.type !== "image" && f.type !== "media") continue;
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
            formValuesMap,
            formFileIdsMap,
            processedSubListRowsMap,
            multiSelectMap
          );

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
            /* 현재 탭 섹션만 교체, 나머지 탭 섹션 보존 */
            finalDataJson = { ...baseDataJson, [options.contentKey]: dataJson };
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
            /* 탭 신규 저장 후 생성된 id를 TabRenderer로 전달 (sharedDataId 공유) */
            options?.onDataIdCreated?.(savedDataId);
          }

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
                  if (!f.fieldKey || (f.type !== "file" && f.type !== "image" && f.type !== "media"))
                    return;
                  const ids = section[f.fieldKey];
                  if (!Array.isArray(ids)) return;
                  metaByFieldId[f.id] = (ids as number[]).map((id) => {
                    const m = metaList.find((m) => m.id === id);
                    return m
                      ? { id: m.id, origName: m.origName, fileSize: m.fileSize }
                      : { id, origName: "", fileSize: 0 };
                  });
                  /* 이미지/미디어 타입은 blob URL 생성 */
                  if (imageFieldIds.has(f.id) || f.type === "media") {
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

  /* PageGridRenderer에 바로 spread할 수 있도록 묶어서 반환 */
  const gridProps = {
    searchValues,
    onSearchChange: updateSearchValue,
    onSearch: handleSearch,
    onReset: handleReset,
    formValuesMap,
    onFormValuesChange: updateFormValue,
    onContentAction: handleContentAction,
    subListRowsMap,
    onSubListRowsChange: (wId: string, rows: SubListRow[]) =>
      setSubListRowsMap((prev) => ({ ...prev, [wId]: rows })),
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort: handleSortChange,
    onPageChange: handlePageChange,
    onLoadMore: handleLoadMore,
    categorySelections,
    onCategorySelect: handleCategorySelect,
    onRefresh: handleRefresh,
    pageSlug,
    /* 파일 업로드 */
    fileValuesMap,
    existingFileMetaMap,
    imgBlobUrls,
    onFileChange: handleFileChange,
    onRemoveExisting: handleRemoveExisting,
    /* 멀티셀렉트 */
    multiSelectValuesMap,
    onMultiSelectChange: (wId: string, ids: number[]) =>
      setMultiSelectValuesMap((prev) => ({ ...prev, [wId]: ids })),
  };

  return { gridProps, setSubListRowsMap };
}
