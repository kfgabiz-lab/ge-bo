"use client";

import React, { useState, useEffect, useRef } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import PageLayout from "@/components/layout/page-layout";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import {
  buildSearchQueryParams,
  buildKeyToId,
  buildSearchFieldDefaultValues,
  buildDateRangeGenerationPatch,
  validateSearchDateRange,
  evalFieldCondition,
  resolveCategoryDepthLabel,
  resolveFetchSortKey,
  flattenPageDataItem,
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
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { SearchForm, SearchRow, SearchField } from "@/components/search";
import { Calendar, ChevronUp, ChevronDown, ChevronsUpDown, Pencil, Trash2, CopyPlus } from "lucide-react";
import { useCodeStore } from "@/store/use-code-store";
import { useHiddenSearchFieldReset } from "@/app/admin/templates/make/_shared/components/renderer/useHiddenSearchFieldReset";
import { useCategoryCascade } from "@/app/admin/templates/make/_shared/components/renderer/useCategoryCascade";
import api, { getApiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import type { ApiInfoOption } from "@/app/admin/templates/make/_shared/components/builder/fields/ApiInfoSelectField";
import { useRouter } from "next/navigation";

const SEARCH_FIELDS_Search1: SearchFieldConfig[] = [
  {
    colSpan: 1,
    id: "period_type",
    type: "select",
    fieldKey: "period_type",
    label: "",
    excludeFromSearch: true,
    defaultOptionValue: "01",
  },
  {
    colSpan: 2,
    id: "updatedAt",
    type: "dateRange",
    fieldKey: "updatedAt",
    label: "",
    hideCondition: "period_type!=01",
    singleDateRange: true,
    defaultEndToday: true,
    defaultStartDateOffset: 30,
    defaultStartDate: "2026-06-02",
    maxRangeValue: 30,
    maxRangeUnit: "day",
    dataGenerations: [
      {
        generationKey: "training_date_from,training_date_to,register_period_to",
        datePart: "from",
      },
      {
        generationKey: "training_date_from,training_date_to,register_period_to",
        datePart: "to",
      },
    ],
  },
  {
    colSpan: 2,
    id: "training_date_from",
    type: "dateRange",
    fieldKey: "training_date_from",
    label: "",
    hideCondition: "period_type!=02",
    singleDateRange: true,
    defaultStartDateOffset: 30,
    defaultStartDate: "2026-06-02",
    maxRangeValue: 30,
    maxRangeUnit: "day",
    dataGenerations: [
      {
        generationKey: "updatedAt,training_date_to,register_period_to",
        datePart: "from",
      },
      {
        generationKey: "updatedAt,training_date_to,register_period_to",
        datePart: "to",
      },
    ],
  },
  {
    colSpan: 2,
    id: "training_date_to",
    type: "dateRange",
    fieldKey: "training_date_to",
    label: "",
    hideCondition: "period_type!=03",
    singleDateRange: true,
    defaultStartDateOffset: 30,
    defaultStartDate: "2026-06-02",
    maxRangeValue: 30,
    maxRangeUnit: "day",
    dataGenerations: [
      {
        generationKey: "updatedAt,training_date_from,register_period_to",
        datePart: "from",
      },
      {
        generationKey: "updatedAt,training_date_from,register_period_to",
        datePart: "to",
      },
    ],
  },
  {
    colSpan: 2,
    id: "register_period_to",
    type: "dateRange",
    fieldKey: "register_period_to",
    label: "",
    hideCondition: "period_type!=04",
    singleDateRange: true,
    defaultStartDateOffset: 30,
    defaultStartDate: "2026-06-02",
    maxRangeValue: 30,
    maxRangeUnit: "day",
    dataGenerations: [
      {
        generationKey: "updatedAt,training_date_from,training_date_to",
        datePart: "from",
      },
      {
        generationKey: "updatedAt,training_date_from,training_date_to",
        datePart: "to",
      },
    ],
  },
  {
    colSpan: 1,
    id: "is_visible",
    type: "select",
    fieldKey: "is_visible",
    label: "",
  },
  {
    colSpan: 1,
    id: "training_course",
    type: "select",
    fieldKey: "training_course",
    label: "",
  },
  {
    colSpan: 1,
    id: "product_category",
    type: "select",
    fieldKey: "product_category",
    label: "",
    joinRelationSlugId: 8,
    joinSlaveKey: "curriculum.product_category",
  },
  {
    colSpan: 3,
    id: "category",
    type: "category",
    fieldKey: "category",
    label: "",
    relationSlugId: 4,
  },
  {
    colSpan: 2,
    id: "course_title",
    type: "input",
    fieldKey: "course_title",
    label: "",
    joinRelationSlugId: 8,
    joinSlaveKey: "curriculum.title",
  },
  {
    colSpan: 2,
    id: "title",
    type: "input",
    fieldKey: "title",
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
    colSpan: 3,
    fieldKey: "category",
    maxDepth: 3,
    depthLabels: [],
    labelMsgKey: "",
    placeholder: "",
    relationSlugId: 4,
    depthTextFields: ["category.title", "category.title", "_fetchedRel28"],
    depthValueFields: ["id", "id", "id"],
    depthLabelMsgKeys: ["category.label.lv1", "category.label.lv2", "category.label.lv3"],
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
function parseContentDispositionFilename(disposition?: string): string | null {
  if (!disposition) return null;
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }
  const basicMatch = /filename="?([^";]+)"?/i.exec(disposition);
  return basicMatch ? basicMatch[1].trim() : null;
}
const DETAIL_PAGE_PATH = "/admin/training/session/detail";
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
function applyDotField(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  const idx = key.indexOf(".");
  if (idx === -1) return { ...obj, [key]: value };
  const head = key.slice(0, idx);
  const tail = key.slice(idx + 1);
  return { ...obj, [head]: applyDotField((obj[head] as Record<string, unknown>) ?? {}, tail, value) };
}
const SORT_EXPRTable1: Record<string, string> = { _fetchedRel11: "product.product_name" };
const EDIT_PAGE_RULES_Table1: { connType?: string; pageSlug?: string; passParam?: string; conditionParam?: string }[] =
  [
    {
      connType: "popup",
      pageSlug: "currDltMgmt-basicInfo",
      passParam: "",
      conditionParam: "",
    },
  ];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("common.label.session"));
  }, [setPageTitle, t]);
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const initialParamsSearch1Ref = useRef<Record<string, string>>({
    period_type: "",
    updatedAt_from: "",
    updatedAt_to: "",
    training_date_from_from: "",
    training_date_from_to: "",
    training_date_to_from: "",
    training_date_to_to: "",
    register_period_to_from: "",
    register_period_to_to: "",
    is_visible: "",
    training_course: "",
    product_category: "",
    category: "",
    course_title: "",
    title: "",
  });
  const [paramsSearch1, setParamsSearch1] = useState<Record<string, string>>(initialParamsSearch1Ref.current);
  const [searchDefaultsReadySearch1, setSearchDefaultsReadySearch1] = useState(false);
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
  const [apiInfoOptions, setApiInfoOptions] = useState<ApiInfoOption[]>([]);
  useEffect(() => {
    api
      .get("/api-infos/active")
      .then((res) => setApiInfoOptions(res.data || []))
      .catch(() => {});
  }, []);
  const router = useRouter();
  const [rowsTable1, setRowsTable1] = useState<Record<string, unknown>[]>([]);
  const [totalTable1, setTotalTable1] = useState(0);
  const [pageTable1, setPageTable1] = useState(0);
  const [loadingTable1, setLoadingTable1] = useState(false);
  const [totalPagesTable1, setTotalPagesTable1] = useState(0);
  const [sortKeyTable1, setSortKeyTable1] = useState<string | null>(null);
  const [sortDirTable1, setSortDirTable1] = useState<"asc" | "desc">("asc");
  const dataSlugTable1 = "currDtlMgmt-data";

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
    const cleared: Record<string, string> = {};
    Object.keys({ ...initialParamsSearch1Ref.current, ...paramsSearch1 }).forEach((k) => {
      cleared[k] = "";
    });
    setParamsSearch1(cleared);
    fetchDataTable1(0, true, { Search1: cleared }, { sk: null, sd: "asc" });
  };

  const handleSearchSearch1 = () => {
    if (!validateSearchDateRange(SEARCH_FIELDS_Search1, paramsSearch1, t)) return;
    fetchDataTable1(0, true);
  };

  const handleApiCallSpace1_0 = async () => {
    const apiInfo = apiInfoOptions.find((a) => a.id === 138);
    if (!apiInfo) {
      toast.error("연결된 API를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
      return;
    }
    const restParams: Record<string, string> = {};
    let url = apiInfo.urlPattern.startsWith("/api/v1")
      ? apiInfo.urlPattern.slice("/api/v1".length)
      : apiInfo.urlPattern;
    url = url.replace(/\{([^}]+)\}/g, (matched, key: string) => {
      if (!(key in restParams)) return matched;
      const val = restParams[key];
      delete restParams[key];
      return encodeURIComponent(val);
    });
    const currentSearchParams: Record<string, string> = { ...getSearchParamsSearch1() };
    const currentTableSortParams: Record<string, string> = {};
    if (sortKeyTable1) {
      currentTableSortParams.sort = `${resolveFetchSortKey([{ accessor: "training_course" }, { accessor: "training_type" }, { accessor: "_fetchedRel8.product_category", relationSlugId: 8 }, { accessor: "_fetchedRel8.title", relationSlugId: 8 }, { accessor: "title" }, { accessor: "_fetchedRel11", relationSlugId: 11, relationSlugIds: [11, 32] }, { accessor: "register_period_to" }, { accessor: "training_date_from" }, { accessor: "training_date_to" }, { accessor: "is_visible" }, { accessor: "count" }, { accessor: "updatedAt" }, { accessor: "updatedBy" }, { accessor: "actions" }], sortKeyTable1)},${sortDirTable1}`;
      if (SORT_EXPRTable1[sortKeyTable1]) currentTableSortParams.sortExpr = SORT_EXPRTable1[sortKeyTable1];
    }
    const finalParams: Record<string, string> = { ...currentSearchParams, ...currentTableSortParams, ...restParams };
    const method = (apiInfo.method || "GET").toUpperCase();
    try {
      const res = await api.request({
        method,
        url,
        responseType: "blob",
        ...(method === "GET" || method === "DELETE" ? { params: finalParams } : { data: finalParams }),
      });
      const disposition = res.headers?.["content-disposition"] as string | undefined;
      const filename = parseContentDispositionFilename(disposition) ?? `${apiInfo.name || "download"}.xlsx`;
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "요청을 실행할 수 없습니다."));
    }
  };

  const handleApiCallSpace1_1 = async () => {
    const apiInfo = apiInfoOptions.find((a) => a.id === 149);
    if (!apiInfo) {
      toast.error("연결된 API를 찾을 수 없습니다. 관리자에게 문의해 주세요.");
      return;
    }
    const restParams: Record<string, string> = {};
    let url = apiInfo.urlPattern.startsWith("/api/v1")
      ? apiInfo.urlPattern.slice("/api/v1".length)
      : apiInfo.urlPattern;
    url = url.replace(/\{([^}]+)\}/g, (matched, key: string) => {
      if (!(key in restParams)) return matched;
      const val = restParams[key];
      delete restParams[key];
      return encodeURIComponent(val);
    });
    const currentSearchParams: Record<string, string> = { ...getSearchParamsSearch1() };
    const currentTableSortParams: Record<string, string> = {};
    if (sortKeyTable1) {
      currentTableSortParams.sort = `${resolveFetchSortKey([{ accessor: "training_course" }, { accessor: "training_type" }, { accessor: "_fetchedRel8.product_category", relationSlugId: 8 }, { accessor: "_fetchedRel8.title", relationSlugId: 8 }, { accessor: "title" }, { accessor: "_fetchedRel11", relationSlugId: 11, relationSlugIds: [11, 32] }, { accessor: "register_period_to" }, { accessor: "training_date_from" }, { accessor: "training_date_to" }, { accessor: "is_visible" }, { accessor: "count" }, { accessor: "updatedAt" }, { accessor: "updatedBy" }, { accessor: "actions" }], sortKeyTable1)},${sortDirTable1}`;
      if (SORT_EXPRTable1[sortKeyTable1]) currentTableSortParams.sortExpr = SORT_EXPRTable1[sortKeyTable1];
    }
    const finalParams: Record<string, string> = { ...currentSearchParams, ...currentTableSortParams, ...restParams };
    const method = (apiInfo.method || "GET").toUpperCase();
    try {
      const res = await api.request({
        method,
        url,
        responseType: "blob",
        ...(method === "GET" || method === "DELETE" ? { params: finalParams } : { data: finalParams }),
      });
      const disposition = res.headers?.["content-disposition"] as string | undefined;
      const filename = parseContentDispositionFilename(disposition) ?? `${apiInfo.name || "download"}.xlsx`;
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "요청을 실행할 수 없습니다."));
    }
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
      if (sk && sortOverride) {
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
          ...(resolvedSortKeyTable1
            ? {
                sort:
                  resolveFetchSortKey(
                    [
                      { accessor: "training_course" },
                      { accessor: "training_type" },
                      { accessor: "_fetchedRel8.product_category", relationSlugId: 8 },
                      { accessor: "_fetchedRel8.title", relationSlugId: 8 },
                      { accessor: "title" },
                      { accessor: "_fetchedRel11", relationSlugId: 11, relationSlugIds: [11, 32] },
                      { accessor: "register_period_to" },
                      { accessor: "training_date_from" },
                      { accessor: "training_date_to" },
                      { accessor: "is_visible" },
                      { accessor: "count" },
                      { accessor: "updatedAt" },
                      { accessor: "updatedBy" },
                      { accessor: "actions" },
                    ],
                    resolvedSortKeyTable1
                  ) +
                  "," +
                  sd,
              }
            : {}),
          ...(sk && SORT_EXPRTable1[sk] ? { sortExpr: SORT_EXPRTable1[sk] } : {}),
          ...getSearchParamsSearch1(searchOverrides?.["Search1"]),
          fetchRelationIds: "32,11,8",
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

  const handleTableEditTable1 = (row: Record<string, unknown>) => {
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
      fetchDataTable1(0, false, undefined, undefined, true);
    } catch (err) {
      toast.error(getApiErrorMessage(err, t("common.error.delete")));
    }
  };

  const handleTableCopyTable1 = async (row: Record<string, unknown>) => {
    if (!confirm(t("common.confirm.copy"))) return;
    const id = row._id as number;
    if (!id) return;
    try {
      const detailRes = await api.get(`/page-data/${dataSlugTable1}/${id}`);
      const originalDataJson = (detailRes.data.dataJson ?? {}) as Record<string, unknown>;
      let copyDataJson = originalDataJson;
      const flatOriginal = flattenPageDataItem(detailRes.data);
      Object.entries(
        parseActionParams(
          "curriculum_detail2.register_period_to='',curriculum_detail2.training_date_to='',curriculum_detail2.training_date_from='',curriculum_detail3.is_visible='002',",
          flatOriginal
        )
      ).forEach(([key, value]) => {
        copyDataJson = applyDotField(copyDataJson, key, value);
      });
      await api.post(`/page-data/${dataSlugTable1}`, { dataJson: copyDataJson });
      toast.success(t("common.copied"));
      fetchDataTable1(pageTable1);
    } catch (e) {
      const response = (e as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (response?.status === 409) {
        toast.error(response.data?.message || t("common.error.duplicate_key"));
      } else {
        toast.error(t("common.error.copy"));
      }
    }
  };

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={15} autoHeight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto auto auto auto auto auto`,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 12", gridRow: "span 4", height: `${4 * ROW_HEIGHT - GAP_SIZE}px` }}>
            <div className="h-full w-full rounded" style={{ overflow: "clip" }}>
              <SearchForm onSearch={handleSearchSearch1} onReset={handleResetSearch1}>
                <SearchRow cols={5}>
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["period_type"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["period_type"]: e.target.value }))}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("common.label.all")}</option>
                        {groups
                          .find((g) => g.groupCode === "CURRDTLPERIODTYPE")
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
                  {!hiddenMapSearch1["updatedAt"] && (
                    <SearchField label={["", ""].filter(Boolean).join(" ~ ")} colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["updatedAt_from"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["updatedAt_from"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "updatedAt", "from", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                        <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["updatedAt_to"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["updatedAt_to"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "updatedAt", "to", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                      </div>
                    </SearchField>
                  )}
                  {!hiddenMapSearch1["training_date_from"] && (
                    <SearchField label={["", ""].filter(Boolean).join(" ~ ")} colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["training_date_from_from"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["training_date_from_from"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "training_date_from", "from", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                        <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["training_date_from_to"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["training_date_from_to"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "training_date_from", "to", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                      </div>
                    </SearchField>
                  )}
                  {!hiddenMapSearch1["training_date_to"] && (
                    <SearchField label={["", ""].filter(Boolean).join(" ~ ")} colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["training_date_to_from"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["training_date_to_from"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "training_date_to", "from", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                        <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["training_date_to_to"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["training_date_to_to"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "training_date_to", "to", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                      </div>
                    </SearchField>
                  )}
                  {!hiddenMapSearch1["register_period_to"] && (
                    <SearchField label={["", ""].filter(Boolean).join(" ~ ")} colSpan={2}>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["register_period_to_from"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["register_period_to_from"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "register_period_to", "from", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                        <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                        <div className="relative flex-1">
                          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                          <input
                            type="date"
                            value={String(paramsSearch1["register_period_to_to"] ?? "")}
                            onChange={(e) => {
                              const v = e.target.value;
                              setParamsSearch1((prev) => ({ ...prev, ["register_period_to_to"]: v }));
                              Object.entries(
                                buildDateRangeGenerationPatch(SEARCH_FIELDS_Search1, "register_period_to", "to", v)
                              ).forEach(([k, val]) => setParamsSearch1((prev) => ({ ...prev, [k]: val })));
                            }}
                            onClick={(e) => e.currentTarget.showPicker?.()}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          />
                        </div>
                      </div>
                    </SearchField>
                  )}
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["is_visible"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["is_visible"]: e.target.value }))}
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
                </SearchRow>
                <SearchRow cols={5}>
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["training_course"] ?? "")}
                        onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["training_course"]: e.target.value }))}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("common.label.training")}</option>
                        {groups
                          .find((g) => g.groupCode === "TRAININGCOURSE")
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
                  <SearchField label={""}>
                    <div className="relative">
                      <select
                        value={String(paramsSearch1["product_category"] ?? "")}
                        onChange={(e) =>
                          setParamsSearch1((prev) => ({ ...prev, ["product_category"]: e.target.value }))
                        }
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      >
                        <option value="">{t("training.label.category")}</option>
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
                  <SearchField label={""} colSpan={3}>
                    <CategorySearchSelect
                      field={CATEGORY_FIELDS_Search1["category"]}
                      value={String(paramsSearch1["category"] ?? "")}
                      onChange={(v) => setParamsSearch1((prev) => ({ ...prev, ["category"]: v }))}
                    />
                  </SearchField>
                </SearchRow>
                <SearchRow cols={4}>
                  <SearchField label={""} colSpan={2}>
                    <input
                      type="text"
                      value={String(paramsSearch1["course_title"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["course_title"]: e.target.value }))}
                      placeholder={t("course.placeholder.search")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    />
                  </SearchField>
                  <SearchField label={""} colSpan={2}>
                    <input
                      type="text"
                      value={String(paramsSearch1["title"] ?? "")}
                      onChange={(e) => setParamsSearch1((prev) => ({ ...prev, ["title"]: e.target.value }))}
                      placeholder={t("common.placeholder.title")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    />
                  </SearchField>
                </SearchRow>
              </SearchForm>
            </div>
          </div>
          <div style={{ gridColumn: "10 / span 3", gridRow: "span 1" }}>
            <div
              className="w-full rounded"
              style={{
                overflow: "visible",
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                rowGap: `${GAP_SIZE}px`,
                columnGap: `${GAP_SIZE}px`,
              }}
            >
              <div
                className="flex items-center-safe gap-2 px-3 min-w-0 justify-end"
                style={{ gridColumn: "span 3", gridRow: "span 1" }}
              >
                <button
                  type="button"
                  onClick={() => {
                    handleApiCallSpace1_0();
                  }}
                  className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-900 text-white"
                >
                  {t("common.label.trnSchDown")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleApiCallSpace1_1();
                  }}
                  className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-900 text-white"
                >
                  {t("common.label.sessionDown")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    router.push(DETAIL_PAGE_PATH);
                  }}
                  className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-900 text-white"
                >
                  {t("session.btn.add")}
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
                          onClick={() => handleSortTable1("training_course")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.training")}
                          {(sortKeyTable1 === "training_course" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "training_course" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("training_type")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.trnType")}
                          {(sortKeyTable1 === "training_type" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "training_type" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("_fetchedRel8.product_category")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("training.label.category")}
                          {(sortKeyTable1 === "_fetchedRel8.product_category" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "_fetchedRel8.product_category" ? sortDirTable1 : false) === "desc" ? (
                            <ChevronDown className="w-3.5 h-3.5 text-blue-500" />
                          ) : (
                            <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
                          )}
                        </button>
                      </th>
                      <th
                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                        style={{ textAlign: "center", width: "151px" }}
                      >
                        <button
                          onClick={() => handleSortTable1("_fetchedRel8.title")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.courseTitle")}
                          {(sortKeyTable1 === "_fetchedRel8.title" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "_fetchedRel8.title" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("_fetchedRel11")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.trnProducts")}
                          {(sortKeyTable1 === "_fetchedRel11" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "_fetchedRel11" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("register_period_to")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("common.label.regEndDate")}
                          {(sortKeyTable1 === "register_period_to" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "register_period_to" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("training_date_from")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("currDtlMgmt.label.trnStart")}
                          {(sortKeyTable1 === "training_date_from" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "training_date_from" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("training_date_to")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("currDtlMgmt.label.trnEndDate")}
                          {(sortKeyTable1 === "training_date_to" ? sortDirTable1 : false) === "asc" ? (
                            <ChevronUp className="w-3.5 h-3.5 text-blue-500" />
                          ) : (sortKeyTable1 === "training_date_to" ? sortDirTable1 : false) === "desc" ? (
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
                          onClick={() => handleSortTable1("count")}
                          className="flex items-center justify-center gap-1 w-full transition-colors hover:text-slate-900"
                        >
                          {t("currDtlMgmt.label.applicantCount")}
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
                        style={{ textAlign: "center", width: "100px" }}
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
                        style={{ textAlign: "center", width: "50px" }}
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
                        style={{ textAlign: "center", width: "120px" }}
                      >
                        <span className="flex items-center justify-center gap-1">{t("common.label.action")}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingTable1 ? (
                      <tr>
                        <td colSpan={14} className="py-16 text-center text-sm text-slate-400">
                          {t("common.table.loading")}
                        </td>
                      </tr>
                    ) : rowsTable1.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="py-16 text-center text-sm text-slate-400">
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
                              const value = row["training_course"];
                              const strVal = value == null || typeof value === "object" ? "" : String(value);
                              const displayVal = resolveCodeLabel(strVal, "TRAININGCOURSE", "text", groups, t);
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
                              const value = row["training_type"];
                              const strVal = value == null || typeof value === "object" ? "" : String(value);
                              const displayVal = resolveCodeLabel(strVal, "TRAININGTYPE", "text", groups, t);
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
                              const value = row["_fetchedRel8.product_category"];
                              if (Array.isArray(value)) {
                                const relFormatted = formatFetchedRelValue(
                                  value as unknown[],
                                  row,
                                  8,
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
                            style={{ textAlign: "center", width: "151px" }}
                          >
                            {(() => {
                              const value = row["_fetchedRel8.title"];
                              if (Array.isArray(value)) {
                                const relFormatted = formatFetchedRelValue(
                                  value as unknown[],
                                  row,
                                  8,
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
                              const multiFormatted = formatFetchedRelMulti(
                                row,
                                [11, 32],
                                "product.product_name",
                                "ONE_LINE"
                              );
                              if (!multiFormatted) return <span className="text-sm text-slate-400">-</span>;
                              return (
                                <span className="text-sm text-slate-700 truncate block" title={multiFormatted}>
                                  {multiFormatted}
                                </span>
                              );
                            })()}
                          </td>
                          <td
                            className="px-4 py-3 max-w-[200px] overflow-hidden"
                            style={{ textAlign: "center", width: "150px" }}
                          >
                            {(() => {
                              const value = row["register_period_to"];
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
                              const value = row["training_date_from"];
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
                              const value = row["training_date_to"];
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
                            style={{ textAlign: "center", width: "100px" }}
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
                            style={{ textAlign: "center", width: "50px" }}
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
                            style={{ textAlign: "center", width: "120px" }}
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
                              <button
                                type="button"
                                onClick={() => handleTableCopyTable1(row)}
                                className="p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                title={t("common.btn.copy")}
                              >
                                <CopyPlus className="w-3.5 h-3.5" />
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
    </PageLayout>
  );
}
