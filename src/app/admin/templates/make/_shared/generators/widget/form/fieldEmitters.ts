import type { FormFieldItem } from "../../../components/builder/FormBuilder";
import type { SearchFieldConfig } from "../../../types";
import {
  inputCls,
  selectCls,
  fieldCharCountCls,
  fieldCharCountPadCls,
  fieldOptionGroupCls,
  fieldOptionItemClass,
  fieldOptionTextCls,
  fieldRadioInputCls,
  fieldCheckboxInputCls,
  readonlyFieldCls,
  textareaFlexCls,
  textareaFullCls,
  textareaCharCountWrapCls,
  textareaCharCountCls,
  imageDropZoneClass,
  imagePlaceholderCls,
  imagePlaceholderStaticCls,
  imageCellExistingCls,
  imageCellNewCls,
  imageRemoveBtnCls,
  imageAddCellCls,
  fileInfoBarCls,
  fileInfoBarBtnCls,
  fileInfoBarSizeCls,
  fieldRelativeWrapCls,
  imagePlaceholderIconCls,
  imagePlaceholderTitleCls,
  imagePlaceholderInfoCls,
  imageGridWrapCls,
  imageGridCls,
  imageCellBodyCls,
  imagePreviewImgCls,
  imageFallbackBoxCls,
  imageFallbackIconCls,
  imageRemoveIconCls,
  imageAddIconCls,
  imageAddTextCls,
  fieldContentHeight,
  fieldTextValueClass,
  FORM_FIELD_ROW_HEIGHT,
  fieldDateRangeInputPadCls,
} from "../../../styles";
import {
  SEARCH_DATE_ICON_CLS,
  SEARCH_DATE_RANGE_SEP_CLS,
  SEARCH_DATE_RANGE_WRAP_CLS,
  SEARCH_DATE_RANGE_INPUT_WRAP_CLS,
} from "../../../components/renderer/rendererStyles";
import { FILE_TYPE_PRESETS, FILE_TYPE_LABELS } from "../../../constants";
import { jsStringLiteral, emitSelectArrow, slugOptionFieldLiteral, type formVarNames } from "../../widgetGenerator";

export interface FormFieldNeeds {
  codeGroups: boolean;
  parseOpt: boolean;
  resolveFieldOptions: boolean;
  tiptap: boolean;
  wysiwyg: boolean;
  image: boolean;
  imagePixelCheck: boolean;
  dateDefault: boolean;
  useId: boolean;
  searchFieldConfigType: boolean;
  resolveCodeLabel: boolean;
  fetchRel: boolean;
  fetchRelDataExpr: boolean;
  slugOptionSelect: boolean;
  icons: Set<string>;
}

export const createFormFieldNeeds = (): FormFieldNeeds => ({
  codeGroups: false,
  parseOpt: false,
  resolveFieldOptions: false,
  tiptap: false,
  wysiwyg: false,
  image: false,
  imagePixelCheck: false,
  dateDefault: false,
  useId: false,
  searchFieldConfigType: false,
  resolveCodeLabel: false,
  fetchRel: false,
  fetchRelDataExpr: false,
  slugOptionSelect: false,
  icons: new Set<string>(),
});

export interface FormFieldEmitOptions {
  ind: (n: number) => string;
  level: number;
  field: FormFieldItem;
  names: ReturnType<typeof formVarNames>;
  isEntity: boolean;
  disabledExpr: string;
  needs: FormFieldNeeds;
}

export const FORM_SUPPORTED_FIELD_TYPES = new Set<string>([
  "input",
  "image",
  "media",
  "select",
  "date",
  "radio",
  "checkbox",
  "editor",
  "textarea",
  "text",
  "hidden",
  "dateRange",
]);

const textExprOf = (text: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(text ?? "");

const inputPlaceholderExpr = (field: FormFieldItem): string => {
  if (field.placeholderMsgKey) return `t(${jsStringLiteral(field.placeholderMsgKey)})`;
  if (field.placeholder) return jsStringLiteral(field.placeholder);
  return `t('common.input.placeholder')`;
};

const textareaPlaceholderExpr = (field: FormFieldItem): string => {
  if (field.placeholderMsgKey) return `t(${jsStringLiteral(field.placeholderMsgKey)})`;
  if (field.placeholder) return jsStringLiteral(field.placeholder);
  return `t('common.input.textarea_placeholder')`;
};

const selectPlaceholderExpr = (field: FormFieldItem, selectAllPlaceholder: string, selectAllMsgKey: string): string => {
  if (field.placeholderMsgKey) return `t(${jsStringLiteral(field.placeholderMsgKey)})`;
  if (field.placeholder?.trim() === selectAllPlaceholder) return `t(${jsStringLiteral(selectAllMsgKey)})`;
  if (field.placeholder) return jsStringLiteral(field.placeholder);
  return `t('common.select.placeholder')`;
};

const dateInputType = (subType: string): string => {
  if (subType === "yearMonth") return "month";
  if (subType === "datetime") return "datetime-local";
  if (subType === "time" || subType === "timeSec") return "time";
  return "date";
};

const optionsSourceExpr = (o: FormFieldEmitOptions): string => {
  o.needs.resolveFieldOptions = true;
  o.needs.parseOpt = true;
  o.needs.searchFieldConfigType = true;
  if (o.field.codeGroupCode) o.needs.codeGroups = true;
  return `resolveFieldOptions(${o.names.fieldById}[${jsStringLiteral(o.field.id)}] as unknown as SearchFieldConfig, ${o.field.codeGroupCode ? "groups" : "[]"})`;
};

export const fieldValueExpr = (o: FormFieldEmitOptions): string =>
  `(${o.names.values}[${jsStringLiteral(o.field.id)}] ?? '')`;

const changeCall = (o: FormFieldEmitOptions, valueExpr: string): string =>
  `${o.names.change}(${jsStringLiteral(o.field.id)}, ${valueExpr})`;

const dateRangeValueExpr = (o: FormFieldEmitOptions, suffix: "_from" | "_to"): string =>
  `(${o.names.values}[${jsStringLiteral(o.field.id + suffix)}] ?? '')`;

const dateRangeChangeCall = (o: FormFieldEmitOptions, suffix: "_from" | "_to", valueExpr: string): string =>
  `${o.names.change}(${jsStringLiteral(o.field.id + suffix)}, ${valueExpr})`;

const emitCodeLabelInput = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  o.needs.codeGroups = true;
  o.needs.resolveCodeLabel = true;
  const readonlySuffix = field.readonly ? readonlyFieldCls : "";
  const displayAsArg = field.displayAs ? jsStringLiteral(field.displayAs) : "undefined";
  return [
    `${ind(level)}<input type="text" disabled={${o.disabledExpr}} readOnly className=${jsStringLiteral(`${inputCls}${readonlySuffix}`)} value={resolveCodeLabel(${fieldValueExpr(o)}, ${jsStringLiteral(field.codeGroupCode ?? "")}, ${displayAsArg}, groups, t, true)} />`,
  ];
};

