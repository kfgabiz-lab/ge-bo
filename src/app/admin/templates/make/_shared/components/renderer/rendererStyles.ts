import type { MultiSelectExtraFieldType } from "./types";

export function rendererContainerClassName(fillHeight: boolean, showBorder: boolean, extraClassName: string): string {
  const borderCls = showBorder ? "border border-slate-200" : "";
  return [fillHeight ? "h-full w-full rounded" : "w-full rounded", borderCls, extraClassName].filter(Boolean).join(" ");
}

export function rendererContainerOverflow(clipOverflow: boolean): "clip" | "visible" {
  return clipOverflow ? "clip" : "visible";
}

export const TABLE_CONTAINER_CLS = "bg-white";
export const TABLE_COUNT_BAR_CLS =
  "flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-100";
export const TABLE_COUNT_TOTAL_CLS = "text-xs text-slate-500";
export const TABLE_COUNT_RANGE_CLS = "text-xs text-slate-400";
export const TABLE_SCROLL_WRAP_CLS = "overflow-x-auto";
export const TABLE_CLS = "w-full text-sm";
export const TABLE_HEADER_ROW_CLS = "border-b border-slate-200 bg-slate-50/80";
export const TABLE_STATE_CELL_CLS = "py-16 text-center";
export const TABLE_EMPTY_CELL_CLS = "py-16 text-center text-sm text-slate-400";
export const TABLE_THEAD_CLS = "sticky top-0 z-10";
export const TABLE_HEADER_CELL_CLS = "px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap";
export const TABLE_HEADER_STATIC_TEXT_CLS = "flex items-center justify-center gap-1";
export const TABLE_TD_CLS = "px-4 py-3 max-w-[200px] overflow-hidden";
export const TABLE_TR_CLS = "border-b border-slate-100 last:border-0 transition-all hover:bg-slate-50/50";

export const TABLE_SELECT_HEADER_CELL_CLS =
  "w-10 px-2 py-3 text-center flex-shrink-0 sticky left-0 z-20 bg-slate-50/80";
export const TABLE_SELECT_HEADER_CHECKBOX_CLS =
  "w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer disabled:cursor-default";
export const TABLE_SELECT_PREVIEW_CELL_CLS = "w-10 px-2 py-3 text-center sticky left-0 bg-white";
export const TABLE_SELECT_PREVIEW_CHECKBOX_CLS = "w-3.5 h-3.5 rounded border-slate-300 cursor-default";
export const TABLE_SELECT_BODY_CELL_CLS = "w-10 px-2 py-3 text-center sticky left-0 bg-inherit";
export const TABLE_SELECT_CHECKBOX_CLS = "w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer";

export function tableSelectableRowClass(isSelected: boolean, hasRowClick: boolean): string {
  return `border-b border-slate-100 last:border-0 transition-all ${isSelected ? "bg-slate-50" : "hover:bg-slate-50/50"}${hasRowClick ? " cursor-pointer" : ""}`;
}

export function tableSortButtonClass(isPreview: boolean): string {
  return `flex items-center justify-center gap-1 w-full transition-colors ${isPreview ? "cursor-default" : "hover:text-slate-900"}`;
}

export function sortIconClass(sorted: "asc" | "desc" | false): string {
  return sorted === false ? "w-3.5 h-3.5 text-gray-300" : "w-3.5 h-3.5 text-blue-500";
}

export const PAGER_WRAP_CLS =
  "flex-shrink-0 flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100";
export const PAGER_NAV_BTN_CLS =
  "px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all";

export function pagerNumberBtnClass(active: boolean): string {
  return `px-2.5 py-1.5 text-xs rounded border transition-all ${
    active ? "bg-slate-900 text-white border-slate-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
  }`;
}

export const BADGE_CLS: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  blue: "bg-blue-50 text-blue-700 border border-blue-200",
  amber: "bg-amber-50 text-amber-700 border border-amber-200",
  red: "bg-red-50 text-red-700 border border-red-200",
  purple: "bg-purple-50 text-purple-700 border border-purple-200",
  slate: "bg-slate-100 text-slate-600 border border-slate-200",
  pink: "bg-pink-50 text-pink-700 border border-pink-200",
  sky: "bg-sky-50 text-sky-700 border border-sky-200",
};

