export function rendererContainerClassName(fillHeight: boolean, showBorder: boolean, extraClassName: string): string {
  const borderCls = showBorder ? "border border-slate-200" : "";
  return [fillHeight ? "h-full w-full rounded" : "w-full rounded", borderCls, extraClassName].filter(Boolean).join(" ");
}

export function rendererContainerOverflow(clipOverflow: boolean): "clip" | "visible" {
  return clipOverflow ? "clip" : "visible";
}

export const TABLE_COUNT_BAR_CLS =
  "flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-100";
export const TABLE_THEAD_CLS = "sticky top-0 z-10";
export const TABLE_HEADER_CELL_CLS = "px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap";
export const TABLE_HEADER_STATIC_TEXT_CLS = "flex items-center justify-center gap-1";
export const TABLE_TD_CLS = "px-4 py-3 max-w-[200px] overflow-hidden";
export const TABLE_TR_CLS = "border-b border-slate-100 last:border-0 transition-all hover:bg-slate-50/50";

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

export function spaceGroupClass(isActionButtonGroup: boolean, justifyClass: string): string {
  return `flex items-center-safe gap-2 px-3 min-w-0 ${isActionButtonGroup ? justifyClass : ""}`;
}

export const SEARCH_SIMPLE_CONTAINER_CLS = "flex items-center gap-3 bg-white px-4";
export const SEARCH_RESET_BTN_CLS =
  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all";
export const SEARCH_SUBMIT_BTN_CLS =
  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all";

export const SEARCH_DATE_ICON_CLS =
  "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none";
export const SEARCH_DATE_RANGE_SEP_CLS = "text-sm text-slate-400 flex-shrink-0";
export const SELECT_ARROW_CLS =
  "absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none";
