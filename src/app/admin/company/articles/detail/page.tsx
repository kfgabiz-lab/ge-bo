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
  extractMultiSelectSelection,
  findSection,
  flattenPageDataItem,
  validateFormFields,
  buildDataJson,
  findMissingRequiredMultiSelect,
} from "@/app/admin/templates/make/_shared/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import { Image as ImageIcon, Plus, X, ChevronDown, Search } from "lucide-react";
import dynamic from "next/dynamic";
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
import type { MultiSelectWidget } from "@/app/admin/templates/make/_shared/components/renderer/types";
import {
  fetchMultiSelectSourceRows,
  buildLabelPathEntries,
} from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import type { MultiSelectOptionItem } from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";

const TiptapEditor = dynamic(() => import("@/components/common/tiptap-editor"), { ssr: false });
const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  widgetId: "w_8vaaa60jy",
  contentKey: "articles",
  fields: [
    {
      id: "fb_666e67i1r",
      type: "input",
      label: "",
      fieldKey: "title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.title",
      placeholderMsgKey: "common.placeholder.seo.metaTitle",
      required: true,
      minLength: 5,
      maxLength: 150,
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
      id: "fb_4ol344qgl",
      type: "image",
      label: "",
      fieldKey: "image",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.image",
      descriptionMsgKey: "articles.description.image",
      maxFileSizeMB: 5,
      required: false,
      imageMaxWidthPx: 812,
      imageMaxHeightPx: 510,
    },
    {
      id: "fb_xmljzfl5f",
      type: "editor",
      label: "",
      fieldKey: "content",
      colSpan: 8,
      rowSpan: 6,
      labelMsgKey: "",
      dataGenerations: [
        {
          generationKey: "seo.meta_description",
          stripHtml: true,
          truncateLength: 181,
          onlyIfEmpty: true,
        },
      ],
    },
    {
      id: "fb_qdwd2fd66",
      type: "date",
      label: "",
      fieldKey: "publish_dttm",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.publishDttm",
      required: true,
      defaultToday: true,
      disableCondition: "publish_dttm<today(),update=1",
      dateSubType: "datetime",
    },
    {
      id: "fb_8t2oodeup",
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
    {
      id: "fb_imtehuc35",
      type: "checkbox",
      label: "",
      fieldKey: "markets",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.market",
      options: [
        "데이터 센터:001",
        "공공 인프라:002",
        "석유·가스 및 광업 산업:003",
        "전력망:004",
        "산업:005",
        "상업 및 주거:006",
      ],
      codeGroupCode: "MARKETS",
      descriptionMsgKey: "common.description.select.market",
    },
  ],
  connectedSlug: "articles-data",
  bgColor: "#ffffff",
  showBorder: true,
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
const MULTISELECT_WIDGET_MultiSelect1: MultiSelectWidget = {
  type: "multiselect",
  widgetId: "w_tp1mshjn4",
  contentKey: "product_list",
  sourceSlug: "product-data",
  connectedSlug: "articles-data",
  labelFields: "product.product_name",
  titleMsgKey: "common.label.product",
  descriptionMsgKey: "common.description.select.product",
  placeholderMsgKey: "common.placeholder.productSelect",
  showBorder: true,
  extraFields: [],
  sourceFilter: "is_visible=001,order_status=01",
  bgColor: "#ffffff",
  fieldColSpan: 8,
};
const FORM_WIDGET_Form2: FormWidget = {
  type: "form",
  widgetId: "w_m5pn6w355",
  contentKey: "seo",
  fields: [
    {
      id: "fb_ejbl2mbvt",
      type: "input",
      label: "",
      fieldKey: "slug",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.lable.seo.slug",
      showCharCount: true,
      pattern: "^[a-z0-9-]+$",
      maxLength: 150,
      patternDesc: "",
      descriptionMsgKey: "common.description.seo.slug",
      placeholderMsgKey: "common.placeholder.seo.slug",
      defaultValueMsgKey: "common.label.slugPattern",
    },
    {
      id: "fb_zl28rdut6",
      type: "input",
      label: "",
      fieldKey: "meta_title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.seo.metaTitle",
      maxLength: 150,
      showCharCount: true,
      descriptionMsgKey: "common.description.seo.metaTitle",
      placeholderMsgKey: "common.create.placeholder.title",
    },
    {
      id: "fb_xgye2n7eb",
      type: "textarea",
      label: "",
      fieldKey: "meta_description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.seo.metaDescription",
      maxLength: 180,
      showCharCount: true,
      descriptionMsgKey: "common.description.seo.metaDescription",
      placeholderMsgKey: "common.placeholder.seo.metaDescription",
    },
  ],
  connectedSlug: "articles-data",
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form2: FormFieldItem[] = FORM_WIDGET_Form2.fields;
const FORM_FIELD_BY_ID_Form2: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form2.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form2 = buildKeyToId(FORM_FIELDS_Form2);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1, FORM_WIDGET_Form2];
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [
  FORM_WIDGET_Form1,
  MULTISELECT_WIDGET_MultiSelect1,
  FORM_WIDGET_Form2,
];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("articles.label.title"));
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
  const [multiSelectIdsMultiSelect1, setMultiSelectIdsMultiSelect1] = useState<number[]>([]);
  const [multiSelectOptionsMultiSelect1, setMultiSelectOptionsMultiSelect1] = useState<MultiSelectOptionItem[]>([]);
  const [multiSelectSearchMultiSelect1, setMultiSelectSearchMultiSelect1] = useState("");
  const [multiSelectOpenMultiSelect1, setMultiSelectOpenMultiSelect1] = useState(false);
  const multiSelectButtonRefMultiSelect1 = useRef<HTMLButtonElement>(null);
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
      const defaults = initFormDefaultValues(ALL_FORM_WIDGETS, t);
      setFormValuesForm1(defaults["w_8vaaa60jy"] ?? {});
      setFormValuesForm2(defaults["w_m5pn6w355"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/articles-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_8vaaa60jy"] ?? {}) }));
        setFormValuesForm2((prev) => ({ ...prev, ...(valuesByWidgetId["w_m5pn6w355"] ?? {}) }));
        const selectionMultiSelect1 = extractMultiSelectSelection(dataJson, "product_list", "articles-data");
        if (selectionMultiSelect1.kind !== "none") setMultiSelectIdsMultiSelect1(selectionMultiSelect1.ids);
        const fileIds = collectFileIdsDeep(dataJson);
        if (fileIds.length === 0) return;
        const metaList = await fetchFileMetaByIds(fileIds, false);
        const sectionForm1 = findSection(dataJson, "articles");
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
    const missingMultiSelectTitle = findMissingRequiredMultiSelect(
      CONTENT_WIDGETS_Space1_1,
      { w_tp1mshjn4: multiSelectIdsMultiSelect1 },
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
        { w_8vaaa60jy: fileValuesForm1 },
        "articles-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(
        CONTENT_WIDGETS_Space1_1,
        { w_8vaaa60jy: existingFileMetaForm1 },
        newFileIdsByFieldId
      );
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_8vaaa60jy: formValuesForm1, w_m5pn6w355: formValuesForm2 },
        formFileIdsMap,
        {},
        { w_tp1mshjn4: multiSelectIdsMultiSelect1 },
        {},
        "articles-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "articles-data",
        dataJson,
        pkKeys,
        templateSlug: "articles-basicInfo",
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
          const savedSectionForm1 = dataJson["articles"] as Record<string, unknown>;
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
        <GridCell colSpan={12} rowSpan={26} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto auto auto auto auto ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px ${ROW_HEIGHT - GAP_SIZE}px auto auto auto auto auto auto auto`,
              gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
              gridAutoFlow: "row dense",
              rowGap: `${GAP_SIZE}px`,
              columnGap: 0,
            }}
          >
            <div style={{ gridColumn: "span 12", gridRow: "span 14" }}>
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
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("common.placeholder.seo.metaTitle")}
                        maxLength={150}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm1["fb_666e67i1r"] ?? ""}
                        onChange={(e) => handleFieldChangeForm1("fb_666e67i1r", e.target.value)}
                        onBlur={() => handleFieldBlurForm1("fb_666e67i1r")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm1["fb_666e67i1r"] ?? "").length}/{150}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.image")}
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("articles.description.image")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    {(() => {
                      const maxCount = 1;
                      const existingList = existingFileMetaForm1["fb_4ol344qgl"] ?? [];
                      const newList = fileValuesForm1["fb_4ol344qgl"] ?? [];
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
                          const violation = checkImagePixelLimit(naturalSize, 812, 510);
                          if (violation === "width") {
                            toast.warning(t("common.field.image_width_limit", { label: file.name, px: "812" }));
                            continue;
                          }
                          if (violation === "height") {
                            toast.warning(t("common.field.image_height_limit", { label: file.name, px: "510" }));
                            continue;
                          }
                          passed.push(file);
                        }
                        if (passed.length > 0)
                          handleFileChangeForm1("fb_4ol344qgl", [...newList, ...passed].slice(0, maxCount));
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
                                            onClick={() => handleRemoveExistingForm1("fb_4ol344qgl", item.meta.id)}
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
                                                "fb_4ol344qgl",
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 6" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <TiptapEditor
                      initialValue={formValuesForm1["fb_xmljzfl5f"] ?? ""}
                      onChange={(v: string) => handleFieldChangeForm1("fb_xmljzfl5f", v)}
                      height="528px"
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.publishDttm")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <input
                      type="datetime-local"
                      disabled={evalFieldConditionForm1("publish_dttm<today(),update=1")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      value={formValuesForm1["fb_qdwd2fd66"] ?? ""}
                      onChange={(e) => handleFieldChangeForm1("fb_qdwd2fd66", e.target.value)}
                      onClick={(e) => e.currentTarget.showPicker?.()}
                    />
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
                        FORM_FIELD_BY_ID_Form1["fb_8t2oodeup"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_8t2oodeup`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm1["fb_8t2oodeup"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm1("fb_8t2oodeup", parsed.value)}
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
                    {t("common.label.market")}
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("common.description.select.market")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form1["fb_imtehuc35"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        const selected = (formValuesForm1["fb_imtehuc35"] ?? "").split(",").filter(Boolean);
                        const isChecked = selected.includes(parsed.value);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={false}
                              value={parsed.value}
                              checked={isChecked}
                              onChange={() =>
                                handleFieldChangeForm1(
                                  "fb_imtehuc35",
                                  (isChecked
                                    ? selected.filter((v) => v !== parsed.value)
                                    : [...selected, parsed.value]
                                  ).join(",")
                                )
                              }
                              className="w-4 h-4 rounded cursor-pointer"
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
                  <p className="text-sm font-medium text-slate-700">{t("common.label.product")}</p>
                  <p className="text-xs text-slate-500">{t("common.description.select.product")}</p>
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
                            : t("common.placeholder.productSelect")}
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
                        value={formValuesForm2["fb_ejbl2mbvt"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_ejbl2mbvt", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_ejbl2mbvt")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm2["fb_ejbl2mbvt"] ?? "").length}/{150}
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
                        value={formValuesForm2["fb_zl28rdut6"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_zl28rdut6", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_zl28rdut6")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm2["fb_zl28rdut6"] ?? "").length}/{150}
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
                        value={formValuesForm2["fb_xgye2n7eb"] ?? ""}
                        maxLength={180}
                        placeholder={t("common.placeholder.seo.metaDescription")}
                        onChange={(e) => handleFieldChangeForm2("fb_xgye2n7eb", e.target.value)}
                      />
                      <div className="text-right text-[10px] text-slate-400 mt-0.5">
                        {(formValuesForm2["fb_xgye2n7eb"] ?? "").length}/{180}
                      </div>
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
