"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import {
  WidgetRenderer,
  RendererContainer,
  FieldRenderer,
} from "@/app/admin/templates/make/_shared/components/renderer";
import type { SearchWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { validateSearchDateRange } from "@/app/admin/templates/make/_shared/utils";
import { useI18n } from "@/hooks/use-i18n";
import api from "@/lib/api";
import { useCodeStore } from "@/store/use-code-store";
import type { CodeGroupDef } from "@/app/admin/templates/make/_shared/types";
import { CircleCountCard } from "./CircleCountCard";

const ERROR_PAGE_SIZE = 10;

interface DashboardErrorLogItem {
  id: number;
  createdAt: string;
  httpStatus: string;
  errorCode: string;
  message: string;
}

interface ErrorLogApiItem {
  id: number;
  errorCode: string | null;
  httpStatus: number;
  message: string | null;
  createdAt: string;
}

interface ErrorLogPageResponse {
  content: ErrorLogApiItem[];
  totalElements: number;
  totalPages: number;
}

interface TrainingCourseCounts {
  total: number;
  engineering: number;
  service: number;
  sales: number;
}

interface TrainingSummaryResponse {
  regular: TrainingCourseCounts;
  irregular: TrainingCourseCounts;
}

const EMPTY_COUNTS: TrainingCourseCounts = { total: 0, engineering: 0, service: 0, sales: 0 };

const TRAINING_TYPE_FIELD: SearchFieldConfig = {
  id: "trainingType",
  type: "select",
  label: "",
  colSpan: 1,
  placeholder: "전체",
  codeGroupCode: "TRAININGTYPE",
  options: ["In-Person:001", "Virtual:002"],
};

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getDefaultSearch(): Record<string, string> {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return {
    dateRange_from: formatDateInput(oneMonthAgo),
    dateRange_to: formatDateInput(today),
  };
}

function toStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00+09:00`;
}
function toEndIso(dateStr: string): string {
  return `${dateStr}T23:59:59+09:00`;
}

function buildDeepLinkQuery(dateFrom: string, dateTo: string, extra: Record<string, string>): string {
  const params = new URLSearchParams();
  if (dateFrom) params.set("dateFrom", dateFrom);
  if (dateTo) params.set("dateTo", dateTo);
  Object.entries(extra).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

interface TrainingSummarySectionProps {
  title: string;
  href: string;
  totalLabel: string;
  counts: TrainingCourseCounts;
  loading: boolean;
  trainingType: string;
  onTrainingTypeChange: (v: string) => void;
  codeGroups: CodeGroupDef[];
}

function TrainingSummarySection({
  title,
  href,
  totalLabel,
  counts,
  loading,
  trainingType,
  onTrainingTypeChange,
  codeGroups,
}: TrainingSummarySectionProps) {
  return (
    <RendererContainer bgColor="#ffffff">
      <div className="h-full w-full flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between flex-shrink-0">
          <Link href={href} className="flex items-center gap-1.5 group">
            <h2 className="text-sm font-bold text-slate-900">{title}</h2>
            <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
          </Link>
          <div className="w-48">
            <FieldRenderer
              mode="live"
              field={TRAINING_TYPE_FIELD}
              value={trainingType}
              onChange={onTrainingTypeChange}
              codeGroups={codeGroups}
            />
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center gap-10">
            <CircleCountCard label={totalLabel} count={counts.total} emphasis />
            <CircleCountCard label="Engineering Training" count={counts.engineering} />
            <CircleCountCard label="Service Training" count={counts.service} />
            <CircleCountCard label="Sales Training" count={counts.sales} />
          </div>
        )}
      </div>
    </RendererContainer>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const [searchValues, setSearchValues] = useState<Record<string, string>>(() => getDefaultSearch());
  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(() => getDefaultSearch());

  const [regularTrainingType, setRegularTrainingType] = useState("");
  const [irregularTrainingType, setIrregularTrainingType] = useState("");

  const [regularCounts, setRegularCounts] = useState<TrainingCourseCounts>(EMPTY_COUNTS);
  const [irregularCounts, setIrregularCounts] = useState<TrainingCourseCounts>(EMPTY_COUNTS);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const [errorItems, setErrorItems] = useState<DashboardErrorLogItem[]>([]);
  const [errorTotalElements, setErrorTotalElements] = useState(0);
  const [errorTotalPages, setErrorTotalPages] = useState(0);
  const [errorCurrentPage, setErrorCurrentPage] = useState(0);
  const [errorLoading, setErrorLoading] = useState(false);

  const fetchSummary = useCallback(
    async (search: Record<string, string>, regularType: string, irregularType: string) => {
      setSummaryLoading(true);
      try {
        const startDate = search.dateRange_from ? toStartIso(search.dateRange_from) : undefined;
        const endDate = search.dateRange_to ? toEndIso(search.dateRange_to) : undefined;

        const params: Record<string, string> = {};
        if (regularType) params.regularTrainingType = regularType;
        if (irregularType) params.irregularTrainingType = irregularType;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const res = await api.get<TrainingSummaryResponse>("/training-applications/summary", { params });
        setRegularCounts(res.data.regular);
        setIrregularCounts(res.data.irregular);
      } finally {
        setSummaryLoading(false);
      }
    },
    []
  );

  const fetchErrorLog = useCallback(async (page: number, search: Record<string, string>) => {
    setErrorLoading(true);
    try {
      const params: Record<string, string> = {
        page: String(page),
        size: String(ERROR_PAGE_SIZE),
        sort: "createdAt,desc",
      };
      if (search.dateRange_from) params.startDate = toStartIso(search.dateRange_from);
      if (search.dateRange_to) params.endDate = toEndIso(search.dateRange_to);

      const res = await api.get<ErrorLogPageResponse>("/error-logs", { params });
      setErrorItems(
        res.data.content.map((item) => ({
          id: item.id,
          createdAt: item.createdAt ? item.createdAt.slice(0, 19).replace("T", " ") : "-",
          httpStatus: String(item.httpStatus),
          errorCode: item.errorCode ?? "-",
          message: item.message ?? "-",
        }))
      );
      setErrorTotalElements(res.data.totalElements);
      const safePages =
        res.data.totalPages > 0 ? res.data.totalPages : Math.ceil((res.data.totalElements ?? 0) / ERROR_PAGE_SIZE) || 1;
      setErrorTotalPages(safePages);
      setErrorCurrentPage(page);
    } finally {
      setErrorLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSummary(appliedSearch, regularTrainingType, irregularTrainingType);
  }, [appliedSearch, regularTrainingType, irregularTrainingType, fetchSummary]);

  useEffect(() => {
    fetchErrorLog(0, appliedSearch);
  }, [appliedSearch, fetchErrorLog]);

  const SEARCH_WIDGET: SearchWidget = useMemo(
    () => ({
      type: "search",
      widgetId: "dashboard-date-search",
      contentKey: "dashboardDateSearch",
      displayStyle: "standard",
      rows: [
        {
          id: "r1",
          cols: 5,
          fields: [
            {
              id: "dateRange",
              type: "dateRange",
              label: "",
              labelMsgKey: "common.label.startDate",
              label2: "",
              label2MsgKey: "common.label.endDate",
              fieldKey: "startDate",
              fieldKey2: "endDate",
              colSpan: 2,
              maxRangeUnit: "month",
              maxRangeValue: 1,
            },
          ],
        },
      ],
    }),
    []
  );

  const searchFields = useMemo<SearchFieldConfig[]>(
    () => SEARCH_WIDGET.rows.flatMap((row) => row.fields),
    [SEARCH_WIDGET]
  );

  const handleSearchChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    if (!validateSearchDateRange(searchFields, searchValues, t)) return;
    setAppliedSearch(searchValues);
  }, [searchFields, searchValues, t]);

  const handleReset = useCallback(() => {
    const defaults = getDefaultSearch();
    setSearchValues(defaults);
    setAppliedSearch(defaults);
  }, []);

  const ERROR_TABLE_WIDGET: TableWidget = useMemo(
    () => ({
      type: "table",
      widgetId: "dashboard-error-log-table",
      contentKey: "dashboardErrorLogList",
      displayMode: "pagination",
      pageSize: ERROR_PAGE_SIZE,
      connectedSearchIds: [],
      columns: [
        {
          id: "c1",
          header: "발생일시",
          accessor: "createdAt",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 160,
        },
        {
          id: "c2",
          header: "상태코드",
          accessor: "httpStatus",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 100,
        },
        {
          id: "c3",
          header: "에러코드",
          accessor: "errorCode",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 160,
        },
        {
          id: "c4",
          header: "메시지",
          accessor: "message",
          cellType: "text",
          align: "left",
          sortable: false,
        },
      ],
    }),
    []
  );

  const goErrorLogDetail = useCallback(
    (id: number) => {
      router.push(`/admin/logs/error/${id}`);
    },
    [router]
  );

  const handleErrorRowClick = useCallback(
    (row: Record<string, unknown>) => {
      const id = row._id as number;
      if (id) goErrorLogDetail(id);
    },
    [goErrorLogDetail]
  );

  const errorTableData = useMemo(
    () =>
      errorItems.map((item) => ({
        _id: item.id,
        createdAt: item.createdAt,
        httpStatus: item.httpStatus,
        errorCode: item.errorCode,
        message: item.message,
      })) as unknown as Record<string, unknown>[],
    [errorItems]
  );

  const handleErrorPageChange = useCallback(
    (page: number) => {
      fetchErrorLog(page, appliedSearch);
    },
    [fetchErrorLog, appliedSearch]
  );

  const trainingHref = useCallback(
    (scheduleType: string, trainingType: string) => {
      const qs = buildDeepLinkQuery(appliedSearch.dateRange_from, appliedSearch.dateRange_to, {
        scheduleType,
        trainingType,
      });
      return `/admin/manage/training-request?${qs}`;
    },
    [appliedSearch]
  );

  const errorLogHref = useMemo(() => {
    const qs = buildDeepLinkQuery(appliedSearch.dateRange_from, appliedSearch.dateRange_to, {});
    return `/admin/logs/error?${qs}`;
  }, [appliedSearch]);

  return (
    <PageLayout title="대시보드" mode="live">
      <GridCell colSpan={12} rowSpan={2}>
        <WidgetRenderer
          mode="live"
          widget={SEARCH_WIDGET}
          contentColSpan={12}
          searchValues={searchValues}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
          onReset={handleReset}
        />
      </GridCell>

      <GridCell colSpan={6} rowSpan={4}>
        <TrainingSummarySection
          title="정기 Training 신청 내역"
          href={trainingHref("01", regularTrainingType)}
          totalLabel="전체"
          counts={regularCounts}
          loading={summaryLoading}
          trainingType={regularTrainingType}
          onTrainingTypeChange={setRegularTrainingType}
          codeGroups={codeGroups}
        />
      </GridCell>

      <GridCell colSpan={6} rowSpan={4}>
        <TrainingSummarySection
          title="비정기 Training 신청 내역"
          href={trainingHref("02", irregularTrainingType)}
          totalLabel="전체"
          counts={irregularCounts}
          loading={summaryLoading}
          trainingType={irregularTrainingType}
          onTrainingTypeChange={setIrregularTrainingType}
          codeGroups={codeGroups}
        />
      </GridCell>

      <GridCell colSpan={12} rowSpan={6}>
        <RendererContainer bgColor="#ffffff">
          <div className="h-full w-full flex flex-col gap-3 p-5">
            <Link href={errorLogHref} className="flex items-center gap-1.5 group flex-shrink-0">
              <h2 className="text-sm font-bold text-slate-900">에러 로그 현황</h2>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
            </Link>
            <div className="flex-1 min-h-0">
              <WidgetRenderer
                mode="live"
                widget={ERROR_TABLE_WIDGET}
                contentColSpan={12}
                tableData={errorTableData}
                tableLoading={errorLoading}
                totalElements={errorTotalElements}
                totalPages={errorTotalPages}
                currentPage={errorCurrentPage}
                onPageChange={handleErrorPageChange}
                onRowClick={handleErrorRowClick}
              />
            </div>
          </div>
        </RendererContainer>
      </GridCell>
    </PageLayout>
  );
}
