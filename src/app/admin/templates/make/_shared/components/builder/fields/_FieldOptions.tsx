'use client';

/**
 * _FieldOptions — 옵션 입력 섹션 (수동/공통코드 토글)
 * select / radio / checkbox / button 필드 공통 사용하는 내부 컴포넌트.
 */

import React, { useState } from 'react';
import { CodeGroupDef } from '../../../types';
import { OptionInputRows, stringsToOpts, optsToStrings } from '../../OptionInputRows';
import { CodeGroupSelector } from '../../CodeGroupSelector';

interface FieldOptionsProps {
    options?: string[];
    codeGroupCode?: string;
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    onChange: (updates: { options?: string[]; codeGroupCode?: string }) => void;
}

/**
 * 수동 입력 / 공통코드 탭 전환 + 옵션 입력 영역
 * - 초기 mode는 codeGroupCode 유무로 결정
 */
export function FieldOptions({ options, codeGroupCode, codeGroups, codeGroupsLoading, onChange }: FieldOptionsProps) {
    const [mode, setMode] = useState<'manual' | 'code'>(codeGroupCode ? 'code' : 'manual');

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
                <CodeGroupSelector
                    codeGroups={codeGroups}
                    codeGroupsLoading={codeGroupsLoading}
                    value={codeGroupCode || ''}
                    onChange={(code, opts) => onChange({ codeGroupCode: code, options: opts })}
                />
            ) : (
                <OptionInputRows
                    options={stringsToOpts(options || [])}
                    onChange={opts => onChange({ options: optsToStrings(opts), codeGroupCode: undefined })}
                />
            )}
        </div>
    );
}
