'use client';

/**
 * FieldBase — 라벨|Key + ColSpan + (RowSpan) 공통 베이스
 * 모든 필드 컴포넌트(InputField, SelectField 등) 내부에서만 사용하는 내부 컴포넌트.
 */

import React from 'react';
import { ColSpanMode } from './types';
import { ToggleRow } from './_ToggleRow';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

/** 필드 input 공통 클래스 */
export const INPUT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';
/** 필드 라벨 공통 클래스 */
export const LABEL_CLS = 'text-[10px] font-medium text-slate-500 mb-1 block';

interface FieldBaseProps {
    label: string;
    fieldKey?: string;
    colSpan: number;
    colSpanMode: ColSpanMode;
    /** dateRange 전용 두 번째 라벨 값 */
    label2?: string;
    /** dateRange 두 번째 라벨 다국어 키 */
    label2MsgKey?: string;
    /** true 시 라벨 텍스트가 "라벨 1"로 표시되고 라벨2 입력 영역 노출 */
    showLabel2?: boolean;
    rowSpan?: number;
    rowSpanConfig?: { min: number; max: number };
    autoFocus?: boolean;
    /** 라벨 다국어 키 — 설정 시 MessageKeySelector 모드로 표시 */
    labelMsgKey?: string;
    /** 설명 다국어 키 */
    descriptionMsgKey?: string;
    /** 라벨 선택 입력 여부 — true 시 라벨 입력란의 * 숨김 */
    labelOptional?: boolean;
    /** 한 줄 배치 모드 (공간영역 등에서 사용) */
    compact?: boolean;
    /** ColSpan/RowSpan 입력란 숨김 — SubList 컬럼처럼 colSpan 개념이 없는 경우 사용 */
    hideColSpan?: boolean;
    /** hideCondition/disableCondition 입력란 숨김 — SubList 등 동적 조건 미지원 컨텍스트 */
    hideConditionFields?: boolean;
    /** 필수 항목 여부 — 모든 필드 공통 */
    required?: boolean;
    /** 라벨 하단 설명 텍스트 */
    description?: string;
    /** PK 여부 — colSpanMode.type === 'input'(Form) 일 때만 표시, 미전달 시 체크박스 숨김 */
    isPk?: boolean;
    /** 읽기 전용 여부 — Form 빌더(input 모드)일 때만 표시 */
    readonly?: boolean;
    /** 동적 HIDE 조건 — Form 빌더(input 모드)일 때만 표시 */
    hideCondition?: string;
    /** 동적 Disable 조건 — Form 빌더(input 모드)일 때만 표시 */
    disableCondition?: string;
    onChange: (updates: Partial<{ label: string; labelMsgKey: string | undefined; label2: string; label2MsgKey: string | undefined; fieldKey: string; colSpan: number; rowSpan: number; required: boolean; isPk: boolean; readonly: boolean; hideCondition: string | undefined; disableCondition: string | undefined; description: string; descriptionMsgKey: string | undefined }>) => void;
    onLabelKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    children?: React.ReactNode;
}

