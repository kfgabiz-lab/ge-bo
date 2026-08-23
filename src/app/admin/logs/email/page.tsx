"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SearchWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { TableWidget } from "@/app/admin/templates/make/_shared/components/builder/TableBuilder";
import type { TableActionHandlers } from "@/app/admin/templates/make/_shared/components/renderer/types";
import { useCodeStore } from "@/store/use-code-store";
import api from "@/lib/api";

/* ── 이메일 발송 이력 단건 타입 ── */
interface EmailSendHisItem {
  id: number;
  emailSendType: string | null;
  emailSendDetailType: string | null;
  recipientEmail: string | null;
  sendStatus: string | null;
  sentAt: string; // OffsetDateTime ISO 문자열
  lastResendAt: string | null;
}

/* ── Spring Page 응답 타입 ── */
interface PageResponse {
  content: EmailSendHisItem[];
  totalElements: number;
  totalPages: number;
  number: number;
}

/* ── 상수 ── */
const PAGE_SIZE = 20;

/* ──────────────────────────────────────────────
   날짜 문자열 → ISO OffsetDateTime 변환 유틸
   입력: YYYY-MM-DD
   출력: YYYY-MM-DDTHH:mm:ss+09:00
────────────────────────────────────────────── */
function toStartIso(dateStr: string): string {
  return `${dateStr}T00:00:00+09:00`;
}
function toEndIso(dateStr: string): string {
  return `${dateStr}T23:59:59+09:00`;
}

