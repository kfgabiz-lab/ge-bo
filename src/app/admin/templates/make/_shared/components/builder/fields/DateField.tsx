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
import { FieldBase, LABEL_CLS } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

/** 오늘 기준 N일 전 날짜 계산 (YYYY-MM-DD) */
const calcOffsetDate = (offset: number): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return d.toISOString().slice(0, 10);
};

const BTN_CLS = 'w-6 h-7 text-xs font-bold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0';
const INPUT_DATE_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';
const INPUT_DATE_READONLY_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-slate-50 text-slate-400';
const DATE_WRAP_CLS = 'w-[calc(var(--spacing)*25)] overflow-hidden flex-shrink-0';
const INPUT_NUM_CLS = 'w-10 border border-slate-200 rounded px-1 py-1.5 text-xs text-center bg-white focus:outline-none focus:border-slate-900';

export function DateField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan }: FieldEditProps) {
    const offset = values.defaultDateOffset ?? 0;
    /* 0이 아닌 경우(양수=이전 날짜, 음수=이후 날짜) 자동계산 */
    const isAutoCalc = offset !== 0;

    /* - 클릭: 날짜를 더 과거로 (offset 증가) */
    const handleMinus = () => {
        const n = offset + 1;
        onChange({ defaultDateOffset: n, defaultDate: calcOffsetDate(n) });
    };

    /* + 클릭: 날짜를 더 미래로 (offset 감소), 0이 되면 수동 입력 전환 */
    const handlePlus = () => {
        const n = offset - 1;
        if (n === 0) {
            onChange({ defaultDateOffset: undefined, defaultDate: undefined });
        } else {
            onChange({ defaultDateOffset: n, defaultDate: calcOffsetDate(n) });
        }
    };

    const handleOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        if (n === 0) {
            onChange({ defaultDateOffset: undefined, defaultDate: undefined });
        } else {
            onChange({ defaultDateOffset: n, defaultDate: calcOffsetDate(n) });
        }
    };

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
            {/* 기본값 | 비활성화 */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>기본값 <span className="text-slate-300 font-normal">(토글 on - 이전 날짜 비활성화)</span></label>
                    <div className="flex items-center gap-1">
                        {/* -/+ 버튼 + 숫자 입력 */}
                        <button type="button" onClick={handleMinus} className={BTN_CLS}>-</button>
                        <input
                            type="number"
                            value={offset}
                            onChange={handleOffsetInput}
                            className={INPUT_NUM_CLS}
                        />
                        <button type="button" onClick={handlePlus} className={BTN_CLS}>+</button>
                        {/* 날짜 input — 숫자≠0이면 자동계산 readonly, 0이면 수동 입력 */}
                        <div className={DATE_WRAP_CLS}>
                            {isAutoCalc ? (
                                <input
                                    type="date"
                                    value={calcOffsetDate(offset)}
                                    readOnly
                                    className={INPUT_DATE_READONLY_CLS}
                                />
                            ) : (
                                <input
                                    type="date"
                                    value={values.defaultDate ?? ''}
                                    onChange={e => onChange({ defaultDate: e.target.value || undefined })}
                                    className={INPUT_DATE_CLS}
                                />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 pb-1">
                    <ToggleRow
                        label=""
                        value={values.disablePast ?? false}
                        onChange={v => onChange({ disablePast: v || undefined })}
                    />
                </div>
            </div>
        </div>
    );
}
