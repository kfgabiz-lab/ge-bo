"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SearchWidget, SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { TableActionHandlers } from "@/app/admin/templates/make/_shared/components/renderer/types";
import { formatIsoDateTime } from "@/app/admin/templates/make/_shared/utils";
import { useCodeStore } from "@/store/use-code-store";
import api from "@/lib/api";

/* ── Training Request(비정기 교육 신청) 목록 단건 타입 ── */
interface TrainingRequestItem {
  id: number;
  trainingTrack: string | null;
  firstName: string;
  lastName: string | null;
  company: string;
  email: string;
  phone: string;
  trainingFormat: string;
  curriculumTitle: string | null;
  sessionTitle: string | null;
  scheduleStart: string | null;
  scheduleEnd: string | null;
  studentCount: string;
  createdAt: string;
}

/* ── Spring Page 응답 타입 ── */
interface PageResponse {
  content: TrainingRequestItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

const PAGE_SIZE = 20;
const ENTITY_SLUG = "training-requests";

function toStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00+09:00`;
}
function toEndIso(dateStr: string): string {
  return `${dateStr}T23:59:59+09:00`;
}

/* 검색기간구분(SEARCHPERIODTYPE) 코드별 dateRange 필드 id */
const PERIOD_FIELD_BY_TYPE: Record<string, string> = {
  "01": "createdRange",
  "02": "scheduleStartRange",
  "03": "scheduleEndRange",
};

/* Training(training_track) 옵션 — FO 신청폼의 트랙 원본 저장값(engineering/sales) 기준.
   별도 공통코드 그룹이 없어 화면 표시 라벨은 이 목록으로 고정한다. */
const TRAINING_TRACK_OPTIONS = ["Engineering:engineering", "Sales:sales"];

/* 목록 셀 표시용 training_track 코드 → 라벨 (검색 select 라벨과 동일 규칙 유지) */
const TRAINING_TRACK_LABELS: Record<string, string> = {
  engineering: "Engineering",
  sales: "Sales",
};

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
  trainingTrack: "",
  curriculumTitle: "",
  sessionTitle: "",
};

export default function TrainingRequestListPage() {
  const router = useRouter();
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  const [items, setItems] = useState<TrainingRequestItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchValues, setSearchValues] = useState<Record<string, string>>({ ...EMPTY_SEARCH });
  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({ ...EMPTY_SEARCH });

  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc" | undefined>(undefined);

  /* 공통코드 로딩 (검색 select의 codeGroupCode 연동용) */
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  /* 검색값 → 실제 API 쿼리 파라미터 변환 (검색기간구분에 따라 해당 dateRange만 반영) */
  const buildApiParams = useCallback((search: Record<string, string>, sk: string | null, sd?: "asc" | "desc") => {
    const params: Record<string, string> = {
      sort: sk && sd ? `${sk},${sd}` : "createdAt,desc",
    };
    if (search.trainingScheduleType) params.trainingScheduleType = search.trainingScheduleType;
    if (search.trainingFormat) params.trainingFormat = search.trainingFormat;
    if (search.trainingTrack) params.trainingTrack = search.trainingTrack;
    if (search.curriculumTitle) params.curriculumTitle = search.curriculumTitle;
    if (search.sessionTitle) params.sessionTitle = search.sessionTitle;

    const periodType = search.periodType || "01";
    const fieldId = PERIOD_FIELD_BY_TYPE[periodType] ?? "createdRange";
    const from = search[`${fieldId}_from`];
    const to = search[`${fieldId}_to`];
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

        const res = await api.get<PageResponse>(`/${ENTITY_SLUG}`, { params });
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
    fetchList(0, EMPTY_SEARCH, null, undefined);
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goDetail = useCallback(
    (id: number) => {
      router.push(`/admin/manage/training-request/${id}`);
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
          cols: 5,
          fields: [
            {
              id: "periodType",
              type: "select",
              label: "검색 기간 구분",
              fieldKey: "searchPeriodType",
              colSpan: 1,
              options: ["신청 일시:01", "희망 시작일:02", "희망 종료일:03"],
              codeGroupCode: "SEARCHPERIODTYPE",
              defaultOptionValue: "01",
            },
            {
              id: "createdRange",
              type: "dateRange",
              label: "시작일",
              label2: "종료일",
              fieldKey: "createdFrom",
              fieldKey2: "createdTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=01",
            },
            {
              id: "scheduleStartRange",
              type: "dateRange",
              label: "시작일",
              label2: "종료일",
              fieldKey: "scheduleStartFrom",
              fieldKey2: "scheduleStartTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=02",
            },
            {
              id: "scheduleEndRange",
              type: "dateRange",
              label: "시작일",
              label2: "종료일",
              fieldKey: "scheduleEndFrom",
              fieldKey2: "scheduleEndTo",
              colSpan: 2,
              hideCondition: "searchPeriodType!=03",
            },
          ],
        },
        {
          id: "r2",
          cols: 5,
          fields: [
            {
              id: "trainingScheduleType",
              type: "select",
              label: "분류",
              fieldKey: "trainingScheduleType",
              colSpan: 1,
              placeholder: "전체",
              options: ["정기 Training:01", "비정기 Training:02"],
              codeGroupCode: "TRAININGSCHEDULETYPE",
            },
            {
              id: "trainingFormat",
              type: "select",
              label: "Training Type",
              fieldKey: "trainingFormat",
              colSpan: 1,
              placeholder: "전체",
              options: ["In-Person:001", "Virtual:002"],
              codeGroupCode: "TRAININGTYPE",
            },
            {
              id: "trainingTrack",
              type: "select",
              label: "Training",
              fieldKey: "trainingTrack",
              colSpan: 1,
              placeholder: "전체",
              options: TRAINING_TRACK_OPTIONS,
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
              label: "Course명",
              fieldKey: "curriculumTitle",
              colSpan: 2,
              placeholder: "Course명을 입력하세요.",
            },
            {
              id: "sessionTitle",
              type: "input",
              label: "제목",
              fieldKey: "sessionTitle",
              colSpan: 2,
              placeholder: "제목을 입력하세요.",
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
      connectedSlug: ENTITY_SLUG,
      columns: [
        {
          id: "c1",
          header: "분류",
          accessor: "trainingScheduleType",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 120,
        },
        {
          id: "c2",
          header: "Training Type",
          accessor: "trainingFormat",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 100,
        },
        {
          id: "c3",
          header: "Training",
          accessor: "trainingTrack",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 110,
        },
        {
          id: "c4",
          header: "Course",
          accessor: "curriculumTitle",
          cellType: "text",
          align: "left",
          sortable: true,
          width: 200,
        },
        {
          id: "c5",
          header: "제목",
          accessor: "sessionTitle",
          cellType: "text",
          align: "left",
          sortable: true,
          width: 170,
        },
        {
          id: "c6",
          header: "시작일",
          accessor: "scheduleStart",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 110,
        },
        {
          id: "c7",
          header: "종료일",
          accessor: "scheduleEnd",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 110,
        },
        {
          id: "c8",
          header: "신청 일시",
          accessor: "createdAt",
          cellType: "text",
          align: "center",
          sortable: true,
          width: 150,
        },
        {
          id: "c9",
          header: "발송 대상",
          accessor: "email",
          cellType: "text",
          align: "left",
          sortable: true,
          width: 180,
          maskType: "custom",
          maskCustomRegex: "(?<=.{2}).(?=[^@]*@)",
          maskCustomReplacement: "*",
        },
        {
          id: "c10",
          header: "신청자",
          accessor: "name",
          cellType: "text",
          align: "left",
          sortable: false,
          width: 110,
          maskType: "name",
          maskPattern: "mid",
        },
        {
          id: "c11",
          header: "액션",
          accessor: "_actions",
          cellType: "actions",
          align: "center",
          sortable: false,
          actions: ["edit"],
          width: 70,
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

  const handleSearch = useCallback(() => {
    const nextSearch = { ...searchValues };
    setAppliedSearch(nextSearch);
    fetchList(0, nextSearch, sortKey, sortDir);
  }, [searchValues, sortKey, sortDir, fetchList]);

  const handleReset = useCallback(() => {
    const empty = { ...EMPTY_SEARCH };
    setSearchValues(empty);
    setAppliedSearch(empty);
    setSortKey(null);
    setSortDir(undefined);
    fetchList(0, empty, null, undefined);
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
        const id = row._id as number;
        if (id) goDetail(id);
      },
    }),
    [goDetail]
  );

  const tableData = useMemo(
    () =>
      items.map((item) => ({
        _id: item.id,
        /* training_request는 항상 비정기 신청만 존재(설계서 4절) — 정기/비정기 select 필터와 동일하게 고정값 표시 */
        trainingScheduleType: "비정기 Training",
        createdAt: formatIsoDateTime(item.createdAt),
        name: [item.firstName, item.lastName].filter(Boolean).join(" "),
        email: item.email,
        trainingTrack: item.trainingTrack ? (TRAINING_TRACK_LABELS[item.trainingTrack] ?? item.trainingTrack) : "-",
        trainingFormat: item.trainingFormat,
        curriculumTitle: item.curriculumTitle || "-",
        sessionTitle: item.sessionTitle || "-",
        scheduleStart: item.scheduleStart || "-",
        scheduleEnd: item.scheduleEnd || "-",
      })) as unknown as Record<string, unknown>[],
    [items]
  );

  const currentSearchParams = useMemo(
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
          currentSearchParams={currentSearchParams}
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
        />
      </GridCell>
    </PageLayout>
  );
}
