'use client';

/**
 * 크기 설정 패널 — 컨텐츠 행의 Col/Row 수 입력 공통 UI
 *
 * 사용법:
 *   <SizeSettingPanel
 *     colSpan={colSpan} rowSpan={rowSpan}
 *     maxColSpan={12} maxRowSpan={20}
 *     onColSpanChange={v => setColSpan(v)}
 *     onRowSpanChange={v => setRowSpan(v)}
 *   />
 */

import React from 'react';

interface SizeSettingPanelProps {
    colSpan: number;
    rowSpan: number;
    /** Col 최대값 (기본 12) */
    maxColSpan?: number;
    /** Row 최대값 (기본 20) */
    maxRowSpan?: number;
    onColSpanChange: (v: number) => void;
    onRowSpanChange: (v: number) => void;
}

export function SizeSettingPanel({
    colSpan,
    rowSpan,
    maxColSpan = 12,
    maxRowSpan = 20,
    onColSpanChange,
    onRowSpanChange,
}: SizeSettingPanelProps) {
    return (
        <div className="px-3 pt-2 pb-1.5 border-b border-slate-100 flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium flex-shrink-0">크기</span>

            {/* Col 입력 */}
            <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-slate-400">Col</span>
                <input
                    type="number"
                    min={1}
                    max={maxColSpan}
                    value={colSpan}
                    onChange={e => onColSpanChange(Number(e.target.value) || 1)}
                    className="w-12 border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-slate-900 bg-white"
                />
                <span className="text-[10px] text-slate-300">/ {maxColSpan}</span>
            </div>

            {/* Row 입력 */}
            <div className="flex items-center gap-1 flex-1">
                <span className="text-[10px] text-slate-400">Row</span>
                <input
                    type="number"
                    min={1}
                    max={maxRowSpan}
                    value={rowSpan}
                    onChange={e => onRowSpanChange(Number(e.target.value) || 1)}
                    className="w-12 border border-slate-200 rounded px-1.5 py-1 text-xs text-center focus:outline-none focus:border-slate-900 bg-white"
                />
            </div>
        </div>
    );
}
