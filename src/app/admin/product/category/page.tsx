"use client";

import React, { useState, useEffect, useRef } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import PageLayout from "@/components/layout/page-layout";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import api, { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  RotateCcw,
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import {
  flattenPageDataItem,
  parseActionParams,
  buildRowActionQuery,
  buildSearchQueryParams,
  buildKeyToId,
  buildSearchFieldDefaultValues,
  buildDateRangeGenerationPatch,
  nextSortDir,
  pageGroupRange,
  resolveFetchSortKey,
  mergeTableSelectedRowCache,
  validateDataSaveWidgets,
  saveTableRows,
  extractTableSelectedRows,
  buildParamSaveExtras,
} from "@/app/admin/templates/make/_shared/utils";
import { useRouter } from "next/navigation";
import { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { isEnterSearchTrigger } from "@/components/search";
import { useLeaveCheckStore } from "@/store/use-leave-check-store";
import CenterPopupLayout from "@/components/layout/popup/center-popup-layout";

interface CategoryItem {
  id: number;
  name: string;
  depth: number;
  parentId: number | null;
  sortOrder?: number;
  code?: string;
  description?: string;
  _dataJson?: Record<string, unknown>;
  _flatJson?: Record<string, unknown>;
}
const CATEGORY_FETCH_SIZE = "9999";
const CATEGORY_LEVEL1_PAGE_PATH = "/admin/product/category/level1";
const CATEGORY_FIELD_KEYS_Category1 = {
  id: "category.id",
  code: "category.code",
  title: "category.title",
  desc: "category.sub_title",
};
function sortCategoryItems(rows: CategoryItem[]): CategoryItem[] {
  return [...rows].sort((a, b) => {
    if (a.sortOrder == null && b.sortOrder == null) return 0;
    if (a.sortOrder == null) return 1;
    if (b.sortOrder == null) return -1;
    return a.sortOrder - b.sortOrder;
  });
}
const CATEGORY_LEVEL2_PAGE_PATH = "/admin/product/category/level2";
const CATEGORY_FIELD_KEYS_Category2 = {
  id: "category.id",
  code: "category.code",
  title: "category.title",
  desc: "category.sub_title",
};
const PRODUCT_DETAIL_PAGE_PATH = "/admin/product/product-detail";
const CATEGORY_FIELD_KEYS_Category3 = {
  id: "id",
  code: "_fetchedRel18.product.product_code",
  title: "_fetchedRel18.product.product_name",
  desc: "_fetchedRel18.product.product_description",
};
function LayerPopup_Category3_create(props: {
  onClose: () => void;
  onSaved: () => void;
  extras: Record<string, Record<string, string>>;
}) {
  const { onClose, onSaved, extras } = props;
  const SEARCH_FIELDS_Search1: SearchFieldConfig[] = [
    {
      colSpan: 5,
      id: "product_name",
      type: "input",
      fieldKey: "product_name",
      label: "",
    },
  ];
  const searchKeyToIdSearch1 = buildKeyToId(SEARCH_FIELDS_Search1);

  const { t } = useI18n();
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const initialParamsSearch1Ref = useRef<Record<string, string>>({ product_name: "" });
  const [paramsSearch1, setParamsSearch1] = useState<Record<string, string>>(initialParamsSearch1Ref.current);
  const [searchDefaultsReadySearch1, setSearchDefaultsReadySearch1] = useState(false);
  const [rowsTable1, setRowsTable1] = useState<Record<string, unknown>[]>([]);
  const [totalTable1, setTotalTable1] = useState(0);
  const [pageTable1, setPageTable1] = useState(0);
  const [loadingTable1, setLoadingTable1] = useState(false);
  const [totalPagesTable1, setTotalPagesTable1] = useState(0);
  const [sortKeyTable1, setSortKeyTable1] = useState<string | null>(null);
  const [sortDirTable1, setSortDirTable1] = useState<"asc" | "desc">("asc");
  const [selectedRowIdsTable1, setSelectedRowIdsTable1] = useState<number[]>([]);
  const [selectedRowDataTable1, setSelectedRowDataTable1] = useState<
    Record<string, Record<number, Record<string, unknown>>>
  >({});
  const dataSlugTable1 = "product-data";
  const confirmLeaveStoreSpace1 = useLeaveCheckStore((s) => s.confirmLeave);
  const router = useRouter();

  useEffect(() => {
    if (!sitesLoaded || !clockReady) return;
    const baseSnapshot = { ...initialParamsSearch1Ref.current };
    const computed: Record<string, string> = {};
    SEARCH_FIELDS_Search1.forEach((f) => {
      Object.assign(computed, buildSearchFieldDefaultValues(f));
    });
    const snapshot = { ...computed };
    SEARCH_FIELDS_Search1.forEach((f) => {
      if (f.type !== "dateRange" && f.type !== "yearMonthRange") return;
      (["from", "to"] as const).forEach((part) => {
        const sourceValue = snapshot[`${f.id}_${part}`];
        if (!sourceValue) return;
        Object.assign(computed, buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, f.id, part, sourceValue));
      });
    });
    initialParamsSearch1Ref.current = { ...initialParamsSearch1Ref.current, ...computed };
    setParamsSearch1((prev) => {
      const merged = { ...prev };
      Object.keys(computed).forEach((k) => {
        if (prev[k] === baseSnapshot[k]) merged[k] = computed[k];
      });
      return merged;
    });
    setSearchDefaultsReadySearch1(true);
  }, [sitesLoaded, clockReady]);

  const getSearchParamsSearch1 = (sv: Record<string, string> = paramsSearch1): Record<string, string> =>
    buildSearchQueryParams(SEARCH_FIELDS_Search1, sv);

  const handleResetSearch1 = () => {
    setParamsSearch1(initialParamsSearch1Ref.current);
    fetchDataTable1(0, true, { Search1: initialParamsSearch1Ref.current }, { sk: null, sd: "asc" });
  };

  const handleSearchSearch1 = () => {
    fetchDataTable1(0, true);
  };

  const handleRowsSelectTable1 = (ids: number[]) => {
    setSelectedRowIdsTable1(ids);
    setSelectedRowDataTable1((prev) =>
      mergeTableSelectedRowCache(prev, "w_4wwj7ykuz_popup_create_w_q8eohvr60", ids, rowsTable1)
    );
  };

  const fetchDataTable1 = async (
    page: number,
    notify = false,
    searchOverrides?: Record<string, Record<string, string>>,
    sortOverride?: { sk: string | null; sd: "asc" | "desc" }
  ) => {
    if (!dataSlugTable1) {
      if (notify) toast.error(t("common.error.load_data"));
      return;
    }
    setLoadingTable1(true);
    try {
      const sk = sortOverride ? sortOverride.sk : sortKeyTable1;
      const sd = sortOverride ? sortOverride.sd : sortDirTable1;
      let resolvedSortKeyTable1: string | null = sk;
      if (sk) {
        for (const r of rowsTable1) {
          const pathMap = r._pathMap as Record<string, string> | undefined;
          if (pathMap?.[sk]) {
            resolvedSortKeyTable1 = pathMap[sk];
            break;
          }
        }
      }
      const res = await api.get("/page-data/" + dataSlugTable1, {
        params: {
          page,
          size: 5,
          ...(resolvedSortKeyTable1
            ? {
                sort:
                  resolveFetchSortKey(
                    [{ accessor: "product.product_code" }, { accessor: "product.product_name" }],
                    resolvedSortKeyTable1
                  ) +
                  "," +
                  sd,
              }
            : {}),
          ...getSearchParamsSearch1(searchOverrides?.["Search1"]),
        },
      });
      const items = (
        res.data.content as {
          id: number;
          groupId?: string | null;
          dataJson: Record<string, unknown>;
          createdAt?: string | null;
          createdBy?: string | null;
          updatedAt?: string | null;
          updatedBy?: string | null;
        }[]
      ).map(flattenPageDataItem);
      setRowsTable1(items);
      setTotalTable1(res.data.totalElements ?? items.length);
      setTotalPagesTable1(res.data.totalPages ?? 1);
      setPageTable1(page);
      if (sortOverride) {
        setSortKeyTable1(sortOverride.sk);
        if (sortOverride.sk !== null) setSortDirTable1(sortOverride.sd);
      }
    } catch (err) {
      console.error("데이터 조회 오류:", err);
      toast.error(t("common.error.load_data"));
    } finally {
      setLoadingTable1(false);
    }
  };

  useEffect(() => {
    if (!searchDefaultsReadySearch1) return;
    fetchDataTable1(0);
  }, [searchDefaultsReadySearch1]);

  const handleSortTable1 = (accessor: string) => {
    const isCurrentCol = sortKeyTable1 === accessor;
    const dir = nextSortDir(isCurrentCol, isCurrentCol ? sortDirTable1 : null);
    fetchDataTable1(0, false, undefined, { sk: dir === null ? null : accessor, sd: dir ?? "asc" });
  };

  const handleDataSaveSpace1_1 = async () => {
    const dataSaveTargets: Parameters<typeof validateDataSaveWidgets>[0]["targetWidgets"] = [
      {
        type: "table",
        widgetId: "w_4wwj7ykuz_popup_create_w_q8eohvr60",
        contentKey: "product",
        enableRowSelection: true,
      },
    ];
    if (
      !validateDataSaveWidgets({
        targetWidgets: dataSaveTargets,
        formValuesMap: {},
        fileValuesMap: {},
        existingFileMetaMap: {},
        subListRowsMap: {},
        subListFileMap: {},
        multiSelectValuesMap: {},
        tableSelectedRowsMap: { w_4wwj7ykuz_popup_create_w_q8eohvr60: selectedRowIdsTable1 },
        t,
      })
    )
      return;
    try {
      let anySaved = false;
      const rowsToSaveTable1 = extractTableSelectedRows(
        selectedRowDataTable1,
        "w_4wwj7ykuz_popup_create_w_q8eohvr60",
        selectedRowIdsTable1,
        rowsTable1
      );
      if (rowsToSaveTable1.length === 0) {
        toast.warning(t("common.table.no_save_data"));
        return;
      }
      const savedTable1 = await saveTableRows({
        contentKey: "product",
        rows: rowsToSaveTable1,
        extras: extras["product"] ?? {},
        dataSaveSlug: "category-data",
        templateSlug: "category-all-list",
        paramSave: "product.id,product.product_name,product.product_code,product.product_type,product.order_method",
        validationRuleIds: [6],
      });
      if (savedTable1 > 0) anySaved = true;
      if (anySaved) {
        toast.success(t("common.saved"));
        onSaved();
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error.save")));
    }
  };

  return (
    <div className="px-4 pb-4">
      <PageGridContainer>
        <GridCell colSpan={12} rowSpan={7} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto`,
              gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
              gridAutoFlow: "row dense",
              rowGap: `${GAP_SIZE}px`,
              columnGap: 0,
            }}
          >
            <div style={{ gridColumn: "span 12", gridRow: "span 1", height: `${1 * ROW_HEIGHT - GAP_SIZE}px` }}>
              <div
                className="h-full w-full rounded border border-slate-200 flex items-center gap-3 bg-white px-4"
                style={{ overflow: "clip" }}
              >
                <div
                  className="flex-1 grid grid-cols-5 gap-4"
                  onKeyDown={(e) => {
                    if (isEnterSearchTrigger(e)) handleSearchSearch1();
                  }}
                >
                  <div className="col-span-5">
                    <input
                      type="text"
                      value={String(paramsSearch1["product_name"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["product_name"]: e.target.value }))}
                      placeholder={t("common.placeholder.productName")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    />
                  </div>
                </div>
                <button
                  onClick={handleResetSearch1}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all"
                >
                  <RotateCcw className="w-3 h-3" /> {t("common.btn.reset")}
                </button>
                <button
                  onClick={handleSearchSearch1}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all"
                >
                  <Search className="w-3 h-3" /> {t("common.btn.search")}
                </button>
              </div>
            </div>
            <div style={{ gridColumn: "span 12", gridRow: "span 5" }}>
              <div className="h-full w-full rounded border border-slate-200 bg-white" style={{ overflow: "clip" }}>
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                  <p className="text-xs text-slate-500">
                    {t("common.pagination.total", { count: totalTable1.toLocaleString() })}
                  </p>
                  <p className="text-xs text-slate-400">
                    {totalTable1 > 0
                      ? t("common.pagination.showing", {
                          start: String(pageTable1 * 5 + 1),
                          end: String(Math.min((pageTable1 + 1) * 5, totalTable1)),
                        })
                      : ""}
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50/80">
                        <th className="w-10 px-2 py-3 text-center flex-shrink-0 sticky left-0 z-20 bg-slate-50/80">
                          <input
                            type="checkbox"
                            checked={
                              rowsTable1.length > 0 &&
                              rowsTable1.every((row) => selectedRowIdsTable1.includes(row._id as number))
                            }
                            onChange={(e) =>
                              handleRowsSelectTable1(
                                e.target.checked ? rowsTable1.map((row) => row._id as number).filter(Boolean) : []
                              )
                            }
                            className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer disabled:cursor-default"
                          />
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "30%" }}
                        >
                          <button
                            onClick={() => handleSortTable1("product.product_code")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("product.label.productCode")}
                            {(sortKeyTable1 === "product.product_code" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "product.product_code" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "60%" }}
                        >
                          <button
                            onClick={() => handleSortTable1("product.product_name")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.productName")}
                            {(sortKeyTable1 === "product.product_name" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "product.product_name" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTable1 ? (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-sm text-slate-400">
                            {t("common.table.loading")}
                          </td>
                        </tr>
                      ) : rowsTable1.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-sm text-slate-400">
                            {t("common.table.no_data")}
                          </td>
                        </tr>
                      ) : (
                        rowsTable1.map((row, idx) => (
                          <tr
                            key={idx}
                            className={
                              selectedRowIdsTable1.includes(row._id as number)
                                ? "border-b border-slate-100 last:border-0 transition-all bg-slate-50"
                                : "border-b border-slate-100 last:border-0 transition-all hover:bg-slate-50/50"
                            }
                          >
                            <td className="w-10 px-2 py-3 text-center sticky left-0 bg-inherit">
                              <input
                                type="checkbox"
                                checked={selectedRowIdsTable1.includes(row._id as number)}
                                onChange={(e) =>
                                  handleRowsSelectTable1(
                                    e.target.checked
                                      ? [...selectedRowIdsTable1, row._id as number]
                                      : selectedRowIdsTable1.filter((id) => id !== (row._id as number))
                                  )
                                }
                                className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
                              />
                            </td>
                            <td
                              className="px-4 py-3 max-w-[200px] overflow-hidden"
                              style={{ textAlign: "center", width: "30%" }}
                            >
                              {(() => {
                                const value = row["product.product_code"];
                                const strVal = value == null || typeof value === "object" ? "" : String(value);
                                const displayVal = strVal;
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={displayVal}>
                                    {displayVal}
                                  </span>
                                );
                              })()}
                            </td>
                            <td
                              className="px-4 py-3 max-w-[200px] overflow-hidden"
                              style={{ textAlign: "left", width: "60%" }}
                            >
                              {(() => {
                                const value = row["product.product_name"];
                                const strVal = value == null || typeof value === "object" ? "" : String(value);
                                const displayVal = strVal;
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={displayVal}>
                                    {displayVal}
                                  </span>
                                );
                              })()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPagesTable1 >= 1 && (
                  <div className="flex-shrink-0 flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">
                    <button
                      disabled={pageTable1 === 0}
                      onClick={() => fetchDataTable1(pageTable1 - 1)}
                      className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {t("common.btn.prev")}
                    </button>
                    {pageGroupRange(pageTable1, totalPagesTable1).map((p) => (
                      <button
                        key={p}
                        onClick={() => fetchDataTable1(p)}
                        className={
                          pageTable1 === p
                            ? "px-2.5 py-1.5 text-xs rounded border transition-all bg-slate-900 text-white border-slate-900"
                            : "px-2.5 py-1.5 text-xs rounded border transition-all border-slate-200 text-slate-600 hover:bg-slate-50"
                        }
                      >
                        {p + 1}
                      </button>
                    ))}
                    <button
                      disabled={pageTable1 >= totalPagesTable1 - 1}
                      onClick={() => fetchDataTable1(pageTable1 + 1)}
                      className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {t("common.btn.next")}
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ gridColumn: "5 / span 4", gridRow: "span 1" }}>
              <div
                className="w-full rounded"
                style={{
                  overflow: "visible",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                  gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                  rowGap: `${GAP_SIZE}px`,
                  columnGap: `${GAP_SIZE}px`,
                }}
              >
                <div
                  className="flex items-center-safe gap-2 px-3 min-w-0 justify-center"
                  style={{ gridColumn: "span 4", gridRow: "span 1" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmLeaveStoreSpace1 && !confirmLeaveStoreSpace1()) return;
                      onClose();
                    }}
                    className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-400 text-white"
                  >
                    {t("common.btn.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleDataSaveSpace1_1();
                    }}
                    className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-900 text-white"
                  >
                    {t("common.btn.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GridCell>
      </PageGridContainer>
    </div>
  );
}

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("menu.catelv1.label"));
  }, [setPageTitle, t]);
  const categoryDbSlugCategory1 = "category-data";
  const router = useRouter();
  const [categoryItemsCategory1, setCategoryItemsCategory1] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory1, setCategoryLoadingCategory1] = useState(false);
  const [selectedIdCategory1, setSelectedIdCategory1] = useState<number | null>(null);
  const categoryDragIndexRefCategory1 = useRef<number | null>(null);
  const [categoryDropIndexCategory1, setCategoryDropIndexCategory1] = useState<number | null>(null);
  const categoryDbSlugCategory2 = "category-data";
  const [categoryItemsCategory2, setCategoryItemsCategory2] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory2, setCategoryLoadingCategory2] = useState(false);
  const [selectedIdCategory2, setSelectedIdCategory2] = useState<number | null>(null);
  const categoryDragIndexRefCategory2 = useRef<number | null>(null);
  const [categoryDropIndexCategory2, setCategoryDropIndexCategory2] = useState<number | null>(null);
  const categoryDbSlugCategory3 = "category-data";
  const [categoryItemsCategory3, setCategoryItemsCategory3] = useState<CategoryItem[]>([]);
  const [categoryLoadingCategory3, setCategoryLoadingCategory3] = useState(false);
  const [selectedIdCategory3, setSelectedIdCategory3] = useState<number | null>(null);
  const [popupOpenCreateCategory3, setPopupOpenCreateCategory3] = useState(false);
  const [popupExtrasCreateCategory3, setPopupExtrasCreateCategory3] = useState<Record<string, Record<string, string>>>(
    {}
  );
  const categoryDragIndexRefCategory3 = useRef<number | null>(null);
  const [categoryDropIndexCategory3, setCategoryDropIndexCategory3] = useState<number | null>(null);

  const fetchCategoryCategory1 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory1) return;
    setCategoryLoadingCategory1(true);
    try {
      const params: Record<string, string> = { eq_depth: "1", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory1}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category1.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category1.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category1.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 1),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category1.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category1.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category1.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category1.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory1(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory1(false);
    }
  };

  useEffect(() => {
    fetchCategoryCategory1(null);
  }, []);

  const handleCategorySelectCategory1 = (item: CategoryItem) => {
    setSelectedIdCategory1(selectedIdCategory1 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory1 = () => {
    const rowForParams = {};
    const parsed = parseActionParams("depth=1", rowForParams);
    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
    router.push(`${CATEGORY_LEVEL1_PAGE_PATH}${qs}`);
  };

  const handleCategoryEditCategory1 = (item: CategoryItem) => {
    router.push(`${CATEGORY_LEVEL1_PAGE_PATH}${buildRowActionQuery(item.id, "depth=1", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory1 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory1}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory1 === id) setSelectedIdCategory1(null);
      fetchCategoryCategory1(null);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory1 = (index: number) => {
    categoryDragIndexRefCategory1.current = index;
  };

  const handleCategoryDragOverCategory1 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory1 === index) return;
    setCategoryDropIndexCategory1(index);
  };

  const handleCategoryDragLeaveCategory1 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory1(null);
  };

  const handleCategoryDropCategory1 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory1(null);
    const fromIndex = categoryDragIndexRefCategory1.current;
    categoryDragIndexRefCategory1.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory1];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory1(updated);
    const originalSortMap = new Map(categoryItemsCategory1.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory1}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory1(null);
    }
  };

  const fetchCategoryCategory2 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory2) return;
    if (parentId == null) {
      setCategoryItemsCategory2([]);
      return;
    }
    setCategoryLoadingCategory2(true);
    try {
      const params: Record<string, string> = { eq_depth: "2", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory2}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category2.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category2.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category2.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 2),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category2.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category2.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category2.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category2.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory2(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory2(false);
    }
  };

  useEffect(() => {
    setSelectedIdCategory2(null);
    fetchCategoryCategory2(selectedIdCategory1);
  }, [selectedIdCategory1]);

  const handleCategorySelectCategory2 = (item: CategoryItem) => {
    setSelectedIdCategory2(selectedIdCategory2 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory2 = () => {
    if (selectedIdCategory1 == null) {
      toast.warning(t("common.category.select_parent_warning"));
      return;
    }
    const rowForParams = selectedIdCategory1 != null ? { id: String(selectedIdCategory1) } : {};
    const parsed = parseActionParams("depth=2", rowForParams);
    if (selectedIdCategory1 != null) parsed["parentId"] = String(selectedIdCategory1);
    const qs = Object.keys(parsed).length > 0 ? `?${new URLSearchParams(parsed).toString()}` : "";
    router.push(`${CATEGORY_LEVEL2_PAGE_PATH}${qs}`);
  };

  const handleCategoryEditCategory2 = (item: CategoryItem) => {
    router.push(`${CATEGORY_LEVEL2_PAGE_PATH}${buildRowActionQuery(item.id, "depth=2", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory2 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory2}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory2 === id) setSelectedIdCategory2(null);
      fetchCategoryCategory2(selectedIdCategory1);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory2 = (index: number) => {
    categoryDragIndexRefCategory2.current = index;
  };

  const handleCategoryDragOverCategory2 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory2 === index) return;
    setCategoryDropIndexCategory2(index);
  };

  const handleCategoryDragLeaveCategory2 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory2(null);
  };

  const handleCategoryDropCategory2 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory2(null);
    const fromIndex = categoryDragIndexRefCategory2.current;
    categoryDragIndexRefCategory2.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory2];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory2(updated);
    const originalSortMap = new Map(categoryItemsCategory2.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory2}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory2(selectedIdCategory1);
    }
  };

  const fetchCategoryCategory3 = async (parentId: number | null) => {
    if (!categoryDbSlugCategory3) return;
    if (parentId == null) {
      setCategoryItemsCategory3([]);
      return;
    }
    setCategoryLoadingCategory3(true);
    try {
      const params: Record<string, string> = { eq_depth: "3", size: CATEGORY_FETCH_SIZE };
      if (parentId != null) params.eq_parentId = String(parentId);
      const res = await api.get(`/page-data/${categoryDbSlugCategory3}`, { params });
      const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[]).map((item) => {
        const flat = flattenPageDataItem(item as Parameters<typeof flattenPageDataItem>[0]);
        return {
          id: flat[CATEGORY_FIELD_KEYS_Category3.id] != null ? Number(flat[CATEGORY_FIELD_KEYS_Category3.id]) : item.id,
          name: String(flat[CATEGORY_FIELD_KEYS_Category3.title] ?? ""),
          depth: Number(item.dataJson.depth ?? 3),
          parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
          sortOrder: item.dataJson.sortOrder != null ? Number(item.dataJson.sortOrder) : undefined,
          code:
            flat[CATEGORY_FIELD_KEYS_Category3.code] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category3.code])
              : undefined,
          description:
            flat[CATEGORY_FIELD_KEYS_Category3.desc] != null
              ? String(flat[CATEGORY_FIELD_KEYS_Category3.desc])
              : undefined,
          _dataJson: item.dataJson,
          _flatJson: flat,
        };
      });
      setCategoryItemsCategory3(sortCategoryItems(rows));
    } catch {
      toast.error(t("common.error.load"));
    } finally {
      setCategoryLoadingCategory3(false);
    }
  };

  useEffect(() => {
    setSelectedIdCategory3(null);
    fetchCategoryCategory3(selectedIdCategory2);
  }, [selectedIdCategory2]);

  const handleCategorySelectCategory3 = (item: CategoryItem) => {
    setSelectedIdCategory3(selectedIdCategory3 === item.id ? null : item.id);
  };

  const handleCategoryAddCategory3 = () => {
    if (selectedIdCategory2 == null) {
      toast.warning(t("common.category.select_parent_warning"));
      return;
    }
    const rowForParams = selectedIdCategory2 != null ? { id: String(selectedIdCategory2) } : {};
    const staticParams = parseActionParams(
      "product.depth=3,product.parentId=id,product.is_training_category=true",
      rowForParams
    );
    const dynamicParams: Record<string, string> =
      selectedIdCategory2 != null ? { parentId: String(selectedIdCategory2) } : {};
    const initialValues = { ...staticParams, ...dynamicParams };
    setPopupExtrasCreateCategory3(
      buildParamSaveExtras(initialValues, [], ["product"], []) as Record<string, Record<string, string>>
    );
    setPopupOpenCreateCategory3(true);
  };

  const handleCategoryEditCategory3 = (item: CategoryItem) => {
    router.push(`${PRODUCT_DETAIL_PAGE_PATH}${buildRowActionQuery(item.id, "id=product.id", item._flatJson ?? {})}`);
  };

  const handleCategoryDeleteCategory3 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${categoryDbSlugCategory3}/${id}`);
      toast.success(t("common.deleted"));
      if (selectedIdCategory3 === id) setSelectedIdCategory3(null);
      fetchCategoryCategory3(selectedIdCategory2);
    } catch {
      toast.error(t("common.error.delete"));
    }
  };

  const handleCategoryDragStartCategory3 = (index: number) => {
    categoryDragIndexRefCategory3.current = index;
  };

  const handleCategoryDragOverCategory3 = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (categoryDropIndexCategory3 === index) return;
    setCategoryDropIndexCategory3(index);
  };

  const handleCategoryDragLeaveCategory3 = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setCategoryDropIndexCategory3(null);
  };

  const handleCategoryDropCategory3 = async (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setCategoryDropIndexCategory3(null);
    const fromIndex = categoryDragIndexRefCategory3.current;
    categoryDragIndexRefCategory3.current = null;
    if (fromIndex == null || fromIndex === toIndex) return;
    const reordered = [...categoryItemsCategory3];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    const updated = reordered.map((item, i) => ({ ...item, sortOrder: i + 1 }));
    setCategoryItemsCategory3(updated);
    const originalSortMap = new Map(categoryItemsCategory3.map((item) => [item.id, item.sortOrder]));
    const changed = updated.filter((item) => item.sortOrder !== originalSortMap.get(item.id));
    try {
      await Promise.all(
        changed.map((item) => {
          const dataJson: Record<string, unknown> = { ...(item._dataJson ?? {}), sortOrder: item.sortOrder };
          return api.put(`/page-data/${categoryDbSlugCategory3}/${item.id}`, { dataJson });
        })
      );
    } catch {
      toast.error(t("common.error.sort"));
      fetchCategoryCategory3(selectedIdCategory2);
    }
  };

  const handleLayerPopupSavedCreateCategory3 = () => {
    fetchCategoryCategory3(selectedIdCategory2);
    setPopupOpenCreateCategory3(false);
  };

  return (
    <PageLayout mode="live">
      <GridCell colSpan={10} rowSpan={8}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(10, 1fr)",
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv1")}</span>
                  <button
                    onClick={handleCategoryAddCategory1}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {categoryLoadingCategory1 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!categoryLoadingCategory1 && categoryItemsCategory1.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                    </div>
                  )}
                  {!categoryLoadingCategory1 && categoryItemsCategory1.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory1.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory1 === index && categoryDragIndexRefCategory1.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory1(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory1(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory1(e)}
                            onDrop={(e) => handleCategoryDropCategory1(e, index)}
                            onClick={() => handleCategorySelectCategory1(item)}
                            className={
                              selectedIdCategory1 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory1 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory1 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory1 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory1 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory1(item)}
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory1(item.id)}
                                      className={
                                        selectedIdCategory1 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory1 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory1 === categoryItemsCategory1.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv2")}</span>
                  <button
                    onClick={handleCategoryAddCategory2}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {selectedIdCategory1 == null && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.category.select_parent")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory1 == null) && categoryLoadingCategory2 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory1 == null) &&
                    !categoryLoadingCategory2 &&
                    categoryItemsCategory2.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                      </div>
                    )}
                  {!(selectedIdCategory1 == null) && !categoryLoadingCategory2 && categoryItemsCategory2.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory2.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory2 === index && categoryDragIndexRefCategory2.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory2(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory2(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory2(e)}
                            onDrop={(e) => handleCategoryDropCategory2(e, index)}
                            onClick={() => handleCategorySelectCategory2(item)}
                            className={
                              selectedIdCategory2 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory2 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory2 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory2 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory2 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory2(item)}
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory2(item.id)}
                                      className={
                                        selectedIdCategory2 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory2 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory2 === categoryItemsCategory2.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ gridColumn: "span 3", gridRow: "span 8", height: `${8 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full pr-2">
              <div
                className="h-full w-full rounded border border-slate-200 flex flex-col bg-white"
                style={{ overflow: "clip" }}
              >
                <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                  <span className="text-xs font-semibold text-slate-700">{t("category.label.lv3")}</span>
                  <button
                    onClick={handleCategoryAddCategory3}
                    className="flex items-center gap-1 text-[11px] transition-colors text-slate-500 hover:text-slate-900"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t("common.btn.add")}
                  </button>
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  {selectedIdCategory2 == null && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300 italic">{t("common.category.select_parent")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory2 == null) && categoryLoadingCategory3 && (
                    <div className="h-full flex items-center justify-center">
                      <span className="text-[11px] text-slate-300">{t("common.loading")}</span>
                    </div>
                  )}
                  {!(selectedIdCategory2 == null) &&
                    !categoryLoadingCategory3 &&
                    categoryItemsCategory3.length === 0 && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">{t("common.table.no_data")}</span>
                      </div>
                    )}
                  {!(selectedIdCategory2 == null) && !categoryLoadingCategory3 && categoryItemsCategory3.length > 0 && (
                    <div className="p-2 space-y-1.5">
                      {categoryItemsCategory3.map((item, index) => (
                        <div key={item.id} className="relative">
                          {categoryDropIndexCategory3 === index && categoryDragIndexRefCategory3.current !== index && (
                            <div className="absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none" />
                          )}
                          <div
                            draggable
                            onDragStart={() => handleCategoryDragStartCategory3(index)}
                            onDragOver={(e) => handleCategoryDragOverCategory3(e, index)}
                            onDragLeave={(e) => handleCategoryDragLeaveCategory3(e)}
                            onDrop={(e) => handleCategoryDropCategory3(e, index)}
                            onClick={() => handleCategorySelectCategory3(item)}
                            className={
                              selectedIdCategory3 === item.id
                                ? "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-slate-900 border-slate-700 shadow-md"
                                : "group relative rounded-lg border cursor-pointer transition-all\n                                    bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                            }
                          >
                            {selectedIdCategory3 === item.id && (
                              <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                            )}
                            <div className="flex items-center gap-1 px-2 py-2.5">
                              <div
                                className="flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none "
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical
                                  className={
                                    selectedIdCategory3 === item.id
                                      ? "w-3.5 h-3.5 text-white/40"
                                      : "w-3.5 h-3.5 text-slate-300"
                                  }
                                />
                                <span
                                  className={
                                    selectedIdCategory3 === item.id
                                      ? "text-[10px] font-mono w-4 text-center text-white/50"
                                      : "text-[10px] font-mono w-4 text-center text-slate-300"
                                  }
                                >
                                  {index + 1}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0 pl-1">
                                <div className="flex items-center gap-2 mb-1">
                                  {item.code && (
                                    <span
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/20 text-white/80"
                                          : "flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500"
                                      }
                                    >
                                      {item.code}
                                    </span>
                                  )}
                                  <span
                                    className={
                                      selectedIdCategory3 === item.id
                                        ? "flex-1 text-xs font-semibold truncate text-white"
                                        : "flex-1 text-xs font-semibold truncate text-slate-800"
                                    }
                                  >
                                    {item.name}
                                  </span>
                                  <div
                                    className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <button
                                      onClick={() => handleCategoryEditCategory3(item)}
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-white"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-slate-700"
                                      }
                                      title={t("common.btn.edit")}
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      onClick={() => handleCategoryDeleteCategory3(item.id)}
                                      className={
                                        selectedIdCategory3 === item.id
                                          ? "p-0.5 transition-colors  text-slate-300 hover:text-red-300"
                                          : "p-0.5 transition-colors  text-slate-400 hover:text-red-500"
                                      }
                                      title={t("common.btn.delete")}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                                {item.description && (
                                  <p
                                    className={
                                      selectedIdCategory3 === item.id
                                        ? "text-[10px] line-clamp-1 text-white/60"
                                        : "text-[10px] line-clamp-1 text-slate-400"
                                    }
                                  >
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {categoryDropIndexCategory3 === categoryItemsCategory3.length && (
                        <div className="h-0.5 bg-blue-400 rounded mx-1" />
                      )}
                    </div>
                  )}
                </div>
              </div>
              <CenterPopupLayout
                open={popupOpenCreateCategory3}
                onClose={() => setPopupOpenCreateCategory3(false)}
                title={t("productGrp.label.prd")}
                layerWidth="md"
              >
                <LayerPopup_Category3_create
                  onClose={() => setPopupOpenCreateCategory3(false)}
                  onSaved={handleLayerPopupSavedCreateCategory3}
                  extras={popupExtrasCreateCategory3}
                />
              </CenterPopupLayout>
            </div>
          </div>
        </div>
      </GridCell>
    </PageLayout>
  );
}
