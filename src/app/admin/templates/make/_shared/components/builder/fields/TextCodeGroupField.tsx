'use client';

/**
 * TextCodeGroupField — 텍스트 셀 공통코드 연동 설정 (그룹 선택 + 표시방식 토글)
 *
 * text 타입 컬럼에서 공통코드 그룹을 연결하고, 이름/코드값 표시 방식을 선택한다.
 *
 * 사용법:
 *   <TextCodeGroupField
 *     values={col} onChange={patch => updateColumn(col.id, patch)}
 *     codeGroups={codeGroups} codeGroupsLoading={false} />
 */

import React from 'react';
import { CodeGroupDef } from '../../../types';
import { CodeGroupSelector } from '../../CodeGroupSelector';
import { ColEditProps } from './col-types';

interface TextCodeGroupFieldProps extends ColEditProps {
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
}

export function TextCodeGroupField({ values, onChange, codeGroups, codeGroupsLoading }: TextCodeGroupFieldProps) {
    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">공통코드 연동</span>

            {/* 공통코드 그룹 선택 */}
            <CodeGroupSelector
                codeGroups={codeGroups}
                codeGroupsLoading={codeGroupsLoading}
                value={values.codeGroupCode ?? ''}
                onChange={code => onChange({
                    codeGroupCode: code || undefined,
                    /* 코드 해제 시 displayAs도 초기화 */
                    displayAs: code ? (values.displayAs ?? 'text') : undefined,
                })}
            />

            {/* 표시 방식 선택 — 공통코드 연동 시만 표시 */}
            {values.codeGroupCode && (
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                    <button type="button" onClick={() => onChange({ displayAs: 'text' })}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${(values.displayAs ?? 'text') === 'text' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        이름 표시
                    </button>
                    <button type="button" onClick={() => onChange({ displayAs: 'value' })}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${values.displayAs === 'value' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        코드값 표시
                    </button>
                </div>
            )}
        </div>
    );
}
