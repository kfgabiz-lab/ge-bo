import type { AnyWidget, TabItem, TabWidget, MultiSelectWidget, CategoryWidget } from "../components/renderer/types";
import type { PageWidgetItem } from "../components/renderer/PageGridRenderer";
import type { OutputMode } from "../hooks/useOutputMode";
import type { LayerType, LayerWidth } from "../types";
import type { TableWidget } from "../components/builder/TableBuilder";
import { FILE_FIELD_TYPES } from "../constants";
import { generateSearchBlock } from "./widget/searchBlock";
import { generateTableBlock } from "./widget/tableBlock";
import { generateSpaceBlock } from "./widget/spaceBlock";
import { canEmitDataSave } from "./widget/space/dataSaveEmitter";
import { generateFormBlock } from "./widget/formBlock";
import { generateMultiSelectBlock } from "./widget/multiselectBlock";
import { generateSubListBlock } from "./widget/sublistBlock";
import { generateTabBlock } from "./widget/tabBlock";
import { generateCategoryBlock } from "./widget/categoryBlock";
import { normalizeFormItemRowSpans, packedRowLayout, resolveItemAutoHeightFlags } from "../utils/formGridLayout";
import { getSpaceGridColumn } from "../utils";
import {
  rendererContainerClassName,
  rendererContainerOverflow,
  SELECT_ARROW_CLS,
  GENERATED_UNSUPPORTED_WIDGET_CLS,
  CATEGORY_SEARCH_WRAP_CLS,
  CATEGORY_SEARCH_SELECT_CLS,
} from "../components/renderer/rendererStyles";

export type PageWidget = AnyWidget;
export type PageWidgetType = AnyWidget["type"];

export interface ImportRequirement {
  module: string;
  named?: string[];
  defaultName?: string;
  typeOnly?: boolean;
}

export interface UnhandledConfigKeys {
  scope: "widget" | "field" | "column";
  keys: string[];
}

export interface WidgetCodeBlock {
  imports: ImportRequirement[];
  helperLines: string[];
  stateLines: string[];
  handlerLines: string[];
  jsxLines: string[];
  unhandled?: UnhandledConfigKeys[];
  visibilityExpr?: string;
  emitsRecordLoaded?: boolean;
}

export interface NestedPageConfig {
  widgetItems: PageWidgetItem[];
  mainConnectedSlug?: string;
  connectedType?: string;
  outputMode?: OutputMode;
  layerType?: LayerType;
  layerWidth?: LayerWidth;
  layerTitle?: string;
  layerTitleMsgKey?: string;
}

export interface TabPanelPlan {
  tab: TabItem;
  items: PageWidgetItem[];
  autoHeightFlags: boolean[];
  missing: boolean;
  componentName?: string;
}

export interface ScopedComponentParts {
  imports: ImportRequirement[];
  helperLines: string[];
  stateLines: string[];
  handlerLines: string[];
  jsxLines: string[];
}

export interface CrossTabPropNames {
  formValues: string;
  onFormChange: string;
  generatedValues: string;
  onGeneratedChange: string;
}

export interface LayerPopupPlan {
  role: "create" | "edit" | "detail";
  slug: string;
  layerType: LayerType;
  layerWidth: LayerWidth;
  layerTitle?: string;
  layerTitleMsgKey?: string;
  grid: PreparedGrid;
  formContentKeys: string[];
  tableContentKeys: string[];
  formFieldMeta: { contentKey?: string; fieldKey: string }[];
  isEntity: boolean;
  formWidgets: { widgetId: string; connectedSlug?: string; contentKey?: string; hasFileField: boolean }[];
  sublistWidgets: { widgetId: string; contentKey?: string }[];
  multiselectWidgets: { widgetId: string; contentKey?: string; connectedSlug?: string; hasExtraFields: boolean }[];
}

export interface WidgetGenContext {
  suffix: string;
  ind: (n: number) => string;
  allWidgets: PageWidget[];
  scopeWidgets: PageWidget[];
  suffixOf: (widgetId: string) => string;
  mainConnectedSlug?: string;
  isEntity: boolean;
  outputMode: OutputMode;
  contentColSpan: number;
  contentFillHeight: boolean;
  pageSlug?: string;
  leaveCheck: boolean;
  leaveCheckNames: string[];
  mergeExistingBeforeSave: boolean;
  tabPanels?: TabPanelPlan[];
  blockOf?: (widget: PageWidget) => WidgetCodeBlock | undefined;
  tabSavedMarker?: string;
  insideTab: boolean;
  outputModeOf: (slug?: string) => OutputMode | undefined;
  tabSharedIdVars?: { map: string; setMap: string };
  crossTab?: CrossTabPropNames;
  insidePopup: boolean;
  popupCloseFn?: string;
  popupExtrasVar?: string;
  popupOnSavedFn?: string;
  layerPopupPlans?: LayerPopupPlan[];
}

export const GENERATED_PAGE_BASE_CONST = "const GENERATED_PAGE_BASE = '/admin/generated';";

export const formVarNames = (suffix: string) => ({
  widget: `FORM_WIDGET_${suffix}`,
  fields: `FORM_FIELDS_${suffix}`,
  fieldById: `FORM_FIELD_BY_ID_${suffix}`,
  fieldIds: `FORM_FIELD_IDS_${suffix}`,
  keyToId: `FORM_KEY_TO_ID_${suffix}`,
  evalCondition: `evalFieldCondition${suffix}`,
  rowData: `formRowData${suffix}`,
  visibleFields: `visibleFields${suffix}`,
  rowIsAuto: `fieldRowIsAuto${suffix}`,
  imgBlobUrls: "imgBlobUrls",
  values: `formValues${suffix}`,
  setValues: `setFormValues${suffix}`,
  files: `fileValues${suffix}`,
  setFiles: `setFileValues${suffix}`,
  existingMeta: `existingFileMeta${suffix}`,
  setExistingMeta: `setExistingFileMeta${suffix}`,
  change: `handleFieldChange${suffix}`,
  derivedChange: `handleDerivedChange${suffix}`,
  blur: `handleFieldBlur${suffix}`,
  fileChange: `handleFileChange${suffix}`,
  removeExisting: `handleRemoveExisting${suffix}`,
});

export const multiSelectVarNames = (suffix: string) => ({
  widget: `MULTISELECT_WIDGET_${suffix}`,
  ids: `multiSelectIds${suffix}`,
  setIds: `setMultiSelectIds${suffix}`,
  extraFieldValues: `multiSelectExtraFieldValues${suffix}`,
  setExtraFieldValues: `setMultiSelectExtraFieldValues${suffix}`,
  updateExtraField: `updateMultiSelectExtraField${suffix}`,
});

export const searchVarNames = (suffix: string) => ({
  defaultsReady: `searchDefaultsReady${suffix}`,
  setDefaultsReady: `setSearchDefaultsReady${suffix}`,
});

export const sublistVarNames = (suffix: string) => ({
  widget: `SUBLIST_WIDGET_${suffix}`,
  rows: `subListRows${suffix}`,
  setRows: `setSubListRows${suffix}`,
  rowsChange: `handleSubListRowsChange${suffix}`,
  fileMap: `subListFileMap${suffix}`,
  setFileMap: `setSubListFileMap${suffix}`,
  fileChange: `handleSubListFileChange${suffix}`,
});

export const hasMultiSelectExtraFields = (widget: Pick<MultiSelectWidget, "extraFields">): boolean =>
  (widget.extraFields ?? []).length > 0;

export const tabVarNames = (suffix: string) => ({
  active: `activeTab${suffix}`,
  setActive: `setActiveTab${suffix}`,
  mountedTabs: `mountedTabs${suffix}`,
  setMountedTabs: `setMountedTabs${suffix}`,
  savedTabs: `savedTabs${suffix}`,
  setSavedTabs: `setSavedTabs${suffix}`,
  handleClick: `handleTabClick${suffix}`,
  sharedIds: `sharedDataIds${suffix}`,
  setSharedIds: `setSharedDataIds${suffix}`,
});

export const PAGE_VAR = {
  allFormValues: "allFormValues",
  allFieldKeyToId: "allFieldKeyToId",
  allFieldLabels: "allFieldLabels",
  writeFormValue: "writeFormValue",
  lastGeneratedRef: "lastGeneratedRef",
  storedId: "storedId",
  urlParams: "urlParams",
  imgBlobUrls: "imgBlobUrls",
  setImgBlobUrls: "setImgBlobUrls",
  fetchRelData: "fetchRelData",
  setFetchRelData: "setFetchRelData",
  pendingDeleteFileIds: "pendingDeleteFileIds",
  applyGenerations: "applyFieldGenerations",
} as const;