const emitInput = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  if (field.codeGroupCode) {
    return [
      `${ind(level)}{groups.length > 0 ? (`,
      ...emitCodeLabelInput({ ...o, level: level + 1 }),
      `${ind(level)}) : (`,
      ...emitPlainInput({ ...o, level: level + 1 }),
      `${ind(level)})}`,
    ];
  }
  return emitPlainInput(o);
};

const emitPlainInput = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const isReadOnly = !!field.readonly;
  const readonlySuffix = isReadOnly ? readonlyFieldCls : "";
  const hasCharCount = !!(field.showCharCount && field.maxLength);
  const value = fieldValueExpr(o);
  const cls = `${inputCls}${readonlySuffix}${hasCharCount ? ` ${fieldCharCountPadCls}` : ""}`;
  const attrs = [
    `type="text"`,
    `disabled={${o.disabledExpr}}`,
    ...(isReadOnly ? ["readOnly"] : []),
    `placeholder={${inputPlaceholderExpr(field)}}`,
    ...(hasCharCount ? [`maxLength={${field.maxLength}}`] : []),
    `className=${jsStringLiteral(cls)}`,
    `value={${value}}`,
    ...(isReadOnly
      ? []
      : [
          `onChange={(e) => ${changeCall(o, "e.target.value")}}`,
          `onBlur={() => ${o.names.blur}(${jsStringLiteral(field.id)})}`,
        ]),
  ];
  const inputLine = `<input ${attrs.join(" ")} />`;
  if (!hasCharCount) return [`${ind(level)}${inputLine}`];
  return [
    `${ind(level)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`,
    `${ind(level + 1)}${inputLine}`,
    `${ind(level + 1)}<span className=${jsStringLiteral(fieldCharCountCls)}>{${value}.length}/{${field.maxLength}}</span>`,
    `${ind(level)}</div>`,
  ];
};

const emitText = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field, names } = o;
  o.needs.fetchRel = true;
  const rowExpr = names.rowData;
  const fetchKeyLiteral = jsStringLiteral(field.fieldKey ?? "");
  const relationIdExpr = field.relationSlugId === undefined ? "undefined" : String(field.relationSlugId);
  const dataExpr = field.data ? jsStringLiteral(field.data) : "undefined";
  const displayMode = field.fetchDisplayMode === "MULTI_LINE" ? "MULTI_LINE" : "ONE_LINE";
  const lines: string[] = [];
  const L = (n: number, s: string) => lines.push(`${ind(level + n)}${s}`);

  L(0, "{(() => {");
  L(1, `const fetched = ${rowExpr}[${fetchKeyLiteral}];`);
  L(1, `if (Array.isArray(fetched)) {`);
  L(
    2,
    `const formatted = formatFetchedRelValue(fetched, ${rowExpr}, ${relationIdExpr}, ${dataExpr}, '${displayMode}');`
  );
  L(
    2,
    `return <div className=${jsStringLiteral(fieldTextValueClass(displayMode === "MULTI_LINE"))}>{formatted || '-'}</div>;`
  );
  L(1, `}`);
  if (field.data) {
    o.needs.fetchRelDataExpr = true;
    L(1, `const displayVal = resolveEvalExprI18n(evalColumnDataExpr(${dataExpr}, ${rowExpr}), t);`);
  } else {
    L(1, `const displayVal = String(fetched ?? ${fieldValueExpr(o)} ?? '');`);
  }
  L(1, `return <div className=${jsStringLiteral(fieldTextValueClass(false))}>{displayVal}</div>;`);
  L(0, `})()}`);
  return lines;
};

const emitSlugSelect = (o: FormFieldEmitOptions, selectAllPlaceholder: string, selectAllMsgKey: string): string[] => {
  const { ind, level, field } = o;
  o.needs.slugOptionSelect = true;
  o.needs.fetchRel = true;
  const isReadOnly = !!field.readonly;
  const readonlySuffix = isReadOnly ? readonlyFieldCls : "";
  const disabledExpr = isReadOnly ? "true" : o.disabledExpr;
  return [
    `${ind(level)}<SlugOptionSelect field={${JSON.stringify(slugOptionFieldLiteral(field))}} value={${fieldValueExpr(o)}} onChange={(v) => ${changeCall(o, "v")}} disabled={${disabledExpr}} placeholder={${selectPlaceholderExpr(field, selectAllPlaceholder, selectAllMsgKey)}} className=${jsStringLiteral(`${selectCls}${readonlySuffix}`)} rowData={${o.names.rowData}} />`,
  ];
};

