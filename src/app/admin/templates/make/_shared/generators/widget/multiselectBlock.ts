import type { MultiSelectWidget, MultiSelectExtraField } from "../../components/renderer/types";
import type { ImportRequirement, WidgetCodeBlock, WidgetGenContext, UnhandledConfigKeys } from "../widgetGenerator";
import {
  jsStringLiteral,
  collectUnhandledKeys,
  emitContainerOpen,
  emitContainerClose,
  multiSelectVarNames,
  hasMultiSelectExtraFields,
} from "../widgetGenerator";
import { pushFieldMarkup } from "./shared/fieldMarkupEmitter";
import { multiSelectExtraFieldToConfig } from "../../utils";
import { fieldRequiredMarkCls, fieldOptionTextCls } from "../../styles";
import {
  MULTISELECT_BODY_CLS,
  MULTISELECT_TITLE_CLS,
  MULTISELECT_DESC_CLS,
  MULTISELECT_TOGGLE_WRAP_CLS,
  MULTISELECT_TOGGLE_BTN_CLS,
  MULTISELECT_PANEL_CLS,
  MULTISELECT_SEARCH_WRAP_CLS,
  MULTISELECT_SEARCH_BOX_CLS,
  MULTISELECT_SEARCH_ICON_CLS,
  MULTISELECT_SEARCH_INPUT_CLS,
  MULTISELECT_OPTION_LIST_CLS,
  MULTISELECT_EMPTY_CLS,
  MULTISELECT_CHECKBOX_CLS,
  MULTISELECT_TAG_SCROLL_WRAP_CLS,
  MULTISELECT_TAG_LIST_CLS,
  MULTISELECT_TAG_ROW_CLS,
  MULTISELECT_TAG_TEXT_CLS,
  MULTISELECT_TAG_REMOVE_BTN_CLS,
  MULTISELECT_TAG_REMOVE_ICON_CLS,
  MULTISELECT_EXTRA_FIELD_SEP_CLS,
  MULTISELECT_TAG_GROUP_SEP_CLS,
  multiSelectFieldWrapClass,
  multiSelectToggleTextClass,
  multiSelectChevronClass,
  multiSelectOptionItemClass,
  multiSelectExtraFieldWrapClass,
} from "../../components/renderer/rendererStyles";

const UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";
const MULTI_SELECT_SOURCE_MODULE = "@/app/admin/templates/make/_shared/utils/multiSelectSource";
const RENDERER_TYPES_MODULE = "@/app/admin/templates/make/_shared/components/renderer/types";

const HANDLED_WIDGET_KEYS = new Set([
  "type",
  "widgetId",
  "contentKey",
  "sourceSlug",
  "sourceFilter",
  "sourceMode",
  "connectedSlug",
  "labelFields",
  "placeholder",
  "placeholderMsgKey",
  "title",
  "titleMsgKey",
  "description",
  "descriptionMsgKey",
  "required",
  "showBorder",
  "bgColor",
  "fieldColSpan",
  "fieldAlign",
  "dedupeByText",
  "extraFields",
]);

const IGNORED_WIDGET_KEYS = new Map<string, string>();

const buildUnhandled = (widget: MultiSelectWidget): UnhandledConfigKeys[] => [
  {
    scope: "widget",
    keys: collectUnhandledKeys(
      widget as unknown as Record<string, unknown>,
      HANDLED_WIDGET_KEYS,
      new Set(IGNORED_WIDGET_KEYS.keys())
    ),
  },
];

const sanitizeWidgetForEmit = (widget: MultiSelectWidget): MultiSelectWidget => {
  const clone = { ...widget } as Record<string, unknown>;
  IGNORED_WIDGET_KEYS.forEach((_, key) => delete clone[key]);
  return clone as unknown as MultiSelectWidget;
};

const textExprOf = (text: string | undefined, msgKey: string | undefined): string =>
  msgKey ? `t(${jsStringLiteral(msgKey)})` : jsStringLiteral(text ?? "");