export const pageVar = (key: keyof typeof PAGE_VAR): string => PAGE_VAR[key];

export type WidgetBlockGenerator = (widget: PageWidget, ctx: WidgetGenContext) => WidgetCodeBlock;

export interface WidgetBuildOptions {
  pageTitle?: string;
  pageTitleMsgKey?: string;
  mainConnectedSlug?: string;
  componentName?: string;
  isEntity?: boolean;
  outputMode?: OutputMode;
  pageSlug?: string;
  leaveCheck?: boolean;
  nestedPageConfigs?: Record<string, NestedPageConfig>;
}

export interface WidgetUnhandledEntry {
  widget: string;
  scope: "widget" | "field" | "column";
  keys: string[];
}

export interface WidgetBuildBlock {
  scope: "root" | "tab";
  outputMode: OutputMode;
  pageSlug?: string;
}

export interface WidgetBuildResult {
  tsxCode: string;
  unsupported: PageWidgetType[];
  unhandled: WidgetUnhandledEntry[];
  blocked: WidgetBuildBlock[];
}

const WIDGET_BLOCK_GENERATORS: Partial<Record<PageWidgetType, WidgetBlockGenerator>> = {
  search: generateSearchBlock as WidgetBlockGenerator,
  table: generateTableBlock as WidgetBlockGenerator,
  space: generateSpaceBlock as WidgetBlockGenerator,
  form: generateFormBlock as WidgetBlockGenerator,
  multiselect: generateMultiSelectBlock as WidgetBlockGenerator,
  sublist: generateSubListBlock as WidgetBlockGenerator,
  tab: generateTabBlock as WidgetBlockGenerator,
  category: generateCategoryBlock as WidgetBlockGenerator,
};

const TYPE_LABEL: Record<PageWidgetType, string> = {
  search: "Search",
  table: "Table",
  form: "Form",
  space: "Space",
  category: "Category",
  sublist: "SubList",
  multiselect: "MultiSelect",
  tab: "Tab",
};

const ind = (n: number): string => "    ".repeat(n);

export const jsStringLiteral = (value: string): string => JSON.stringify(value ?? "");

export const collectUnhandledKeys = (
  obj: Record<string, unknown> | undefined,
  handled: ReadonlySet<string>,
  ignored: ReadonlySet<string>
): string[] => {
  if (!obj) return [];
  return Object.keys(obj).filter((k) => obj[k] !== undefined && !handled.has(k) && !ignored.has(k));
};

export interface ContainerOpenOptions {
  showBorder?: boolean;
  className?: string;
  bgColor?: string;
  clipOverflow?: boolean;
  fillHeight?: boolean;
  contentColSpan?: number;
  rowIsAuto?: boolean[];
  rowPitch?: number;
  gapSize?: number;
  contentPaddingTop?: number;
  gridTemplateRowsExpr?: string;
}

export const emitContainerOpen = (o: ContainerOpenOptions): string => {
  const fillHeight = o.fillHeight ?? true;
  const showBorder = o.showBorder ?? true;
  const clipOverflow = o.clipOverflow ?? true;
  const cls = rendererContainerClassName(fillHeight, showBorder, o.className ?? "");
  const overflowValue = rendererContainerOverflow(clipOverflow);
  const styleParts = [`overflow: '${overflowValue}'`];
  if (o.bgColor) styleParts.push(`backgroundColor: '${o.bgColor}'`);
  if (o.contentColSpan) {
    const custom = o.rowPitch !== undefined || o.gapSize !== undefined;
    const trackExpr = custom ? `${(o.rowPitch ?? 80) - (o.gapSize ?? 8)}px` : "${ROW_HEIGHT - GAP_SIZE}px";
    const gapExpr = custom ? `${o.gapSize ?? 8}px` : "${GAP_SIZE}px";
    styleParts.push(`display: 'grid'`);
    styleParts.push(`gridTemplateColumns: 'repeat(${o.contentColSpan}, 1fr)'`);
    if (o.gridTemplateRowsExpr) {
      styleParts.push(`gridTemplateRows: ${o.gridTemplateRowsExpr}`);
    } else if (o.rowIsAuto && o.rowIsAuto.length > 0) {
      const rowTracks = o.rowIsAuto.map((auto) => (auto ? "auto" : trackExpr)).join(" ");
      styleParts.push("gridTemplateRows: `" + rowTracks + "`");
    }
    styleParts.push("gridAutoRows: `" + trackExpr + "`");
    styleParts.push("rowGap: `" + gapExpr + "`");
    styleParts.push("columnGap: `" + gapExpr + "`");
  }
  if (o.contentPaddingTop) {
    styleParts.push(`paddingTop: '${o.contentPaddingTop}px'`);
    styleParts.push(`paddingBottom: '${o.contentPaddingTop}px'`);
  }
  return `<div className=${jsStringLiteral(cls)} style={{ ${styleParts.join(", ")} }}>`;
};

export const emitContainerClose = (): string => "</div>";

export const emitSelectArrow = (ind: (n: number) => string, level: number): string =>
  `${ind(level)}<svg className=${jsStringLiteral(SELECT_ARROW_CLS)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>`;

export interface SlugOptionSourceField {
  optionSlug?: string;
  optionValueKey?: string;
  optionTextKey?: string;
  optionFilter?: string;
  optionOrderKey?: string;
  optionOrderDir?: "ASC" | "DESC";
}

export const slugOptionFieldLiteral = (f: SlugOptionSourceField): Record<string, unknown> => {
  const obj: Record<string, unknown> = {};
  if (f.optionSlug !== undefined) obj.optionSlug = f.optionSlug;
  if (f.optionValueKey !== undefined) obj.optionValueKey = f.optionValueKey;
  if (f.optionTextKey !== undefined) obj.optionTextKey = f.optionTextKey;
  if (f.optionFilter !== undefined) obj.optionFilter = f.optionFilter;
  if (f.optionOrderKey !== undefined) obj.optionOrderKey = f.optionOrderKey;
  if (f.optionOrderDir !== undefined) obj.optionOrderDir = f.optionOrderDir;
  return obj;
};

export interface SlugAutocompleteSourceField extends SlugOptionSourceField {
  optionDerivedKeys?: string;
}

export const slugAutocompleteFieldLiteral = (f: SlugAutocompleteSourceField): Record<string, unknown> => {
  const obj = slugOptionFieldLiteral(f);
  if (f.optionDerivedKeys !== undefined) obj.optionDerivedKeys = f.optionDerivedKeys;
  return obj;
};

export const emitSlugOptionSelectComponent = (): string[] => [
  `function SlugOptionSelect({ field, value, onChange, disabled, placeholder, className, rowData }: { field: { optionSlug?: string; optionValueKey?: string; optionTextKey?: string; optionFilter?: string; optionOrderKey?: string; optionOrderDir?: 'ASC' | 'DESC' }; value: string; onChange: (v: string) => void; disabled?: boolean; placeholder: string; className: string; rowData?: Record<string, unknown> }) {`,
  `    const [rowsBySlug, setRowsBySlug] = useState<{ slug: string; rows: Record<string, unknown>[] }>({ slug: '', rows: [] });`,
  `    useEffect(() => {`,
  `        if (!field.optionSlug) return;`,
  `        const slug = field.optionSlug;`,
  `        api`,
  "            .get(`/page-data/${slug}`, { params: { size: '9999' } })",
  `            .then((res) => {`,
  `                const rows = (res.data?.content ?? []) as { dataJson: Record<string, unknown> }[];`,
  `                setRowsBySlug({ slug, rows: rows.map((item) => flattenPageDataItem(item as unknown as Parameters<typeof flattenPageDataItem>[0])) });`,
  `            })`,
  `            .catch(() => setRowsBySlug({ slug, rows: [] }));`,
  `    }, [field.optionSlug]);`,
  `    const rawRows = rowsBySlug.slug === field.optionSlug ? rowsBySlug.rows : [];`,
  `    const opts = useMemo(() => buildSlugOptRows(rawRows, field, rowData), [rawRows, field, rowData]);`,
  `    return (`,
  `        <div className="relative">`,
  `            <select disabled={disabled} className={className} value={value} onChange={(e) => onChange(e.target.value)}>`,
  `                <option value="">{placeholder}</option>`,
  `                {opts.map((opt) => (`,
  `                    <option key={opt.value} value={opt.value}>{opt.text}</option>`,
  `                ))}`,
  `            </select>`,
  emitSelectArrow(ind, 3),
  `        </div>`,
  `    );`,
  `}`,
];