const emitSelect = (o: FormFieldEmitOptions, selectAllPlaceholder: string, selectAllMsgKey: string): string[] => {
  const { field } = o;
  if (field.optionSlug && field.selectType !== "autocomplete") {
    return emitSlugSelect(o, selectAllPlaceholder, selectAllMsgKey);
  }
  const { ind, level } = o;
  const isReadOnly = !!field.readonly;
  const readonlySuffix = isReadOnly ? readonlyFieldCls : "";
  const disabledExpr = isReadOnly ? "true" : o.disabledExpr;
  const optionsExpr = optionsSourceExpr(o);
  return [
    `${ind(level)}<div className=${jsStringLiteral(fieldRelativeWrapCls)}>`,
    `${ind(level + 1)}<select disabled={${disabledExpr}} className=${jsStringLiteral(`${selectCls}${readonlySuffix}`)} value={${fieldValueExpr(o)}}${isReadOnly ? "" : ` onChange={(e) => ${changeCall(o, "e.target.value")}}`}>`,
    `${ind(level + 2)}<option value="">{${selectPlaceholderExpr(field, selectAllPlaceholder, selectAllMsgKey)}}</option>`,
    `${ind(level + 2)}{${optionsExpr}.map((opt) => {`,
    `${ind(level + 3)}const parsed = parseOpt(opt);`,
    `${ind(level + 3)}return <option key={opt} value={parsed.value}>{t(parsed.text)}</option>;`,
    `${ind(level + 2)}})}`,
    `${ind(level + 1)}</select>`,
    emitSelectArrow(ind, level + 1),
    `${ind(level)}</div>`,
  ];
};

const emitDate = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const subType = field.type === "yearMonth" ? "yearMonth" : (field.dateSubType ?? "date");
  const isReadOnly = !!field.readonly;
  const readonlySuffix = isReadOnly ? readonlyFieldCls : "";
  const attrs = [
    `type="${dateInputType(subType)}"`,
    ...(subType === "timeSec" ? ["step={1}"] : []),
    `disabled={${o.disabledExpr}}`,
    ...(isReadOnly ? ["readOnly"] : []),
    `className=${jsStringLiteral(`${inputCls}${readonlySuffix}`)}`,
    `value={${fieldValueExpr(o)}}`,
  ];
  if (field.disablePast) {
    o.needs.dateDefault = true;
    const defaultExpr = field.defaultToday
      ? `formatNowBySubType('${subType}')`
      : field.defaultDateOffset !== undefined && field.defaultDateOffset !== 0
        ? `calcDateOffset(${field.defaultDateOffset}, '${subType}')`
        : jsStringLiteral(field.defaultDate ?? "");
    attrs.push(`min={${defaultExpr} || formatNowBySubType('${subType}')}`);
  }
  if (!isReadOnly) {
    attrs.push(`onChange={(e) => ${changeCall(o, "e.target.value")}}`);
    attrs.push(`onClick={(e) => e.currentTarget.showPicker?.()}`);
  }
  return [`${ind(level)}<input ${attrs.join(" ")} />`];
};

const emitDateRangeSide = (o: FormFieldEmitOptions, suffix: "_from" | "_to", inputType: string): string[] => {
  const { ind, level } = o;
  const field = o.field;
  const subType = field.rangeSubType ?? "date";
  const isReadOnly = !!field.readonly;
  const cls = `${inputCls} ${fieldDateRangeInputPadCls}${isReadOnly ? readonlyFieldCls : ""}`;
  const attrs = [
    `type="${inputType}"`,
    ...(subType === "timeSec" ? ["step={1}"] : []),
    `disabled={${o.disabledExpr}}`,
    ...(isReadOnly ? ["readOnly"] : []),
    `className=${jsStringLiteral(cls)}`,
    `value={${dateRangeValueExpr(o, suffix)}}`,
    ...(isReadOnly
      ? []
      : [
          `onChange={(e) => ${dateRangeChangeCall(o, suffix, "e.target.value")}}`,
          `onClick={(e) => e.currentTarget.showPicker?.()}`,
        ]),
  ];
  return [
    `${ind(level)}<div className=${jsStringLiteral(SEARCH_DATE_RANGE_INPUT_WRAP_CLS)}>`,
    `${ind(level + 1)}<Calendar className=${jsStringLiteral(SEARCH_DATE_ICON_CLS)} />`,
    `${ind(level + 1)}<input ${attrs.join(" ")} />`,
    `${ind(level)}</div>`,
  ];
};

const emitDateRange = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  o.needs.icons.add("Calendar");
  const inputType = dateInputType(field.rangeSubType ?? "date");
  return [
    `${ind(level)}<div className=${jsStringLiteral(SEARCH_DATE_RANGE_WRAP_CLS)}>`,
    ...emitDateRangeSide({ ...o, level: level + 1 }, "_from", inputType),
    `${ind(level + 1)}<span className=${jsStringLiteral(SEARCH_DATE_RANGE_SEP_CLS)}>~</span>`,
    ...emitDateRangeSide({ ...o, level: level + 1 }, "_to", inputType),
    `${ind(level)}</div>`,
  ];
};