/** 라벨|Key 한 줄 + ColSpan + (RowSpan) — 모든 필드 컴포넌트 공통 베이스 */
export function FieldBase(props: FieldBaseProps) {
    const {
        label, labelMsgKey, label2, showLabel2, fieldKey,
        colSpan, colSpanMode,
        rowSpan, rowSpanConfig,
        autoFocus, labelOptional, compact, hideColSpan, hideConditionFields, required, description, descriptionMsgKey, isPk, readonly, hideCondition, disableCondition, onChange, onLabelKeyDown,
        children
    } = props;

    /* Form 빌더 여부 — input 타입 colSpan 사용 시 한 줄 레이아웃 + PK 표시 */
    const isFormMode = colSpanMode.type === 'input';

    /* 전역 다국어 모드 — SizeSettingPanel의 🌐 토글로 제어 */
    const { i18nMode } = useBuilderI18nMode();

    return (
        <>
            {/* 라벨 | Key — 한 줄 배치 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>
                        {showLabel2 ? '라벨 1' : '라벨'} {!labelOptional && <span className="text-red-400">*</span>}
                    </label>
                    {i18nMode ? (
                        /* 다국어 키 모드 — MessageKeySelector */
                        <MessageKeySelector
                            value={labelMsgKey ?? ''}
                            onChange={key => onChange({ labelMsgKey: key })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        /* 직접 입력 모드 */
                        <input
                            type="text"
                            value={label}
                            onChange={e => onChange({ label: e.target.value })}
                            onKeyDown={onLabelKeyDown}
                            placeholder="라벨을 입력하세요"
                            className={INPUT_CLS}
                            autoFocus={autoFocus}
                        />
                    )}
                </div>
                <div>
                    <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={fieldKey}
                        onChange={e => onChange({ fieldKey: e.target.value })}
                        placeholder="예: userName, status..."
                        className={`${INPUT_CLS} font-mono`}
                    />
                </div>
            </div>

            {/* 설명 텍스트 — 라벨 하단에 표시할 안내 문구 */}
            <div>
                <label className={LABEL_CLS}>설명 <span className="text-slate-300 font-normal">(선택)</span></label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={descriptionMsgKey ?? ''}
                        onChange={key => onChange({ descriptionMsgKey: key })}
                        resourceType="SENTENCE"
                        size="sm"
                    />
                ) : (
                    <input
                        type="text"
                        value={description ?? ''}
                        onChange={e => onChange({ description: e.target.value || undefined })}
                        placeholder="예: 설명을 입력 해주세요."
                        className={INPUT_CLS}
                    />
                )}
            </div>

            {/* 라벨 2 (dateRange 전용) */}
            {showLabel2 && (
                <div>
                    <label className={LABEL_CLS}>라벨 2 <span className="text-red-400">*</span></label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={props.label2MsgKey ?? ''}
                            onChange={key => onChange({ label2MsgKey: key })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={label2 || ''}
                            onChange={e => onChange({ label2: e.target.value })}
                            placeholder="예: 종료일"
                            className={INPUT_CLS}
                        />
                    )}
                </div>
            )}

            {/* ColSpan / RowSpan 배치 — hideColSpan=true 시 숨김
                - button 모드(Search): 수직 레이아웃
                - input 모드(Form): 2열 그리드로 한 줄 배치 */}
            {!hideColSpan && <div className={compact || isFormMode ? 'grid grid-cols-2 gap-2 mt-1' : 'space-y-1'}>
                {/* ColSpan */}
                <div className={compact || isFormMode ? '' : 'flex items-center justify-between'}>
                    <span className={LABEL_CLS}>ColSpan (가로)</span>
                    {colSpanMode.type === 'button' ? (
                        <div className="flex items-center gap-0.5">
                            {colSpanMode.options.map(n => {
                                const min = colSpanMode.minSpan ?? 1;
                                return (
                                    <button
                                        key={n} type="button"
                                        onClick={() => n >= min && onChange({ colSpan: n })}
                                        disabled={n < min}
                                        className={`w-5 h-5 text-[10px] font-semibold rounded transition-all
                                            ${colSpan === n
                                                ? 'bg-slate-900 text-white border-slate-900'
                                                : n < min
                                                    ? 'bg-slate-100 text-slate-300 border border-slate-100 cursor-not-allowed'
                                                    : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}
                                    >{n}</button>
                                );
                            })}
                        </div>
                    ) : (
                        <input
                            type="number"
                            min={colSpanMode.min}
                            max={colSpanMode.max}
                            value={colSpan}
                            onChange={e => onChange({
                                colSpan: Math.max(colSpanMode.min, Math.min(colSpanMode.max, Number(e.target.value) || colSpanMode.min)),
                            })}
                            className={INPUT_CLS}
                        />
                    )}
                </div>

                {/* RowSpan (지정 시만 표시) */}
                {rowSpanConfig && (
                    <div className={compact || isFormMode ? '' : 'flex items-center justify-between'}>
                        <span className={LABEL_CLS}>RowSpan (세로)</span>
                        <input
                            type="number"
                            min={rowSpanConfig.min}
                            max={rowSpanConfig.max}
                            value={rowSpan ?? rowSpanConfig.min}
                            onChange={e => onChange({
                                rowSpan: Math.max(rowSpanConfig.min, Math.min(rowSpanConfig.max, Number(e.target.value) || rowSpanConfig.min)),
                            })}
                            className={INPUT_CLS}
                        />
                    </div>
                )}
            </div>}

            {/* 필수항목 | 읽기전용 — ColSpan/RowSpan 바로 아래 한 줄 */}
            <div className={`grid gap-1 mt-1 ${isFormMode ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <ToggleRow
                    label="필수 항목"
                    value={!!required}
                    onChange={v => onChange({ required: v })}
                />
                {isFormMode && (
                    <ToggleRow
                        label="읽기 전용"
                        value={!!readonly}
                        onChange={v => onChange({ readonly: v })}
                    />
                )}
            </div>

            {/* 동적 HIDE 조건 | 동적 Disable 조건 — SubList 등 미지원 컨텍스트 제외 */}
            {!hideConditionFields && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>동적 HIDE 조건 <span className="text-slate-300 font-normal">(선택)</span></label>
                        <input
                            type="text"
                            value={hideCondition ?? ''}
                            onChange={e => onChange({ hideCondition: e.target.value || undefined })}
                            placeholder="예: status=1,type=Y / status= (빈값)"
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>동적 Disable 조건 <span className="text-slate-300 font-normal">(선택)</span></label>
                        <input
                            type="text"
                            value={disableCondition ?? ''}
                            onChange={e => onChange({ disableCondition: e.target.value || undefined })}
                            placeholder="예: status=1,type=Y / status= (빈값)"
                            className={INPUT_CLS}
                        />
                    </div>
                </div>
            )}

            {/* 자식 컴포넌트 추가 영역 */}
            {children}

            {/* PK 여부 — Form 빌더 + isPk prop 전달된 경우에만 표시 */}
            {isFormMode && isPk !== undefined && (
                <div className="flex items-center gap-2 px-1 py-1 border-t border-slate-100 mt-0.5">
                    <input
                        type="checkbox"
                        id={`pk-${fieldKey || 'field'}`}
                        checked={!!isPk}
                        onChange={e => onChange({ isPk: e.target.checked })}
                        className="w-3.5 h-3.5 rounded accent-slate-900 cursor-pointer"
                    />
                    <label
                        htmlFor={`pk-${fieldKey || 'field'}`}
                        className="text-xs text-slate-600 cursor-pointer select-none"
                    >
                        PK 여부
                    </label>
                </div>
            )}
        </>
    );
}
