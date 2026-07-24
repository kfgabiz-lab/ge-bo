"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useSiteStore } from "@/store/use-site-store";
import { useI18n } from "@/hooks/use-i18n";

/* ── 상수 ── */
/* 시간대(timezone) select 옵션 — "라벨:값(IANA timezone)" 형식, 서비스 대상 국가 위주로 큐레이션 */
/* 주의: parseOpt()가 첫 번째 콜론(:) 기준으로 라벨/값을 분리하므로, 라벨에는 콜론을 쓰지 않는다 (예: "09:00" 대신 "0900") */
const TIMEZONE_OPTIONS = [
  "UTC+0900 Seoul:Asia/Seoul",
  "UTC+0900 Tokyo:Asia/Tokyo",
  "UTC+0800 Shanghai:Asia/Shanghai",
  "UTC+0800 Hong Kong:Asia/Hong_Kong",
  "UTC+0800 Singapore:Asia/Singapore",
  "UTC+0700 Bangkok:Asia/Bangkok",
  "UTC+0700 Jakarta:Asia/Jakarta",
  "UTC+0700 Ho Chi Minh:Asia/Ho_Chi_Minh",
  "UTC+0530 Mumbai:Asia/Kolkata",
  "UTC+0400 Dubai:Asia/Dubai",
  "UTC+0000 London:Europe/London",
  "UTC+0100 Paris:Europe/Paris",
  "UTC+0100 Berlin:Europe/Berlin",
  "UTC-0500 New York:America/New_York",
  "UTC-0600 Chicago:America/Chicago",
  "UTC-0700 Denver:America/Denver",
  "UTC-0800 Los Angeles:America/Los_Angeles",
  "UTC+1000 Sydney:Australia/Sydney",
  "UTC+1200 Auckland:Pacific/Auckland",
  "UTC+0000 UTC:UTC",
];

/* ── 페이지 컴포넌트 ── */
export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = params.id as string;
  const isNew = id === "new";

  const { createSite, updateSite } = useSiteStore();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  const [formValues, setFormValues] = useState<Record<string, string>>({
    nameMsgKey: "",
    description: "",
    domain: "",
    isActive: "true",
    timezone: "",
  });

  /* 공간영역 — 취소 / 저장 */
  const SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "sites-detail-space",
      align: "right",
      showBorder: false,
      items: [
        {
          id: "s1",
          type: "action-button",
          label: t("common.btn.cancel"),
          colSpan: 1,
          color: "gray",
          connType: "close",
        },
        {
          id: "s2",
          type: "action-button",
          label: t("common.btn.save"),
          colSpan: 1,
          color: "black",
          connType: "content",
          connectedContentWidgetIds: ["sites-detail-form"],
          contentAction: "save",
        },
      ],
    }),
    [t]
  );

  /* 폼 위젯 — isNew에 따라 타이틀 변경 */
  const FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "sites-detail-form",
      contentKey: "sitesDetailForm",
      title: isNew ? t("site.title.new") : t("site.title.edit"),
      description: t("site.description"),
      showBorder: true,
      fields: [
        {
          id: "nameMsgKey",
          type: "message-key-select",
          label: t("site.label.name"),
          colSpan: 12,
          rowSpan: 1,
          required: true,
          fieldKey: "nameMsgKey",
        },
        {
          id: "isActive",
          type: "select",
          label: t("common.label.isActive"),
          colSpan: 4,
          rowSpan: 1,
          required: true,
          fieldKey: "isActive",
          options: ["true", "false"],
        },
        {
          id: "timezone",
          type: "select",
          label: t("site.label.timezone"),
          colSpan: 4,
          rowSpan: 1,
          required: false,
          fieldKey: "timezone",
          options: TIMEZONE_OPTIONS,
        },
        {
          id: "domain",
          type: "input",
          label: t("common.label.domain"),
          colSpan: 12,
          rowSpan: 1,
          required: false,
          fieldKey: "domain",
          placeholder: t("site.placeholder.domain"),
        },
        {
          id: "description",
          type: "input",
          label: t("common.label.description"),
          colSpan: 12,
          rowSpan: 1,
          required: false,
          fieldKey: "description",
          placeholder: t("common.field.optional"),
        },
      ],
    }),
    [isNew, t]
  );

  /* 수정 모드: 기존 데이터 로드 */
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      setLoading(true);
      try {
        const { default: api } = await import("@/lib/api");
        const res = await api.get(`/sites/${id}`);
        const site = res.data;
        setFormValues({
          nameMsgKey: site.nameMsgKey ?? "",
          description: site.description ?? "",
          domain: site.domain ?? "",
          isActive: String(site.isActive),
          timezone: site.timezone ?? "",
        });
      } catch {
        toast.error(t("site.load_error"));
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, router, t]);

  /* 폼 필드 변경 */
  const handleFormChange = useCallback((fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  /* 저장 */
  const handleContentAction = useCallback(
    async (_widgetIds: string[], action: "save" | "delete") => {
      if (action !== "save" || saving) return;

      if (!formValues.nameMsgKey?.trim()) {
        toast.error(t("validation.site.name.required"));
        return;
      }

      setSaving(true);
      try {
        const payload = {
          nameMsgKey: formValues.nameMsgKey.trim(),
          description: formValues.description?.trim() || undefined,
          domain: formValues.domain?.trim() || undefined,
          isActive: formValues.isActive === "true",
          timezone: formValues.timezone || undefined,
        };

        if (isNew) {
          await createSite(payload);
          toast.success(t("site.created"));
        } else {
          await updateSite(Number(id), payload);
          toast.success(t("site.updated"));
        }
        router.push("/admin/settings/sites");
      } catch {
        /* store에서 toast 처리 */
      } finally {
        setSaving(false);
      }
    },
    [formValues, id, isNew, saving, createSite, updateSite, router, t]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-slate-400">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <PageLayout mode="live">
      {/* 폼 위젯 */}
      <GridCell colSpan={12} rowSpan={5}>
        <WidgetRenderer
          mode="live"
          widget={FORM_WIDGET}
          contentColSpan={12}
          formValues={formValues}
          onFormValuesChange={handleFormChange}
        />
      </GridCell>

      {/* 공간영역 — 취소/저장 버튼 */}
      <GridCell colSpan={2} colStart={11} rowSpan={1}>
        <WidgetRenderer
          mode="live"
          widget={SPACE_WIDGET}
          contentColSpan={2}
          onContentAction={handleContentAction}
          onClose={() => router.back()}
        />
      </GridCell>
    </PageLayout>
  );
}