const emitRadio = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const isReadOnly = !!field.readonly;
  const disabledExpr = isReadOnly ? "true" : o.disabledExpr;
  o.needs.useId = true;
  const optionsExpr = optionsSourceExpr(o);
  return [
    `${ind(level)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`,
    `${ind(level + 1)}{${optionsExpr}.map((opt) => {`,
    `${ind(level + 2)}const parsed = parseOpt(opt);`,
    `${ind(level + 2)}return (`,
    `${ind(level + 3)}<label key={opt} className=${jsStringLiteral(fieldOptionItemClass(isReadOnly))}>`,
    `${ind(level + 4)}<input type="radio" name={\`\${uid}-field-${field.id}\`} disabled={${disabledExpr}} value={parsed.value} checked={${fieldValueExpr(o)} === parsed.value}${isReadOnly ? "" : ` onChange={() => ${changeCall(o, "parsed.value")}}`} className=${jsStringLiteral(fieldRadioInputCls)} />`,
    `${ind(level + 4)}<span className=${jsStringLiteral(fieldOptionTextCls)}>{t(parsed.text)}</span>`,
    `${ind(level + 3)}</label>`,
    `${ind(level + 2)});`,
    `${ind(level + 1)}})}`,
    `${ind(level)}</div>`,
  ];
};

const emitCheckbox = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const isReadOnly = !!field.readonly;
  const disabledExpr = isReadOnly ? "true" : o.disabledExpr;
  const optionsExpr = optionsSourceExpr(o);
  const nextExpr = `(isChecked ? selected.filter((v) => v !== parsed.value) : [...selected, parsed.value]).join(',')`;
  return [
    `${ind(level)}<div className=${jsStringLiteral(fieldOptionGroupCls)}>`,
    `${ind(level + 1)}{${optionsExpr}.map((opt) => {`,
    `${ind(level + 2)}const parsed = parseOpt(opt);`,
    `${ind(level + 2)}const selected = ${fieldValueExpr(o)}.split(',').filter(Boolean);`,
    `${ind(level + 2)}const isChecked = selected.includes(parsed.value);`,
    `${ind(level + 2)}return (`,
    `${ind(level + 3)}<label key={opt} className=${jsStringLiteral(fieldOptionItemClass(isReadOnly))}>`,
    `${ind(level + 4)}<input type="checkbox" disabled={${disabledExpr}} value={parsed.value} checked={isChecked}${isReadOnly ? "" : ` onChange={() => ${changeCall(o, nextExpr)}}`} className=${jsStringLiteral(fieldCheckboxInputCls)} />`,
    `${ind(level + 4)}<span className=${jsStringLiteral(fieldOptionTextCls)}>{t(parsed.text)}</span>`,
    `${ind(level + 3)}</label>`,
    `${ind(level + 2)});`,
    `${ind(level + 1)}})}`,
    `${ind(level)}</div>`,
  ];
};

const emitTextarea = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const isReadOnly = !!field.readonly;
  const readonlySuffix = isReadOnly ? readonlyFieldCls : "";
  const value = fieldValueExpr(o);
  const placeholderExpr = isReadOnly ? `""` : textareaPlaceholderExpr(field);
  const hasCharCount = !!(field.showCharCount && field.maxLength);
  const cls = hasCharCount
    ? `${inputCls} ${textareaFlexCls}${readonlySuffix}`
    : `${inputCls} ${textareaFullCls}${readonlySuffix}`;
  const attrs = [
    `disabled={${o.disabledExpr}}`,
    ...(isReadOnly ? ["readOnly"] : []),
    `className=${jsStringLiteral(cls)}`,
    `value={${value}}`,
    ...(hasCharCount ? [`maxLength={${field.maxLength}}`] : []),
    `placeholder={${placeholderExpr}}`,
    ...(isReadOnly ? [] : [`onChange={(e) => ${changeCall(o, "e.target.value")}}`]),
  ];
  const textareaLine = `<textarea ${attrs.join(" ")} />`;
  if (!hasCharCount) return [`${ind(level)}${textareaLine}`];
  return [
    `${ind(level)}<div className=${jsStringLiteral(textareaCharCountWrapCls)}>`,
    `${ind(level + 1)}${textareaLine}`,
    `${ind(level + 1)}<div className=${jsStringLiteral(textareaCharCountCls)}>{${value}.length}/{${field.maxLength}}</div>`,
    `${ind(level)}</div>`,
  ];
};

const emitEditor = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field } = o;
  const rowSpan = field.rowSpan ?? 3;
  const height = fieldContentHeight(field as unknown as SearchFieldConfig, rowSpan, undefined, FORM_FIELD_ROW_HEIGHT);
  const editorType = (field as unknown as { editorType?: string }).editorType ?? "tiptap";
  const component = editorType === "toast" ? "WysiwygEditor" : "TiptapEditor";
  if (editorType === "toast") o.needs.wysiwyg = true;
  else o.needs.tiptap = true;
  return [
    `${ind(level)}<${component} initialValue={${fieldValueExpr(o)}} onChange={(v: string) => ${changeCall(o, "v")}} height="${height}px" />`,
  ];
};

