'use client';

/**
 * InputField — 텍스트 입력 필드 설정 컴포넌트
 *
 * 사용법:
 *   <InputField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { ValidationSection } from '../../ValidationSection';
import { DataGenerationSection } from './DataGenerationSection';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import { CodeGroupSelector } from '../../CodeGroupSelector';

export function InputField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields, codeGroups, codeGroupsLoading }: FieldEditProps) {
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label}
                labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan} colSpanMode={colSpanMode}
                rowSpan={values.rowSpan} rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus} onLabelKeyDown={onLabelKeyDown}
                isPk={values.isPk}
                required={values.required}
                description={values.description}
                descriptionMsgKey={values.descriptionMsgKey}
                readonly={values.readonly}
                hideCondition={values.hideCondition}
                disableCondition={values.disableCondition}
                excludeFromSearch={values.excludeFromSearch}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                slugEntityFields={slugEntityFields}
                onChange={onChange}
            />
            {/* Placeholder */}
            <div>
                <label className={LABEL_CLS}>Placeholder</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.placeholderMsgKey ?? ''}
                        onChange={key => onChange({ placeholderMsgKey: key })}
                        resourceType={undefined}
                        size="sm"
                    />
                ) : (
                    <input type="text" value={values.placeholder || ''}
                        onChange={e => onChange({ placeholder: e.target.value })}
                        className={INPUT_CLS} />
                )}
            </div>
            {/* 기본값 */}
            <div>
                <label className={LABEL_CLS}>기본값</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.defaultValueMsgKey ?? ''}
                        onChange={key => onChange({ defaultValueMsgKey: key || undefined })}
                        size="sm"
                    />
                ) : (
                    <input type="text" value={values.defaultValue || ''}
                        onChange={e => onChange({ defaultValue: e.target.value || undefined })}
                        className={INPUT_CLS} />
                )}
            </div>
            {/* 유효성검사 (필수항목 + 최소/최대 글자 + 정규식) */}
            <ValidationSection
                fieldType="input"
                values={{
                    required: values.required ?? false,
                    minLength: values.minLength,
                    maxLength: values.maxLength,
                    showCharCount: values.showCharCount,
                    pattern: values.pattern ?? '',
                    patternDesc: values.patternDesc ?? '',
                }}
                onChange={updates => onChange(updates)}
            />
            {/* 공통코드 연동 — codeGroups가 전달된 경우에만 표시 */}
            {codeGroups && codeGroups.length > 0 && (
                <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase">공통코드 연동</span>
                    <CodeGroupSelector
                        codeGroups={codeGroups}
                        codeGroupsLoading={codeGroupsLoading ?? false}
                        value={values.codeGroupCode ?? ''}
                        onChange={code => onChange({
                            codeGroupCode: code || undefined,
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
            )}
            {/* 데이터생성 — 이 필드 값을 변환하여 생성KEY 대상 필드에 자동 입력 */}
            <DataGenerationSection values={values} onChange={onChange} />
        </div>
    );
}
