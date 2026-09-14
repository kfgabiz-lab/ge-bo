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
  filterByAccept,
  unitToBytes,
  getImageNaturalSize,
  checkImagePixelLimit,
  buildFieldKeyIdAndLabelMaps,
  applyDataGeneration,
  splitGenerationKeys,
  evalConditionExpr,
  buildFieldConditionResolver,
  findOptionFilterResetTargetIds,
  initFormDefaultValues,
  applyUrlParamFormOverrides,
  buildFormValuesFromDataJson,
  findSection,
  validateFormFields,
  buildDataJson,
} from "@/app/admin/templates/make/_shared/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { Image as ImageIcon, Plus, X } from "lucide-react";
import {
  collectFileIdsDeep,
  fetchFileMetaByIds,
  fetchFileBlobUrl,
  uploadContentFormFiles,
  buildFormFileIdsMap,
  persistContentDataJson,
  deletePendingFiles,
} from "@/app/admin/templates/make/_shared/utils/contentSave";
import { calculateFormFieldRowTracks } from "@/app/admin/templates/make/_shared/utils/formGridLayout";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  widgetId: "w_zzovl14sm",
  contentKey: "curriculum",
  fields: [
    {
      id: "fb_3ny9y6no2",
      type: "radio",
      label: "",
      fieldKey: "training_course",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "currMgmt.label.trainingSelect",
      required: true,
      options: ["Engineering Training:01", "Service Training:02", "Sales Training:03"],
      codeGroupCode: "TRAININGCOURSE",
      defaultOptionValue: "01",
    },
    {
      id: "fb_chgw1pciw",
      type: "radio",
      label: "",
      fieldKey: "product_category",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.selectCategory",
      options: ["Power:P", "Automation:A"],
      codeGroupCode: "PRODUCTCATEGORY",
      defaultOptionValue: "P",
      required: true,
      descriptionMsgKey: "course.desciption.courseCategory",
    },
    {
      id: "fb_rmbrnedj9",
      type: "input",
      label: "",
      fieldKey: "title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.title",
      required: true,
      placeholderMsgKey: "course.placeholder.title",
      descriptionMsgKey: "course.desciption.title",
      maxLength: 150,
      minLength: 5,
      pattern: "^[^:]*$",
      patternDesc: '" : " 문자를 제외 후 입력해주세요. ',
      showCharCount: true,
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
          truncateLength: 151,
          onlyIfEmpty: true,
        },
      ],
    },
    {
      id: "fb_ec5ci2pan",
      type: "textarea",
      label: "",
      fieldKey: "description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.description",
      descriptionMsgKey: "course.desciption.courseDescription",
      required: true,
      showCharCount: true,
      minLength: 5,
      maxLength: 600,
      pattern: "",
      patternDesc: "영어만 입력",
      dataGenerations: [
        {
          generationKey: "seo.meta_description",
          truncateLength: 181,
          onlyIfEmpty: true,
        },
      ],
      placeholderMsgKey: "common.input.textarea_placeholder",
    },
    {
      id: "fb_469vl1vff",
      type: "image",
      label: "",
      fieldKey: "image",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.image",
      descriptionMsgKey: "currMgmt.descripton.image",
      required: true,
      maxFileSizeMB: 5,
      imageMaxWidthPx: 812,
      imageMaxHeightPx: 525,
    },
    {
      id: "fb_rb9w23ew6",
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
  connectedSlug: "currMgmt-data",
  showBorder: true,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const FILE_FIELD_TYPE_SET = new Set<string>(["file", "image", "video", "media"]);

function FileInput({
  accept,
  multiple,
  onChange,
  renderTrigger,
}: {
  accept?: string;
  multiple?: boolean;
  onChange: (files: File[]) => void;
  renderTrigger: (inputRef: React.RefObject<HTMLInputElement | null>) => React.ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Array.from(e.target.files ?? []));
    e.target.value = "";
  };
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        style={{ display: "none" }}
        onChange={handleChange}
      />
      {renderTrigger(inputRef)}
    </>
  );
}