export default function EmailSendHisPage() {
  const router = useRouter();
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  const [items, setItems] = useState<EmailSendHisItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(false);

  const [searchValues, setSearchValues] = useState<Record<string, string>>({
    f1: "", // 분류(EMAILSENDTYPE)
    f2: "", // 상세분류(TRAININGCOURSE)
    f3: "", // 발송상태(SENDSTATUS)
    f4: "", // 수신 이메일
    f5_from: "", // 발송일시 시작
    f5_to: "", // 발송일시 종료
  });

  const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({
    f1: "",
    f2: "",
    f3: "",
    f4: "",
    f5_from: "",
    f5_to: "",
  });

  /* 공통코드 로딩 (분류/상세분류/발송상태 select 및 라벨 표시용) */
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const fetchList = useCallback(
    async (page = 0, search = appliedSearch) => {
      setLoading(true);
      try {
        const params: Record<string, string> = {
          page: String(page),
          size: String(PAGE_SIZE),
          sort: "createdAt,desc",
        };
        if (search.f1) params.emailSendType = search.f1;
        if (search.f2) params.emailSendDetailType = search.f2;
        if (search.f3) params.sendStatus = search.f3;
        if (search.f4) params.recipientEmail = search.f4;
        if (search.f5_from) params.startDate = toStartIso(search.f5_from);
        if (search.f5_to) params.endDate = toEndIso(search.f5_to);

        const res = await api.get<PageResponse>("/email-send-his", { params });
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
    [appliedSearch]
  );

  useEffect(() => {
    fetchList(0, { f1: "", f2: "", f3: "", f4: "", f5_from: "", f5_to: "" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goDetail = useCallback(
    (id: number) => {
      router.push(`/admin/logs/email/${id}`);
    },
    [router]
  );

  const SEARCH_WIDGET: SearchWidget = useMemo(
    () => ({
      type: "search",
      widgetId: "email-send-his-search",
      contentKey: "emailSendHisSearch",
      displayStyle: "standard",
      rows: [
        {
          id: "r1",
          cols: 5,
          fields: [
            {
              id: "f1",
              type: "select",
              label: "분류",
              labelMsgKey: "email.label.emailSendType",
              fieldKey: "emailSendCategory",
              colSpan: 1,
              options: ["뉴스레터 신청:01", "정기 Training:02", "비정기 Training:03"],
              codeGroupCode: "EMAILSENDTYPE",
            },
            {
              id: "f2",
              type: "select",
              label: "상세분류",
              labelMsgKey: "email.label.subcategory",
              colSpan: 1,
              options: ["Engineering Training 신청:01", "Service Training 신청:02", "Sales Training:03"],
              codeGroupCode: "TRAININGCOURSE",
              /* 분류 선택 전까지 비활성화 (기획서 반영) */
              disableCondition: "emailSendCategory=''",
            },
            {
              id: "f3",
              type: "select",
              label: "발송상태",
              labelMsgKey: "email.label.deliveryStatus",
              colSpan: 1,
              options: ["성공:S", "실패:F"],
              codeGroupCode: "SENDSTATUS",
            },
            {
              id: "f4",
              type: "input",
              label: "수신 Email",
              labelMsgKey: "email.label.recipientEmail",
              colSpan: 1,
              placeholder: "수신 Email을 입력하세요.",
              placeholderMsgKey: "email.placeholder.searchEmailMessage",
            },
            {
              id: "f5",
              type: "dateRange",
              label: "발송일",
              labelMsgKey: "email.label.sentDate",
              label2: "종료일",
              label2MsgKey: "common.label.endDate",
              colSpan: 1,
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
      widgetId: "email-send-his-table",
      contentKey: "emailSendHisList",
      displayMode: "pagination",
      pageSize: PAGE_SIZE,
      connectedSearchIds: ["email-send-his-search"],
      connectedSlug: "",
      columns: [
        {
          id: "c1",
          header: "분류",
          headerMsgKey: "email.label.emailSendType",
          accessor: "emailSendType",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 14,
          widthUnit: "%",
          codeGroupCode: "EMAILSENDTYPE",
        },
        {
          id: "c2",
          header: "상세분류",
          headerMsgKey: "email.label.subcategory",
          accessor: "emailSendDetailType",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 14,
          widthUnit: "%",
          codeGroupCode: "TRAININGCOURSE",
        },
        {
          id: "c3",
          header: "수신 Email",
          headerMsgKey: "email.label.recipientEmail",
          accessor: "recipientEmail",
          cellType: "text",
          align: "left",
          sortable: false,
          width: 15,
          widthUnit: "%",
        },
        {
          id: "c4",
          header: "발송상태",
          headerMsgKey: "email.label.deliveryStatus",
          accessor: "sendStatus",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 14,
          widthUnit: "%",
          codeGroupCode: "SENDSTATUS",
        },
        {
          id: "c5",
          header: "발송일시",
          headerMsgKey: "email.label.sentAt",
          accessor: "sentAt",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 14,
          widthUnit: "%",
        },
        {
          id: "c6",
          header: "최근재발송일시",
          headerMsgKey: "email.label.lastResentAt",
          accessor: "lastResendAt",
          cellType: "text",
          align: "center",
          sortable: false,
          width: 15,
          widthUnit: "%",
        },
        {
          id: "c7",
          header: "상세",
          headerMsgKey: "common.btn.detail",
          accessor: "_actions",
          cellType: "actions",
          align: "center",
          sortable: false,
          actions: ["edit"],
          width: 14,
          widthUnit: "%",
        },
      ],
    }),
    []
  );

  const handleSearchChange = useCallback((fieldId: string, value: string) => {
    setSearchValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const handleSearch = useCallback(() => {
    const nextSearch = { ...searchValues };
    setAppliedSearch(nextSearch);
    fetchList(0, nextSearch);
  }, [searchValues, fetchList]);

  const handleReset = useCallback(() => {
    const empty = { f1: "", f2: "", f3: "", f4: "", f5_from: "", f5_to: "" };
    setSearchValues(empty);
    setAppliedSearch(empty);
    fetchList(0, empty);
  }, [fetchList]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchList(page, appliedSearch);
    },
    [fetchList, appliedSearch]
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
        emailSendType: item.emailSendType ?? "-",
        emailSendDetailType: item.emailSendDetailType ?? "-",
        recipientEmail: item.recipientEmail ?? "-",
        sendStatus: item.sendStatus ?? "-",
        sentAt: item.sentAt ? item.sentAt.slice(0, 19).replace("T", " ") : "-",
        lastResendAt: item.lastResendAt ? item.lastResendAt.slice(0, 19).replace("T", " ") : "-",
      })) as unknown as Record<string, unknown>[],
    [items]
  );

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={2}>
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
          codeGroups={codeGroups}
        />
      </GridCell>
    </PageLayout>
  );
}
