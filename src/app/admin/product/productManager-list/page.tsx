"use client";

import React, { useState, useEffect, useMemo } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import {
  buildSearchQueryParams,
  buildKeyToId,
  flattenPageDataItem,
  buildSlugOptRows,
  nextSortDir,
  pageGroupRange,
  evalColumnDataExpr,
  resolveEvalExprI18n,
  resolveCodeLabel,
  formatFetchedRelValue,
  formatFetchedRelMulti,
  parseActionParams,
} from "@/app/admin/templates/make/_shared/utils";
import { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { isEnterSearchTrigger } from "@/components/search";
import { RotateCcw, Search, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2 } from "lucide-react";
import api, { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { useCodeStore } from "@/store/use-code-store";
import { useRouter } from "next/navigation";

const SEARCH_FIELDS_Search1: SearchFieldConfig[] = [
  {
    colSpan: 1,
    id: "product_name",
    type: "select",
    fieldKey: "product_name",
    label: "",
    joinRelationSlugId: 10,
    joinSlaveKey: "id",
  },
  {
    colSpan: 4,
    id: "email",
    type: "input",
    fieldKey: "email",
    label: "",
  },
];
const searchKeyToIdSearch1 = buildKeyToId(SEARCH_FIELDS_Search1);

function SlugOptionSelect({
  field,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  rowData,
}: {
  field: {
    optionSlug?: string;
    optionValueKey?: string;
    optionTextKey?: string;
    optionFilter?: string;
    optionOrderKey?: string;
    optionOrderDir?: "ASC" | "DESC";
  };
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  className: string;
  rowData?: Record<string, unknown>;
}) {
  const [rowsBySlug, setRowsBySlug] = useState<{ slug: string; rows: Record<string, unknown>[] }>({
    slug: "",
    rows: [],
  });
  useEffect(() => {
    if (!field.optionSlug) return;
    const slug = field.optionSlug;
    api
      .get(`/page-data/${slug}`, { params: { size: "9999" } })
      .then((res) => {
        const rows = (res.data?.content ?? []) as { dataJson: Record<string, unknown> }[];
        setRowsBySlug({
          slug,
          rows: rows.map((item) => flattenPageDataItem(item as unknown as Parameters<typeof flattenPageDataItem>[0])),
        });
      })
      .catch(() => setRowsBySlug({ slug, rows: [] }));
  }, [field.optionSlug]);
  const rawRows = rowsBySlug.slug === field.optionSlug ? rowsBySlug.rows : [];
  const opts = useMemo(() => buildSlugOptRows(rawRows, field, rowData), [rawRows, field, rowData]);
  return (
    <div className="relative">
      <select disabled={disabled} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {opts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.text}
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
  );
}
function formatCellDate(rawVal: string, format?: string): string {
  if (!rawVal) return "-";
  if (!format) return rawVal;
  const d = new Date(rawVal);
  if (isNaN(d.getTime())) return rawVal;
  const YYYY = String(d.getFullYear());
  const MM = String(d.getMonth() + 1).padStart(2, "0");
  const DD = String(d.getDate()).padStart(2, "0");
  const HH = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return format
    .replace("YYYY", YYYY)
    .replace("MM", MM)
    .replace("DD", DD)
    .replace("HH", HH)
    .replace("mm", mm)
    .replace("ss", ss);
}
const SORT_EXPRTable1: Record<string, string> = { _fetchedRel10: "product_name" };
const DETAIL_PAGE_PATH = "/admin/product/productManager-detail";
const EDIT_PAGE_RULES_Table1: { connType?: string; pageSlug?: string; passParam?: string; conditionParam?: string }[] =
  [
    {
      connType: "popup",
      pageSlug: "productManager-detail",
      passParam: "",
      conditionParam: "",
    },
  ];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("productManager.label.menuTitle"));
  }, [setPageTitle, t]);
  const initialParamsSearch1: Record<string, string> = { product_name: "", email: "" };
  const [paramsSearch1, setParamsSearch1] = useState<Record<string, string>>(initialParamsSearch1);
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const [rowsTable1, setRowsTable1] = useState<Record<string, unknown>[]>([]);
  const [totalTable1, setTotalTable1] = useState(0);
  const [pageTable1, setPageTable1] = useState(0);
  const [loadingTable1, setLoadingTable1] = useState(false);
  const [totalPagesTable1, setTotalPagesTable1] = useState(0);
  const [sortKeyTable1, setSortKeyTable1] = useState<string | null>(null);
  const [sortDirTable1, setSortDirTable1] = useState<"asc" | "desc">("asc");
  const dataSlugTable1 = "productManager-data";
  const router = useRouter();

  const getSearchParamsSearch1 = (sv: Record<string, string> = paramsSearch1): Record<string, string> =>
    buildSearchQueryParams(SEARCH_FIELDS_Search1, sv);

  const slugOptRowDataSearch1 = useMemo(() => {
    const map: Record<string, unknown> = {};
    SEARCH_FIELDS_Search1.forEach((f) => {
      if (f.fieldKey) map[f.fieldKey] = paramsSearch1[f.id] ?? "";
    });
    return map;
  }, [paramsSearch1]);

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
          size: 10,
          ...(resolvedSortKeyTable1 ? { sort: resolvedSortKeyTable1 + "," + sd } : {}),
          ...(sk && SORT_EXPRTable1[sk] ? { sortExpr: SORT_EXPRTable1[sk] } : {}),
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
    fetchDataTable1(0);
  }, []);

  const handleSortTable1 = (accessor: string) => {
    const isCurrentCol = sortKeyTable1 === accessor;
    const dir = nextSortDir(isCurrentCol, isCurrentCol ? sortDirTable1 : null);
    fetchDataTable1(0, false, undefined, { sk: dir === null ? null : accessor, sd: dir ?? "asc" });
  };

  const handleTableEditTable1 = (row: Record<string, unknown>) => {
    /* TODO(파일빌드): connType='popup' 규칙도 산출물에서는 페이지 이동으로 동작합니다(레이어 팝업 미지원). */
    const matched =
      EDIT_PAGE_RULES_Table1.find((rule) => {
        if (!rule.conditionParam) return false;
        const eqIdx = rule.conditionParam.indexOf("=");
        if (eqIdx === -1) return false;
        return String(row[rule.conditionParam.slice(0, eqIdx)] ?? "") === rule.conditionParam.slice(eqIdx + 1);
      }) ?? EDIT_PAGE_RULES_Table1.find((rule) => !rule.conditionParam);
    if (!matched?.pageSlug) return;
    const params = new URLSearchParams();
    if (row._id != null) params.set("id", String(row._id));
    if (matched.passParam) {
      Object.entries(parseActionParams(matched.passParam, row)).forEach(([k, v]) => params.set(k, v));
    }
    const qs = params.toString() ? `?${params.toString()}` : "";
    router.push(`${DETAIL_PAGE_PATH}${qs}`);
  };

  const handleTableDeleteTable1 = async (id: number) => {
    if (!confirm(t("common.confirm.delete"))) return;
    try {
      await api.delete(`/page-data/${dataSlugTable1}/${id}`);
      toast.success(t("common.deleted"));
      fetchDataTable1(pageTable1);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error.delete")));
    }
  };

  return (
    <div className="space-y-3">
      <PageGridContainer>
        <GridCell colSpan={12} rowSpan={11} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto auto auto auto auto`,
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
                  <div className="col-span-1">
                    <SlugOptionSelect
                      field={{
                        optionSlug: "product-data",
                        optionValueKey: "id",
                        optionTextKey: "product_name",
                        optionOrderKey: "product_name",
                        optionOrderDir: "ASC",
                      }}
                      value={String(paramsSearch1["product_name"] ?? "")}
                      onChange={(v) => setParamsSearch1((prev) => ({ ...prev, ["product_name"]: v }))}
                      disabled={false}
                      placeholder={t("common.label.Lv3")}
                      className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      rowData={slugOptRowDataSearch1}
                    />
                  </div>
                  <div className="col-span-4">
                    <input
                      type="text"
                      value={String(paramsSearch1["email"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["email"]: e.target.value }))}
                      placeholder={t("productManager.email.placeholder")}
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
                          style={{ textAlign: "center", width: "150px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("email")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("productManager.label.email")}
                            {(sortKeyTable1 === "email" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "email" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "150px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("_fetchedRel10")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.productName")}
                            {(sortKeyTable1 === "_fetchedRel10" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "_fetchedRel10" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "50px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("is_visible")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.isVisible")}
                            {(sortKeyTable1 === "is_visible" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "is_visible" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "50px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("updatedAt")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.updatedAt")}
                            {(sortKeyTable1 === "updatedAt" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "updatedAt" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "150px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("updatedBy")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.updateBy")}
                            {(sortKeyTable1 === "updatedBy" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "updatedBy" ? sortDirTable1 : false) === "desc" ? (
                              <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                            ) : (
                              <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                            )}
                          </button>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "100px" }}
                        >
                          <span className="flex items-center justify-center gap-1">{t("common.label.action")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTable1 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                            {t("common.table.loading")}
                          </td>
                        </tr>
                      ) : rowsTable1.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
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
                              style={{ textAlign: "left", width: "150px" }}
                            >
                              {(() => {
                                const value = row["email"];
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
                              style={{ textAlign: "left", width: "150px" }}
                            >
                              {(() => {
                                const value = !Array.isArray(row["_fetchedRel10"])
                                  ? resolveEvalExprI18n(evalColumnDataExpr("product_name", row), t)
                                  : row["_fetchedRel10"];
                                if (Array.isArray(value)) {
                                  const relFormatted = formatFetchedRelValue(
                                    value as unknown[],
                                    row,
                                    10,
                                    "product_name",
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
                              style={{ textAlign: "center", width: "50px" }}
                            >
                              {(() => {
                                const value = row["is_visible"];
                                const strVal = value == null || typeof value === "object" ? "" : String(value);
                                const displayVal = resolveCodeLabel(strVal, "VISIBILITY", "text", groups, t);
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={displayVal}>
                                    {displayVal}
                                  </span>
                                );
                              })()}
                            </td>
                            <td
                              className="px-4 py-3 max-w-[200px] overflow-hidden"
                              style={{ textAlign: "center", width: "50px" }}
                            >
                              {(() => {
                                const value = row["updatedAt"];
                                const dateVal = formatCellDate(String(value ?? ""), "YYYY-MM-DD HH:mm:ss");
                                return (
                                  <span className="text-sm text-slate-700 truncate block" title={dateVal}>
                                    {dateVal}
                                  </span>
                                );
                              })()}
                            </td>
                            <td
                              className="px-4 py-3 max-w-[200px] overflow-hidden"
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {(() => {
                                const value = row["updatedBy"];
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
                              style={{ textAlign: "center", width: "100px" }}
                            >
                              <div className="flex items-center gap-1 flex-nowrap justify-center">
                                <button
                                  type="button"
                                  onClick={() => handleTableEditTable1(row)}
                                  className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  title={t("common.btn.edit")}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTableDeleteTable1(row._id as number)}
                                  className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                  title={t("common.btn.delete")}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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
      </PageGridContainer>
    </div>
  );
}
