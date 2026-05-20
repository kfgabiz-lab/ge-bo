'use client';

/**
 * ColorField — 색상 선택 필드 설정 컴포넌트 (Preset 원형 버튼형)
 *
 * 사용법:
 *   <ColorField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 *
 * - values.options: HEX 색상 문자열 배열 (예: ['#4361ee', '#10b981'])
 * - onChange({ options: [...] }): 색상 목록 변경 시 호출
 */

import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';

/** 기본 프리셋 색상 8개 — 색상 목록 미설정 시 초기값으로 사용 */
const DEFAULT_PRESET_COLORS = [
    '#4361ee', // 인디고 블루
    '#10b981', // 에메랄드 그린
    '#f59e0b', // 앰버 옐로
    '#ef4444', // 레드
    '#8b5cf6', // 바이올렛
    '#06b6d4', // 시안
    '#ec4899', // 핑크
    '#6b7280', // 그레이
];

/** HEX 색상 유효성 검사 (#RGB / #RRGGBB 형식) */
function isValidHex(hex: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

export function ColorField({
    values,
    onChange,
    colSpanMode,
    rowSpanConfig,
    autoFocus,
    onLabelKeyDown,
    hideColSpan,
}: FieldEditProps) {
    /* 현재 등록된 색상 목록 — 없으면 기본 프리셋 사용 */
    const colors: string[] = values.options ?? DEFAULT_PRESET_COLORS;

    /* 새 색상 입력 상태 */
    const [newColor, setNewColor] = useState('#');

    /** 색상 목록 업데이트 공통 함수 */
    const updateColors = (next: string[]) => onChange({ options: next });

    /** 색상 추가 — 중복 제거 + HEX 유효성 검사 */
    const handleAddColor = () => {
        const trimmed = newColor.trim();
        if (!isValidHex(trimmed)) return;
        if (colors.includes(trimmed)) {
            setNewColor('#');
            return;
        }
        updateColors([...colors, trimmed]);
        setNewColor('#');
    };

    /** 색상 제거 */
    const handleRemoveColor = (target: string) => {
        updateColors(colors.filter(c => c !== target));
    };

    /** 기본 프리셋 전체 초기화 */
    const handleResetToDefault = () => {
        updateColors([...DEFAULT_PRESET_COLORS]);
    };

    /** Enter 키로 색상 추가 */
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddColor();
        }
    };

    return (
        <div className="space-y-1.5">
            {/* 공통 베이스: 라벨, Key, ColSpan, 필수 항목 */}
            <FieldBase
                label={values.label}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan}
                colSpanMode={colSpanMode}
                rowSpan={values.rowSpan}
                rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus}
                onLabelKeyDown={onLabelKeyDown}
                isPk={values.isPk}
                required={values.required}
                description={values.description}
                readonly={values.readonly}
                hideColSpan={hideColSpan}
                onChange={onChange}
            />

            {/* 색상 목록 */}
            <div>
                <div className="flex items-center justify-between mb-1">
                    <label className={LABEL_CLS}>색상 목록 ({colors.length}개)</label>
                    <button
                        type="button"
                        onClick={handleResetToDefault}
                        className="text-[10px] text-slate-400 hover:text-slate-700 underline transition-colors"
                    >
                        기본값으로 초기화
                    </button>
                </div>

                {/* 현재 등록된 색상 원형 버튼 목록 */}
                {colors.length === 0 ? (
                    <div className="text-[10px] text-slate-400 italic py-1">
                        등록된 색상이 없습니다.
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-1.5 p-2 border border-slate-200 rounded-md bg-slate-50">
                        {colors.map(color => (
                            <ColorSwatch
                                key={color}
                                color={color}
                                onRemove={() => handleRemoveColor(color)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 새 색상 추가 입력 */}
            <div>
                <label className={LABEL_CLS}>색상 추가 (HEX)</label>
                <div className="flex items-center gap-1.5">
                    {/* 색상 미리보기 원 */}
                    <div
                        className="w-7 h-7 rounded-full border border-slate-200 flex-shrink-0 transition-colors"
                        style={{ backgroundColor: isValidHex(newColor) ? newColor : '#e2e8f0' }}
                    />
                    {/* HEX 직접 입력 */}
                    <input
                        type="text"
                        value={newColor}
                        onChange={e => setNewColor(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="#000000"
                        maxLength={7}
                        className={`${INPUT_CLS} font-mono flex-1`}
                    />
                    {/* 색상 피커 (보조) */}
                    <input
                        type="color"
                        value={isValidHex(newColor) ? newColor : '#000000'}
                        onChange={e => setNewColor(e.target.value)}
                        className="w-7 h-7 rounded border border-slate-200 cursor-pointer flex-shrink-0 p-0 overflow-hidden"
                        title="색상 선택기"
                    />
                    {/* 추가 버튼 */}
                    <button
                        type="button"
                        onClick={handleAddColor}
                        disabled={!isValidHex(newColor)}
                        className="flex items-center gap-0.5 px-2 py-1 text-[10px] font-medium bg-slate-900 text-white rounded hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        <Plus className="w-3 h-3" />
                        추가
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ── 내부 컴포넌트 ── */

interface ColorSwatchProps {
    color: string;
    onRemove: () => void;
}

/**
 * ColorSwatch — 색상 원형 버튼 + 삭제 버튼
 * @param color   HEX 색상 코드
 * @param onRemove 제거 콜백
 */
function ColorSwatch({ color, onRemove }: ColorSwatchProps) {
    return (
        <div className="relative group flex-shrink-0">
            {/* 색상 원형 */}
            <div
                className="w-7 h-7 rounded-full border border-white shadow-sm"
                style={{ backgroundColor: color }}
                title={color}
            />
            {/* 삭제 버튼 — hover 시 표시 */}
            <button
                type="button"
                onClick={onRemove}
                title={`${color} 제거`}
                className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-slate-700 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X className="w-2 h-2" />
            </button>
        </div>
    );
}
