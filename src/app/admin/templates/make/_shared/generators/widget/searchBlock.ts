import type { SearchWidget } from "../../components/renderer/types";
import type { TableWidget } from "../../components/builder/TableBuilder";
import type { SearchFieldConfig, SearchFieldType } from "../../types";
import { varName, parseOpt, buildSearchQueryParams, SEARCH_QUERY_PARAM_FIELD_KEYS } from "../../utils";
import { SELECT_ALL_PLACEHOLDER, SELECT_ALL_MSG_KEY } from "../../constants";
import {
  inputCls,
  selectCls,
  fieldOptionGroupCls,
  fieldOptionItemClass,
  fieldOptionTextCls,
  fieldRadioInputCls,
  fieldCheckboxInputCls,
  fieldRelativeWrapCls,
  fieldCharCountCls,
  fieldCharCountPadCls,
  fieldDateRangeInputPadCls,
} from "../../styles";
import {
  SELECT_ARROW_CLS,
  SEARCH_DATE_ICON_CLS,
  SEARCH_DATE_RANGE_SEP_CLS,
  SEARCH_DATE_RANGE_WRAP_CLS,
  SEARCH_DATE_RANGE_INPUT_WRAP_CLS,
  SEARCH_SIMPLE_CONTAINER_CLS,
  SEARCH_RESET_BTN_CLS,
  SEARCH_SUBMIT_BTN_CLS,
  SEARCH_BTN_ICON_CLS,
  searchSimpleGridClass,
  searchSimpleColSpanClass,
} from "../../components/renderer/rendererStyles";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import {
  jsStringLiteral,
  collectUnhandledKeys,
  emitContainerOpen,
  emitContainerClose,
  slugOptionFieldLiteral,
  emitSlugOptionSelectComponent,
} from "../widgetGenerator";

const PHASE1_SEARCH_TYPES = new Set<SearchFieldType>([
  "input",
  "select",
  "date",
  "dateRange",
  "yearMonth",
  "checkbox",
  "radio",
  "hidden",
  "dateRangeStatus",
]);

const HANDLED_WIDGET_KEYS = new Set(["type", "widgetId", "rows", "displayStyle"]);
const IGNORED_WIDGET_KEYS = new Map<string, string>([
  [
    "contentKey",
    "생성 코드는 컴포넌트 로컬 state이므로 파라미터 네임스페이스가 필요 없음 — utils.ts:2781 buildSearchQueryParams는 contentKey를 읽지 않음",
  ],
]);

const HANDLED_FIELD_KEYS = new Set([
  "id",
  "type",
  "label",
  "labelMsgKey",
  "label2",
  "label2MsgKey",
  "fieldKey",
  "fieldKey2",
  "rangeSubType",
  "singleDateRange",
  "colSpan",
  "required",
  "options",
  "codeGroupCode",
  "placeholder",
  "placeholderMsgKey",
  "defaultValue",
  "defaultValueMsgKey",
  "hideCondition",
  "excludeFromSearch",
  "defaultStartToday",
  "defaultEndToday",
  "joinRelationSlugId",
  "joinSlaveKey",
  "maxLength",
  "showCharCount",
  "displayAs",
  "linkedDateRangeKey",
  "beforeText",
  "beforeTextMsgKey",
  "inRangeText",
  "inRangeTextMsgKey",
  "afterText",
  "afterTextMsgKey",
  "statusDisplayStyle",
]);

const SLUG_OPTION_FIELD_KEYS = [
  "optionSlug",
  "optionValueKey",
  "optionTextKey",
  "optionFilter",
  "optionOrderKey",
  "optionOrderDir",
] as const;

interface TypeScopedFieldKeyPolicy {
  handledTypes: ReadonlySet<SearchFieldType>;
  ignoredTypes: ReadonlySet<SearchFieldType>;
  handledReason: string;
  ignoredReason: string;
}

const TYPE_SCOPED_FIELD_KEY_POLICIES = new Map<string, TypeScopedFieldKeyPolicy>([
  [
    "data",
    {
      handledTypes: new Set<SearchFieldType>(["select"]),
      ignoredTypes: new Set<SearchFieldType>(["date", "dateRange", "yearMonth", "checkbox", "radio", "hidden"]),
      handledReason:
        "select 전용 — utils.ts:2843 buildSearchQueryParams가 f.type==='select' && f.data?.includes('?') 조건에서 condexpr_/condval_ 파라미터로 조립하고, 산출물은 SEARCH_FIELDS 리터럴(SEARCH_QUERY_PARAM_FIELD_KEYS에 'data' 포함)을 그대로 넘겨 동일 동작을 재현한다. 마크업에는 select 옵션만 방출되며 런타임 FieldRenderer.tsx case 'select'(1151)도 field.data를 읽지 않아 표시 파리티 차이가 없다",
      ignoredReason:
        "FieldRenderer.tsx의 field.data 참조는 :1030 :1032 :1040 :1057 :1058(case 'input' 1026~1114 내부)과 :1127 :1142 :1143(case 'text' 1115~1150 내부) 8곳뿐이다. 'text'는 PHASE1_SEARCH_TYPES에 없어 supportedFields 진입 자체가 불가하고, utils.ts:2843 조회 파라미터 분기도 f.type==='select' 가드라 date/dateRange/yearMonth/checkbox/radio/hidden 타입에서는 런타임이 f.data를 읽는 지점이 없다(case 'yearMonth'는 :1258에서 case 'date'로 fall-through하며 field.data를 읽지 않는다)",
    },
  ],
]);

