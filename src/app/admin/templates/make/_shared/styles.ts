/**
 * 페이지 메이커 공통 스타일 상수
 * - list/page.tsx, layer/page.tsx에서 공유
 */

import { ROW_HEIGHT } from "@/components/layout/grid-cell";

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
export const fieldDescCls = "text-sm text-slate-400 mb-0.5 flex-shrink-0 leading-tight line-clamp-2 min-h-[18px]";

/** Form 필드 본체 영역 스타일 — 여유가 있으면 세로 중앙, 넘치면 상단 정렬로 자동 폴백 */
export const fieldBodyCls = "flex-1 min-h-0 flex flex-col justify-center-safe";

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
