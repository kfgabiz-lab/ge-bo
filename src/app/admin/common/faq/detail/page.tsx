"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import { useLeaveCheck } from "@/app/admin/templates/make/_shared/hooks/useLeaveCheck";
import type { FormWidget, FormFieldItem } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import {
  buildKeyToId,
  buildFormRowData,
  formatFetchedRelValue,
  parseOpt,
  resolveFieldOptions,
  flattenPageDataItem,
  buildSlugOptRows,
  buildFieldKeyIdAndLabelMaps,
  applyDataGeneration,
  splitGenerationKeys,
  evalConditionExpr,
  buildFieldConditionResolver,
  findOptionFilterResetTargetIds,
  initFormDefaultValues,
  buildFormValuesFromDataJson,
  validateFormFields,
  buildDataJson,
} from "@/app/admin/templates/make/_shared/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { calculateFormFieldRowTracks } from "@/app/admin/templates/make/_shared/utils/formGridLayout";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";
import {
  uploadContentFormFiles,
  buildFormFileIdsMap,
  persistContentDataJson,
} from "@/app/admin/templates/make/_shared/utils/contentSave";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  widgetId: "w_t7dpug1uw",
  contentKey: "faq",
  fields: [
    {
      id: "fb_ggaq9dvul",
      type: "select",
      label: "",
      fieldKey: "main_category",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "common.label.faqMainCategory",
      options: ["Devices & Systems:001", "Markets:002"],
      codeGroupCode: "MAINCATEGORY",
      required: true,
      descriptionMsgKey: "faq.description.mainCategory",
    },
    {
      id: "fb_ghxzymzv7",
      type: "select",
      label: "qm",
      fieldKey: "product",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "common.label.product",
      required: true,
      placeholderMsgKey: "common.placeholder.product",
      descriptionMsgKey: "",
      hideCondition: "main_category!=001",
      optionSlug: "product-data",
      optionValueKey: "id",
      optionTextKey: "product_name",
      optionFilter: "is_visible=001",
    },
    {
      id: "fb_0xxrmghgx",
      type: "select",
      label: "",
      fieldKey: "markets",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "press.label.market",
      options: [
        "데이터 센터:001",
        "Public Infrastructure:002",
        "석유·가스 및 광업 산업:003",
        "전력망:004",
        "산업:005",
        "상업 및 주거:006",
      ],
      codeGroupCode: "MARKETS",
      required: true,
      hideCondition: "main_category!=002",
      placeholderMsgKey: "faq.placeholder.markets",
      descriptionMsgKey: "",
    },
    {
      id: "fb_e3bhhk4ts",
      type: "hidden",
      label: "",
      fieldKey: "1",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_ug3cqlkme",
      type: "hidden",
      label: "",
      fieldKey: "2",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_bu525rmqa",
      type: "hidden",
      label: "",
      fieldKey: "3",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_7jiwa0ldl",
      type: "hidden",
      label: "",
      fieldKey: "4",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_ckfzpg013",
      type: "input",
      label: "",
      fieldKey: "question",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.faqTitle",
      maxLength: 200,
      required: true,
      showCharCount: true,
      placeholderMsgKey: "faq.placeholder.question",
    },
    {
      id: "fb_gspiavkl4",
      type: "textarea",
      label: "",
      fieldKey: "answer",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.answer",
      required: true,
      maxLength: 500,
      showCharCount: true,
      placeholderMsgKey: "faq.placeholder.answer",
    },
    {
      id: "fb_mpuda6pfh",
      type: "radio",
      label: "",
      fieldKey: "is_visible",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.isVisible",
      required: true,
      options: ["공개:001", "비공개:002"],
      codeGroupCode: "VISIBILITY",
      defaultOptionValue: "001",
    },
  ],
  connectedSlug: "faq-data",
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1];