SLUG_OPTION_FIELD_KEYS.forEach((key) => {
  TYPE_SCOPED_FIELD_KEY_POLICIES.set(key, {
    handledTypes: new Set<SearchFieldType>(["select"]),
    ignoredTypes: new Set<SearchFieldType>(["input", "date", "dateRange", "yearMonth", "checkbox", "radio", "hidden"]),
    handledReason:
      "select 전용 — FieldRenderer.tsx:1218 field.optionSlug && !isPreview 체크가 case 'select'(1152~1255) 내부에서만 실행된다. searchBlock.ts는 SlugOptionSelect 컴포넌트를 산출물에 이식해 동일 SLUG fetch·필터·정렬 로직(utils.ts buildSlugOptRows)을 재현한다",
    ignoredReason:
      "FieldRenderer.tsx 전문에서 optionSlug 계열 필드는 case 'select'(1152~1255) 내부(1161 SlugAutocompleteInput / 1218 SlugOptionSelect)에서만 읽힌다 — select 이외 타입(input/date/dateRange/yearMonth/checkbox/radio/hidden)에서는 런타임이 이 키를 읽는 지점이 없다",
  });
});

const handledFieldKeysFor = (f: SearchFieldConfig): ReadonlySet<string> => {
  const keys = new Set(HANDLED_FIELD_KEYS);
  TYPE_SCOPED_FIELD_KEY_POLICIES.forEach((policy, key) => {
    if (policy.handledTypes.has(f.type)) keys.add(key);
  });
  return keys;
};

const PHASE1_SEARCH_TYPE_LIST = [...PHASE1_SEARCH_TYPES].join("/");

const typeScopedIgnored = (ownerTypes: string, runtimeRef: string, keys: string[]): [string, string][] =>
  keys.map((key) => [
    key,
    `'${ownerTypes}' 필드 타입 전용 — 런타임 참조 지점은 ${runtimeRef} 뿐이고, searchBlock.ts PHASE1_SEARCH_TYPES(${PHASE1_SEARCH_TYPE_LIST})에 해당 타입이 없어 supportedFields 진입 불가`,
  ]);

const IGNORED_FIELD_KEYS = new Map<string, string>([
  [
    "rowSpan",
    "검색행은 rowSpan을 사용하지 않음(항상 1행) — SearchRow는 colSpan만 사용, utils.ts:2781 buildSearchQueryParams도 rowSpan을 읽지 않음. FieldRenderer.tsx의 rowSpan 참조(1566/1755/1987/2239/2573)는 file/image/video/media/editor 타입 전용이며 PHASE1_SEARCH_TYPES에 없음",
  ],
  [
    "accessor",
    "utils.ts:2781-2861 buildSearchQueryParams는 f.fieldKey||f.label만 읽고 f.accessor는 읽지 않는 사문화 필드. FieldRenderer.tsx 전문에도 field.accessor 참조 0건",
  ],
  [
    "minLength",
    "utils.ts:579 validateFormFields(Form 전용)와 utils.ts:895 validateSubListRows에서만 읽는다 — SearchRenderer.tsx는 두 함수를 호출하지 않고 FieldRenderer.tsx에도 minLength 참조가 0건이라 검색 경로에서 읽는 지점이 없다",
  ],
  [
    "pattern",
    "utils.ts:596-603 validateFormFields / utils.ts:918-927 validateSubListRows에서만 읽는다 — FieldRenderer.tsx에 field.pattern 참조 0건, 검색 경로에서 읽는 지점이 없다",
  ],
  [
    "patternDesc",
    "utils.ts:599 validateFormFields의 오류 문구 조립에서만 읽는다 — FieldRenderer.tsx에 참조 0건, 검색 경로에서 읽는 지점이 없다",
  ],
  [
    "patternDescMsgKey",
    "utils.ts:599 validateFormFields의 오류 문구 조립에서만 읽는다 — FieldRenderer.tsx에 참조 0건, 검색 경로에서 읽는 지점이 없다",
  ],
  [
    "minSelect",
    "button 다중선택 전용 — searchBlock.ts PHASE1_SEARCH_TYPES 미포함이라 supportedFields 진입 불가. FieldRenderer.tsx 전문에도 field.minSelect 참조 0건",
  ],
  [
    "maxSelect",
    "button 다중선택 전용 — searchBlock.ts PHASE1_SEARCH_TYPES 미포함이라 supportedFields 진입 불가. FieldRenderer.tsx 전문에도 field.maxSelect 참조 0건",
  ],
  [
    "multiSelect",
    "FieldRenderer.tsx:1430이 case 'button' 안에서만 읽는다 — searchBlock.ts PHASE1_SEARCH_TYPES 미포함 → supportedFields 진입 불가",
  ],
  [
    "optionDerivedKeys",
    "SlugOptionSelect의 useOptionDerivedValues가 onDerivedChange를 호출해야 값이 방출되는데, SearchRenderer.tsx는 FieldRenderer에 onDerivedChange prop 자체를 전달하지 않는다(전문 검색 결과 0건) — Search 위젯에서는 런타임에서도 파생값이 발생하지 않는 무동작 필드",
  ],
  [
    "fetchDisplayMode",
    "FieldRenderer.tsx:1122-1133이 case 'text' 안에서만 읽는다 — searchBlock.ts PHASE1_SEARCH_TYPES 미포함 → supportedFields 진입 불가",
  ],
  [
    "isPk",
    "utils.ts:1746 buildDataJson(Form 저장 경로)에서만 읽는다 — SearchRenderer.tsx/FieldRenderer.tsx 전문에 field.isPk 참조 0건",
  ],
  [
    "compareExpr",
    "utils.ts:492 validateFormFields/validateSubListRows 공용 검증에서만 읽는다 — 검색 경로는 이 함수들을 호출하지 않고 FieldRenderer.tsx에도 참조 0건",
  ],
  ...typeScopedIgnored("textarea", "FieldRenderer.tsx:1486 case 'textarea'", [
    "content",
    "contentMsgKey",
    "fontSize",
    "bold",
  ]),
  ...typeScopedIgnored("action-button", "FieldRenderer.tsx:1547 case 'action-button' / SpaceRenderer.tsx:108-176", [
    "textColor",
    "color",
    "bgColor",
    "connType",
    "popupSlug",
    "fileLayerSlug",
    "params",
    "connectedSlug",
    "connectedContentWidgetIds",
    "excelTableWidgetId",
    "excelPrivacyPopup",
    "excelDownloadMode",
    "excelRelationIds",
    "excelExtraColumns",
    "contentAction",
    "goBackAfterAction",
    "dataSaveSlug",
    "apiInfoId",
    "apiDownloadFile",
    "apiIncludeSearchParams",
    "saveConfirm",
    "validationRuleIds",
    "contentValidationRuleIds",
  ]),
  ...typeScopedIgnored(
    "file/image/video/media",
    "FieldRenderer.tsx:1564 case 'file' / :1753 case 'image' / :1984 case 'video' / :2237 case 'media'",
    [
      "maxFileCount",
      "maxFileSizeMB",
      "maxFileSizeUnit",
      "maxTotalSizeMB",
      "fileTypeMode",
      "allowedExtensions",
      "videoMode",
      "mediaImageMaxSizeMB",
      "mediaImageMaxSizeUnit",
      "mediaVideoMaxSizeMB",
      "imageMaxWidthPx",
      "imageMaxHeightPx",
    ]
  ),
  ...typeScopedIgnored(
    "category",
    "FieldRenderer.tsx:2634 case 'category' → useCategoryCascade.ts:129-321 / utils.ts:2826 f.type==='category'",
    [
      "dbSlug",
      "maxDepth",
      "activeDepths",
      "depthLabels",
      "depthLabelMsgKeys",
      "depthValueFields",
      "depthTextFields",
      "depthFilters",
      "depthParentFields",
      "optionFilterRelationSlugId",
      "optionFilterDepth",
      "optionFilterParentField",
      "optionFilterExpr",
    ]
  ),
  ...typeScopedIgnored("time", "FieldRenderer.tsx:2611 case 'time' (:2619 timeStep)", ["defaultTime", "timeStep"]),
  ...typeScopedIgnored("editor", "FieldRenderer.tsx:2571 case 'editor' (:2576 editorType)", ["editorType"]),
  ...typeScopedIgnored("address", "FieldRenderer.tsx:2700 case 'address' (:2742 addressLanguage)", ["addressLanguage"]),
]);

