import type { AnyWidget } from "../components/renderer/types";
import type { PageWidgetItem } from "../components/renderer/PageGridRenderer";
import { generateSearchBlock } from "./widget/searchBlock";
import { generateTableBlock } from "./widget/tableBlock";
import { generateSpaceBlock } from "./widget/spaceBlock";
import { generateFormBlock } from "./widget/formBlock";
import { generateMultiSelectBlock } from "./widget/multiselectBlock";
import { normalizeFormItemRowSpans, packedRowLayout } from "../utils/formGridLayout";
import { getSpaceGridColumn } from "../utils";
import {
  rendererContainerClassName,
  rendererContainerOverflow,
  SELECT_ARROW_CLS,
  GENERATED_PAGE_ROOT_CLS,
  GENERATED_UNSUPPORTED_WIDGET_CLS,
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
}

export interface WidgetGenContext {
  suffix: string;
  ind: (n: number) => string;
  allWidgets: PageWidget[];
  suffixOf: (widgetId: string) => string;
  mainConnectedSlug?: string;
  isEntity: boolean;
  contentColSpan: number;
  contentFillHeight: boolean;
  pageSlug?: string;
  leaveCheck: boolean;
  leaveCheckNames: string[];
}

export const GENERATED_PAGE_BASE_CONST = "const GENERATED_PAGE_BASE = '/admin/generated';";

export const formVarNames = (suffix: string) => ({
  widget: `FORM_WIDGET_${suffix}`,
  fields: `FORM_FIELDS_${suffix}`,
  fieldById: `FORM_FIELD_BY_ID_${suffix}`,
  fieldIds: `FORM_FIELD_IDS_${suffix}`,
  keyToId: `FORM_KEY_TO_ID_${suffix}`,
  evalCondition: `evalFieldCondition${suffix}`,
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
  blur: `handleFieldBlur${suffix}`,
  fileChange: `handleFileChange${suffix}`,
  removeExisting: `handleRemoveExisting${suffix}`,
});

export const multiSelectVarNames = (suffix: string) => ({
  widget: `MULTISELECT_WIDGET_${suffix}`,
  ids: `multiSelectIds${suffix}`,
  setIds: `setMultiSelectIds${suffix}`,
});

export const PAGE_VAR = {
  allFormValues: "allFormValues",
  allFieldKeyToId: "allFieldKeyToId",
  writeFormValue: "writeFormValue",
  lastGeneratedRef: "lastGeneratedRef",
  storedId: "storedId",
  urlParams: "urlParams",
  imgBlobUrls: "imgBlobUrls",
  setImgBlobUrls: "setImgBlobUrls",
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
  pageSlug?: string;
  leaveCheck?: boolean;
}

export interface WidgetUnhandledEntry {
  widget: string;
  scope: "widget" | "field" | "column";
  keys: string[];
}

export interface WidgetBuildResult {
  tsxCode: string;
  unsupported: PageWidgetType[];
  unhandled: WidgetUnhandledEntry[];
}

