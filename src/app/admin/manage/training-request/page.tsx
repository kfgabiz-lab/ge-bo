"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SearchWidget, SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { TableActionHandlers } from "@/app/admin/templates/make/_shared/components/renderer/types";
import { isDateRangeWithinMaxLimit } from "@/app/admin/templates/make/_shared/utils";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { useI18n } from "@/hooks/use-i18n";
import { useCodeStore } from "@/store/use-code-store";
import { toast } from "sonner";
import api from "@/lib/api";

interface TrainingApplicationItem {
  rowKey: string;
  id: number;
  scheduleType: string;
  trainingCourse: string | null;
  trainingType: string | null;
  curriculumTitle: string | null;
  sessionTitle: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  createdAt: string;
  email: string;
  applicant: string;
}

interface PageResponse {
  content: TrainingApplicationItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

const PAGE_SIZE = 10;
const LIST_API_PATH = "training-applications";
const CSV_CONNECTED_SLUG = "training-applications";

function toStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00+09:00`;
}
function toEndIso(dateStr: string): string {
  return `${dateStr}T23:59:59+09:00`;
}
function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const PERIOD_FIELD_BY_TYPE: Record<string, string> = {
  "01": "createdRange",
  "02": "scheduleStartRange",
  "03": "scheduleEndRange",
};

function resolvePeriodRange(search: Record<string, string>) {
  const periodType = search.periodType || "01";
  const fieldId = PERIOD_FIELD_BY_TYPE[periodType] ?? "createdRange";
  return {
    periodType,
    from: search[`${fieldId}_from`],
    to: search[`${fieldId}_to`],
  };
}

const EMPTY_SEARCH: Record<string, string> = {
  periodType: "01",
  createdRange_from: "",
  createdRange_to: "",
  scheduleStartRange_from: "",
  scheduleStartRange_to: "",
  scheduleEndRange_from: "",
  scheduleEndRange_to: "",
  trainingScheduleType: "",
  trainingFormat: "",
  trainingCourse: "",
  curriculumTitle: "",
  sessionTitle: "",
};

function getDefaultSearch(): Record<string, string> {
  const today = new Date();
  const oneMonthAgo = new Date(today);
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
  return {
    ...EMPTY_SEARCH,
    createdRange_from: formatDateInput(oneMonthAgo),
    createdRange_to: formatDateInput(today),
  };
}

export default function TrainingRequestListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  const [items, setItems] = useState<TrainingApplicationItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const buildInitialSearch = (): Record<string, string> => {
    const defaults = getDefaultSearch();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const scheduleType = searchParams.get("scheduleType");
    const trainingType = searchParams.get("trainingType");
    return {
      ...defaults,
      createdRange_from: dateFrom || defaults.createdRange_from,
      createdRange_to: dateTo || defaults.createdRange_to,
      trainingScheduleType: scheduleType || defaults.trainingScheduleType,
      trainingFormat: trainingType || defaults.trainingFormat,
    };
  };

  const [searchValues, setSearchValues] = useState<Record<string, string>>(buildInitialSearch);
  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(buildInitialSearch);

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | undefined>(undefined);

  /* 공통코드 로딩 (검색 select의 codeGroupCode 연동용) */
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const lastDateRangeRef = useRef<{ from: string; to: string } | null>(null);
  const prevPeriodTypeRef = useRef(searchValues.periodType);

  useEffect(() => {
    const activeFieldId = PERIOD_FIELD_BY_TYPE[searchValues.periodType] ?? "createdRange";
    const from = searchValues[`${activeFieldId}_from`];
    const to = searchValues[`${activeFieldId}_to`];
    if (from && to) {
      lastDateRangeRef.current = { from, to };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searchValues.createdRange_from,
    searchValues.createdRange_to,
    searchValues.scheduleStartRange_from,
    searchValues.scheduleStartRange_to,
    searchValues.scheduleEndRange_from,
    searchValues.scheduleEndRange_to,
  ]);

  useEffect(() => {
    const prevType = prevPeriodTypeRef.current;
    const currType = searchValues.periodType;
    prevPeriodTypeRef.current = currType;

    if (prevType === currType || !lastDateRangeRef.current) return;

    const activeFieldId = PERIOD_FIELD_BY_TYPE[currType] ?? "createdRange";
    const restore = lastDateRangeRef.current;
    setSearchValues((sv) => ({
      ...sv,
      [`${activeFieldId}_from`]: restore.from,
      [`${activeFieldId}_to`]: restore.to,
    }));
  }, [searchValues.periodType]);

  /* 검색값 → 실제 API 쿼리 파라미터 변환 (검색기간구분에 따라 해당 dateRange만 반영) */
  const buildApiParams = useCallback((search: Record<string, string>, sk: string | null, sd?: "asc" | "desc") => {
    const params: Record<string, string> = {
      sort: sk && sd ? `${sk},${sd}` : "createdAt,desc",
    };
    if (search.trainingScheduleType) params.trainingScheduleType = search.trainingScheduleType;
    if (search.trainingFormat) params.trainingType = search.trainingFormat;
    if (search.trainingCourse) params.trainingCourse = search.trainingCourse;
    if (search.curriculumTitle) params.curriculumTitle = search.curriculumTitle;
    if (search.sessionTitle) params.sessionTitle = search.sessionTitle;

    const { periodType, from, to } = resolvePeriodRange(search);
    params.searchPeriodType = periodType;
    if (from) params.startDate = toStartIso(from);
    if (to) params.endDate = toEndIso(to);

    return params;
  }, []);

  const fetchList = useCallback(
    async (page = 0, search = appliedSearch, sk = sortKey, sd = sortDir) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          ...buildApiParams(search, sk, sd),
          page: String(page),
          size: String(PAGE_SIZE),
        };

        const res = await api.get<PageResponse>(`/${LIST_API_PATH}`, { params });
        setItems(res.data.content);
        setTotalElements(res.data.totalElements);
        const safePages =
          res.data.totalPages > 0 ? res.data.totalPages : Math.ceil((res.data.totalElements ?? 0) / PAGE_SIZE) || 1;
        setTotalPages(safePages);
        setCurrentPage(page);
      } finally {
        setLoading(false);
      }
    },
    [appliedSearch, sortKey, sortDir, buildApiParams]
  );

  useEffect(() => {
    fetchList(0, appliedSearch, null, undefined);
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goDetail = useCallback(
    (id: number, scheduleType: string) => {
      router.push(`/admin/manage/training-request/${id}?type=${scheduleType}`);
    },
    [router]
  );

  const SEARCH_WIDGET: SearchWidget = useMemo(
    () => ({
      type: "search",
      widgetId: "training-request-search",
      contentKey: "trainingRequestSearch",
      displayStyle: "standard",
      rows: [
        {
          id: "r1",
          cols: 4,
          fields: [
            {
              id: "periodType",
              type: "select",
              label: "",
              labelMsgKey: "",
              fieldKey: "searchPeriodType",
              colSpan: 1,
              options: ["신청 일시:01", "시작일:02", "종료일:03"],
              codeGroupCode: "SEARCHPERIODTYPE",
              defaultOptionValue: "01",
            },
            {
              id: "createdRange",
              type: "dateRange",
              label: "",
              labelMsgKey: "",
              label2: "",
              label2MsgKey: "",
              fieldKey: "createdFrom",
              fieldKey2: "createdTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=01",
              maxRangeUnit: "month",
              maxRangeValue: 1,
            },
            {
              id: "scheduleStartRange",
              type: "dateRange",
              label: "",
              labelMsgKey: "",
              label2: "",
              label2MsgKey: "",
              fieldKey: "scheduleStartFrom",
              fieldKey2: "scheduleStartTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=02",
              maxRangeUnit: "month",
              maxRangeValue: 1,
            },
            {
              id: "scheduleEndRange",
              type: "dateRange",
              label: "",
              labelMsgKey: "",
              label2: "",
              label2MsgKey: "",
              fieldKey: "scheduleEndFrom",
              fieldKey2: "scheduleEndTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=03",
              maxRangeUnit: "month",
              maxRangeValue: 1,
            },
          ],
        },
        {
          id: "r2",
          cols: 4,
          fields: [
            {
              id: "trainingScheduleType",
              type: "select",
              label: "",
              labelMsgKey: "",
              fieldKey: "trainingScheduleType",
              colSpan: 1,
              placeholder: "",
              placeholderMsgKey: "training.label.category",
              options: ["정기 Training:01", "비정기 Training:02"],
              codeGroupCode: "TRAININGSCHEDULETYPE",
            },
            {
              id: "trainingFormat",
              type: "select",
              label: "",
              labelMsgKey: "",
              fieldKey: "trainingFormat",
              colSpan: 1,
              placeholder: "",
              placeholderMsgKey: "common.label.trainingType",
              options: ["In-Person:001", "Virtual:002"],
              codeGroupCode: "TRAININGTYPE",
            },
            {
              id: "trainingCourse",
              type: "select",
              label: "",
              labelMsgKey: "",
              fieldKey: "trainingCourse",
              colSpan: 1,
              placeholder: "",
              placeholderMsgKey: "common.label.training",
              options: ["Engineering Training:01", "Service Training:02", "Sales Training:03"],
              codeGroupCode: "TRAININGCOURSE",
            },
          ],
        },
        {
          id: "r3",
          cols: 5,
          fields: [
            {
              id: "curriculumTitle",
              type: "input",
              label: "",
              labelMsgKey: "",
              fieldKey: "curriculumTitle",
              colSpan: 2,
              placeholder: "",
              placeholderMsgKey: "course.placeholder.search",
            },
            {
              id: "sessionTitle",
              type: "input",
              label: "",
              labelMsgKey: "",
              fieldKey: "sessionTitle",
              colSpan: 2,
              placeholder: "",
              placeholderMsgKey: "common.placeholder.title",
            },
          ],
        },
      ],
    }),
    []
  );

  const TABLE_WIDGET: TableWidget = useMemo(
    () => ({
      type: "table",
      widgetId: "training-request-table",
      contentKey: "trainingRequestList",
      displayMode: "pagination",
      pageSize: PAGE_SIZE,
      connectedSearchIds: ["training-request-search"],
      connectedSlug: CSV_CONNECTED_SLUG,
      columns: [
        {
          id: "c1",
          header: "",
          headerMsgKey: "training.label.category",
          accessor: "scheduleType",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
          codeGroupCode: "TRAININGSCHEDULETYPE",
        },
        {
          id: "c2",
          header: "",
          headerMsgKey: "common.label.trainingType",
          accessor: "trainingType",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
          codeGroupCode: "TRAININGTYPE",
        },
        {
          id: "c3",
          header: "",
          headerMsgKey: "common.label.training",
          accessor: "trainingCourse",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
          codeGroupCode: "TRAININGCOURSE",
        },
        {
          id: "c4",
          header: "",
          headerMsgKey: "training.label.course",
          accessor: "curriculumTitle",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
        },
        {
          id: "c5",
          header: "",
          headerMsgKey: "common.label.title",
          accessor: "sessionTitle",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
        },
        {
          id: "c6",
          header: "",
          headerMsgKey: "common.label.startDate",
          accessor: "dateFrom",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
        },
        {
          id: "c7",
          header: "",
          headerMsgKey: "common.label.endDate",
          accessor: "dateTo",
          cellType: "text",
          align: "left",
          sortable: true,
          width: 150,
        },
        {
          id: "c8",
          header: "",
          headerMsgKey: "common.label.applicationDatetime",
          accessor: "createdAt",
          cellType: "date",
          align: "left",
          sortable: true,
          width: 150,
          dateFormat: "YYYY-MM-DD HH:mm",
        },
        {
          id: "c9",
          header: "",
          headerMsgKey: "common.label.sendTarget",
          accessor: "email",
          cellType: "text",
          align: "left",
          sortable: true,
          width: 150,
          maskType: "custom",
          maskCustomRegex: "(?<=.{2}).(?=[^@]*@)",
          maskCustomReplacement: "*",
        },
        {
          id: "c10",
          header: "",
          headerMsgKey: "common.label.applicant",
          accessor: "applicant",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
          maskType: "name",
          maskPattern: "mid",
        },
        {
          id: "c11",
          header: "액션",
          headerMsgKey: "common.label.action",
          accessor: "_actions",
          cellType: "actions",
          align: "center",
          sortable: false,
          actions: ["edit"],
          width: 120,
        },
      ],
    }),
    []
  );

  /* CSV 다운로드 버튼 — connType:'excel'이 WidgetRenderer 내부 doExcelDownload로 자동 처리됨
       ⚠️ space 위젯의 align은 PageGridRenderer(빌더 템플릿 경로)에서 getSpaceGridColumn으로만 적용된다.
       이 화면처럼 GridCell을 직접 쓰는 코드형 페이지는 GridCell colStart로 열 위치를 지정해야 우측 정렬된다. */
  const CSV_SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "training-request-csv",
      items: [
        {
          id: "s1",
          type: "action-button",
          label: "CSV Download",
          colSpan: 2,
          color: "black",
          textColor: "white",
          connType: "excel",
          excelTableWidgetId: "training-request-table",
          excelPrivacyPopup: true,
        },
      ],
      align: "right",
      showBorder: false,
    }),
    []
  );

  const handleSearchChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const searchFields = useMemo<SearchFieldConfig[]>(
    () => SEARCH_WIDGET.rows.flatMap((row) => row.fields),
    [SEARCH_WIDGET]
  );

  const handleSearch = useCallback(() => {
    const nextSearch = { ...searchValues };

    const { from, to } = resolvePeriodRange(nextSearch);
    const activeFieldId = PERIOD_FIELD_BY_TYPE[nextSearch.periodType || "01"] ?? "createdRange";
    const activeField = searchFields.find((f) => f.id === activeFieldId);
    if (
      from &&
      to &&
      activeField?.maxRangeValue &&
      !isDateRangeWithinMaxLimit(from, to, activeField.maxRangeValue, activeField.maxRangeUnit)
    ) {
      toast.warning(t("common.validation.date_range_one_month"));
      return;
    }

    setAppliedSearch(nextSearch);
    fetchList(0, nextSearch, sortKey, sortDir);
  }, [searchValues, searchFields, t, sortKey, sortDir, fetchList]);

  const handleReset = useCallback(() => {
    const defaults = getDefaultSearch();
    setSearchValues(defaults);
    setAppliedSearch(defaults);
    setSortKey(null);
    setSortDir(undefined);
    fetchList(0, defaults, null, undefined);
  }, [fetchList]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchList(page, appliedSearch, sortKey, sortDir);
    },
    [fetchList, appliedSearch, sortKey, sortDir]
  );

  const handleSort = useCallback(
    (accessor: string, dir: "asc" | "desc" | null) => {
      const nextKey = dir ? accessor : null;
      const nextDir = dir ?? undefined;
      setSortKey(nextKey);
      setSortDir(nextDir);
      fetchList(0, appliedSearch, nextKey, nextDir);
    },
    [appliedSearch, fetchList]
  );

  const handlers: TableActionHandlers = useMemo(
    () => ({
      onEdit: (row) => {
        const id = row._numericId as number;
        const scheduleType = row._scheduleType as string;
        if (id) goDetail(id, scheduleType);
      },
    }),
    [goDetail]
  );

  const tableData = useMemo(
    () =>
      items.map((item) => ({
        _id: item.rowKey,
        _numericId: item.id,
        _scheduleType: item.scheduleType,
        scheduleType: item.scheduleType,
        createdAt: item.createdAt,
        applicant: item.applicant,
        email: item.email,
        trainingCourse: item.trainingCourse ?? "-",
        trainingType: item.trainingType ?? "-",
        curriculumTitle: item.curriculumTitle || "-",
        sessionTitle: item.sessionTitle || "-",
        dateFrom: item.dateFrom || "-",
        dateTo: item.dateTo || "-",
      })) as unknown as Record<string, unknown>[],
    [items]
  );

  const csvSearchParams = useMemo(
    () => buildApiParams(appliedSearch, sortKey, sortDir),
    [appliedSearch, sortKey, sortDir, buildApiParams]
  );
  const tableWidgetsMap = useMemo(() => ({ [TABLE_WIDGET.widgetId]: TABLE_WIDGET }), [TABLE_WIDGET]);

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={4}>
        <WidgetRenderer
          mode="live"
          widget={SEARCH_WIDGET}
          contentColSpan={12}
          searchValues={searchValues}
          onSearchChange={handleSearchChange}
          onSearch={handleSearch}
          onReset={handleReset}
          codeGroups={codeGroups}
        />
      </GridCell>

      <GridCell colSpan={2} rowSpan={1} colStart={11}>
        <WidgetRenderer
          mode="live"
          widget={CSV_SPACE_WIDGET}
          contentColSpan={2}
          codeGroups={codeGroups}
          tableWidgetsMap={tableWidgetsMap}
          currentSearchParams={csvSearchParams}
          isEntity
        />
      </GridCell>

      <GridCell colSpan={12} rowSpan={15}>
        <WidgetRenderer
          mode="live"
          widget={TABLE_WIDGET}
          contentColSpan={12}
          tableData={tableData}
          tableLoading={loading}
          totalElements={totalElements}
          totalPages={totalPages}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          handlers={handlers}
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={handleSort}
          codeGroups={codeGroups}
        />
      </GridCell>
    </PageLayout>
  );
}