const emitImage = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field, names } = o;
  o.needs.image = true;
  o.needs.icons.add("Image as ImageIcon");
  o.needs.icons.add("Plus");
  o.needs.icons.add("X");

  const rowSpan = field.rowSpan ?? 2;
  const containerH = fieldContentHeight(
    field as unknown as SearchFieldConfig,
    rowSpan,
    undefined,
    FORM_FIELD_ROW_HEIGHT
  );
  const isReadOnly = !!field.readonly;
  const maxCount = field.maxFileCount ?? 1;
  const id = jsStringLiteral(field.id);
  const sizeUnit = field.maxFileSizeUnit ?? "MB";
  const maxSizeValue = field.maxFileSizeMB;
  const hasPixelLimit = !!(field.imageMaxWidthPx || field.imageMaxHeightPx);
  if (hasPixelLimit) o.needs.imagePixelCheck = true;

  const filesExpr = `(${names.files}[${id}] ?? [])`;
  const metaExpr = `(${names.existingMeta}[${id}] ?? [])`;
  const lines: string[] = [];
  const L = (n: number, s: string) => lines.push(`${ind(level + n)}${s}`);

  L(0, "{(() => {");
  L(1, `const maxCount = ${maxCount};`);
  L(1, `const existingList = ${metaExpr};`);
  L(1, `const newList = ${filesExpr};`);
  L(1, `const currentCount = existingList.length + newList.length;`);
  L(1, `const canAdd = ${isReadOnly ? "false" : "currentCount < maxCount"};`);
  L(1, `const handleImgSelect = async (selected: File[]) => {`);
  L(2, `const { valid, rejected } = filterByAccept(selected, ${jsStringLiteral(FILE_TYPE_PRESETS.image)});`);
  L(2, "if (rejected.length > 0) alert(`${t('common.field.invalid_file_type')}\\n${rejected.join('\\n')}`);");
  L(2, `if (valid.length === 0) return;`);
  L(2, `const passed: File[] = [];`);
  L(2, `for (const file of valid) {`);
  if (maxSizeValue) {
    L(3, `if (file.size > ${maxSizeValue} * unitToBytes('${sizeUnit}')) {`);
    L(
      4,
      `toast.warning(t('common.field.file_size_limit', { type: t('common.label.image'), mb: ${jsStringLiteral(`${maxSizeValue}${sizeUnit}`)} }));`
    );
    L(4, `continue;`);
    L(3, `}`);
  }
  if (hasPixelLimit) {
    L(3, `const naturalSize = await getImageNaturalSize(file);`);
    L(
      3,
      `const violation = checkImagePixelLimit(naturalSize, ${field.imageMaxWidthPx ?? "undefined"}, ${field.imageMaxHeightPx ?? "undefined"});`
    );
    if (field.imageMaxWidthPx) {
      L(3, `if (violation === 'width') {`);
      L(
        4,
        `toast.warning(t('common.field.image_width_limit', { label: file.name, px: ${jsStringLiteral(String(field.imageMaxWidthPx))} }));`
      );
      L(4, `continue;`);
      L(3, `}`);
    }
    if (field.imageMaxHeightPx) {
      L(3, `if (violation === 'height') {`);
      L(
        4,
        `toast.warning(t('common.field.image_height_limit', { label: file.name, px: ${jsStringLiteral(String(field.imageMaxHeightPx))} }));`
      );
      L(4, `continue;`);
      L(3, `}`);
    }
  }
  L(3, `passed.push(file);`);
  L(2, `}`);
  L(2, `if (passed.length > 0) ${names.fileChange}(${id}, [...newList, ...passed].slice(0, maxCount));`);
  L(1, `};`);
  L(1, `const imgPlaceholder = (`);
  L(2, `<>`);
  L(3, `<ImageIcon className=${jsStringLiteral(imagePlaceholderIconCls)} />`);
  L(3, `<span className=${jsStringLiteral(imagePlaceholderTitleCls)}>{t('common.field.image_add')}</span>`);
  L(
    3,
    `<span className=${jsStringLiteral(imagePlaceholderInfoCls)}>{t('common.field.image_format_info', { count: String(maxCount) })}</span>`
  );
  L(2, `</>`);
  L(1, `);`);
  L(
    1,
    `const displayItems: ({ kind: 'existing'; meta: { id: number; origName: string; fileSize: number } } | { kind: 'new'; file: File; idx: number } | { kind: 'add' })[] = [`
  );
  L(2, `...existingList.map((m) => ({ kind: 'existing' as const, meta: m })),`);
  L(2, `...newList.map((f, i) => ({ kind: 'new' as const, file: f, idx: i })),`);
  L(2, `...(canAdd ? [{ kind: 'add' as const }] : []),`);
  L(1, `];`);
  L(1, `const cols = Math.max(1, Math.ceil(Math.sqrt(displayItems.length)));`);
  L(1, `const rows = Math.max(1, Math.ceil(displayItems.length / cols));`);
  L(1, `const cellH = Math.floor((${containerH} - 8 - 4 * (rows - 1)) / rows);`);
  L(1, `return (`);
  L(
    2,
    `<div style={{ height: '${containerH}px' }} className=${jsStringLiteral(imageDropZoneClass(isReadOnly))} onDragOver={canAdd ? (e) => e.preventDefault() : undefined} onDrop={canAdd ? (e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleImgSelect(files); } : undefined}>`
  );
  L(3, `{currentCount === 0 ? (`);
  L(4, `canAdd ? (`);
  L(
    5,
    `<FileInput accept=${jsStringLiteral(FILE_TYPE_PRESETS.image)} multiple={maxCount > 1} onChange={handleImgSelect} renderTrigger={(inputRef) => (`
  );
  L(
    6,
    `<div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()} className=${jsStringLiteral(imagePlaceholderCls)}>{imgPlaceholder}</div>`
  );
  L(5, `)} />`);
  L(4, `) : (`);
  L(5, `<div className=${jsStringLiteral(imagePlaceholderStaticCls)}>{imgPlaceholder}</div>`);
  L(4, `)`);
  L(3, `) : (`);
  L(4, `<div className=${jsStringLiteral(imageGridWrapCls)} style={{ height: '${containerH}px' }}>`);
  L(
    5,
    `<div className=${jsStringLiteral(imageGridCls)} style={{ gridTemplateColumns: \`repeat(\${cols}, 1fr)\`, gridAutoRows: \`\${cellH}px\` }}>`
  );
  L(6, `{displayItems.map((item, i) => {`);
  L(7, `if (item.kind === 'existing') {`);
  L(8, `return (`);
  L(9, `<div key={item.meta.id} className=${jsStringLiteral(imageCellExistingCls)}>`);
  L(10, `<div className=${jsStringLiteral(imageCellBodyCls)}>`);
  L(11, `{${names.imgBlobUrls}[item.meta.id] ? (`);
  L(
    12,
    `<img src={${names.imgBlobUrls}[item.meta.id]} alt={item.meta.origName} className=${jsStringLiteral(imagePreviewImgCls)} />`
  );
  L(11, `) : (`);
  L(12, `<div className=${jsStringLiteral(imageFallbackBoxCls)}>`);
  L(13, `<ImageIcon className=${jsStringLiteral(imageFallbackIconCls)} />`);
  L(12, `</div>`);
  L(11, `)}`);
  if (!isReadOnly) {
    L(
      11,
      `<button type="button" onClick={() => ${names.removeExisting}(${id}, item.meta.id)} className=${jsStringLiteral(imageRemoveBtnCls)}>`
    );
    L(12, `<X className=${jsStringLiteral(imageRemoveIconCls)} />`);
    L(11, `</button>`);
  }
  L(10, `</div>`);
  L(
    10,
    `<FileInfoBar name={item.meta.origName} size={item.meta.fileSize} onDownload={() => downloadStoredFile(item.meta.id, item.meta.origName, t('common.error.file_download'))} />`
  );
  L(9, `</div>`);
  L(8, `);`);
  L(7, `}`);
  L(7, `if (item.kind === 'new') {`);
  L(8, `return (`);
  L(9, `<div key={\`new-\${item.idx}\`} className=${jsStringLiteral(imageCellNewCls)}>`);
  L(10, `<div className=${jsStringLiteral(imageCellBodyCls)}>`);
  L(11, `<FileImagePreview file={item.file} className=${jsStringLiteral(imagePreviewImgCls)} />`);
  if (!isReadOnly) {
    L(
      11,
      `<button type="button" onClick={() => ${names.fileChange}(${id}, newList.filter((_, fi) => fi !== item.idx))} className=${jsStringLiteral(imageRemoveBtnCls)}>`
    );
    L(12, `<X className=${jsStringLiteral(imageRemoveIconCls)} />`);
    L(11, `</button>`);
  }
  L(10, `</div>`);
  L(10, `<FileInfoBar name={item.file.name} size={item.file.size} onDownload={() => downloadLocalFile(item.file)} />`);
  L(9, `</div>`);
  L(8, `);`);
  L(7, `}`);
  L(7, `return (`);
  L(
    8,
    `<FileInput key={\`add-\${i}\`} accept=${jsStringLiteral(FILE_TYPE_PRESETS.image)} multiple={maxCount > 1} onChange={handleImgSelect} renderTrigger={(inputRef) => (`
  );
  L(
    9,
    `<div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()} className=${jsStringLiteral(imageAddCellCls)}>`
  );
  L(10, `<Plus className=${jsStringLiteral(imageAddIconCls)} />`);
  L(10, `<span className=${jsStringLiteral(imageAddTextCls)}>{t('common.btn.add')}</span>`);
  L(9, `</div>`);
  L(8, `)} />`);
  L(7, `);`);
  L(6, `})}`);
  L(5, `</div>`);
  L(4, `</div>`);
  L(3, `)}`);
  L(2, `</div>`);
  L(1, `);`);
  L(0, `})()}`);
  return lines;
};

