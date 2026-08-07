"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useCodeStore } from "@/store/use-code-store";
import api from "@/lib/api";

/* ── 이메일 발송 이력 상세 타입 ── */
interface EmailSendHisDetail {
  id: number;
  emailSendType: string | null;
  emailSendDetailType: string | null;
  recipientEmail: string | null;
  subject: string | null;
  content: string | null;
  sendStatus: string | null;
  sentAt: string;
  lastResendAt: string | null;
}

export default function EmailSendHisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { groups: codeGroups, fetchGroups } = useCodeStore();

  const [loading, setLoading] = useState(true);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const load = useCallback(async () => {
    try {
      const res = await api.get<EmailSendHisDetail>(`/email-send-his/${id}`);
      const d = res.data;
      setSendStatus(d.sendStatus);
      setFormValues({
        sentAt: d.sentAt ? d.sentAt.slice(0, 19).replace("T", " ") : "-",
        lastResendAt: d.lastResendAt ? d.lastResendAt.slice(0, 19).replace("T", " ") : "-",
        sendStatus: d.sendStatus ?? "",
        emailSendType: d.emailSendType ?? "",
        emailSendDetailType: d.emailSendDetailType ?? "",
        recipientEmail: d.recipientEmail ?? "-",
        subject: d.subject ?? "-",
        content: d.content ?? "",
      });
    } catch {
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const resend = useCallback(async () => {
    if (sendStatus !== "F") {
      alert("발송 실패 건만 재발송할 수 있습니다.");
      return;
    }
    if (!window.confirm("이 이메일을 재발송하시겠습니까?")) return;
    try {
      await api.post(`/email-send-his/${id}/resend`);
      alert("재발송 요청을 처리했습니다.");
      load();
    } catch {
      alert("재발송 요청에 실패했습니다.");
    }
  }, [id, sendStatus, load]);

  /* 기본 정보 폼 위젯 */
  const INFO_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "email-send-his-info-form",
      contentKey: "emailSendHisInfoForm",
      title: "이메일 발송 이력 상세",
      showBorder: true,
      fields: [
        { id: "sentAt", type: "input", label: "발송일시", colSpan: 6, rowSpan: 1, fieldKey: "sentAt", readonly: true },
        {
          id: "lastResendAt",
          type: "input",
          label: "최근재발송일시",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "lastResendAt",
          readonly: true,
        },
        {
          id: "sendStatus",
          type: "input",
          label: "발송상태",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "sendStatus",
          readonly: true,
          codeGroupCode: "SENDSTATUS",
        },
        {
          id: "emailSendType",
          type: "input",
          label: "분류",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "emailSendType",
          readonly: true,
          codeGroupCode: "EMAILSENDTYPE",
        },
        {
          id: "emailSendDetailType",
          type: "input",
          label: "상세분류",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "emailSendDetailType",
          readonly: true,
          codeGroupCode: "TRAININGCOURSE",
        },
        {
          id: "recipientEmail",
          type: "input",
          label: "수신 이메일",
          colSpan: 6,
          rowSpan: 1,
          fieldKey: "recipientEmail",
          readonly: true,
        },
        {
          id: "subject",
          type: "input",
          label: "메일 제목",
          colSpan: 12,
          rowSpan: 1,
          fieldKey: "subject",
          readonly: true,
        },
      ],
    }),
    []
  );

  /* 메일 본문 폼 위젯 */
  const CONTENT_FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "email-send-his-content-form",
      contentKey: "emailSendHisContentForm",
      title: "메일 본문",
      showBorder: true,
      fields: [
        {
          id: "content",
          type: "textarea",
          label: "본문(HTML)",
          colSpan: 12,
          rowSpan: 5,
          fieldKey: "content",
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
      widgetId: "email-send-his-detail-space",
      align: "right",
      showBorder: false,
      items: [{ id: "s1", type: "action-button", label: "목록으로", colSpan: 1, color: "gray", connType: "close" }],
    }),
    []
  );

  if (loading) return null;

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={5}>
        <WidgetRenderer
          mode="live"
          widget={INFO_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
          codeGroups={codeGroups}
        />
      </GridCell>

      <GridCell colSpan={12} rowSpan={6}>
        <WidgetRenderer
          mode="live"
          widget={CONTENT_FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={() => {}}
        />
      </GridCell>

      {/* 재발송 + 목록으로 버튼 */}
      <GridCell colSpan={12} rowSpan={1}>
        <div className="flex justify-end gap-2 items-center h-full">
          <button
            type="button"
            onClick={resend}
            className="px-10 py-2.5 min-h-[40px] rounded-md text-xs font-bold whitespace-nowrap flex items-center justify-center shadow-sm bg-black hover:opacity-90 text-white transition-all"
          >
            재발송
          </button>
          <WidgetRenderer mode="live" widget={SPACE_WIDGET} contentColSpan={12} onClose={() => router.back()} />
        </div>
      </GridCell>
    </PageLayout>
  );
}
