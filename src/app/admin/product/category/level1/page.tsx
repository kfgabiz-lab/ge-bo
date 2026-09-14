"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import PageLayout from "@/components/layout/page-layout";
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
  applyUrlParamFormOverrides,
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
  fields: [
    {
      id: "fb_c6t6avhdc",
      type: "input",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "code",
      readonly: false,
      required: true,
      maxLength: 20,
      minLength: 1,
      labelMsgKey: "common.label.code",
      showCharCount: true,
    },
    {
      id: "fb_1zk298u1i",
      type: "input",
      label: "카테고리명",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "title",
      required: true,
      maxLength: 50,
      minLength: 1,
      labelMsgKey: "category.label.categoryname",
      placeholder: "LV Devices and Systems",
      showCharCount: true,
      placeholderMsgKey: "category.placeholder.categoryname",
      dataGenerations: [
        {
          generationKey: "seo.slug",
          dataReplacement: "hyphen",
          caseChange: "lower",
          truncateLength: 151,
          onlyIfEmpty: true,
        },
        {
          generationKey: "seo.meta_title",
          truncateLength: 61,
          onlyIfEmpty: true,
        },
      ],
      descriptionMsgKey: "common.description.categoryname",
    },
    {
      id: "fb_8jkg6259n",
      type: "input",
      label: "카테고리명 보조설명",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "sub_title",
      maxLength: 50,
      minLength: 1,
      description: "카테고리명을 설명 할 수 있는 추가설명을 입력하세요.",
      labelMsgKey: "category.label.subdescription",
      placeholder: "Low voltage Devices and Systems",
      showCharCount: true,
      descriptionMsgKey: "category.description.categoryname",
      placeholderMsgKey: "category.placeholder.subdiscription",
    },
    {
      id: "fb_6a4wzv30j",
      type: "radio",
      label: "공개설정",
      colSpan: 8,
      options: ["공개:001", "비공개:002"],
      rowSpan: 1,
      fieldKey: "is_visible",
      required: true,
      description:
        "비공개 시 GNB를 포함한 모든 영역에 해당 카테고리가 비공개되며, Devices & Systems 해당 카테고리 소개 페이지에도 접근할 수 없습니다. ",
      labelMsgKey: "common.label.isVisible",
      codeGroupCode: "VISIBILITY",
      descriptionMsgKey: "category.label.invisible.subtext",
      defaultOptionValue: "001",
    },
    {
      id: "fb_lvj0kg1ig",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "depth",
      defaultValue: "1",
    },
    {
      id: "fb_1t8nhbnpf",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "parentId",
      defaultValue: "1",
    },
    {
      id: "fb_4mgukdlwq",
      type: "hidden",
      label: "",
      fieldKey: "base_url",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "/products-category",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_ejcai1mh0_t0_w_vfjob8ivm",
  contentKey: "category",
  showBorder: false,
  connectedSlug: "category-data",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1];
const FORM_WIDGET_Form2: FormWidget = {
  type: "form",
  widgetId: "w_ejcai1mh0_t1_w_vfjob8ivm",
  contentKey: "device_systems",
  fields: [
    {
      id: "fb_5vo3qrmq9",
      type: "textarea",
      label: "",
      fieldKey: "description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "category.label.description",
      descriptionMsgKey: "category.description.categorydesc",
      placeholderMsgKey: "category.placeholder.categorydesc",
      minLength: 150,
      maxLength: 400,
      required: true,
      showCharCount: true,
      dataGenerations: [
        {
          generationKey: "seo.meta_description",
          truncateLength: 181,
          onlyIfEmpty: true,
        },
      ],
    },
  ],
  connectedSlug: "category-data",
  showBorder: false,
};
const FORM_FIELDS_Form2: FormFieldItem[] = FORM_WIDGET_Form2.fields;
const FORM_FIELD_BY_ID_Form2: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form2.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form2 = buildKeyToId(FORM_FIELDS_Form2);
const FORM_WIDGET_Form3: FormWidget = {
  type: "form",
  widgetId: "w_ejcai1mh0_t1_w_aesr29ile",
  contentKey: "seo",
  fields: [
    {
      id: "fb_s1795a46u",
      type: "input",
      label: "",
      fieldKey: "slug",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.lable.seo.slug",
      showCharCount: true,
      maxLength: 150,
      descriptionMsgKey: "category.descrtiption.slug",
      placeholderMsgKey: "category.placeholder.slug",
      pattern: "^[a-z0-9-]+$",
      patternDescMsgKey: "common.label.slugPattern",
    },
    {
      id: "fb_z1s65xmz2",
      type: "input",
      label: "",
      fieldKey: "meta_title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.seo.metaTitle",
      descriptionMsgKey: "common.description.metatitle",
      placeholderMsgKey: "category.placeholder.metatitle",
    },
    {
      id: "fb_4x3po3can",
      type: "textarea",
      label: "",
      fieldKey: "meta_description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.seo.metaDescription",
      showCharCount: true,
      maxLength: 180,
      descriptionMsgKey: "category.description.metadesc",
      placeholderMsgKey: "product.metaDescription.placeholder",
    },
  ],
  showBorder: false,
  connectedSlug: "category-data",
};
const FORM_FIELDS_Form3: FormFieldItem[] = FORM_WIDGET_Form3.fields;
const FORM_FIELD_BY_ID_Form3: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form3.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form3 = buildKeyToId(FORM_FIELDS_Form3);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1, FORM_WIDGET_Form2, FORM_WIDGET_Form3];
const CONTENT_WIDGETS_Space2_1: ContentSaveWidget[] = [FORM_WIDGET_Form2, FORM_WIDGET_Form3];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("category.label.title"));
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
  const [formValuesForm2, setFormValuesForm2] = useState<Record<string, string>>({});
  const [formValuesForm3, setFormValuesForm3] = useState<Record<string, string>>({});
  const [activeTabTab1, setActiveTabTab1] = useState(0);
  const [savedTabsTab1, setSavedTabsTab1] = useState<Set<number>>(() => new Set(storedId !== null ? [0] : []));

  const urlParams = useMemo(() => {
    const skip = new Set(["id", "group_id"]);
    const map: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!skip.has(key)) map[key] = value;
    });
    return map;
  }, [searchParams]);

  const allFieldKeyToId = useMemo(() => buildFieldKeyIdAndLabelMaps(ALL_FORM_WIDGETS, t).allFieldKeyToId, [t]);
  const allFormValues = useMemo(
    () => Object.assign({}, formValuesForm1, formValuesForm2, formValuesForm3) as Record<string, string>,
    [formValuesForm1, formValuesForm2, formValuesForm3]
  );
  const lastGeneratedRef = useRef<Record<string, string>>({});

  const writeFormValue = useCallback(
    (fieldId: string, value: string) => {
      if (FORM_FIELD_BY_ID_Form1[fieldId]) {
        setFormValuesForm1((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form2[fieldId]) {
        setFormValuesForm2((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form3[fieldId]) {
        setFormValuesForm3((prev) => ({ ...prev, [fieldId]: value }));
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
      const defaults = applyUrlParamFormOverrides(
        initFormDefaultValues(ALL_FORM_WIDGETS, t),
        ALL_FORM_WIDGETS,
        searchParams
      );
      setFormValuesForm1(defaults["w_ejcai1mh0_t0_w_vfjob8ivm"] ?? {});
      setFormValuesForm2(defaults["w_ejcai1mh0_t1_w_vfjob8ivm"] ?? {});
      setFormValuesForm3(defaults["w_ejcai1mh0_t1_w_aesr29ile"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/category-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_ejcai1mh0_t0_w_vfjob8ivm"] ?? {}) }));
        setFormValuesForm2((prev) => ({ ...prev, ...(valuesByWidgetId["w_ejcai1mh0_t1_w_vfjob8ivm"] ?? {}) }));
        setFormValuesForm3((prev) => ({ ...prev, ...(valuesByWidgetId["w_ejcai1mh0_t1_w_aesr29ile"] ?? {}) }));
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
      const newFileIdsByFieldId = await uploadContentFormFiles(CONTENT_WIDGETS_Space1_1, {}, "category-data", false);
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space1_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_ejcai1mh0_t0_w_vfjob8ivm: formValuesForm1 },
        formFileIdsMap,
        {},
        {},
        {},
        undefined,
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "category-data",
        dataJson,
        pkKeys,
        templateSlug: "category-level1",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [8],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: true,
      });
      toast.success(isUpdate ? t("common.updated") : t("common.saved"));
      setSavedTabsTab1((prev) => new Set([...prev, 0]));
      markClean();
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (response?.status === 409) {
        toast.error(response.data?.message || t("common.error.duplicate_key"));
      } else {
        toast.error(t("common.error.save"));
      }
    }
  };

  const evalFieldConditionForm2 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form2 },
          { ...allFormValues, ...formValuesForm2 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm2, urlParams]
  );
  const resolveTargetFieldIdForm2 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form2[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm2 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm2((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form2[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm2[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form2, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm2[targetFieldId] ?? "") !== "") {
            setFormValuesForm2((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm2);
    },
    [formValuesForm2, markDirty, applyFieldGenerations, resolveTargetFieldIdForm2]
  );

  const visibleFieldsForm2 = FORM_FIELDS_Form2.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm2(f.hideCondition))
  );
  const fieldRowIsAutoForm2 = calculateFormFieldRowTracks(visibleFieldsForm2, 12, false);

  const evalFieldConditionForm3 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form3 },
          { ...allFormValues, ...formValuesForm3 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm3, urlParams]
  );
  const resolveTargetFieldIdForm3 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form3[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm3 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm3((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form3[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm3[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form3, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm3[targetFieldId] ?? "") !== "") {
            setFormValuesForm3((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm3);
    },
    [formValuesForm3, markDirty, applyFieldGenerations, resolveTargetFieldIdForm3]
  );

  const handleFieldBlurForm3 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form3[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm3(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm3]
  );

  const visibleFieldsForm3 = FORM_FIELDS_Form3.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm3(f.hideCondition))
  );
  const fieldRowIsAutoForm3 = calculateFormFieldRowTracks(visibleFieldsForm3, 12, false);

  const handleContentActionSpace2_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form2, formValuesForm2, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form3, formValuesForm3, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(CONTENT_WIDGETS_Space2_1, {}, "category-data", false);
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space2_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space2_1 as Parameters<typeof buildDataJson>[0],
        { w_ejcai1mh0_t1_w_vfjob8ivm: formValuesForm2, w_ejcai1mh0_t1_w_aesr29ile: formValuesForm3 },
        formFileIdsMap,
        {},
        {},
        {},
        undefined,
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "category-data",
        dataJson,
        pkKeys,
        templateSlug: "category-level1",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form2, ...FORM_FIELDS_Form3],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: true,
      });
      toast.success(isUpdate ? t("common.updated") : t("common.saved"));
      setSavedTabsTab1((prev) => new Set([...prev, 1]));
      markClean();
    } catch (err: unknown) {
      const response = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (response?.status === 409) {
        toast.error(response.data?.message || t("common.error.duplicate_key"));
      } else {
        toast.error(t("common.error.save"));
      }
    }
  };

  const handleTabClickTab1 = (idx: number) => {
    if (idx > 0 && !savedTabsTab1.has(0)) {
      toast.warning(t("common.tab.save_required", { tab: t("common.lable.basicInformation") }));
      return;
    }
    setActiveTabTab1(idx);
  };

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={9} autoHeight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: `auto auto auto auto auto auto auto auto auto`,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 12", gridRow: "span 9" }}>
            <div className="h-full w-full flex flex-col rounded border border-slate-300 bg-white shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleTabClickTab1(0)}
                  className={
                    activeTabTab1 === 0
                      ? "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-slate-800 text-slate-900 bg-white"
                      : "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-slate-500 hover:text-slate-700"
                  }
                >
                  {t("common.lable.basicInformation")}
                </button>
                <button
                  type="button"
                  onClick={() => handleTabClickTab1(1)}
                  className={
                    activeTabTab1 === 1
                      ? "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-slate-800 text-slate-900 bg-white"
                      : "px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors border-transparent text-slate-500 hover:text-slate-700"
                  }
                >
                  {t("common.label.dns")}
                </button>
              </div>
              <div className="flex-1 overflow-auto min-h-0 pt-2">
                <div className={activeTabTab1 === 0 ? "h-full" : "hidden"}>
                  <PageGridContainer>
                    <GridCell colSpan={12} rowSpan={6} autoHeight>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(12, 1fr)",
                          gridTemplateRows: `auto auto auto auto auto auto`,
                          gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                          gridAutoFlow: "row dense",
                          rowGap: `${GAP_SIZE}px`,
                          columnGap: 0,
                        }}
                      >
                        <div style={{ gridColumn: "span 12", gridRow: "span 5" }}>
                          <div
                            className="w-full rounded"
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
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("common.label.code")}
                                <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("common.input.placeholder")}
                                    maxLength={20}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                    value={formValuesForm1["fb_c6t6avhdc"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm1("fb_c6t6avhdc", e.target.value)}
                                    onBlur={() => handleFieldBlurForm1("fb_c6t6avhdc")}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                    {(formValuesForm1["fb_c6t6avhdc"] ?? "").length}/{20}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("category.label.categoryname")}
                                <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("common.description.categoryname")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("category.placeholder.categoryname")}
                                    maxLength={50}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                    value={formValuesForm1["fb_1zk298u1i"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm1("fb_1zk298u1i", e.target.value)}
                                    onBlur={() => handleFieldBlurForm1("fb_1zk298u1i")}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                    {(formValuesForm1["fb_1zk298u1i"] ?? "").length}/{50}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("category.label.subdescription")}
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("category.description.categoryname")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("category.placeholder.subdiscription")}
                                    maxLength={50}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                    value={formValuesForm1["fb_8jkg6259n"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm1("fb_8jkg6259n", e.target.value)}
                                    onBlur={() => handleFieldBlurForm1("fb_8jkg6259n")}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                    {(formValuesForm1["fb_8jkg6259n"] ?? "").length}/{50}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("common.label.isVisible")}
                                <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("category.label.invisible.subtext")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="flex items-center gap-4">
                                  {resolveFieldOptions(
                                    FORM_FIELD_BY_ID_Form1["fb_6a4wzv30j"] as unknown as SearchFieldConfig,
                                    groups
                                  ).map((opt) => {
                                    const parsed = parseOpt(opt);
                                    return (
                                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`${uid}-field-fb_6a4wzv30j`}
                                          disabled={false}
                                          value={parsed.value}
                                          checked={(formValuesForm1["fb_6a4wzv30j"] ?? "") === parsed.value}
                                          onChange={() => handleFieldChangeForm1("fb_6a4wzv30j", parsed.value)}
                                          className="w-4 h-4 cursor-pointer"
                                        />
                                        <span className="text-sm text-slate-700">{t(parsed.text)}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 1", gridRow: "span 1" }}
                            >
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 1", gridRow: "span 1" }}
                            >
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 1", gridRow: "span 1" }}
                            >
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe"></div>
                            </div>
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 3", gridRow: "span 1" }}>
                          <div
                            className="w-full rounded"
                            style={{
                              overflow: "visible",
                              display: "grid",
                              gridTemplateColumns: "repeat(3, 1fr)",
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
                <div className={activeTabTab1 === 1 ? "h-full" : "hidden"}>
                  <PageGridContainer>
                    <GridCell colSpan={12} rowSpan={11} autoHeight>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(12, 1fr)",
                          gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto auto`,
                          gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                          gridAutoFlow: "row dense",
                          rowGap: `${GAP_SIZE}px`,
                          columnGap: 0,
                        }}
                      >
                        <div style={{ gridColumn: "span 12", gridRow: "span 4" }}>
                          <div
                            className="w-full rounded"
                            style={{
                              overflow: "clip",
                              display: "grid",
                              gridTemplateColumns: "repeat(12, 1fr)",
                              gridTemplateRows:
                                fieldRowIsAutoForm2.length > 0
                                  ? fieldRowIsAutoForm2.map((a) => (a ? "auto" : "78px")).join(" ")
                                  : undefined,
                              gridAutoRows: `78px`,
                              rowGap: `12px`,
                              columnGap: `12px`,
                              paddingTop: "10px",
                              paddingBottom: "10px",
                            }}
                          >
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 3" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("category.label.description")}
                                <span className="text-red-500 ml-0.5">*</span>
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("category.description.categorydesc")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="flex flex-col h-full">
                                  <textarea
                                    disabled={false}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                    value={formValuesForm2["fb_5vo3qrmq9"] ?? ""}
                                    maxLength={400}
                                    placeholder={t("category.placeholder.categorydesc")}
                                    onChange={(e) => handleFieldChangeForm2("fb_5vo3qrmq9", e.target.value)}
                                  />
                                  <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                    {(formValuesForm2["fb_5vo3qrmq9"] ?? "").length}/{400}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 12", gridRow: "span 6" }}>
                          <div
                            className="w-full rounded"
                            style={{
                              overflow: "clip",
                              display: "grid",
                              gridTemplateColumns: "repeat(12, 1fr)",
                              gridTemplateRows:
                                fieldRowIsAutoForm3.length > 0
                                  ? fieldRowIsAutoForm3.map((a) => (a ? "auto" : "78px")).join(" ")
                                  : undefined,
                              gridAutoRows: `78px`,
                              rowGap: `12px`,
                              columnGap: `12px`,
                              paddingTop: "10px",
                              paddingBottom: "10px",
                            }}
                          >
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("common.lable.seo.slug")}
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("category.descrtiption.slug")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="relative">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("category.placeholder.slug")}
                                    maxLength={150}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                    value={formValuesForm3["fb_s1795a46u"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm3("fb_s1795a46u", e.target.value)}
                                    onBlur={() => handleFieldBlurForm3("fb_s1795a46u")}
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                    {(formValuesForm3["fb_s1795a46u"] ?? "").length}/{150}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 1" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("common.label.seo.metaTitle")}
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("common.description.metatitle")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <input
                                  type="text"
                                  disabled={false}
                                  placeholder={t("category.placeholder.metatitle")}
                                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                                  value={formValuesForm3["fb_z1s65xmz2"] ?? ""}
                                  onChange={(e) => handleFieldChangeForm3("fb_z1s65xmz2", e.target.value)}
                                  onBlur={() => handleFieldBlurForm3("fb_z1s65xmz2")}
                                />
                              </div>
                            </div>
                            <div
                              className="flex flex-col px-3 min-w-0"
                              style={{ gridColumn: "span 8", gridRow: "span 3" }}
                            >
                              <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                {t("common.label.seo.metaDescription")}
                              </label>
                              <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                {t("category.description.metadesc")}
                              </p>
                              <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                <div className="flex flex-col h-full">
                                  <textarea
                                    disabled={false}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                    value={formValuesForm3["fb_4x3po3can"] ?? ""}
                                    maxLength={180}
                                    placeholder={t("product.metaDescription.placeholder")}
                                    onChange={(e) => handleFieldChangeForm3("fb_4x3po3can", e.target.value)}
                                  />
                                  <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                    {(formValuesForm3["fb_4x3po3can"] ?? "").length}/{180}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div style={{ gridColumn: "span 2", gridRow: "span 1" }}>
                          <div
                            className="w-full rounded"
                            style={{
                              overflow: "visible",
                              display: "grid",
                              gridTemplateColumns: "repeat(2, 1fr)",
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
                                  handleContentActionSpace2_1();
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
              </div>
            </div>
          </div>
        </div>
      </GridCell>
    </PageLayout>
  );
}
