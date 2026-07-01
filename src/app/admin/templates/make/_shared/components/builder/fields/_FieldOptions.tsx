'use client';

/**
 * _FieldOptions — 옵션 입력 섹션 (수동/공통코드/SLUG 탭 전환)
 * select / radio / checkbox / button 필드 공통 사용하는 내부 컴포넌트.
 * SLUG 탭은 showSlugTab=true일 때만 노출 (select 전용).
 */

import React, { useState } from 'react';
import { CodeGroupDef } from '../../../types';
import { OptionInputRows, stringsToOpts, optsToStrings } from '../../OptionInputRows';
import { CodeGroupSelector } from '../../CodeGroupSelector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import { SlugSelectField } from './SlugSelectField';
import type { SlugOption } from './SlugSelectField';
import { LABEL_CLS, INPUT_CLS } from './_FieldBase';

/** 옵션 소스 탭 유형 */
type OptionsMode = 'manual' | 'code' | 'slug';

interface FieldOptionsProps {
    options?: string[];
    codeGroupCode?: string;
    /** SLUG 옵션 소스 연결 SLUG */
    optionSlug?: string;
    /** SLUG 데이터에서 value로 쓸 필드 key */
    optionValueKey?: string;
    /** SLUG 데이터에서 text로 쓸 필드 key */
    optionTextKey?: string;
    /** SLUG 데이터 정렬 기준 필드 key */
    optionOrderKey?: string;
    /** SLUG 데이터 정렬 방향 (ASC / DESC) */
    optionOrderDir?: 'ASC' | 'DESC';
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    onChange: (updates: {
        options?: string[];
        codeGroupCode?: string;
        optionSlug?: string;
        optionValueKey?: string;
        optionTextKey?: string;
        optionOrderKey?: string;
        optionOrderDir?: 'ASC' | 'DESC';
    }) => void;
    /** 현재 기본값으로 선택된 option value */
    defaultOptionValue?: string;
    /** 기본값 변경 핸들러 */
    onDefaultOptionChange?: (value: string) => void;
    /** SLUG 탭 노출 여부 — select 전용, 기본값 false */
    showSlugTab?: boolean;
    /** SLUG 탭에서 사용할 slug 목록 — SlugSelectField에 전달 */
    slugOptions?: SlugOption[];
}

/**
 * 수동 입력 / 공통코드 / SLUG 탭 전환 + 옵션 입력 영역
 * - 초기 mode: optionSlug 유무 → 'slug', codeGroupCode 유무 → 'code', 그 외 → 'manual'
 */
