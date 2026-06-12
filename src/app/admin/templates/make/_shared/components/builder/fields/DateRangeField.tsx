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
import { FieldBase, INPUT_CLS } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

export function DateRangeField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan }: FieldEditProps) {
    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label} labelMsgKey={values.labelMsgKey}
                label2={values.label2} label2MsgKey={values.label2MsgKey} showLabel2
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
            <div className="flex items-center gap-2">
                <input
                    type="date"
                    value={values.minDate ?? ''}
                    onChange={e => onChange({ minDate: e.target.value || undefined })}
                    className={INPUT_CLS}
                />
                <span className="text-[11px] text-slate-500 whitespace-nowrap">이전 날짜 비활성화 <span className="text-slate-300">(선택)</span></span>
            </div>
        </div>
    );
}