const emitMedia = (o: FormFieldEmitOptions): string[] => {
  const { ind, level, field, names } = o;
  o.needs.image = true;
  o.needs.icons.add("Image as ImageIcon");
  o.needs.icons.add("Film");
  o.needs.icons.add("X");

  const rowSpan = field.rowSpan ?? 2;
  const containerH = fieldContentHeight(
    field as unknown as SearchFieldConfig,
    rowSpan,
    undefined,
    FORM_FIELD_ROW_HEIGHT
  );
  const isReadOnly = !!field.readonly;
  const id = jsStringLiteral(field.id);
  const imgMaxMB = field.mediaImageMaxSizeMB ?? 5;
  const vidMaxMB = field.mediaVideoMaxSizeMB ?? 20;
  const imgSizeUnit = field.mediaImageMaxSizeUnit ?? "MB";
  const hasPixelLimit = !!(field.imageMaxWidthPx || field.imageMaxHeightPx);
  if (hasPixelLimit) o.needs.imagePixelCheck = true;

  const mediaAccept = `${FILE_TYPE_PRESETS.image},${FILE_TYPE_PRESETS.video}`;

  const filesExpr = `(${names.files}[${id}] ?? [])`;
  const metaExpr = `(${names.existingMeta}[${id}] ?? [])`;
  const lines: string[] = [];
  const L = (n: number, s: string) => lines.push(`${ind(level + n)}${s}`);

  L(0, "{(() => {");
  L(1, `const imgExts = ${jsStringLiteral(FILE_TYPE_PRESETS.image)}.split(',');`);
  L(
    1,
    `const isImageFile = (name: string) => { const ext = '.' + (name.split('.').pop() ?? '').toLowerCase(); return imgExts.includes(ext); };`
  );
  L(1, `const existingList = ${metaExpr};`);
  L(1, `const newList = ${filesExpr};`);
  L(1, `const existingMedia = existingList[0] ?? null;`);
  L(1, `const hasFile = newList.length > 0 || !!existingMedia;`);
  L(1, `const canAdd = ${isReadOnly ? "false" : "!hasFile"};`);
  L(1, `const mediaPlaceholder = (`);
  L(2, `<div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">`);
  L(3, `<span className="text-xs font-medium">{t('common.field.media_upload')}</span>`);
  L(3, `<div className="text-[10px] text-center leading-relaxed">`);
  L(
    4,
    `<p>{t('common.field.media_image_info', { label: ${jsStringLiteral(FILE_TYPE_LABELS.image)}, size: ${jsStringLiteral(`${imgMaxMB}${imgSizeUnit}`)} })}</p>`
  );
  L(
    4,
    `<p>{t('common.field.media_video_info', { label: ${jsStringLiteral(FILE_TYPE_LABELS.video)}, mb: ${jsStringLiteral(String(vidMaxMB))} })}</p>`
  );
  L(3, `</div>`);
  L(2, `</div>`);
  L(1, `);`);
  L(1, `const handleMediaSelect = async (selected: File[]) => {`);
  L(2, `const { valid, rejected } = filterByAccept(selected, ${jsStringLiteral(mediaAccept)});`);
  L(2, "if (rejected.length > 0) alert(`${t('common.field.invalid_file_type')}\\n${rejected.join('\\n')}`);");
  L(2, `if (valid.length === 0) return;`);
  L(2, `const file = valid[0];`);
  L(2, `const isImg = isImageFile(file.name);`);
  L(2, `const maxMB = isImg ? ${imgMaxMB} : ${vidMaxMB};`);
  L(2, `const unit = isImg ? ${jsStringLiteral(imgSizeUnit)} : 'MB';`);
  L(2, `if (file.size > maxMB * unitToBytes(unit)) {`);
  L(
    3,
    `toast.warning(t('common.field.file_size_limit', { type: isImg ? t('common.label.image') : t('common.label.video'), mb: \`\${maxMB}\${unit}\` }));`
  );
  L(3, `return;`);
  L(2, `}`);
  if (hasPixelLimit) {
    L(2, `if (isImg) {`);
    L(3, `const naturalSize = await getImageNaturalSize(file);`);
    L(
      3,
      `const violation = checkImagePixelLimit(naturalSize, ${field.imageMaxWidthPx ?? "undefined"}, ${field.imageMaxHeightPx ?? "undefined"});`
    );
    if (field.imageMaxWidthPx) {
      L(
        3,
        `if (violation === 'width') { toast.warning(t('common.field.image_width_limit', { label: file.name, px: ${jsStringLiteral(String(field.imageMaxWidthPx))} })); return; }`
      );
    }
    if (field.imageMaxHeightPx) {
      L(
        3,
        `if (violation === 'height') { toast.warning(t('common.field.image_height_limit', { label: file.name, px: ${jsStringLiteral(String(field.imageMaxHeightPx))} })); return; }`
      );
    }
    L(2, `}`);
  }
  L(2, `${names.fileChange}(${id}, [file]);`);
  L(1, `};`);
  L(1, `return (`);
  L(
    2,
    `<div style={{ height: '${containerH}px', isolation: 'isolate' }} className=${jsStringLiteral(`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? " opacity-75" : ""}`)} onDragOver={canAdd ? (e) => e.preventDefault() : undefined} onDrop={canAdd ? (e) => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleMediaSelect(files); } : undefined}>`
  );
  L(3, `{!hasFile ? (`);
  L(4, `canAdd ? (`);
  L(
    5,
    `<FileInput accept=${jsStringLiteral(mediaAccept)} multiple={false} onChange={handleMediaSelect} renderTrigger={(inputRef) => (`
  );
  L(
    6,
    `<div role="button" tabIndex={0} onClick={() => inputRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()} className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all">{mediaPlaceholder}</div>`
  );
  L(5, `)} />`);
  L(4, `) : (`);
  L(
    5,
    `<div className="flex-1 flex flex-col items-center justify-center pointer-events-none">{mediaPlaceholder}</div>`
  );
  L(4, `)`);
  L(3, `) : existingMedia ? (`);
  L(4, `<>`);
  L(4, `<div className="flex-1 min-h-0 relative overflow-hidden">`);
  L(5, `{isImageFile(existingMedia.origName) ? (`);
  L(
    6,
    `${names.imgBlobUrls}[existingMedia.id] ? (<img src={${names.imgBlobUrls}[existingMedia.id]} alt={existingMedia.origName} className="w-full h-full object-contain" />) : (<div className="w-full h-full flex items-center justify-center bg-slate-50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>)`
  );
  L(5, `) : ${names.imgBlobUrls}[existingMedia.id] ? (`);
  L(
    6,
    `<video src={${names.imgBlobUrls}[existingMedia.id]} controls playsInline preload="auto" style={{ width: '100%', height: '100%', display: 'block' }} />`
  );
  L(5, `) : (`);
  L(
    6,
    `<div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500"><Film className="w-6 h-6 text-slate-300" /><span className="text-[10px] text-slate-400">{t('common.loading')}</span></div>`
  );
  L(5, `)}`);
  if (!isReadOnly) {
    L(
      5,
      `<button type="button" onClick={() => ${names.removeExisting}(${id}, existingMedia.id)} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"><X className="w-3 h-3 text-white" /></button>`
    );
  }
  L(4, `</div>`);
  L(
    4,
    `<FileInfoBar name={existingMedia.origName} size={existingMedia.fileSize} onDownload={() => downloadStoredFile(existingMedia.id, existingMedia.origName, t('common.error.file_download'))} />`
  );
  L(4, `</>`);
  L(3, `) : (`);
  L(4, `<>`);
  L(4, `<div className="flex-1 min-h-0 relative overflow-hidden">`);
  L(5, `{isImageFile(newList[0].name) ? (`);
  L(6, `<FileImagePreview file={newList[0]} className="w-full h-full object-contain" />`);
  L(5, `) : (`);
  L(6, `<FileVideoPreview file={newList[0]} cellHeight={${containerH} - 26} />`);
  L(5, `)}`);
  if (!isReadOnly) {
    L(
      5,
      `<button type="button" onClick={() => ${names.fileChange}(${id}, [])} className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"><X className="w-3 h-3 text-white" /></button>`
    );
  }
  L(4, `</div>`);
  L(
    4,
    `<FileInfoBar name={newList[0].name} size={newList[0].size} onDownload={() => downloadLocalFile(newList[0])} />`
  );
  L(4, `</>`);
  L(3, `)}`);
  L(2, `</div>`);
  L(1, `);`);
  L(0, `})()}`);
  return lines;
};

