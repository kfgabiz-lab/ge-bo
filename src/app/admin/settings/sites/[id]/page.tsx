"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useSiteManagementStore } from "@/store/use-site-management-store";
import { useI18n } from "@/hooks/use-i18n";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { TIMEZONE_OPTIONS } from "@/lib/timezoneOptions";

/* ── 상수 ── */
/* 로케일(locale) select 옵션 — "라벨:값(BCP47)" 형식, TIMEZONE_OPTIONS와 동일한 도시/국가 기준으로 큐레이션 */
const LOCALE_OPTIONS = [
  "Korean (Korea):ko-KR",
  "Japanese (Japan):ja-JP",
  "Chinese (China):zh-CN",
  "Chinese (Hong Kong):zh-HK",
  "English (Singapore):en-SG",
  "Thai (Thailand):th-TH",
  "Indonesian (Indonesia):id-ID",
  "Vietnamese (Vietnam):vi-VN",
  "English (India):en-IN",
  "Arabic (UAE):ar-AE",
  "English (UK):en-GB",
  "French (France):fr-FR",
  "German (Germany):de-DE",
  "English (US):en-US",
  "English (Australia):en-AU",
  "English (New Zealand):en-NZ",
];

/* ── 페이지 컴포넌트 ── */
export default function SiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = params.id as string;
  const isNew = id === "new";
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);

  const { createSite, updateSite } = useSiteManagementStore();

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);

  /* 브레드크럼/영역명이 이전 화면 제목을 그대로 재사용하지 않도록 진입 시 명시적으로 설정, 이탈 시 초기화 */
  useEffect(() => {
    setPageTitle(isNew ? t("site.title.new") : t("site.title.edit"));
    return () => setPageTitle("");
  }, [isNew, t, setPageTitle]);

  const [formValues, setFormValues] = useState<Record<string, string>>({
    nameMsgKey: "",
    description: "",
    domain: "",
    isActive: "true",
    timezone: "",
    locale: "",
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
          label: t("common.btn.list"),
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
          id: "locale",
          type: "select",
          label: t("site.label.locale"),
          colSpan: 4,
          rowSpan: 1,
          required: false,
          fieldKey: "locale",
          options: LOCALE_OPTIONS,
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
          locale: site.locale ?? "",
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
          locale: formValues.locale || undefined,
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
    <PageLayout mode="live" title={isNew ? t("site.title.new") : t("site.title.edit")}>
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