export const generateMultiSelectBlock = (widget: MultiSelectWidget, ctx: WidgetGenContext): WidgetCodeBlock => {
  const { ind, suffix, leaveCheckNames, allWidgets } = ctx;
  const names = multiSelectVarNames(suffix);
  const openVar = `multiSelectOpen${suffix}`;
  const setOpenVar = `setMultiSelectOpen${suffix}`;
  const searchVar = `multiSelectSearch${suffix}`;
  const setSearchVar = `setMultiSelectSearch${suffix}`;
  const optionsVar = `multiSelectOptions${suffix}`;
  const setOptionsVar = `setMultiSelectOptions${suffix}`;
  const buttonRefVar = `multiSelectButtonRef${suffix}`;
  const rowsVar = `multiSelectRows${suffix}`;
  const displayRowsVar = `multiSelectDisplayRows${suffix}`;
  const selectedEntriesVar = `multiSelectSelectedEntries${suffix}`;
  const toggleFn = `toggleMultiSelect${suffix}`;
  const removeFn = `removeMultiSelect${suffix}`;

  const sourceMode = widget.sourceMode ?? "call";
  const canMarkDirty = leaveCheckNames.includes("markDirty");

  const imports: ImportRequirement[] = [
    { module: RENDERER_TYPES_MODULE, named: ["MultiSelectWidget"], typeOnly: true },
    { module: MULTI_SELECT_SOURCE_MODULE, named: ["fetchMultiSelectSourceRows", "buildLabelPathEntries"] },
    { module: MULTI_SELECT_SOURCE_MODULE, named: ["MultiSelectOptionItem"], typeOnly: true },
    { module: UTILS_MODULE, named: ["flattenPageDataItem", "evalConditionExpr"] },
    { module: "@/hooks/use-i18n", named: ["useI18n"] },
    { module: "@/components/ui/portal-dropdown", named: ["PortalDropdown"] },
    { module: "lucide-react", named: ["ChevronDown", "X", "Search"] },
    { module: "react", named: ["useMemo", "useCallback", "useRef"] },
  ];

  const helperLines: string[] = [
    `const ${names.widget}: MultiSelectWidget = ${JSON.stringify(sanitizeWidgetForEmit(widget), null, 4)};`,
  ];

  const stateLines: string[] = [];
  stateLines.push(`${ind(1)}const { t } = useI18n();`);
  stateLines.push(`${ind(1)}const [${names.ids}, ${names.setIds}] = useState<number[]>([]);`);
  stateLines.push(`${ind(1)}const [${optionsVar}, ${setOptionsVar}] = useState<MultiSelectOptionItem[]>([]);`);
  stateLines.push(`${ind(1)}const [${searchVar}, ${setSearchVar}] = useState('');`);
  stateLines.push(`${ind(1)}const [${openVar}, ${setOpenVar}] = useState(false);`);
  stateLines.push(`${ind(1)}const ${buttonRefVar} = useRef<HTMLButtonElement>(null);`);
  const widgetHasExtraFields = hasMultiSelectExtraFields(widget);
  if (widgetHasExtraFields) {
    stateLines.push(
      `${ind(1)}const [${names.extraFieldValues}, ${names.setExtraFieldValues}] = useState<Record<number, Record<string, string>>>({});`
    );
  }

  const handlerLines: string[] = [];
  const unsupportedNotes: string[] = [];

  if (sourceMode !== "call") {
    unsupportedNotes.push(
      `sourceMode='${sourceMode}'는 빌더 훅(useSlugRelations) 의존이라 파일빌드에서 지원하지 않습니다. 옵션 목록이 비어 있게 됩니다.`
    );
  }
  if (!allWidgets.some((w) => w.type === "form")) {
    unsupportedNotes.push(
      `이 페이지에는 Form 위젯이 없어 수정 모드 선택값 복원(extractMultiSelectSelection) 코드가 방출되지 않습니다. 저장된 선택 항목이 화면에 복원되지 않으므로 직접 구현해주세요.`
    );
  }
  if (widget.contentRelation) {
    unsupportedNotes.push(
      `contentRelation(inner/outer)은 파일빌드에서 조회 파라미터로 방출하지 않습니다. 라벨 경로가 런타임과 달라질 수 있습니다.`
    );
  }
  if (widget.hideCondition) {
    unsupportedNotes.push(`hideCondition(위젯 단위 숨김)은 아직 코드 생성이 지원되지 않습니다. 항상 표시됩니다.`);
  }

  handlerLines.push(`${ind(1)}useEffect(() => {`);
  if (sourceMode !== "call" || !widget.sourceSlug) {
    handlerLines.push(
      `${ind(2)}/* TODO(파일빌드): 옵션 조회 대상 slug를 생성 시점에 확정할 수 없어 목록을 불러오지 않습니다. */`
    );
    handlerLines.push(`${ind(1)}}, []);`);
  } else {
    handlerLines.push(`${ind(2)}let cancelled = false;`);
    handlerLines.push(
      `${ind(2)}fetchMultiSelectSourceRows(${jsStringLiteral(widget.sourceSlug)}, undefined, undefined, undefined, undefined, ${widget.sourceFilter ? jsStringLiteral(widget.sourceFilter) : "undefined"})`
    );
    handlerLines.push(`${ind(3)}.then((rows) => {`);
    handlerLines.push(`${ind(4)}if (cancelled) return;`);
    handlerLines.push(
      `${ind(4)}const flatRows = rows.map((r) => flattenPageDataItem(r as Parameters<typeof flattenPageDataItem>[0]));`
    );
    if (widget.sourceFilter) {
      handlerLines.push(`${ind(4)}const filteredRows = flatRows.filter((row) =>`);
      handlerLines.push(
        `${ind(5)}evalConditionExpr(${jsStringLiteral(widget.sourceFilter)}, (key) => (key in row ? String(row[key] ?? '') : undefined))`
      );
      handlerLines.push(`${ind(4)});`);
    } else {
      handlerLines.push(`${ind(4)}const filteredRows = flatRows;`);
    }
    handlerLines.push(`${ind(4)}${setOptionsVar}(filteredRows.map((row) => ({ ...row, id: Number(row._id ?? 0) })));`);
    handlerLines.push(`${ind(3)}})`);
    handlerLines.push(
      `${ind(3)}.catch((err) => console.warn('[${suffix}] ' + ${jsStringLiteral(widget.sourceSlug)}, err));`
    );
    handlerLines.push(`${ind(2)}return () => { cancelled = true; };`);
    handlerLines.push(`${ind(1)}}, []);`);
  }
  handlerLines.push("");

  handlerLines.push(
    `${ind(1)}const ${rowsVar} = useMemo(() => ${optionsVar}.flatMap((opt) => buildLabelPathEntries(opt, ${names.widget}).map((entry, pathIdx) => ({ opt, entry, pathIdx }))), [${optionsVar}]);`
  );
  handlerLines.push(`${ind(1)}const ${displayRowsVar} = useMemo(() => {`);
  handlerLines.push(`${ind(2)}const q = ${searchVar}.toLowerCase();`);
  handlerLines.push(
    `${ind(2)}const searched = q ? ${rowsVar}.filter(({ entry }) => entry.path.toLowerCase().includes(q)) : ${rowsVar};`
  );
  if (widget.dedupeByText) {
    handlerLines.push(`${ind(2)}const seen = new Set<string>();`);
    handlerLines.push(`${ind(2)}return searched.filter(({ entry }) => {`);
    handlerLines.push(`${ind(3)}if (seen.has(entry.path)) return false;`);
    handlerLines.push(`${ind(3)}seen.add(entry.path);`);
    handlerLines.push(`${ind(3)}return true;`);
    handlerLines.push(`${ind(2)}});`);
  } else {
    handlerLines.push(`${ind(2)}return searched;`);
  }
  handlerLines.push(`${ind(1)}}, [${rowsVar}, ${searchVar}]);`);
  handlerLines.push(
    `${ind(1)}const ${selectedEntriesVar} = ${rowsVar}.filter(({ entry }) => ${names.ids}.includes(entry.selectionId));`
  );
  handlerLines.push("");
  handlerLines.push(`${ind(1)}const ${toggleFn} = useCallback((id: number) => {`);
  handlerLines.push(
    `${ind(2)}${names.setIds}((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));`
  );
  if (canMarkDirty) handlerLines.push(`${ind(2)}markDirty();`);
  handlerLines.push(`${ind(1)}}, [${canMarkDirty ? "markDirty" : ""}]);`);
  handlerLines.push(`${ind(1)}const ${removeFn} = useCallback((id: number) => {`);
  handlerLines.push(`${ind(2)}${names.setIds}((prev) => prev.filter((x) => x !== id));`);
  if (canMarkDirty) handlerLines.push(`${ind(2)}markDirty();`);
  handlerLines.push(`${ind(1)}}, [${canMarkDirty ? "markDirty" : ""}]);`);
  if (widgetHasExtraFields) {
    handlerLines.push(
      `${ind(1)}const ${names.updateExtraField} = useCallback((itemId: number) => (upd: (prev: Record<string, string>) => Record<string, string>) => {`
    );
    handlerLines.push(
      `${ind(2)}${names.setExtraFieldValues}((prev) => ({ ...prev, [itemId]: upd(prev[itemId] ?? {}) }));`
    );
    if (canMarkDirty) handlerLines.push(`${ind(2)}markDirty();`);
    handlerLines.push(`${ind(1)}}, [${canMarkDirty ? "markDirty" : ""}]);`);
  }
  handlerLines.push("");

  const fieldColSpan = widget.fieldColSpan;
  const fieldAlign = widget.fieldAlign ?? "left";
  const hasFieldWidth = typeof fieldColSpan === "number" && fieldColSpan >= 1 && fieldColSpan < 12;
  const fieldWidthStyleParts: string[] = [];
  if (hasFieldWidth) {
    fieldWidthStyleParts.push(`width: '${((fieldColSpan as number) / 12) * 100}%'`);
    if (fieldAlign === "center" || fieldAlign === "right") fieldWidthStyleParts.push(`marginLeft: 'auto'`);
    if (fieldAlign === "center") fieldWidthStyleParts.push(`marginRight: 'auto'`);
  }
  const fieldWidthStyleAttr = hasFieldWidth ? ` style={{ ${fieldWidthStyleParts.join(", ")} }}` : "";

  const placeholderExpr = widget.placeholderMsgKey
    ? `t(${jsStringLiteral(widget.placeholderMsgKey)})`
    : widget.placeholder
      ? jsStringLiteral(widget.placeholder)
      : `t('common.multiselect.placeholder')`;

  const jsxLines: string[] = [];
  unsupportedNotes.forEach((note) => jsxLines.push(`{/* TODO(파일빌드): ${note} */}`));
  jsxLines.push(
    emitContainerOpen({
      showBorder: widget.showBorder ?? true,
      bgColor: widget.bgColor && widget.bgColor !== "none" ? widget.bgColor : undefined,
    })
  );
  jsxLines.push(`${ind(1)}<div className=${jsStringLiteral(MULTISELECT_BODY_CLS)}>`);
  if (widget.titleMsgKey || widget.title) {
    const requiredMark = widget.required ? `<span className=${jsStringLiteral(fieldRequiredMarkCls)}>*</span>` : "";
    jsxLines.push(
      `${ind(2)}<p className=${jsStringLiteral(MULTISELECT_TITLE_CLS)}>{${textExprOf(widget.title, widget.titleMsgKey)}}${requiredMark}</p>`
    );
  }
  if (widget.descriptionMsgKey || widget.description) {
    jsxLines.push(
      `${ind(2)}<p className=${jsStringLiteral(MULTISELECT_DESC_CLS)}>{${textExprOf(widget.description, widget.descriptionMsgKey)}}</p>`
    );
  }
  jsxLines.push(
    `${ind(2)}<div className=${jsStringLiteral(multiSelectFieldWrapClass(hasFieldWidth))}${fieldWidthStyleAttr}>`
  );
  jsxLines.push(`${ind(3)}<div className=${jsStringLiteral(MULTISELECT_TOGGLE_WRAP_CLS)}>`);
  jsxLines.push(
    `${ind(4)}<button ref={${buttonRefVar}} type="button" onClick={() => ${setOpenVar}((prev) => !prev)} className=${jsStringLiteral(MULTISELECT_TOGGLE_BTN_CLS)}>`
  );
  jsxLines.push(
    `${ind(5)}<span className={${selectedEntriesVar}.length > 0 ? ${jsStringLiteral(multiSelectToggleTextClass(true))} : ${jsStringLiteral(multiSelectToggleTextClass(false))}}>`
  );
  jsxLines.push(
    `${ind(6)}{${selectedEntriesVar}.length > 0 ? t('common.multiselect.selected_count', { count: String(${selectedEntriesVar}.length) }) : ${placeholderExpr}}`
  );
  jsxLines.push(`${ind(5)}</span>`);
  jsxLines.push(
    `${ind(5)}<ChevronDown className={${openVar} ? ${jsStringLiteral(multiSelectChevronClass(true))} : ${jsStringLiteral(multiSelectChevronClass(false))}} />`
  );
  jsxLines.push(`${ind(4)}</button>`);
  jsxLines.push(
    `${ind(4)}<PortalDropdown open={${openVar}} anchorRef={${buttonRefVar}} onOutsideClick={() => ${setOpenVar}(false)} className=${jsStringLiteral(MULTISELECT_PANEL_CLS)}>`
  );
  jsxLines.push(`${ind(5)}<div className=${jsStringLiteral(MULTISELECT_SEARCH_WRAP_CLS)}>`);
  jsxLines.push(`${ind(6)}<div className=${jsStringLiteral(MULTISELECT_SEARCH_BOX_CLS)}>`);
  jsxLines.push(`${ind(7)}<Search className=${jsStringLiteral(MULTISELECT_SEARCH_ICON_CLS)} />`);
  jsxLines.push(
    `${ind(7)}<input type="text" value={${searchVar}} onChange={(e) => ${setSearchVar}(e.target.value)} placeholder={t('common.input.search_placeholder')} className=${jsStringLiteral(MULTISELECT_SEARCH_INPUT_CLS)} />`
  );
  jsxLines.push(`${ind(6)}</div>`);
  jsxLines.push(`${ind(5)}</div>`);
  jsxLines.push(`${ind(5)}<ul className=${jsStringLiteral(MULTISELECT_OPTION_LIST_CLS)}>`);
  jsxLines.push(`${ind(6)}{${displayRowsVar}.length === 0 ? (`);
  jsxLines.push(`${ind(7)}<li className=${jsStringLiteral(MULTISELECT_EMPTY_CLS)}>{t('common.table.no_data')}</li>`);
  jsxLines.push(`${ind(6)}) : (`);
  jsxLines.push(`${ind(7)}${displayRowsVar}.map(({ opt, entry, pathIdx }) => (`);
  jsxLines.push(`${ind(8)}<li key={\`\${opt.id}-\${pathIdx}\`}>`);
  jsxLines.push(`${ind(9)}<label className=${jsStringLiteral(multiSelectOptionItemClass(false))}>`);
  jsxLines.push(
    `${ind(10)}<input type="checkbox" checked={${names.ids}.includes(entry.selectionId)} onChange={() => ${toggleFn}(entry.selectionId)} className=${jsStringLiteral(MULTISELECT_CHECKBOX_CLS)} />`
  );
  jsxLines.push(`${ind(10)}<span className=${jsStringLiteral(fieldOptionTextCls)}>{entry.path}</span>`);
  jsxLines.push(`${ind(9)}</label>`);
  jsxLines.push(`${ind(8)}</li>`);
  jsxLines.push(`${ind(7)}))`);
  jsxLines.push(`${ind(6)})}`);
  jsxLines.push(`${ind(5)}</ul>`);
  jsxLines.push(`${ind(4)}</PortalDropdown>`);
  jsxLines.push(`${ind(3)}</div>`);
  jsxLines.push(`${ind(3)}{${selectedEntriesVar}.length > 0 && (`);
  jsxLines.push(`${ind(4)}<div className=${jsStringLiteral(MULTISELECT_TAG_SCROLL_WRAP_CLS)}>`);
  jsxLines.push(`${ind(5)}<div className=${jsStringLiteral(MULTISELECT_TAG_LIST_CLS)}>`);
  jsxLines.push(`${ind(6)}{${selectedEntriesVar}.map(({ opt, entry, pathIdx }) => (`);
  jsxLines.push(
    `${ind(7)}<div key={\`\${opt.id}-\${pathIdx}\`} className=${jsStringLiteral(MULTISELECT_TAG_ROW_CLS)}>`
  );

  const extraFields = widget.extraFields ?? [];
  const leftFields = extraFields.filter((ef) => ef.position === "left");
  const rightFields = extraFields.filter((ef) => ef.position !== "left");
  const pushExtraFieldGroup = (fields: MultiSelectExtraField[]): void => {
    fields.forEach((ef, idx) => {
      if (idx > 0) jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(MULTISELECT_EXTRA_FIELD_SEP_CLS)} />`);
      jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(multiSelectExtraFieldWrapClass(ef.type))}>`);
      pushFieldMarkup({
        jsxLines,
        ind,
        level: 9,
        field: multiSelectExtraFieldToConfig(ef),
        id: ef.key,
        paramsVar: `(${names.extraFieldValues}[opt.id] ?? {})`,
        setParamsVar: `${names.updateExtraField}(opt.id)`,
        slugRowDataVar: "undefined",
        radioNameExpr: `\`${suffix}-ef-\${opt.id}-\${pathIdx}-\` + ${jsStringLiteral(ef.key)}`,
      });
      jsxLines.push(`${ind(8)}</div>`);
    });
  };

  pushExtraFieldGroup(leftFields);
  if (leftFields.length > 0) {
    jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(MULTISELECT_TAG_GROUP_SEP_CLS)} />`);
  }
  jsxLines.push(`${ind(8)}<span className=${jsStringLiteral(MULTISELECT_TAG_TEXT_CLS)}>{entry.path}</span>`);
  if (rightFields.length > 0) {
    jsxLines.push(`${ind(8)}<div className=${jsStringLiteral(MULTISELECT_TAG_GROUP_SEP_CLS)} />`);
  }
  pushExtraFieldGroup(rightFields);

  jsxLines.push(
    `${ind(8)}<button type="button" onClick={() => ${removeFn}(entry.selectionId)} className=${jsStringLiteral(MULTISELECT_TAG_REMOVE_BTN_CLS)}>`
  );
  jsxLines.push(`${ind(9)}<X className=${jsStringLiteral(MULTISELECT_TAG_REMOVE_ICON_CLS)} />`);
  jsxLines.push(`${ind(8)}</button>`);
  jsxLines.push(`${ind(7)}</div>`);
  jsxLines.push(`${ind(6)}))}`);
  jsxLines.push(`${ind(5)}</div>`);
  jsxLines.push(`${ind(4)}</div>`);
  jsxLines.push(`${ind(3)})}`);
  jsxLines.push(`${ind(2)}</div>`);
  jsxLines.push(`${ind(1)}</div>`);
  jsxLines.push(emitContainerClose());

  return { imports, helperLines, stateLines, handlerLines, jsxLines, unhandled: buildUnhandled(widget) };
};
