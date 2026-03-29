'use client';

/**
 * select 드롭다운 화살표 아이콘
 * @example <div className="relative"><select .../><SelectArrow /></div>
 */
export const SelectArrow = () => (
    <svg
        className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
    >
        <path d="m6 9 6 6 6-6" />
    </svg>
);
