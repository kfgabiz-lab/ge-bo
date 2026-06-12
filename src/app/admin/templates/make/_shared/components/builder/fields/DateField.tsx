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
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

export function DateField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan }: FieldEditProps) {
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
                onChange={onChange}
            />
            {/* date 기본값 설정 */}
            <ToggleRow
                label="오늘 날짜 자동 설정"
                value={values.defaultToday ?? false}
                onChange={v => onChange({ defaultToday: v || undefined })}
            />
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={values.minDate ?? ''}
                    onChange={e => onChange({ minDate: e.target.value || undefined })}
                    className={INPUT_CLS}
                />
                <span className="text-[11px] text-slate-500 whitespace-nowrap">이전 날짜 비활성화 <span className="text-slate-300">(선택)</span></span>
            </div>
            {/* 필수 항목 */}
        </div>
    );
}