export const emitCategorySearchSelectComponent = (): string[] => [
  `function CategorySearchSelect({ field, value, onChange }: { field: SearchFieldConfig; value: string; onChange: (v: string) => void }) {`,
  `    const { t } = useI18n();`,
  `    const activeDepths = field.activeDepths ?? Array.from({ length: field.maxDepth ?? 1 }, (_, i) => i + 1);`,
  `    const { depthValues, depthOptions, depthLoading, disabledDepths, configErrorDepths, handleSelect } = useCategoryCascade({ mode: 'live', field, value, onChange });`,
  `    return (`,
  `        <div className=${jsStringLiteral(CATEGORY_SEARCH_WRAP_CLS)}>`,
  `            {activeDepths.map((_, i) => {`,
  `                const options = depthOptions[i];`,
  `                const loading = depthLoading[i];`,
  `                const selectedVal = depthValues[i];`,
  `                const isFieldDisabled = disabledDepths[i];`,
  `                const labelText = resolveCategoryDepthLabel(field, i, t);`,
  `                const prevLabelText = resolveCategoryDepthLabel(field, i - 1, t);`,
  `                const placeholder = configErrorDepths[i]`,
  `                    ? ${jsStringLiteral("설정 오류 — 상위 부모 ID 경로를 확인하세요")}`,
  `                    : loading`,
  `                        ? t('common.loading')`,
  `                        : isFieldDisabled`,
  `                            ? t('common.category.select_after', { label: prevLabelText })`,
  `                            : t('common.category.label_select', { label: labelText });`,
  `                return (`,
  `                    <select`,
  `                        key={i}`,
  `                        value={selectedVal}`,
  `                        disabled={isFieldDisabled || loading}`,
  `                        onChange={(e) => handleSelect(i, e.target.value)}`,
  `                        className=${jsStringLiteral(CATEGORY_SEARCH_SELECT_CLS)}`,
  `                    >`,
  `                        <option value="">{placeholder}</option>`,
  `                        {options.map((opt) => (`,
  `                            <option key={opt.value} value={opt.value}>{opt.text}</option>`,
  `                        ))}`,
  `                    </select>`,
  `                );`,
  `            })}`,
  `        </div>`,
  `    );`,
  `}`,
];

const dedupeLines = (lines: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  lines.forEach((line) => {
    const key = line.trim();
    if (key === "") {
      out.push(line);
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    out.push(line);
  });
  return out;
};

const CLOSER_LINE = /^[)}\]]+[;,]?$/;

export const splitHelperChunks = (lines: string[]): string[][] => {
  const chunks: string[][] = [];
  lines.forEach((line) => {
    const isBlank = line.trim() === "";
    const startsNewChunk = !isBlank && line === line.trimStart() && !CLOSER_LINE.test(line.trim());
    if (isBlank || startsNewChunk || chunks.length === 0) chunks.push([line]);
    else chunks[chunks.length - 1].push(line);
  });
  return chunks;
};

const dedupeHelperChunks = (lines: string[]): string[] => {
  const chunks = splitHelperChunks(lines);
  const seen = new Set<string>();
  const out: string[] = [];
  chunks.forEach((chunk) => {
    const key = chunk.join("\n");
    if (key.trim() === "") {
      out.push(...chunk);
      return;
    }
    if (seen.has(key)) return;
    seen.add(key);
    out.push(...chunk);
  });
  return out;
};

const mergeImports = (all: ImportRequirement[]): ImportRequirement[] => {
  const map = new Map<string, ImportRequirement>();
  all.forEach((req) => {
    const mapKey = req.typeOnly ? `type:${req.module}` : req.module;
    const existing = map.get(mapKey);
    if (!existing) {
      map.set(mapKey, {
        module: req.module,
        named: req.named ? [...new Set(req.named)] : undefined,
        defaultName: req.defaultName,
        typeOnly: req.typeOnly,
      });
      return;
    }
    const namedSet = new Set([...(existing.named ?? []), ...(req.named ?? [])]);
    existing.named = namedSet.size > 0 ? [...namedSet] : undefined;
    existing.defaultName = existing.defaultName ?? req.defaultName;
  });
  return [...map.values()];
};

const buildImportLines = (reqs: ImportRequirement[]): string[] =>
  reqs.map((req) => {
    if (req.typeOnly) return `import type { ${(req.named ?? []).join(", ")} } from '${req.module}';`;
    if (req.defaultName && req.named && req.named.length > 0) {
      return `import ${req.defaultName}, { ${req.named.join(", ")} } from '${req.module}';`;
    }
    if (req.defaultName) return `import ${req.defaultName} from '${req.module}';`;
    return `import { ${(req.named ?? []).join(", ")} } from '${req.module}';`;
  });

const widgetIdOf = (widget: PageWidget): string => widget.widgetId;

const collectLeaveCheckNames = (allWidgets: PageWidget[]): string[] => {
  const names: string[] = [];
  const hasDirtySource = allWidgets.some((w) => w.type === "form" || w.type === "multiselect" || w.type === "sublist");
  const spaceItems = allWidgets
    .filter((w) => w.type === "space")
    .flatMap(
      (w) =>
        (
          w as {
            items?: { type?: string; connType?: string; dataSaveSlug?: string; connectedContentWidgetIds?: string[] }[];
          }
        ).items ?? []
    );
  const hasContentAction = spaceItems.some((it) => it.type === "action-button" && it.connType === "content");
  const hasDataSaveAction = spaceItems.some(
    (it) =>
      it.type === "action-button" &&
      it.connType === "datasave" &&
      !!it.dataSaveSlug &&
      canEmitDataSave(allWidgets, it.connectedContentWidgetIds ?? [])
  );
  const hasCloseAction = spaceItems.some((it) => it.type === "action-button" && it.connType === "close");
  if (hasDirtySource) names.push("markDirty");
  if (hasContentAction || (hasDataSaveAction && hasDirtySource)) names.push("markClean");
  if (hasCloseAction) names.push("confirmLeave");
  return names;
};

export const panelLeaveCheckNames = (widgets: PageWidget[]): string[] => {
  const names = collectLeaveCheckNames(widgets);
  const hasDirtySource = widgets.some((w) => w.type === "form" || w.type === "multiselect" || w.type === "sublist");
  if (hasDirtySource && !names.includes("confirmLeave")) names.push("confirmLeave");
  return names;
};

const buildUnsupportedBlock = (widget: PageWidget, suffix: string): WidgetCodeBlock => {
  const label = TYPE_LABEL[widget.type] ?? widget.type;
  return {
    imports: [],
    helperLines: [],
    stateLines: [],
    handlerLines: [],
    jsxLines: [
      `{/* TODO(파일빌드 Phase 2): ${label}(${widget.type}) 위젯은 아직 코드 생성이 지원되지 않습니다. 빌더 화면에서 확인 후 직접 구현해주세요. (widgetId: ${widgetIdOf(widget) || suffix}) */}`,
      `<div className=${jsStringLiteral(GENERATED_UNSUPPORTED_WIDGET_CLS)}>`,
      `${label} 위젯 (미지원 — 직접 구현 필요)`,
      "</div>",
    ],
  };
};

export interface PreparedGrid {
  items: PageWidgetItem[];
  autoHeightFlags: boolean[];
}

const prepareGridItems = (items: PageWidgetItem[]): PreparedGrid => {
  const normalizedItems: PageWidgetItem[] = items.map((item) => {
    const normalized = normalizeFormItemRowSpans(item.colSpan, item.rowSpan, item.contents);
    return {
      ...item,
      contents: normalized.contents,
      rowSpan: normalized.rowSpan,
      rowIsAuto: normalized.rowIsAuto,
      contentAutoTrailing: normalized.contentAutoTrailing,
    };
  });

  const layout = packedRowLayout(
    normalizedItems.map(({ colSpan, rowSpan }) => ({ colSpan, rowSpan })),
    12,
    false
  );
  const autoHeightFlags = resolveItemAutoHeightFlags(normalizedItems, layout);

  return { items: normalizedItems, autoHeightFlags };
};

