'use client';

/**
 * DateField — 날짜 단독 필드 설정 컴포넌트
 *
 * 사용법:
 *   <DateField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

export function DateField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown }: FieldEditProps) {
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
            {/* 필수 항목 */}
        </div>
    );
}
