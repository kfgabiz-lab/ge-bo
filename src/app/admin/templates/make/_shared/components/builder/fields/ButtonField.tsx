'use client';

/**
 * ButtonField — 선택 버튼 필드 설정 컴포넌트
 * - 다중선택(multiSelect) 토글 포함
 *
 * 사용법:
 *   <ButtonField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={codeGroups} codeGroupsLoading={loading} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase } from './_FieldBase';
import { FieldOptions } from './_FieldOptions';
import { ToggleRow } from './_ToggleRow';

export function ButtonField({ values, onChange, colSpanMode, rowSpanConfig, codeGroups, codeGroupsLoading, autoFocus, onLabelKeyDown }: FieldEditProps) {
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
            {/* 다중선택 */}
            <ToggleRow label="다중선택" value={values.multiSelect ?? false} onChange={v => onChange({ multiSelect: v })} />
        </div>
    );
}
