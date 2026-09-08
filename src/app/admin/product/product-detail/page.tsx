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
  buildFieldKeyIdAndLabelMaps,
  applyDataGeneration,
  splitGenerationKeys,
  evalConditionExpr,
  buildFieldConditionResolver,
  findOptionFilterResetTargetIds,
  initFormDefaultValues,
  buildFormValuesFromDataJson,
  extractFetchRelData,
  findSection,
  validateFormFields,
  buildDataJson,
  filterByAccept,
  unitToBytes,
  getImageNaturalSize,
  checkImagePixelLimit,
} from "@/app/admin/templates/make/_shared/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
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
import { Image as ImageIcon, Plus, X } from "lucide-react";
import dynamic from "next/dynamic";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  fields: [
    {
      id: "fb_qu333wzmc",
      type: "input",
      label: "",
      fieldKey: "product_code",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "product.label.productCode",
      required: true,
      placeholderMsgKey: "product.placeholder.productCode",
      descriptionMsgKey: "product.productCode.description",
    },
    {
      id: "fb_tfyug13yl",
      type: "input",
      label: "제품명",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "product_name",
      required: true,
      minLength: 0,
      placeholder: "Susol",
      labelMsgKey: "common.label.productName",
      placeholderMsgKey: "product.placeholder.productName",
      maxLength: 50,
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
          truncateLength: 61,
          onlyIfEmpty: true,
        },
      ],
    },
    {
      id: "fb_j1ya92suj",
      type: "input",
      label: "제품명 보조설명",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "product_description",
      description: "제품을 설명 할 수 있는 추가 설명을 입력하세요. 제품명 아래 보조설명으로 출력됩니다.",
      labelMsgKey: "product.label.productSubDescription",
      descriptionMsgKey: "product.description.subProduct",
      placeholderMsgKey: "product.placeholder.productSubDescription",
      showCharCount: true,
      maxLength: 50,
    },
    {
      id: "fb_o19i2bqyk",
      type: "checkbox",
      label: "Design Awards",
      colSpan: 8,
      options: ["iF Design Awards 2026:01"],
      rowSpan: 1,
      fieldKey: "awards",
      description: "수상한 Design Awards를 선택하세요. GNB를 제외한 모든 제품 이미지에 수상로고가 출력됩니다.",
      labelMsgKey: "product.label.designAward",
      codeGroupCode: "DESIGNAWARDS",
      descriptionMsgKey: "product.description.designAwards",
    },
    {
      id: "fb_41mji4ayp",
      type: "text",
      label: "",
      fieldKey: "_fetchedRel6",
      colSpan: 8,
      rowSpan: 2,
      relationSlugId: 6,
      fetchDisplayMode: "MULTI_LINE",
      labelMsgKey: "common.label.category",
      descriptionMsgKey: "product.category.description",
    },
    {
      id: "fb_539x1pobl",
      type: "radio",
      label: "분류",
      fieldKey: "product_type",
      colSpan: 8,
      rowSpan: 1,
      options: ["Power:P", "Automation:A"],
      codeGroupCode: "PRODUCTCATEGORY",
      labelMsgKey: "training.label.category",
      required: true,
      defaultOptionValue: "P",
    },
    {
      id: "fb_0392sz2fx",
      type: "radio",
      label: "판매상태",
      fieldKey: "order_status",
      colSpan: 8,
      rowSpan: 1,
      options: ["판매중:01", "단종:99"],
      codeGroupCode: "SALESSTATUS",
      labelMsgKey: "product.label.salesStatus",
      required: true,
      defaultOptionValue: "01",
    },
    {
      id: "fb_dmut41882",
      type: "radio",
      label: "",
      fieldKey: "order_method",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "code.orderMethod.groupName",
      options: ["수주:01", "양산:02"],
      codeGroupCode: "ORDERMETHOD",
      defaultOptionValue: "01",
      required: true,
    },
    {
      id: "fb_7h3fm2135",
      type: "radio",
      label: "공개설정",
      colSpan: 8,
      options: ["공개:001", "비공개:002"],
      rowSpan: 1,
      fieldKey: "is_visible",
      description:
        "비공개시 GNB를 포함한 모든 영역에 해당 제품이 비공개되며, Devices & Systems 해당 제품 소개 페이지에도 접근할 수 없습니다.",
      codeGroupCode: "VISIBILITY",
      labelMsgKey: "common.label.isVisible",
      required: true,
      defaultOptionValue: "001",
      descriptionMsgKey: "product.isVisible.subText",
    },
    {
      id: "fb_o245ryufw",
      type: "hidden",
      label: "",
      fieldKey: "has_training",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "002",
    },
    {
      id: "fb_rzg8q6z2t",
      type: "hidden",
      label: "",
      fieldKey: "base_url",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "/product",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_vs5jbjk87_t0_w_56wvidq7p",
  contentKey: "product",
  connectedSlug: "product-data",
  showBorder: false,
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
const CONTENT_WIDGETS_Space2_1: ContentSaveWidget[] = [FORM_WIDGET_Form1];
const FORM_WIDGET_Form2: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_55i53x0qo",
  contentKey: "product_info",
  fields: [
    {
      id: "fb_fpr6lnm7u",
      type: "textarea",
      label: "제품 설명",
      fieldKey: "info_description",
      colSpan: 8,
      rowSpan: 2,
      description: "최소 150자~~",
      required: true,
      labelMsgKey: "product.label.productDescription",
      descriptionMsgKey: "product.description.productDescription",
      maxLength: 600,
      showCharCount: true,
      dataGenerations: [
        {
          generationKey: "seo.meta_description",
          truncateLength: 181,
          onlyIfEmpty: true,
        },
      ],
      placeholderMsgKey: "product.placeholder.productDescription",
    },
    {
      id: "fb_ofmykwucv",
      type: "image",
      label: "대표 이미지",
      fieldKey: "image",
      colSpan: 8,
      rowSpan: 3,
      description: "가로 최대 ~~~",
      required: true,
      labelMsgKey: "common.label.image",
      descriptionMsgKey: "product.image.description",
      maxFileSizeMB: 5,
      imageMaxWidthPx: 1080,
      imageMaxHeightPx: 1080,
    },
    {
      id: "fb_mk0lcoaie",
      type: "image",
      label: "",
      fieldKey: "gnb_image",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "product.label.gnbImage",
      required: true,
      maxFileSizeMB: 50,
      descriptionMsgKey: "product.gnbImage.placeholder",
      imageMaxWidthPx: 336,
      imageMaxHeightPx: 336,
      maxFileSizeUnit: "KB",
    },
  ],
  connectedSlug: "product-data",
  bgColor: "#ffffff",
  showBorder: false,
};
const FORM_FIELDS_Form2: FormFieldItem[] = FORM_WIDGET_Form2.fields;
const FORM_FIELD_BY_ID_Form2: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form2.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form2 = buildKeyToId(FORM_FIELDS_Form2);
const FORM_WIDGET_Form3: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_hbw7sm8x2",
  contentKey: "product_spec1",
  fields: [
    {
      id: "fb_8kylq00ux",
      type: "input",
      label: "스펙 1 - 제목",
      fieldKey: "spec1_title",
      colSpan: 4,
      rowSpan: 1,
      required: false,
      placeholder: "Rated Current",
      maxLength: 40,
      labelMsgKey: "product.label.spec1Title",
      placeholderMsgKey: "product.placeholder.specTitle",
      showCharCount: true,
    },
    {
      id: "fb_72593ewuu",
      type: "textarea",
      label: "",
      fieldKey: "spec1_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.spec1Content",
      required: false,
      maxLength: 120,
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.specContent",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form3: FormFieldItem[] = FORM_WIDGET_Form3.fields;
const FORM_FIELD_BY_ID_Form3: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form3.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form3 = buildKeyToId(FORM_FIELDS_Form3);
const FORM_WIDGET_Form4: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_9q6by5qaz",
  contentKey: "product_spec2",
  fields: [
    {
      id: "fb_hdyihcz17",
      type: "input",
      label: "",
      fieldKey: "spec2_title",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "product.label.spec2Title",
      maxLength: 40,
      showCharCount: true,
      required: false,
      placeholderMsgKey: "product.placeholder.specTitle",
    },
    {
      id: "fb_rlfr1omfh",
      type: "hidden",
      label: "",
      fieldKey: "temp1",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_qo8c54hyn",
      type: "textarea",
      label: "",
      fieldKey: "spec2_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.spec2Content",
      required: false,
      maxLength: 120,
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.specContent",
    },
  ],
  connectedSlug: "product-data",
  bgColor: "#ffffff",
  showBorder: false,
};
const FORM_FIELDS_Form4: FormFieldItem[] = FORM_WIDGET_Form4.fields;
const FORM_FIELD_BY_ID_Form4: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form4.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form4 = buildKeyToId(FORM_FIELDS_Form4);
const FORM_WIDGET_Form5: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_solhktyr8",
  contentKey: "product_spec3",
  fields: [
    {
      id: "fb_py8k58fru",
      type: "input",
      label: "",
      fieldKey: "spec3_title",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "product.label.spec3Title",
      placeholderMsgKey: "product.placeholder.specTitle",
      maxLength: 40,
      showCharCount: true,
      required: false,
    },
    {
      id: "fb_f90zm37t0",
      type: "textarea",
      label: "",
      fieldKey: "spec3_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.spec3Content",
      maxLength: 120,
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.specContent",
      required: false,
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form5: FormFieldItem[] = FORM_WIDGET_Form5.fields;
const FORM_FIELD_BY_ID_Form5: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form5.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form5 = buildKeyToId(FORM_FIELDS_Form5);
const FORM_WIDGET_Form6: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_5pfu030q1",
  contentKey: "product_spec4",
  fields: [
    {
      id: "fb_cypzhf9x2",
      type: "input",
      label: "",
      fieldKey: "spec4_title",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "product.label.spec4Title",
      placeholderMsgKey: "product.placeholder.specTitle",
      maxLength: 40,
      showCharCount: true,
      required: false,
    },
    {
      id: "fb_hawtmgik8",
      type: "hidden",
      label: "",
      fieldKey: "temp2",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_qnlhsqj6q",
      type: "textarea",
      label: "",
      fieldKey: "spec4_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.spec4Content",
      placeholderMsgKey: "product.placeholder.specContent",
      required: false,
      maxLength: 120,
      showCharCount: true,
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form6: FormFieldItem[] = FORM_WIDGET_Form6.fields;
const FORM_FIELD_BY_ID_Form6: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form6.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form6 = buildKeyToId(FORM_FIELDS_Form6);
const FORM_WIDGET_Form7: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_gtyzd07kd",
  contentKey: "key_feature1",
  fields: [
    {
      id: "fb_iugpk3a71",
      type: "input",
      label: "제목",
      fieldKey: "key1_title",
      colSpan: 4,
      rowSpan: 1,
      required: false,
      placeholder: "Proven Power Equipment Heritage",
      maxLength: 60,
      labelMsgKey: "product.label.keyFeature1",
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
      showCharCount: true,
    },
    {
      id: "fb_bbhza7emb",
      type: "textarea",
      label: "내용",
      fieldKey: "key1_content",
      colSpan: 4,
      rowSpan: 2,
      required: false,
      placeholder: "Builing expertise in recycled & non-PVC materials for a greener future.",
      maxLength: 250,
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
      labelMsgKey: "product.label.content",
      showCharCount: true,
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form7: FormFieldItem[] = FORM_WIDGET_Form7.fields;
const FORM_FIELD_BY_ID_Form7: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form7.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form7 = buildKeyToId(FORM_FIELDS_Form7);
const FORM_WIDGET_Form8: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_44o4odzx3",
  contentKey: "key_feature2",
  fields: [
    {
      id: "fb_ubkeh8ltj",
      type: "input",
      label: "제목",
      fieldKey: "key2_title",
      colSpan: 4,
      rowSpan: 1,
      required: false,
      placeholder: "Proven Power Equipment Heritage",
      maxLength: 60,
      labelMsgKey: "product.label.keyFeature2",
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
      showCharCount: true,
    },
    {
      id: "fb_pvvogtq62",
      type: "hidden",
      label: "",
      fieldKey: "temp3",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_90vn9qo98",
      type: "textarea",
      label: "내용",
      fieldKey: "key2_content",
      colSpan: 4,
      rowSpan: 2,
      required: false,
      placeholder: "Builing expertise in recycled & non-PVC materials for a greener future.",
      maxLength: 250,
      labelMsgKey: "product.label.content",
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
      showCharCount: true,
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form8: FormFieldItem[] = FORM_WIDGET_Form8.fields;
const FORM_FIELD_BY_ID_Form8: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form8.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form8 = buildKeyToId(FORM_FIELDS_Form8);
const FORM_WIDGET_Form9: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_bg8j72cg1",
  contentKey: "key_feature3",
  fields: [
    {
      id: "fb_4i4236085",
      type: "input",
      label: "제목",
      fieldKey: "key3_title",
      colSpan: 4,
      rowSpan: 1,
      required: false,
      placeholder: "Proven Power Equipment Heritage",
      maxLength: 60,
      showCharCount: true,
      labelMsgKey: "product.label.keyFeature3",
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
    },
    {
      id: "fb_3fztgs51f",
      type: "textarea",
      label: "내용",
      fieldKey: "key3_content",
      colSpan: 4,
      rowSpan: 2,
      required: false,
      placeholder: "Builing expertise in recycled & non-PVC materials for a greener future.",
      maxLength: 250,
      showCharCount: true,
      labelMsgKey: "product.label.content",
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form9: FormFieldItem[] = FORM_WIDGET_Form9.fields;
const FORM_FIELD_BY_ID_Form9: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form9.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form9 = buildKeyToId(FORM_FIELDS_Form9);
const FORM_WIDGET_Form10: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_qcqoulixq",
  contentKey: "key_feature4",
  fields: [
    {
      id: "fb_79x0ulwbn",
      type: "input",
      label: "제목",
      fieldKey: "key4_title",
      colSpan: 4,
      rowSpan: 1,
      required: false,
      placeholder: "Proven Power Equipment Heritage",
      maxLength: 60,
      labelMsgKey: "product.label.keyFeature4",
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
    },
    {
      id: "fb_hu3tbvyx9",
      type: "hidden",
      label: "",
      fieldKey: "temp4",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_qbhn674fh",
      type: "textarea",
      label: "내용",
      fieldKey: "key4_content",
      colSpan: 4,
      rowSpan: 2,
      required: false,
      placeholder: "Builing expertise in recycled & non-PVC materials for a greener future.",
      maxLength: 250,
      labelMsgKey: "product.label.content",
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form10: FormFieldItem[] = FORM_WIDGET_Form10.fields;
const FORM_FIELD_BY_ID_Form10: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form10.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form10 = buildKeyToId(FORM_FIELDS_Form10);
const FORM_WIDGET_Form11: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_efbgtrhnw",
  contentKey: "key_feature5",
  fields: [
    {
      id: "fb_j06hq3avm",
      type: "input",
      label: "",
      fieldKey: "key5_title",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "product.label.keyFeature5",
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
      maxLength: 60,
      showCharCount: true,
    },
    {
      id: "fb_gc0q703ya",
      type: "textarea",
      label: "",
      fieldKey: "key5_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.content",
      maxLength: 250,
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form11: FormFieldItem[] = FORM_WIDGET_Form11.fields;
const FORM_FIELD_BY_ID_Form11: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form11.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form11 = buildKeyToId(FORM_FIELDS_Form11);
const FORM_WIDGET_Form12: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_1miyjos50",
  contentKey: "key_feature6",
  fields: [
    {
      id: "fb_qbt49njvv",
      type: "input",
      label: "",
      fieldKey: "key6_title",
      colSpan: 4,
      rowSpan: 1,
      labelMsgKey: "product.label.keyFeature6",
      placeholderMsgKey: "product.placeholder.keyFeatureTitle",
      maxLength: 60,
      showCharCount: true,
    },
    {
      id: "fb_xn00lrgqj",
      type: "hidden",
      label: "",
      fieldKey: "temp6",
      colSpan: 1,
      rowSpan: 1,
    },
    {
      id: "fb_aumjs58j2",
      type: "textarea",
      label: "",
      fieldKey: "key6_content",
      colSpan: 4,
      rowSpan: 2,
      labelMsgKey: "product.label.content",
      maxLength: 250,
      showCharCount: true,
      placeholderMsgKey: "product.placeholder.keyFeatureContents",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form12: FormFieldItem[] = FORM_WIDGET_Form12.fields;
const FORM_FIELD_BY_ID_Form12: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form12.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form12 = buildKeyToId(FORM_FIELDS_Form12);
const TiptapEditor = dynamic(() => import("@/components/common/tiptap-editor"), { ssr: false });
const FORM_WIDGET_Form13: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_q78elvt71",
  contentKey: "product_etc",
  fields: [
    {
      id: "fb_mxj0yhyg8",
      type: "editor",
      label: "",
      fieldKey: "line_up",
      colSpan: 8,
      rowSpan: 4,
      labelMsgKey: "product.label.lineup",
    },
    {
      id: "fb_iu1mq20wh",
      type: "input",
      label: "Video",
      fieldKey: "video",
      colSpan: 8,
      rowSpan: 1,
      description: "제품을 소개하는 Youtube 링크를 입력하세요.",
      placeholder: "https://www.youtube.com/watch?",
      labelMsgKey: "product.label.video",
      placeholderMsgKey: "product.placeholder.video",
      descriptionMsgKey: "product.description.video",
    },
    {
      id: "fb_5sndzq92m",
      type: "input",
      label: "Connect Portal",
      fieldKey: "connect_portal",
      colSpan: 8,
      rowSpan: 1,
      description: "Connect Portal에 등록된 해당 제품 Configurator URL을 입력하세요.",
      placeholder: "https://connect.ls-electric.com/product/",
      labelMsgKey: "common.label.connectportal",
      placeholderMsgKey: "product.placeholder.connectPortal",
      descriptionMsgKey: "product.description.connectPortal",
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form13: FormFieldItem[] = FORM_WIDGET_Form13.fields;
const FORM_FIELD_BY_ID_Form13: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form13.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form13 = buildKeyToId(FORM_FIELDS_Form13);
const FORM_WIDGET_Form14: FormWidget = {
  type: "form",
  widgetId: "w_vs5jbjk87_t1_w_3rs8fyvr8",
  contentKey: "seo",
  fields: [
    {
      id: "fb_z27tchl6q",
      type: "input",
      label: "",
      fieldKey: "slug",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.lable.seo.slug",
      pattern: "^[a-z0-9-]+$",
      patternDesc: "",
      showCharCount: true,
      maxLength: 150,
      descriptionMsgKey: "product.slug.description",
      placeholderMsgKey: "category2.slug.placeholder",
      patternDescMsgKey: "common.label.slugPattern",
    },
    {
      id: "fb_a6ji0dvob",
      type: "input",
      label: "",
      fieldKey: "meta_title",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.seo.metaTitle",
      descriptionMsgKey: "product.metaTitle.description",
      maxLength: 60,
      showCharCount: true,
      placeholderMsgKey: "category2.metatitle.placeholder",
    },
    {
      id: "fb_3hze8741y",
      type: "textarea",
      label: "",
      fieldKey: "meta_description",
      colSpan: 8,
      rowSpan: 3,
      labelMsgKey: "common.label.seo.metaDescription",
      descriptionMsgKey: "product.metaDescription.description",
      placeholderMsgKey: "product.metaDescription.placeholder",
      showCharCount: true,
      maxLength: 180,
    },
  ],
  connectedSlug: "product-data",
  showBorder: false,
  bgColor: "#ffffff",
};
const FORM_FIELDS_Form14: FormFieldItem[] = FORM_WIDGET_Form14.fields;
const FORM_FIELD_BY_ID_Form14: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form14.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form14 = buildKeyToId(FORM_FIELDS_Form14);
const ALL_FORM_WIDGETS: FormWidget[] = [
  FORM_WIDGET_Form1,
  FORM_WIDGET_Form2,
  FORM_WIDGET_Form3,
  FORM_WIDGET_Form4,
  FORM_WIDGET_Form5,
  FORM_WIDGET_Form6,
  FORM_WIDGET_Form7,
  FORM_WIDGET_Form8,
  FORM_WIDGET_Form9,
  FORM_WIDGET_Form10,
  FORM_WIDGET_Form11,
  FORM_WIDGET_Form12,
  FORM_WIDGET_Form13,
  FORM_WIDGET_Form14,
];
const CONTENT_WIDGETS_Space3_1: ContentSaveWidget[] = [
  FORM_WIDGET_Form2,
  FORM_WIDGET_Form3,
  FORM_WIDGET_Form7,
  FORM_WIDGET_Form8,
  FORM_WIDGET_Form9,
  FORM_WIDGET_Form10,
  FORM_WIDGET_Form13,
  FORM_WIDGET_Form4,
  FORM_WIDGET_Form5,
  FORM_WIDGET_Form6,
  FORM_WIDGET_Form14,
];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("product.label.add"));
  }, [setPageTitle, t]);
  const { markDirty, markClean, confirmLeave } = useLeaveCheck(true);
  const searchParams = useSearchParams();
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});
  const pendingDeleteFileIds = useRef<Set<number>>(new Set());
  const [fetchRelData, setFetchRelData] = useState<Record<string, unknown>>({});
  const [formValuesForm1, setFormValuesForm1] = useState<Record<string, string>>({});
  const { groups, fetchGroups } = useCodeStore();
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);
  const uid = useId();
  const router = useRouter();
  const [formValuesForm2, setFormValuesForm2] = useState<Record<string, string>>({});
  const [fileValuesForm2, setFileValuesForm2] = useState<Record<string, File[]>>({});
  const [existingFileMetaForm2, setExistingFileMetaForm2] = useState<
    Record<string, { id: number; origName: string; fileSize: number }[]>
  >({});
  const [formValuesForm3, setFormValuesForm3] = useState<Record<string, string>>({});
  const [formValuesForm4, setFormValuesForm4] = useState<Record<string, string>>({});
  const [formValuesForm5, setFormValuesForm5] = useState<Record<string, string>>({});
  const [formValuesForm6, setFormValuesForm6] = useState<Record<string, string>>({});
  const [formValuesForm7, setFormValuesForm7] = useState<Record<string, string>>({});
  const [formValuesForm8, setFormValuesForm8] = useState<Record<string, string>>({});
  const [formValuesForm9, setFormValuesForm9] = useState<Record<string, string>>({});
  const [formValuesForm10, setFormValuesForm10] = useState<Record<string, string>>({});
  const [formValuesForm11, setFormValuesForm11] = useState<Record<string, string>>({});
  const [formValuesForm12, setFormValuesForm12] = useState<Record<string, string>>({});
  const [formValuesForm13, setFormValuesForm13] = useState<Record<string, string>>({});
  const [formValuesForm14, setFormValuesForm14] = useState<Record<string, string>>({});
  const [activeTabTab1, setActiveTabTab1] = useState(0);
  const [savedTabsTab1, setSavedTabsTab1] = useState<Set<number>>(() => new Set(storedId !== null ? [0] : []));

  const formRowDataForm1 = useMemo(
    () => buildFormRowData(FORM_FIELDS_Form1, formValuesForm1, fetchRelData),
    [formValuesForm1, fetchRelData]
  );

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
    () =>
      Object.assign(
        {},
        formValuesForm1,
        formValuesForm2,
        formValuesForm3,
        formValuesForm4,
        formValuesForm5,
        formValuesForm6,
        formValuesForm7,
        formValuesForm8,
        formValuesForm9,
        formValuesForm10,
        formValuesForm11,
        formValuesForm12,
        formValuesForm13,
        formValuesForm14
      ) as Record<string, string>,
    [
      formValuesForm1,
      formValuesForm2,
      formValuesForm3,
      formValuesForm4,
      formValuesForm5,
      formValuesForm6,
      formValuesForm7,
      formValuesForm8,
      formValuesForm9,
      formValuesForm10,
      formValuesForm11,
      formValuesForm12,
      formValuesForm13,
      formValuesForm14,
    ]
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
      if (FORM_FIELD_BY_ID_Form4[fieldId]) {
        setFormValuesForm4((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form5[fieldId]) {
        setFormValuesForm5((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form6[fieldId]) {
        setFormValuesForm6((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form7[fieldId]) {
        setFormValuesForm7((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form8[fieldId]) {
        setFormValuesForm8((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form9[fieldId]) {
        setFormValuesForm9((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form10[fieldId]) {
        setFormValuesForm10((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form11[fieldId]) {
        setFormValuesForm11((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form12[fieldId]) {
        setFormValuesForm12((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form13[fieldId]) {
        setFormValuesForm13((prev) => ({ ...prev, [fieldId]: value }));
        markDirty();
        return;
      }
      if (FORM_FIELD_BY_ID_Form14[fieldId]) {
        setFormValuesForm14((prev) => ({ ...prev, [fieldId]: value }));
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
      setFormValuesForm1(defaults["w_vs5jbjk87_t0_w_56wvidq7p"] ?? {});
      setFormValuesForm2(defaults["w_vs5jbjk87_t1_w_55i53x0qo"] ?? {});
      setFormValuesForm3(defaults["w_vs5jbjk87_t1_w_hbw7sm8x2"] ?? {});
      setFormValuesForm4(defaults["w_vs5jbjk87_t1_w_9q6by5qaz"] ?? {});
      setFormValuesForm5(defaults["w_vs5jbjk87_t1_w_solhktyr8"] ?? {});
      setFormValuesForm6(defaults["w_vs5jbjk87_t1_w_5pfu030q1"] ?? {});
      setFormValuesForm7(defaults["w_vs5jbjk87_t1_w_gtyzd07kd"] ?? {});
      setFormValuesForm8(defaults["w_vs5jbjk87_t1_w_44o4odzx3"] ?? {});
      setFormValuesForm9(defaults["w_vs5jbjk87_t1_w_bg8j72cg1"] ?? {});
      setFormValuesForm10(defaults["w_vs5jbjk87_t1_w_qcqoulixq"] ?? {});
      setFormValuesForm11(defaults["w_vs5jbjk87_t1_w_efbgtrhnw"] ?? {});
      setFormValuesForm12(defaults["w_vs5jbjk87_t1_w_1miyjos50"] ?? {});
      setFormValuesForm13(defaults["w_vs5jbjk87_t1_w_q78elvt71"] ?? {});
      setFormValuesForm14(defaults["w_vs5jbjk87_t1_w_3rs8fyvr8"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/product-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFetchRelData(extractFetchRelData(dataJson));
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t0_w_56wvidq7p"] ?? {}) }));
        setFormValuesForm2((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_55i53x0qo"] ?? {}) }));
        setFormValuesForm3((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_hbw7sm8x2"] ?? {}) }));
        setFormValuesForm4((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_9q6by5qaz"] ?? {}) }));
        setFormValuesForm5((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_solhktyr8"] ?? {}) }));
        setFormValuesForm6((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_5pfu030q1"] ?? {}) }));
        setFormValuesForm7((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_gtyzd07kd"] ?? {}) }));
        setFormValuesForm8((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_44o4odzx3"] ?? {}) }));
        setFormValuesForm9((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_bg8j72cg1"] ?? {}) }));
        setFormValuesForm10((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_qcqoulixq"] ?? {}) }));
        setFormValuesForm11((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_efbgtrhnw"] ?? {}) }));
        setFormValuesForm12((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_1miyjos50"] ?? {}) }));
        setFormValuesForm13((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_q78elvt71"] ?? {}) }));
        setFormValuesForm14((prev) => ({ ...prev, ...(valuesByWidgetId["w_vs5jbjk87_t1_w_3rs8fyvr8"] ?? {}) }));
        const fileIds = collectFileIdsDeep(dataJson);
        if (fileIds.length === 0) return;
        const metaList = await fetchFileMetaByIds(fileIds, false);
        const sectionForm2 = findSection(dataJson, "product_info");
        const metaByFieldIdForm2: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
        FORM_FIELDS_Form2.forEach((f) => {
          if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;
          const ids = sectionForm2[f.fieldKey];
          if (!Array.isArray(ids)) return;
          metaByFieldIdForm2[f.id] = (ids as number[])
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
        setExistingFileMetaForm2(metaByFieldIdForm2);
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

  const handleContentActionSpace2_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form1, formValuesForm1, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(CONTENT_WIDGETS_Space2_1, {}, "product-data", false);
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space2_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space2_1 as Parameters<typeof buildDataJson>[0],
        { w_vs5jbjk87_t0_w_56wvidq7p: formValuesForm1 },
        formFileIdsMap,
        {},
        {},
        {},
        "product-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "product-data",
        dataJson,
        pkKeys,
        templateSlug: "product-detail",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [7],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: true,
      });
      toast.success(isUpdate ? t("common.updated") : t("common.saved"));
      setSavedTabsTab1((prev) => new Set([...prev, 0]));
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

  const handleFileChangeForm2 = useCallback(
    (fieldId: string, files: File[]) => {
      setFileValuesForm2((prev) => ({ ...prev, [fieldId]: files }));
      markDirty();
    },
    [markDirty]
  );
  const handleRemoveExistingForm2 = useCallback(
    (fieldId: string, fileId: number) => {
      pendingDeleteFileIds.current.add(fileId);
      setExistingFileMetaForm2((prev) => ({
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
  const fieldRowIsAutoForm3 = calculateFormFieldRowTracks(visibleFieldsForm3, 4, false);

  const evalFieldConditionForm4 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form4 },
          { ...allFormValues, ...formValuesForm4 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm4, urlParams]
  );
  const resolveTargetFieldIdForm4 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form4[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm4 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm4((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form4[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm4[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form4, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm4[targetFieldId] ?? "") !== "") {
            setFormValuesForm4((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm4);
    },
    [formValuesForm4, markDirty, applyFieldGenerations, resolveTargetFieldIdForm4]
  );

  const handleFieldBlurForm4 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form4[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm4(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm4]
  );

  const visibleFieldsForm4 = FORM_FIELDS_Form4.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm4(f.hideCondition))
  );
  const fieldRowIsAutoForm4 = calculateFormFieldRowTracks(visibleFieldsForm4, 8, false);

  const evalFieldConditionForm5 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form5 },
          { ...allFormValues, ...formValuesForm5 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm5, urlParams]
  );
  const resolveTargetFieldIdForm5 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form5[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm5 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm5((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form5[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm5[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form5, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm5[targetFieldId] ?? "") !== "") {
            setFormValuesForm5((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm5);
    },
    [formValuesForm5, markDirty, applyFieldGenerations, resolveTargetFieldIdForm5]
  );

  const handleFieldBlurForm5 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form5[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm5(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm5]
  );

  const visibleFieldsForm5 = FORM_FIELDS_Form5.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm5(f.hideCondition))
  );
  const fieldRowIsAutoForm5 = calculateFormFieldRowTracks(visibleFieldsForm5, 4, false);

  const evalFieldConditionForm6 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form6 },
          { ...allFormValues, ...formValuesForm6 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm6, urlParams]
  );
  const resolveTargetFieldIdForm6 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form6[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm6 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm6((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form6[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm6[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form6, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm6[targetFieldId] ?? "") !== "") {
            setFormValuesForm6((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm6);
    },
    [formValuesForm6, markDirty, applyFieldGenerations, resolveTargetFieldIdForm6]
  );

  const handleFieldBlurForm6 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form6[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm6(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm6]
  );

  const visibleFieldsForm6 = FORM_FIELDS_Form6.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm6(f.hideCondition))
  );
  const fieldRowIsAutoForm6 = calculateFormFieldRowTracks(visibleFieldsForm6, 8, false);

  const evalFieldConditionForm7 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form7 },
          { ...allFormValues, ...formValuesForm7 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm7, urlParams]
  );
  const resolveTargetFieldIdForm7 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form7[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm7 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm7((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form7[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm7[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form7, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm7[targetFieldId] ?? "") !== "") {
            setFormValuesForm7((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm7);
    },
    [formValuesForm7, markDirty, applyFieldGenerations, resolveTargetFieldIdForm7]
  );

  const handleFieldBlurForm7 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form7[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm7(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm7]
  );

  const visibleFieldsForm7 = FORM_FIELDS_Form7.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm7(f.hideCondition))
  );
  const fieldRowIsAutoForm7 = calculateFormFieldRowTracks(visibleFieldsForm7, 4, false);

  const evalFieldConditionForm8 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form8 },
          { ...allFormValues, ...formValuesForm8 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm8, urlParams]
  );
  const resolveTargetFieldIdForm8 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form8[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm8 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm8((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form8[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm8[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form8, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm8[targetFieldId] ?? "") !== "") {
            setFormValuesForm8((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm8);
    },
    [formValuesForm8, markDirty, applyFieldGenerations, resolveTargetFieldIdForm8]
  );

  const handleFieldBlurForm8 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form8[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm8(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm8]
  );

  const visibleFieldsForm8 = FORM_FIELDS_Form8.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm8(f.hideCondition))
  );
  const fieldRowIsAutoForm8 = calculateFormFieldRowTracks(visibleFieldsForm8, 8, false);

  const evalFieldConditionForm9 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form9 },
          { ...allFormValues, ...formValuesForm9 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm9, urlParams]
  );
  const resolveTargetFieldIdForm9 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form9[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm9 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm9((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form9[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm9[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form9, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm9[targetFieldId] ?? "") !== "") {
            setFormValuesForm9((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm9);
    },
    [formValuesForm9, markDirty, applyFieldGenerations, resolveTargetFieldIdForm9]
  );

  const handleFieldBlurForm9 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form9[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm9(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm9]
  );

  const visibleFieldsForm9 = FORM_FIELDS_Form9.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm9(f.hideCondition))
  );
  const fieldRowIsAutoForm9 = calculateFormFieldRowTracks(visibleFieldsForm9, 4, false);

  const evalFieldConditionForm10 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form10 },
          { ...allFormValues, ...formValuesForm10 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm10, urlParams]
  );
  const resolveTargetFieldIdForm10 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form10[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm10 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm10((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form10[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm10[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form10, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm10[targetFieldId] ?? "") !== "") {
            setFormValuesForm10((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm10);
    },
    [formValuesForm10, markDirty, applyFieldGenerations, resolveTargetFieldIdForm10]
  );

  const handleFieldBlurForm10 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form10[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm10(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm10]
  );

  const visibleFieldsForm10 = FORM_FIELDS_Form10.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm10(f.hideCondition))
  );
  const fieldRowIsAutoForm10 = calculateFormFieldRowTracks(visibleFieldsForm10, 8, false);

  const evalFieldConditionForm11 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form11 },
          { ...allFormValues, ...formValuesForm11 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm11, urlParams]
  );
  const resolveTargetFieldIdForm11 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form11[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm11 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm11((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form11[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm11[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form11, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm11[targetFieldId] ?? "") !== "") {
            setFormValuesForm11((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm11);
    },
    [formValuesForm11, markDirty, applyFieldGenerations, resolveTargetFieldIdForm11]
  );

  const handleFieldBlurForm11 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form11[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm11(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm11]
  );

  const visibleFieldsForm11 = FORM_FIELDS_Form11.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm11(f.hideCondition))
  );
  const fieldRowIsAutoForm11 = calculateFormFieldRowTracks(visibleFieldsForm11, 4, false);

  const evalFieldConditionForm12 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form12 },
          { ...allFormValues, ...formValuesForm12 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm12, urlParams]
  );
  const resolveTargetFieldIdForm12 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form12[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm12 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm12((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form12[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm12[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form12, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm12[targetFieldId] ?? "") !== "") {
            setFormValuesForm12((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm12);
    },
    [formValuesForm12, markDirty, applyFieldGenerations, resolveTargetFieldIdForm12]
  );

  const handleFieldBlurForm12 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form12[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm12(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm12]
  );

  const visibleFieldsForm12 = FORM_FIELDS_Form12.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm12(f.hideCondition))
  );
  const fieldRowIsAutoForm12 = calculateFormFieldRowTracks(visibleFieldsForm12, 8, false);

  const evalFieldConditionForm13 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form13 },
          { ...allFormValues, ...formValuesForm13 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm13, urlParams]
  );
  const resolveTargetFieldIdForm13 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form13[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm13 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm13((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form13[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm13[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form13, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm13[targetFieldId] ?? "") !== "") {
            setFormValuesForm13((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm13);
    },
    [formValuesForm13, markDirty, applyFieldGenerations, resolveTargetFieldIdForm13]
  );

  const handleFieldBlurForm13 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form13[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm13(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm13]
  );

  const visibleFieldsForm13 = FORM_FIELDS_Form13.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm13(f.hideCondition))
  );
  const fieldRowIsAutoForm13 = calculateFormFieldRowTracks(visibleFieldsForm13, 12, false);

  const evalFieldConditionForm14 = useCallback(
    (condition: string): boolean =>
      evalConditionExpr(
        condition,
        buildFieldConditionResolver(
          { ...allFieldKeyToId, ...FORM_KEY_TO_ID_Form14 },
          { ...allFormValues, ...formValuesForm14 },
          urlParams,
          undefined
        )
      ),
    [allFieldKeyToId, allFormValues, formValuesForm14, urlParams]
  );
  const resolveTargetFieldIdForm14 = useCallback(
    (key: string): string | undefined =>
      key.includes(".") ? allFieldKeyToId[key] : (FORM_KEY_TO_ID_Form14[key] ?? allFieldKeyToId[key]),
    [allFieldKeyToId]
  );

  const handleFieldChangeForm14 = useCallback(
    (fieldId: string, value: string) => {
      setFormValuesForm14((prev) => ({ ...prev, [fieldId]: value }));
      markDirty();
      const sourceField = FORM_FIELD_BY_ID_Form14[fieldId];
      if (!sourceField) return;
      if (sourceField.fieldKey && (formValuesForm14[fieldId] ?? "") !== value) {
        findOptionFilterResetTargetIds(FORM_FIELDS_Form14, sourceField.fieldKey).forEach((targetFieldId) => {
          if (targetFieldId === fieldId) return;
          if ((formValuesForm14[targetFieldId] ?? "") !== "") {
            setFormValuesForm14((prev) => ({ ...prev, [targetFieldId]: "" }));
            markDirty();
          }
        });
      }
      applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldIdForm14);
    },
    [formValuesForm14, markDirty, applyFieldGenerations, resolveTargetFieldIdForm14]
  );

  const handleFieldBlurForm14 = useCallback(
    (fieldId: string) => {
      const sourceField = FORM_FIELD_BY_ID_Form14[fieldId];
      if (!sourceField) return;
      const keys: string[] = [];
      if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));
      (sourceField.dataGenerations ?? []).forEach((dg) => {
        if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey));
      });
      keys.forEach((key) => {
        delete lastGeneratedRef.current[resolveTargetFieldIdForm14(key) ?? key];
      });
    },
    [resolveTargetFieldIdForm14]
  );

  const visibleFieldsForm14 = FORM_FIELDS_Form14.filter(
    (f) => !(f.hideCondition && evalFieldConditionForm14(f.hideCondition))
  );
  const fieldRowIsAutoForm14 = calculateFormFieldRowTracks(visibleFieldsForm14, 12, false);

  const handleContentActionSpace3_1 = async () => {
    const isUpdate = storedId !== null;
    if (
      !validateFormFields(
        FORM_FIELDS_Form2,
        formValuesForm2,
        fileValuesForm2,
        existingFileMetaForm2,
        allFormValues,
        allFieldKeyToId,
        t
      )
    )
      return;
    if (!validateFormFields(FORM_FIELDS_Form3, formValuesForm3, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form7, formValuesForm7, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form8, formValuesForm8, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form9, formValuesForm9, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form10, formValuesForm10, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form13, formValuesForm13, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form4, formValuesForm4, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form5, formValuesForm5, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form6, formValuesForm6, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form14, formValuesForm14, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(
        CONTENT_WIDGETS_Space3_1,
        { w_vs5jbjk87_t1_w_55i53x0qo: fileValuesForm2 },
        "product-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(
        CONTENT_WIDGETS_Space3_1,
        { w_vs5jbjk87_t1_w_55i53x0qo: existingFileMetaForm2 },
        newFileIdsByFieldId
      );
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space3_1 as Parameters<typeof buildDataJson>[0],
        {
          w_vs5jbjk87_t1_w_55i53x0qo: formValuesForm2,
          w_vs5jbjk87_t1_w_hbw7sm8x2: formValuesForm3,
          w_vs5jbjk87_t1_w_gtyzd07kd: formValuesForm7,
          w_vs5jbjk87_t1_w_44o4odzx3: formValuesForm8,
          w_vs5jbjk87_t1_w_bg8j72cg1: formValuesForm9,
          w_vs5jbjk87_t1_w_qcqoulixq: formValuesForm10,
          w_vs5jbjk87_t1_w_q78elvt71: formValuesForm13,
          w_vs5jbjk87_t1_w_9q6by5qaz: formValuesForm4,
          w_vs5jbjk87_t1_w_solhktyr8: formValuesForm5,
          w_vs5jbjk87_t1_w_5pfu030q1: formValuesForm6,
          w_vs5jbjk87_t1_w_3rs8fyvr8: formValuesForm14,
        },
        formFileIdsMap,
        {},
        {},
        {},
        "product-data",
        allFormValues,
        false
      );
      await persistContentDataJson({
        connectedSlug: "product-data",
        dataJson,
        pkKeys,
        templateSlug: "product-detail",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [
          ...FORM_FIELDS_Form2,
          ...FORM_FIELDS_Form3,
          ...FORM_FIELDS_Form7,
          ...FORM_FIELDS_Form8,
          ...FORM_FIELDS_Form9,
          ...FORM_FIELDS_Form10,
          ...FORM_FIELDS_Form13,
          ...FORM_FIELDS_Form4,
          ...FORM_FIELDS_Form5,
          ...FORM_FIELDS_Form6,
          ...FORM_FIELDS_Form14,
        ],
        newFileIdsByFieldId,
        mergeExistingBeforeSave: true,
        onFilesLinked: () => {
          setFileValuesForm2({});
        },
      });
      try {
        const savedFileIds = collectFileIdsDeep(dataJson);
        if (savedFileIds.length > 0) {
          const metaList = await fetchFileMetaByIds(savedFileIds, false);
          const savedSectionForm2 = dataJson["product_info"] as Record<string, unknown>;
          const savedMetaByFieldIdForm2: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
          FORM_FIELDS_Form2.forEach((f) => {
            if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;
            const ids = savedSectionForm2[f.fieldKey];
            if (!Array.isArray(ids)) return;
            savedMetaByFieldIdForm2[f.id] = (ids as number[])
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
          setExistingFileMetaForm2(savedMetaByFieldIdForm2);
        }
      } catch {}
      if (pendingDeleteFileIds.current.size > 0) {
        await deletePendingFiles(Array.from(pendingDeleteFileIds.current), false);
        pendingDeleteFileIds.current.clear();
      }
      toast.success(isUpdate ? t("common.updated") : t("common.saved"));
      setSavedTabsTab1((prev) => new Set([...prev, 1]));
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

  const handleTabClickTab1 = (idx: number) => {
    if (idx > 0 && !savedTabsTab1.has(0)) {
      toast.warning(t("common.tab.save_required", { tab: t("common.lable.basicInformation") }));
      return;
    }
    setActiveTabTab1(idx);
  };

  return (
    <div className="space-y-3">
      <PageGridContainer>
        <GridCell colSpan={12} rowSpan={30} autoHeight>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto`,
              gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
              gridAutoFlow: "row dense",
              rowGap: `${GAP_SIZE}px`,
              columnGap: 0,
            }}
          >
            <div style={{ gridColumn: "span 12", gridRow: "span 30" }}>
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
                      <GridCell colSpan={12} rowSpan={10} autoHeight>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(12, 1fr)",
                            gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto`,
                            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                            gridAutoFlow: "row dense",
                            rowGap: `${GAP_SIZE}px`,
                            columnGap: 0,
                          }}
                        >
                          <div style={{ gridColumn: "span 12", gridRow: "span 1" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "visible",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(12, 1fr)",
                                gridTemplateRows: `auto`,
                                gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                                rowGap: `${GAP_SIZE}px`,
                                columnGap: `${GAP_SIZE}px`,
                              }}
                            >
                              <div
                                className="flex items-center-safe gap-2 px-3 min-w-0 "
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <div
                                  style={{ fontSize: "13px", fontWeight: "normal", color: "#334155" }}
                                  className="whitespace-pre-wrap leading-relaxed px-1"
                                >
                                  {t("product.label.textDescription")}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 12", gridRow: "span 8" }}>
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
                                  {t("product.label.productCode")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.productCode.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("product.placeholder.productCode")}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                                    value={formValuesForm1["fb_qu333wzmc"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm1("fb_qu333wzmc", e.target.value)}
                                    onBlur={() => handleFieldBlurForm1("fb_qu333wzmc")}
                                  />
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("common.label.productName")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.productName")}
                                      maxLength={50}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm1["fb_tfyug13yl"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm1("fb_tfyug13yl", e.target.value)}
                                      onBlur={() => handleFieldBlurForm1("fb_tfyug13yl")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm1["fb_tfyug13yl"] ?? "").length}/{50}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.productSubDescription")}
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.description.subProduct")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.productSubDescription")}
                                      maxLength={50}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm1["fb_j1ya92suj"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm1("fb_j1ya92suj", e.target.value)}
                                      onBlur={() => handleFieldBlurForm1("fb_j1ya92suj")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm1["fb_j1ya92suj"] ?? "").length}/{50}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.designAward")}
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.description.designAwards")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex items-center gap-4">
                                    {resolveFieldOptions(
                                      FORM_FIELD_BY_ID_Form1["fb_o19i2bqyk"] as unknown as SearchFieldConfig,
                                      groups
                                    ).map((opt) => {
                                      const parsed = parseOpt(opt);
                                      const selected = (formValuesForm1["fb_o19i2bqyk"] ?? "")
                                        .split(",")
                                        .filter(Boolean);
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
                                                "fb_o19i2bqyk",
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
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("common.label.category")}
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.category.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  {(() => {
                                    const fetched = formRowDataForm1["_fetchedRel6"];
                                    if (Array.isArray(fetched)) {
                                      const formatted = formatFetchedRelValue(
                                        fetched,
                                        formRowDataForm1,
                                        6,
                                        undefined,
                                        "MULTI_LINE"
                                      );
                                      return (
                                        <div className="text-sm text-slate-700 whitespace-pre-wrap">
                                          {formatted || "-"}
                                        </div>
                                      );
                                    }
                                    const displayVal = String(fetched ?? formValuesForm1["fb_41mji4ayp"] ?? "");
                                    return <div className="text-sm text-slate-700 truncate">{displayVal}</div>;
                                  })()}
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("training.label.category")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex items-center gap-4">
                                    {resolveFieldOptions(
                                      FORM_FIELD_BY_ID_Form1["fb_539x1pobl"] as unknown as SearchFieldConfig,
                                      groups
                                    ).map((opt) => {
                                      const parsed = parseOpt(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`${uid}-field-fb_539x1pobl`}
                                            disabled={false}
                                            value={parsed.value}
                                            checked={(formValuesForm1["fb_539x1pobl"] ?? "") === parsed.value}
                                            onChange={() => handleFieldChangeForm1("fb_539x1pobl", parsed.value)}
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
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.salesStatus")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex items-center gap-4">
                                    {resolveFieldOptions(
                                      FORM_FIELD_BY_ID_Form1["fb_0392sz2fx"] as unknown as SearchFieldConfig,
                                      groups
                                    ).map((opt) => {
                                      const parsed = parseOpt(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`${uid}-field-fb_0392sz2fx`}
                                            disabled={false}
                                            value={parsed.value}
                                            checked={(formValuesForm1["fb_0392sz2fx"] ?? "") === parsed.value}
                                            onChange={() => handleFieldChangeForm1("fb_0392sz2fx", parsed.value)}
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
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("code.orderMethod.groupName")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex items-center gap-4">
                                    {resolveFieldOptions(
                                      FORM_FIELD_BY_ID_Form1["fb_dmut41882"] as unknown as SearchFieldConfig,
                                      groups
                                    ).map((opt) => {
                                      const parsed = parseOpt(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`${uid}-field-fb_dmut41882`}
                                            disabled={false}
                                            value={parsed.value}
                                            checked={(formValuesForm1["fb_dmut41882"] ?? "") === parsed.value}
                                            onChange={() => handleFieldChangeForm1("fb_dmut41882", parsed.value)}
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
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("common.label.isVisible")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.isVisible.subText")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex items-center gap-4">
                                    {resolveFieldOptions(
                                      FORM_FIELD_BY_ID_Form1["fb_7h3fm2135"] as unknown as SearchFieldConfig,
                                      groups
                                    ).map((opt) => {
                                      const parsed = parseOpt(opt);
                                      return (
                                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`${uid}-field-fb_7h3fm2135`}
                                            disabled={false}
                                            value={parsed.value}
                                            checked={(formValuesForm1["fb_7h3fm2135"] ?? "") === parsed.value}
                                            onChange={() => handleFieldChangeForm1("fb_7h3fm2135", parsed.value)}
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
                  <div className={activeTabTab1 === 1 ? "h-full" : "hidden"}>
                    <PageGridContainer>
                      <GridCell colSpan={12} rowSpan={44} autoHeight>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(12, 1fr)",
                            gridTemplateRows: `auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto auto`,
                            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                            gridAutoFlow: "row dense",
                            rowGap: `${GAP_SIZE}px`,
                            columnGap: 0,
                          }}
                        >
                          <div style={{ gridColumn: "span 12", gridRow: "span 10" }}>
                            <div
                              className="w-full rounded"
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
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.productDescription")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.description.productDescription")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm2["fb_fpr6lnm7u"] ?? ""}
                                      maxLength={600}
                                      placeholder={t("product.placeholder.productDescription")}
                                      onChange={(e) => handleFieldChangeForm2("fb_fpr6lnm7u", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm2["fb_fpr6lnm7u"] ?? "").length}/{600}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 3" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("common.label.image")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.image.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  {(() => {
                                    const maxCount = 1;
                                    const existingList = existingFileMetaForm2["fb_ofmykwucv"] ?? [];
                                    const newList = fileValuesForm2["fb_ofmykwucv"] ?? [];
                                    const currentCount = existingList.length + newList.length;
                                    const canAdd = currentCount < maxCount;
                                    const handleImgSelect = async (selected: File[]) => {
                                      const { valid, rejected } = filterByAccept(
                                        selected,
                                        ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
                                      );
                                      if (rejected.length > 0)
                                        alert(`${t("common.field.invalid_file_type")}\n${rejected.join("\n")}`);
                                      if (valid.length === 0) return;
                                      const passed: File[] = [];
                                      for (const file of valid) {
                                        if (file.size > 5 * unitToBytes("MB")) {
                                          toast.warning(
                                            t("common.field.file_size_limit", {
                                              type: t("common.label.image"),
                                              mb: "5MB",
                                            })
                                          );
                                          continue;
                                        }
                                        const naturalSize = await getImageNaturalSize(file);
                                        const violation = checkImagePixelLimit(naturalSize, 1080, 1080);
                                        if (violation === "width") {
                                          toast.warning(
                                            t("common.field.image_width_limit", { label: file.name, px: "1080" })
                                          );
                                          continue;
                                        }
                                        if (violation === "height") {
                                          toast.warning(
                                            t("common.field.image_height_limit", { label: file.name, px: "1080" })
                                          );
                                          continue;
                                        }
                                        passed.push(file);
                                      }
                                      if (passed.length > 0)
                                        handleFileChangeForm2(
                                          "fb_ofmykwucv",
                                          [...newList, ...passed].slice(0, maxCount)
                                        );
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
                                              style={{
                                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                                gridAutoRows: `${cellH}px`,
                                              }}
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
                                                          onClick={() =>
                                                            handleRemoveExistingForm2("fb_ofmykwucv", item.meta.id)
                                                          }
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
                                                        <FileImagePreview
                                                          file={item.file}
                                                          className="w-full h-full object-contain"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleFileChangeForm2(
                                                              "fb_ofmykwucv",
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
                                                        onKeyDown={(e) =>
                                                          e.key === "Enter" && inputRef.current?.click()
                                                        }
                                                        className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all"
                                                      >
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[10px] mt-0.5">
                                                          {t("common.btn.add")}
                                                        </span>
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
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 3" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.gnbImage")}
                                  <span className="text-red-500 ml-0.5">*</span>
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.gnbImage.placeholder")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  {(() => {
                                    const maxCount = 1;
                                    const existingList = existingFileMetaForm2["fb_mk0lcoaie"] ?? [];
                                    const newList = fileValuesForm2["fb_mk0lcoaie"] ?? [];
                                    const currentCount = existingList.length + newList.length;
                                    const canAdd = currentCount < maxCount;
                                    const handleImgSelect = async (selected: File[]) => {
                                      const { valid, rejected } = filterByAccept(
                                        selected,
                                        ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
                                      );
                                      if (rejected.length > 0)
                                        alert(`${t("common.field.invalid_file_type")}\n${rejected.join("\n")}`);
                                      if (valid.length === 0) return;
                                      const passed: File[] = [];
                                      for (const file of valid) {
                                        if (file.size > 50 * unitToBytes("KB")) {
                                          toast.warning(
                                            t("common.field.file_size_limit", {
                                              type: t("common.label.image"),
                                              mb: "50KB",
                                            })
                                          );
                                          continue;
                                        }
                                        const naturalSize = await getImageNaturalSize(file);
                                        const violation = checkImagePixelLimit(naturalSize, 336, 336);
                                        if (violation === "width") {
                                          toast.warning(
                                            t("common.field.image_width_limit", { label: file.name, px: "336" })
                                          );
                                          continue;
                                        }
                                        if (violation === "height") {
                                          toast.warning(
                                            t("common.field.image_height_limit", { label: file.name, px: "336" })
                                          );
                                          continue;
                                        }
                                        passed.push(file);
                                      }
                                      if (passed.length > 0)
                                        handleFileChangeForm2(
                                          "fb_mk0lcoaie",
                                          [...newList, ...passed].slice(0, maxCount)
                                        );
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
                                              style={{
                                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                                gridAutoRows: `${cellH}px`,
                                              }}
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
                                                          onClick={() =>
                                                            handleRemoveExistingForm2("fb_mk0lcoaie", item.meta.id)
                                                          }
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
                                                        <FileImagePreview
                                                          file={item.file}
                                                          className="w-full h-full object-contain"
                                                        />
                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            handleFileChangeForm2(
                                                              "fb_mk0lcoaie",
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
                                                        onKeyDown={(e) =>
                                                          e.key === "Enter" && inputRef.current?.click()
                                                        }
                                                        className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all"
                                                      >
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[10px] mt-0.5">
                                                          {t("common.btn.add")}
                                                        </span>
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
                          <div style={{ gridColumn: "span 4", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec1Title")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.specTitle")}
                                      maxLength={40}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm3["fb_8kylq00ux"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm3("fb_8kylq00ux", e.target.value)}
                                      onBlur={() => handleFieldBlurForm3("fb_8kylq00ux")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm3["fb_8kylq00ux"] ?? "").length}/{40}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec1Content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm3["fb_72593ewuu"] ?? ""}
                                      maxLength={120}
                                      placeholder={t("product.placeholder.specContent")}
                                      onChange={(e) => handleFieldChangeForm3("fb_72593ewuu", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm3["fb_72593ewuu"] ?? "").length}/{120}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 8", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm4.length > 0
                                    ? fieldRowIsAutoForm4.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec2Title")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.specTitle")}
                                      maxLength={40}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm4["fb_hdyihcz17"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm4("fb_hdyihcz17", e.target.value)}
                                      onBlur={() => handleFieldBlurForm4("fb_hdyihcz17")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm4["fb_hdyihcz17"] ?? "").length}/{40}
                                    </span>
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
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec2Content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm4["fb_qo8c54hyn"] ?? ""}
                                      maxLength={120}
                                      placeholder={t("product.placeholder.specContent")}
                                      onChange={(e) => handleFieldChangeForm4("fb_qo8c54hyn", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm4["fb_qo8c54hyn"] ?? "").length}/{120}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 4", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm5.length > 0
                                    ? fieldRowIsAutoForm5.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec3Title")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.specTitle")}
                                      maxLength={40}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm5["fb_py8k58fru"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm5("fb_py8k58fru", e.target.value)}
                                      onBlur={() => handleFieldBlurForm5("fb_py8k58fru")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm5["fb_py8k58fru"] ?? "").length}/{40}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec3Content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm5["fb_f90zm37t0"] ?? ""}
                                      maxLength={120}
                                      placeholder={t("product.placeholder.specContent")}
                                      onChange={(e) => handleFieldChangeForm5("fb_f90zm37t0", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm5["fb_f90zm37t0"] ?? "").length}/{120}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 8", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm6.length > 0
                                    ? fieldRowIsAutoForm6.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec4Title")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.specTitle")}
                                      maxLength={40}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm6["fb_cypzhf9x2"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm6("fb_cypzhf9x2", e.target.value)}
                                      onBlur={() => handleFieldBlurForm6("fb_cypzhf9x2")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm6["fb_cypzhf9x2"] ?? "").length}/{40}
                                    </span>
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
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.spec4Content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm6["fb_qnlhsqj6q"] ?? ""}
                                      maxLength={120}
                                      placeholder={t("product.placeholder.specContent")}
                                      onChange={(e) => handleFieldChangeForm6("fb_qnlhsqj6q", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm6["fb_qnlhsqj6q"] ?? "").length}/{120}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 4", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm7.length > 0
                                    ? fieldRowIsAutoForm7.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature1")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm7["fb_iugpk3a71"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm7("fb_iugpk3a71", e.target.value)}
                                      onBlur={() => handleFieldBlurForm7("fb_iugpk3a71")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm7["fb_iugpk3a71"] ?? "").length}/{60}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm7["fb_bbhza7emb"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm7("fb_bbhza7emb", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm7["fb_bbhza7emb"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 8", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm8.length > 0
                                    ? fieldRowIsAutoForm8.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature2")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm8["fb_ubkeh8ltj"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm8("fb_ubkeh8ltj", e.target.value)}
                                      onBlur={() => handleFieldBlurForm8("fb_ubkeh8ltj")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm8["fb_ubkeh8ltj"] ?? "").length}/{60}
                                    </span>
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
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm8["fb_90vn9qo98"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm8("fb_90vn9qo98", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm8["fb_90vn9qo98"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 4", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm9.length > 0
                                    ? fieldRowIsAutoForm9.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature3")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm9["fb_4i4236085"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm9("fb_4i4236085", e.target.value)}
                                      onBlur={() => handleFieldBlurForm9("fb_4i4236085")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm9["fb_4i4236085"] ?? "").length}/{60}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm9["fb_3fztgs51f"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm9("fb_3fztgs51f", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm9["fb_3fztgs51f"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 8", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm10.length > 0
                                    ? fieldRowIsAutoForm10.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature4")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm10["fb_79x0ulwbn"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm10("fb_79x0ulwbn", e.target.value)}
                                      onBlur={() => handleFieldBlurForm10("fb_79x0ulwbn")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm10["fb_79x0ulwbn"] ?? "").length}/{60}
                                    </span>
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
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm10["fb_qbhn674fh"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm10("fb_qbhn674fh", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm10["fb_qbhn674fh"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 4", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(4, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm11.length > 0
                                    ? fieldRowIsAutoForm11.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature5")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm11["fb_j06hq3avm"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm11("fb_j06hq3avm", e.target.value)}
                                      onBlur={() => handleFieldBlurForm11("fb_j06hq3avm")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm11["fb_j06hq3avm"] ?? "").length}/{60}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm11["fb_gc0q703ya"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm11("fb_gc0q703ya", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm11["fb_gc0q703ya"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 8", gridRow: "span 4" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(8, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm12.length > 0
                                    ? fieldRowIsAutoForm12.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 4", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.keyFeature6")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("product.placeholder.keyFeatureTitle")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm12["fb_qbt49njvv"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm12("fb_qbt49njvv", e.target.value)}
                                      onBlur={() => handleFieldBlurForm12("fb_qbt49njvv")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm12["fb_qbt49njvv"] ?? "").length}/{60}
                                    </span>
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
                                style={{ gridColumn: "span 4", gridRow: "span 2" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.content")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm12["fb_aumjs58j2"] ?? ""}
                                      maxLength={250}
                                      placeholder={t("product.placeholder.keyFeatureContents")}
                                      onChange={(e) => handleFieldChangeForm12("fb_aumjs58j2", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm12["fb_aumjs58j2"] ?? "").length}/{250}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 12", gridRow: "span 7" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(12, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm13.length > 0
                                    ? fieldRowIsAutoForm13.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                style={{ gridColumn: "span 8", gridRow: "span 4" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.lineup")}
                                </label>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <TiptapEditor
                                    initialValue={formValuesForm13["fb_mxj0yhyg8"] ?? ""}
                                    onChange={(v: string) => handleFieldChangeForm13("fb_mxj0yhyg8", v)}
                                    height="328px"
                                  />
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("product.label.video")}
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.description.video")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("product.placeholder.video")}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                                    value={formValuesForm13["fb_iu1mq20wh"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm13("fb_iu1mq20wh", e.target.value)}
                                    onBlur={() => handleFieldBlurForm13("fb_iu1mq20wh")}
                                  />
                                </div>
                              </div>
                              <div
                                className="flex flex-col px-3 min-w-0"
                                style={{ gridColumn: "span 8", gridRow: "span 1" }}
                              >
                                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                                  {t("common.label.connectportal")}
                                </label>
                                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                                  {t("product.description.connectPortal")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <input
                                    type="text"
                                    disabled={false}
                                    placeholder={t("product.placeholder.connectPortal")}
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                                    value={formValuesForm13["fb_5sndzq92m"] ?? ""}
                                    onChange={(e) => handleFieldChangeForm13("fb_5sndzq92m", e.target.value)}
                                    onBlur={() => handleFieldBlurForm13("fb_5sndzq92m")}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div style={{ gridColumn: "span 12", gridRow: "span 6" }}>
                            <div
                              className="w-full rounded"
                              style={{
                                overflow: "clip",
                                backgroundColor: "#ffffff",
                                display: "grid",
                                gridTemplateColumns: "repeat(12, 1fr)",
                                gridTemplateRows:
                                  fieldRowIsAutoForm14.length > 0
                                    ? fieldRowIsAutoForm14.map((a) => (a ? "auto" : "78px")).join(" ")
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
                                  {t("product.slug.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("category2.slug.placeholder")}
                                      maxLength={150}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm14["fb_z27tchl6q"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm14("fb_z27tchl6q", e.target.value)}
                                      onBlur={() => handleFieldBlurForm14("fb_z27tchl6q")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm14["fb_z27tchl6q"] ?? "").length}/{150}
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
                                  {t("product.metaTitle.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="relative">
                                    <input
                                      type="text"
                                      disabled={false}
                                      placeholder={t("category2.metatitle.placeholder")}
                                      maxLength={60}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                                      value={formValuesForm14["fb_a6ji0dvob"] ?? ""}
                                      onChange={(e) => handleFieldChangeForm14("fb_a6ji0dvob", e.target.value)}
                                      onBlur={() => handleFieldBlurForm14("fb_a6ji0dvob")}
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                                      {(formValuesForm14["fb_a6ji0dvob"] ?? "").length}/{60}
                                    </span>
                                  </div>
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
                                  {t("product.metaDescription.description")}
                                </p>
                                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                                  <div className="flex flex-col h-full">
                                    <textarea
                                      disabled={false}
                                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 resize-none flex-1 min-h-0"
                                      value={formValuesForm14["fb_3hze8741y"] ?? ""}
                                      maxLength={180}
                                      placeholder={t("product.metaDescription.placeholder")}
                                      onChange={(e) => handleFieldChangeForm14("fb_3hze8741y", e.target.value)}
                                    />
                                    <div className="text-right text-[10px] text-slate-400 mt-0.5">
                                      {(formValuesForm14["fb_3hze8741y"] ?? "").length}/{180}
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
                                    if (!window.confirm(t("common.confirm.save"))) return;
                                    handleContentActionSpace3_1();
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
      </PageGridContainer>
    </div>
  );
}
