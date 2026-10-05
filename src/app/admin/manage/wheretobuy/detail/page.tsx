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
import { AddressAutocompleteInput } from "@/app/admin/templates/make/_shared/components/renderer/AutocompleteField";
import api from "@/lib/api";
import { toast } from "sonner";
import { calculateFormFieldRowTracks } from "@/app/admin/templates/make/_shared/utils/formGridLayout";
import type { ContentSaveWidget } from "@/app/admin/templates/make/_shared/utils/contentSave";
import {
  uploadContentFormFiles,
  buildFormFileIdsMap,
  persistContentDataJson,
} from "@/app/admin/templates/make/_shared/utils/contentSave";
import { useLeaveCheckStore } from "@/store/use-leave-check-store";

const FORM_WIDGET_Form1: FormWidget = {
  type: "form",
  widgetId: "w_vfco59rj7",
  contentKey: "agency",
  fields: [
    {
      id: "fb_mcdg5gs74",
      type: "input",
      label: "",
      fieldKey: "agency_name",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "wheretobuy.agency.label.companyNm",
      required: true,
      placeholderMsgKey: "wheretobuy.agency.placeholder.companyNm",
      minLength: 1,
      maxLength: 50,
      showCharCount: true,
      descriptionMsgKey: "",
    },
    {
      id: "fb_cc8ljfcen",
      type: "address",
      label: "",
      fieldKey: "address",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.address",
      descriptionMsgKey: "common.description.address",
      placeholderMsgKey: "common.placeholder.address",
      addressLanguage: "en",
      required: true,
    },
    {
      id: "fb_df6xglecg",
      type: "input",
      label: "",
      fieldKey: "address_detail",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "currDtlMgmt.label.addressLine2",
      maxLength: 50,
      placeholderMsgKey: "common.placeholder.detailAddress",
    },
    {
      id: "fb_t0y41vaxy",
      type: "hidden",
      label: "",
      fieldKey: "temp1",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "1",
    },
    {
      id: "fb_f1r2kspy8",
      type: "hidden",
      label: "",
      fieldKey: "temp2",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "1",
    },
    {
      id: "fb_6fwhy2gyf",
      type: "hidden",
      label: "",
      fieldKey: "temp3",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "1",
    },
    {
      id: "fb_kxayv2mlx",
      type: "hidden",
      label: "",
      fieldKey: "temp4",
      colSpan: 1,
      rowSpan: 1,
      defaultValue: "1",
    },
    {
      id: "fb_pk99zjkka",
      type: "select",
      label: "",
      fieldKey: "country_code",
      colSpan: 2,
      rowSpan: 1,
      labelMsgKey: "common.label.countryCode",
      options: [
        "+1:CA",
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
        "+1:US",
      ],
      codeGroupCode: "COUNTRYCODE",
      defaultOptionValue: "US",
      required: true,
    },
    {
      id: "fb_awpv58589",
      type: "input",
      label: "",
      fieldKey: "office_number",
      colSpan: 6,
      rowSpan: 1,
      labelMsgKey: "common.label.officeNumber",
      required: true,
      placeholderMsgKey: "common.placeholder.officeNumber",
      showCharCount: false,
      pattern: "^[0-9-]+$",
      patternDesc: "숫자, 대시(-) 만 입력가능",
    },
    {
      id: "fb_hac8vhxpc",
      type: "input",
      label: "",
      fieldKey: "homepage",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "admin.label.sitePerm",
      placeholderMsgKey: "common.placeholder.hompage",
      required: false,
    },
    {
      id: "fb_8ovl5kpla",
      type: "radio",
      label: "",
      fieldKey: "is_visible",
      colSpan: 8,
      rowSpan: 1,
      labelMsgKey: "common.label.isVisible",
      descriptionMsgKey: "common.description.invisible",
      options: ["공개:001", "비공개:002"],
      codeGroupCode: "VISIBILITY",
      defaultOptionValue: "001",
      required: true,
    },
  ],
  connectedSlug: "wheretobuy-agency-data",
  bgColor: "#ffffff",
  showBorder: true,
};
const FORM_FIELDS_Form1: FormFieldItem[] = FORM_WIDGET_Form1.fields;
const FORM_FIELD_BY_ID_Form1: Record<string, FormFieldItem> = Object.fromEntries(
  FORM_FIELDS_Form1.map((f) => [f.id, f])
);
const FORM_KEY_TO_ID_Form1 = buildKeyToId(FORM_FIELDS_Form1);
const ALL_FORM_WIDGETS: FormWidget[] = [FORM_WIDGET_Form1];
const CONTENT_WIDGETS_Space1_1: ContentSaveWidget[] = [FORM_WIDGET_Form1];