export const emitFileLocalComponents = (isEntity: boolean, includeVideoPreview = false): string[] => {
  const lines: string[] = [
    `function FileInput({ accept, multiple, onChange, renderTrigger }: { accept?: string; multiple?: boolean; onChange: (files: File[]) => void; renderTrigger: (inputRef: React.RefObject<HTMLInputElement | null>) => React.ReactNode }) {`,
    `    const inputRef = useRef<HTMLInputElement>(null);`,
    `    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {`,
    `        onChange(Array.from(e.target.files ?? []));`,
    `        e.target.value = '';`,
    `    };`,
    `    return (`,
    `        <>`,
    `            <input ref={inputRef} type="file" accept={accept} multiple={multiple} style={{ display: 'none' }} onChange={handleChange} />`,
    `            {renderTrigger(inputRef)}`,
    `        </>`,
    `    );`,
    `}`,
    ``,
    `function FileImagePreview({ file, className }: { file: File; className?: string }) {`,
    `    const [src, setSrc] = React.useState('');`,
    `    React.useEffect(() => {`,
    `        const url = URL.createObjectURL(file);`,
    `        setSrc(url);`,
    `        return () => URL.revokeObjectURL(url);`,
    `    }, [file]);`,
    `    return src ? <img src={src} alt={file.name} className={className} /> : null;`,
    `}`,
    ``,
    "const fmtFileSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`);",
    ``,
    `function FileInfoBar({ name, size, onDownload }: { name: string; size: number; onDownload: () => void }) {`,
    `    const { t } = useI18n();`,
    `    return (`,
    `        <div className=${jsStringLiteral(fileInfoBarCls)}>`,
    `            <button type="button" title={t('common.field.download_hint')} onClick={onDownload} className=${jsStringLiteral(fileInfoBarBtnCls)}>`,
    `                {name}`,
    `                <span className=${jsStringLiteral(fileInfoBarSizeCls)}>({fmtFileSize(size)})</span>`,
    `            </button>`,
    `        </div>`,
    `    );`,
    `}`,
    ``,
    `async function downloadStoredFile(fileId: number, origName: string, errorMessage: string) {`,
    `    try {`,
    `        const res = await api.get(${isEntity ? "`/file-meta/${fileId}/download`" : "`/page-files/${fileId}`"}, { responseType: 'blob' });`,
    `        const url = URL.createObjectURL(res.data);`,
    `        const a = document.createElement('a');`,
    `        a.href = url;`,
    `        a.download = origName;`,
    `        a.click();`,
    `        URL.revokeObjectURL(url);`,
    `    } catch {`,
    `        toast.error(errorMessage);`,
    `    }`,
    `}`,
    ``,
    `function downloadLocalFile(file: File) {`,
    `    const url = URL.createObjectURL(file);`,
    `    const a = document.createElement('a');`,
    `    a.href = url;`,
    `    a.download = file.name;`,
    `    a.click();`,
    `    URL.revokeObjectURL(url);`,
    `}`,
  ];
  if (includeVideoPreview) {
    lines.push(
      ``,
      `function FileVideoPreview({ file, cellHeight }: { file: File; cellHeight: number }) {`,
      `    const videoRef = useRef<HTMLVideoElement>(null);`,
      `    useEffect(() => {`,
      `        const el = videoRef.current;`,
      `        if (!el) return;`,
      `        const url = URL.createObjectURL(file);`,
      `        el.src = url;`,
      `        const handleLoadedData = () => { el.currentTime = 0.001; };`,
      `        el.addEventListener('loadeddata', handleLoadedData);`,
      `        return () => {`,
      `            el.removeEventListener('loadeddata', handleLoadedData);`,
      `            el.src = '';`,
      `            URL.revokeObjectURL(url);`,
      `        };`,
      `    }, [file]);`,
      `    return <video ref={videoRef} controls playsInline preload="auto" style={{ width: '100%', height: \`\${cellHeight}px\`, display: 'block' }} />;`,
      `}`
    );
  }
  return lines;
};

export const emitFormField = (
  o: FormFieldEmitOptions,
  selectAllPlaceholder: string,
  selectAllMsgKey: string
): string[] => {
  switch (o.field.type) {
    case "hidden":
      return [];
    case "input":
      return emitInput(o);
    case "text":
      return emitText(o);
    case "select":
      return emitSelect(o, selectAllPlaceholder, selectAllMsgKey);
    case "date":
      return emitDate(o);
    case "dateRange":
      return emitDateRange(o);
    case "radio":
      return emitRadio(o);
    case "checkbox":
      return emitCheckbox(o);
    case "textarea":
      return emitTextarea(o);
    case "editor":
      return emitEditor(o);
    case "image":
      return emitImage(o);
    case "media":
      return emitMedia(o);
    default:
      return [
        `${o.ind(o.level)}{/* TODO(파일빌드): '${o.field.fieldKey || o.field.id}' 필드 타입(${o.field.type})은 아직 코드 생성이 지원되지 않습니다. 직접 구현해주세요. */}`,
      ];
  }
};

export const textExprForLabel = textExprOf;
