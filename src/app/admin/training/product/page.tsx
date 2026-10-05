"use client";

import React, { useState, useEffect } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import PageLayout from "@/components/layout/page-layout";
import {
  buildSearchQueryParams,
  buildKeyToId,
  evalFieldCondition,
  resolveCategoryDepthLabel,
  flattenPageDataItem,
  nextSortDir,
  pageGroupRange,
  resolveCodeLabel,
  formatFetchedRelValue,
  formatFetchedRelMulti,
} from "@/app/admin/templates/make/_shared/utils";
import { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { SearchForm, SearchRow, SearchField } from "@/components/search";
import { useCodeStore } from "@/store/use-code-store";
import { useI18n } from "@/hooks/use-i18n";
import { useHiddenSearchFieldReset } from "@/app/admin/templates/make/_shared/components/renderer/useHiddenSearchFieldReset";
import { useCategoryCascade } from "@/app/admin/templates/make/_shared/components/renderer/useCategoryCascade";
import api from "@/lib/api";
import { toast } from "sonner";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

const SEARCH_FIELDS_Search1: SearchFieldConfig[] = [
  {
    colSpan: 1,
    id: "product_type",
    type: "select",
    fieldKey: "product_type",
    label: "",
  },
  {
    colSpan: 2,
    id: "category",
    type: "category",
    fieldKey: "category",
    label: "",
    hideCondition: "product_type!=P",
    relationSlugId: 4,
  },
  {
    colSpan: 2,
    id: "category_automation",
    type: "category",
    fieldKey: "category_automation",
    label: "",
    hideCondition: "product_type!=A",
    relationSlugId: 4,
  },
  {
    colSpan: 1,
    id: "eq_has_training",
    type: "select",
    fieldKey: "eq_has_training",
    label: "",
  },
  {
    colSpan: 3,
    id: "product_name",
    type: "input",
    fieldKey: "product_name",
    label: "",
  },
];
const searchKeyToIdSearch1 = buildKeyToId(SEARCH_FIELDS_Search1);
const CATEGORY_FIELDS_Search1: Record<string, SearchFieldConfig> = {
  category: {
    id: "category",
    type: "category",
    label: "",
    dbSlug: "category-data",
    colSpan: 2,
    fieldKey: "category",
    maxDepth: 2,
    labelMsgKey: "",
    placeholder: "",
    relationSlugId: 4,
    depthTextFields: ["category.title", "category.title"],
    depthValueFields: ["id", "id"],
    depthLabelMsgKeys: ["category.label.lv1", "category.label.lv2"],
    hideCondition: "product_type!=P",
    optionFilterDepth: 3,
    optionFilterParentField: "product.parentId",
    optionFilterExpr: "product.product_type=P",
    depthParentFields: ["", "category.parentId"],
  },
  category_automation: {
    id: "category_automation",
    type: "category",
    label: "",
    labelMsgKey: "",
    fieldKey: "category_automation",
    placeholder: "",
    colSpan: 2,
    dbSlug: "category-data",
    relationSlugId: 4,
    maxDepth: 2,
    activeDepths: [1, 2],
    depthLabels: ["", ""],
    depthLabelMsgKeys: ["category.label.lv1", "category.label.lv2"],
    depthValueFields: ["id", "id"],
    depthTextFields: ["category.title", "category.title"],
    depthFilters: ["", ""],
    depthParentFields: ["", "category.parentId"],
    optionFilterDepth: 3,
    optionFilterParentField: "product.parentId",
    optionFilterExpr: "product.product_type=A",
    hideCondition: "product_type!=A",
  },
};

function CategorySearchSelect({
  field,
  value,
  onChange,
}: {
  field: SearchFieldConfig;
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  const activeDepths = field.activeDepths ?? Array.from({ length: field.maxDepth ?? 1 }, (_, i) => i + 1);
  const { depthValues, depthOptions, depthLoading, disabledDepths, configErrorDepths, handleSelect } =
    useCategoryCascade({ mode: "live", field, value, onChange });
  return (
    <div className="flex gap-2 w-full">
      {activeDepths.map((_, i) => {
        const options = depthOptions[i];
        const loading = depthLoading[i];
        const selectedVal = depthValues[i];
        const isFieldDisabled = disabledDepths[i];
        const labelText = resolveCategoryDepthLabel(field, i, t);
        const prevLabelText = resolveCategoryDepthLabel(field, i - 1, t);
        const placeholder = configErrorDepths[i]
          ? "설정 오류 — 상위 부모 ID 경로를 확인하세요"
          : loading
            ? t("common.loading")
            : isFieldDisabled
              ? t("common.category.select_after", { label: prevLabelText })
              : t("common.category.label_select", { label: labelText });
        return (
          <select
            key={i}
            value={selectedVal}
            disabled={isFieldDisabled || loading}
            onChange={(e) => handleSelect(i, e.target.value)}
            className="flex-1 h-8 rounded border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">{placeholder}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.text}
              </option>
            ))}
          </select>
        );
      })}
    </div>
  );
}