export const BADGE_DOT: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  purple: "bg-purple-500",
  slate: "bg-slate-500",
  pink: "bg-pink-500",
  sky: "bg-sky-500",
};

export function badgeShapeClass(badgeShape: "round" | "square" | undefined): string {
  return badgeShape === "square" ? "rounded" : "rounded-full";
}

export const BADGE_BASE_CLS = "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium";
export const BADGE_DOT_BASE_CLS = "w-1.5 h-1.5 rounded-full";

export function booleanCellClass(boolVal: boolean): string {
  return `text-sm truncate block ${boolVal ? "text-emerald-600 font-medium" : "text-slate-400"}`;
}

export const DATE_CELL_CLS = "text-sm text-slate-700 truncate block";
export const TEXT_CELL_CLS = "text-sm text-slate-700 truncate block";
export const BADGE_FALLBACK_TEXT_CLS = "text-sm text-slate-600";

export function spaceGroupClass(isActionButtonGroup: boolean, justifyClass: string): string {
  return `flex items-center-safe gap-2 px-3 min-w-0 ${isActionButtonGroup ? justifyClass : ""}`;
}

export function spaceJustifyClass(align: "left" | "center" | "right" | undefined): string {
  return align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";
}

export const SEARCH_SIMPLE_CONTAINER_CLS = "flex items-center gap-3 bg-white px-4";
export const SEARCH_RESET_BTN_CLS =
  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all";
export const SEARCH_SUBMIT_BTN_CLS =
  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all";
export const SEARCH_BTN_ICON_CLS = "w-3 h-3";

export const SEARCH_GRID_COLS_CLS: Readonly<Record<number, string>> = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};

export const SEARCH_COL_SPAN_CLS: Readonly<Record<number, string>> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
};

export function searchSimpleGridClass(cols: number): string {
  return `flex-1 grid ${SEARCH_GRID_COLS_CLS[cols] ?? "grid-cols-5"} gap-4`;
}

export function searchSimpleColSpanClass(colSpan: number, cols: number): string {
  return SEARCH_COL_SPAN_CLS[Math.min(colSpan, cols)] ?? "col-span-1";
}

export const SEARCH_DATE_ICON_CLS =
  "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";
export const SEARCH_DATE_RANGE_SEP_CLS = "text-sm text-slate-400 flex-shrink-0";
export const SEARCH_DATE_RANGE_WRAP_CLS = "flex items-center gap-2";
export const SEARCH_DATE_RANGE_INPUT_WRAP_CLS = "relative flex-1";
export const SELECT_ARROW_CLS =
  "absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none";

export const MULTISELECT_BODY_CLS = "p-3 flex flex-col gap-3 h-full";
export const MULTISELECT_TITLE_CLS = "text-sm font-medium text-slate-700";
export const MULTISELECT_DESC_CLS = "text-xs text-slate-500";

export function multiSelectFieldWrapClass(hasFieldWidth: boolean): string {
  return hasFieldWidth ? "flex flex-col gap-3" : "contents";
}

export const MULTISELECT_TOGGLE_WRAP_CLS = "relative";
export const MULTISELECT_TOGGLE_BTN_CLS =
  "w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:border-slate-400 transition-colors disabled:cursor-default";

export function multiSelectToggleTextClass(hasSelection: boolean): string {
  return hasSelection ? "text-slate-800" : "text-slate-400";
}

export function multiSelectChevronClass(isOpen: boolean): string {
  return `w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? "rotate-180" : ""}`;
}

export const MULTISELECT_PANEL_CLS = "bg-white border border-slate-200 rounded-md shadow-lg";
export const MULTISELECT_SEARCH_WRAP_CLS = "p-2 border-b border-slate-100";
export const MULTISELECT_SEARCH_BOX_CLS =
  "flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200";
export const MULTISELECT_SEARCH_ICON_CLS = "w-3.5 h-3.5 text-slate-400 shrink-0";
export const MULTISELECT_SEARCH_INPUT_CLS =
  "flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none";
