/**
 * 페이지 메이커 공통 스타일 상수
 * - list/page.tsx, layer/page.tsx에서 공유
 */

import { ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";
import type { SearchFieldConfig } from "./types";

/** 기본 input 스타일 */
export const inputCls =
  "w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200";

/** 기본 select 스타일 */
export const selectCls =
  "w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed disabled:border-slate-200";

/** 주요 버튼 스타일 */
export const btnPrimary =
  "px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm transition-all";

/** 보조 버튼 스타일 */
export const btnSecondary =
  "px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all";

/** Form/Search 필드 타이틀(라벨) 스타일 */
export const fieldLabelCls = "block text-sm font-medium text-slate-700 flex-shrink-0";

/** Form/Search 필드 서브타이틀(설명) 스타일 */
export const fieldDescCls =
  "text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight whitespace-nowrap overflow-x-auto min-h-[18px]";

/** Form 필드 본체 영역 스타일 — 여유가 있으면 세로 중앙, 넘치면 상단 정렬로 자동 폴백 */
export const fieldBodyCls = "flex-1 min-h-0 flex flex-col justify-center-safe";

export function fieldTextValueClass(multiLine: boolean): string {
  return `text-sm text-slate-700 ${multiLine ? "whitespace-pre-wrap" : "truncate"}`;
}

/** radio/checkbox/dateRangeStatus 옵션 그룹 래퍼 — 옵션 줄바꿈 없는 전제 */
export const fieldOptionGroupCls = "flex items-center gap-4";

/** 글자수 카운터를 입력창 내부 우측에 겹쳐 배치 — 세로 흐름을 차지하지 않아 셀 높이에 영향 없음 */
export const fieldCharCountCls =
  "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 pointer-events-none";

/** fieldCharCountCls와 겹치지 않도록 입력창 우측에 확보하는 여백 — inputCls의 px-3보다 뒤에 선언되어 padding-right를 덮어쓴다 */
export const fieldCharCountPadCls = "pr-20";

/** fieldLabelCls가 차지하는 실제 높이(px) — 클래스 변경 시 이 값도 함께 갱신 */
export const FIELD_LABEL_HEIGHT_PX = 20;

/** fieldDescCls가 차지하는 실제 높이(px) — min-h-[18px] + mb-0.5 */
export const FIELD_DESC_HEIGHT_PX = 20;

/** 필드 셀 하단 여유분(px) — 테두리·반올림 오차 흡수용 */
export const FIELD_CELL_SLACK_PX = 4;

export const FORM_CONTENT_PADDING_TOP = 10;

export const FORM_FIELD_ROW_HEIGHT = 90;

export const FORM_FIELD_GAP = 12;

export const FIELD_CONTROL_HEIGHT_PX = 38;

/** FieldRenderer의 MULTI_LINE(text) 렌더링(whitespace-pre-wrap div, text-sm)이 한 줄당 실제로 차지하는 높이(px) — Tailwind text-sm: font-size 14 / line-height 20 */
export const FIELD_TEXT_LINE_HEIGHT_PX = 20;

export const TAB_CHROME_HEIGHT_PX = 50;

export const TAB_CHROME_ROWS = Math.ceil(TAB_CHROME_HEIGHT_PX / ROW_HEIGHT);

export function fieldChromeHeight(hasLabel: boolean, hasDesc: boolean): number {
  return (hasLabel ? FIELD_LABEL_HEIGHT_PX : 0) + (hasDesc ? FIELD_DESC_HEIGHT_PX : 0);
}

export function fieldContentHeight(
  field: SearchFieldConfig,
  rowSpan: number,
  chromeHeight?: number,
  rowPitch: number = ROW_HEIGHT
): number {
  const chrome =
    chromeHeight ??
    fieldChromeHeight(!!(field.label || field.labelMsgKey), !!(field.description || field.descriptionMsgKey));
  return rowSpan * rowPitch - GAP_SIZE - chrome - FIELD_CELL_SLACK_PX;
}

export const fieldRequiredMarkCls = "text-red-500 ml-0.5";

export const formTitleBlockCls = "flex flex-col justify-center px-3";

export const formTitleCls = "text-sm font-bold text-slate-900";

export const formTitleDescCls = "text-xs text-slate-400 mt-0.5";

export const formFieldCellCls = "flex flex-col px-3 min-w-0";

export function fieldOptionItemClass(isReadOnly: boolean): string {
  return `flex items-center gap-2 ${isReadOnly ? "cursor-default" : "cursor-pointer"}`;
}

export const fieldOptionTextCls = "text-sm text-slate-700";

export const fieldRadioInputCls = "w-4 h-4 cursor-pointer";

export const fieldCheckboxInputCls = "w-4 h-4 rounded cursor-pointer";

export const readonlyFieldCls = " bg-slate-50 text-slate-500 cursor-default";

export const textareaFlexCls = "resize-none flex-1 min-h-0";

export const textareaFullCls = "resize-none h-full";

export const textareaCharCountWrapCls = "flex flex-col h-full";

export const textareaCharCountCls = "text-right text-[10px] text-slate-400 mt-0.5";

export function imageDropZoneClass(isReadOnly: boolean): string {
  return `flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? " opacity-75" : ""}`;
}

export const imagePlaceholderCls =
  "flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-all";

export const imagePlaceholderStaticCls =
  "flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 pointer-events-none";

export const imageCellExistingCls = "relative rounded-md overflow-hidden border border-slate-200 group flex flex-col";

export const imageCellNewCls = "relative rounded-md overflow-hidden border border-blue-200 group flex flex-col";

export const imageRemoveBtnCls =
  "absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity";

export const imageAddCellCls =
  "flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all";

export const fileInfoBarCls = "flex-shrink-0 px-1.5 py-1 bg-slate-50/80 border-t border-slate-100";

export const fileInfoBarBtnCls =
  "block w-full text-left text-xs font-medium truncate hover:text-blue-600 hover:underline transition-colors";

export const fileInfoBarSizeCls = "text-[10px] text-slate-400 font-normal";

export const fieldRelativeWrapCls = "relative";

export const fieldDateRangeInputPadCls = "pl-9";

export const textareaStaticCls = "whitespace-pre-wrap leading-relaxed px-1";

export const imagePlaceholderIconCls = "w-6 h-6";

export const imagePlaceholderTitleCls = "text-xs font-medium";

export const imagePlaceholderInfoCls = "text-[10px] text-center leading-relaxed";

export const imageGridWrapCls = "p-1 overflow-hidden";

export const imageGridCls = "grid gap-1";

export const imageCellBodyCls = "relative flex-1 min-h-0";

export const imagePreviewImgCls = "w-full h-full object-contain";

export const imageFallbackBoxCls = "w-full h-full flex items-center justify-center bg-slate-100";

export const imageFallbackIconCls = "w-5 h-5 text-slate-300";

export const imageRemoveIconCls = "w-2.5 h-2.5 text-white";

export const imageAddIconCls = "w-4 h-4";

export const imageAddTextCls = "text-[10px] mt-0.5";

export const ACTION_BUTTON_BG_CLS: Readonly<Record<string, string>> = {
  black: "bg-slate-900",
  green: "bg-emerald-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-400",
  red: "bg-red-500",
  gray: "bg-slate-400",
  pink: "bg-pink-400",
};

export const ACTION_BUTTON_TEXT_CLS: Readonly<Record<string, string>> = {
  white: "text-white",
  black: "text-slate-900",
  green: "text-emerald-500",
  blue: "text-blue-500",
  yellow: "text-yellow-400",
  red: "text-red-500",
  gray: "text-slate-400",
  pink: "text-pink-400",
};

export function actionButtonClass(color: string | undefined, textColor: string | undefined): string {
  const bgCls = ACTION_BUTTON_BG_CLS[color ?? "black"] ?? ACTION_BUTTON_BG_CLS.black;
  const textCls = ACTION_BUTTON_TEXT_CLS[textColor ?? "white"] ?? ACTION_BUTTON_TEXT_CLS.white;
  return `text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] whitespace-nowrap flex-shrink-0 hover:opacity-90 disabled:cursor-default ${bgCls} ${textCls}`;
}