export default function GeneratedPage() {
  const setPageTitle = usePageTitleStore((s) => s.setPageTitle);
  const { t } = useI18n();
  useEffect(() => {
    setPageTitle(t("wheretobuy.agency.detailTitle"));
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
  const confirmLeaveStoreSpace1 = useLeaveCheckStore((s) => s.confirmLeave);
  const router = useRouter();

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
      const defaults = applyUrlParamFormOverrides(
        initFormDefaultValues(ALL_FORM_WIDGETS, t),
        ALL_FORM_WIDGETS,
        searchParams
      );
      setFormValuesForm1(defaults["w_vfco59rj7"] ?? {});
      return;
    }
    let cancelled = false;
    api
      .get(`/page-data/wheretobuy-agency-data/${storedId}`)
      .then(async (res) => {
        if (cancelled) return;
        const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;
        const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);
        setFormValuesForm1((prev) => ({ ...prev, ...(valuesByWidgetId["w_vfco59rj7"] ?? {}) }));
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

  const handleContentActionSpace1_1 = async () => {
    const isUpdate = storedId !== null;
    if (!validateFormFields(FORM_FIELDS_Form1, formValuesForm1, {}, {}, allFormValues, allFieldKeyToId, t)) return;
    try {
      const newFileIdsByFieldId = await uploadContentFormFiles(
        CONTENT_WIDGETS_Space1_1,
        {},
        "wheretobuy-agency-data",
        false
      );
      const formFileIdsMap = buildFormFileIdsMap(CONTENT_WIDGETS_Space1_1, {}, newFileIdsByFieldId);
      const { dataJson, pkKeys } = buildDataJson(
        CONTENT_WIDGETS_Space1_1 as Parameters<typeof buildDataJson>[0],
        { w_vfco59rj7: formValuesForm1 },
        formFileIdsMap,
        {},
        {},
        {},
        undefined,
        allFormValues,
        false,
        allFieldKeyToId
      );
      await persistContentDataJson({
        connectedSlug: "wheretobuy-agency-data",
        dataJson,
        pkKeys,
        templateSlug: "wheretobuy-agency-detail",
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
    <PageLayout mode="live">
      <GridCell colSpan={12} rowSpan={7} autoHeight>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(12, 1fr)",
            gridTemplateRows: `auto auto auto auto auto auto auto`,
            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
            gridAutoFlow: "row dense",
            rowGap: `${GAP_SIZE}px`,
            columnGap: 0,
          }}
        >
          <div style={{ gridColumn: "span 12", gridRow: "span 6" }}>
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
                  {t("wheretobuy.agency.label.companyNm")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="relative">
                    <input
                      type="text"
                      disabled={false}
                      placeholder={t("wheretobuy.agency.placeholder.companyNm")}
                      maxLength={50}
                      className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200 pr-20"
                      value={formValuesForm1["fb_mcdg5gs74"] ?? ""}
                      onChange={(e) => handleFieldChangeForm1("fb_mcdg5gs74", e.target.value)}
                      onBlur={() => handleFieldBlurForm1("fb_mcdg5gs74")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none">
                      {(formValuesForm1["fb_mcdg5gs74"] ?? "").length}/{50}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.address")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("common.description.address")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <AddressAutocompleteInput
                    value={formValuesForm1["fb_cc8ljfcen"] ?? ""}
                    onAddressSelect={(address, lat, lng) => {
                      handleFieldChangeForm1("fb_cc8ljfcen", address);
                      handleFieldChangeForm1("fb_cc8ljfcen_lat", String(lat));
                      handleFieldChangeForm1("fb_cc8ljfcen_lng", String(lng));
                    }}
                    placeholder={t("common.placeholder.address")}
                    isDisabled={false}
                    isReadOnly={false}
                    language={"en"}
                  />
                </div>
              </div>
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
                    value={formValuesForm1["fb_df6xglecg"] ?? ""}
                    onChange={(e) => handleFieldChangeForm1("fb_df6xglecg", e.target.value)}
                    onBlur={() => handleFieldBlurForm1("fb_df6xglecg")}
                  />
                </div>
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
                      value={formValuesForm1["fb_pk99zjkka"] ?? ""}
                      onChange={(e) => handleFieldChangeForm1("fb_pk99zjkka", e.target.value)}
                    >
                      <option value="">{t("common.select.placeholder")}</option>
                      {resolveFieldOptions(
                        FORM_FIELD_BY_ID_Form1["fb_pk99zjkka"] as unknown as SearchFieldConfig,
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
                  {t("common.label.officeNumber")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <input
                    type="text"
                    disabled={false}
                    placeholder={t("common.placeholder.officeNumber")}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    value={formValuesForm1["fb_awpv58589"] ?? ""}
                    onChange={(e) => handleFieldChangeForm1("fb_awpv58589", e.target.value)}
                    onBlur={() => handleFieldBlurForm1("fb_awpv58589")}
                  />
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("admin.label.sitePerm")}
                </label>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <input
                    type="text"
                    disabled={false}
                    placeholder={t("common.placeholder.hompage")}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200"
                    value={formValuesForm1["fb_hac8vhxpc"] ?? ""}
                    onChange={(e) => handleFieldChangeForm1("fb_hac8vhxpc", e.target.value)}
                    onBlur={() => handleFieldBlurForm1("fb_hac8vhxpc")}
                  />
                </div>
              </div>
              <div className="flex flex-col px-3 min-w-0" style={{ gridColumn: "span 8", gridRow: "span 1" }}>
                <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                  {t("common.label.isVisible")}
                  <span className="text-red-500 ml-0.5">*</span>
                </label>
                <p className="text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]">
                  {t("common.description.invisible")}
                </p>
                <div className="flex-1 min-h-0 flex flex-col justify-center-safe">
                  <div className="flex items-center gap-4">
                    {resolveFieldOptions(
                      FORM_FIELD_BY_ID_Form1["fb_8ovl5kpla"] as unknown as SearchFieldConfig,
                      groups
                    ).map((opt) => {
                      const parsed = parseOpt(opt);
                      return (
                        <label key={opt} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`${uid}-field-fb_8ovl5kpla`}
                            disabled={false}
                            value={parsed.value}
                            checked={(formValuesForm1["fb_8ovl5kpla"] ?? "") === parsed.value}
                            onChange={() => handleFieldChangeForm1("fb_8ovl5kpla", parsed.value)}
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
        </div>
      </GridCell>
    </PageLayout>
  );
}
