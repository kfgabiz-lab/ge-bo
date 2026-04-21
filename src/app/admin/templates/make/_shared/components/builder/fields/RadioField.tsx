'use client';

/**
 * RadioField — 라디오 단일선택 필드 설정 컴포넌트
 *
 * 사용법:
 *   <RadioField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={codeGroups} codeGroupsLoading={loading} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import { ToggleRow } from './_ToggleRow';

export function RadioField({ values, onChange, colSpanMode, rowSpanConfig, codeGroups, codeGroupsLoading, autoFocus, onLabelKeyDown }: FieldEditProps) {
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
