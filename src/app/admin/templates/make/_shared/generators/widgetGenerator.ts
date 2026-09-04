import type { AnyWidget } from "../components/renderer/types";
import type { PageWidgetItem } from "../components/renderer/PageGridRenderer";
import { generateSearchBlock } from "./widget/searchBlock";
import { generateTableBlock } from "./widget/tableBlock";
import { generateSpaceBlock } from "./widget/spaceBlock";
import { normalizeFormItemRowSpans, packedRowLayout } from "../utils/formGridLayout";
import { getSpaceGridColumn } from "../utils";
import { rendererContainerClassName, rendererContainerOverflow } from "../components/renderer/rendererStyles";

export type PageWidget = AnyWidget;
export type PageWidgetType = AnyWidget["type"];

export interface ImportRequirement {
  module: string;
  named?: string[];
  defaultName?: string;
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
}

export type WidgetBlockGenerator = (widget: PageWidget, ctx: WidgetGenContext) => WidgetCodeBlock;

export interface WidgetBuildOptions {
  pageTitle?: string;
  mainConnectedSlug?: string;
  componentName?: string;
  isEntity?: boolean;
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
    styleParts.push(`display: 'grid'`);
    styleParts.push(`gridTemplateColumns: 'repeat(${o.contentColSpan}, 1fr)'`);
    if (o.rowIsAuto && o.rowIsAuto.length > 0) {
      const rowTracks = o.rowIsAuto.map((auto) => (auto ? "auto" : "${ROW_HEIGHT - GAP_SIZE}px")).join(" ");
      styleParts.push("gridTemplateRows: `" + rowTracks + "`");
    }
    styleParts.push("gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`");
    styleParts.push("rowGap: `${GAP_SIZE}px`");
    styleParts.push("columnGap: `${GAP_SIZE}px`");
  }
  return `<div className=${jsStringLiteral(cls)} style={{ ${styleParts.join(", ")} }}>`;
};

export const emitContainerClose = (): string => "</div>";

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

const mergeImports = (all: ImportRequirement[]): ImportRequirement[] => {
  const map = new Map<string, ImportRequirement>();
  all.forEach((req) => {
    const existing = map.get(req.module);
    if (!existing) {
      map.set(req.module, {
        module: req.module,
        named: req.named ? [...new Set(req.named)] : undefined,
        defaultName: req.defaultName,
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
    if (req.defaultName && req.named && req.named.length > 0) {
      return `import ${req.defaultName}, { ${req.named.join(", ")} } from '${req.module}';`;
    }
    if (req.defaultName) return `import ${req.defaultName} from '${req.module}';`;
    return `import { ${(req.named ?? []).join(", ")} } from '${req.module}';`;
  });

const widgetIdOf = (widget: PageWidget): string => widget.widgetId;

const buildUnsupportedBlock = (widget: PageWidget, suffix: string): WidgetCodeBlock => {
  const label = TYPE_LABEL[widget.type] ?? widget.type;
  return {
    imports: [],
    helperLines: [],
    stateLines: [],
    handlerLines: [],
    jsxLines: [
      `{/* TODO(파일빌드 Phase 2): ${label}(${widget.type}) 위젯은 아직 코드 생성이 지원되지 않습니다. 빌더 화면에서 확인 후 직접 구현해주세요. (widgetId: ${widgetIdOf(widget) || suffix}) */}`,
      '<div className="border border-dashed border-slate-300 rounded-md p-4 text-xs text-slate-400 text-center">',
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
  const mergedImports = mergeImports(allBlocks.flatMap((b) => b.imports));
  const helperLines = dedupeLines(allBlocks.flatMap((b) => b.helperLines));
  const stateLines = dedupeLines(allBlocks.flatMap((b) => b.stateLines));
  const handlerLines = allBlocks.flatMap((b) => b.handlerLines);

  const lines: string[] = [];
  lines.push("'use client';");
  lines.push("");
  lines.push("import React, { useState, useEffect } from 'react';");
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
  lines.push(`${ind(2)}<div className="space-y-3">`);
  if (options.pageTitle) {
    lines.push(
      `${ind(3)}<h1 className="text-lg font-bold text-slate-900">{${jsStringLiteral(options.pageTitle)}}</h1>`
    );
  }
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
