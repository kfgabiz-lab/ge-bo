import type { SearchWidget } from "../../components/renderer/types";
import type { TableWidget } from "../../components/builder/TableBuilder";
import type { SearchFieldConfig, SearchFieldType } from "../../types";
import { varName, parseOpt, buildSearchQueryParams, SEARCH_QUERY_PARAM_FIELD_KEYS } from "../../utils";
import { SELECT_ALL_PLACEHOLDER, SELECT_ALL_MSG_KEY } from "../../constants";
import { inputCls, selectCls, fieldOptionGroupCls } from "../../styles";
import {
  SELECT_ARROW_CLS,
  SEARCH_DATE_ICON_CLS,
  SEARCH_DATE_RANGE_SEP_CLS,
} from "../../components/renderer/rendererStyles";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import { jsStringLiteral, collectUnhandledKeys, emitContainerOpen, emitContainerClose } from "../widgetGenerator";

const PHASE1_SEARCH_TYPES = new Set<SearchFieldType>([
  "input",
  "select",
  "date",
  "dateRange",
  "checkbox",
  "radio",
  "hidden",
]);

const GRID_COLS_LITERAL: Record<number, string> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const COL_SPAN_LITERAL: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
};

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
  "data",
  "joinRelationSlugId",
  "joinSlaveKey",
]);