interface ConditionalIgnoredFieldKey {
  isIgnorable: (widget: SearchWidget) => boolean;
  reason: string;
}

const isSimpleSearch = (widget: SearchWidget): boolean => widget.displayStyle === "simple";

const CONDITIONAL_IGNORED_FIELD_KEYS = new Map<string, ConditionalIgnoredFieldKey>([
  [
    "descriptionMsgKey",
    {
      isIgnorable: isSimpleSearch,
      reason:
        "displayStyle='simple'인 검색 위젯에서만 IGNORED — SearchRenderer.tsx:127-203 심플 분기는 필드를 searchSimpleColSpanClass div로만 감싸 FieldRenderer에 직접 넘기고 SearchField를 거치지 않아 설명 문구를 렌더링하는 지점이 없다. standard 분기는 :219-225에서 SearchField의 description prop으로 field.descriptionMsgKey ? t(...) : field.description을 실제로 출력하므로 IGNORED 대상이 아니며 unhandled로 노출해 코드 생성 미지원임을 알린다",
    },
  ],
]);

const ignoredFieldKeysFor = (f: SearchFieldConfig, widget: SearchWidget): ReadonlySet<string> => {
  const keys = new Set(IGNORED_FIELD_KEYS.keys());
  TYPE_SCOPED_FIELD_KEY_POLICIES.forEach((policy, key) => {
    if (policy.ignoredTypes.has(f.type)) keys.add(key);
  });
  CONDITIONAL_IGNORED_FIELD_KEYS.forEach((policy, key) => {
    if (policy.isIgnorable(widget)) keys.add(key);
  });
  return keys;
};

const fieldVar = (f: SearchFieldConfig): string => f.fieldKey || varName(f.label);

