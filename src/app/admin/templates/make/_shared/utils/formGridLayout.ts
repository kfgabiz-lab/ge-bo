import { ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import {
  FORM_CONTENT_PADDING_TOP,
  FORM_FIELD_ROW_HEIGHT,
  FORM_FIELD_GAP,
  FIELD_CONTROL_HEIGHT_PX,
  FIELD_LABEL_HEIGHT_PX,
  FIELD_DESC_HEIGHT_PX,
  FIELD_TEXT_LINE_HEIGHT_PX,
  TAB_CHROME_ROWS,
} from "../styles";
import { getSpaceGridColumnStart } from "../utils";
import type { FormWidget } from "../components/builder/FormBuilder";
import type { FormFieldItem } from "../components/builder/FormBuilder";
import type { TableWidget } from "../components/builder/TableBuilder";
import type { SpaceWidget, TabWidget } from "../components/renderer/types";

export interface GridSizedItem {
  colSpan: number;
  rowSpan: number;
  colStart?: number;
}

type FormLikeWidget = { type: string; align?: "left" | "center" | "right" } & Partial<
  Pick<FormWidget, "fields" | "title" | "titleMsgKey" | "description" | "descriptionMsgKey">
> &
  Partial<Pick<SpaceWidget, "items">> &
  Partial<Pick<TabWidget, "tabs">> &
  Partial<Pick<TableWidget, "displayMode">>;

export function isWidgetAutoEligible(widget: FormLikeWidget): boolean {
  if (widget.type === "form" || widget.type === "space") return true;
  if (widget.type === "tab") return true;
  if (widget.type === "table") return (widget.displayMode ?? "pagination") !== "scroll";
  return false;
}

export interface NormalizableFormContent {
  id?: string;
  colSpan: number;
  rowSpan: number;
  widget: FormLikeWidget;
}

export interface FormVisibilityContext {
  visibleFieldIds: Set<string>;
  maxRowSpanByContentId?: Map<string, number>;
  tabContentRowsByContentId?: Map<string, number>;
  activeTabIndexByContentId?: Map<string, number>;
}

export interface PackedLayout {
  maxRow: number;
  rowIsAuto: boolean[];
  itemAutoTrailing: boolean[];
  firstRow: number[];
  lastRow: number[];
  owners: number[][];
}

export function packedRowLayout(items: GridSizedItem[], columns: number, dense: boolean): PackedLayout {
  const cols = Math.max(1, Math.floor(columns) || 1);
  const occupied: boolean[][] = [];
  const owners: Set<number>[] = [];

  const rowCells = (row: number): boolean[] => {
    if (!occupied[row]) occupied[row] = new Array(cols).fill(false);
    return occupied[row];
  };

  const rowOwners = (row: number): Set<number> => {
    if (!owners[row]) owners[row] = new Set();
    return owners[row];
  };

  const canPlace = (row: number, col: number, colSpan: number, rowSpan: number): boolean => {
    if (col + colSpan > cols) return false;
    for (let r = row; r < row + rowSpan; r++) {
      const cells = rowCells(r);
      for (let c = col; c < col + colSpan; c++) {
        if (cells[c]) return false;
      }
    }
    return true;
  };

  const place = (row: number, col: number, colSpan: number, rowSpan: number, idx: number): void => {
    for (let r = row; r < row + rowSpan; r++) {
      const cells = rowCells(r);
      for (let c = col; c < col + colSpan; c++) cells[c] = true;
      rowOwners(r).add(idx);
    }
  };

  let cursorRow = 0;
  let cursorCol = 0;
  let maxRow = 0;
  const firstRow: number[] = [];
  const lastRow: number[] = [];

  items.forEach((item, idx) => {
    const colSpan = Math.min(Math.max(1, Math.floor(item.colSpan) || 1), cols);
    const rowSpan = Math.max(1, Math.floor(item.rowSpan) || 1);
    const startRow = dense ? 0 : cursorRow;
    const startCol = dense ? 0 : cursorCol;
    const explicitCol =
      item.colStart != null ? Math.max(0, Math.min(cols - colSpan, Math.floor(item.colStart) - 1)) : null;

    let placedRow = -1;
    let placedCol = -1;
    for (let row = startRow; placedRow === -1; row++) {
      if (explicitCol !== null) {
        if (canPlace(row, explicitCol, colSpan, rowSpan)) {
          placedRow = row;
          placedCol = explicitCol;
        }
        continue;
      }
      const colFrom = !dense && row === startRow ? startCol : 0;
      for (let col = colFrom; col <= cols - colSpan; col++) {
        if (canPlace(row, col, colSpan, rowSpan)) {
          placedRow = row;
          placedCol = col;
          break;
        }
      }
    }

    place(placedRow, placedCol, colSpan, rowSpan, idx);
    if (!dense) {
      cursorRow = placedRow;
      cursorCol = placedCol + colSpan;
    }
    maxRow = Math.max(maxRow, placedRow + rowSpan);
    firstRow[idx] = placedRow;
    lastRow[idx] = placedRow + rowSpan - 1;
  });

  /* 소유자 1명뿐인 행 — 그 아이템의 마지막 행이면 auto (기존 로직, 동작 그대로 유지) */
  const rowIsAuto: boolean[] = [];
  for (let r = 0; r < maxRow; r++) {
    const rowOwnerSet = owners[r];
    if (rowOwnerSet && rowOwnerSet.size === 1) {
      const idx = Array.from(rowOwnerSet)[0];
      rowIsAuto[r] = lastRow[idx] === r;
    } else {
      rowIsAuto[r] = false;
    }
  }

  /* 닫힌 블록(closed block) 규칙 — 2행 이상 구간에서 소유자 집합이 완전히 동일하고
       그 소유자 전원이 정확히 그 구간(첫 행~끝 행)에서만 존재한다면 구간 전체를 auto 처리한다.
       (예: colSpan4 필드와 colSpan8 필드가 나란히 배치되어 같은 3개 행을 공유할 때,
        두 필드 모두 그 3개 행에서 시작해 그 3개 행에서 끝나면 셋 다 auto) */
  const ownerSetKey = (s: Set<number> | undefined): string =>
    s && s.size > 0
      ? Array.from(s)
          .sort((a, b) => a - b)
          .join(",")
      : "";

  let runStart = 0;
  for (let r = 1; r <= maxRow; r++) {
    const sameAsRunStart = r < maxRow && ownerSetKey(owners[r]) === ownerSetKey(owners[runStart]);
    if (sameAsRunStart) continue;

    const runEnd = r - 1;
    const ownerSet = owners[runStart];
    if (ownerSet && ownerSet.size > 0 && runEnd > runStart) {
      const isClosedBlock = Array.from(ownerSet).every((idx) => firstRow[idx] === runStart && lastRow[idx] === runEnd);
      if (isClosedBlock) {
        for (let rr = runStart; rr <= runEnd; rr++) rowIsAuto[rr] = true;
      }
    }
    runStart = r;
  }

  const itemAutoTrailing: boolean[] = items.map((_, idx) => rowIsAuto[lastRow[idx]] ?? false);
  const ownersArr: number[][] = [];
  for (let r = 0; r < maxRow; r++) {
    ownersArr[r] = owners[r] ? Array.from(owners[r]) : [];
  }

  return { maxRow, rowIsAuto, itemAutoTrailing, firstRow, lastRow, owners: ownersArr };
}

export function packedRowCount(items: GridSizedItem[], columns: number, dense: boolean): number {
  return packedRowLayout(items, columns, dense).maxRow;
}

function rowSpanForContentHeight(heightPx: number, rowPitch: number, gap: number): number {
  return Math.max(1, Math.ceil((heightPx + gap) / rowPitch));
}

const AUTO_SAFE_CONTROL_HEIGHT: Record<string, number> = {
  input: FIELD_CONTROL_HEIGHT_PX,
  select: FIELD_CONTROL_HEIGHT_PX,
  date: FIELD_CONTROL_HEIGHT_PX,
  yearMonth: FIELD_CONTROL_HEIGHT_PX,
  dateRange: FIELD_CONTROL_HEIGHT_PX,
  yearMonthRange: FIELD_CONTROL_HEIGHT_PX,
  time: FIELD_CONTROL_HEIGHT_PX,
  address: FIELD_CONTROL_HEIGHT_PX,
  radio: FIELD_LABEL_HEIGHT_PX,
  checkbox: FIELD_LABEL_HEIGHT_PX,
  dateRangeStatus: FIELD_LABEL_HEIGHT_PX,
  hidden: 0,
};

function isAutoSafeField(field: FormFieldItem): boolean {
  return field.type in AUTO_SAFE_CONTROL_HEIGHT || field.type === "text";
}

function fieldNaturalHeight(field: FormFieldItem): number {
  const chrome =
    (field.label || field.labelMsgKey ? FIELD_LABEL_HEIGHT_PX : 0) +
    (field.description || field.descriptionMsgKey ? FIELD_DESC_HEIGHT_PX : 0);
  if (field.type === "text") {
    if (field.fetchDisplayMode === "MULTI_LINE") {
      const declaredRows = Math.max(1, Math.floor(field.rowSpan) || 1);
      const contentHeight = chrome + declaredRows * FIELD_TEXT_LINE_HEIGHT_PX;
      return Math.max(0, contentHeight - (declaredRows - 1) * FORM_FIELD_ROW_HEIGHT);
    }
    return chrome + FIELD_LABEL_HEIGHT_PX;
  }
  return chrome + AUTO_SAFE_CONTROL_HEIGHT[field.type];
}

function buildFieldRowBreakdown(
  fields: FormFieldItem[],
  contentColSpan: number,
  hasTitleBlock: boolean,
  fieldRowPitch: number
) {
  const cols = Math.max(1, contentColSpan);
  const items: GridSizedItem[] = fields.map((f) => ({
    colSpan: Math.min(f.colSpan, cols),
    rowSpan: f.rowSpan,
  }));
  if (hasTitleBlock) items.unshift({ colSpan: cols, rowSpan: 1 });

  const layout = packedRowLayout(items, cols, false);
  const fixedRowHeight = fieldRowPitch - FORM_FIELD_GAP;
  const rowIsAuto = new Array(layout.maxRow).fill(false);
  const rowHeightPx = new Array(layout.maxRow).fill(fixedRowHeight);

  const naturalHeightOf = (itemIdx: number): number | null => {
    const isTitleItem = hasTitleBlock && itemIdx === 0;
    if (isTitleItem) return null;
    const field = fields[hasTitleBlock ? itemIdx - 1 : itemIdx];
    if (!field || !isAutoSafeField(field)) return null;
    return fieldNaturalHeight(field);
  };

  for (let r = 0; r < layout.maxRow; r++) {
    const ownerIdxs = layout.owners[r] ?? [];
    if (ownerIdxs.length === 0) continue;

    if (ownerIdxs.every((idx) => layout.lastRow[idx] === r)) {
      const heights = ownerIdxs.map(naturalHeightOf);
      if (heights.some((h) => h === null)) continue;

      rowIsAuto[r] = true;
      rowHeightPx[r] = Math.max(...(heights as number[]));
      continue;
    }

    /* 이 행이 마지막 행은 아니지만, 여러 행에 걸친 필드 하나가 이 행을 단독으로 차지한다면
           그 필드의 자연 높이는 이미 마지막 행에 전부 배분되므로 이 행은 0으로 auto 처리해도 안전하다
           (필드 하나가 grid-area로 여러 행을 통째로 차지 — CSS가 두 auto 트랙을 합쳐서 자연 높이로 렌더) */
    if (ownerIdxs.length === 1 && naturalHeightOf(ownerIdxs[0]) !== null) {
      rowIsAuto[r] = true;
      rowHeightPx[r] = 0;
    }
  }

  return { rows: layout.maxRow, rowIsAuto, rowHeightPx };
}

export function calculateFormFieldRowTracks(
  fields: FormFieldItem[],
  contentColSpan: number,
  hasTitleBlock: boolean
): boolean[] {
  return buildFieldRowBreakdown(fields, contentColSpan, hasTitleBlock, FORM_FIELD_ROW_HEIGHT).rowIsAuto;
}

function buildSpaceItemBreakdown(
  items: { colSpan?: number; rowSpan?: number }[],
  cols: number
): { rows: number; rowIsAuto: boolean[] } {
  const c = Math.max(1, cols);
  const gridItems: GridSizedItem[] = items.map((f) => ({
    colSpan: Math.min(Math.max(1, Math.floor(f.colSpan ?? 1) || 1), c),
    rowSpan: Math.max(1, Math.floor(f.rowSpan ?? 1) || 1),
  }));
  const layout = packedRowLayout(gridItems, c, false);
  return { rows: layout.maxRow, rowIsAuto: layout.rowIsAuto };
}

export function calculateSpaceItemRowTracks(
  items: { colSpan?: number; rowSpan?: number }[],
  contentColSpan: number
): boolean[] {
  return buildSpaceItemBreakdown(items, contentColSpan).rowIsAuto;
}

function calculateSpaceContentRowSpan(items: { colSpan?: number; rowSpan?: number }[], colSpan: number): number {
  return buildSpaceItemBreakdown(items, colSpan).rows;
}

export function calculateFormContentRowSpan(
  fields: FormFieldItem[],
  contentColSpan: number,
  hasTitleBlock: boolean,
  fieldRowPitch: number = ROW_HEIGHT
): number {
  const breakdown = buildFieldRowBreakdown(fields, contentColSpan, hasTitleBlock, fieldRowPitch);
  let heightPx = breakdown.rowHeightPx.reduce((sum, h) => sum + h, 0);
  heightPx += Math.max(0, breakdown.rows - 1) * FORM_FIELD_GAP;
  heightPx += FORM_CONTENT_PADDING_TOP * 2;
  return rowSpanForContentHeight(heightPx, ROW_HEIGHT, GAP_SIZE);
}

export function calculateWidgetItemRowSpan(contents: GridSizedItem[], itemColSpan: number): number {
  return packedRowCount(contents, Math.max(1, itemColSpan), true);
}

function toGridSizedItems<T extends NormalizableFormContent>(contents: T[], cols: number): GridSizedItem[] {
  return contents.map((c) => {
    const colSpan = Math.min(Math.max(1, Math.floor(c.colSpan) || 1), cols);
    const colStart =
      c.widget.type === "space" && c.widget.align && c.widget.align !== "left"
        ? getSpaceGridColumnStart(c.widget.align, colSpan, cols)
        : undefined;
    return { colSpan, rowSpan: c.rowSpan, colStart };
  });
}

function ratchetRowSpan(map: Map<string, number> | undefined, key: string | undefined, value: number): number {
  if (!map || !key) return value;
  const prevMax = map.get(key) ?? value;
  const nextMax = Math.max(value, prevMax);
  map.set(key, nextMax);
  return nextMax;
}

function withNormalizedFormContentRowSpan<T extends NormalizableFormContent>(
  content: T,
  visibility?: FormVisibilityContext
): T {
  if (content.widget.type === "form" && content.widget.fields) {
    const hasTitleBlock = !!(content.widget.title || content.widget.titleMsgKey);
    const worstCase = calculateFormContentRowSpan(
      content.widget.fields,
      content.colSpan,
      hasTitleBlock,
      FORM_FIELD_ROW_HEIGHT
    );

    if (!visibility) {
      return worstCase === content.rowSpan ? content : { ...content, rowSpan: worstCase };
    }

    const visibleFields = content.widget.fields.filter((f) => visibility.visibleFieldIds.has(f.id));
    const visible = calculateFormContentRowSpan(visibleFields, content.colSpan, hasTitleBlock, FORM_FIELD_ROW_HEIGHT);
    const rowSpan = ratchetRowSpan(visibility.maxRowSpanByContentId, content.id, visible);

    return rowSpan === content.rowSpan ? content : { ...content, rowSpan };
  }

  if (content.widget.type === "space" && content.widget.items) {
    const rowSpan = calculateSpaceContentRowSpan(content.widget.items, content.colSpan);
    return rowSpan === content.rowSpan ? content : { ...content, rowSpan };
  }

  if (content.widget.type === "tab" && content.widget.tabs?.length) {
    if (visibility) {
      const measuredRows = content.id ? visibility.tabContentRowsByContentId?.get(content.id) : undefined;
      if (measuredRows && measuredRows > 0) {
        return measuredRows === content.rowSpan ? content : { ...content, rowSpan: measuredRows };
      }

      const activeIdx = (content.id ? visibility.activeTabIndexByContentId?.get(content.id) : undefined) ?? 0;
      const fallbackContentRows =
        content.widget.tabs[activeIdx]?.contentRowSpan ?? content.widget.tabs[0]?.contentRowSpan ?? 0;
      if (fallbackContentRows > 0) {
        const rowSpan = fallbackContentRows + TAB_CHROME_ROWS;
        return rowSpan === content.rowSpan ? content : { ...content, rowSpan };
      }

      return content;
    }

    const maxContentRows = Math.max(...content.widget.tabs.map((t) => t.contentRowSpan ?? 0));
    if (maxContentRows <= 0) return content;
    const rowSpan = maxContentRows + TAB_CHROME_ROWS;
    return rowSpan === content.rowSpan ? content : { ...content, rowSpan };
  }

  return content;
}

export function normalizeFormItemRowSpans<T extends NormalizableFormContent>(
  itemColSpan: number,
  itemRowSpan: number,
  contents: T[],
  visibility?: FormVisibilityContext
): { contents: T[]; rowSpan: number; rowIsAuto: boolean[]; contentAutoTrailing: boolean[] } {
  const hasForm = contents.some((c) => c.widget.type === "form" && !!c.widget.fields?.length);
  const hasSpace = contents.some((c) => c.widget.type === "space" && !!c.widget.items?.length);
  const hasTab = contents.some((c) => c.widget.type === "tab" && !!c.widget.tabs?.length);
  const hasTable = contents.some((c) => c.widget.type === "table");
  const hasResizableContent = hasForm || hasSpace || hasTab || hasTable;
  if (!hasResizableContent)
    return { contents, rowSpan: itemRowSpan, rowIsAuto: [], contentAutoTrailing: contents.map(() => false) };

  const normalizedContents = contents.map((c) => withNormalizedFormContentRowSpan(c, visibility));
  const cols = Math.max(1, itemColSpan);
  const gridItems = toGridSizedItems(normalizedContents, cols);
  const layout = packedRowLayout(gridItems, itemColSpan, true);

  const isAutoEligible = (idx: number): boolean => isWidgetAutoEligible(normalizedContents[idx].widget);

  /* 행 하나를 여러 컨텐츠가 공유할 때, 그중 하나라도 화이트리스트 밖 타입이면
       그 행은 auto 대상에서 제외한다 (packedRowLayout의 rowIsAuto는 타입을 모르는 순수 기하 계산이므로
       여기서 타입 정보로 한 번 더 걸러낸다) */
  const rowIsAuto = layout.rowIsAuto.map((auto, r) => {
    if (!auto) return false;
    const ownerIdxs = layout.owners[r] ?? [];
    return ownerIdxs.length > 0 && ownerIdxs.every(isAutoEligible);
  });

  const contentAutoTrailing = normalizedContents.map((_, idx) =>
    isAutoEligible(idx) ? (rowIsAuto[layout.lastRow[idx]] ?? false) : false
  );

  return {
    contents: normalizedContents,
    rowSpan: layout.maxRow,
    rowIsAuto,
    contentAutoTrailing,
  };
}
