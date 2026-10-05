"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, useId } from "react";
import { GridCell, ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import PageLayout from "@/components/layout/page-layout";
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
  applyUrlParamFormOverrides,
  buildFormValuesFromDataJson,
  extractMultiSelectSelection,
  extractSubListRows,
  flattenPageDataItem,
  evalWidgetHideCondition,
  formatNowBySubType,
  calcDateOffset,
  validateFormFields,
  buildDataJson,
  validateSubListRows,
  findMissingRequiredMultiSelect,
} from "@/app/admin/templates/make/_shared/utils";
import { useSearchParams, useRouter } from "next/navigation";
import { useSiteStore } from "@/store/use-site-store";
import { useServerClockStore } from "@/store/use-server-clock-store";
import { useCodeStore } from "@/store/use-code-store";
import type { SearchFieldConfig } from "@/app/admin/templates/make/_shared/types";
import {
  SlugAutocompleteInput,
  AddressAutocompleteInput,
} from "@/app/admin/templates/make/_shared/components/renderer/AutocompleteField";
import api from "@/lib/api";
import { toast } from "sonner";
import {
  calculateFormFieldRowTracks,
  resolveGeneratedGridLayout,
} from "@/app/admin/templates/make/_shared/utils/formGridLayout";
import type { MultiSelectWidget, SubListWidget } from "@/app/admin/templates/make/_shared/components/renderer/types";
import {
  fetchMultiSelectSourceRows,
  buildLabelPathEntries,
} from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import type { MultiSelectOptionItem } from "@/app/admin/templates/make/_shared/utils/multiSelectSource";
import { PortalDropdown } from "@/components/ui/portal-dropdown";
import { ChevronDown, X, Search, Calendar } from "lucide-react";
import dynamic from "next/dynamic";
import { SubListRenderer } from "@/app/admin/templates/make/_shared/components/renderer/SubListRenderer";
import type { SubListRow } from "@/app/admin/templates/make/_shared/components/renderer/SubListRenderer";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";
import {
  uploadContentFormFiles,
  buildFormFileIdsMap,
  persistContentDataJson,
  uploadContentSubListFiles,
} from "@/app/admin/templates/make/_shared/utils/contentSave";
import { useLeaveCheckStore } from "@/store/use-leave-check-store";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  fields: [
    {
      id: "fb_oexkvvp4c",
      type: "radio",
      label: "",
      colSpan: 8,
      options: ["Engineering Training:01", "Service Training:02", "Sales Training:03"],
      rowSpan: 1,
      fieldKey: "training_course",
      required: true,
      labelMsgKey: "training.label.trainingCourse",
      codeGroupCode: "TRAININGCOURSE",
      defaultOptionValue: "01",
    },
    {
      id: "fb_41f0r5p2p",
      type: "select",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "curriculum_id",
      required: true,
      optionSlug: "currMgmt-data",
      selectType: "autocomplete",
      labelMsgKey: "course.label.select",
      optionFilter: "training_course=$training_course",
      optionTextKey: "title",
      optionValueKey: "id",
      optionDerivedKeys: "product_category",
    },
    {
      id: "fb_vsj496ofm",
      type: "checkbox",
      label: "",
      colSpan: 8,
      options: ["In-Person:001", "Virtual:002"],
      rowSpan: 1,
      fieldKey: "training_type",
      required: true,
      labelMsgKey: "common.label.trnType",
      codeGroupCode: "TRAININGTYPE",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_fmha6bh7u",
  contentKey: "curriculum_detail1",
  showBorder: true,
  connectedSlug: "currDtlMgmt-data",
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const MULTISELECT_WIDGET_MultiSelect1: MultiSelectWidget = {
  type: "multiselect",
  bgColor: "#ffffff",
  required: true,
  widgetId: "w_rf6vsc54u",
  contentKey: "power_list",
  showBorder: true,
  sourceSlug: "product-data",
  labelFields: "product.product_name",
  titleMsgKey: "common.label.powerPrd",
  dedupeByText: true,
  fieldColSpan: 8,
  sourceFilter: "product_type=P,has_training=001",
  connectedSlug: "currDtlMgmt-data",
  hideCondition: "curriculum_id.product_category!=P",
  contentRelation: {
    inner: {
      relationId: 4,
    },
    outer: {
      relationIds: [5, 33],
    },
  },
  descriptionMsgKey: "session.description.product",
  placeholderMsgKey: "common.placeholder.powerPrd",
};
const MULTISELECT_WIDGET_MultiSelect2: MultiSelectWidget = {
  type: "multiselect",
  bgColor: "#ffffff",
  required: true,
  widgetId: "w_gvuplil3i",
  contentKey: "automation_list",
  showBorder: true,
  sourceSlug: "product-data",
  labelFields: "product.product_name",
  titleMsgKey: "common.label.automationPrd",
  dedupeByText: true,
  fieldColSpan: 8,
  sourceFilter: "product_type=A,has_training=001",
  connectedSlug: "currDtlMgmt-data",
  hideCondition: "curriculum_id.product_category!=A",
  contentRelation: {
    inner: {
      relationId: 34,
    },
    outer: {
      relationIds: [35],
    },
  },
  descriptionMsgKey: "session.description.product",
  placeholderMsgKey: "common.placeholder.automationPrd",
};
const TiptapEditor = dynamic(() => import("@/components/common/tiptap-editor"), { ssr: false });
const FORM_WIDGET_Form2: FormWidget = {
  type: "form",
  fields: [
    {
      id: "fb_8i6z6jlds",
      type: "input",
      label: "",
      colSpan: 8,
      pattern: "^(?!\\s).*$",
      rowSpan: 1,
      fieldKey: "title",
      required: true,
      maxLength: 150,
      labelMsgKey: "common.label.title",
      patternDesc: "모든 문자 허용",
      showCharCount: true,
      dataGenerations: [
        {
          caseChange: "lower",
          onlyIfEmpty: true,
          generationKey: "seo.slug",
          truncateLength: 151,
          dataReplacement: "hyphen",
        },
        {
          onlyIfEmpty: true,
          generationKey: "seo.meta_title",
          truncateLength: 151,
        },
      ],
      descriptionMsgKey: "session.description.title",
      placeholderMsgKey: "currDtlMgmt.placeholder.title",
    },
    {
      id: "fb_4qr90xzp2",
      type: "dateRange",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "register_period",
      required: true,
      compareExpr: "<$training_date_from",
      labelMsgKey: "common.label.regRange",
      rangeSubType: "date",
      disableEndPast: true,
      defaultEndToday: true,
      disableStartPast: true,
      defaultStartToday: true,
      descriptionMsgKey: "currDtlMgmt.description.regDate",
    },
    {
      id: "fb_2ty59yr6i",
      type: "input",
      label: "",
      colSpan: 8,
      pattern: "^[0-9-]+$",
      rowSpan: 1,
      fieldKey: "duration",
      readonly: false,
      required: true,
      maxLength: 10,
      labelMsgKey: "currDtlMgmt.label.trainingDuration",
      patternDesc: "숫자 '-'만 입력",
      showCharCount: true,
      placeholderMsgKey: "currDtlMgmt.placeholder.trainingDuration",
    },
    {
      id: "fb_qe3u3ijc0",
      type: "input",
      label: "",
      colSpan: 8,
      pattern: "^[0-9-]+$",
      rowSpan: 1,
      fieldKey: "capacity",
      required: true,
      maxLength: 10,
      minLength: 1,
      labelMsgKey: "currDtlMgmt.label.trainingCapacity",
      patternDesc: "숫자 '-' 만 입력",
      showCharCount: true,
      descriptionMsgKey: "currMgmt.description.trainingCapacity",
      placeholderMsgKey: "currDtlMgmt.placeholder.trainingCapacity",
    },
    {
      id: "fb_ccy7t01xm",
      type: "address",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "address",
      required: true,
      labelMsgKey: "common.label.trainingLocation",
      hideCondition: "training_type!=001",
      descriptionMsgKey: "common.description.address",
      placeholderMsgKey: "common.placeholder.address",
    },
    {
      id: "fb_nr5phlmfk",
      type: "input",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "address_detail",
      required: false,
      labelMsgKey: "currDtlMgmt.label.addressLine2",
      hideCondition: "training_type!=001",
      descriptionMsgKey: "",
      placeholderMsgKey: "common.placeholder.detailAddress",
    },
    {
      id: "fb_7g2i5ulmv",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "1",
    },
    {
      id: "fb_jkcjy5vs5",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "2",
    },
    {
      id: "fb_orzpuqp1c",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "3",
    },
    {
      id: "fb_twrw38y4y",
      type: "hidden",
      label: "",
      colSpan: 1,
      rowSpan: 1,
      fieldKey: "4",
    },
    {
      id: "fb_9x43gd5ib",
      type: "select",
      label: "",
      colSpan: 2,
      options: [
        "+1:US",
        "+355:AL",
        "+213:DZ",
        "+1-684:AS",
        "+376:AD",
        "+244:AO",
        "+1-264:AI",
        "+1-268:AG",
        "+54:AR",
        "+374:AM",
        "+297:AW",
        "+61:AU",
        "+43:AT",
        "+994:AZ",
        "+1-242:BS",
        "+973:BH",
        "+880:BD",
        "+1-246:BB",
        "+375:BY",
        "+32:BE",
        "+501:BZ",
        "+229:BJ",
        "+1-441:BM",
        "+975:BT",
        "+591:BO",
        "+387:BA",
        "+267:BW",
        "+55:BR",
        "+1-284:VG",
        "+673:BN",
        "+359:BG",
        "+226:BF",
        "+257:BI",
        "+855:KH",
        "+237:CM",
        "+238:CV",
        "+1-345:KY",
        "+236:CF",
        "+235:TD",
        "+56:CL",
        "+86:CN",
        "+57:CO",
        "+269:KM",
        "+243:CD",
        "+242:CG",
        "+682:CK",
        "+506:CR",
        "+385:HR",
        "+53:CU",
        "+357:CY",
        "+420:CZ",
        "+45:DK",
        "+253:DJ",
        "+1-767:DM",
        "+1-809:DO",
        "+593:EC",
        "+20:EG",
        "+503:SV",
        "+240:GQ",
        "+291:ER",
        "+372:EE",
        "+268:SZ",
        "+251:ET",
        "+679:FJ",
        "+358:FI",
        "+33:FR",
        "+594:GF",
        "+689:PF",
        "+241:GA",
        "+220:GM",
        "+995:GE",
        "+49:DE",
        "+233:GH",
        "+350:GI",
        "+30:GR",
        "+299:GL",
        "+1-473:GD",
        "+590:GP",
        "+1-671:GU",
        "+502:GT",
        "+224:GN",
        "+245:GW",
        "+592:GY",
        "+509:HT",
        "+504:HN",
        "+852:HK",
        "+36:HU",
        "+354:IS",
        "+91:IN",
        "+62:ID",
        "+98:IR",
        "+964:IQ",
        "+353:IE",
        "+972:IL",
        "+39:IT",
        "+1-876:JM",
        "+81:JP",
        "+962:JO",
        "+7:KZ",
        "+254:KE",
        "+686:KI",
        "+965:KW",
        "+996:KG",
        "+856:LA",
        "+371:LV",
        "+961:LB",
        "+266:LS",
        "+231:LR",
        "+218:LY",
        "+423:LI",
        "+370:LT",
        "+352:LU",
        "+853:MO",
        "+261:MG",
        "+265:MW",
        "+60:MY",
        "+960:MV",
        "+223:ML",
        "+356:MT",
        "+692:MH",
        "+596:MQ",
        "+222:MR",
        "+230:MU",
        "+52:MX",
        "+691:FM",
        "+373:MD",
        "+377:MC",
        "+976:MN",
        "+382:ME",
        "+1-664:MS",
        "+212:MA",
        "+258:MZ",
        "+95:MM",
        "+264:NA",
        "+674:NR",
        "+977:NP",
        "+31:NL",
        "+687:NC",
        "+64:NZ",
        "+505:NI",
        "+227:NE",
        "+234:NG",
        "+850:KP",
        "+389:MK",
        "+47:NO",
        "+968:OM",
        "+92:PK",
        "+680:PW",
        "+970:PS",
        "+507:PA",
        "+675:PG",
        "+595:PY",
        "+51:PE",
        "+63:PH",
        "+48:PL",
        "+351:PT",
        "+1-787:PR",
        "+974:QA",
        "+262:RE",
        "+40:RO",
        "+7:RU",
        "+250:RW",
        "+1-869:KN",
        "+1-758:LC",
        "+1-784:VC",
        "+685:WS",
        "+378:SM",
        "+239:ST",
        "+966:SA",
        "+221:SN",
        "+381:RS",
        "+248:SC",
        "+232:SL",
        "+65:SG",
        "+421:SK",
        "+386:SI",
        "+677:SB",
        "+252:SO",
        "+27:ZA",
        "+82:KR",
        "+211:SS",
        "+34:ES",
        "+94:LK",
        "+249:SD",
        "+597:SR",
        "+46:SE",
        "+41:CH",
        "+963:SY",
        "+886:TW",
        "+992:TJ",
        "+255:TZ",
        "+66:TH",
        "+670:TL",
        "+228:TG",
        "+676:TO",
        "+1-868:TT",
        "+216:TN",
        "+90:TR",
        "+993:TM",
        "+1-649:TC",
        "+688:TV",
        "+256:UG",
        "+380:UA",
        "+971:AE",
        "+44:GB",
        "+598:UY",
        "+998:UZ",
        "+678:VU",
        "+379:VA",
        "+58:VE",
        "+84:VN",
        "+967:YE",
        "+260:ZM",
        "+263:ZW",
        "+93:AF",
      ],
      rowSpan: 1,
      fieldKey: "country_code",
      required: true,
      labelMsgKey: "common.label.countryCode",
      codeGroupCode: "COUNTRYCODE",
      defaultOptionValue: "US",
    },
    {
      id: "fb_myb1zwdds",
      type: "input",
      label: "",
      colSpan: 6,
      pattern: "^[0-9-]+$",
      rowSpan: 1,
      fieldKey: "phone",
      required: true,
      labelMsgKey: "common.label.contactInformation",
      patternDesc: "숫자와 -만 입력가능합니다.",
      placeholderMsgKey: "common.placeholder.officeNumber",
    },
    {
      id: "fb_1b3zprlan",
      type: "input",
      label: "",
      colSpan: 8,
      pattern: "^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$",
      rowSpan: 1,
      fieldKey: "email",
      required: true,
      labelMsgKey: "common.label.emailAddress",
      patternDesc: "영문/숫자/특수문자 '-' '_' '@' 입력",
      placeholderMsgKey: "currDtl.placeholder.email",
    },
    {
      id: "fb_f8693ji73",
      type: "editor",
      label: "",
      colSpan: 8,
      rowSpan: 3,
      fieldKey: "content",
      labelMsgKey: "",
      dataGenerations: [
        {
          stripHtml: true,
          onlyIfEmpty: true,
          generationKey: "seo.meta_description",
          truncateLength: 181,
        },
      ],
    },
    {
      id: "fb_6mzy2o4uh",
      type: "dateRange",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "training_date",
      required: true,
      labelMsgKey: "currDtlMgmt.label.addTrainingSchedule",
      disableEndPast: true,
      disableStartPast: true,
      descriptionMsgKey: "currDtlMgmt.description.trnDates",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_jel0c8w0b",
  contentKey: "curriculum_detail2",
  showBorder: true,
  connectedSlug: "currDtlMgmt-data",
};
const FORM_FIELDS_Form2: FormFieldItem[] = FORM_WIDGET_Form2.fields;
const FORM_FIELD_BY_ID_Form2: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form2.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form2 = buildKeyToId(FORM_FIELDS_Form2);
const SUBLIST_WIDGET_SubList1: SubListWidget = {
  type: "sublist",
  bgColor: "#ffffff",
  columns: [
    {
      id: "slc_p0j63stob",
      key: "date",
      type: "date",
      label: "",
      readonly: false,
      required: true,
      compareExpr: ">=$training_date_from,<=$training_date_to",
      disablePast: true,
      labelMsgKey: "training.label.trainingDate",
    },
    {
      id: "slc_kz3h7ybki",
      key: "time",
      type: "dateRange",
      label: "",
      required: true,
      labelMsgKey: "currDtlMgmt.label.trainingDuration",
      rangeSubType: "time",
    },
    {
      id: "slc_9cohfukml",
      key: "title",
      type: "textarea",
      label: "",
      pattern: "",
      required: true,
      maxLength: 100,
      labelMsgKey: "common.label.title",
      placeholderMsgKey: "",
    },
    {
      id: "slc_v2nfaz0n",
      key: "description",
      type: "textarea",
      label: "",
      required: false,
      maxLength: 198,
      labelMsgKey: "common.label.description",
    },
    {
      id: "slc_553gctb0u",
      key: "trainer",
      type: "input",
      label: "",
      required: false,
      maxLength: 100,
      labelMsgKey: "common.label.trainer",
      placeholderMsgKey: "",
    },
    {
      id: "slc_dgq7jnhgh",
      key: "action",
      type: "action",
      label: "",
      labelMsgKey: "common.label.manage",
      actions: ["copy", "delete"],
      required: false,
    },
  ],
  required: true,
  widgetId: "w_by8ge7rm4",
  contentKey: "training_schedule",
  showBorder: true,
  fieldColSpan: 8,
  connectedSlug: "currDtlMgmt-data",
  addButtonLabelMsgKey: "common.btn.add",
};
const FORM_WIDGET_Form3: FormWidget = {
  type: "form",
  fields: [
    {
      id: "fb_a71ctbvkt",
      type: "radio",
      label: "",
      colSpan: 5,
      options: ["무료:001", "유료:002"],
      rowSpan: 1,
      fieldKey: "training_fee_type",
      required: true,
      labelMsgKey: "common.label.trainingFeeType",
      codeGroupCode: "TRAININGFEETYPE",
      descriptionMsgKey: "session.description.trainingFee",
      defaultOptionValue: "001",
    },
    {
      id: "fb_k8fd52qdu",
      type: "input",
      label: "",
      colSpan: 3,
      pattern: "^[0-9]+$",
      rowSpan: 1,
      fieldKey: "training_fee",
      maxLength: 10,
      labelMsgKey: "common.label.trainingFee",
      patternDesc: "숫자만 입력 가능합니다.",
      hideCondition: "training_fee_type=001",
      showCharCount: true,
    },
    {
      id: "fb_krig5iuce",
      type: "radio",
      label: "",
      colSpan: 8,
      options: ["공개:001", "비공개:002"],
      rowSpan: 1,
      fieldKey: "is_visible",
      required: true,
      labelMsgKey: "common.label.isVisible",
      codeGroupCode: "VISIBILITY",
      defaultOptionValue: "001",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_dy1qxcgc3",
  contentKey: "curriculum_detail3",
  showBorder: true,
  connectedSlug: "currDtlMgmt-data",
};
const FORM_FIELDS_Form3: FormFieldItem[] = FORM_WIDGET_Form3.fields;
const FORM_FIELD_BY_ID_Form3: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form3.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form3 = buildKeyToId(FORM_FIELDS_Form3);
const FORM_WIDGET_Form4: FormWidget = {
  type: "form",
  fields: [
    {
      id: "fb_nqvkcsgyd",
      type: "input",
      label: "",
      colSpan: 8,
      pattern: "^[a-z0-9-]+$",
      rowSpan: 1,
      fieldKey: "slug",
      maxLength: 150,
      labelMsgKey: "common.lable.seo.slug",
      patternDesc: "",
      showCharCount: true,
      descriptionMsgKey: "common.description.seo.slug",
      patternDescMsgKey: "common.label.slugPattern",
      placeholderMsgKey: "common.placeholder.seo.slug",
    },
    {
      id: "fb_ub1g0l1oo",
      type: "input",
      label: "",
      colSpan: 8,
      rowSpan: 1,
      fieldKey: "meta_title",
      maxLength: 150,
      labelMsgKey: "common.label.seo.metaTitle",
      showCharCount: true,
      descriptionMsgKey: "common.description.seo.metaTitle",
      placeholderMsgKey: "common.create.placeholder.title",
    },
    {
      id: "fb_32x41r840",
      type: "textarea",
      label: "",
      colSpan: 8,
      rowSpan: 3,
      fieldKey: "meta_description",
      maxLength: 180,
      labelMsgKey: "common.label.seo.metaDescription",
      showCharCount: true,
      descriptionMsgKey: "common.description.seo.metaDescription",
      placeholderMsgKey: "common.placeholder.seo.metaDescription",
    },
  ],
  bgColor: "#ffffff",
  widgetId: "w_gz6qi1lkv",
  contentKey: "seo",
  connectedSlug: "currDtlMgmt-data",
};
const FORM_FIELDS_Form4: FormFieldItem[] = FORM_WIDGET_Form4.fields;
const FORM_FIELD_BY_ID_Form4: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form4.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form4 = buildKeyToId(FORM_FIELDS_Form4);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1, FORM_WIDGET_Form2, FORM_WIDGET_Form3, FORM_WIDGET_Form4];
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [
  FORM_WIDGET_Form1,
  FORM_WIDGET_Form2,
  FORM_WIDGET_Form3,
  MULTISELECT_WIDGET_MultiSelect1,
  SUBLIST_WIDGET_SubList1,
  MULTISELECT_WIDGET_MultiSelect2,
  FORM_WIDGET_Form4,
];
const GRID_ITEMS_Root = [
  {
    colSpan: 12,
    rowSpan: 38,
    contents: [
      { id: "pg_d8vmato5u", colSpan: 12, rowSpan: 3, widget: { type: "form", fields: FORM_FIELDS_Form1 } },
      { id: "pg_co3ei9jm9", colSpan: 12, rowSpan: 5, widget: { type: "multiselect" } },
      { id: "pg_yh19e6npa", colSpan: 12, rowSpan: 5, widget: { type: "multiselect" } },
      { id: "pg_uox788go3", colSpan: 12, rowSpan: 13, widget: { type: "form", fields: FORM_FIELDS_Form2 } },
      { id: "pg_ihu7lgv4w", colSpan: 12, rowSpan: 3, widget: { type: "sublist" } },
      { id: "pg_54kmspiit", colSpan: 12, rowSpan: 2, widget: { type: "form", fields: FORM_FIELDS_Form3 } },
      { id: "pg_kcgd7607y", colSpan: 12, rowSpan: 6, widget: { type: "form", fields: FORM_FIELDS_Form4 } },
      {
        id: "pg_vkgi19b0b",
        colSpan: 5,
        rowSpan: 1,
        widget: {
          type: "space",
          items: [
            { colSpan: 1, rowSpan: 1 },
            { colSpan: 1, rowSpan: 1 },
          ],
          align: "left",
        },
      },
    ],
  },
];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("session.lable.title"));
  }, [setPageTitle, t]);
  const { markDirty, markClean, confirmLeave } = useLeaveCheck(true);
  const searchParams = useSearchParams();
  const sitesLoaded = useSiteStore((s) => s.sitesLoaded);
  const clockReady = useServerClockStore((s) => s.status === "synced" || s.status === "failed");
  const storedId = searchParams.get("id") ? Number(searchParams.get("id")) : null;
  const [recordLoaded, setRecordLoaded] = useState(false);
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
  const [multiSelectIdsMultiSelect2, setMultiSelectIdsMultiSelect2] = useState<number[]>([]);
  const [multiSelectOptionsMultiSelect2, setMultiSelectOptionsMultiSelect2] = useState<MultiSelectOptionItem[]>([]);
  const [multiSelectSearchMultiSelect2, setMultiSelectSearchMultiSelect2] = useState("");
  const [multiSelectOpenMultiSelect2, setMultiSelectOpenMultiSelect2] = useState(false);
  const multiSelectButtonRefMultiSelect2 = useRef<HTMLButtonElement>(null);
  const [formValuesForm2, setFormValuesForm2] = useState<Record<string, string>>({});
  const [subListRowsSubList1, setSubListRowsSubList1] = useState<SubListRow[]>([]);
  const [formValuesForm3, setFormValuesForm3] = useState<Record<string, string>>({});
  const [formValuesForm4, setFormValuesForm4] = useState<Record<string, string>>({});
  const confirmLeaveStoreSpace1 = useLeaveCheckStore((s) => s.confirmLeave);
  const router = useRouter();

  const formRowDataForm1 = useMemo(() => buildFormRowData(FORM_FIELDS_Form1, formValuesForm1), [formValuesForm1]);

  const handleDerivedChangeForm1 = useCallback((fieldKey: string, derived: Record<string, string>) => {
    Object.entries(derived).forEach(([derivedKey, v]) => {
      setFormValuesForm1((prev) => ({ ...prev, [`${fieldKey}.${derivedKey}`]: v }));
    });
  }, []);

  const urlParams = useMemo(() => {
    const skip = new Set(["id", "group_id"]);
    const map: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      if (!skip.has(key)) map[key] = value;
    });
    return map;
  }, [searchParams]);

  const fieldKeyIdAndLabelMaps = useMemo(() => buildFieldKeyIdAndLabelMaps(ALL_FORM_WIDGETS, t), [t]);
  const allFieldKeyToId = fieldKeyIdAndLabelMaps.allFieldKeyToId;
  const allFieldLabels = fieldKeyIdAndLabelMaps.allFieldLabels;
  const allFormValues = useMemo(
    () =>
      Object.assign({}, formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4) as Record<string, string>,
    [formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4]
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

  useEffect(() => {
    setRecordLoaded(false);
    if (storedId === null) {
      if (!sitesLoaded || !clockReady) return;
      const defaults = applyUrlParamFormOverrides(
        initFormDefaultValues(ALL_FORM_WIDGETS, t),
        ALL_FORM_WIDGETS,
        searchParams
      );
      setFormValuesForm1(defaults["w_fmha6bh7u"] ?? {});
      setFormValuesForm2(defaults["w_jel0c8w0b"] ?? {});
      setFormValuesForm3(defaults["w_dy1qxcgc3"] ?? {});
      setFormValuesForm4(defaults["w_gz6qi1lkv"] ?? {});
      setRecordLoaded(true);
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/currDtlMgmt-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_fmha6bh7u"] ?? {}) }));
        setFormValuesForm2((prev) => ({ ...prev, ...(valuesByWidgetId["w_jel0c8w0b"] ?? {}) }));
        setFormValuesForm3((prev) => ({ ...prev, ...(valuesByWidgetId["w_dy1qxcgc3"] ?? {}) }));
        setFormValuesForm4((prev) => ({ ...prev, ...(valuesByWidgetId["w_gz6qi1lkv"] ?? {}) }));
        const selectionMultiSelect1 = extractMultiSelectSelection(dataJson, "power_list", "currDtlMgmt-data");
        if (selectionMultiSelect1.kind !== "none") setMultiSelectIdsMultiSelect1(selectionMultiSelect1.ids);
        const selectionMultiSelect2 = extractMultiSelectSelection(dataJson, "automation_list", "currDtlMgmt-data");
        if (selectionMultiSelect2.kind !== "none") setMultiSelectIdsMultiSelect2(selectionMultiSelect2.ids);
        setSubListRowsSubList1(extractSubListRows(dataJson, "training_schedule"));
        setRecordLoaded(true);
      })
      .catch(() => toast.error(t("common.error.load_existing_data")));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storedId, searchParams, sitesLoaded, clockReady]);

  const visibleFieldsForm1 = useMemo(
    () => FORM_FIELDS_Form1.filter((f) => !(f.hideCondition && evalFieldConditionForm1(f.hideCondition))),
    [evalFieldConditionForm1]
  );
  const fieldRowIsAutoForm1 = calculateFormFieldRowTracks(visibleFieldsForm1, 12, false);

  const multiSelectPrevHiddenMultiSelect1 = useRef<boolean | undefined>(undefined);
  const multiSelectAllFormValuesMultiSelect1 = useMemo(
    () =>
      Object.assign({}, formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4) as Record<string, string>,
    [formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4]
  );
  const multiSelectAllFieldKeyToIdMultiSelect1 = useMemo(
    () =>
      Object.assign(
        {},
        FORM_KEY_TO_ID_Form1,
        FORM_KEY_TO_ID_Form2,
        FORM_KEY_TO_ID_Form3,
        FORM_KEY_TO_ID_Form4
      ) as Record<string, string>,
    []
  );
  useEffect(() => {
    if (!recordLoaded || storedId === null) return;
    const isHidden = evalWidgetHideCondition(
      "curriculum_id.product_category!=P",
      multiSelectAllFieldKeyToIdMultiSelect1,
      multiSelectAllFormValuesMultiSelect1
    );
    const wasHidden = multiSelectPrevHiddenMultiSelect1.current;
    if (wasHidden === undefined) {
      multiSelectPrevHiddenMultiSelect1.current = isHidden;
      return;
    }
    if (!wasHidden && isHidden) {
      setMultiSelectIdsMultiSelect1([]);
      markDirty();
    }
    multiSelectPrevHiddenMultiSelect1.current = isHidden;
  }, [recordLoaded, storedId, multiSelectAllFieldKeyToIdMultiSelect1, multiSelectAllFormValuesMultiSelect1, markDirty]);

  const multiSelectVisibilityKeyToIdMultiSelect1 = useMemo(
    () =>
      buildFieldKeyIdAndLabelMaps([FORM_WIDGET_Form1, FORM_WIDGET_Form2, FORM_WIDGET_Form3, FORM_WIDGET_Form4])
        .allFieldKeyToId,
    []
  );
  const multiSelectVisibleMultiSelect1 = !evalWidgetHideCondition(
    "curriculum_id.product_category!=P",
    multiSelectVisibilityKeyToIdMultiSelect1,
    multiSelectAllFormValuesMultiSelect1
  );
  useEffect(() => {
    if (!multiSelectVisibleMultiSelect1) {
      setMultiSelectOptionsMultiSelect1((prev) => (prev.length > 0 ? [] : prev));
      setMultiSelectSearchMultiSelect1("");
      setMultiSelectOpenMultiSelect1(false);
      return;
    }
    let cancelled = false;
    fetchMultiSelectSourceRows("product-data", undefined, undefined, [5, 33], 4, "product_type=P,has_training=001")
      .then((rows) => {
        if (cancelled) return;
        const flatRows = rows.map((r) => flattenPageDataItem(r as Parameters<typeof flattenPageDataItem>[0]));
        const filteredRows = flatRows.filter((row) =>
          evalConditionExpr("product_type=P,has_training=001", (key) =>
            key in row ? String(row[key] ?? "") : undefined
          )
        );
        setMultiSelectOptionsMultiSelect1(filteredRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));
      })
      .catch((err) => console.warn("[MultiSelect1] " + "product-data", err));
    return () => {
      cancelled = true;
    };
  }, [multiSelectVisibleMultiSelect1]);

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
    const seen = new Set<string>();
    return searched.filter(({ entry }) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    });
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

  const multiSelectPrevHiddenMultiSelect2 = useRef<boolean | undefined>(undefined);
  const multiSelectAllFormValuesMultiSelect2 = useMemo(
    () =>
      Object.assign({}, formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4) as Record<string, string>,
    [formValuesForm1, formValuesForm2, formValuesForm3, formValuesForm4]
  );
  const multiSelectAllFieldKeyToIdMultiSelect2 = useMemo(
    () =>
      Object.assign(
        {},
        FORM_KEY_TO_ID_Form1,
        FORM_KEY_TO_ID_Form2,
        FORM_KEY_TO_ID_Form3,
        FORM_KEY_TO_ID_Form4
      ) as Record<string, string>,
    []
  );
  useEffect(() => {
    if (!recordLoaded || storedId === null) return;
    const isHidden = evalWidgetHideCondition(
      "curriculum_id.product_category!=A",
      multiSelectAllFieldKeyToIdMultiSelect2,
      multiSelectAllFormValuesMultiSelect2
    );
    const wasHidden = multiSelectPrevHiddenMultiSelect2.current;
    if (wasHidden === undefined) {
      multiSelectPrevHiddenMultiSelect2.current = isHidden;
      return;
    }
    if (!wasHidden && isHidden) {
      setMultiSelectIdsMultiSelect2([]);
      markDirty();
    }
    multiSelectPrevHiddenMultiSelect2.current = isHidden;
  }, [recordLoaded, storedId, multiSelectAllFieldKeyToIdMultiSelect2, multiSelectAllFormValuesMultiSelect2, markDirty]);

  const multiSelectVisibilityKeyToIdMultiSelect2 = useMemo(
    () =>
      buildFieldKeyIdAndLabelMaps([FORM_WIDGET_Form1, FORM_WIDGET_Form2, FORM_WIDGET_Form3, FORM_WIDGET_Form4])
        .allFieldKeyToId,
    []
  );
  const multiSelectVisibleMultiSelect2 = !evalWidgetHideCondition(
    "curriculum_id.product_category!=A",
    multiSelectVisibilityKeyToIdMultiSelect2,
    multiSelectAllFormValuesMultiSelect2
  );
  useEffect(() => {
    if (!multiSelectVisibleMultiSelect2) {
      setMultiSelectOptionsMultiSelect2((prev) => (prev.length > 0 ? [] : prev));
      setMultiSelectSearchMultiSelect2("");
      setMultiSelectOpenMultiSelect2(false);
      return;
    }
    let cancelled = false;
    fetchMultiSelectSourceRows("product-data", undefined, undefined, [35], 34, "product_type=A,has_training=001")
      .then((rows) => {
        if (cancelled) return;
        const flatRows = rows.map((r) => flattenPageDataItem(r as Parameters<typeof flattenPageDataItem>[0]));
        const filteredRows = flatRows.filter((row) =>
          evalConditionExpr("product_type=A,has_training=001", (key) =>
            key in row ? String(row[key] ?? "") : undefined
          )
        );
        setMultiSelectOptionsMultiSelect2(filteredRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));
      })
      .catch((err) => console.warn("[MultiSelect2] " + "product-data", err));
    return () => {
      cancelled = true;
    };
  }, [multiSelectVisibleMultiSelect2]);

  const multiSelectRowsMultiSelect2 = useMemo(
    () =>
      multiSelectOptionsMultiSelect2.flatMap((opt) =>
        buildLabelPathEntries(opt, MULTISELECT_WIDGET_MultiSelect2).map((entry, pathIdx) => ({ opt, entry, pathIdx }))
      ),
    [multiSelectOptionsMultiSelect2]
  );
  const multiSelectDisplayRowsMultiSelect2 = useMemo(() => {
    const q = multiSelectSearchMultiSelect2.toLowerCase();
    const searched = q
      ? multiSelectRowsMultiSelect2.filter(({ entry }) => entry.path.toLowerCase().includes(q))
      : multiSelectRowsMultiSelect2;
    const seen = new Set<string>();
    return searched.filter(({ entry }) => {
      if (seen.has(entry.path)) return false;
      seen.add(entry.path);
      return true;
    });
  }, [multiSelectRowsMultiSelect2, multiSelectSearchMultiSelect2]);
  const multiSelectSelectedEntriesMultiSelect2 = multiSelectRowsMultiSelect2.filter(({ entry }) =>
    multiSelectIdsMultiSelect2.includes(entry.selectionId)
  );

  const toggleMultiSelectMultiSelect2 = useCallback(
    (id: number) => {
      setMultiSelectIdsMultiSelect2((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      markDirty();
    },
    [markDirty]
  );
  const removeMultiSelectMultiSelect2 = useCallback(
    (id: number) => {
      setMultiSelectIdsMultiSelect2((prev) => prev.filter((x) => x !== id));
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

  const visibleFieldsForm2 = useMemo(
    () => FORM_FIELDS_Form2.filter((f) => !(f.hideCondition && evalFieldConditionForm2(f.hideCondition))),
    [evalFieldConditionForm2]
  );
  const fieldRowIsAutoForm2 = calculateFormFieldRowTracks(visibleFieldsForm2, 12, false);

  const handleSubListRowsChangeSubList1 = useCallback(
    (rows: SubListRow[]) => {
      setSubListRowsSubList1(rows);
      markDirty();
    },
    [markDirty]
  );

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

  const visibleFieldsForm3 = useMemo(
    () => FORM_FIELDS_Form3.filter((f) => !(f.hideCondition && evalFieldConditionForm3(f.hideCondition))),
    [evalFieldConditionForm3]
  );
  const fieldRowIsAutoForm3 = calculateFormFieldRowTracks(visibleFieldsForm3, 12, false);

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

  const visibleFieldsForm4 = useMemo(
    () => FORM_FIELDS_Form4.filter((f) => !(f.hideCondition && evalFieldConditionForm4(f.hideCondition))),
    [evalFieldConditionForm4]
  );
  const fieldRowIsAutoForm4 = calculateFormFieldRowTracks(visibleFieldsForm4, 12, false);

  const handleContentActionSpace1_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form1, formValuesForm1, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form2, formValuesForm2, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form3, formValuesForm3, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (!validateFormFields(FORM_FIELDS_Form4, formValuesForm4, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    if (
      !validateSubListRows(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof validateSubListRows>[0],
        { w_by8ge7rm4: subListRowsSubList1 },
        {},
        allFormValues,
        allFieldKeyToId,
        allFieldLabels,
        t
      )
    )
      return;
    const missingMultiSelectTitle = findMissingRequiredMultiSelect(
      CONTENT_WIDGETS_Space1_1,
      { w_rf6vsc54u: multiSelectIdsMultiSelect1, w_gvuplil3i: multiSelectIdsMultiSelect2 },
      allFieldKeyToId,
      allFormValues,
      t
    );
    if (missingMultiSelectTitle !== null) {
      toast.warning(t("common.validation.multiselect_required", { title: missingMultiSelectTitle }));
      return;
    }
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(CONTENT_WIDGETS_Space1_1, {}, "currDtlMgmt-data", false);
      const processedSubListRowsMap = await uploadContentSubListFiles(
        CONTENT_WIDGETS_Space1_1,
        { w_by8ge7rm4: subListRowsSubList1 },
        {},
        "currDtlMgmt-data",
        newFileIdsByFieldId
      );
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space1_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        {
          w_fmha6bh7u: formValuesForm1,
          w_jel0c8w0b: formValuesForm2,
          w_dy1qxcgc3: formValuesForm3,
          w_gz6qi1lkv: formValuesForm4,
        },
        formFileIdsMap,
        processedSubListRowsMap,
        { w_rf6vsc54u: multiSelectIdsMultiSelect1, w_gvuplil3i: multiSelectIdsMultiSelect2 },
        {},
        "currDtlMgmt-data",
        allFormValues,
        false,
        allFieldKeyToId
      );
      await persistContentDataJson({
        connectedSlug: "currDtlMgmt-data",
        dataJson,
        pkKeys,
        templateSlug: "currDltMgmt-basicInfo",
        groupId: undefined,
        storedId,
        storedGroupId: null,
        validationRuleIds: [],
        isEntity: false,
        entityDateFields: [...FORM_FIELDS_Form1, ...FORM_FIELDS_Form2, ...FORM_FIELDS_Form3, ...FORM_FIELDS_Form4],
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

  const gridVisibleFieldIdsRoot = useMemo(
    () =>
      new Set(
        [...visibleFieldsForm1, ...visibleFieldsForm2, ...visibleFieldsForm3, ...visibleFieldsForm4].map((f) => f.id)
      ),
    [visibleFieldsForm1, visibleFieldsForm2, visibleFieldsForm3, visibleFieldsForm4]
  );
  const gridRatchetRoot = useRef<Map<string, number>>(new Map());
  const gridLayoutRoot = useMemo(() => {
    if (!recordLoaded) {
      gridRatchetRoot.current = new Map();
      return resolveGeneratedGridLayout(
        GRID_ITEMS_Root,
        [
          true,
          !evalWidgetHideCondition("curriculum_id.product_category!=P", allFieldKeyToId, allFormValues),
          !evalWidgetHideCondition("curriculum_id.product_category!=A", allFieldKeyToId, allFormValues),
          true,
          true,
          true,
          true,
          true,
        ],
        { visibleFieldIds: gridVisibleFieldIdsRoot }
      );
    }
    return resolveGeneratedGridLayout(
      GRID_ITEMS_Root,
      [
        true,
        !evalWidgetHideCondition("curriculum_id.product_category!=P", allFieldKeyToId, allFormValues),
        !evalWidgetHideCondition("curriculum_id.product_category!=A", allFieldKeyToId, allFormValues),
        true,
        true,
        true,
        true,
        true,
      ],
      { visibleFieldIds: gridVisibleFieldIdsRoot, maxRowSpanByContentId: gridRatchetRoot.current }
    );
  }, [recordLoaded, allFieldKeyToId, allFormValues, gridVisibleFieldIdsRoot]);

  return (
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={gridLayoutRoot[0].rowSpan} autoHeight={gridLayoutRoot[0].autoHeight}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: gridLayoutRoot[0].rowTracks,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          {gridLayoutRoot[0].contents[0].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[0].rowSpan}`,
                ...gridLayoutRoot[0].contents[0].heightStyle,
              }}
            >
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
                    {t("training.label.trainingCourse")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form1["fb_oexkvvp4c"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_oexkvvp4c`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm1["fb_oexkvvp4c"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm1("fb_oexkvvp4c", parsed.value)}
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
                    {t("course.label.select")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <SlugAutocompleteInput
                      field={
                        {
                          optionSlug: "currMgmt-data",
                          optionValueKey: "id",
                          optionTextKey: "title",
                          optionFilter: "training_course=$training_course",
                          optionDerivedKeys: "product_category",
                        } as unknown as SearchFieldConfig
                      }
                      value={formValuesForm1["fb_41f0r5p2p"] ?? ""}
                      onChange={(v) => handleFieldChangeForm1("fb_41f0r5p2p", v)}
                      onDerivedChange={(derived) => handleDerivedChangeForm1("curriculum_id", derived)}
                      isDisabled={false}
                      isReadOnly={false}
                      placeholder={t("common.select.placeholder")}
                      rowData={formRowDataForm1}
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.trnType")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form1["fb_vsj496ofm"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        const selected = (formValuesForm1["fb_vsj496ofm"] ?? "").split(",").filter(Boolean);
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
                                  "fb_vsj496ofm",
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
          )}
          {gridLayoutRoot[0].contents[1].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[1].rowSpan}`,
                ...gridLayoutRoot[0].contents[1].heightStyle,
              }}
            >
              <div
                className="h-full w-full rounded border border-slate-200"
                style={{ overflow: "clip", backgroundColor: "#ffffff" }}
              >
                <div className="p-3 flex flex-col gap-3 h-full">
                  <p className="text-sm font-medium text-slate-700">
                    {t("common.label.powerPrd")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </p>
                  <p className="text-xs text-slate-500">{t("session.description.product")}</p>
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
                            : t("common.placeholder.powerPrd")}
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
          )}
          {gridLayoutRoot[0].contents[2].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[2].rowSpan}`,
                ...gridLayoutRoot[0].contents[2].heightStyle,
              }}
            >
              <div
                className="h-full w-full rounded border border-slate-200"
                style={{ overflow: "clip", backgroundColor: "#ffffff" }}
              >
                <div className="p-3 flex flex-col gap-3 h-full">
                  <p className="text-sm font-medium text-slate-700">
                    {t("common.label.automationPrd")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </p>
                  <p className="text-xs text-slate-500">{t("session.description.product")}</p>
                  <div className="flex flex-col gap-3" style={{ width: "66.66666666666666%" }}>
                    <div className="relative">
                      <button
                        ref={multiSelectButtonRefMultiSelect2}
                        type="button"
                        onClick={() => setMultiSelectOpenMultiSelect2((prev) => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:border-slate-400 transition-colors disabled:cursor-default"
                      >
                        <span
                          className={
                            multiSelectSelectedEntriesMultiSelect2.length > 0 ? "text-slate-800" : "text-slate-400"
                          }
                        >
                          {multiSelectSelectedEntriesMultiSelect2.length > 0
                            ? t("common.multiselect.selected_count", {
                                count: String(multiSelectSelectedEntriesMultiSelect2.length),
                              })
                            : t("common.placeholder.automationPrd")}
                        </span>
                        <ChevronDown
                          className={
                            multiSelectOpenMultiSelect2
                              ? "w-4 h-4 shrink-0 text-slate-400 transition-transform rotate-180"
                              : "w-4 h-4 shrink-0 text-slate-400 transition-transform "
                          }
                        />
                      </button>
                      <PortalDropdown
                        open={multiSelectOpenMultiSelect2}
                        anchorRef={multiSelectButtonRefMultiSelect2}
                        onOutsideClick={() => setMultiSelectOpenMultiSelect2(false)}
                        className="bg-white border border-slate-200 rounded-md shadow-lg"
                      >
                        <div className="p-2 border-b border-slate-100">
                          <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <input
                              type="text"
                              value={multiSelectSearchMultiSelect2}
                              onChange={(e) => setMultiSelectSearchMultiSelect2(e.target.value)}
                              placeholder={t("common.input.search_placeholder")}
                              className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
                            />
                          </div>
                        </div>
                        <ul className="max-h-48 overflow-y-auto py-1">
                          {multiSelectDisplayRowsMultiSelect2.length === 0 ? (
                            <li className="px-3 py-2 text-xs text-slate-400 text-center">
                              {t("common.table.no_data")}
                            </li>
                          ) : (
                            multiSelectDisplayRowsMultiSelect2.map(({ opt, entry, pathIdx }) => (
                              <li key={`${opt.id}-${pathIdx}`}>
                                <label className="flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={multiSelectIdsMultiSelect2.includes(entry.selectionId)}
                                    onChange={() => toggleMultiSelectMultiSelect2(entry.selectionId)}
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
                    {multiSelectSelectedEntriesMultiSelect2.length > 0 && (
                      <div className="max-h-56 overflow-y-auto">
                        <div className="flex flex-col gap-1.5">
                          {multiSelectSelectedEntriesMultiSelect2.map(({ opt, entry, pathIdx }) => (
                            <div
                              key={`${opt.id}-${pathIdx}`}
                              className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto"
                            >
                              <span className="text-xs font-medium text-slate-700 shrink-0 whitespace-nowrap">
                                {entry.path}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeMultiSelectMultiSelect2(entry.selectionId)}
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
          )}
          {gridLayoutRoot[0].contents[3].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[3].rowSpan}`,
                ...gridLayoutRoot[0].contents[3].heightStyle,
              }}
            >
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
                    {t("common.label.title")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("session.description.title")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("currDtlMgmt.placeholder.title")}
                        maxLength={150}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm2["fb_8i6z6jlds"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_8i6z6jlds", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_8i6z6jlds")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm2["fb_8i6z6jlds"] ?? "").length}/{150}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.regRange")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("currDtlMgmt.description.regDate")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm2["fb_4qr90xzp2_from"] ?? ""}
                          min={formatNowBySubType("date")}
                          onChange={(e) => handleFieldChangeForm2("fb_4qr90xzp2_from", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                      <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm2["fb_4qr90xzp2_to"] ?? ""}
                          min={formatNowBySubType("date")}
                          onChange={(e) => handleFieldChangeForm2("fb_4qr90xzp2_to", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("currDtlMgmt.label.trainingDuration")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("currDtlMgmt.placeholder.trainingDuration")}
                        maxLength={10}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm2["fb_2ty59yr6i"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_2ty59yr6i", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_2ty59yr6i")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm2["fb_2ty59yr6i"] ?? "").length}/{10}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("currDtlMgmt.label.trainingCapacity")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("currMgmt.description.trainingCapacity")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("currDtlMgmt.placeholder.trainingCapacity")}
                        maxLength={10}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                        value={formValuesForm2["fb_qe3u3ijc0"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_qe3u3ijc0", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_qe3u3ijc0")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm2["fb_qe3u3ijc0"] ?? "").length}/{10}
                      </span>
                    </div>
                  </div>
                </div>
                {!evalFieldConditionForm2("training_type!=001") && (
                  <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                    <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                      {t("common.label.trainingLocation")}
                      <span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                      {t("common.description.address")}
                    </p>
                    <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                      <AddressAutocompleteInput
                        value={formValuesForm2["fb_ccy7t01xm"] ?? ""}
                        onAddressSelect={(address, lat, lng) => {
                          handleFieldChangeForm2("fb_ccy7t01xm", address);
                          handleFieldChangeForm2("fb_ccy7t01xm_lat", String(lat));
                          handleFieldChangeForm2("fb_ccy7t01xm_lng", String(lng));
                        }}
                        placeholder={t("common.placeholder.address")}
                        isDisabled={false}
                        isReadOnly={false}
                        language={"en"}
                      />
                    </div>
                  </div>
                )}
                {!evalFieldConditionForm2("training_type!=001") && (
                  <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                    <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                      {t("currDtlMgmt.label.addressLine2")}
                    </label>
                    <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                      <input
                        type="text"
                        disabled={false}
                        placeholder={t("common.placeholder.detailAddress")}
                        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                        value={formValuesForm2["fb_nr5phlmfk"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_nr5phlmfk", e.target.value)}
                        onBlur={() => handleFieldBlurForm2("fb_nr5phlmfk")}
                      />
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 2", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.countryCode")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="relative">
                      <select
                        disabled={false}
                        className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                        value={formValuesForm2["fb_9x43gd5ib"] ?? ""}
                        onChange={(e) => handleFieldChangeForm2("fb_9x43gd5ib", e.target.value)}
                      >
                        <option value="">{t("common.select.placeholder")}</option>
                        {resolveFieldOptions(
                          FORM_FIELD_BY_ID_Form2["fb_9x43gd5ib"] as unknown as SearchFieldConfig,
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 6", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.contactInformation")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("common.placeholder.officeNumber")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      value={formValuesForm2["fb_myb1zwdds"] ?? ""}
                      onChange={(e) => handleFieldChangeForm2("fb_myb1zwdds", e.target.value)}
                      onBlur={() => handleFieldBlurForm2("fb_myb1zwdds")}
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.emailAddress")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("currDtl.placeholder.email")}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                      value={formValuesForm2["fb_1b3zprlan"] ?? ""}
                      onChange={(e) => handleFieldChangeForm2("fb_1b3zprlan", e.target.value)}
                      onBlur={() => handleFieldBlurForm2("fb_1b3zprlan")}
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 3" }}>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <TiptapEditor
                      initialValue={formValuesForm2["fb_f8693ji73"] ?? ""}
                      onChange={(v: string) => handleFieldChangeForm2("fb_f8693ji73", v)}
                      height="258px"
                    />
                  </div>
                </div>
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("currDtlMgmt.label.addTrainingSchedule")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("currDtlMgmt.description.trnDates")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm2["fb_6mzy2o4uh_from"] ?? ""}
                          min={formatNowBySubType("date")}
                          onChange={(e) => handleFieldChangeForm2("fb_6mzy2o4uh_from", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                      <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                      <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                          type="date"
                          disabled={false}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pl-9"
                          value={formValuesForm2["fb_6mzy2o4uh_to"] ?? ""}
                          min={formatNowBySubType("date")}
                          onChange={(e) => handleFieldChangeForm2("fb_6mzy2o4uh_to", e.target.value)}
                          onClick={(e) => e.currentTarget.showPicker?.()}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {gridLayoutRoot[0].contents[4].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[4].rowSpan}`,
                ...gridLayoutRoot[0].contents[4].heightStyle,
              }}
            >
              <SubListRenderer
                mode="live"
                widget={SUBLIST_WIDGET_SubList1}
                rows={subListRowsSubList1}
                onChange={handleSubListRowsChangeSubList1}
              />
            </div>
          )}
          {gridLayoutRoot[0].contents[5].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[5].rowSpan}`,
                ...gridLayoutRoot[0].contents[5].heightStyle,
              }}
            >
              <div
                className="w-full rounded border border-slate-200"
                style={{
                  overflow: "clip",
                  backgroundColor: "#ffffff",
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
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 5", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.trainingFeeType")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                    {t("session.description.trainingFee")}
                  </p>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form3["fb_a71ctbvkt"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_a71ctbvkt`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm3["fb_a71ctbvkt"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm3("fb_a71ctbvkt", parsed.value)}
                              className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{t(parsed.text)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
                {!evalFieldConditionForm3("training_fee_type=001") && (
                  <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 3", gridRow: "span 1" }}>
                    <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                      {t("common.label.trainingFee")}
                    </label>
                    <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                      <div className="relative">
                        <input
                          type="text"
                          disabled={false}
                          placeholder={t("common.input.placeholder")}
                          maxLength={10}
                          className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                          value={formValuesForm3["fb_k8fd52qdu"] ?? ""}
                          onChange={(e) => handleFieldChangeForm3("fb_k8fd52qdu", e.target.value)}
                          onBlur={() => handleFieldBlurForm3("fb_k8fd52qdu")}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                          {(formValuesForm3["fb_k8fd52qdu"] ?? "").length}/{10}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    {t("common.label.isVisible")}
                    <span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                    <div className="flex items-center gap-4">
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form3["fb_krig5iuce"] as unknown as SearchFieldConfig,
                        groups
                      ).map((opt) => {
                        const parsed = parseOpt(opt);
                        return (
                          <label key={opt} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name={`${uid}-field-fb_krig5iuce`}
                              disabled={false}
                              value={parsed.value}
                              checked={(formValuesForm3["fb_krig5iuce"] ?? "") === parsed.value}
                              onChange={() => handleFieldChangeForm3("fb_krig5iuce", parsed.value)}
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
          )}
          {gridLayoutRoot[0].contents[6].visible && (
            <div
              style={{
                gridColumn: "span 12",
                gridRow: `span ${gridLayoutRoot[0].contents[6].rowSpan}`,
                ...gridLayoutRoot[0].contents[6].heightStyle,
              }}
            >
              <div
                className="w-full rounded border border-slate-200"
                style={{
                  overflow: "clip",
                  backgroundColor: "#ffffff",
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
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
                        value={formValuesForm4["fb_nqvkcsgyd"] ?? ""}
                        onChange={(e) => handleFieldChangeForm4("fb_nqvkcsgyd", e.target.value)}
                        onBlur={() => handleFieldBlurForm4("fb_nqvkcsgyd")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm4["fb_nqvkcsgyd"] ?? "").length}/{150}
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
                        value={formValuesForm4["fb_ub1g0l1oo"] ?? ""}
                        onChange={(e) => handleFieldChangeForm4("fb_ub1g0l1oo", e.target.value)}
                        onBlur={() => handleFieldBlurForm4("fb_ub1g0l1oo")}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                        {(formValuesForm4["fb_ub1g0l1oo"] ?? "").length}/{150}
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
                        value={formValuesForm4["fb_32x41r840"] ?? ""}
                        maxLength={180}
                        placeholder={t("common.placeholder.seo.metaDescription")}
                        onChange={(e) => handleFieldChangeForm4("fb_32x41r840", e.target.value)}
                      />
                      <div className="text-right text-[10px] text-slate-400 mt-0.5">
                        {(formValuesForm4["fb_32x41r840"] ?? "").length}/{180}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          {gridLayoutRoot[0].contents[7].visible && (
            <div
              style={{
                gridColumn: "span 5",
                gridRow: `span ${gridLayoutRoot[0].contents[7].rowSpan}`,
                ...gridLayoutRoot[0].contents[7].heightStyle,
              }}
            >
              <div
                className="w-full rounded"
                style={{
                  overflow: "visible",
                  display: "grid",
                  gridTemplateColumns: "repeat(5, 1fr)",
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
                      if (confirmLeaveStoreSpace1 && !confirmLeaveStoreSpace1()) return;
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
          )}
        </div>
      </GridCell>
    </PageLayout>
  );
}