export const MULTISELECT_OPTION_LIST_CLS = "max-h-48 overflow-y-auto py-1";
export const MULTISELECT_EMPTY_CLS = "px-3 py-2 text-xs text-slate-400 text-center";

export function multiSelectOptionItemClass(isPreview: boolean): string {
  return `flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors ${isPreview ? "cursor-default" : "cursor-pointer"}`;
}

export const MULTISELECT_CHECKBOX_CLS = "w-3.5 h-3.5 rounded border-slate-300 accent-slate-800";
export const MULTISELECT_TAG_SCROLL_WRAP_CLS = "max-h-56 overflow-y-auto";
export const MULTISELECT_TAG_LIST_CLS = "flex flex-col gap-1.5";
export const MULTISELECT_TAG_ROW_CLS =
  "bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto";
export const MULTISELECT_TAG_TEXT_CLS = "text-xs font-medium text-slate-700 shrink-0 whitespace-nowrap";
export const MULTISELECT_TAG_REMOVE_BTN_CLS =
  "ml-auto text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-default shrink-0";

export function tableActionButtonClass(action: "edit" | "delete" | "copy"): string {
  return action === "delete"
    ? "p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
    : "p-1.5 rounded text-slate-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all";
}

export function tableCellJustifyClass(align: string | undefined): string {
  return align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start";
}

export const TABLE_ACTIONS_WRAP_CLS = "flex items-center gap-1 flex-nowrap";
export const TABLE_BUTTON_CELL_CLS = "px-2.5 py-1 rounded text-[11px] font-medium transition-all";
export const TABLE_ACTION_ICON_CLS = "w-3.5 h-3.5";
export const TABLE_BUTTON_WRAP_CLS = "flex";
export const MULTISELECT_TAG_REMOVE_ICON_CLS = "w-3 h-3";

export const MULTISELECT_EXTRA_FIELD_SEP_CLS = "w-px h-4 bg-slate-200 shrink-0";
export const MULTISELECT_TAG_GROUP_SEP_CLS = "w-px h-4 bg-slate-300 shrink-0";

export function multiSelectExtraFieldWrapClass(type: MultiSelectExtraFieldType): string {
  return `shrink-0 ${type === "radio" || type === "checkbox" ? "min-w-fit" : "w-[120px]"}`;
}

export const TAB_CONTAINER_CLS =
  "h-full w-full flex flex-col rounded border border-slate-300 bg-white shadow-sm overflow-hidden";
export const TAB_BAR_CLS = "flex border-b border-slate-200 bg-slate-50 flex-shrink-0";
export const TAB_PANEL_WRAP_CLS = "flex-1 overflow-auto min-h-0 pt-2";
export const TAB_PANEL_ACTIVE_CLS = "h-full";
export const TAB_PANEL_HIDDEN_CLS = "hidden";

export function tabButtonClass(active: boolean): string {
  return `px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
    active ? "border-slate-800 text-slate-900 bg-white" : "border-transparent text-slate-500 hover:text-slate-700"
  }`;
}

export const CATEGORY_OUTER_WRAP_CLS = "h-full w-full pr-2";
export const CATEGORY_CONTAINER_CLS = "flex flex-col bg-white";
export const CATEGORY_HEADER_CLS =
  "flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0";
export const CATEGORY_HEADER_LABEL_CLS = "text-xs font-semibold text-slate-700";
export const CATEGORY_HEADER_ICON_CLS = "w-3.5 h-3.5";
export const CATEGORY_INPUT_ROW_CLS =
  "flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0";
export const CATEGORY_INPUT_CLS =
  "flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400";
