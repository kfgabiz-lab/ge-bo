"use client";

import { SELECT_ARROW_CLS } from "./renderer/rendererStyles";

/**
 * select 드롭다운 화살표 아이콘
 * @example <div className="relative"><select .../><SelectArrow /></div>
 */
export const SelectArrow = () => (
  <svg className={SELECT_ARROW_CLS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="m6 9 6 6 6-6" />
  </svg>
);
