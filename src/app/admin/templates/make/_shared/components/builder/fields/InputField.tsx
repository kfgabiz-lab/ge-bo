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

export function InputField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown }: FieldEditProps) {
    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} fieldKey={values.fieldKey}
                colSpan={values.colSpan} colSpanMode={colSpanMode}
                rowSpan={values.rowSpan} rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus} onLabelKeyDown={onLabelKeyDown}
                isPk={values.isPk}
                required={values.required}
                readonly={values.readonly}
                onChange={onChange}
            />
            {/* Placeholder */}
            <div>
                <label className={LABEL_CLS}>Placeholder</label>
                <input type="text" value={values.placeholder || ''}
                    onChange={e => onChange({ placeholder: e.target.value })}
                    className={INPUT_CLS} />
            </div>
            {/* 유효성검사 (필수항목 + 최소/최대 글자 + 정규식) */}
            <ValidationSection
                fieldType="input"
                values={{
                    required: values.required ?? false,
                    minLength: values.minLength,
                    maxLength: values.maxLength,
                    pattern: values.pattern ?? '',
                    patternDesc: values.patternDesc ?? '',
                }}
                onChange={updates => onChange(updates)}
            />
        </div>
    );
}
