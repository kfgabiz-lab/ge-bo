import type { FormWidget, FormFieldItem } from "../../components/builder/FormBuilder";
import type { MultiSelectWidget } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import {
  jsStringLiteral,
  collectUnhandledKeys,
  emitContainerOpen,
  emitContainerClose,
  emitSlugOptionSelectComponent,
  formVarNames,
  multiSelectVarNames,
  pageVar,
} from "../widgetGenerator";
import {
  fieldLabelCls,
  fieldDescCls,
  fieldBodyCls,
  fieldRequiredMarkCls,
  formTitleBlockCls,
  formTitleCls,
  formTitleDescCls,
  formFieldCellCls,
  FORM_CONTENT_PADDING_TOP,
  FORM_FIELD_ROW_HEIGHT,
  FORM_FIELD_GAP,
} from "../../styles";
import { SELECT_ALL_PLACEHOLDER, SELECT_ALL_MSG_KEY, FILE_FIELD_TYPES } from "../../constants";
import {
  emitFormField,
  emitFileLocalComponents,
  createFormFieldNeeds,
  FORM_SUPPORTED_FIELD_TYPES,
} from "./form/fieldEmitters";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";
const CONTENT_SAVE_MODULE = "@/app/admin/templates/make/_shared/utils/contentSave";
const FORM_BUILDER_MODULE = "@/app/admin/templates/make/_shared/components/builder/FormBuilder";
const FORM_GRID_MODULE = "@/app/admin/templates/make/_shared/utils/formGridLayout";

const HANDLED_WIDGET_KEYS = new Set([
  "type",
  "widgetId",
  "contentKey",
  "fields",
  "title",
  "titleMsgKey",
  "description",
  "descriptionMsgKey",
  "showBorder",
  "bgColor",
  "connectedSlug",
]);

const IGNORED_WIDGET_KEYS = new Map<string, string>();

const HANDLED_FIELD_KEYS = new Set([
  "id",
  "type",
  "label",
  "labelMsgKey",
  "fieldKey",
  "colSpan",
  "rowSpan",
  "required",
  "placeholder",
  "placeholderMsgKey",
  "description",
  "descriptionMsgKey",
  "minLength",
  "maxLength",
  "pattern",
  "patternDesc",
  "patternDescMsgKey",
  "showCharCount",
  "options",
  "codeGroupCode",
  "displayAs",
  "defaultOptionValue",
  "defaultValue",
  "defaultValueMsgKey",
  "defaultToday",
  "defaultDate",
  "defaultDateOffset",
  "disablePast",
  "dateSubType",
  "disableCondition",
  "hideCondition",
  "dataGenerations",
  "generationKey",
  "dataReplacement",
  "caseChange",
  "appendText",
  "truncateLength",
  "stripHtml",
  "onlyIfEmpty",
  "editorType",
  "maxFileSizeMB",
  "maxFileSizeUnit",
  "maxFileCount",
  "imageMaxWidthPx",
  "imageMaxHeightPx",
  "isPk",
  "readonly",
  "optionFilterExpr",
  "relationSlugId",
  "fetchDisplayMode",
  "data",
  "optionSlug",
  "optionValueKey",
  "optionTextKey",
  "optionFilter",
  "optionOrderKey",
  "optionOrderDir",
  "mediaImageMaxSizeMB",
  "mediaVideoMaxSizeMB",
  "mediaImageMaxSizeUnit",
]);

const IGNORED_FIELD_KEYS = new Map<string, string>([
  [
    "rows",
    "FormBuilder 필드 편집기가 textarea에 남기는 잔여 값 — FieldRenderer.tsx textarea 분기와 formGridLayout 어디서도 field.rows를 읽지 않고 높이는 rowSpan으로만 계산됨",
  ],
  [
    "disablePastDates",
    "date 필드 과거일 차단은 FieldRenderer.tsx:1282 dateMin 계산이 field.disablePast만 읽어서 처리한다 — field.disablePastDates는 SearchFieldConfig(types.ts)에 없고 DateField.tsx 빌더 편집기에도 대응 입력이 없어 런타임에서 읽는 지점이 전혀 없는 사문화 값",
  ],
  [
    "minDate",
    "date 필드 최소값(dateMin)은 FieldRenderer.tsx:1282가 disablePast+defaultToday/defaultDateOffset/defaultDate 조합으로만 계산한다 — field.minDate는 SearchFieldConfig(types.ts)에 없고 DateField.tsx 빌더 편집기에도 대응 입력이 없어 런타임에서 읽는 지점이 전혀 없는 사문화 값",
  ],
]);