function SlugOptionSelect({
  field,
  value,
  onChange,
  disabled,
  placeholder,
  className,
  rowData,
}: {
  field: {
    optionSlug?: string;
    optionValueKey?: string;
    optionTextKey?: string;
    optionFilter?: string;
    optionOrderKey?: string;
    optionOrderDir?: "ASC" | "DESC";
  };
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  placeholder: string;
  className: string;
  rowData?: Record<string, unknown>;
}) {
  const [rawRows, setRawRows] = useState<Record<string, unknown>[]>([]);
  useEffect(() => {
    if (!field.optionSlug) {
      return;
    }
    api
      .get(`/page-data/${field.optionSlug}`, { params: { size: "9999" } })
      .then((res) => {
        const rows = (res.data?.content ?? []) as { dataJson: Record<string, unknown> }[];
        setRawRows(
          rows.map((item) => flattenPageDataItem(item as unknown as Parameters<typeof flattenPageDataItem>[0]))
        );
      })
      .catch(() => setRawRows([]));
  }, [field.optionSlug]);
  const opts = useMemo(() => buildSlugOptRows(rawRows, field, rowData), [rawRows, field, rowData]);
  return (
    <div className="relative">
      <select disabled={disabled} className={className} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {opts.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.text}
          </option>
        ))}
      </select>
      <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("faq.label.title"));
  }, [setPageTitle, t]);
  const { markDirty, markClean, confirmLeave } = useLeaveCheck(true);
  const searchParams = useSearchParams();
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const [formValuesForm1, setFormValuesForm1] = useState<Record<string, string>>({});
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const uid = useId();
  const router = useRouter();

  const formRowDataForm1 = useMemo(() => buildFormRowData(FORM_FIELDS_Form1, formValuesForm1), [formValuesForm1]);

  const urlParams = useMemo(() => {
    const skip = new Set(["id", "group_id"]);
    const map: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!skip.has(key)) map[key] = value;
    });
    return map;
  }, [searchParams]);

  const allFieldKeyToId = useMemo(() => buildFieldKeyIdAndLabelMaps(ALL_FORM_WIDGETS, t).allFieldKeyToId, [t]);
  const allFormValues = useMemo(() => Object.assign({}, formValuesForm1) as Record<string, string>, [formValuesForm1]);
  const lastGeneratedRef = useRef<Record<string, string>>({});

  const writeFormValue = useCallback(
    (fieldId: string, value: string) => {
      if (FORM_FIELD_BY_ID_Form1[fieldId]) {
        setFormValuesForm1((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
    },
    [markDirty]
  );

  const applyFieldGenerations = useCallback(
    (
      sourceField: FormFieldItem,
      fieldId: string,
      value: string,
      resolveTargetFieldId: (key: string) => string | undefined
    ) => {
      if (sourceField.generationKey) {
        const transformed = applyDataGeneration(
          value,
          sourceField.dataReplacement,
          sourceField.caseChange,
          sourceField.appendText,
          sourceField.truncateLength,
          undefined
        );
        splitGenerationKeys(sourceField.generationKey).forEach((key) => {
          const targetFieldId = resolveTargetFieldId(key);
          if (targetFieldId && targetFieldId !== fieldId) writeFormValue(targetFieldId, transformed);
        });
      }
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (!dg.generationKey) return;
        const transformed = applyDataGeneration(
          value,
          dg.dataReplacement,
          dg.caseChange,
          dg.appendText,
          dg.truncateLength,
          dg.stripHtml
        );
        const sourceIsBlank =
          !!dg.onlyIfEmpty &&
          applyDataGeneration(value, dg.dataReplacement, dg.caseChange, undefined, undefined, dg.stripHtml).trim() ===
            "";
        const nextValue = sourceIsBlank ? "" : transformed;
        for (const key of splitGenerationKeys(dg.generationKey)) {
          const targetFieldId = resolveTargetFieldId(key);
          if (!targetFieldId || targetFieldId === fieldId) continue;
          if (dg.onlyIfEmpty && !sourceIsBlank) {
            const currentTargetValue = allFormValues[targetFieldId] ?? "";
            if (currentTargetValue !== "" && currentTargetValue !== lastGeneratedRef.current[targetFieldId]) continue;
          }
          writeFormValue(targetFieldId, nextValue);
          if (dg.onlyIfEmpty) lastGeneratedRef.current[targetFieldId] = nextValue;
        }
      });
    },
    [allFormValues, writeFormValue]
  );

  const evalFieldConditionForm1 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form1 },
          { ...allFormValues, ...formValuesForm1 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm1, urlParams]
  );
  const resolveTargetFieldIdForm1 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form1[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm1 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm1((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form1[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm1[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form1, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm1[targetFieldId] ?? "") !== "") {
            setFormValuesForm1((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm1);
    },
    [formValuesForm1, markDirty, applyFieldGenerations, resolveTargetFieldIdForm1]
  );

  const handleFieldBlurForm1 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form1[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm1(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm1]
  );

  useEffect(() => {
    if (storedId === null) {
      if (!sitesLoaded || !clockReady) return;
      const defaults = initFormDefaultValues(ALL_FORM_WIDGETS, t);
      setFormValuesForm1(defaults["w_t7dpug1uw"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/faq-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_t7dpug1uw"] ?? {}) }));
      })
      .catch(() => toast.error(t("common.error.load_existing_data")));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedId, searchParams, sitesLoaded, clockReady]);

  const visibleFieldsForm1 = FORM_FIELDS_Form1.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm1(f.hideCondition))
  );
  const fieldRowIsAutoForm1 = calculateFormFieldRowTracks(visibleFieldsForm1, 12, false);

  const handleContentActionSpace1_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form1, formValuesForm1, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(CONTENT_WIDGETS_Space1_1, {}, "faq-data", false);
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space1_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_t7dpug1uw: formValuesForm1 },
        formFileIdsMap,
        {},
        {},
        {},
        undefined,
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "faq-data",
        dataJson,
        pkKeys,
        templateSlug: "faq-detail",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: false,
      });
      toast.success(isUpdate ? t("common.updated") : t("common.saved"));
      markClean();
      router.back();
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (response?.status === 409) {
        toast.error(response.data?.message || t("common.error.duplicate_key"));
      } else {
        toast.error(t("common.error.save"));
      }
    }
  };

  return (
    <div className="space-y-3">
      <PageGridContainer>
        <GridCell colSpan={12} rowSpan={8} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `auto auto auto auto auto auto auto auto`,
              gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
              gridAutoFlow: "row dense",
              rowGap: `${GAP_SIZE}px`,
              columnGap: 0,
            }}
          >
            <div style={{ gridColumn: "span 12", gridRow: "span 7" }}>
              <div
                className="w-full rounded border border-slate-200"
                style={{
                  overflow: "clip",
                  backgroundColor: "#ffffff",
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gridTemplateRows:
                    fieldRowIsAutoForm1.length > 0
                      ? fieldRowIsAutoForm1.map((a) => (a ? "auto" : "78px")).join(" ")
                      : undefined,
                  gridAutoRows: `78px`,
                  rowGap: `12px`,
                  columnGap: `12px`,
                  paddingTop: "10px",
                  paddingBottom: "10px",
                }}
              >
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 4", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.faqMainCategory")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("faq.description.mainCategory")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <select
                        disabled={false}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                        value={formValuesForm1["fb_ggaq9dvul"] ?? ""}
                        onChange={(e) => handleFieldChangeForm1("fb_ggaq9dvul", e.target.value)}
                      >
                        <option value="">{t("common.select.placeholder")}</option>
                        {resolveFieldOptions(
                          FORM_FIELD_BY_ID_Form1["fb_ggaq9dvul"] as unknown as SearchFieldConfig,
                          groups
                        ).map((opt) => {
                          const parsed = parseOpt(opt);
                          return (
                            <option key={opt} value={parsed.value}>
                              {t(parsed.text)}
                            </option>
                          );
                        })}
                      </select>
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </div>
                {!evalFieldConditionForm1("main_category!=001") && (
                  <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 4", gridRow: "span 1" }}>
                    <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                      {t("common.label.product")}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                      <SlugOptionSelect
                        field={{
                          optionSlug: "product-data",
                          optionValueKey: "id",
                          optionTextKey: "product_name",
                          optionFilter: "is_visible=001",
                        }}
                        value={formValuesForm1["fb_ghxzymzv7"] ?? ""}
                        onChange={(v) => handleFieldChangeForm1("fb_ghxzymzv7", v)}
                        disabled={false}
                        placeholder={t("common.placeholder.product")}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                        rowData={formRowDataForm1}
                      />
                    </div>
                  </div>
                )}
                {!evalFieldConditionForm1("main_category!=002") && (
                  <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 4", gridRow: "span 1" }}>
                    <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                      {t("press.label.market")}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                      <div className="relative">
                        <select
                          disabled={false}
                          className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                          value={formValuesForm1["fb_0xxrmghgx"] ?? ""}
                          onChange={(e) => handleFieldChangeForm1("fb_0xxrmghgx", e.target.value)}
                        >
                          <option value="">{t("faq.placeholder.markets")}</option>
                          {resolveFieldOptions(
                            FORM_FIELD_BY_ID_Form1["fb_0xxrmghgx"] as unknown as SearchFieldConfig,
                            groups
                          ).map((opt) => {
                            const parsed = parseOpt(opt);
                            return (
                              <option key={opt} value={parsed.value}>
                                {t(parsed.text)}
                              </option>
                            );
                          })}
                        </select>
                        <svg
                          className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                        >
                          <path d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 1", gridRow: "span 1" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 1", gridRow: "span 1" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 1", gridRow: "span 1" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 1", gridRow: "span 1" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.faqTitle")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("faq.placeholder.question")}
                        maxLength={200}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm1["fb_ckfzpg013"] ?? ""}
                        onChange={(e) => handleFieldChangeForm1("fb_ckfzpg013", e.target.value)}
                        onBlur={() => handleFieldBlurForm1("fb_ckfzpg013")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm1["fb_ckfzpg013"] ?? "").length}/{200}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.answer")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex flex-col h-full">
                      <textarea
                        disabled={false}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                        value={formValuesForm1["fb_gspiavkl4"] ?? ""}
                        maxLength={500}
                        placeholder={t("faq.placeholder.answer")}
                        onChange={(e) => handleFieldChangeForm1("fb_gspiavkl4", e.target.value)}
                      />
                      <div className="text-right text-[10px] text-slate-400 mt-0.5">
                        {(formValuesForm1["fb_gspiavkl4"] ?? "").length}/{500}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.isVisible")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form1["fb_mpuda6pfh"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_mpuda6pfh`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm1["fb_mpuda6pfh"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm1("fb_mpuda6pfh", parsed.value)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{t(parsed.text)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ gridColumn: "span 12", gridRow: "span 1" }}>
              <div
                className="w-full rounded"
                style={{
                  overflow: "visible",
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  gridTemplateRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                  gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                  rowGap: `${GAP_SIZE}px`,
                  columnGap: `${GAP_SIZE}px`,
                }}
              >
                <div
                  className="flex items-center-safe gap-2 px-3 min-w-0 justify-start"
                  style={{ gridColumn: "span 2", gridRow: "span 1" }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (!confirmLeave()) return;
                      router.back();
                    }}
                    className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-400 text-white"
                  >
                    {t("common.label.list")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.confirm(t("common.confirm.save"))) return;
                      handleContentActionSpace1_1();
                    }}
                    className="text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default bg-slate-900 text-white"
                  >
                    {t("common.btn.save")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </GridCell>
      </PageGridContainer>
    </div>
  );
}