export const CATEGORY_INPUT_CONFIRM_BTN_CLS = "p-1 text-emerald-600 hover:text-emerald-700";
export const CATEGORY_INPUT_CANCEL_BTN_CLS = "p-1 text-slate-400 hover:text-slate-600";
export const CATEGORY_INPUT_ICON_CLS = "w-3.5 h-3.5";
export const CATEGORY_LIST_WRAP_CLS = "flex-1 min-h-0 overflow-y-auto";
export const CATEGORY_STATE_WRAP_CLS = "h-full flex items-center justify-center";
export const CATEGORY_STATE_TEXT_ITALIC_CLS = "text-[11px] text-slate-300 italic";
export const CATEGORY_STATE_TEXT_CLS = "text-[11px] text-slate-300";
export const CATEGORY_LIST_CLS = "p-2 space-y-1.5";
export const CATEGORY_ITEM_WRAP_CLS = "relative";
export const CATEGORY_DROP_LINE_CLS =
  "absolute top-0 left-1 right-1 h-0.5 bg-blue-400 rounded z-10 pointer-events-none";
export const CATEGORY_DROP_LINE_LAST_CLS = "h-0.5 bg-blue-400 rounded mx-1";
export const CATEGORY_ACCENT_BAR_CLS = "absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r";
export const CATEGORY_CARD_BODY_CLS = "flex items-center gap-1 px-2 py-2.5";
export const CATEGORY_CARD_MAIN_CLS = "flex-1 min-w-0 pl-1";
export const CATEGORY_CARD_ROW1_CLS = "flex items-center gap-2 mb-1";
export const CATEGORY_ACTIONS_WRAP_CLS =
  "flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0";
export const CATEGORY_ACTION_ICON_CLS = "w-3 h-3";

export function categoryAddButtonClass(isPreview: boolean): string {
  return `flex items-center gap-1 text-[11px] transition-colors ${
    isPreview ? "pointer-events-none opacity-40 text-slate-500" : "text-slate-500 hover:text-slate-900"
  }`;
}

export function categoryCardClass(isSelected: boolean): string {
  return `group relative rounded-lg border cursor-pointer transition-all
                                    ${
                                      isSelected
                                        ? "bg-slate-900 border-slate-700 shadow-md"
                                        : "bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm"
                                    }`;
}

export function categoryDragHandleClass(isPreview: boolean): string {
  return `flex items-center gap-0.5 flex-shrink-0 cursor-grab active:cursor-grabbing select-none ${
    isPreview ? "pointer-events-none" : ""
  }`;
}

export function categoryGripIconClass(isSelected: boolean): string {
  return `w-3.5 h-3.5 ${isSelected ? "text-white/40" : "text-slate-300"}`;
}

export function categoryOrderNumClass(isSelected: boolean): string {
  return `text-[10px] font-mono w-4 text-center ${isSelected ? "text-white/50" : "text-slate-300"}`;
}

export function categoryCodeBadgeClass(isSelected: boolean): string {
  return `flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
    isSelected ? "bg-white/20 text-white/80" : "bg-slate-100 text-slate-500"
  }`;
}

export function categoryTitleClass(isSelected: boolean): string {
  return `flex-1 text-xs font-semibold truncate ${isSelected ? "text-white" : "text-slate-800"}`;
}

export function categoryActionButtonClass(isPreview: boolean, isSelected: boolean): string {
  return `p-0.5 transition-colors ${isPreview ? "pointer-events-none" : ""} ${isSelected ? "text-slate-300 hover:text-white" : "text-slate-400 hover:text-slate-700"}`;
}

export function categoryDeleteButtonClass(isPreview: boolean, isSelected: boolean): string {
  return `p-0.5 transition-colors ${isPreview ? "pointer-events-none" : ""} ${isSelected ? "text-slate-300 hover:text-red-300" : "text-slate-400 hover:text-red-500"}`;
}

export function categoryDescClass(isSelected: boolean): string {
  return `text-[10px] line-clamp-1 ${isSelected ? "text-white/60" : "text-slate-400"}`;
}

export const GENERATED_TABLE_SCROLL_MORE_CLS = "py-4 text-center text-xs text-slate-400";
export const GENERATED_TABLE_UNSUPPORTED_CELL_CLS = "text-slate-300";
export const GENERATED_UNSUPPORTED_WIDGET_CLS =
  "border border-dashed border-slate-300 rounded-md p-4 text-xs text-slate-400 text-center";
