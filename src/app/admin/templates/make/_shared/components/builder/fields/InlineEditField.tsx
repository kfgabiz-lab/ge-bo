'use client';

/**
 * InlineEditField — inlineEdit 셀 설정 (타입 선택 + 수동/공통코드 옵션)
 *
 * 테이블 셀에서 즉시 값 변경(토글·체크박스·라디오)을 위한 컬럼 편집 UI.
 * - 타입 선택: 토글 / 체크박스 / 라디오버튼
 * - 옵션 입력: 수동 입력 / 공통코드 (토글 제외)
 *
 * 사용법:
 *   <InlineEditField values={col} onChange={patch => updateColumn(col.id, patch)}
 *     codeGroups={codeGroups} codeGroupsLoading={false} />
 */

import React from 'react';
import { ColEditProps } from './col-types';
import { LABEL_CLS, INPUT_CLS } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import { CodeGroupDef } from '../../../types';

const INLINE_EDIT_TYPES: { type: 'toggle' | 'checkbox' | 'radio'; label: string }[] = [
    { type: 'toggle',   label: '토글' },
    { type: 'checkbox', label: '체크박스' },
    { type: 'radio',    label: '라디오' },
];

interface InlineEditFieldProps extends ColEditProps {
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
}

export function InlineEditField({ values, onChange, codeGroups, codeGroupsLoading }: InlineEditFieldProps) {
    const inlineEditType = values.inlineEditType ?? 'toggle';

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {/* 저장 경로 — 필수 입력 (dot notation) */}
            <div>
                <label className={LABEL_CLS}>
                    저장 경로 <span className="text-red-400">*</span>
                </label>
                <input
                    type="text"
                    value={values.inlineEditFieldKey ?? ''}
                    onChange={e => onChange({ inlineEditFieldKey: e.target.value })}
                    placeholder="form1.active"
                    className={`${INPUT_CLS} font-mono`}
                />
                <p className="text-[10px] text-slate-400 mt-0.5">데이터 저장 경로 — dot notation 지원 (예: form1.active)</p>
            </div>

            {/* 타입 선택 — 토글 / 체크박스 / 라디오 */}
            <div>
                <label className={LABEL_CLS}>타입</label>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                    {INLINE_EDIT_TYPES.map(({ type, label }) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => onChange({ inlineEditType: type, options: undefined, codeGroupCode: undefined })}
                            className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all
                                ${inlineEditType === type ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* 옵션 — 토글은 on/off 고정이라 옵션 불필요, 체크박스/라디오만 표시 */}
            {inlineEditType !== 'toggle' && (
                <FieldOptions
                    options={values.options}
                    codeGroupCode={values.codeGroupCode}
                    codeGroups={codeGroups}
                    codeGroupsLoading={codeGroupsLoading}
                    onChange={patch => onChange(patch)}
                />
            )}
        </div>
    );
}
