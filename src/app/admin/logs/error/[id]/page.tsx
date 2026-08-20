"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useI18n } from "@/hooks/use-i18n";
import { usePageTitleStore } from "@/store/use-page-title-store";
import api from "@/lib/api";

/* ── 에러 로그 상세 타입 ── */
interface ErrorLogDetail {
  id: number;
  errorCode: string | null;
  httpStatus: number;
  method: string | null;
  requestUrl: string | null;
  message: string | null;
  clientIp: string | null;
  loginUser: string | null;
  createdAt: string;
  stackTrace: string | null;
}

export default function ErrorLogDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { t } = useI18n();
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);

  const [loading, setLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  /* 브레드크럼/영역명이 이전 화면 제목을 그대로 재사용하지 않도록 진입 시 명시적으로 설정, 이탈 시 초기화 */
  useEffect(() => {
    setPageTitle(t("log.label.errorLogDetail"));
    return () => setPageTitle("");
  }, [t, setPageTitle]);

  /* 상세 데이터 로드 */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<ErrorLogDetail>(`/error-logs/${id}`);
        const d = res.data;
        setFormValues({
          createdAt: d.createdAt ? d.createdAt.slice(0, 19).replace("T", " ") : "-",
          httpStatus: String(d.httpStatus),
          method: d.method ?? "-",
          errorCode: d.errorCode ?? "-",
          requestUrl: d.requestUrl ?? "-",
          message: d.message ?? "-",
          clientIp: d.clientIp ?? "-",
          loginUser: d.loginUser ?? "-",
          stackTrace: d.stackTrace ?? "",
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
      widgetId: "error-log-info-form",
      contentKey: "errorLogInfoForm",
      title: "에러 로그 상세",
      titleMsgKey: "log.label.errorLogDetail",
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
          id: "errorCode",
          type: "input",
          label: "에러코드",
          labelMsgKey: "dashboard.label.errorCode",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "errorCode",
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
          id: "message",
          type: "input",
          label: "메시지",
          labelMsgKey: "dashboard.label.message",
          colSpan: 12,
          rowSpan: 1,
          fieldKey: "message",
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

  /* 스택트레이스 폼 위젯 */
  const TRACE_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "error-log-trace-form",
      contentKey: "errorLogTraceForm",
      title: "스택트레이스",
      titleMsgKey: "log.label.stackTrace",
      showBorder: true,
      fields: [
        {
          id: "stackTrace",
          type: "textarea",
          label: "스택트레이스",
          labelMsgKey: "log.label.stackTrace",
          colSpan: 12,
          rowSpan: 5,
          fieldKey: "stackTrace",
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
      widgetId: "error-log-detail-space",
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
    <PageLayout mode="live" title={t("log.label.errorLogDetail")}>
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

      {/* 스택트레이스 */}
      <GridCell colSpan={12} rowSpan={7}>
        <WidgetRenderer
          mode="live"
          widget={TRACE_FORM_WIDGET}
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