export function FieldOptions({
    options,
    codeGroupCode,
    optionSlug,
    optionValueKey,
    optionTextKey,
    optionOrderKey,
    optionOrderDir,
    codeGroups,
    codeGroupsLoading,
    onChange,
    defaultOptionValue,
    onDefaultOptionChange,
    showSlugTab = false,
    slugOptions = [],
}: FieldOptionsProps) {
    /* 초기 탭: SLUG → 공통코드 → 수동 순서로 판단 */
    const initMode = (): OptionsMode => {
        if (showSlugTab && optionSlug) return 'slug';
        if (codeGroupCode) return 'code';
        return 'manual';
    };
    const [mode, setMode] = useState<OptionsMode>(initMode);
    const { i18nMode } = useBuilderI18nMode();

    /** 탭 전환 — 반대편 값 초기화 */
    const handleModeChange = (next: OptionsMode) => {
        setMode(next);
        if (next === 'manual') {
            /* 수동 탭 선택 시: 공통코드·SLUG 초기화 */
            onChange({ codeGroupCode: undefined, optionSlug: undefined, optionValueKey: undefined, optionTextKey: undefined, optionOrderKey: undefined, optionOrderDir: undefined });
        } else if (next === 'code') {
            /* 공통코드 탭 선택 시: 수동 옵션·SLUG 초기화 */
            onChange({ options: undefined, optionSlug: undefined, optionValueKey: undefined, optionTextKey: undefined, optionOrderKey: undefined, optionOrderDir: undefined });
        } else if (next === 'slug') {
            /* SLUG 탭 선택 시: 수동 옵션·공통코드 초기화 */
            onChange({ options: undefined, codeGroupCode: undefined });
        }
    };

    return (
        <div className="space-y-1.5">
            {/* 탭 토글 — SLUG 탭은 showSlugTab일 때만 표시 */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                <button
                    type="button"
                    onClick={() => handleModeChange('manual')}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all
                        ${mode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >수동 입력</button>
                <button
                    type="button"
                    onClick={() => handleModeChange('code')}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all
                        ${mode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >공통코드</button>
                {showSlugTab && (
                    <button
                        type="button"
                        onClick={() => handleModeChange('slug')}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all
                            ${mode === 'slug' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >SLUG</button>
                )}
            </div>

            {/* 공통코드 탭 */}
            {mode === 'code' && (
                <>
                    <CodeGroupSelector
                        codeGroups={codeGroups}
                        codeGroupsLoading={codeGroupsLoading}
                        value={codeGroupCode || ''}
                        onChange={(code, opts) => onChange({ codeGroupCode: code, options: opts })}
                    />
                    {/* 코드 그룹 기본값 선택 — selectbox */}
                    {onDefaultOptionChange && options && options.length > 0 && (
                        <div className="space-y-0.5">
                            <label className="text-[10px] font-medium text-slate-500 block">기본값</label>
                            <select
                                value={defaultOptionValue ?? ''}
                                onChange={e => onDefaultOptionChange(e.target.value)}
                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900"
                            >
                                <option value="">없음</option>
                                {stringsToOpts(options).map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.text}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </>
            )}

            {/* 수동 입력 탭 */}
            {mode === 'manual' && (
                <OptionInputRows
                    options={stringsToOpts(options || [])}
                    onChange={opts => onChange({ options: optsToStrings(opts), codeGroupCode: undefined })}
                    i18nMode={i18nMode}
                    defaultValue={defaultOptionValue}
                    onDefaultChange={onDefaultOptionChange}
                />
            )}

            {/* SLUG 탭 — select 전용, showSlugTab=true일 때만 렌더링 */}
            {mode === 'slug' && showSlugTab && (
                <div className="space-y-1.5">
                    {/* 연결 SLUG 선택 */}
                    <SlugSelectField
                        label="연결 SLUG"
                        value={optionSlug ?? ''}
                        onChange={(slug) => onChange({
                            optionSlug: slug || undefined,
                            optionValueKey: undefined,
                            optionTextKey: undefined,
                            optionOrderKey: undefined,
                            optionOrderDir: undefined,
                        })}
                        slugOptions={slugOptions}
                        emptyLabel="SLUG 선택"
                    />

                    {/* value키 | text키 한 줄 배치 */}
                    <div className="flex gap-1.5">
                        <div className="flex-1">
                            <label className={LABEL_CLS}>Value 키</label>
                            <input
                                type="text"
                                value={optionValueKey ?? ''}
                                onChange={(e) => onChange({ optionValueKey: e.target.value || undefined })}
                                placeholder="예: id"
                                className={INPUT_CLS}
                            />
                        </div>
                        <div className="flex-1">
                            <label className={LABEL_CLS}>Text 키</label>
                            <input
                                type="text"
                                value={optionTextKey ?? ''}
                                onChange={(e) => onChange({ optionTextKey: e.target.value || undefined })}
                                placeholder="예: name"
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>

                    {/* 정렬key | orderby 한 줄 배치 */}
                    <div className="flex gap-1.5">
                        <div className="flex-1">
                            <label className={LABEL_CLS}>정렬 Key</label>
                            <input
                                type="text"
                                value={optionOrderKey ?? ''}
                                onChange={(e) => onChange({ optionOrderKey: e.target.value || undefined })}
                                placeholder="예: name"
                                className={INPUT_CLS}
                            />
                        </div>
                        <div className="flex-1">
                            <label className={LABEL_CLS}>정렬 방향</label>
                            <select
                                value={optionOrderDir ?? ''}
                                onChange={(e) => onChange({ optionOrderDir: (e.target.value as 'ASC' | 'DESC') || undefined })}
                                className={INPUT_CLS}
                            >
                                <option value="">없음</option>
                                <option value="ASC">ASC</option>
                                <option value="DESC">DESC</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