export default function GeneratedPage() {
  const { t } = useI18n();
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const initialParamsSearch1: Record<string, string> = {
    product_type: "",
    category: "",
    category_automation: "",
    eq_has_training: "",
    product_name: "",
  };
  const [paramsSearch1, setParamsSearch1] = useState<Record<string, string>>(initialParamsSearch1);
  const hiddenMapSearch1: Record<string, boolean> = {};
  SEARCH_FIELDS_Search1.forEach((f) => {
    hiddenMapSearch1[f.id] =
      !!f.hideCondition && !!f.fieldKey && evalFieldCondition(f.hideCondition, searchKeyToIdSearch1, paramsSearch1);
  });
  useHiddenSearchFieldReset({
    isPreview: false,
    fields: SEARCH_FIELDS_Search1,
    hiddenMap: hiddenMapSearch1,
    values: paramsSearch1,
    onChangeValues: (key, value) => setParamsSearch1((prev) => ({ ...prev, [key]: value })),
  });
  const [rowsTable1, setRowsTable1] = useState<Record<string, unknown>[]>([]);
  const [totalTable1, setTotalTable1] = useState(0);
  const [pageTable1, setPageTable1] = useState(0);
  const [loadingTable1, setLoadingTable1] = useState(false);
  const [totalPagesTable1, setTotalPagesTable1] = useState(0);
  const [sortKeyTable1, setSortKeyTable1] = useState<string | null>(null);
  const [sortDirTable1, setSortDirTable1] = useState<"asc" | "desc">("asc");
  const dataSlugTable1 = "product-data";

  const getSearchParamsSearch1 = (sv: Record<string, string> = paramsSearch1): Record<string, string> =>
    buildSearchQueryParams(SEARCH_FIELDS_Search1, sv);

  const handleResetSearch1 = () => {
    setParamsSearch1(initialParamsSearch1);
    fetchDataTable1(0, true, { Search1: initialParamsSearch1 }, { sk: null, sd: "asc" });
  };

  const handleSearchSearch1 = () => {
    fetchDataTable1(0, true);
  };

  const fetchDataTable1 = async (
    page: number,
    notify = false,
    searchOverrides?: Record<string, Record<string, string>>,
    sortOverride?: { sk: string | null; sd: "asc" | "desc" },
    skipSort = false
  ) => {
    if (!dataSlugTable1) {
      if (notify) toast.error(t("common.error.load_data"));
      return;
    }
    setLoadingTable1(true);
    try {
      const sk = sortOverride ? sortOverride.sk : skipSort ? null : sortKeyTable1;
      const sd = sortOverride ? sortOverride.sd : skipSort ? "asc" : sortDirTable1;
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
          size: 10,
          ...(resolvedSortKeyTable1 ? { sort: resolvedSortKeyTable1 + "," + sd } : {}),
          ...getSearchParamsSearch1(searchOverrides?.["Search1"]),
          filterExpr: "product.order_status!=99",
          innerRel_4: "4",
          fetchRelationIds: "5,33",
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
    fetchDataTable1(0);
  }, []);

  const handleSortTable1 = (accessor: string) => {
    const isCurrentCol = sortKeyTable1 === accessor;
    const dir = nextSortDir(isCurrentCol, isCurrentCol ? sortDirTable1 : null);
    fetchDataTable1(0, false, undefined, { sk: dir === null ? null : accessor, sd: dir ?? "asc" });
  };

  const handleInlineEditTable1 = async (row: Record<string, unknown>, fieldKey: string, value: unknown) => {
    const rowId = row._id as number | undefined;
    if (rowId == null) return;
    try {
      await api.patch(`/page-data/${dataSlugTable1}/${rowId}/field`, { fieldKey, value });
      fetchDataTable1(0, false, undefined, undefined, true);
    } catch (err) {
      console.error("[inlineEdit] 오류:", err);
      toast.error(t("common.error.update"));
    }
  };

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={13} autoHeight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto auto auto auto auto`,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 12", gridRow: "span 3", height: `${3 * ROW_HEIGHT - GAP_SIZE}px` }}>
            {/* TODO(파일빌드): 처리되지 않은 설정 값이 있습니다 (field:descriptionMsgKey). 필요 시 직접 구현해주세요. */}
            <div className="h-full w-full rounded" style={{ overflow: "clip" }}>
              <SearchForm onSearch={handleSearchSearch1} onReset={handleResetSearch1}>
                <SearchRow cols={5}>
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["product_type"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["product_type"]: e.target.value }))}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("common.label.category")}</option>
                        {groups
                          .find((g) => g.groupCode === "PRODUCTCATEGORY")
                          ?.details.filter((d) => d.active)
                          .map((d) => (
                            <option key={d.code} value={d.code}>
                              {t(d.nameMsgKey || d.name)}
                            </option>
                          ))}
                      </select>
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </SearchField>
                  {!hiddenMapSearch1["category"] && (
                    <SearchField label={""} colSpan={2}>
                      <CategorySearchSelect
                        field={CATEGORY_FIELDS_Search1["category"]}
                        value={String(paramsSearch1["category"] ?? "")}
                        onChange={(v) => setParamsSearch1((prev) => ({ ...prev, ["category"]: v }))}
                      />
                    </SearchField>
                  )}
                  {!hiddenMapSearch1["category_automation"] && (
                    <SearchField label={""} colSpan={2}>
                      <CategorySearchSelect
                        field={CATEGORY_FIELDS_Search1["category_automation"]}
                        value={String(paramsSearch1["category_automation"] ?? "")}
                        onChange={(v) => setParamsSearch1((prev) => ({ ...prev, ["category_automation"]: v }))}
                      />
                    </SearchField>
                  )}
                </SearchRow>
                <SearchRow cols={5}>
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["eq_has_training"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["eq_has_training"]: e.target.value }))}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("common.label.isVisible")}</option>
                        {groups
                          .find((g) => g.groupCode === "VISIBILITY")
                          ?.details.filter((d) => d.active)
                          .map((d) => (
                            <option key={d.code} value={d.code}>
                              {t(d.nameMsgKey || d.name)}
                            </option>
                          ))}
                      </select>
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </SearchField>
                  <SearchField label={""} colSpan={3}>
                    <input
                      type="text"
                      value={String(paramsSearch1["product_name"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["product_name"]: e.target.value }))}
                      placeholder={t("common.placeholder.productName")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    />
                  </SearchField>
                </SearchRow>
              </SearchForm>
            </div>
          </div>
          <div style={{ gridColumn: "span 12", gridRow: "span 10" }}>
            <div className="h-full w-full rounded border border-slate-200 bg-white" style={{ overflow: "clip" }}>
              <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs text-slate-500">
                  {t("common.pagination.total", { count: totalTable1.toLocaleString() })}
                </p>
                <p className="text-xs text-slate-400">
                  {totalTable1 > 0
                    ? t("common.pagination.showing", {
                        start: String(pageTable1 * 10 + 1),
                        end: String(Math.min((pageTable1 + 1) * 10, totalTable1)),
                      })
                    : ""}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "10%" }}
                      >
                        <button
                          onClick={() => handleSortTable1("product.product_type")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.category")}
                          {(sortKeyTable1 === "product.product_type" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "product.product_type" ? sortDirTable1 : false) === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      </th>
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "30%" }}
                      >
                        <button
                          onClick={() => handleSortTable1("_fetchedRel5")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("category.label.lv1")}
                          {(sortKeyTable1 === "_fetchedRel5" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "_fetchedRel5" ? sortDirTable1 : false) === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      </th>
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "30%" }}
                      >
                        <button
                          onClick={() => handleSortTable1("_fetchedRel33")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("category.label.lv2")}
                          {(sortKeyTable1 === "_fetchedRel33" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "_fetchedRel33" ? sortDirTable1 : false) === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      </th>
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "25%" }}
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
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "10%" }}
                      >
                        <button
                          onClick={() => handleSortTable1("product.has_training")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.isVisible")}
                          {(sortKeyTable1 === "product.has_training" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "product.has_training" ? sortDirTable1 : false) === "desc" ? (
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
                        <td colSpan={5} className="py-16 text-center text-sm text-slate-400">
                          {t("common.table.loading")}
                        </td>
                      </tr>
                    ) : rowsTable1.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center text-sm text-slate-400">
                          {t("common.table.no_data")}
                        </td>
                      </tr>
                    ) : (
                      rowsTable1.map((row, idx) => (
                        <tr
                          key={idx}
                          className="border-b border-slate-100 last:border-0 transition-all hover:bg-slate-50/50"
                        >
                          <td
                            className="px-4 py-3 max-w-[200px] overflow-hidden"
                            style={{ textAlign: "center", width: "10%" }}
                          >
                            {(() => {
                              const value = row["product.product_type"];
                              const strVal = value == null || typeof value === "object" ? "" : String(value);
                              const displayVal = resolveCodeLabel(strVal, "PRODUCTCATEGORY", "text", groups, t);
                              return (
                                <span className="text-sm text-slate-700 truncate block" title={displayVal}>
                                  {displayVal}
                                </span>
                              );
                            })()}
                          </td>
                          <td
                            className="px-4 py-3 max-w-[200px] overflow-hidden"
                            style={{ textAlign: "left", width: "30%" }}
                          >
                            {(() => {
                              const value = row["_fetchedRel5"];
                              if (Array.isArray(value)) {
                                const relFormatted = formatFetchedRelValue(
                                  value as unknown[],
                                  row,
                                  5,
                                  undefined,
                                  "ONE_LINE"
                                );
                                if (!relFormatted) return <span className="text-sm text-slate-400">-</span>;
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={relFormatted}>
                                    {relFormatted}
                                  </span>
                                );
                              }
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
                            style={{ textAlign: "left", width: "30%" }}
                          >
                            {(() => {
                              const value = row["_fetchedRel33"];
                              if (Array.isArray(value)) {
                                const relFormatted = formatFetchedRelValue(
                                  value as unknown[],
                                  row,
                                  33,
                                  undefined,
                                  "ONE_LINE"
                                );
                                if (!relFormatted) return <span className="text-sm text-slate-400">-</span>;
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={relFormatted}>
                                    {relFormatted}
                                  </span>
                                );
                              }
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
                            style={{ textAlign: "left", width: "25%" }}
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
                          <td
                            className="px-4 py-3 max-w-[200px] overflow-hidden"
                            style={{ textAlign: "center", width: "10%" }}
                          >
                            {(() => {
                              const value = row["product.has_training"];
                              const boolVal = String(value) === "001";
                              const nextValue = boolVal ? "002" : "001";
                              return (
                                <button
                                  type="button"
                                  onClick={() => handleInlineEditTable1(row, "product.has_training", nextValue)}
                                  className={
                                    boolVal
                                      ? "relative w-9 h-5 rounded-full transition-colors bg-slate-900 cursor-pointer"
                                      : "relative w-9 h-5 rounded-full transition-colors bg-slate-300 cursor-pointer"
                                  }
                                >
                                  <div
                                    className={
                                      boolVal
                                        ? "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-4"
                                        : "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform translate-x-0.5"
                                    }
                                  />
                                </button>
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
        </div>
      </GridCell>
    </PageLayout>
  );
}