const collectPanelWidgetIds = (items: PageWidgetItem[]): string[] =>
  items
    .flatMap((item) => item.contents.map((content) => (content.widget as { widgetId?: string }).widgetId))
    .filter((id): id is string => !!id);

const remapWidgetIdsDeep = (value: unknown, idMap: Map<string, string>): unknown => {
  if (typeof value === "string") return idMap.get(value) ?? value;
  if (Array.isArray(value)) return value.map((entry) => remapWidgetIdsDeep(entry, idMap));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([key, entryValue]) => {
      out[idMap.get(key) ?? key] = remapWidgetIdsDeep(entryValue, idMap);
    });
    return out;
  }
  return value;
};

const EMPTY_WIDGET_BLOCK: WidgetCodeBlock = {
  imports: [],
  helperLines: [],
  stateLines: [],
  handlerLines: [],
  jsxLines: [],
};

const emitStaticGridItems = (
  grid: PreparedGrid,
  blockOf: (widget: PageWidget) => WidgetCodeBlock | undefined,
  level: number
): string[] => {
  const lines: string[] = [];
  grid.items.forEach((item, itemIdx) => {
    const autoHeightAttr = grid.autoHeightFlags[itemIdx] ? " autoHeight" : "";
    lines.push(`${ind(level)}<GridCell colSpan={${item.colSpan}} rowSpan={${item.rowSpan}}${autoHeightAttr}>`);

    const rowIsAuto = item.rowIsAuto ?? [];
    const styleParts = [`gridTemplateColumns: 'repeat(${item.colSpan}, 1fr)'`];
    if (rowIsAuto.length > 0) {
      const rowTracks = rowIsAuto.map((auto) => (auto ? "auto" : "${ROW_HEIGHT - GAP_SIZE}px")).join(" ");
      styleParts.push("gridTemplateRows: `" + rowTracks + "`");
    }
    styleParts.push("gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`");
    styleParts.push("gridAutoFlow: 'row dense'");
    styleParts.push("rowGap: `${GAP_SIZE}px`");
    styleParts.push("columnGap: 0");
    lines.push(`${ind(level + 1)}<div style={{ display: 'grid', ${styleParts.join(", ")} }}>`);

    item.contents.forEach((content, contentIdx) => {
      const block = blockOf(content.widget) ?? EMPTY_WIDGET_BLOCK;
      const isAutoTrailing = item.contentAutoTrailing?.[contentIdx] ?? false;
      const colSpanClamped = Math.min(content.colSpan, item.colSpan);
      const gridColumnValue =
        content.widget.type === "space"
          ? getSpaceGridColumn(content.widget.align, colSpanClamped, item.colSpan)
          : `span ${colSpanClamped}`;
      const heightExpr = "`${" + content.rowSpan + " * ROW_HEIGHT - GAP_SIZE}px`";
      const heightPart = isAutoTrailing ? "" : `, height: ${heightExpr}`;
      const visibilityExpr = block.visibilityExpr;
      lines.push(
        `${ind(level + 2)}<div style={{ gridColumn: '${gridColumnValue}', gridRow: 'span ${content.rowSpan}'${heightPart} }}>`
      );
      if (visibilityExpr) lines.push(`${ind(level + 3)}{${visibilityExpr} && (`);
      block.jsxLines.forEach((l) => lines.push(ind(level + 3) + l));
      if (visibilityExpr) lines.push(`${ind(level + 3)})}`);
      lines.push(`${ind(level + 2)}</div>`);
    });
    lines.push(`${ind(level + 1)}</div>`);
    lines.push(`${ind(level)}</GridCell>`);
  });
  return lines;
};

const widgetLiteralForGridLayout = (widget: PageWidget, suffixOf: (widgetId: string) => string): string => {
  const wid = (widget as { widgetId?: string }).widgetId ?? "";
  if (widget.type === "form") {
    const w = widget as unknown as { title?: string; titleMsgKey?: string };
    const parts = [`type: 'form'`, `fields: ${formVarNames(suffixOf(wid)).fields}`];
    if (w.title) parts.push(`title: ${jsStringLiteral(w.title)}`);
    if (w.titleMsgKey) parts.push(`titleMsgKey: ${jsStringLiteral(w.titleMsgKey)}`);
    return `{ ${parts.join(", ")} }`;
  }
  if (widget.type === "space") {
    const w = widget as unknown as { items?: { colSpan?: number; rowSpan?: number }[]; align?: string };
    const items = (w.items ?? []).map((it) => ({ colSpan: it.colSpan, rowSpan: it.rowSpan }));
    const parts = [`type: 'space'`, `items: ${JSON.stringify(items)}`];
    if (w.align) parts.push(`align: ${jsStringLiteral(w.align)}`);
    return `{ ${parts.join(", ")} }`;
  }
  if (widget.type === "tab") {
    const w = widget as unknown as { tabs?: { contentRowSpan?: number }[] };
    const tabs = (w.tabs ?? []).map((t) => ({ contentRowSpan: t.contentRowSpan ?? 0 }));
    return `{ type: 'tab', tabs: ${JSON.stringify(tabs)} }`;
  }
  if (widget.type === "table") {
    const w = widget as unknown as { displayMode?: string };
    return w.displayMode ? `{ type: 'table', displayMode: ${jsStringLiteral(w.displayMode)} }` : `{ type: 'table' }`;
  }
  return `{ type: ${jsStringLiteral(widget.type)} }`;
};

const buildGridItemsHelperLines = (
  grid: PreparedGrid,
  varName: string,
  suffixOf: (widgetId: string) => string
): string[] => {
  const itemsLiteral = grid.items
    .map((item) => {
      const contentsLiteral = item.contents
        .map(
          (c) =>
            `{ id: ${jsStringLiteral(c.id)}, colSpan: ${c.colSpan}, rowSpan: ${c.rowSpan}, widget: ${widgetLiteralForGridLayout(c.widget, suffixOf)} }`
        )
        .join(", ");
      return `{ colSpan: ${item.colSpan}, rowSpan: ${item.rowSpan}, contents: [${contentsLiteral}] }`;
    })
    .join(", ");
  return [`const GRID_ITEMS_${varName} = [${itemsLiteral}];`];
};

export interface DynamicGridOptions {
  varName: string;
  suffixOf: (widgetId: string) => string;
  recordLoadedAvailable: boolean;
}

export interface EmitGridItemsResult {
  jsxLines: string[];
  helperLines: string[];
  tailLines: string[];
  imports: ImportRequirement[];
}