const WIDGET_BLOCK_GENERATORS: Partial<Record<PageWidgetType, WidgetBlockGenerator>> = {
  search: generateSearchBlock as WidgetBlockGenerator,
  table: generateTableBlock as WidgetBlockGenerator,
  space: generateSpaceBlock as WidgetBlockGenerator,
  form: generateFormBlock as WidgetBlockGenerator,
  multiselect: generateMultiSelectBlock as WidgetBlockGenerator,
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

const dedupeHelperChunks = (lines: string[]): string[] => {
  const chunks: string[][] = [];
  lines.forEach((line) => {
    const isBlank = line.trim() === "";
    const startsNewChunk = !isBlank && line === line.trimStart() && !CLOSER_LINE.test(line.trim());
    if (isBlank || startsNewChunk || chunks.length === 0) chunks.push([line]);
    else chunks[chunks.length - 1].push(line);
  });
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
  const hasDirtySource = allWidgets.some((w) => w.type === "form" || w.type === "multiselect");
  const spaceItems = allWidgets
    .filter((w) => w.type === "space")
    .flatMap((w) => (w as { items?: { type?: string; connType?: string }[] }).items ?? []);
  const hasContentAction = spaceItems.some((it) => it.type === "action-button" && it.connType === "content");
  const hasCloseAction = spaceItems.some((it) => it.type === "action-button" && it.connType === "close");
  if (hasDirtySource) names.push("markDirty");
  if (hasContentAction) names.push("markClean");
  if (hasCloseAction) names.push("confirmLeave");
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

export const buildWidgetTsxFile = (items: PageWidgetItem[], options: WidgetBuildOptions = {}): WidgetBuildResult => {
  const componentName = options.componentName || "GeneratedPage";
  const isEntity = options.isEntity ?? false;

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

  const pageLevelLayout = packedRowLayout(
    normalizedItems.map(({ colSpan, rowSpan }) => ({ colSpan, rowSpan })),
    12,
    false
  );
  const itemAutoHeightFlags = normalizedItems.map((item, idx) => {
    const rowIsAuto = item.rowIsAuto;
    if (!rowIsAuto || rowIsAuto.length === 0) return false;
    if (!rowIsAuto[rowIsAuto.length - 1]) return false;
    const lastRow = pageLevelLayout.lastRow[idx];
    const startRow = lastRow - item.rowSpan + 1;
    for (let r = startRow; r <= lastRow; r++) {
      const owners = pageLevelLayout.owners[r] ?? [];
      if (owners.length !== 1 || owners[0] !== idx) return false;
    }
    return true;
  });

  const allWidgets: PageWidget[] = normalizedItems.flatMap((item) => item.contents.map((c) => c.widget));

  const contentColSpanByWidget = new Map<PageWidget, number>();
  const contentFillHeightByWidget = new Map<PageWidget, boolean>();
  normalizedItems.forEach((item) => {
    item.contents.forEach((c, contentIdx) => {
      contentColSpanByWidget.set(c.widget, c.colSpan);
      const isAutoTrailing = item.contentAutoTrailing?.[contentIdx] ?? false;
      contentFillHeightByWidget.set(c.widget, !isAutoTrailing);
    });
  });

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

  const leaveCheckNames = collectLeaveCheckNames(allWidgets);

  allWidgets.forEach((widget) => {
    const wid = widgetIdOf(widget);
    const suffix = suffixOf(wid);
    const generator = WIDGET_BLOCK_GENERATORS[widget.type];
    const ctx: WidgetGenContext = {
      suffix,
      ind,
      allWidgets,
      suffixOf,
      mainConnectedSlug: options.mainConnectedSlug,
      isEntity,
      contentColSpan: contentColSpanByWidget.get(widget) ?? 12,
      contentFillHeight: contentFillHeightByWidget.get(widget) ?? true,
      pageSlug: options.pageSlug,
      leaveCheck: options.leaveCheck ?? false,
      leaveCheckNames,
    };
    if (!generator) {
      unsupportedSet.add(widget.type);
      blockByWidget.set(widget, buildUnsupportedBlock(widget, suffix));
      return;
    }
    blockByWidget.set(widget, generator(widget, ctx));
  });

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
  if (leaveCheckNames.length > 0) {
    pageImports.push({
      module: "@/app/admin/templates/make/_shared/hooks/useLeaveCheck",
      named: ["useLeaveCheck"],
    });
    pageStateLines.push(
      `${ind(1)}const { ${leaveCheckNames.join(", ")} } = useLeaveCheck(${options.leaveCheck ? "true" : "false"});`
    );
  }

  const collectedImports = [...pageImports, ...allBlocks.flatMap((b) => b.imports)];
  const reactNamed = new Set<string>(["useState", "useEffect"]);
  collectedImports
    .filter((r) => r.module === "react")
    .forEach((r) => (r.named ?? []).forEach((n) => reactNamed.add(n)));
  const mergedImports = mergeImports(collectedImports.filter((r) => r.module !== "react"));
  const helperLines = dedupeHelperChunks(allBlocks.flatMap((b) => b.helperLines));
  const stateLines = dedupeLines([...pageStateLines, ...allBlocks.flatMap((b) => b.stateLines)]);
  const handlerLines = allBlocks.flatMap((b) => b.handlerLines);

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
  lines.push("import { PageGridContainer } from '@/components/layout/page-grid-container';");
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
  lines.push(`${ind(2)}<div className=${jsStringLiteral(GENERATED_PAGE_ROOT_CLS)}>`);
  lines.push(`${ind(3)}<PageGridContainer>`);
  normalizedItems.forEach((item, itemIdx) => {
    const autoHeightAttr = itemAutoHeightFlags[itemIdx] ? " autoHeight" : "";
    lines.push(`${ind(4)}<GridCell colSpan={${item.colSpan}} rowSpan={${item.rowSpan}}${autoHeightAttr}>`);

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
    lines.push(`${ind(5)}<div style={{ display: 'grid', ${styleParts.join(", ")} }}>`);

    item.contents.forEach((content, contentIdx) => {
      const block = blockByWidget.get(content.widget) ?? {
        imports: [],
        helperLines: [],
        stateLines: [],
        handlerLines: [],
        jsxLines: [],
      };
      const isAutoTrailing = item.contentAutoTrailing?.[contentIdx] ?? false;
      const colSpanClamped = Math.min(content.colSpan, item.colSpan);
      const gridColumnValue =
        content.widget.type === "space"
          ? getSpaceGridColumn(content.widget.align, colSpanClamped, item.colSpan)
          : `span ${colSpanClamped}`;
      const heightExpr = "`${" + content.rowSpan + " * ROW_HEIGHT - GAP_SIZE}px`";
      const heightPart = isAutoTrailing ? "" : `, height: ${heightExpr}`;
      lines.push(
        `${ind(6)}<div style={{ gridColumn: '${gridColumnValue}', gridRow: 'span ${content.rowSpan}'${heightPart} }}>`
      );
      block.jsxLines.forEach((l) => lines.push(ind(7) + l));
      lines.push(`${ind(6)}</div>`);
    });
    lines.push(`${ind(5)}</div>`);
    lines.push(`${ind(4)}</GridCell>`);
  });
  lines.push(`${ind(3)}</PageGridContainer>`);
  lines.push(`${ind(2)}</div>`);
  lines.push(`${ind(1)});`);
  lines.push("}");

  return { tsxCode: lines.join("\n"), unsupported: [...unsupportedSet], unhandled: unhandledEntries };
};