const sanitizeWidgetForEmit = (widget: FormWidget): FormWidget => ({
  ...widget,
  fields: (widget.fields ?? []).map((field) => {
    const clone = { ...field } as Record<string, unknown>;
    IGNORED_FIELD_KEYS.forEach((_, key) => delete clone[key]);
    return clone as unknown as FormFieldItem;
  }),
});

const fileTypeSetLiteral = (): string =>
  `new Set<string>([${FILE_FIELD_TYPES.map((tp) => jsStringLiteral(tp)).join(", ")}])`;

const textExprOf = (text: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(text ?? "");

const buildUnhandled = (widget: FormWidget): UnhandledConfigKeys[] => {
  const widgetUnhandled = collectUnhandledKeys(
    widget as unknown as Record<string, unknown>,
    HANDLED_WIDGET_KEYS,
    new Set(IGNORED_WIDGET_KEYS.keys())
  );
  const ignoredFieldKeySet = new Set(IGNORED_FIELD_KEYS.keys());
  const fieldUnhandledSet = new Set<string>();
  (widget.fields ?? []).forEach((f) => {
    collectUnhandledKeys(f as unknown as Record<string, unknown>, HANDLED_FIELD_KEYS, ignoredFieldKeySet).forEach((k) =>
      fieldUnhandledSet.add(k)
    );
  });
  return [
    { scope: "widget", keys: widgetUnhandled },
    { scope: "field", keys: [...fieldUnhandledSet] },
  ];
};

export const generateFormBlock = (widget: FormWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, contentColSpan, allWidgets, suffixOf, isEntity } = ctx;
  const names = formVarNames(suffix);
  const fields = widget.fields ?? [];

  const allForms = allWidgets.filter((w) => w.type === "form") as FormWidget[];
  const isPrimary = allForms[0] === widget;
  const allMultiSelects = allWidgets.filter((w) => w.type === "multiselect") as MultiSelectWidget[];

  const hasFileFields = fields.some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type));
  const pageHasFileFields = allForms.some((fw) =>
    (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type))
  );
  const pageHasMediaFields = allForms.some((fw) => (fw.fields ?? []).some((f) => f.type === "media"));
  const hasInputField = fields.some((f) => f.type === "input");
  const pageHasTextFields = allForms.some((fw) => (fw.fields ?? []).some((f) => f.type === "text"));
  const hasTitleBlock = !!(widget.titleMsgKey || widget.title);
  const bgColor = widget.bgColor && widget.bgColor !== "none" ? widget.bgColor : undefined;
  const mainSlug = widget.connectedSlug || ctx.mainConnectedSlug || "";

  const needs = createFormFieldNeeds();
  const imports: ImportRequirement[] = [];
  const helperLines: string[] = [];
  const stateLines: string[] = [];
  const handlerLines: string[] = [];
  const jsxLines: string[] = [];

  helperLines.push(`const ${names.widget}: FormWidget = ${JSON.stringify(sanitizeWidgetForEmit(widget), null, 4)};`);
  helperLines.push(`const ${names.fields}: FormFieldItem[] = ${names.widget}.fields;`);
  helperLines.push(
    `const ${names.fieldById}: Record<string, FormFieldItem> = Object.fromEntries(${names.fields}.map((f) => [f.id, f]));`
  );
  helperLines.push(`const ${names.keyToId} = buildKeyToId(${names.fields});`);

  imports.push({ module: FORM_BUILDER_MODULE, named: ["FormWidget", "FormFieldItem"], typeOnly: true });
  imports.push({ module: UTILS_MODULE, named: ["buildKeyToId"] });
  imports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
  imports.push({ module: "react", named: ["useMemo", "useCallback", "useRef"] });

  if (allForms[allForms.length - 1] === widget) {
    const allFormWidgetVars = allForms.map((fw) => formVarNames(suffixOf(fw.widgetId)).widget);
    helperLines.push(`const ALL_FORM_WIDGETS: FormWidget[] = [${allFormWidgetVars.join(", ")}];`);
  }

  if (isPrimary) {
    if (pageHasFileFields) helperLines.push(`const FILE_FIELD_TYPE_SET = ${fileTypeSetLiteral()};`);
    if (pageHasFileFields) {
      helperLines.push("");
      emitFileLocalComponents(isEntity, pageHasMediaFields).forEach((l) => helperLines.push(l));
      imports.push({ module: "@/lib/api", defaultName: "api" });
      imports.push({ module: "sonner", named: ["toast"] });
      if (pageHasMediaFields) imports.push({ module: "react", named: ["useEffect"] });
    }
  }

  if (isPrimary) {
    stateLines.push(`${ind(1)}const { t } = useI18n();`);
    stateLines.push(`${ind(1)}const searchParams = useSearchParams();`);
    stateLines.push(`${ind(1)}const sitesLoaded = useSiteStore((s) => s.sitesLoaded);`);
    stateLines.push(
      `${ind(1)}const clockReady = useServerClockStore((s) => s.status === 'synced' || s.status === 'failed');`
    );
    stateLines.push(`${ind(1)}const storedId = searchParams.get('id') ? Number(searchParams.get('id')) : null;`);
    imports.push({ module: "next/navigation", named: ["useSearchParams"] });
    imports.push({ module: "@/store/use-site-store", named: ["useSiteStore"] });
    imports.push({ module: "@/store/use-server-clock-store", named: ["useServerClockStore"] });
    if (pageHasFileFields) {
      stateLines.push(`${ind(1)}const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});`);
      stateLines.push(`${ind(1)}const pendingDeleteFileIds = useRef<Set<number>>(new Set());`);
    }
    if (pageHasTextFields) {
      stateLines.push(
        `${ind(1)}const [${pageVar("fetchRelData")}, ${pageVar("setFetchRelData")}] = useState<Record<string, unknown>>({});`
      );
    }
  }

  stateLines.push(`${ind(1)}const [${names.values}, ${names.setValues}] = useState<Record<string, string>>({});`);
  if (hasFileFields) {
    stateLines.push(`${ind(1)}const [${names.files}, ${names.setFiles}] = useState<Record<string, File[]>>({});`);
    stateLines.push(
      `${ind(1)}const [${names.existingMeta}, ${names.setExistingMeta}] = useState<Record<string, { id: number; origName: string; fileSize: number }[]>>({});`
    );
  }

  const fieldJsxByField = new Map<FormFieldItem, string[]>();
  fields.forEach((f) => {
    const disabledExpr = f.disableCondition
      ? `${names.evalCondition}(${jsStringLiteral(f.disableCondition)})`
      : "false";
    fieldJsxByField.set(
      f,
      emitFormField(
        { ind, level: 3, field: f, names, isEntity, disabledExpr, needs },
        SELECT_ALL_PLACEHOLDER,
        SELECT_ALL_MSG_KEY
      )
    );
  });

  if (needs.codeGroups) {
    stateLines.push(`${ind(1)}const { groups, fetchGroups } = useCodeStore();`);
    stateLines.push(`${ind(1)}useEffect(() => { fetchGroups(); }, [fetchGroups]);`);
    imports.push({ module: "@/store/use-code-store", named: ["useCodeStore"] });
  }
  if (needs.useId) {
    stateLines.push(`${ind(1)}const uid = useId();`);
    imports.push({ module: "react", named: ["useId"] });
  }
  if (needs.fetchRel) {
    imports.push({ module: UTILS_MODULE, named: ["buildFormRowData", "formatFetchedRelValue"] });
    const fetchRelDataArg = pageHasTextFields ? `, ${pageVar("fetchRelData")}` : "";
    const fetchRelDataDep = pageHasTextFields ? `, ${pageVar("fetchRelData")}` : "";
    handlerLines.push(
      `${ind(1)}const ${names.rowData} = useMemo(() => buildFormRowData(${names.fields}, ${names.values}${fetchRelDataArg}), [${names.values}${fetchRelDataDep}]);`
    );
    handlerLines.push("");
  }
  if (needs.fetchRelDataExpr) {
    imports.push({ module: UTILS_MODULE, named: ["evalColumnDataExpr", "resolveEvalExprI18n"] });
  }
  if (needs.parseOpt) imports.push({ module: UTILS_MODULE, named: ["parseOpt"] });
  if (needs.resolveCodeLabel) imports.push({ module: UTILS_MODULE, named: ["resolveCodeLabel"] });
  if (needs.resolveFieldOptions) imports.push({ module: UTILS_MODULE, named: ["resolveFieldOptions"] });
  if (needs.searchFieldConfigType) {
    imports.push({
      module: "@/app/admin/templates/make/_shared/types",
      named: ["SearchFieldConfig"],
      typeOnly: true,
    });
  }
  if (needs.dateDefault) imports.push({ module: UTILS_MODULE, named: ["formatNowBySubType", "calcDateOffset"] });
  if (needs.image) {
    imports.push({ module: UTILS_MODULE, named: ["filterByAccept", "unitToBytes"] });
    imports.push({ module: "sonner", named: ["toast"] });
  }
  if (needs.imagePixelCheck) {
    imports.push({ module: UTILS_MODULE, named: ["getImageNaturalSize", "checkImagePixelLimit"] });
  }
  if (needs.icons.size > 0) imports.push({ module: "lucide-react", named: [...needs.icons] });
  if (needs.tiptap) {
    imports.push({ module: "next/dynamic", defaultName: "dynamic" });
    helperLines.unshift(
      `const TiptapEditor = dynamic(() => import('@/components/common/tiptap-editor'), { ssr: false });`
    );
  }
  if (needs.wysiwyg) {
    imports.push({ module: "next/dynamic", defaultName: "dynamic" });
    helperLines.unshift(
      `const WysiwygEditor = dynamic(() => import('@/components/common/wysiwyg-editor'), { ssr: false });`
    );
  }
  if (needs.slugOptionSelect) {
    imports.push({ module: "react", named: ["useMemo"] });
    imports.push({ module: "@/lib/api", defaultName: "api" });
    imports.push({ module: UTILS_MODULE, named: ["flattenPageDataItem", "buildSlugOptRows"] });
    helperLines.push("");
    emitSlugOptionSelectComponent().forEach((l) => helperLines.push(l));
  }

  if (isPrimary) {
    handlerLines.push(`${ind(1)}const urlParams = useMemo(() => {`);
    handlerLines.push(`${ind(2)}const skip = new Set(['id', 'group_id']);`);
    handlerLines.push(`${ind(2)}const map: Record<string, string> = {};`);
    handlerLines.push(`${ind(2)}searchParams.forEach((value, key) => { if (!skip.has(key)) map[key] = value; });`);
    handlerLines.push(`${ind(2)}return map;`);
    handlerLines.push(`${ind(1)}}, [searchParams]);`);
    handlerLines.push("");
    handlerLines.push(
      `${ind(1)}const allFieldKeyToId = useMemo(() => buildFieldKeyIdAndLabelMaps(ALL_FORM_WIDGETS, t).allFieldKeyToId, [t]);`
    );
    const allValueVars = allForms.map((fw) => formVarNames(suffixOf(fw.widgetId)).values);
    handlerLines.push(
      `${ind(1)}const allFormValues = useMemo(() => Object.assign({}, ${allValueVars.join(", ")}) as Record<string, string>, [${allValueVars.join(", ")}]);`
    );
    handlerLines.push(`${ind(1)}const lastGeneratedRef = useRef<Record<string, string>>({});`);
    handlerLines.push("");
    handlerLines.push(`${ind(1)}const writeFormValue = useCallback((fieldId: string, value: string) => {`);
    allForms.forEach((fw) => {
      const n = formVarNames(suffixOf(fw.widgetId));
      handlerLines.push(
        `${ind(2)}if (${n.fieldById}[fieldId]) { ${n.setValues}((prev) => ({ ...prev, [fieldId]: value })); markDirty(); return; }`
      );
    });
    handlerLines.push(`${ind(1)}}, [markDirty]);`);
    handlerLines.push("");
    handlerLines.push(`${ind(1)}const applyFieldGenerations = useCallback((`);
    handlerLines.push(`${ind(2)}sourceField: FormFieldItem,`);
    handlerLines.push(`${ind(2)}fieldId: string,`);
    handlerLines.push(`${ind(2)}value: string,`);
    handlerLines.push(`${ind(2)}resolveTargetFieldId: (key: string) => string | undefined`);
    handlerLines.push(`${ind(1)}) => {`);
    handlerLines.push(`${ind(2)}if (sourceField.generationKey) {`);
    handlerLines.push(
      `${ind(3)}const transformed = applyDataGeneration(value, sourceField.dataReplacement, sourceField.caseChange, sourceField.appendText, sourceField.truncateLength, undefined);`
    );
    handlerLines.push(`${ind(3)}splitGenerationKeys(sourceField.generationKey).forEach((key) => {`);
    handlerLines.push(`${ind(4)}const targetFieldId = resolveTargetFieldId(key);`);
    handlerLines.push(
      `${ind(4)}if (targetFieldId && targetFieldId !== fieldId) writeFormValue(targetFieldId, transformed);`
    );
    handlerLines.push(`${ind(3)}});`);
    handlerLines.push(`${ind(2)}}`);
    handlerLines.push(`${ind(2)}(sourceField.dataGenerations ?? []).forEach((dg) => {`);
    handlerLines.push(`${ind(3)}if (!dg.generationKey) return;`);
    handlerLines.push(
      `${ind(3)}const transformed = applyDataGeneration(value, dg.dataReplacement, dg.caseChange, dg.appendText, dg.truncateLength, dg.stripHtml);`
    );
    handlerLines.push(
      `${ind(3)}const sourceIsBlank = !!dg.onlyIfEmpty && applyDataGeneration(value, dg.dataReplacement, dg.caseChange, undefined, undefined, dg.stripHtml).trim() === '';`
    );
    handlerLines.push(`${ind(3)}const nextValue = sourceIsBlank ? '' : transformed;`);
    handlerLines.push(`${ind(3)}for (const key of splitGenerationKeys(dg.generationKey)) {`);
    handlerLines.push(`${ind(4)}const targetFieldId = resolveTargetFieldId(key);`);
    handlerLines.push(`${ind(4)}if (!targetFieldId || targetFieldId === fieldId) continue;`);
    handlerLines.push(`${ind(4)}if (dg.onlyIfEmpty && !sourceIsBlank) {`);
    handlerLines.push(`${ind(5)}const currentTargetValue = allFormValues[targetFieldId] ?? '';`);
    handlerLines.push(
      `${ind(5)}if (currentTargetValue !== '' && currentTargetValue !== lastGeneratedRef.current[targetFieldId]) continue;`
    );
    handlerLines.push(`${ind(4)}}`);
    handlerLines.push(`${ind(4)}writeFormValue(targetFieldId, nextValue);`);
    handlerLines.push(`${ind(4)}if (dg.onlyIfEmpty) lastGeneratedRef.current[targetFieldId] = nextValue;`);
    handlerLines.push(`${ind(3)}}`);
    handlerLines.push(`${ind(2)}});`);
    handlerLines.push(`${ind(1)}}, [allFormValues, writeFormValue]);`);
    handlerLines.push("");
    imports.push({
      module: UTILS_MODULE,
      named: ["buildFieldKeyIdAndLabelMaps", "applyDataGeneration", "splitGenerationKeys"],
    });
  }

  handlerLines.push(
    `${ind(1)}const ${names.evalCondition} = useCallback((condition: string): boolean => evalConditionExpr(condition, buildFieldConditionResolver({ ...allFieldKeyToId, ...${names.keyToId} }, { ...allFormValues, ...${names.values} }, urlParams, undefined)), [allFieldKeyToId, allFormValues, ${names.values}, urlParams]);`
  );
  handlerLines.push(
    `${ind(1)}const resolveTargetFieldId${suffix} = useCallback((key: string): string | undefined => (key.includes('.') ? allFieldKeyToId[key] : (${names.keyToId}[key] ?? allFieldKeyToId[key])), [allFieldKeyToId]);`
  );
  handlerLines.push("");
  handlerLines.push(`${ind(1)}const ${names.change} = useCallback((fieldId: string, value: string) => {`);
  handlerLines.push(`${ind(2)}${names.setValues}((prev) => ({ ...prev, [fieldId]: value }));`);
  handlerLines.push(`${ind(2)}markDirty();`);
  handlerLines.push(`${ind(2)}const sourceField = ${names.fieldById}[fieldId];`);
  handlerLines.push(`${ind(2)}if (!sourceField) return;`);
  handlerLines.push(`${ind(2)}if (sourceField.fieldKey && (${names.values}[fieldId] ?? '') !== value) {`);
  handlerLines.push(
    `${ind(3)}findOptionFilterResetTargetIds(${names.fields}, sourceField.fieldKey).forEach((targetFieldId) => {`
  );
  handlerLines.push(`${ind(4)}if (targetFieldId === fieldId) return;`);
  handlerLines.push(`${ind(4)}if ((${names.values}[targetFieldId] ?? '') !== '') {`);
  handlerLines.push(`${ind(5)}${names.setValues}((prev) => ({ ...prev, [targetFieldId]: '' }));`);
  handlerLines.push(`${ind(5)}markDirty();`);
  handlerLines.push(`${ind(4)}}`);
  handlerLines.push(`${ind(3)}});`);
  handlerLines.push(`${ind(2)}}`);
  handlerLines.push(`${ind(2)}applyFieldGenerations(sourceField, fieldId, value, resolveTargetFieldId${suffix});`);
  handlerLines.push(`${ind(1)}}, [${names.values}, markDirty, applyFieldGenerations, resolveTargetFieldId${suffix}]);`);
  handlerLines.push("");
  imports.push({
    module: UTILS_MODULE,
    named: ["evalConditionExpr", "buildFieldConditionResolver", "findOptionFilterResetTargetIds"],
  });

  if (hasInputField) {
    handlerLines.push(`${ind(1)}const ${names.blur} = useCallback((fieldId: string) => {`);
    handlerLines.push(`${ind(2)}const sourceField = ${names.fieldById}[fieldId];`);
    handlerLines.push(`${ind(2)}if (!sourceField) return;`);
    handlerLines.push(`${ind(2)}const keys: string[] = [];`);
    handlerLines.push(
      `${ind(2)}if (sourceField.generationKey) keys.push(...splitGenerationKeys(sourceField.generationKey));`
    );
    handlerLines.push(
      `${ind(2)}(sourceField.dataGenerations ?? []).forEach((dg) => { if (dg.generationKey) keys.push(...splitGenerationKeys(dg.generationKey)); });`
    );
    handlerLines.push(
      `${ind(2)}keys.forEach((key) => { delete lastGeneratedRef.current[resolveTargetFieldId${suffix}(key) ?? key]; });`
    );
    handlerLines.push(`${ind(1)}}, [resolveTargetFieldId${suffix}]);`);
    handlerLines.push("");
    imports.push({ module: UTILS_MODULE, named: ["splitGenerationKeys"] });
  }

  if (hasFileFields) {
    handlerLines.push(
      `${ind(1)}const ${names.fileChange} = useCallback((fieldId: string, files: File[]) => { ${names.setFiles}((prev) => ({ ...prev, [fieldId]: files })); markDirty(); }, [markDirty]);`
    );
    handlerLines.push(`${ind(1)}const ${names.removeExisting} = useCallback((fieldId: string, fileId: number) => {`);
    handlerLines.push(`${ind(2)}pendingDeleteFileIds.current.add(fileId);`);
    handlerLines.push(
      `${ind(2)}${names.setExistingMeta}((prev) => ({ ...prev, [fieldId]: (prev[fieldId] ?? []).filter((f) => f.id !== fileId) }));`
    );
    handlerLines.push(
      `${ind(2)}setImgBlobUrls((prev) => { const next = { ...prev }; delete next[fileId]; return next; });`
    );
    handlerLines.push(`${ind(2)}markDirty();`);
    handlerLines.push(`${ind(1)}}, [markDirty]);`);
    handlerLines.push("");
  }

  if (isPrimary) {
    if (!mainSlug) {
      handlerLines.push(
        `${ind(1)}/* TODO(파일빌드): 연결 slug를 찾을 수 없어 수정 모드 데이터 복원을 방출하지 못했습니다. */`
      );
    } else {
      handlerLines.push(`${ind(1)}useEffect(() => {`);
      handlerLines.push(`${ind(2)}if (storedId === null) {`);
      handlerLines.push(`${ind(3)}if (!sitesLoaded || !clockReady) return;`);
      handlerLines.push(`${ind(3)}const defaults = initFormDefaultValues(ALL_FORM_WIDGETS, t);`);
      allForms.forEach((fw) => {
        const n = formVarNames(suffixOf(fw.widgetId));
        handlerLines.push(`${ind(3)}${n.setValues}(defaults[${jsStringLiteral(fw.widgetId)}] ?? {});`);
      });
      handlerLines.push(`${ind(3)}return;`);
      handlerLines.push(`${ind(2)}}`);
      handlerLines.push(`${ind(2)}let cancelled = false;`);
      handlerLines.push(`${ind(2)}api`);
      handlerLines.push(`${ind(3)}.get(\`/page-data/${mainSlug}/\${storedId}\`)`);
      handlerLines.push(`${ind(3)}.then(async (res) => {`);
      handlerLines.push(`${ind(4)}if (cancelled) return;`);
      handlerLines.push(`${ind(4)}const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;`);
      handlerLines.push(
        `${ind(4)}const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);`
      );
      if (pageHasTextFields) {
        handlerLines.push(`${ind(4)}${pageVar("setFetchRelData")}(extractFetchRelData(dataJson));`);
      }
      allForms.forEach((fw) => {
        const n = formVarNames(suffixOf(fw.widgetId));
        handlerLines.push(
          `${ind(4)}${n.setValues}((prev) => ({ ...prev, ...(valuesByWidgetId[${jsStringLiteral(fw.widgetId)}] ?? {}) }));`
        );
      });
      allMultiSelects.forEach((mw) => {
        const mn = multiSelectVarNames(suffixOf(mw.widgetId));
        handlerLines.push(
          `${ind(4)}const selection${suffixOf(mw.widgetId)} = extractMultiSelectSelection(dataJson, ${jsStringLiteral(mw.contentKey)}, ${jsStringLiteral(mw.connectedSlug ?? "")});`
        );
        handlerLines.push(
          `${ind(4)}if (selection${suffixOf(mw.widgetId)}.kind !== 'none') ${mn.setIds}(selection${suffixOf(mw.widgetId)}.ids);`
        );
      });
      if (pageHasFileFields) {
        handlerLines.push(`${ind(4)}const fileIds = collectFileIdsDeep(dataJson);`);
        handlerLines.push(`${ind(4)}if (fileIds.length === 0) return;`);
        handlerLines.push(
          `${ind(4)}const metaList = await fetchFileMetaByIds(fileIds, ${isEntity ? "true" : "false"});`
        );
        allForms.forEach((fw) => {
          const n = formVarNames(suffixOf(fw.widgetId));
          const hasFiles = (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type));
          if (!hasFiles) return;
          handlerLines.push(
            `${ind(4)}const section${suffixOf(fw.widgetId)} = findSection(dataJson, ${jsStringLiteral(fw.contentKey)});`
          );
          handlerLines.push(
            `${ind(4)}const metaByFieldId${suffixOf(fw.widgetId)}: Record<string, { id: number; origName: string; fileSize: number }[]> = {};`
          );
          handlerLines.push(`${ind(4)}${n.fields}.forEach((f) => {`);
          handlerLines.push(`${ind(5)}if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;`);
          handlerLines.push(`${ind(5)}const ids = section${suffixOf(fw.widgetId)}[f.fieldKey];`);
          handlerLines.push(`${ind(5)}if (!Array.isArray(ids)) return;`);
          handlerLines.push(
            `${ind(5)}metaByFieldId${suffixOf(fw.widgetId)}[f.id] = (ids as number[]).map((id) => metaList.find((m) => m.id === id)).filter((m): m is { id: number; origName: string; fileSize: number } => !!m);`
          );
          handlerLines.push(`${ind(5)}if (f.type === 'image' || f.type === 'video' || f.type === 'media') {`);
          handlerLines.push(`${ind(6)}(ids as number[]).forEach((id) => {`);
          handlerLines.push(
            `${ind(7)}fetchFileBlobUrl(id, ${isEntity ? "true" : "false"}).then((url) => setImgBlobUrls((prev) => ({ ...prev, [id]: url }))).catch(() => {});`
          );
          handlerLines.push(`${ind(6)}});`);
          handlerLines.push(`${ind(5)}}`);
          handlerLines.push(`${ind(4)}});`);
          handlerLines.push(`${ind(4)}${n.setExistingMeta}(metaByFieldId${suffixOf(fw.widgetId)});`);
        });
      }
      handlerLines.push(`${ind(3)}})`);
      handlerLines.push(`${ind(3)}.catch(() => toast.error(t('common.error.load_existing_data')));`);
      handlerLines.push(`${ind(2)}return () => { cancelled = true; };`);
      handlerLines.push(`${ind(2)}// eslint-disable-next-line react-hooks/exhaustive-deps`);
      handlerLines.push(`${ind(1)}}, [storedId, searchParams, sitesLoaded, clockReady]);`);
      handlerLines.push("");
      imports.push({
        module: UTILS_MODULE,
        named: ["initFormDefaultValues", "buildFormValuesFromDataJson"],
      });
      if (pageHasTextFields) imports.push({ module: UTILS_MODULE, named: ["extractFetchRelData"] });
      imports.push({ module: "@/lib/api", defaultName: "api" });
      imports.push({ module: "sonner", named: ["toast"] });
      if (allMultiSelects.length > 0) {
        imports.push({ module: UTILS_MODULE, named: ["extractMultiSelectSelection"] });
      }
      if (pageHasFileFields) {
        imports.push({ module: UTILS_MODULE, named: ["findSection"] });
        imports.push({
          module: CONTENT_SAVE_MODULE,
          named: ["collectFileIdsDeep", "fetchFileMetaByIds", "fetchFileBlobUrl"],
        });
      }
    }
  }

  handlerLines.push(
    `${ind(1)}const ${names.visibleFields} = ${names.fields}.filter((f) => !(f.hideCondition && ${names.evalCondition}(f.hideCondition)));`
  );
  handlerLines.push(
    `${ind(1)}const ${names.rowIsAuto} = calculateFormFieldRowTracks(${names.visibleFields}, ${contentColSpan}, ${hasTitleBlock});`
  );
  handlerLines.push("");
  imports.push({ module: FORM_GRID_MODULE, named: ["calculateFormFieldRowTracks"] });

  if (fields.length === 0) {
    jsxLines.push(
      `{/* TODO(파일빌드): 이 Form 위젯에는 필드가 없습니다. 빌더에서 필드를 추가한 뒤 다시 생성해주세요. */}`
    );
    jsxLines.push(emitContainerOpen({ showBorder: widget.showBorder !== false, bgColor, fillHeight: false }));
    jsxLines.push(emitContainerClose());
    return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
  }

  jsxLines.push(
    emitContainerOpen({
      showBorder: widget.showBorder !== false,
      bgColor,
      contentColSpan,
      contentPaddingTop: FORM_CONTENT_PADDING_TOP,
      fillHeight: false,
      rowPitch: FORM_FIELD_ROW_HEIGHT,
      gapSize: FORM_FIELD_GAP,
      gridTemplateRowsExpr: `${names.rowIsAuto}.length > 0 ? ${names.rowIsAuto}.map((a) => (a ? 'auto' : '${FORM_FIELD_ROW_HEIGHT - FORM_FIELD_GAP}px')).join(' ') : undefined`,
    })
  );

  if (hasTitleBlock) {
    jsxLines.push(
      `${ind(1)}<div className=${jsStringLiteral(formTitleBlockCls)} style={{ gridColumn: 'span ${contentColSpan}', gridRow: 'span 1' }}>`
    );
    jsxLines.push(
      `${ind(2)}<h3 className=${jsStringLiteral(formTitleCls)}>{${textExprOf(widget.title, widget.titleMsgKey)}}</h3>`
    );
    if (widget.descriptionMsgKey || widget.description) {
      jsxLines.push(
        `${ind(2)}<p className=${jsStringLiteral(formTitleDescCls)}>{${textExprOf(widget.description, widget.descriptionMsgKey)}}</p>`
      );
    }
    jsxLines.push(`${ind(1)}</div>`);
  }

  fields.forEach((f) => {
    const cellLines: string[] = [];
    const colSpanValue = Math.min(f.colSpan, contentColSpan);
    cellLines.push(
      `${ind(1)}<div className=${jsStringLiteral(formFieldCellCls)} style={{ gridColumn: 'span ${colSpanValue}', gridRow: 'span ${f.rowSpan}' }}>`
    );
    if (f.labelMsgKey || f.label) {
      const requiredMark = f.required ? `<span className=${jsStringLiteral(fieldRequiredMarkCls)}>*</span>` : "";
      cellLines.push(
        `${ind(2)}<label className=${jsStringLiteral(fieldLabelCls)}>{${textExprOf(f.label, f.labelMsgKey)}}${requiredMark}</label>`
      );
    }
    if (f.descriptionMsgKey || f.description) {
      cellLines.push(
        `${ind(2)}<p className=${jsStringLiteral(fieldDescCls)}>{${textExprOf(f.description, f.descriptionMsgKey)}}</p>`
      );
    }
    cellLines.push(`${ind(2)}<div className=${jsStringLiteral(fieldBodyCls)}>`);
    if (!FORM_SUPPORTED_FIELD_TYPES.has(f.type)) {
      cellLines.push(
        `${ind(3)}{/* TODO(파일빌드): '${f.fieldKey || f.id}' 필드 타입(${f.type})은 아직 코드 생성이 지원되지 않습니다. 직접 구현해주세요. */}`
      );
    } else {
      (fieldJsxByField.get(f) ?? []).forEach((l) => cellLines.push(l));
    }
    cellLines.push(`${ind(2)}</div>`);
    cellLines.push(`${ind(1)}</div>`);

    if (f.hideCondition) {
      jsxLines.push(`${ind(1)}{!${names.evalCondition}(${jsStringLiteral(f.hideCondition)}) && (`);
      cellLines.forEach((l) => jsxLines.push(l));
      jsxLines.push(`${ind(1)})}`);
    } else {
      cellLines.forEach((l) => jsxLines.push(l));
    }
  });

  jsxLines.push(emitContainerClose());

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