function FileImagePreview({ file, className }: { file: File; className?: string }) {
  const [src, setSrc] = React.useState("");
  React.useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  return src ? <img src={src} alt={file.name} className={className} /> : null;
}

const fmtFileSize = (bytes: number) =>
  bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;

function FileInfoBar({ name, size, onDownload }: { name: string; size: number; onDownload: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex-shrink-0 px-1.5 py-1 bg-slate-50/80 border-t border-slate-100">
      <button
        type="button"
        title={t("common.field.download_hint")}
        onClick={onDownload}
        className="block w-full text-left text-xs font-medium truncate hover:text-blue-600 hover:underline transition-colors"
      >
        {name}
        <span className="text-[10px] text-slate-400 font-normal">({fmtFileSize(size)})</span>
      </button>
    </div>
  );
}

async function downloadStoredFile(fileId: number, origName: string, errorMessage: string) {
  try {
    const res = await api.get(`/page-files/${fileId}`, { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = origName;
    a.click();
    URL.revokeObjectURL(url);
  } catch {
    toast.error(errorMessage);
  }
}

function downloadLocalFile(file: File) {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(url);
}
const FORM_WIDGET_Form2: FormWidget = {
  type: "form",
  widgetId: "w_58cn5vt1q",
  contentKey: "seo",
  fields: [
    {
      id: "fb_10zm0blvj",
      type: "input",
      label: "",
      fieldKey: "slug",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.lable.seo.slug",
      descriptionMsgKey: "common.description.seo.slug",
      placeholderMsgKey: "common.placeholder.seo.slug",
      showCharCount: true,
      maxLength: 150,
      pattern: "^[a-z0-9-]+$",
      patternDesc: "",
      patternDescMsgKey: "common.label.slugPattern",
    },
    {
      id: "fb_yd8wmlyi7",
      type: "input",
      label: "",
      fieldKey: "meta_title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.seo.metaTitle",
      descriptionMsgKey: "common.description.seo.metaTitle",
      placeholderMsgKey: "common.create.placeholder.title",
      maxLength: 150,
      showCharCount: true,
    },
    {
      id: "fb_k8ljy2dyv",
      type: "textarea",
      label: "",
      fieldKey: "meta_description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.seo.metaDescription",
      descriptionMsgKey: "common.description.seo.metaDescription",
      placeholderMsgKey: "common.placeholder.seo.metaDescription",
      showCharCount: true,
      maxLength: 180,
    },
  ],
  connectedSlug: "currMgmt-data",
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form2: FormFieldItem[] = FORM_WIDGET_Form2.fields;
const FORM_FIELD_BY_ID_Form2: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form2.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form2 = buildKeyToId(FORM_FIELDS_Form2);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1, FORM_WIDGET_Form2];
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1, FORM_WIDGET_Form2];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("course.label.title"));
  }, [setPageTitle, t]);
  const { markDirty, markClean, confirmLeave } = useLeaveCheck(true);
  const searchParams = useSearchParams();
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});
  const pendingDeleteFileIds = useRef<Set<number>>(new Set());
  const [formValuesForm1, setFormValuesForm1] = useState<Record<string, string>>({});
  const [fileValuesForm1, setFileValuesForm1] = useState<Record<string, File[]>>({});
  const [existingFileMetaForm1, setExistingFileMetaForm1] = useState<
    Record<string, { id: number; origName: string; fileSize: number }[]>
  >({});
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const uid = useId();
  const [formValuesForm2, setFormValuesForm2] = useState<Record<string, string>>({});
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
  const allFormValues = useMemo(
    () => Object.assign({}, formValuesForm1, formValuesForm2) as Record<string, string>,
    [formValuesForm1, formValuesForm2]
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

  const handleFileChangeForm1 = useCallback(
    (fieldId: string, files: File[]) => {
      setFileValuesForm1((prev) => ({ ...prev, [fieldId]: files }));
      markDirty();
    },
    [markDirty]
  );
  const handleRemoveExistingForm1 = useCallback(
    (fieldId: string, fileId: number) => {
      pendingDeleteFileIds.current.add(fileId);
      setExistingFileMetaForm1((prev) => ({
        ...prev,
        [fieldId]: (prev[fieldId] ?? []).filter((f) => f.id !== fileId),
      }));
      setImgBlobUrls((prev) => {
        const next = { ...prev };
        delete next[fileId];
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  useEffect(() => {
    if (storedId === null) {
      if (!sitesLoaded || !clockReady) return;
      const defaults = applyUrlParamFormOverrides(
        initFormDefaultValues(ALL_FORM_WIDGETS, t),
        ALL_FORM_WIDGETS,
        searchParams
      );
      setFormValuesForm1(defaults["w_zzovl14sm"] ?? {});
      setFormValuesForm2(defaults["w_58cn5vt1q"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/currMgmt-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_zzovl14sm"] ?? {}) }));
        setFormValuesForm2((prev) => ({ ...prev, ...(valuesByWidgetId["w_58cn5vt1q"] ?? {}) }));
        const fileIds = collectFileIdsDeep(dataJson);
        if (fileIds.length === 0) return;
        const metaList = await fetchFileMetaByIds(fileIds, false);
        const sectionForm1 = findSection(dataJson, "curriculum");
        const metaByFieldIdForm1: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
        FORM_FIELDS_Form1.forEach((f) => {
          if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;
          const ids = sectionForm1[f.fieldKey];
          if (!Array.isArray(ids)) return;
          metaByFieldIdForm1[f.id] = (ids as number[])
            .map((id) => metaList.find((m) => m.id === id))
            .filter((m): m is { id: number; origName: string; fileSize: number } => !!m);
          if (f.type === "image" || f.type === "video" || f.type === "media") {
            (ids as number[]).forEach((id) => {
              fetchFileBlobUrl(id, false)
                .then((url) => setImgBlobUrls((prev) => ({ ...prev, [id]: url })))
                .catch(() => {});
            });
          }
        });
        setExistingFileMetaForm1(metaByFieldIdForm1);
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

  const handleFieldBlurForm2 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form2[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm2(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm2]
  );

  const visibleFieldsForm2 = FORM_FIELDS_Form2.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm2(f.hideCondition))
  );
  const fieldRowIsAutoForm2 = calculateFormFieldRowTracks(visibleFieldsForm2, 12, false);

  const handleContentActionSpace1_1 = async () => {
    const isUpdate = storedId !== null;
    if (
      !validateFormFields(
        FORM_FIELDS_Form1,
        formValuesForm1,
        fileValuesForm1,
        existingFileMetaForm1,
        allFormValues,
        allFieldKeyToId,
        t
      )
    )
      return;
    if (!validateFormFields(FORM_FIELDS_Form2, formValuesForm2, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(
        CONTENT_WIDGETS_Space1_1,
        { w_zzovl14sm: fileValuesForm1 },
        "currMgmt-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(
        CONTENT_WIDGETS_Space1_1,
        { w_zzovl14sm: existingFileMetaForm1 },
        newFileIdsByFieldId
      );
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_zzovl14sm: formValuesForm1, w_58cn5vt1q: formValuesForm2 },
        formFileIdsMap,
        {},
        {},
        {},
        "currMgmt-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "currMgmt-data",
        dataJson,
        pkKeys,
        templateSlug: "currMgmt-basicInfo",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1, ...FORM_FIELDS_Form2],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: false,
        onFilesLinked: () => {
          setFileValuesForm1({});
        },
      });
      try {
        const savedFileIds = collectFileIdsDeep(dataJson);
        if (savedFileIds.length > 0) {
          const metaList = await fetchFileMetaByIds(savedFileIds, false);
          const savedSectionForm1 = dataJson["curriculum"] as Record<string, unknown>;
          const savedMetaByFieldIdForm1: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
          FORM_FIELDS_Form1.forEach((f) => {
            if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;
            const ids = savedSectionForm1[f.fieldKey];
            if (!Array.isArray(ids)) return;
            savedMetaByFieldIdForm1[f.id] = (ids as number[])
              .map((id) => metaList.find((m) => m.id === id))
              .filter((m): m is { id: number; origName: string; fileSize: number } => !!m);
            if (f.type === "image" || f.type === "video" || f.type === "media") {
              (ids as number[]).forEach((id) => {
                if (imgBlobUrls[id]) return;
                fetchFileBlobUrl(id, false)
                  .then((url) => setImgBlobUrls((prev) => ({ ...prev, [id]: url })))
                  .catch(() => {});
              });
            }
          });
          setExistingFileMetaForm1(savedMetaByFieldIdForm1);
        }
      } catch {}
      if (pendingDeleteFileIds.current.size > 0) {
        await deletePendingFiles(Array.from(pendingDeleteFileIds.current), false);
        pendingDeleteFileIds.current.clear();
      }
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
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={18} autoHeight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto`,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 12", gridRow: "span 11" }}>
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
                  {t("currMgmt.label.trainingSelect")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="flex items-center gap-4">
                    {resolveFieldOptions(
                      FORM_FIELD_BY_ID_Form1["fb_3ny9y6no2"] as unknown as SearchFieldConfig,
                      groups
                    ).map((opt) => {
                      const parsed = parseOpt(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${uid}-field-fb_3ny9y6no2`}
                            disabled={false}
                            value={parsed.value}
                            checked={(formValuesForm1["fb_3ny9y6no2"] ?? "") === parsed.value}
                            onChange={() => handleFieldChangeForm1("fb_3ny9y6no2", parsed.value)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-slate-700">{t(parsed.text)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.selectCategory")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("course.desciption.courseCategory")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="flex items-center gap-4">
                    {resolveFieldOptions(
                      FORM_FIELD_BY_ID_Form1["fb_chgw1pciw"] as unknown as SearchFieldConfig,
                      groups
                    ).map((opt) => {
                      const parsed = parseOpt(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${uid}-field-fb_chgw1pciw`}
                            disabled={false}
                            value={parsed.value}
                            checked={(formValuesForm1["fb_chgw1pciw"] ?? "") === parsed.value}
                            onChange={() => handleFieldChangeForm1("fb_chgw1pciw", parsed.value)}
                            className="w-4 h-4 cursor-pointer"
                          />
                          <span className="text-sm text-slate-700">{t(parsed.text)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.title")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("course.desciption.title")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("course.placeholder.title")}
                      maxLength={150}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                      value={formValuesForm1["fb_rmbrnedj9"] ?? ""}
                      onChange={(e) => handleFieldChangeForm1("fb_rmbrnedj9", e.target.value)}
                      onBlur={() => handleFieldBlurForm1("fb_rmbrnedj9")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      {(formValuesForm1["fb_rmbrnedj9"] ?? "").length}/{150}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.description")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("course.desciption.courseDescription")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="flex flex-col h-full">
                    <textarea
                      disabled={false}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                      value={formValuesForm1["fb_ec5ci2pan"] ?? ""}
                      maxLength={600}
                      placeholder={t("common.input.textarea_placeholder")}
                      onChange={(e) => handleFieldChangeForm1("fb_ec5ci2pan", e.target.value)}
                    />
                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                      {(formValuesForm1["fb_ec5ci2pan"] ?? "").length}/{600}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.image")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("currMgmt.descripton.image")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  {(() => {
                    const maxCount = 1;
                    const existingList = existingFileMetaForm1["fb_469vl1vff"] ?? [];
                    const newList = fileValuesForm1["fb_469vl1vff"] ?? [];
                    const currentCount = existingList.length + newList.length;
                    const canAdd = currentCount < maxCount;
                    const handleImgSelect = async (selected: File[]) => {
                      const { valid, rejected } = filterByAccept(selected, ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp");
                      if (rejected.length > 0) alert(`${t("common.field.invalid_file_type")}\n${rejected.join("\n")}`);
                      if (valid.length === 0) return;
                      const passed: File[] = [];
                      for (const file of valid) {
                        if (file.size > 5 * unitToBytes("MB")) {
                          toast.warning(
                            t("common.field.file_size_limit", { type: t("common.label.image"), mb: "5MB" })
                          );
                          continue;
                        }
                        const naturalSize = await getImageNaturalSize(file);
                        const violation = checkImagePixelLimit(naturalSize, 812, 525);
                        if (violation === "width") {
                          toast.warning(t("common.field.image_width_limit", { label: file.name, px: "812" }));
                          continue;
                        }
                        if (violation === "height") {
                          toast.warning(t("common.field.image_height_limit", { label: file.name, px: "525" }));
                          continue;
                        }
                        passed.push(file);
                      }
                      if (passed.length > 0)
                        handleFileChangeForm1("fb_469vl1vff", [...newList, ...passed].slice(0, maxCount));
                    };
                    const imgPlaceholder = (
                      <>
                        <ImageIcon className="w-6 h-6" />
                        <span className="text-xs font-medium">{t("common.field.image_add")}</span>
                        <span className="text-[10px] text-center leading-relaxed">
                          {t("common.field.image_format_info", { count: String(maxCount) })}
                        </span>
                      </>
                    );
                    const displayItems: (
                      | { kind: "existing"; meta: { id: number; origName: string; fileSize: number } }
                      | { kind: "new"; file: File; idx: number }
                      | { kind: "add" }
                    )[] = [
                      ...existingList.map((m) => ({ kind: "existing" as const, meta: m })),
                      ...newList.map((f, i) => ({ kind: "new" as const, file: f, idx: i })),
                      ...(canAdd ? [{ kind: "add" as const }] : []),
                    ];
                    const cols = Math.max(1, Math.ceil(Math.sqrt(displayItems.length)));
                    const rows = Math.max(1, Math.ceil(displayItems.length / cols));
                    const cellH = Math.floor((218 - 8 - 4 * (rows - 1)) / rows);
                    return (
                      <div
                        style={{ height: "218px" }}
                        className="flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden"
                        onDragOver={canAdd ? (e) => e.preventDefault() : undefined}
                        onDrop={
                          canAdd
                            ? (e) => {
                                e.preventDefault();
                                const files = Array.from(e.dataTransfer.files);
                                if (files.length > 0) handleImgSelect(files);
                              }
                            : undefined
                        }
                      >
                        {currentCount === 0 ? (
                          canAdd ? (
                            <FileInput
                              accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
                              multiple={maxCount > 1}
                              onChange={handleImgSelect}
                              renderTrigger={(inputRef) => (
                                <div
                                  role="button"
                                  tabIndex={0}
                                  onClick={() => inputRef.current?.click()}
                                  onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                                  className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                  {imgPlaceholder}
                                </div>
                              )}
                            />
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 pointer-events-none">
                              {imgPlaceholder}
                            </div>
                          )
                        ) : (
                          <div className="p-1 overflow-hidden" style={{ height: "218px" }}>
                            <div
                              className="grid gap-1"
                              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridAutoRows: `${cellH}px` }}
                            >
                              {displayItems.map((item, i) => {
                                if (item.kind === "existing") {
                                  return (
                                    <div
                                      key={item.meta.id}
                                      className="relative rounded-md overflow-hidden border border-slate-200 group flex flex-col"
                                    >
                                      <div className="relative flex-1 min-h-0">
                                        {imgBlobUrls[item.meta.id] ? (
                                          <img
                                            src={imgBlobUrls[item.meta.id]}
                                            alt={item.meta.origName}
                                            className="w-full h-full object-contain"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center bg-slate-100">
                                            <ImageIcon className="w-5 h-5 text-slate-300" />
                                          </div>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveExistingForm1("fb_469vl1vff", item.meta.id)}
                                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-2.5 h-2.5 text-white" />
                                        </button>
                                      </div>
                                      <FileInfoBar
                                        name={item.meta.origName}
                                        size={item.meta.fileSize}
                                        onDownload={() =>
                                          downloadStoredFile(
                                            item.meta.id,
                                            item.meta.origName,
                                            t("common.error.file_download")
                                          )
                                        }
                                      />
                                    </div>
                                  );
                                }
                                if (item.kind === "new") {
                                  return (
                                    <div
                                      key={`new-${item.idx}`}
                                      className="relative rounded-md overflow-hidden border border-blue-200 group flex flex-col"
                                    >
                                      <div className="relative flex-1 min-h-0">
                                        <FileImagePreview file={item.file} className="w-full h-full object-contain" />
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleFileChangeForm1(
                                              "fb_469vl1vff",
                                              newList.filter((_, fi) => fi !== item.idx)
                                            )
                                          }
                                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <X className="w-2.5 h-2.5 text-white" />
                                        </button>
                                      </div>
                                      <FileInfoBar
                                        name={item.file.name}
                                        size={item.file.size}
                                        onDownload={() => downloadLocalFile(item.file)}
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <FileInput
                                    key={`add-${i}`}
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
                                    multiple={maxCount > 1}
                                    onChange={handleImgSelect}
                                    renderTrigger={(inputRef) => (
                                      <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
                                        className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all"
                                      >
                                        <Plus className="w-4 h-4" />
                                        <span className="text-[10px] mt-0.5">{t("common.btn.add")}</span>
                                      </div>
                                    )}
                                  />
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                      FORM_FIELD_BY_ID_Form1["fb_rb9w23ew6"] as unknown as SearchFieldConfig,
                      groups
                    ).map((opt) => {
                      const parsed = parseOpt(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${uid}-field-fb_rb9w23ew6`}
                            disabled={false}
                            value={parsed.value}
                            checked={(formValuesForm1["fb_rb9w23ew6"] ?? "") === parsed.value}
                            onChange={() => handleFieldChangeForm1("fb_rb9w23ew6", parsed.value)}
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
          <div style={{ gridColumn: "span 12", gridRow: "span 6" }}>
            <div
              className="w-full rounded border border-slate-200"
              style={{
                overflow: "clip",
                backgroundColor: "#ffffff",
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
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.lable.seo.slug")}
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("common.description.seo.slug")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("common.placeholder.seo.slug")}
                      maxLength={150}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                      value={formValuesForm2["fb_10zm0blvj"] ?? ""}
                      onChange={(e) => handleFieldChangeForm2("fb_10zm0blvj", e.target.value)}
                      onBlur={() => handleFieldBlurForm2("fb_10zm0blvj")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      {(formValuesForm2["fb_10zm0blvj"] ?? "").length}/{150}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.seo.metaTitle")}
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("common.description.seo.metaTitle")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("common.create.placeholder.title")}
                      maxLength={150}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                      value={formValuesForm2["fb_yd8wmlyi7"] ?? ""}
                      onChange={(e) => handleFieldChangeForm2("fb_yd8wmlyi7", e.target.value)}
                      onBlur={() => handleFieldBlurForm2("fb_yd8wmlyi7")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      {(formValuesForm2["fb_yd8wmlyi7"] ?? "").length}/{150}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.seo.metaDescription")}
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("common.description.seo.metaDescription")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="flex flex-col h-full">
                    <textarea
                      disabled={false}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                      value={formValuesForm2["fb_k8ljy2dyv"] ?? ""}
                      maxLength={180}
                      placeholder={t("common.placeholder.seo.metaDescription")}
                      onChange={(e) => handleFieldChangeForm2("fb_k8ljy2dyv", e.target.value)}
                    />
                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                      {(formValuesForm2["fb_k8ljy2dyv"] ?? "").length}/{180}
                    </div>
                  </div>
                </div>
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
    </PageLayout>
  );
}