export const emitGridItems = (
  grid: PreparedGrid,
  blockOf: (widget: PageWidget) => WidgetCodeBlock | undefined,
  level: number,
  dynamic?: DynamicGridOptions
): EmitGridItemsResult => {
  const dynamicGrid =
    !!dynamic && grid.items.some((item) => item.contents.some((c) => !!blockOf(c.widget)?.visibilityExpr));

  if (!dynamicGrid) {
    return { jsxLines: emitStaticGridItems(grid, blockOf, level), helperLines: [], tailLines: [], imports: [] };
  }

  const { varName, suffixOf, recordLoadedAvailable } = dynamic;
  const layoutVar = `gridLayout${varName}`;
  const fieldIdsVar = `gridVisibleFieldIds${varName}`;
  const ratchetVar = `gridRatchet${varName}`;
  const itemsVar = `GRID_ITEMS_${varName}`;

  const helperLines = buildGridItemsHelperLines(grid, varName, suffixOf);

  const formVisibleVars: string[] = [];
  grid.items.forEach((item) =>
    item.contents.forEach((c) => {
      if (c.widget.type !== "form") return;
      const wid = (c.widget as { widgetId?: string }).widgetId ?? "";
      formVisibleVars.push(formVarNames(suffixOf(wid)).visibleFields);
    })
  );

  const visibleFlat: string[] = [];
  grid.items.forEach((item) =>
    item.contents.forEach((c) => {
      visibleFlat.push(blockOf(c.widget)?.visibilityExpr ?? "true");
    })
  );

  const visibleFieldsCall = `[${visibleFlat.join(", ")}]`;
  const tailLines: string[] = [
    `${ind(1)}const ${fieldIdsVar} = useMemo(() => new Set([${formVisibleVars.map((v) => `...${v}`).join(", ")}].map((f) => f.id)), [${formVisibleVars.join(", ")}]);`,
    `${ind(1)}const ${ratchetVar} = useRef<Map<string, number>>(new Map());`,
  ];
  if (recordLoadedAvailable) {
    tailLines.push(`${ind(1)}const ${layoutVar} = useMemo(() => {`);
    tailLines.push(`${ind(2)}if (!recordLoaded) {`);
    tailLines.push(`${ind(3)}${ratchetVar}.current = new Map();`);
    tailLines.push(
      `${ind(3)}return resolveGeneratedGridLayout(${itemsVar}, ${visibleFieldsCall}, { visibleFieldIds: ${fieldIdsVar} });`
    );
    tailLines.push(`${ind(2)}}`);
    tailLines.push(
      `${ind(2)}return resolveGeneratedGridLayout(${itemsVar}, ${visibleFieldsCall}, { visibleFieldIds: ${fieldIdsVar}, maxRowSpanByContentId: ${ratchetVar}.current });`
    );
    tailLines.push(`${ind(1)}}, [recordLoaded, allFieldKeyToId, allFormValues, ${fieldIdsVar}]);`);
  } else {
    tailLines.push(
      `${ind(1)}const ${layoutVar} = useMemo(() => resolveGeneratedGridLayout(${itemsVar}, ${visibleFieldsCall}, { visibleFieldIds: ${fieldIdsVar}, maxRowSpanByContentId: ${ratchetVar}.current }), [allFieldKeyToId, allFormValues, ${fieldIdsVar}]);`
    );
  }

  const jsxLines: string[] = [];
  grid.items.forEach((item, itemIdx) => {
    const layoutRef = `${layoutVar}[${itemIdx}]`;
    jsxLines.push(
      `${ind(level)}<GridCell colSpan={${item.colSpan}} rowSpan={${layoutRef}.rowSpan} autoHeight={${layoutRef}.autoHeight}>`
    );
    const styleParts = [
      `gridTemplateColumns: 'repeat(${item.colSpan}, 1fr)'`,
      `gridTemplateRows: ${layoutRef}.rowTracks`,
      "gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`",
      "gridAutoFlow: 'row dense'",
      "rowGap: `${GAP_SIZE}px`",
      "columnGap: 0",
    ];
    jsxLines.push(`${ind(level + 1)}<div style={{ display: 'grid', ${styleParts.join(", ")} }}>`);

    item.contents.forEach((content, contentIdx) => {
      const block = blockOf(content.widget) ?? EMPTY_WIDGET_BLOCK;
      const contentRef = `${layoutRef}.contents[${contentIdx}]`;
      const colSpanClamped = Math.min(content.colSpan, item.colSpan);
      const gridColumnValue =
        content.widget.type === "space"
          ? getSpaceGridColumn(content.widget.align, colSpanClamped, item.colSpan)
          : `span ${colSpanClamped}`;
      jsxLines.push(`${ind(level + 2)}{${contentRef}.visible && (`);
      jsxLines.push(
        `${ind(level + 3)}<div style={{ gridColumn: '${gridColumnValue}', gridRow: \`span \${${contentRef}.rowSpan}\`, ...${contentRef}.heightStyle }}>`
      );
      block.jsxLines.forEach((l) => jsxLines.push(ind(level + 4) + l));
      jsxLines.push(`${ind(level + 3)}</div>`);
      jsxLines.push(`${ind(level + 2)})}`);
    });
    jsxLines.push(`${ind(level + 1)}</div>`);
    jsxLines.push(`${ind(level)}</GridCell>`);
  });

  const imports: ImportRequirement[] = [
    { module: "@/app/admin/templates/make/_shared/utils/formGridLayout", named: ["resolveGeneratedGridLayout"] },
    { module: "react", named: ["useMemo", "useRef"] },
  ];

  return { jsxLines, helperLines, tailLines, imports };
};

export const collectScopedParts = (
  widgets: PageWidget[],
  blockOf: (widget: PageWidget) => WidgetCodeBlock | undefined,
  grid: PreparedGrid,
  varName: string,
  suffixOf: (widgetId: string) => string,
  jsxLevel: number
): ScopedComponentParts => {
  const blocks = widgets.map((w) => blockOf(w)).filter((b): b is WidgetCodeBlock => !!b);
  const recordLoadedAvailable = blocks.some((b) => !!b.emitsRecordLoaded);
  const gridEmit = emitGridItems(grid, blockOf, jsxLevel, { varName, suffixOf, recordLoadedAvailable });
  return {
    imports: [...blocks.flatMap((b) => b.imports), ...gridEmit.imports],
    helperLines: dedupeHelperChunks([...blocks.flatMap((b) => b.helperLines), ...gridEmit.helperLines]),
    stateLines: dedupeLines(blocks.flatMap((b) => b.stateLines)),
    handlerLines: [...blocks.flatMap((b) => b.handlerLines), ...gridEmit.tailLines],
    jsxLines: gridEmit.jsxLines,
  };
};

const LAYER_POPUP_UTILS_MODULE = "@/app/admin/templates/make/_shared/utils";
const LAYER_POPUP_CONTENT_SAVE_MODULE = "@/app/admin/templates/make/_shared/utils/contentSave";

const buildLayerPopupEditRestoreLines = (
  plan: LayerPopupPlan,
  suffixOf: (widgetId: string) => string
): { lines: string[]; imports: ImportRequirement[] } => {
  if (plan.formWidgets.length === 0 && plan.sublistWidgets.length === 0 && plan.multiselectWidgets.length === 0) {
    return { lines: [], imports: [] };
  }
  const imports: ImportRequirement[] = [
    { module: "@/lib/api", defaultName: "api" },
    { module: "sonner", named: ["toast"] },
  ];
  const fetchSlug = plan.formWidgets[0]?.connectedSlug ?? "";
  const lines: string[] = [];
  lines.push(`    useEffect(() => {`);
  lines.push(`        if (editId == null) return;`);
  lines.push(`        let cancelled = false;`);
  lines.push(`        api`);
  lines.push(`            .get(\`/page-data/${fetchSlug}/\${editId}\`)`);
  lines.push(`            .then(async (res) => {`);
  lines.push(`                if (cancelled) return;`);
  lines.push(`                const dataJson = (res.data.dataJson || {}) as Record<string, unknown>;`);
  if (plan.formWidgets.length > 0) {
    imports.push({ module: LAYER_POPUP_UTILS_MODULE, named: ["buildFormValuesFromDataJson"] });
    lines.push(`                const valuesByWidgetId = buildFormValuesFromDataJson(dataJson, ALL_FORM_WIDGETS, t);`);
    plan.formWidgets.forEach((fw) => {
      const n = formVarNames(suffixOf(fw.widgetId));
      lines.push(
        `                ${n.setValues}((prev) => ({ ...prev, ...(valuesByWidgetId[${jsStringLiteral(fw.widgetId)}] ?? {}) }));`
      );
    });
  }
  plan.multiselectWidgets.forEach((mw) => {
    const suffix = suffixOf(mw.widgetId);
    const n = multiSelectVarNames(suffix);
    imports.push({ module: LAYER_POPUP_UTILS_MODULE, named: ["extractMultiSelectSelection"] });
    lines.push(
      `                const selection${suffix} = extractMultiSelectSelection(dataJson, ${jsStringLiteral(mw.contentKey ?? "")}, ${jsStringLiteral(mw.connectedSlug ?? "")});`
    );
    lines.push(`                if (selection${suffix}.kind !== 'none') ${n.setIds}(selection${suffix}.ids);`);
    if (mw.hasExtraFields) {
      lines.push(
        `                if (selection${suffix}.kind === 'objects') ${n.setExtraFieldValues}(selection${suffix}.extraFieldValues);`
      );
    }
  });
  plan.sublistWidgets.forEach((sw) => {
    const suffix = suffixOf(sw.widgetId);
    const n = sublistVarNames(suffix);
    imports.push({ module: LAYER_POPUP_UTILS_MODULE, named: ["extractSubListRows"] });
    lines.push(`                ${n.setRows}(extractSubListRows(dataJson, ${jsStringLiteral(sw.contentKey ?? "")}));`);
  });
  const fileForms = plan.formWidgets.filter((fw) => fw.hasFileField);
  if (fileForms.length > 0) {
    imports.push({ module: LAYER_POPUP_UTILS_MODULE, named: ["findSection"] });
    imports.push({
      module: LAYER_POPUP_CONTENT_SAVE_MODULE,
      named: ["collectFileIdsDeep", "fetchFileMetaByIds", "fetchFileBlobUrl"],
    });
    lines.push(`                const fileIds = collectFileIdsDeep(dataJson);`);
    lines.push(`                if (fileIds.length === 0) return;`);
    lines.push(`                const metaList = await fetchFileMetaByIds(fileIds, false);`);
    fileForms.forEach((fw) => {
      const suffix = suffixOf(fw.widgetId);
      const n = formVarNames(suffix);
      lines.push(
        `                const section${suffix} = findSection(dataJson, ${jsStringLiteral(fw.contentKey ?? "")});`
      );
      lines.push(
        `                const metaByFieldId${suffix}: Record<string, { id: number; origName: string; fileSize: number }[]> = {};`
      );
      lines.push(`                ${n.fields}.forEach((f) => {`);
      lines.push(`                    if (!f.fieldKey || !FILE_FIELD_TYPE_SET.has(f.type)) return;`);
      lines.push(`                    const ids = section${suffix}[f.fieldKey];`);
      lines.push(`                    if (!Array.isArray(ids)) return;`);
      lines.push(
        `                    metaByFieldId${suffix}[f.id] = (ids as number[]).map((id) => metaList.find((m) => m.id === id)).filter((m): m is { id: number; origName: string; fileSize: number } => !!m);`
      );
      lines.push(`                    if (f.type === 'image' || f.type === 'video' || f.type === 'media') {`);
      lines.push(`                        (ids as number[]).forEach((id) => {`);
      lines.push(
        `                            fetchFileBlobUrl(id, false).then((url) => setImgBlobUrls((prev) => ({ ...prev, [id]: url }))).catch(() => {});`
      );
      lines.push(`                        });`);
      lines.push(`                    }`);
      lines.push(`                });`);
      lines.push(`                ${n.setExistingMeta}(metaByFieldId${suffix});`);
    });
  }
  lines.push(`            })`);
  lines.push(`            .catch(() => toast.error(t('common.error.load_existing_data')));`);
  lines.push(`        return () => { cancelled = true; };`);
  lines.push(`    }, [editId]);`);
  return { lines, imports };
};

