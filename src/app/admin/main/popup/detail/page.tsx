"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import { PageGridContainer } from "@/components/layout/page-grid-container";
import { usePageTitleStore } from "@/store/use-page-title-store";
import { useI18n } from "@/hooks/use-i18n";
import { useLeaveCheck } from "@/app/admin/templates/make/_shared/hooks/useLeaveCheck";
import type { FormWidget, FormFieldItem } from "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
import {
  buildKeyToId,
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
import { Calendar, Image as ImageIcon, Plus, X } from "lucide-react";
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
  fields: [
    {
      id: "fb_z7wrbcta1",
      type: "input",
      label: "제목",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "title",
      required: true,
      labelMsgKey: "common.label.title",
      descriptionMsgKey: "hero.title.desc",
      placeholderMsgKey: "common.placeholder.title",
      maxLength: 100,
      showCharCount: true,
    },
    {
      id: "fb_fyampuels",
      type: "dateRange",
      label: "",
      fieldKey: "post_period",
      colSpan: 8,
      rowSpan: 1,
      rangeSubType: "datetime",
      labelMsgKey: "common.label.period",
      required: true,
    },
    {
      id: "fb_x9vc8nlng",
      type: "input",
      label: "",
      fieldKey: "url",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "popup.label.url",
      required: true,
      placeholderMsgKey: "main.placeholder.url",
      descriptionMsgKey: "hero.button.subDesc",
      pattern: "^https:\\/\\/[^\\s\\/$.?#].[^\\s]*$",
      patternDesc: "https:// 포함 URL 입력",
      patternDescMsgKey: "common.placeholder.url",
    },
    {
      id: "fb_zjocl2jit",
      type: "image",
      label: "이미지업로드",
      colSpan: 8,
      rowSpan: 3,
      fieldKey: "image",
      required: true,
      description: "게시물 이미지를 업로드하세요.",
      maxFileSizeMB: 5,
      descriptionMsgKey: "popup.label.imgDesc",
      labelMsgKey: "popup.label.imgUpload",
      imageMaxWidthPx: 400,
      imageMaxHeightPx: 560,
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_hn0fksz3y",
  contentKey: "popup",
  showBorder: true,
  connectedSlug: "popup-data",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1];
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
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("popup.label.title"));
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
      const defaults = initFormDefaultValues(ALL_FORM_WIDGETS, t);
      setFormValuesForm1(defaults["w_hn0fksz3y"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/popup-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_hn0fksz3y"] ?? {}) }));
        const fileIds = collectFileIdsDeep(dataJson);
        if (fileIds.length === 0) return;
        const metaList = await fetchFileMetaByIds(fileIds, false);
        const sectionForm1 = findSection(dataJson, "popup");
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
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(
        CONTENT_WIDGETS_Space1_1,
        { w_hn0fksz3y: fileValuesForm1 },
        "popup-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(
        CONTENT_WIDGETS_Space1_1,
        { w_hn0fksz3y: existingFileMetaForm1 },
        newFileIdsByFieldId
      );
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_hn0fksz3y: formValuesForm1 },
        formFileIdsMap,
        {},
        {},
        {},
        "popup-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "popup-data",
        dataJson,
        pkKeys,
        templateSlug: "popup-detail",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1],
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
          const savedSectionForm1 = dataJson["popup"] as Record<string, unknown>;
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.title")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("hero.title.desc")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("common.placeholder.title")}
                        maxLength={100}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm1["fb_z7wrbcta1"] ?? ""}
                        onChange={(e) => handleFieldChangeForm1("fb_z7wrbcta1", e.target.value)}
                        onBlur={() => handleFieldBlurForm1("fb_z7wrbcta1")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm1["fb_z7wrbcta1"] ?? "").length}/{100}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.period")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="datetime-local"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm1["fb_fyampuels_from"] ?? ""}
                          onChange={(e) => handleFieldChangeForm1("fb_fyampuels_from", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                      <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="datetime-local"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm1["fb_fyampuels_to"] ?? ""}
                          onChange={(e) => handleFieldChangeForm1("fb_fyampuels_to", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("popup.label.url")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("hero.button.subDesc")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("main.placeholder.url")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      value={formValuesForm1["fb_x9vc8nlng"] ?? ""}
                      onChange={(e) => handleFieldChangeForm1("fb_x9vc8nlng", e.target.value)}
                      onBlur={() => handleFieldBlurForm1("fb_x9vc8nlng")}
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("popup.label.imgUpload")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("popup.label.imgDesc")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    {(() => {
                      const maxCount = 1;
                      const existingList = existingFileMetaForm1["fb_zjocl2jit"] ?? [];
                      const newList = fileValuesForm1["fb_zjocl2jit"] ?? [];
                      const currentCount = existingList.length + newList.length;
                      const canAdd = currentCount < maxCount;
                      const handleImgSelect = async (selected: File[]) => {
                        const { valid, rejected } = filterByAccept(selected, ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp");
                        if (rejected.length > 0)
                          alert(`${t("common.field.invalid_file_type")}\n${rejected.join("\n")}`);
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
                          const violation = checkImagePixelLimit(naturalSize, 400, 560);
                          if (violation === "width") {
                            toast.warning(t("common.field.image_width_limit", { label: file.name, px: "400" }));
                            continue;
                          }
                          if (violation === "height") {
                            toast.warning(t("common.field.image_height_limit", { label: file.name, px: "560" }));
                            continue;
                          }
                          passed.push(file);
                        }
                        if (passed.length > 0)
                          handleFileChangeForm1("fb_zjocl2jit", [...newList, ...passed].slice(0, maxCount));
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
                                            onClick={() => handleRemoveExistingForm1("fb_zjocl2jit", item.meta.id)}
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
                                                "fb_zjocl2jit",
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