const textExprOf = (label: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(label ?? "");

const searchLabelExprOf = (f: SearchFieldConfig): string => {
  if (f.type === "dateRange") {
    const startExpr = textExprOf(f.label, f.labelMsgKey);
    const endExpr = textExprOf(f.label2, f.label2MsgKey);
    return `[${startExpr}, ${endExpr}].filter(Boolean).join(' ~ ')`;
  }
  return textExprOf(f.label, f.labelMsgKey);
};

const placeholderExprOf = (f: SearchFieldConfig): string => {
  if (f.placeholderMsgKey) return `t(${jsStringLiteral(f.placeholderMsgKey)})`;
  if (f.placeholder) return jsStringLiteral(f.placeholder);
  return `t('common.input.placeholder')`;
};

const selectAllOptionExprOf = (f: SearchFieldConfig): string => {
  if (f.placeholderMsgKey) return `t(${jsStringLiteral(f.placeholderMsgKey)})`;
  if (f.placeholder?.trim() === SELECT_ALL_PLACEHOLDER) return `t(${jsStringLiteral(SELECT_ALL_MSG_KEY)})`;
  if (f.placeholder) return jsStringLiteral(f.placeholder);
  return `t('common.select.placeholder')`;
};

const defaultValueExprOf = (f: SearchFieldConfig): string =>
  f.defaultValueMsgKey ? `t(${jsStringLiteral(f.defaultValueMsgKey)})` : jsStringLiteral(f.defaultValue ?? "");

const isCodeLabelInput = (f: SearchFieldConfig): boolean => f.type === "input" && !!f.codeGroupCode;

const needsI18nOf = (fields: SearchFieldConfig[]): boolean =>
  fields.some(
    (f) =>
      f.type === "select" ||
      f.type === "radio" ||
      f.type === "checkbox" ||
      f.type === "dateRangeStatus" ||
      isCodeLabelInput(f)
  ) || fields.some((f) => !!f.labelMsgKey || !!f.label2MsgKey || !!f.placeholderMsgKey || !!f.defaultValueMsgKey);

const selectArrowSvg = (ind: (n: number) => string, level: number): string =>
  `${ind(level)}<svg className=${jsStringLiteral(SELECT_ARROW_CLS)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>`;

const pushOptions = (
  lines: string[],
  ind: (n: number) => string,
  level: number,
  f: SearchFieldConfig,
  optionTag: (value: string, textExpr: string) => string,
  codeGroupTag: () => string
): void => {
  if (f.codeGroupCode) {
    lines.push(`${ind(level)}${codeGroupTag()}`);
    return;
  }
  (f.options || []).forEach((opt) => {
    const { text, value } = parseOpt(opt);
    lines.push(`${ind(level)}${optionTag(value, `t(${jsStringLiteral(text)})`)}`);
  });
};

const pushFieldMarkup = (
  jsxLines: string[],
  ind: (n: number) => string,
  f: SearchFieldConfig,
  id: string,
  paramsVar: string,
  setParamsVar: string,
  slugRowDataVar: string
): void => {
  const readExpr = `String(${paramsVar}['${id}'] ?? '')`;

  switch (f.type) {
    case "input": {
      const hasCharCount = !!(f.showCharCount && f.maxLength);
      const inputCharCountCls = hasCharCount ? `${inputCls} ${fieldCharCountPadCls}` : inputCls;
      const maxLengthAttr = hasCharCount ? ` maxLength={${f.maxLength}}` : "";
      const inputLine = `<input type="text" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} placeholder={${placeholderExprOf(f)}}${maxLengthAttr} className=${jsStringLiteral(inputCharCountCls)} />`;
      const plainLines: string[] = [];
      if (hasCharCount) {
        plainLines.push(`<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
        plainLines.push(`    ${inputLine}`);
        plainLines.push(
          `    <span className=${jsStringLiteral(fieldCharCountCls)}>{${readExpr}.length}/{${f.maxLength}}</span>`
        );
        plainLines.push(`</div>`);
      } else {
        plainLines.push(inputLine);
      }
      if (!f.codeGroupCode) {
        plainLines.forEach((l) => jsxLines.push(`${ind(3)}${l}`));
        break;
      }
      const displayAsArg = f.displayAs ? jsStringLiteral(f.displayAs) : "undefined";
      jsxLines.push(`${ind(3)}{groups.length > 0 ? (`);
      jsxLines.push(
        `${ind(4)}<input type="text" readOnly value={resolveCodeLabel(${readExpr}, ${jsStringLiteral(f.codeGroupCode)}, ${displayAsArg}, groups, t, true)} className=${jsStringLiteral(inputCls)} />`
      );
      jsxLines.push(`${ind(3)}) : (`);
      plainLines.forEach((l) => jsxLines.push(`${ind(4)}${l}`));
      jsxLines.push(`${ind(3)})}`);
      break;
    }
    case "select":
      if (f.optionSlug && f.selectType !== "autocomplete") {
        jsxLines.push(
          `${ind(3)}<SlugOptionSelect field={${JSON.stringify(slugOptionFieldLiteral(f))}} value={${readExpr}} onChange={(v) => ${setParamsVar}(prev => ({ ...prev, ['${id}']: v }))} disabled={false} placeholder={${selectAllOptionExprOf(f)}} className=${jsStringLiteral(selectCls)} rowData={${slugRowDataVar}} />`
        );
        break;
      }
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
      jsxLines.push(
        `${ind(4)}<select value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} className=${jsStringLiteral(selectCls)}>`
      );
      jsxLines.push(`${ind(5)}<option value="">{${selectAllOptionExprOf(f)}}</option>`);
      pushOptions(
        jsxLines,
        ind,
        5,
        f,
        (value, textExpr) => `<option value={${jsStringLiteral(value)}}>{${textExpr}}</option>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{t(d.nameMsgKey || d.name)}</option>)}`
      );
      jsxLines.push(`${ind(4)}</select>`);
      jsxLines.push(selectArrowSvg(ind, 4));
      jsxLines.push(`${ind(3)}</div>`);
      break;
    case "date":
    case "yearMonth": {
      const inputTypeAttr = f.type === "yearMonth" ? "month" : "date";
      jsxLines.push(
        `${ind(3)}<input type="${inputTypeAttr}" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${jsStringLiteral(inputCls)} />`
      );
      break;
    }
    case "dateRange": {
      const startKey = `${id}_from`;
      const endKey = `${id}_to`;
      const readExprStart = `String(${paramsVar}['${startKey}'] ?? '')`;
      const readExprEnd = `String(${paramsVar}['${endKey}'] ?? '')`;
      const rangeInputCls = jsStringLiteral(`${inputCls} ${fieldDateRangeInputPadCls}`);
      const rangeWrapCls = jsStringLiteral(SEARCH_DATE_RANGE_INPUT_WRAP_CLS);
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(SEARCH_DATE_RANGE_WRAP_CLS)}>`);
      jsxLines.push(
        `${ind(4)}<div className=${rangeWrapCls}><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprStart}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${startKey}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(4)}<span className=${jsStringLiteral(SEARCH_DATE_RANGE_SEP_CLS)}>~</span>`);
      jsxLines.push(
        `${ind(4)}<div className=${rangeWrapCls}><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprEnd}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${endKey}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(3)}</div>`);
      break;
    }
    case "radio": {
      const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
      const radioInput = jsStringLiteral(fieldRadioInputCls);
      const optionTextCls = jsStringLiteral(fieldOptionTextCls);
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        4,
        f,
        (value, textExpr) =>
          `<label className=${optionLabelCls}><input type="radio" name="${id}" value={${jsStringLiteral(value)}} checked={${readExpr} === ${jsStringLiteral(value)}} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: ${jsStringLiteral(value)} }))} className=${radioInput} /><span className=${optionTextCls}>{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className=${optionLabelCls}><input type="radio" name="${id}" value={d.code} checked={${readExpr} === d.code} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: d.code }))} className=${radioInput} /><span className=${optionTextCls}>{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
      jsxLines.push(`${ind(3)}</div>`);
      break;
    }
    case "checkbox": {
      const selectedExpr = `${readExpr}.split(',').filter(Boolean)`;
      const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
      const checkboxInput = jsStringLiteral(fieldCheckboxInputCls);
      const optionTextCls = jsStringLiteral(fieldOptionTextCls);
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        4,
        f,
        (value, textExpr) =>
          `<label className=${optionLabelCls}><input type="checkbox" value={${jsStringLiteral(value)}} checked={${selectedExpr}.includes(${jsStringLiteral(value)})} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(${jsStringLiteral(value)}) ? cur.filter(v => v !== ${jsStringLiteral(value)}) : [...cur, ${jsStringLiteral(value)}]; ${setParamsVar}(prev => ({ ...prev, ['${id}']: next.join(',') })); }} className=${checkboxInput} /><span className=${optionTextCls}>{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className=${optionLabelCls}><input type="checkbox" value={d.code} checked={${selectedExpr}.includes(d.code)} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(d.code) ? cur.filter(v => v !== d.code) : [...cur, d.code]; ${setParamsVar}(prev => ({ ...prev, ['${id}']: next.join(',') })); }} className=${checkboxInput} /><span className=${optionTextCls}>{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
      jsxLines.push(`${ind(3)}</div>`);
      break;
    }
    case "dateRangeStatus": {
      const beforeExpr = f.beforeTextMsgKey
        ? `t(${jsStringLiteral(f.beforeTextMsgKey)})`
        : f.beforeText
          ? jsStringLiteral(f.beforeText)
          : `t('common.status.before')`;
      const inRangeExpr = f.inRangeTextMsgKey
        ? `t(${jsStringLiteral(f.inRangeTextMsgKey)})`
        : f.inRangeText
          ? jsStringLiteral(f.inRangeText)
          : `t('common.status.inrange')`;
      const afterExpr = f.afterTextMsgKey
        ? `t(${jsStringLiteral(f.afterTextMsgKey)})`
        : f.afterText
          ? jsStringLiteral(f.afterText)
          : `t('common.status.after')`;
      if (f.statusDisplayStyle === "radio") {
        const optionLabelCls = jsStringLiteral(fieldOptionItemClass(false));
        const radioInput = jsStringLiteral(fieldRadioInputCls);
        const optionTextCls = jsStringLiteral(fieldOptionTextCls);
        jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
        jsxLines.push(
          `${ind(4)}<label className=${optionLabelCls}><input type="radio" name="${id}" value="" checked={${readExpr} === ''} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: '' }))} className=${radioInput} /><span className=${optionTextCls}>{t('common.label.all')}</span></label>`
        );
        jsxLines.push(
          `${ind(4)}<label className=${optionLabelCls}><input type="radio" name="${id}" value="before" checked={${readExpr} === 'before'} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: 'before' }))} className=${radioInput} /><span className=${optionTextCls}>{${beforeExpr}}</span></label>`
        );
        jsxLines.push(
          `${ind(4)}<label className=${optionLabelCls}><input type="radio" name="${id}" value="in_range" checked={${readExpr} === 'in_range'} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: 'in_range' }))} className=${radioInput} /><span className=${optionTextCls}>{${inRangeExpr}}</span></label>`
        );
        jsxLines.push(
          `${ind(4)}<label className=${optionLabelCls}><input type="radio" name="${id}" value="after" checked={${readExpr} === 'after'} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: 'after' }))} className=${radioInput} /><span className=${optionTextCls}>{${afterExpr}}</span></label>`
        );
        jsxLines.push(`${ind(3)}</div>`);
        break;
      }
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`);
      jsxLines.push(
        `${ind(4)}<select value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} className=${jsStringLiteral(selectCls)}>`
      );
      jsxLines.push(`${ind(5)}<option value="">{t('common.label.all')}</option>`);
      jsxLines.push(`${ind(5)}<option value="before">{${beforeExpr}}</option>`);
      jsxLines.push(`${ind(5)}<option value="in_range">{${inRangeExpr}}</option>`);
      jsxLines.push(`${ind(5)}<option value="after">{${afterExpr}}</option>`);
      jsxLines.push(`${ind(4)}</select>`);
      jsxLines.push(selectArrowSvg(ind, 4));
      jsxLines.push(`${ind(3)}</div>`);
      break;
    }
    default:
      break;
  }
};

const wrapHideCondition = (
  f: SearchFieldConfig,
  ind: (n: number) => string,
  level: number,
  keyToIdVar: string,
  paramsVar: string,
  innerLines: string[]
): string[] => {
  if (!f.hideCondition) return innerLines;
  return [
    `${ind(level)}{!evalFieldCondition(${jsStringLiteral(f.hideCondition)}, ${keyToIdVar}, ${paramsVar}) && (`,
    ...innerLines,
    `${ind(level)})}`,
  ];
};

const PROBE_VALUE = "__probe__";

const buildProbeSv = (entries: { id: string; type: SearchFieldType }[]): Record<string, string> => {
  const sv: Record<string, string> = {};
  entries.forEach(({ id, type }) => {
    if (type === "dateRange") {
      sv[`${id}_from`] = PROBE_VALUE;
      sv[`${id}_to`] = PROBE_VALUE;
    } else {
      sv[id] = PROBE_VALUE;
    }
  });
  return sv;
};

const withSubstitutedId = (f: SearchFieldConfig, id: string): SearchFieldConfig => ({
  ...f,
  id,
  colSpan: f.colSpan ?? 1,
});

const buildPrunedFieldLiteral = (f: SearchFieldConfig, id: string): SearchFieldConfig => {
  const obj: Record<string, unknown> = { colSpan: f.colSpan ?? 1 };
  SEARCH_QUERY_PARAM_FIELD_KEYS.forEach((k) => {
    const raw = (f as unknown as Record<string, unknown>)[k];
    if (raw === undefined) return;
    obj[k] = k === "id" ? id : raw;
  });
  return obj as unknown as SearchFieldConfig;
};

const buildUnhandled = (widget: SearchWidget, supportedFields: SearchFieldConfig[]): UnhandledConfigKeys[] => {
  const widgetUnhandled = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_WIDGET_KEYS,
    new Set(IGNORED_WIDGET_KEYS.keys())
  );
  const fieldUnhandledSet = new Set<string>();
  supportedFields.forEach((f) => {
    collectUnhandledKeys(
      f as unknown as Record<string, unknown>,
      handledFieldKeysFor(f),
      ignoredFieldKeysFor(f, widget)
    ).forEach((k) => fieldUnhandledSet.add(k));
  });
  return [
    { scope: "widget", keys: widgetUnhandled },
    { scope: "field", keys: [...fieldUnhandledSet] },
  ];
};

export const generateSearchBlock = (widget: SearchWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { suffix, ind, allWidgets, suffixOf } = ctx;
  const isSimple = widget.displayStyle === "simple";
  const paramsVar = `params${suffix}`;
  const setParamsVar = `setParams${suffix}`;
  const initialParamsVar = `initialParams${suffix}`;
  const searchParamsFn = `getSearchParams${suffix}`;
  const fieldsLiteralVar = `SEARCH_FIELDS_${suffix}`;
  const keyToIdVar = `searchKeyToId${suffix}`;

  const allFields = widget.rows.flatMap((row) => row.fields);
  const supportedFields = allFields.filter((f) => PHASE1_SEARCH_TYPES.has(f.type));
  const needsCalendar = supportedFields.some((f) => f.type === "dateRange");
  const needsCodeGroup = supportedFields.some((f) => f.codeGroupCode);
  const needsHideCondition = supportedFields.some((f) => f.hideCondition);
  const needsCodeLabel = supportedFields.some(isCodeLabelInput);
  const needsI18n = isSimple || needsI18nOf(supportedFields);
  const hasSlugOptionSelect = supportedFields.some(
    (f) => f.type === "select" && !!f.optionSlug && f.selectType !== "autocomplete"
  );
  const slugRowDataVar = `slugOptRowData${suffix}`;

  const idCandidates = supportedFields.map((f) => fieldVar(f));
  const hasIdCollision = new Set(idCandidates).size !== idCandidates.length;
  const substitutedFields = supportedFields.map((f, i) =>
    withSubstitutedId(f, hasIdCollision ? f.id : idCandidates[i])
  );
  const idFor = (idx: number): string => substitutedFields[idx].id;

  const prunedFields = substitutedFields.map((f) => buildPrunedFieldLiteral(f, f.id));
  const probeSv = buildProbeSv(substitutedFields.map((f) => ({ id: f.id, type: f.type })));
  const fullResult = buildSearchQueryParams(substitutedFields, probeSv);
  const prunedResult = buildSearchQueryParams(prunedFields, probeSv);
  const pruneSafe = JSON.stringify(fullResult) === JSON.stringify(prunedResult);
  const emittedFields = pruneSafe ? prunedFields : substitutedFields;

  const imports: ImportRequirement[] = [
    { module: "@/app/admin/templates/make/_shared/utils", named: ["buildSearchQueryParams", "buildKeyToId"] },
    { module: "@/app/admin/templates/make/_shared/types", named: ["SearchFieldConfig"] },
  ];
  if (isSimple) {
    imports.push({ module: "@/components/search", named: ["isEnterSearchTrigger"] });
  } else {
    imports.push({ module: "@/components/search", named: ["SearchForm", "SearchRow", "SearchField"] });
  }
  const icons = [...(needsCalendar ? ["Calendar"] : []), ...(isSimple ? ["RotateCcw", "Search"] : [])];
  if (icons.length > 0) imports.push({ module: "lucide-react", named: icons });
  if (needsCodeGroup) imports.push({ module: "@/store/use-code-store", named: ["useCodeStore"] });
  if (needsI18n) imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
  if (needsHideCondition) {
    imports.push({ module: "@/app/admin/templates/make/_shared/utils", named: ["evalFieldCondition"] });
  }
  if (needsCodeLabel) {
    imports.push({ module: "@/app/admin/templates/make/_shared/utils", named: ["resolveCodeLabel"] });
  }
  if (hasSlugOptionSelect) {
    imports.push({ module: "react", named: ["useMemo"] });
    imports.push({ module: "@/lib/api", defaultName: "api" });
    imports.push({
      module: "@/app/admin/templates/make/_shared/utils",
      named: ["flattenPageDataItem", "buildSlugOptRows"],
    });
  }

  const helperLines: string[] = [];
  if (!pruneSafe) {
    helperLines.push(
      `/* TODO(파일빌드): '${suffix}' 검색폼은 필드 리터럴 추리기 결과가 원본과 달라 전체 필드 정의를 그대로 사용합니다. */`
    );
  }
  if (hasIdCollision) {
    helperLines.push(
      `/* TODO(파일빌드): '${suffix}' 검색폼은 필드 id 치환 시 이름 충돌이 발생해 원본 id를 그대로 사용합니다. */`
    );
  }
  helperLines.push(`const ${fieldsLiteralVar}: SearchFieldConfig[] = ${JSON.stringify(emittedFields, null, 4)};`);
  helperLines.push(`const ${keyToIdVar} = buildKeyToId(${fieldsLiteralVar});`);
  if (hasSlugOptionSelect) {
    helperLines.push("");
    emitSlugOptionSelectComponent().forEach((l) => helperLines.push(l));
  }

  const stateLines: string[] = [];
  if (needsI18n) stateLines.push(`${ind(1)}const { t } = useI18n();`);
  if (needsCodeGroup) {
    stateLines.push(`${ind(1)}const { groups, fetchGroups } = useCodeStore();`);
    stateLines.push(`${ind(1)}useEffect(() => { fetchGroups(); }, [fetchGroups]);`);
  }

  const initEntries: string[] = [];
  substitutedFields.forEach((f) => {
    if (f.type === "checkbox") {
      initEntries.push(`'${f.id}': ''`);
    } else if (f.type === "dateRange") {
      initEntries.push(`'${f.id}_from': ${defaultValueExprOf(f)}`);
      initEntries.push(`'${f.id}_to': ''`);
    } else {
      initEntries.push(`'${f.id}': ${defaultValueExprOf(f)}`);
    }
  });
  stateLines.push(`${ind(1)}const ${initialParamsVar}: Record<string, string> = { ${initEntries.join(", ")} };`);
  stateLines.push(
    `${ind(1)}const [${paramsVar}, ${setParamsVar}] = useState<Record<string, string>>(${initialParamsVar});`
  );

  const handlerLines: string[] = [];
  handlerLines.push(
    `${ind(1)}const ${searchParamsFn} = (sv: Record<string, string> = ${paramsVar}): Record<string, string> => buildSearchQueryParams(${fieldsLiteralVar}, sv);`
  );
  handlerLines.push("");

  if (hasSlugOptionSelect) {
    handlerLines.push(
      `${ind(1)}const ${slugRowDataVar} = useMemo(() => { const map: Record<string, unknown> = {}; ${fieldsLiteralVar}.forEach((f) => { if (f.fieldKey) map[f.fieldKey] = ${paramsVar}[f.id] ?? ''; }); return map; }, [${paramsVar}]);`
    );
    handlerLines.push("");
  }

  const connectedTableSuffixes = (allWidgets.filter((w) => w.type === "table") as TableWidget[])
    .filter((t) => (t.connectedSearchIds || []).includes(widget.widgetId))
    .map((t) => suffixOf(t.widgetId));

  handlerLines.push(`${ind(1)}const handleReset${suffix} = () => {`);
  handlerLines.push(`${ind(2)}${setParamsVar}(${initialParamsVar});`);
  if (connectedTableSuffixes.length === 0) {
    handlerLines.push(`${ind(2)}/* TODO(파일빌드): 이 검색폼에 연결된 Table 위젯이 없습니다. */`);
  } else {
    connectedTableSuffixes.forEach((tableSuffix) => {
      handlerLines.push(
        `${ind(2)}fetchData${tableSuffix}(0, true, { ${jsStringLiteral(suffix)}: ${initialParamsVar} }, { sk: null, sd: 'asc' });`
      );
    });
  }
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  handlerLines.push(`${ind(1)}const handleSearch${suffix} = () => {`);
  if (connectedTableSuffixes.length === 0) {
    handlerLines.push(`${ind(2)}/* TODO(파일빌드): 이 검색폼에 연결된 Table 위젯이 없습니다. */`);
  } else {
    connectedTableSuffixes.forEach((tableSuffix) => {
      handlerLines.push(`${ind(2)}fetchData${tableSuffix}(0, true);`);
    });
  }
  handlerLines.push(`${ind(1)}};`);
  handlerLines.push("");

  const jsxLines: string[] = [];

  if (isSimple) {
    const row = widget.rows[0];
    const cols = row?.cols ?? 5;
    jsxLines.push(emitContainerOpen({ className: SEARCH_SIMPLE_CONTAINER_CLS }));
    jsxLines.push(
      `${ind(1)}<div className=${jsStringLiteral(searchSimpleGridClass(cols))} onKeyDown={e => { if (isEnterSearchTrigger(e)) handleSearch${suffix}(); }}>`
    );
    (row?.fields ?? []).forEach((f) => {
      if (f.type === "hidden") return;
      if (!PHASE1_SEARCH_TYPES.has(f.type)) {
        jsxLines.push(
          `${ind(2)}{/* TODO(파일빌드 Phase 2): '${f.label}' 필드 타입(${f.type})은 아직 코드 생성이 지원되지 않습니다. */}`
        );
        return;
      }
      const idx = supportedFields.indexOf(f);
      const id = idFor(idx);
      const colSpanCls = searchSimpleColSpanClass(f.colSpan ?? 1, cols);
      const fieldLines: string[] = [];
      fieldLines.push(`${ind(2)}<div className=${jsStringLiteral(colSpanCls)}>`);
      pushFieldMarkup(fieldLines, ind, f, id, paramsVar, setParamsVar, slugRowDataVar);
      fieldLines.push(`${ind(2)}</div>`);
      wrapHideCondition(f, ind, 2, keyToIdVar, paramsVar, fieldLines).forEach((l) => jsxLines.push(l));
    });
    jsxLines.push(`${ind(1)}</div>`);
    jsxLines.push(`${ind(1)}<button`);
    jsxLines.push(`${ind(2)}onClick={handleReset${suffix}}`);
    jsxLines.push(`${ind(2)}className=${jsStringLiteral(SEARCH_RESET_BTN_CLS)}`);
    jsxLines.push(`${ind(1)}>`);
    jsxLines.push(`${ind(2)}<RotateCcw className=${jsStringLiteral(SEARCH_BTN_ICON_CLS)} /> {t('common.btn.reset')}`);
    jsxLines.push(`${ind(1)}</button>`);
    jsxLines.push(`${ind(1)}<button`);
    jsxLines.push(`${ind(2)}onClick={handleSearch${suffix}}`);
    jsxLines.push(`${ind(2)}className=${jsStringLiteral(SEARCH_SUBMIT_BTN_CLS)}`);
    jsxLines.push(`${ind(1)}>`);
    jsxLines.push(`${ind(2)}<Search className=${jsStringLiteral(SEARCH_BTN_ICON_CLS)} /> {t('common.btn.search')}`);
    jsxLines.push(`${ind(1)}</button>`);
    jsxLines.push(emitContainerClose());
    if (widget.rows.length > 1) {
      jsxLines.unshift(
        `{/* TODO(파일빌드): displayStyle='simple'에서는 rows[0]만 표시됩니다. 나머지 ${widget.rows.length - 1}개 행은 표시되지 않습니다. */}`
      );
    }
  } else {
    jsxLines.push(emitContainerOpen({ showBorder: false }));
    jsxLines.push(`<SearchForm onSearch={handleSearch${suffix}} onReset={handleReset${suffix}}>`);
    widget.rows.forEach((row) => {
      jsxLines.push(`${ind(1)}<SearchRow cols={${row.cols}}>`);
      row.fields.forEach((f) => {
        if (f.type === "hidden") return;
        if (!PHASE1_SEARCH_TYPES.has(f.type)) {
          jsxLines.push(
            `${ind(2)}{/* TODO(파일빌드 Phase 2): '${f.label}' 필드 타입(${f.type})은 아직 코드 생성이 지원되지 않습니다. */}`
          );
          return;
        }
        const idx = supportedFields.indexOf(f);
        const id = idFor(idx);
        const colProp = f.colSpan > 1 ? ` colSpan={${f.colSpan}}` : "";
        const reqProp = f.required ? " required" : "";
        const fieldLines: string[] = [];
        fieldLines.push(`${ind(2)}<SearchField label={${searchLabelExprOf(f)}}${colProp}${reqProp}>`);
        pushFieldMarkup(fieldLines, ind, f, id, paramsVar, setParamsVar, slugRowDataVar);
        fieldLines.push(`${ind(2)}</SearchField>`);
        wrapHideCondition(f, ind, 2, keyToIdVar, paramsVar, fieldLines).forEach((l) => jsxLines.push(l));
      });
      jsxLines.push(`${ind(1)}</SearchRow>`);
    });
    jsxLines.push("</SearchForm>");
    jsxLines.push(emitContainerClose());
  }

  return {
    imports,
    helperLines,
    stateLines,
    handlerLines,
    jsxLines,
    unhandled: buildUnhandled(widget, supportedFields),
  };
};
