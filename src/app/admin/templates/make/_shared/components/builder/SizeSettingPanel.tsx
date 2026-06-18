'use client';

/**
 * 크기 설정 패널 — 컨텐츠 행의 Col/Row 수 입력 공통 UI
 *
 * 사용법:
 *   // 컨텐츠 레벨 (🌐 없음)
 *   <SizeSettingPanel colSpan={colSpan} rowSpan={rowSpan} ... />
 *
 *   // 위젯 레벨 (🌐 포함 — BuilderI18nModeProvider 안에서 사용)
 *   <SizeSettingPanel colSpan={colSpan} rowSpan={rowSpan} showI18nToggle ... />
 */

import React from 'react';
import { Globe } from 'lucide-react';
import { useBuilderI18nMode } from '../../contexts/BuilderI18nModeContext';

interface SizeSettingPanelProps {
    colSpan: number;
    rowSpan: number;
    /** Col 최대값 (기본 12) */
    maxColSpan?: number;
    /** Row 최대값 (기본 20) */
    maxRowSpan?: number;
    /** 다국어 모드 토글 버튼 표시 여부 — 위젯 레벨에서만 true */
    showI18nToggle?: boolean;
    onColSpanChange: (v: number) => void;
    onRowSpanChange: (v: number) => void;
    /** 필수 여부 — 전달 시에만 표시 (sublist/multiselect 컨텐츠 전용) */
    required?: boolean;
    onRequiredChange?: (v: boolean) => void;
}

export function SizeSettingPanel({
    colSpan,
    rowSpan,
    maxColSpan = 12,
    maxRowSpan = 20,
    showI18nToggle = false,
    onColSpanChange,
    onRowSpanChange,
    required,
    onRequiredChange,
}: SizeSettingPanelProps) {
    const { i18nMode, toggleI18nMode } = useBuilderI18nMode();

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

            {/* 필수 여부 — onRequiredChange 전달 시에만 표시 (sublist/multiselect 컨텐츠 전용) */}
            {onRequiredChange && (
                <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-400">필수</span>
                    <button
                        type="button"
                        onClick={() => onRequiredChange(!required)}
                        className={`relative w-9 h-5 rounded-full transition-colors ${required ? 'bg-slate-900' : 'bg-slate-300'}`}
                    >
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${required ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            )}

            {/* 다국어 모드 토글 — showI18nToggle=true일 때만 표시 (위젯 레벨 전용) */}
            {showI18nToggle && (
                <button
                    type="button"
                    title={i18nMode ? '직접 입력 모드로 전환' : '다국어 키 모드로 전환'}
                    onClick={toggleI18nMode}
                    className={`flex-shrink-0 p-1 rounded transition-all ${
                        i18nMode
                            ? 'text-blue-500 bg-blue-50 hover:bg-blue-100'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                    }`}
                >
                    <Globe className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    );
}
