"use client";

import React, { useState, useEffect } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import {
  buildSearchQueryParams,
  buildKeyToId,
  flattenPageDataItem,
  nextSortDir,
  pageGroupRange,
  evalColumnDataExpr,
  resolveEvalExprI18n,
  resolveCodeLabel,
} from "@/app/admin/templates/make/_shared/utils";
import { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { isEnterSearchTrigger } from "@/components/search";
import { RotateCcw, Search, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { useCodeStore } from "@/store/use-code-store";
import { useI18n } from "@/hooks/use-i18n";
import api from "@/lib/api";
import { toast } from "sonner";
import { pagerNumberBtnClass } from "@/app/admin/templates/make/_shared/components/renderer/rendererStyles";

const SEARCH_FIELDS_Search1: SearchFieldConfig[] = [
  {
    colSpan: 1,
    id: "blog.is_visible",
    type: "select",
    fieldKey: "blog.is_visible",
    label: "공ㄱ",
  },
  {
    colSpan: 1,
    id: "status",
    type: "select",
    fieldKey: "status",
    label: "",
    data: "is_visible=001,publish_dttm<=today()?{common.label.publish}:{common.label.unPublish}",
  },
  {
    colSpan: 3,
    id: "blog.title",
    type: "input",
    fieldKey: "blog.title",
    label: "",
  },
];
const searchKeyToIdSearch1 = buildKeyToId(SEARCH_FIELDS_Search1);
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
const SORT_EXPRTable1: Record<string, string> = {
  publishStatus: "is_visible=001,publish_dttm<=today()?{common.label.publish}:{common.label.unPublish}",
};

export default function GeneratedPage() {
  const { t } = useI18n();
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const initialParamsSearch1: Record<string, string> = { "blog.is_visible": "", status: "", "blog.title": "" };
  const [paramsSearch1, setParamsSearch1] = useState<Record<string, string>>(initialParamsSearch1);
  const [rowsTable1, setRowsTable1] = useState<Record<string, unknown>[]>([]);
  const [totalTable1, setTotalTable1] = useState(0);
  const [pageTable1, setPageTable1] = useState(0);
  const [loadingTable1, setLoadingTable1] = useState(false);
  const [totalPagesTable1, setTotalPagesTable1] = useState(0);
  const [sortKeyTable1, setSortKeyTable1] = useState<string | null>(null);
  const [sortDirTable1, setSortDirTable1] = useState<"asc" | "desc">("asc");
  const dataSlugTable1 = "blog-data";

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

  return (
    <div className="space-y-3">
      <PageGridContainer>
        <GridCell colSpan={12} rowSpan={12} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto auto auto auto auto auto`,
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
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["blog.is_visible"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["blog.is_visible"]: e.target.value }))}
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
                  </div>
                  <div className="col-span-1">
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["status"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["status"]: e.target.value }))}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("common.label.publishStatus")}</option>
                        <option value={"{common.label.publish}"}>{t("common.label.publish")}</option>
                        <option value={"{common.label.unPublish}"}>{t("common.label.unPublish")}</option>
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
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={String(paramsSearch1["blog.title"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["blog.title"]: e.target.value }))}
                      placeholder={t("common.placeholder.title")}
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
            <div style={{ gridColumn: "12 / span 1", gridRow: "span 1" }}>
              <div
                className="w-full rounded"
                style={{
                  overflow: "visible",
                  display: "grid",
                  gridTemplateColumns: "repeat(1, 1fr)",
                  gridTemplateRows: `auto`,
                  gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                  rowGap: `${GAP_SIZE}px`,
                  columnGap: `${GAP_SIZE}px`,
                }}
              >
                <div
                  className="flex items-center-safe gap-2 px-3 min-w-0 justify-end"
                  style={{ gridColumn: "span 1", gridRow: "span 1" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      /* TODO(파일빌드 Phase 2): connType='popup' 버튼 동작은 빌더 런타임 전용이라 파일빌드에서 지원하지 않습니다. 직접 구현해주세요. */
                    }}
                    className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 bg-slate-900 text-white"
                  >
                    {t("blog.btn.add")}
                  </button>
                </div>
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
                            onClick={() => handleSortTable1("title")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.title")}
                            {(sortKeyTable1 === "title" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "title" ? sortDirTable1 : false) === "desc" ? (
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
                            onClick={() => handleSortTable1("count")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.views")}
                            {(sortKeyTable1 === "count" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "count" ? sortDirTable1 : false) === "desc" ? (
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
                          style={{ textAlign: "center", width: "150px" }}
                        >
                          <button
                            onClick={() => handleSortTable1("publishStatus")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.publishStatus")}
                            {(sortKeyTable1 === "publishStatus" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "publishStatus" ? sortDirTable1 : false) === "desc" ? (
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
                            onClick={() => handleSortTable1("publish_dttm")}
                            className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                          >
                            {t("common.label.publishDttm")}
                            {(sortKeyTable1 === "publish_dttm" ? sortDirTable1 : false) === "asc" ? (
                              <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                            ) : (sortKeyTable1 === "publish_dttm" ? sortDirTable1 : false) === "desc" ? (
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
                          style={{ textAlign: "center", width: "150px" }}
                        >
                          <span className="flex items-center justify-center gap-1">{t("common.label.preview")}</span>
                        </th>
                        <th
                          className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                          style={{ textAlign: "center", width: "120px" }}
                        >
                          <span className="flex items-center justify-center gap-1">{t("common.label.action")}</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingTable1 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-sm text-slate-400">
                            {t("common.table.loading")}
                          </td>
                        </tr>
                      ) : rowsTable1.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-16 text-center text-sm text-slate-400">
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
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {(() => {
                                const value = row["title"];
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
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {(() => {
                                const value = row["count"];
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
                              style={{ textAlign: "center", width: "150px" }}
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
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {(() => {
                                const value = resolveEvalExprI18n(
                                  evalColumnDataExpr(
                                    "is_visible=001,publish_dttm<=today()?{common.label.publish}:{common.label.unPublish}",
                                    row
                                  ),
                                  t
                                );
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
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {(() => {
                                const value = row["publish_dttm"];
                                const dateVal = formatCellDate(String(value ?? ""), "YYYY-MM-DD HH:mm");
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
                                const value = row["updatedAt"];
                                const dateVal = formatCellDate(String(value ?? ""), "YYYY-MM-DD HH:mm");
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
                              style={{ textAlign: "center", width: "150px" }}
                            >
                              {/* TODO(파일빌드 Phase 2): cellType='button' 컬럼은 아직 코드 생성이 지원되지 않습니다. */}
                              <span className="text-slate-300">-</span>
                            </td>
                            <td
                              className="px-4 py-3 max-w-[200px] overflow-hidden"
                              style={{ textAlign: "center", width: "120px" }}
                            >
                              {/* TODO(파일빌드 Phase 2): cellType='actions' 컬럼은 아직 코드 생성이 지원되지 않습니다. */}
                              <span className="text-slate-300">-</span>
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
                        className={pagerNumberBtnClass(pageTable1 === p)}
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
