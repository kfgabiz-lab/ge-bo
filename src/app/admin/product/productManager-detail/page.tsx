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
  parseOpt,
  resolveFieldOptions,
  buildFieldKeyIdAndLabelMaps,
  applyDataGeneration,
  splitGenerationKeys,
  evalConditionExpr,
  buildFieldConditionResolver,
  findOptionFilterResetTargetIds,
  initFormDefaultValues,
  buildFormValuesFromDataJson,
  extractMultiSelectSelection,
  flattenPageDataItem,
  validateFormFields,
  buildDataJson,
  findMissingRequiredMultiSelect,
} from "@/app/admin/templates/make/_shared/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import api from "@/lib/api";
import { toast } from "sonner";
import { calculateFormFieldRowTracks } from "@/app/admin/templates/make/_shared/utils/formGridLayout";
import type { MultiSelectWidget } from "@/app/admin/templates/make/_shared/components/renderer/types";
import {
  fetchMultiSelectSourceRows,
  buildLabelPathEntries,
} from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import type { MultiSelectOptionItem } from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import { ChevronDown, X, Search } from "lucide-react";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";
import {
  uploadContentFormFiles,
  buildFormFileIdsMap,
  persistContentDataJson,
} from "@/app/admin/templates/make/_shared/utils/contentSave";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  widgetId: "w_j4cltai3j",
  contentKey: "product_manager",
  fields: [
    {
      id: "fb_gijkvpkpx",
      type: "input",
      label: "",
      fieldKey: "email",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "productManager.label.email",
      required: false,
      maxLength: 50,
      showCharCount: true,
      pattern: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$",
      patternDesc: "이메일 형식으로 작성",
      readonly: false,
    },
    {
      id: "fb_taumf8ea1",
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
  connectedSlug: "productManager-data",
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1];
const MULTISELECT_WIDGET_MultiSelect1: MultiSelectWidget = {
  type: "multiselect",
  widgetId: "w_9uizbc69n",
  contentKey: "ms",
  sourceSlug: "product-data",
  connectedSlug: "productManager-data",
  labelFields: "product.product_name",
  bgColor: "#ffffff",
  titleMsgKey: "common.label.product",
  required: true,
  sourceFilter: "is_visible=001,order_status=01",
  showBorder: true,
  fieldColSpan: 8,
};
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1, MULTISELECT_WIDGET_MultiSelect1];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("productManager.label.detailTitle"));
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
  const [multiSelectIdsMultiSelect1, setMultiSelectIdsMultiSelect1] = useState<number[]>([]);
  const [multiSelectOptionsMultiSelect1, setMultiSelectOptionsMultiSelect1] = useState<MultiSelectOptionItem[]>([]);
  const [multiSelectSearchMultiSelect1, setMultiSelectSearchMultiSelect1] = useState("");
  const [multiSelectOpenMultiSelect1, setMultiSelectOpenMultiSelect1] = useState(false);
  const multiSelectButtonRefMultiSelect1 = useRef<HTMLButtonElement>(null);
  const router = useRouter();

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
      setFormValuesForm1(defaults["w_j4cltai3j"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/productManager-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_j4cltai3j"] ?? {}) }));
        const selectionMultiSelect1 = extractMultiSelectSelection(dataJson, "ms", "productManager-data");
        if (selectionMultiSelect1.kind !== "none") setMultiSelectIdsMultiSelect1(selectionMultiSelect1.ids);
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

  useEffect(() => {
    let cancelled = false;
    fetchMultiSelectSourceRows(
      "product-data",
      undefined,
      undefined,
      undefined,
      undefined,
      "is_visible=001,order_status=01"
    )
      .then((rows) => {
        if (cancelled) return;
        const flatRows = rows.map((r) => flattenPageDataItem(r as Parameters<typeof flattenPageDataItem>[0]));
        const filteredRows = flatRows.filter((row) =>
          evalConditionExpr("is_visible=001,order_status=01", (key) =>
            key in row ? String(row[key] ?? "") : undefined
          )
        );
        setMultiSelectOptionsMultiSelect1(filteredRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));
      })
      .catch((err) => console.warn("[MultiSelect1] " + "product-data", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const multiSelectRowsMultiSelect1 = useMemo(
    () =>
      multiSelectOptionsMultiSelect1.flatMap((opt) =>
        buildLabelPathEntries(opt, MULTISELECT_WIDGET_MultiSelect1).map((entry, pathIdx) => ({ opt, entry, pathIdx }))
      ),
    [multiSelectOptionsMultiSelect1]
  );
  const multiSelectDisplayRowsMultiSelect1 = useMemo(() => {
    const q = multiSelectSearchMultiSelect1.toLowerCase();
    const searched = q
      ? multiSelectRowsMultiSelect1.filter(({ entry }) => entry.path.toLowerCase().includes(q))
      : multiSelectRowsMultiSelect1;
    return searched;
  }, [multiSelectRowsMultiSelect1, multiSelectSearchMultiSelect1]);
  const multiSelectSelectedEntriesMultiSelect1 = multiSelectRowsMultiSelect1.filter(({ entry }) =>
    multiSelectIdsMultiSelect1.includes(entry.selectionId)
  );

  const toggleMultiSelectMultiSelect1 = useCallback(
    (id: number) => {
      setMultiSelectIdsMultiSelect1((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      markDirty();
    },
    [markDirty]
  );
  const removeMultiSelectMultiSelect1 = useCallback(
    (id: number) => {
      setMultiSelectIdsMultiSelect1((prev) => prev.filter((x) => x !== id));
      markDirty();
    },
    [markDirty]
  );

  const handleContentActionSpace1_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form1, formValuesForm1, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    const missingMultiSelectTitle = findMissingRequiredMultiSelect(
      CONTENT_WIDGETS_Space1_1,
      { w_9uizbc69n: multiSelectIdsMultiSelect1 },
      allFieldKeyToId,
      allFormValues,
      t
    );
    if (missingMultiSelectTitle !== null) {
      toast.warning(t("common.validation.multiselect_required", { title: missingMultiSelectTitle }));
      return;
    }
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(
        CONTENT_WIDGETS_Space1_1,
        {},
        "productManager-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space1_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_j4cltai3j: formValuesForm1 },
        formFileIdsMap,
        {},
        { w_9uizbc69n: multiSelectIdsMultiSelect1 },
        {},
        "productManager-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "productManager-data",
        dataJson,
        pkKeys,
        templateSlug: "productManager-detail",
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
              gridTemplateRows: `auto auto ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px auto`,
              gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
              gridAutoFlow: "row dense",
              rowGap: `${GAP_SIZE}px`,
              columnGap: 0,
            }}
          >
            <div style={{ gridColumn: "span 12", gridRow: "span 2" }}>
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("productManager.label.email")}
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("common.input.placeholder")}
                        maxLength={50}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm1["fb_gijkvpkpx"] ?? ""}
                        onChange={(e) => handleFieldChangeForm1("fb_gijkvpkpx", e.target.value)}
                        onBlur={() => handleFieldBlurForm1("fb_gijkvpkpx")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm1["fb_gijkvpkpx"] ?? "").length}/{50}
                      </span>
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
                        FORM_FIELD_BY_ID_Form1["fb_taumf8ea1"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_taumf8ea1`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm1["fb_taumf8ea1"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm1("fb_taumf8ea1", parsed.value)}
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
            <div style={{ gridColumn: "span 12", gridRow: "span 5", height: `${5 * ROW_HEIGHT - GAP_SIZE}px` }}>
              <div
                className="h-full w-full rounded border border-slate-200"
                style={{ overflow: "clip", backgroundColor: "#ffffff" }}
              >
                <div className="p-3 flex flex-col gap-3 h-full">
                  <p className="text-sm font-medium text-slate-700">
                    {t("common.label.product")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </p>
                  <div className="flex flex-col gap-3" style={{ width: "66.66666666666666%" }}>
                    <div className="relative">
                      <button
                        ref={multiSelectButtonRefMultiSelect1}
                        type="button"
                        onClick={() => setMultiSelectOpenMultiSelect1((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:border-slate-400 transition-colors disabled:cursor-default"
                      >
                        <span
                          className={
                            multiSelectSelectedEntriesMultiSelect1.length > 0 ? "text-slate-800" : "text-slate-400"
                          }
                        >
                          {multiSelectSelectedEntriesMultiSelect1.length > 0
                            ? t("common.multiselect.selected_count", {
                                count: String(multiSelectSelectedEntriesMultiSelect1.length),
                              })
                            : t("common.multiselect.placeholder")}
                        </span>
                        <ChevronDown
                          className={
                            multiSelectOpenMultiSelect1
                              ? "w-4 h-4 shrink-0 text-slate-400 transition-transform rotate-180"
                              : "w-4 h-4 shrink-0 text-slate-400 transition-transform "
                          }
                        />
                      </button>
                      <PortalDropdown
                        open={multiSelectOpenMultiSelect1}
                        anchorRef={multiSelectButtonRefMultiSelect1}
                        onOutsideClick={() => setMultiSelectOpenMultiSelect1(false)}
                        className="bg-white border border-slate-200 rounded-md shadow-lg"
                      >
                        <div className="p-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={multiSelectSearchMultiSelect1}
                              onChange={(e) => setMultiSelectSearchMultiSelect1(e.target.value)}
                              placeholder={t("common.input.search_placeholder")}
                              className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
                            />
                          </div>
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {multiSelectDisplayRowsMultiSelect1.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-slate-400 text-center">
                              {t("common.table.no_data")}
                            </li>
                          ) : (
                            multiSelectDisplayRowsMultiSelect1.map(({ opt, entry, pathIdx }) => (
                              <li key={`${opt.id}-${pathIdx}`}>
                                <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={multiSelectIdsMultiSelect1.includes(entry.selectionId)}
                                    onChange={() => toggleMultiSelectMultiSelect1(entry.selectionId)}
                                    className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-800"
                                  />
                                  <span className="text-sm text-slate-700">{entry.path}</span>
                                </label>
                              </li>
                            ))
                          )}
                        </ul>
                      </PortalDropdown>
                    </div>
                    {multiSelectSelectedEntriesMultiSelect1.length > 0 && (
                      <div className="max-h-56 overflow-y-auto">
                        <div className="flex flex-col gap-1.5">
                          {multiSelectSelectedEntriesMultiSelect1.map(({ opt, entry, pathIdx }) => (
                            <div
                              key={`${opt.id}-${pathIdx}`}
                              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto"
                            >
                              <span className="text-xs font-medium text-slate-700 shrink-0 whitespace-nowrap">
                                {entry.path}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMultiSelectMultiSelect1(entry.selectionId)}
                                className="ml-auto text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-default shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ gridColumn: "span 8", gridRow: "span 1" }}>
              <div
                className="w-full rounded"
                style={{
                  overflow: "visible",
                  display: "grid",
                  gridTemplateColumns: "repeat(8, 1fr)",
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