export const buildLayerPopupComponentLines = (
  plan: LayerPopupPlan,
  componentName: string,
  blockOf: (widget: PageWidget) => WidgetCodeBlock | undefined,
  suffixOf: (widgetId: string) => string,
  includeEditId: boolean
): { text: string; imports: ImportRequirement[] } => {
  const popupWidgets = plan.grid.items.flatMap((item) => item.contents.map((c) => c.widget));
  const parts = collectScopedParts(popupWidgets, blockOf, plan.grid, componentName, suffixOf, 3);
  const imports: ImportRequirement[] = [...parts.imports];

  const propsType = includeEditId
    ? "{ onClose: () => void; onSaved: () => void; extras: Record<string, Record<string, string>>; editId: number | null; }"
    : "{ onClose: () => void; onSaved: () => void; extras: Record<string, Record<string, string>>; }";

  const lines: string[] = [];
  lines.push(`function ${componentName}(props: ${propsType}) {`);
  lines.push(
    includeEditId
      ? "    const { onClose, onSaved, extras, editId } = props;"
      : "    const { onClose, onSaved, extras } = props;"
  );
  if (plan.formWidgets.length > 0) lines.push("    const markDirty = () => {};");
  parts.helperLines.forEach((l) => lines.push(l));
  if (parts.helperLines.length > 0) lines.push("");
  parts.stateLines.forEach((l) => lines.push(l));
  if (parts.stateLines.length > 0) lines.push("");
  parts.handlerLines.forEach((l) => lines.push(l));
  if (parts.handlerLines.length > 0) lines.push("");

  if (includeEditId) {
    const restore = buildLayerPopupEditRestoreLines(plan, suffixOf);
    if (restore.lines.length > 0) {
      restore.lines.forEach((l) => lines.push(l));
      lines.push("");
      imports.push(...restore.imports);
    }
  }

  lines.push(`    return (`);
  lines.push(`        <div className="px-4 pb-4">`);
  lines.push(`            <PageGridContainer>`);
  parts.jsxLines.forEach((l) => lines.push(l));
  lines.push(`            </PageGridContainer>`);
  lines.push(`        </div>`);
  lines.push(`    );`);
  lines.push(`}`);

  return { text: lines.join("\n"), imports };
};

interface WidgetScopeOptions {
  mainConnectedSlug?: string;
  isEntity: boolean;
  outputMode: OutputMode;
  mergeExistingBeforeSave: boolean;
  tabSaveScope?: { tabWidgetId: string; tabIdx: number };
  tabSharedIdScope?: { tabWidgetId: string };
  insideTab?: boolean;
  insidePopup?: boolean;
  popupScope?: { closeFnVar: string; extrasVar: string; onSavedFnVar: string };
}

interface WidgetScopeMeta extends WidgetScopeOptions {
  contentColSpan: number;
  contentFillHeight: boolean;
  scopeGroupId: number;
}

