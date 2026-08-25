"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import PageLayout from "@/components/layout/page-layout";
import { GridCell } from "@/components/layout/grid-cell";
import { WidgetRenderer } from "@/app/admin/templates/make/_shared/components/renderer";
import type { SpaceWidget } from "@/app/admin/templates/make/_shared/components/renderer";
import type { FormWidget } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import { useI18n } from "@/hooks/use-i18n";
import { usePageTitleStore } from "@/store/use-page-title-store";

/* ── 타입 ── */

interface Role {
  id: number;
  code: string;
  displayName: string;
  displayNameMsgKey: string | null;
  description: string;
  descriptionMsgKey: string | null;
  color: string;
  isSystem: boolean;
  memberCount: number;
}

/* ── 상수 ── */

const COLOR_PRESETS = ["#4361ee", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#6b7280"];

/* ── 페이지 컴포넌트 ── */

export default function RolesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useI18n();
  const id = params.id as string;
  const isNew = id === "new";
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  /* 다국어 모드 — ON: 표시명/설명을 등록된 다국어 키에서 선택, OFF: 직접 입력 */
  const [i18nMode, setI18nMode] = useState(true);

  /* 브레드크럼/영역명이 이전 화면 제목을 그대로 재사용하지 않도록 진입 시 명시적으로 설정, 이탈 시 초기화 */
  useEffect(() => {
    setPageTitle(isNew ? t("role.title.new") : t("role.title.edit"));
    return () => setPageTitle("");
  }, [isNew, t, setPageTitle]);

  /* fieldId → value 형태로 관리 (WidgetRenderer 규격) */
  const [formValues, setFormValues] = useState<Record<string, string>>({
    code: "",
    displayName: "",
    displayNameMsgKey: "",
    description: "",
    descriptionMsgKey: "",
    color: COLOR_PRESETS[0],
  });

  /** 공간영역 위젯 — 목록 / 저장 버튼 */
  const SPACE_WIDGET: SpaceWidget = useMemo(
    () => ({
      type: "space",
      widgetId: "roles-detail-space",
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
          connectedContentWidgetIds: ["roles-detail-form"],
          contentAction: "save",
        },
      ],
    }),
    [t]
  );

  /** 기본 정보 폼 위젯 */
  const FORM_WIDGET: FormWidget = useMemo(
    () => ({
      type: "form",
      widgetId: "roles-detail-form",
      contentKey: "rolesDetailForm",
      title: isNew ? t("role.title.new") : t("role.title.edit"),
      description: t("admin.description"),
      showBorder: true,
      fields: [
        {
          id: "code",
          type: "input",
          label: t("role.label.code"),
          colSpan: 6,
          rowSpan: 1,
          required: isNew,
          fieldKey: "code",
          placeholder: "SUPER_ADMIN",
          description: t("validation.code.code.format"),
          readonly: !isNew,
        },
        i18nMode
          ? {
              id: "displayNameMsgKey",
              type: "message-key-select",
              label: t("common.label.displayName"),
              colSpan: 6,
              rowSpan: 1,
              required: true,
              fieldKey: "displayNameMsgKey",
            }
          : {
              id: "displayName",
              type: "input",
              label: t("common.label.displayName"),
              colSpan: 6,
              rowSpan: 1,
              required: true,
              fieldKey: "displayName",
              placeholder: t("role.placeholder.displayName"),
            },
        i18nMode
          ? {
              id: "descriptionMsgKey",
              type: "message-key-select",
              label: t("common.label.description"),
              colSpan: 12,
              rowSpan: 1,
              fieldKey: "descriptionMsgKey",
            }
          : {
              id: "description",
              type: "input",
              label: t("common.label.description"),
              colSpan: 12,
              rowSpan: 1,
              fieldKey: "description",
              placeholder: t("role.placeholder.description"),
            },
        {
          id: "color",
          type: "color",
          label: t("common.label.color"),
          colSpan: 12,
          rowSpan: 1,
          required: true,
          fieldKey: "color",
          options: COLOR_PRESETS,
        },
      ],
    }),
    [isNew, t, i18nMode]
  );

  /* 수정 모드: 기존 데이터 로드 */
  useEffect(() => {
    if (isNew) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<Role>(`/roles/${id}`);
        const role = res.data;
        setI18nMode(!!role.displayNameMsgKey);
        setFormValues({
          code: role.code,
          displayName: role.displayNameMsgKey ? "" : role.displayName,
          displayNameMsgKey: role.displayNameMsgKey ?? "",
          description: role.descriptionMsgKey ? "" : (role.description ?? ""),
          descriptionMsgKey: role.descriptionMsgKey ?? "",
          color: role.color ?? COLOR_PRESETS[0],
        });
      } catch {
        toast.error(t("role.error.load"));
        router.back();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isNew, router, t]);

  /* 폼 필드 변경 핸들러 */
  const handleFormChange = useCallback((fieldId: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  /* 저장 — 등록(POST) / 수정(PATCH) */
  const handleContentAction = useCallback(
    async (_widgetIds: string[], action: "save" | "delete") => {
      if (action !== "save" || saving) return;

      /* 클라이언트 유효성 검증 */
      if (isNew && !formValues.code?.trim()) {
        toast.error(t("validation.role.code.required"));
        return;
      }
      const displayNameValue = i18nMode ? formValues.displayNameMsgKey : formValues.displayName;
      if (!displayNameValue?.trim()) {
        toast.error(t("validation.role.displayName.required"));
        return;
      }
      if (!formValues.color) {
        toast.error(t("validation.role.color.required"));
        return;
      }

      setSaving(true);
      try {
        const payload = {
          displayName: i18nMode ? "" : formValues.displayName,
          displayNameMsgKey: i18nMode ? formValues.displayNameMsgKey : "",
          description: i18nMode ? "" : formValues.description || null,
          descriptionMsgKey: i18nMode ? formValues.descriptionMsgKey || undefined : undefined,
          color: formValues.color,
        };
        if (isNew) {
          await api.post("/roles", { code: formValues.code.toUpperCase(), ...payload });
          toast.success(t("role.created"));
        } else {
          await api.patch(`/roles/${id}`, payload);
          toast.success(t("role.updated"));
        }
        router.push("/admin/settings/roles");
      } catch (e: unknown) {
        toast.error(getApiErrorMessage(e, t("admin.error.save")));
      } finally {
        setSaving(false);
      }
    },
    [formValues, i18nMode, id, isNew, router, saving, t]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm text-slate-400">{t("common.loading")}</span>
      </div>
    );
  }

  return (
    <PageLayout mode="live" title={isNew ? t("role.title.new") : t("role.title.edit")}>
      {/* 폼 위젯 */}
      <GridCell colSpan={12} rowSpan={5}>
        <div className="relative h-full">
          <button
            type="button"
            title={i18nMode ? t("menu.title.switchToManualInput") : t("menu.title.switchToI18nMode")}
            onClick={() => setI18nMode((v) => !v)}
            className={`absolute top-3 right-3 z-10 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
              i18nMode
                ? "text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                : "text-slate-400 bg-slate-50 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Globe className="w-3 h-3" />
            {i18nMode ? t("menu.btn.i18nMode") : t("search.btn.manualInput")}
          </button>
          <WidgetRenderer
            mode="live"
            widget={FORM_WIDGET}
            contentColSpan={12}
            formValues={formValues}
            onFormValuesChange={handleFormChange}
          />
        </div>
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