const IGNORED_FIELD_KEYS = new Map<string, string>([
  [
    "rowSpan",
    "검색행은 rowSpan을 사용하지 않음(항상 1행) — SearchRow는 colSpan만 사용, utils.ts:2781 buildSearchQueryParams도 rowSpan을 읽지 않음",
  ],
  [
    "accessor",
    "utils.ts:2781-2861 buildSearchQueryParams는 f.fieldKey||f.label만 읽고 f.accessor는 읽지 않는 사문화 필드",
  ],
  ["selectType", "autocomplete 등 select 하위기능 — Phase1 미구현 값 필드"],
  ["minLength", "input 유효성 검증 — Phase1 미검증 값 필드"],
  ["maxLength", "input 유효성 검증 — Phase1 미검증 값 필드"],
  ["showCharCount", "input 글자수 표시 — Phase1 미구현 값 필드"],
  ["pattern", "input 정규식 검증 — Phase1 미검증 값 필드"],
  ["patternDesc", "input 정규식 설명 — Phase1 미구현 값 필드"],
  ["patternDescMsgKey", "input 정규식 설명 다국어 — Phase1 미구현 값 필드"],
  ["minSelect", "button 다중선택 전용 — Search Phase1은 PHASE1_SEARCH_TYPES에 button을 포함하지 않음"],
  ["maxSelect", "button 다중선택 전용 — Search Phase1은 PHASE1_SEARCH_TYPES에 button을 포함하지 않음"],
  ["displayAs", "select 옵션은 codeGroupCode 텍스트만 사용, value 표시모드 Phase1 미구현"],
  ["multiSelect", "button 전용 — Search Phase1은 PHASE1_SEARCH_TYPES에 button을 포함하지 않음"],
  ["fetchDisplayMode", "text 타입(연결Slug 값 표시) 전용 — Search Phase1은 PHASE1_SEARCH_TYPES에 text를 포함하지 않음"],
  ["content", "textarea 전용 — Space 위젯에서만 사용"],
  ["contentMsgKey", "textarea 전용 — Space 위젯에서만 사용"],
  ["fontSize", "textarea 전용 — Space 위젯에서만 사용"],
  ["bold", "textarea 전용 — Space 위젯에서만 사용"],
  ["textColor", "textarea/action-button 전용 — Space 위젯에서만 사용"],
  ["color", "action-button 전용 — Space 위젯에서만 사용"],
  ["bgColor", "action-button 전용 — Space 위젯에서만 사용"],
  ["connType", "action-button 전용 — Space 위젯에서만 사용"],
  ["popupSlug", "action-button 전용 — Space 위젯에서만 사용"],
  ["fileLayerSlug", "action-button 전용 — Space 위젯에서만 사용"],
  ["params", "action-button 전용 — Space 위젯에서만 사용"],
  ["connectedSlug", "action-button 전용 — Space 위젯에서만 사용"],
  ["connectedContentWidgetIds", "action-button 전용 — Space 위젯에서만 사용"],
  ["excelTableWidgetId", "action-button excel 전용 — Space 위젯에서만 사용"],
  ["excelPrivacyPopup", "action-button excel 전용 — Space 위젯에서만 사용"],
  ["excelDownloadMode", "action-button excel 전용 — Space 위젯에서만 사용"],
  ["excelRelationIds", "action-button excel 전용 — Space 위젯에서만 사용"],
  ["excelExtraColumns", "action-button excel 전용 — Space 위젯에서만 사용"],
  ["contentAction", "action-button 전용 — Space 위젯에서만 사용"],
  ["goBackAfterAction", "action-button 전용 — Space 위젯에서만 사용"],
  ["dataSaveSlug", "action-button 전용 — Space 위젯에서만 사용"],
  ["apiInfoId", "action-button 전용 — Space 위젯에서만 사용"],
  ["apiDownloadFile", "action-button 전용 — Space 위젯에서만 사용"],
  ["apiIncludeSearchParams", "action-button 전용 — Space 위젯에서만 사용"],
  ["saveConfirm", "action-button 전용 — Space 위젯에서만 사용"],
  ["validationRuleIds", "action-button 전용 — Space 위젯에서만 사용"],
  ["contentValidationRuleIds", "action-button 전용 — Space 위젯에서만 사용"],
  ["isPk", "Form 전용 — Search에서는 사용하지 않음"],
  ["readonly", "Form 전용 — Search에서는 사용하지 않음"],
  ["maxFileCount", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["maxFileSizeMB", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["maxTotalSizeMB", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["fileTypeMode", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["allowedExtensions", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["videoMode", "파일/이미지/비디오 전용 필드타입 — Search Phase1 미지원"],
  ["mediaImageMaxSizeMB", "media 전용 필드타입 — Search Phase1 미지원"],
  ["mediaVideoMaxSizeMB", "media 전용 필드타입 — Search Phase1 미지원"],
  ["imageMaxWidthPx", "image 전용 필드타입 — Search Phase1 미지원"],
  ["imageMaxHeightPx", "image 전용 필드타입 — Search Phase1 미지원"],
  ["maxFileSizeUnit", "파일 전용 필드타입 — Search Phase1 미지원"],
  ["mediaImageMaxSizeUnit", "media 전용 필드타입 — Search Phase1 미지원"],
  [
    "dbSlug",
    "category 전용 필드타입 — PHASE1_SEARCH_TYPES는 category를 포함하지 않아 이 키를 가진 필드가 supportedFields에 들어오지 않음",
  ],
  [
    "relationSlugId",
    'category 전용 필드타입 — utils.ts:2826 f.type===\"category\"에서만 읽으며 PHASE1_SEARCH_TYPES가 category를 제외함',
  ],
  ["maxDepth", "category 전용 필드타입 — Search Phase1 미지원"],
  ["activeDepths", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthLabels", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthLabelMsgKeys", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthValueFields", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthTextFields", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthFilters", "category 전용 필드타입 — Search Phase1 미지원"],
  ["depthParentFields", "category 전용 필드타입 — Search Phase1 미지원"],
  ["optionFilterRelationSlugId", "category 전용 필드타입 — Search Phase1 미지원"],
  ["optionFilterDepth", "category 전용 필드타입 — Search Phase1 미지원"],
  ["optionFilterParentField", "category 전용 필드타입 — Search Phase1 미지원"],
  ["optionFilterExpr", "category 전용 필드타입 — Search Phase1 미지원"],
  ["defaultTime", "time 전용 필드타입 — Search Phase1 미지원"],
  ["timeStep", "time 전용 필드타입 — Search Phase1 미지원"],
  [
    "linkedDateRangeKey",
    'dateRangeStatus 전용 필드타입 — utils.ts:2852 f.type===\"dateRangeStatus\"에서만 읽으며 PHASE1_SEARCH_TYPES가 dateRangeStatus를 제외함',
  ],
  ["beforeText", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["beforeTextMsgKey", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["inRangeText", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["inRangeTextMsgKey", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["afterText", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["afterTextMsgKey", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["statusDisplayStyle", "dateRangeStatus 전용 필드타입 — Search Phase1 미지원"],
  ["editorType", "editor 전용 필드타입 — Search Phase1 미지원"],
  ["addressLanguage", "address 전용 필드타입 — Search Phase1 미지원"],
  ["compareExpr", "Form/SubList 전용 — 타입 정의상 Search 미사용"],
]);

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

const needsI18nOf = (fields: SearchFieldConfig[]): boolean =>
  fields.some((f) => f.type === "select" || f.type === "radio" || f.type === "checkbox") ||
  fields.some((f) => !!f.labelMsgKey || !!f.label2MsgKey || !!f.placeholderMsgKey || !!f.defaultValueMsgKey);

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
  setParamsVar: string
): void => {
  const readExpr = `String(${paramsVar}['${id}'] ?? '')`;

  switch (f.type) {
    case "input":
      jsxLines.push(
        `${ind(3)}<input type="text" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} placeholder={${placeholderExprOf(f)}} className=${jsStringLiteral(inputCls)} />`
      );
      break;
    case "select":
      jsxLines.push(`${ind(3)}<div className="relative">`);
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
      jsxLines.push(
        `${ind(3)}<input type="date" value={${readExpr}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${id}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${jsStringLiteral(inputCls)} />`
      );
      break;
    case "dateRange": {
      const startKey = `${id}_from`;
      const endKey = `${id}_to`;
      const readExprStart = `String(${paramsVar}['${startKey}'] ?? '')`;
      const readExprEnd = `String(${paramsVar}['${endKey}'] ?? '')`;
      const rangeInputCls = jsStringLiteral(`${inputCls} pl-9`);
      jsxLines.push(`${ind(3)}<div className="flex items-center gap-2">`);
      jsxLines.push(
        `${ind(4)}<div className="relative flex-1"><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprStart}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${startKey}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(4)}<span className=${jsStringLiteral(SEARCH_DATE_RANGE_SEP_CLS)}>~</span>`);
      jsxLines.push(
        `${ind(4)}<div className="relative flex-1"><Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} /><input type="date" value={${readExprEnd}} onChange={e => ${setParamsVar}(prev => ({ ...prev, ['${endKey}']: e.target.value }))} onClick={e => e.currentTarget.showPicker?.()} className=${rangeInputCls} /></div>`
      );
      jsxLines.push(`${ind(3)}</div>`);
      break;
    }
    case "radio":
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        4,
        f,
        (value, textExpr) =>
          `<label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${id}" value={${jsStringLiteral(value)}} checked={${readExpr} === ${jsStringLiteral(value)}} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: ${jsStringLiteral(value)} }))} className="w-4 h-4" /><span className="text-sm">{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${id}" value={d.code} checked={${readExpr} === d.code} onChange={() => ${setParamsVar}(prev => ({ ...prev, ['${id}']: d.code }))} className="w-4 h-4" /><span className="text-sm">{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
      jsxLines.push(`${ind(3)}</div>`);
      break;
    case "checkbox": {
      const selectedExpr = `${readExpr}.split(',').filter(Boolean)`;
      jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`);
      pushOptions(
        jsxLines,
        ind,
        4,
        f,
        (value, textExpr) =>
          `<label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value={${jsStringLiteral(value)}} checked={${selectedExpr}.includes(${jsStringLiteral(value)})} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(${jsStringLiteral(value)}) ? cur.filter(v => v !== ${jsStringLiteral(value)}) : [...cur, ${jsStringLiteral(value)}]; ${setParamsVar}(prev => ({ ...prev, ['${id}']: next.join(',') })); }} className="w-4 h-4 rounded cursor-pointer" /><span className="text-sm">{${textExpr}}</span></label>`,
        () =>
          `{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value={d.code} checked={${selectedExpr}.includes(d.code)} onChange={() => { const cur = ${selectedExpr}; const next = cur.includes(d.code) ? cur.filter(v => v !== d.code) : [...cur, d.code]; ${setParamsVar}(prev => ({ ...prev, ['${id}']: next.join(',') })); }} className="w-4 h-4 rounded cursor-pointer" /><span className="text-sm">{t(d.nameMsgKey || d.name)}</span></label>)}`
      );
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
  const ignoredFieldKeySet = new Set(IGNORED_FIELD_KEYS.keys());
  const fieldUnhandledSet = new Set<string>();
  supportedFields.forEach((f) => {
    collectUnhandledKeys(f as unknown as Record<string, unknown>, HANDLED_FIELD_KEYS, ignoredFieldKeySet).forEach((k) =>
      fieldUnhandledSet.add(k)
    );
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
  const needsI18n = isSimple || needsI18nOf(supportedFields);

  /* id를 fieldKey||varName(label)로 치환 — 충돌 시 이 위젯은 원본 id로 전체 폴백 */
  const idCandidates = supportedFields.map((f) => fieldVar(f));
  const hasIdCollision = new Set(idCandidates).size !== idCandidates.length;
  const substitutedFields = supportedFields.map((f, i) =>
    withSubstitutedId(f, hasIdCollision ? f.id : idCandidates[i])
  );
  const idFor = (idx: number): string => substitutedFields[idx].id;

  /* 리터럴 프루닝 자기검증 — 원본 config와 추린 리터럴이 동일한 파라미터를 만드는지 실측 비교 (§5.1.2 D7) */
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
    const gridColsCls = GRID_COLS_LITERAL[cols] ?? "grid-cols-5";
    jsxLines.push(emitContainerOpen({ className: "flex items-center gap-3 bg-white px-4" }));
    jsxLines.push(
      `${ind(1)}<div className="flex-1 grid ${gridColsCls} gap-4" onKeyDown={e => { if (isEnterSearchTrigger(e)) handleSearch${suffix}(); }}>`
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
      const colSpanCls = COL_SPAN_LITERAL[Math.min(f.colSpan ?? 1, cols)] ?? "col-span-1";
      const fieldLines: string[] = [];
      fieldLines.push(`${ind(2)}<div className="${colSpanCls}">`);
      pushFieldMarkup(fieldLines, ind, f, id, paramsVar, setParamsVar);
      fieldLines.push(`${ind(2)}</div>`);
      wrapHideCondition(f, ind, 2, keyToIdVar, paramsVar, fieldLines).forEach((l) => jsxLines.push(l));
    });
    jsxLines.push(`${ind(1)}</div>`);
    jsxLines.push(`${ind(1)}<button`);
    jsxLines.push(`${ind(2)}onClick={handleReset${suffix}}`);
    jsxLines.push(
      `${ind(2)}className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all"`
    );
    jsxLines.push(`${ind(1)}>`);
    jsxLines.push(`${ind(2)}<RotateCcw className="w-3 h-3" /> {t('common.btn.reset')}`);
    jsxLines.push(`${ind(1)}</button>`);
    jsxLines.push(`${ind(1)}<button`);
    jsxLines.push(`${ind(2)}onClick={handleSearch${suffix}}`);
    jsxLines.push(
      `${ind(2)}className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all"`
    );
    jsxLines.push(`${ind(1)}>`);
    jsxLines.push(`${ind(2)}<Search className="w-3 h-3" /> {t('common.btn.search')}`);
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
        pushFieldMarkup(fieldLines, ind, f, id, paramsVar, setParamsVar);
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
