"use client";

/**
 * useWidgetPageState — 위젯 페이지 공통 상태 관리 훅
 *
 * /admin/widget/[slug]/page.tsx 와 TabRenderer 양쪽에서 공통으로 사용.
 * widgetItems를 받아 검색·테이블·폼·서브리스트·카테고리 상태를 관리하고
 * PageGridRenderer에 필요한 모든 핸들러를 반환한다.
 *
 * 사용법:
 *   const state = useWidgetPageState(widgetItems);
 *   <PageGridRenderer mode="live" widgetItems={widgetItems} {...state.gridProps} />
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import api from "@/lib/api";
import { buildDataJson } from "../utils";
import type { PageWidgetItem, PageTableData } from "../components/renderer/PageGridRenderer";
import type { AnyWidget } from "../components/renderer/types";
import type { TableWidget } from "../components/builder/TableBuilder";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { SubListWidget } from "../components/renderer/types";
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

export function useWidgetPageState(widgetItems: PageWidgetItem[], pageSlug?: string) {
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

  /* 컨텐츠 저장/삭제 */
  const handleContentAction = useCallback(
    async (connectedContentWidgetIds: string[], action: "save" | "delete") => {
      for (const widgetId of connectedContentWidgetIds) {
        const widget = flatWidgets(widgetItems).find(
          (w) => (w.type === "form" || w.type === "sublist") && (w as FormWidget | SubListWidget).widgetId === widgetId
        );
        if (!widget) continue;

        if (widget.type === "form") {
          const fw = widget as FormWidget;
          if (!fw.connectedSlug) continue;
          const { dataJson, pkKeys } = buildDataJson([fw], formValuesMap, {}, {}, {});
          try {
            if (action === "save") {
              await api.post(`/page-data/${fw.connectedSlug}`, { dataJson, ...(pkKeys.length > 0 && { pkKeys }), ...(pageSlug && { templateSlug: pageSlug }) });
              toast.success("저장되었습니다.");
            } else {
              await api.delete(`/page-data/${fw.connectedSlug}`, {
                data: { dataJson, ...(pkKeys.length > 0 && { pkKeys }) },
              });
              toast.success("삭제되었습니다.");
            }
          } catch (err: unknown) {
            const status = (err as { response?: { status?: number } })?.response?.status;
            if (action === "save" && status === 409) {
              toast.error("이미 동일한 키 값의 데이터가 존재합니다.");
            } else {
              toast.error(action === "save" ? "저장 중 오류가 발생했습니다." : "삭제 중 오류가 발생했습니다.");
            }
          }
        } else if (widget.type === "sublist") {
          const sw = widget as SubListWidget;
          if (!sw.connectedSlug) continue;
          const storageKey = `sublistId_${widgetId}`;
          const storedId = Number(sessionStorage.getItem(storageKey)) || null;
          const rows = subListRowsMap[widgetId] ?? [];
          try {
            if (action === "save") {
              const cleanRows = rows.map(({ _rowId, ...rest }) => rest);
              if (storedId) {
                await api.put(`/page-data/${sw.connectedSlug}/${storedId}`, { dataJson: { rows: cleanRows }, ...(pageSlug && { templateSlug: pageSlug }) });
                toast.success("수정되었습니다.");
              } else {
                const res = await api.post(`/page-data/${sw.connectedSlug}`, { dataJson: { rows: cleanRows }, ...(pageSlug && { templateSlug: pageSlug }) });
                sessionStorage.setItem(storageKey, String(res.data.id));
                toast.success("저장되었습니다.");
              }
            } else {
              if (!storedId) {
                toast.info("삭제할 데이터가 없습니다.");
                continue;
              }
              if (!confirm("삭제하시겠습니까?")) return;
              await api.delete(`/page-data/${sw.connectedSlug}/${storedId}`);
              sessionStorage.removeItem(storageKey);
              toast.success("삭제되었습니다.");
            }
          } catch {
            toast.error(action === "save" ? "저장 중 오류가 발생했습니다." : "삭제 중 오류가 발생했습니다.");
          }
        }
      }
    },
    [widgetItems, formValuesMap, subListRowsMap]
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
    onSubListRowsChange: (wId: string, rows: SubListRow[]) => setSubListRowsMap((prev) => ({ ...prev, [wId]: rows })),
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
  };

  return { gridProps, setSubListRowsMap };
}
