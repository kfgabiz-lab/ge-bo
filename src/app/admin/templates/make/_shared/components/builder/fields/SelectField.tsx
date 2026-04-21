'use client';

/**
 * SelectField — 셀렉트 박스 필드 설정 컴포넌트
 *
 * 사용법:
 *   <SelectField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={codeGroups} codeGroupsLoading={loading} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import { ToggleRow } from './_ToggleRow';

export function SelectField({ values, onChange, colSpanMode, rowSpanConfig, codeGroups, codeGroupsLoading, autoFocus, onLabelKeyDown }: FieldEditProps) {
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
                    placeholder="예: 전체"
                    className={INPUT_CLS} />
            </div>
            {/* 옵션 */}
            <FieldOptions
                options={values.options} codeGroupCode={values.codeGroupCode}
                codeGroups={codeGroups} codeGroupsLoading={codeGroupsLoading}
                onChange={updates => onChange(updates)}
            />
            {/* 필수 항목 */}
        </div>
    );
}
