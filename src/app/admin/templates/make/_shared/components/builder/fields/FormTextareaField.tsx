'use client';

/**
 * FormTextareaField — 폼 입력용 여러 줄 텍스트 필드 설정 컴포넌트
 *
 * 사용자가 여러 줄 텍스트를 입력하는 <textarea> 폼 필드.
 * InputField와 동일 구조이나 Placeholder 외에 표시 행 수(rows)를 추가 설정할 수 있음.
 *
 * 사용법:
 *   <FormTextareaField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'input', min: 1, max: 12 }}
 *     rowSpanConfig={{ min: 1, max: 30 }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { ValidationSection } from '../../ValidationSection';
import { DataGenerationSection } from './DataGenerationSection';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

export function FormTextareaField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields }: FieldEditProps) {
    const { i18nMode } = useBuilderI18nMode();
    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} labelMsgKey={values.labelMsgKey}
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
            {/* 표시 행 수 */}
            <div>
                <label className={LABEL_CLS}>표시 행 수</label>
                <input
                    type="number"
                    value={values.rows ?? 3}
                    min={1} max={20}
                    onChange={e => onChange({ rows: Math.max(1, Number(e.target.value)) })}
                    className={INPUT_CLS}
                />
            </div>
            {/* 유효성검사 (필수항목 + 최소/최대 글자) */}
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
            {/* 데이터생성 — 이 필드 값을 변환하여 생성KEY 대상 필드에 자동 입력 */}
            <DataGenerationSection values={values} onChange={onChange} />
        </div>
    );
}
