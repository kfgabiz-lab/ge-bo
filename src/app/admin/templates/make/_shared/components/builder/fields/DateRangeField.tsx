'use client';

/**
 * DateRangeField — 날짜 범위 (from~to) 필드 설정 컴포넌트
 * - 라벨 1 / 라벨 2 두 개 입력
 * - colSpan 최소값 2 적용
 *
 * 사용법:
 *   <DateRangeField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5], minSpan: 2 }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

export function DateRangeField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown }: FieldEditProps) {
    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} label2={values.label2} showLabel2
                fieldKey={values.fieldKey}
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
