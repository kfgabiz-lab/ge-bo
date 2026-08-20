"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import api from "@/lib/api";

/* ── 트랜잭션 로그 상세 타입 ── */
interface TransactionLogDetail {
  id: number;
  actionType: string | null;
  method: string | null;
  requestUrl: string | null;
  requestBody: string | null;
  httpStatus: number;
  loginUser: string | null;
  clientIp: string | null;
  durationMs: number | null;
  createdAt: string;
}

export default function TransactionLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  /* 상세 데이터 로드 */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<TransactionLogDetail>(`/transaction-logs/${id}`);
        const d = res.data;
        setFormValues({
          createdAt: d.createdAt ? d.createdAt.slice(0, 19).replace("T", " ") : "-",
          httpStatus: String(d.httpStatus),
          method: d.method ?? "-",
          actionType: d.actionType ?? "-",
          requestUrl: d.requestUrl ?? "-",
          durationMs: d.durationMs != null ? String(d.durationMs) : "-",
          clientIp: d.clientIp ?? "-",
          loginUser: d.loginUser ?? "-",
          requestBody: d.requestBody ?? "",
        });
      } catch {
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, router]);

  /* 기본 정보 폼 위젯 */
  const INFO_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "transaction-log-info-form",
      contentKey: "transactionLogInfoForm",
      title: "트랜잭션 로그 상세",
      titleMsgKey: "log.label.transactionLogDetail",
      showBorder: true,
      fields: [
        {
          id: "createdAt",
          type: "input",
          label: "발생일시",
          labelMsgKey: "dashboard.label.occurredAt",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "createdAt",
          readonly: true,
        },
        {
          id: "httpStatus",
          type: "input",
          label: "상태코드",
          labelMsgKey: "dashboard.label.statusCode",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "httpStatus",
          readonly: true,
        },
        {
          id: "method",
          type: "input",
          label: "메서드",
          labelMsgKey: "log.label.method",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "method",
          readonly: true,
        },
        {
          id: "actionType",
          type: "input",
          label: "변경유형",
          labelMsgKey: "log.label.actionType",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "actionType",
          readonly: true,
        },
        {
          id: "requestUrl",
          type: "input",
          label: "요청 URL",
          labelMsgKey: "log.label.requestUrl",
          colSpan: 12,
          rowSpan: 1,
          fieldKey: "requestUrl",
          readonly: true,
        },
        {
          id: "durationMs",
          type: "input",
          label: "처리시간(ms)",
          labelMsgKey: "log.label.durationMs",
          colSpan: 12,
          rowSpan: 1,
          fieldKey: "durationMs",
          readonly: true,
        },
        {
          id: "clientIp",
          type: "input",
          label: "요청자 IP",
          labelMsgKey: "log.label.clientIp",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "clientIp",
          readonly: true,
        },
        {
          id: "loginUser",
          type: "input",
          label: "사용자",
          labelMsgKey: "log.label.loginUser",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "loginUser",
          readonly: true,
        },
      ],
    }),
    []
  );

  /* 요청 바디 폼 위젯 */
  const BODY_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "transaction-log-body-form",
      contentKey: "transactionLogBodyForm",
      title: "요청 바디",
      titleMsgKey: "log.label.requestBody",
      showBorder: true,
      fields: [
        {
          id: "requestBody",
          type: "textarea",
          label: "요청 바디",
          labelMsgKey: "log.label.requestBody",
          colSpan: 12,
          rowSpan: 5,
          fieldKey: "requestBody",
          readonly: true,
          placeholder: "",
        },
      ],
    }),
    []
  );

  /* 목록으로 버튼 */
  const SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "transaction-log-detail-space",
      align: "right",
      showBorder: false,
      items: [
        {
          id: "s1",
          type: "action-button",
          label: "목록으로",
          labelMsgKey: "log.btn.backToList",
          colSpan: 1,
          color: "gray",
          connType: "close",
        },
      ],
    }),
    []
  );

  if (loading) return null;

  return (
    <PageLayout mode="live">
      {/* 기본 정보 */}
      <GridCell colSpan={12} rowSpan={7}>
        <WidgetRenderer
          mode="live"
          widget={INFO_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>

      {/* 요청 바디 */}
      <GridCell colSpan={12} rowSpan={7}>
        <WidgetRenderer
          mode="live"
          widget={BODY_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>

      {/* 목록으로 버튼 */}
      <GridCell colSpan={12} rowSpan={1}>
        <WidgetRenderer mode="live" widget={SPACE_WIDGET} contentColSpan={12} onClose={() => router.back()} />
      </GridCell>
    </PageLayout>
  );
}