export const buildWidgetTsxFile = (items: PageWidgetItem[], options: WidgetBuildOptions = {}): WidgetBuildResult => {
  const componentName = options.componentName || "GeneratedPage";
  const isEntity = options.isEntity ?? false;
  const rootOutputMode = options.outputMode ?? "page";

  const blocked: WidgetBuildBlock[] = [];
  if (rootOutputMode !== "page") blocked.push({ scope: "root", outputMode: rootOutputMode });

  const nestedPageConfigs = options.nestedPageConfigs ?? {};
  const outputModeOf = (slug?: string): OutputMode | undefined =>
    slug ? nestedPageConfigs[slug]?.outputMode : undefined;

  const rootGrid = prepareGridItems(items);

  const allWidgets: PageWidget[] = [];
  const scopeByWidget = new Map<PageWidget, WidgetScopeMeta>();
  const tabPlansByWidget = new Map<PageWidget, TabPanelPlan[]>();
  const layerPopupPlansByWidget = new Map<PageWidget, LayerPopupPlan[]>();
  const widgetsWithChildScope = new Set<PageWidget>();

  const depthByWidget = new Map<PageWidget, number>();
  const scopeGroups: PageWidget[][] = [];
  let nextGroupId = 0;

  const registerGrid = (grid: PreparedGrid, scope: WidgetScopeOptions, depth: number, groupId: number): void => {
    if (!scopeGroups[groupId]) scopeGroups[groupId] = [];
    grid.items.forEach((item) => {
      item.contents.forEach((content, contentIdx) => {
        const widget = content.widget;
        allWidgets.push(widget);
        scopeGroups[groupId].push(widget);
        depthByWidget.set(widget, depth);
        scopeByWidget.set(widget, {
          ...scope,
          contentColSpan: content.colSpan,
          contentFillHeight: !(item.contentAutoTrailing?.[contentIdx] ?? false),
          scopeGroupId: groupId,
        });
        if (widget.type === "tab") registerTabPanels(widget as TabWidget, scope, depth);
        if (widget.type === "category") registerCategoryLayerPopups(widget as CategoryWidget, scope, depth);
        if (widget.type === "table") registerTableEditLayerPopups(widget as TableWidget, scope, depth);
      });
    });
  };

  const registerTabPanels = (tabWidget: TabWidget, parentScope: WidgetScopeOptions, depth: number): void => {
    const plans: TabPanelPlan[] = [];
    const requiredGuardActive = tabWidget.tabs?.[0]?.required === true;
    (tabWidget.tabs ?? []).forEach((tab, tabIdx) => {
      const config = tab.pageSlug ? options.nestedPageConfigs?.[tab.pageSlug] : undefined;
      if (!config) {
        plans.push({ tab, items: [], autoHeightFlags: [], missing: true });
        return;
      }
      const tabOutputMode = config.outputMode ?? "page";
      if (tabOutputMode !== "page") {
        blocked.push({ scope: "tab", outputMode: tabOutputMode, pageSlug: tab.pageSlug });
      }
      const clonedItems = JSON.parse(JSON.stringify(config.widgetItems)) as PageWidgetItem[];
      const idPrefix = `${tabWidget.widgetId}_t${tabIdx}_`;
      const idMap = new Map<string, string>();
      collectPanelWidgetIds(clonedItems).forEach((oldId) => idMap.set(oldId, `${idPrefix}${oldId}`));
      const remappedItems = remapWidgetIdsDeep(clonedItems, idMap) as PageWidgetItem[];
      const panelGrid = prepareGridItems(remappedItems);
      plans.push({
        tab,
        items: panelGrid.items,
        autoHeightFlags: panelGrid.autoHeightFlags,
        missing: false,
      });
      registerGrid(
        panelGrid,
        {
          mainConnectedSlug: parentScope.mainConnectedSlug || config.mainConnectedSlug,
          isEntity: config.connectedType === "data",
          outputMode: parentScope.outputMode,
          mergeExistingBeforeSave: !!tab.contentKey,
          insideTab: true,
          tabSharedIdScope: { tabWidgetId: tabWidget.widgetId },
          ...(requiredGuardActive ? { tabSaveScope: { tabWidgetId: tabWidget.widgetId, tabIdx } } : {}),
        },
        depth + 1,
        nextGroupId++
      );
    });
    tabPlansByWidget.set(tabWidget, plans);
    widgetsWithChildScope.add(tabWidget);
  };

  const buildLayerPopupPlan = (
    role: "create" | "edit" | "detail",
    slug: string | undefined,
    parentScope: WidgetScopeOptions,
    depth: number,
    ownerWidgetId: string
  ): LayerPopupPlan | undefined => {
    if (!slug) return undefined;
    const config = nestedPageConfigs[slug];
    if (!config || (config.outputMode ?? "page") !== "layerpopup") return undefined;

    const clonedItems = JSON.parse(JSON.stringify(config.widgetItems)) as PageWidgetItem[];
    const idPrefix = `${ownerWidgetId}_popup_${role}_`;
    const idMap = new Map<string, string>();
    collectPanelWidgetIds(clonedItems).forEach((oldId) => idMap.set(oldId, `${idPrefix}${oldId}`));
    const remappedItems = remapWidgetIdsDeep(clonedItems, idMap) as PageWidgetItem[];
    const panelGrid = prepareGridItems(remappedItems);

    const nestedWidgets = panelGrid.items.flatMap((item) => item.contents.map((c) => c.widget));
    const formContentKeys = nestedWidgets
      .filter((w) => w.type === "form")
      .map((w) => (w as unknown as { contentKey?: string }).contentKey)
      .filter((k): k is string => !!k);
    const tableContentKeys = nestedWidgets
      .filter((w) => w.type === "table")
      .map((w) => (w as unknown as { contentKey?: string }).contentKey)
      .filter((k): k is string => !!k);
    const formFieldMeta = nestedWidgets
      .filter((w) => w.type === "form")
      .flatMap((w) => {
        const fw = w as unknown as { contentKey?: string; fields?: { fieldKey?: string; label?: string }[] };
        return (fw.fields ?? []).map((f) => ({ contentKey: fw.contentKey, fieldKey: f.fieldKey || f.label || "" }));
      });
    const popupIsEntity = config.connectedType === "data";
    const formWidgets = nestedWidgets
      .filter((w) => w.type === "form")
      .map((w) => {
        const fw = w as unknown as {
          widgetId: string;
          connectedSlug?: string;
          contentKey?: string;
          fields?: { type?: string }[];
        };
        return {
          widgetId: fw.widgetId,
          connectedSlug: fw.connectedSlug,
          contentKey: fw.contentKey,
          hasFileField: (fw.fields ?? []).some((f) => (FILE_FIELD_TYPES as readonly string[]).includes(f.type ?? "")),
        };
      });
    const sublistWidgets = nestedWidgets
      .filter((w) => w.type === "sublist")
      .map((w) => {
        const sw = w as unknown as { widgetId: string; contentKey?: string };
        return { widgetId: sw.widgetId, contentKey: sw.contentKey };
      });
    const multiselectWidgets = nestedWidgets
      .filter((w) => w.type === "multiselect")
      .map((w) => {
        const mw = w as unknown as MultiSelectWidget;
        return {
          widgetId: mw.widgetId,
          contentKey: mw.contentKey,
          connectedSlug: mw.connectedSlug,
          hasExtraFields: hasMultiSelectExtraFields(mw),
        };
      });

    registerGrid(
      panelGrid,
      {
        mainConnectedSlug: config.mainConnectedSlug,
        isEntity: popupIsEntity,
        outputMode: parentScope.outputMode,
        mergeExistingBeforeSave: false,
        insidePopup: true,
        popupScope: { closeFnVar: "onClose", extrasVar: "extras", onSavedFnVar: "onSaved" },
      },
      depth + 1,
      nextGroupId++
    );

    return {
      role,
      slug,
      layerType: config.layerType ?? "center",
      layerWidth: config.layerWidth ?? "md",
      layerTitle: config.layerTitle,
      layerTitleMsgKey: config.layerTitleMsgKey,
      grid: panelGrid,
      formContentKeys,
      tableContentKeys,
      formFieldMeta,
      isEntity: popupIsEntity,
      formWidgets,
      sublistWidgets,
      multiselectWidgets,
    };
  };

  const registerCategoryLayerPopups = (
    widget: CategoryWidget,
    parentScope: WidgetScopeOptions,
    depth: number
  ): void => {
    const plans: LayerPopupPlan[] = [];
    if (widget.createConnType === "popup") {
      const plan = buildLayerPopupPlan("create", widget.createPopupSlug, parentScope, depth, widget.widgetId);
      if (plan) plans.push(plan);
    }
    if (widget.editConnType === "popup") {
      const plan = buildLayerPopupPlan("edit", widget.editPopupSlug, parentScope, depth, widget.widgetId);
      if (plan) plans.push(plan);
    }
    if (plans.length === 0) return;
    layerPopupPlansByWidget.set(widget, plans);
    widgetsWithChildScope.add(widget);
  };

  const registerTableEditLayerPopups = (widget: TableWidget, parentScope: WidgetScopeOptions, depth: number): void => {
    const actionsCol = (widget.columns ?? []).find((c) => (c.editPageRules ?? []).length > 0);
    const rules = actionsCol?.editPageRules ?? [];
    const popupSlugs = [
      ...new Set(
        rules
          .filter((r) => (r.connType ?? "popup") === "popup")
          .map((r) => r.pageSlug)
          .filter((s): s is string => !!s)
      ),
    ];
    const plans: LayerPopupPlan[] = [];
    popupSlugs.forEach((slug) => {
      const plan = buildLayerPopupPlan("edit", slug, parentScope, depth, `${widget.widgetId}_${slug}`);
      if (plan) plans.push(plan);
    });
    if (plans.length === 0) return;
    layerPopupPlansByWidget.set(widget, plans);
    widgetsWithChildScope.add(widget);
  };

  registerGrid(
    rootGrid,
    {
      mainConnectedSlug: options.mainConnectedSlug,
      isEntity,
      outputMode: rootOutputMode,
      mergeExistingBeforeSave: false,
    },
    0,
    nextGroupId++
  );

  const typeCounter: Partial<Record<PageWidgetType, number>> = {};
  const suffixMap = new Map<string, string>();
  allWidgets.forEach((widget) => {
    const n = (typeCounter[widget.type] ?? 0) + 1;
    typeCounter[widget.type] = n;
    const wid = widgetIdOf(widget);
    if (wid) suffixMap.set(wid, `${TYPE_LABEL[widget.type] ?? widget.type}${n}`);
  });
  const suffixOf = (widgetId: string): string => suffixMap.get(widgetId) ?? widgetId;

  const unsupportedSet = new Set<PageWidgetType>();
  const blockByWidget = new Map<PageWidget, WidgetCodeBlock>();
  const blockOf = (widget: PageWidget): WidgetCodeBlock | undefined => blockByWidget.get(widget);

  const rootLeaveCheckNames = collectLeaveCheckNames(scopeGroups[0] ?? []);
  const CROSS_TAB_PROP_NAMES: CrossTabPropNames = {
    formValues: "crossTabFormValues",
    onFormChange: "onCrossTabFormChange",
    generatedValues: "crossTabGeneratedValues",
    onGeneratedChange: "onCrossTabGeneratedChange",
  };

  const generateBlock = (widget: PageWidget): void => {
    const wid = widgetIdOf(widget);
    const suffix = suffixOf(wid);
    const generator = WIDGET_BLOCK_GENERATORS[widget.type];
    const scope = scopeByWidget.get(widget);
    const tabSavedMarker = scope?.tabSaveScope
      ? `${tabVarNames(suffixOf(scope.tabSaveScope.tabWidgetId)).setSavedTabs}((prev) => new Set([...prev, ${scope.tabSaveScope.tabIdx}]));`
      : undefined;
    const scopeLeaveCheckNames = scope?.insidePopup
      ? []
      : scope?.insideTab
        ? panelLeaveCheckNames(scopeGroups[scope.scopeGroupId ?? -1] ?? [])
        : rootLeaveCheckNames;
    const ctx: WidgetGenContext = {
      suffix,
      ind,
      allWidgets,
      scopeWidgets: scope?.scopeGroupId !== undefined ? (scopeGroups[scope.scopeGroupId] ?? allWidgets) : allWidgets,
      suffixOf,
      mainConnectedSlug: scope?.mainConnectedSlug,
      isEntity: scope?.isEntity ?? isEntity,
      outputMode: scope?.outputMode ?? rootOutputMode,
      contentColSpan: scope?.contentColSpan ?? 12,
      contentFillHeight: scope?.contentFillHeight ?? true,
      pageSlug: options.pageSlug,
      leaveCheck: options.leaveCheck ?? false,
      leaveCheckNames: scopeLeaveCheckNames,
      mergeExistingBeforeSave: scope?.mergeExistingBeforeSave ?? false,
      tabPanels: tabPlansByWidget.get(widget),
      blockOf,
      tabSavedMarker,
      insideTab: scope?.insideTab ?? false,
      outputModeOf,
      tabSharedIdVars: scope?.tabSharedIdScope
        ? {
            map: tabVarNames(suffixOf(scope.tabSharedIdScope.tabWidgetId)).sharedIds,
            setMap: tabVarNames(suffixOf(scope.tabSharedIdScope.tabWidgetId)).setSharedIds,
          }
        : undefined,
      crossTab: scope?.insideTab ? CROSS_TAB_PROP_NAMES : undefined,
      insidePopup: scope?.insidePopup ?? false,
      popupCloseFn: scope?.popupScope?.closeFnVar,
      popupExtrasVar: scope?.popupScope?.extrasVar,
      popupOnSavedFn: scope?.popupScope?.onSavedFnVar,
      layerPopupPlans: layerPopupPlansByWidget.get(widget),
    };
    if (!generator) {
      unsupportedSet.add(widget.type);
      blockByWidget.set(widget, buildUnsupportedBlock(widget, suffix));
      return;
    }
    blockByWidget.set(widget, generator(widget, ctx));
  };

  allWidgets.filter((widget) => !widgetsWithChildScope.has(widget)).forEach(generateBlock);
  allWidgets
    .filter((widget) => widgetsWithChildScope.has(widget))
    .slice()
    .sort((a, b) => (depthByWidget.get(b) ?? 0) - (depthByWidget.get(a) ?? 0))
    .forEach(generateBlock);

  const unhandledEntries: WidgetUnhandledEntry[] = [];
  blockByWidget.forEach((block, widget) => {
    const wid = widgetIdOf(widget);
    const suffix = suffixOf(wid);
    (block.unhandled ?? []).forEach((u) => {
      if (u.keys.length === 0) return;
      unhandledEntries.push({ widget: suffix, scope: u.scope, keys: u.keys });
    });
    const hasUnhandled = (block.unhandled ?? []).some((u) => u.keys.length > 0);
    if (hasUnhandled) {
      const summary = (block.unhandled ?? [])
        .filter((u) => u.keys.length > 0)
        .map((u) => `${u.scope}:${u.keys.join(",")}`)
        .join(" / ");
      block.jsxLines.unshift(
        `{/* TODO(파일빌드): 처리되지 않은 설정 값이 있습니다 (${summary}). 필요 시 직접 구현해주세요. */}`
      );
    }
  });

  const allBlocks = [...blockByWidget.values()];
  const rootBlocks = allWidgets
    .filter((w) => {
      const s = scopeByWidget.get(w);
      return !s?.insideTab && !s?.insidePopup;
    })
    .map((w) => blockByWidget.get(w))
    .filter((b): b is WidgetCodeBlock => !!b);

  const recordLoadedAvailable = rootBlocks.some((b) => !!b.emitsRecordLoaded);
  const rootEmit = emitGridItems(rootGrid, blockOf, 3, { varName: "Root", suffixOf, recordLoadedAvailable });

  const pageImports: ImportRequirement[] = [];
  const pageStateLines: string[] = [];
  const hasPageTitle = !!(options.pageTitleMsgKey || options.pageTitle);
  if (hasPageTitle) {
    pageImports.push({ module: "@/store/use-page-title-store", named: ["usePageTitleStore"] });
    pageStateLines.push(`${ind(1)}const setPageTitle = usePageTitleStore((s) => s.setPageTitle);`);
    if (options.pageTitleMsgKey) {
      pageImports.push({ module: "@/hooks/use-i18n", named: ["useI18n"] });
      pageStateLines.push(`${ind(1)}const { t } = useI18n();`);
      pageStateLines.push(
        `${ind(1)}useEffect(() => { setPageTitle(t(${jsStringLiteral(options.pageTitleMsgKey)})); }, [setPageTitle, t]);`
      );
    } else {
      pageStateLines.push(
        `${ind(1)}useEffect(() => { setPageTitle(${jsStringLiteral(options.pageTitle ?? "")}); }, [setPageTitle]);`
      );
    }
  }
  if (rootLeaveCheckNames.length > 0) {
    pageImports.push({
      module: "@/app/admin/templates/make/_shared/hooks/useLeaveCheck",
      named: ["useLeaveCheck"],
    });
    pageStateLines.push(
      `${ind(1)}const { ${rootLeaveCheckNames.join(", ")} } = useLeaveCheck(${options.leaveCheck ? "true" : "false"});`
    );
  }

  const collectedImports = [...pageImports, ...allBlocks.flatMap((b) => b.imports), ...rootEmit.imports];
  const reactNamed = new Set<string>(["useState", "useEffect"]);
  collectedImports
    .filter((r) => r.module === "react")
    .forEach((r) => (r.named ?? []).forEach((n) => reactNamed.add(n)));
  const mergedImports = mergeImports(collectedImports.filter((r) => r.module !== "react"));
  const helperLines = dedupeHelperChunks([...rootBlocks.flatMap((b) => b.helperLines), ...rootEmit.helperLines]);
  const stateLines = dedupeLines([...pageStateLines, ...rootBlocks.flatMap((b) => b.stateLines)]);
  const handlerLines = [...rootBlocks.flatMap((b) => b.handlerLines), ...rootEmit.tailLines];

  const REACT_HOOK_ORDER = ["useState", "useEffect", "useMemo", "useCallback", "useRef", "useId"];
  const reactNamedOrdered = [
    ...REACT_HOOK_ORDER.filter((n) => reactNamed.has(n)),
    ...[...reactNamed].filter((n) => !REACT_HOOK_ORDER.includes(n)).sort(),
  ];

  const lines: string[] = [];
  lines.push("'use client';");
  lines.push("");
  lines.push(`import React, { ${reactNamedOrdered.join(", ")} } from 'react';`);
  lines.push("import { GridCell, ROW_HEIGHT, GAP_SIZE } from '@/components/layout/grid-cell';");
  const emittedBody = [...helperLines, ...stateLines, ...handlerLines, ...rootEmit.jsxLines];
  if (emittedBody.some((l) => l.includes("PageGridContainer"))) {
    lines.push("import { PageGridContainer } from '@/components/layout/page-grid-container';");
  }
  lines.push("import PageLayout from '@/components/layout/page-layout';");
  buildImportLines(mergedImports).forEach((l) => lines.push(l));
  lines.push("");
  if (helperLines.length > 0) {
    helperLines.forEach((l) => lines.push(l));
    lines.push("");
  }
  lines.push(`export default function ${componentName}() {`);
  stateLines.forEach((l) => lines.push(l));
  if (stateLines.length > 0) lines.push("");
  handlerLines.forEach((l) => lines.push(l));
  if (handlerLines.length > 0) lines.push("");
  lines.push(`${ind(1)}return (`);
  lines.push(`${ind(2)}<PageLayout mode="live">`);
  rootEmit.jsxLines.forEach((l) => lines.push(l));
  lines.push(`${ind(2)}</PageLayout>`);
  lines.push(`${ind(1)});`);
  lines.push("}");

  return { tsxCode: lines.join("\n"), unsupported: [...unsupportedSet], unhandled: unhandledEntries, blocked };
};
