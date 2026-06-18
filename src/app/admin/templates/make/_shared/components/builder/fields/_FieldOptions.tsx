'use client';

/**
 * _FieldOptions — 옵션 입력 섹션 (수동/공통코드 토글)
 * select / radio / checkbox / button 필드 공통 사용하는 내부 컴포넌트.
 */

import React, { useState } from 'react';
import { CodeGroupDef } from '../../../types';
import { OptionInputRows, stringsToOpts, optsToStrings } from '../../OptionInputRows';
import { CodeGroupSelector } from '../../CodeGroupSelector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

interface FieldOptionsProps {
    options?: string[];
    codeGroupCode?: string;
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    onChange: (updates: { options?: string[]; codeGroupCode?: string }) => void;
    /** 현재 기본값으로 선택된 option value */
    defaultOptionValue?: string;
    /** 기본값 변경 핸들러 */
    onDefaultOptionChange?: (value: string) => void;
}

/**
 * 수동 입력 / 공통코드 탭 전환 + 옵션 입력 영역
 * - 초기 mode는 codeGroupCode 유무로 결정
 */
export function FieldOptions({ options, codeGroupCode, codeGroups, codeGroupsLoading, onChange, defaultOptionValue, onDefaultOptionChange }: FieldOptionsProps) {
    const [mode, setMode] = useState<'manual' | 'code'>(codeGroupCode ? 'code' : 'manual');
    const { i18nMode } = useBuilderI18nMode();

    const handleModeChange = (next: 'manual' | 'code') => {
        setMode(next);
        /* 모드 전환 시 반대편 값 초기화 */
        if (next === 'manual') onChange({ codeGroupCode: undefined });
        else onChange({ options: undefined });
    };

    return (
        <div className="space-y-1.5">
            {/* 수동 / 공통코드 탭 토글 */}
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
            </div>

            {mode === 'code' ? (
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
            ) : (
                <OptionInputRows
                    options={stringsToOpts(options || [])}
                    onChange={opts => onChange({ options: optsToStrings(opts), codeGroupCode: undefined })}
                    i18nMode={i18nMode}
                    defaultValue={defaultOptionValue}
                    onDefaultChange={onDefaultOptionChange}
                />
            )}
        </div>
    );
}
