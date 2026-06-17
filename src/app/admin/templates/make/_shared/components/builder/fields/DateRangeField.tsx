'use client';

/**
 * DateRangeField — 날짜 범위 (from~to) 필드 설정 컴포넌트
 *
 * 사용법:
 *   <DateRangeField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5], minSpan: 2 }}
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

export function DateRangeField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan }: FieldEditProps) {
    const startOffset = values.defaultStartDateOffset ?? 0;
    const endOffset   = values.defaultEndDateOffset   ?? 0;
    /* 0이 아닌 경우(양수=이전 날짜, 음수=이후 날짜) 자동계산 */
    const isStartAuto = startOffset !== 0;
    const isEndAuto   = endOffset   !== 0;

    /* - 클릭: 날짜를 더 과거로 (offset 증가) */
    const handleStartMinus = () => {
        const n = startOffset + 1;
        onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetDate(n) });
    };
    /* + 클릭: 날짜를 더 미래로 (offset 감소), 0이 되면 수동 입력 전환 */
    const handleStartPlus = () => {
        const n = startOffset - 1;
        n === 0
            ? onChange({ defaultStartDateOffset: undefined, defaultStartDate: undefined })
            : onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetDate(n) });
    };
    const handleStartInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        n === 0
            ? onChange({ defaultStartDateOffset: undefined, defaultStartDate: undefined })
            : onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetDate(n) });
    };

    /* - 클릭: 날짜를 더 과거로 (offset 증가) */
    const handleEndMinus = () => {
        const n = endOffset + 1;
        onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetDate(n) });
    };
    /* + 클릭: 날짜를 더 미래로 (offset 감소), 0이 되면 수동 입력 전환 */
    const handleEndPlus = () => {
        const n = endOffset - 1;
        n === 0
            ? onChange({ defaultEndDateOffset: undefined, defaultEndDate: undefined })
            : onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetDate(n) });
    };
    const handleEndInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        n === 0
            ? onChange({ defaultEndDateOffset: undefined, defaultEndDate: undefined })
            : onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetDate(n) });
    };

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
            {/* 시작일 기본값 | 비활성화 */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>시작일 기본값 <span className="text-slate-300 font-normal">(토글 on - 이전 날짜 비활성화)</span></label>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={handleStartMinus} className={BTN_CLS}>-</button>
                        <input type="number" value={startOffset} onChange={handleStartInput} className={INPUT_NUM_CLS} />
                        <button type="button" onClick={handleStartPlus} className={BTN_CLS}>+</button>
                        <div className={DATE_WRAP_CLS}>
                            {isStartAuto ? (
                                <input type="date" value={calcOffsetDate(startOffset)} readOnly className={INPUT_DATE_READONLY_CLS} />
                            ) : (
                                <input type="date" value={values.defaultStartDate ?? ''} onChange={e => onChange({ defaultStartDate: e.target.value || undefined })} className={INPUT_DATE_CLS} />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 pb-1">
                    <ToggleRow label="" value={values.disableStartPast ?? false} onChange={v => onChange({ disableStartPast: v || undefined })} />
                </div>
            </div>
            {/* 종료일 기본값 | 비활성화 */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>종료일 기본값 <span className="text-slate-300 font-normal">(토글 on - 이전 날짜 비활성화)</span></label>
                    <div className="flex items-center gap-1">
                        <button type="button" onClick={handleEndMinus} className={BTN_CLS}>-</button>
                        <input type="number" value={endOffset} onChange={handleEndInput} className={INPUT_NUM_CLS} />
                        <button type="button" onClick={handleEndPlus} className={BTN_CLS}>+</button>
                        <div className={DATE_WRAP_CLS}>
                            {isEndAuto ? (
                                <input type="date" value={calcOffsetDate(endOffset)} readOnly className={INPUT_DATE_READONLY_CLS} />
                            ) : (
                                <input type="date" value={values.defaultEndDate ?? ''} onChange={e => onChange({ defaultEndDate: e.target.value || undefined })} className={INPUT_DATE_CLS} />
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 pb-1">
                    <ToggleRow label="" value={values.disableEndPast ?? false} onChange={v => onChange({ disableEndPast: v || undefined })} />
                </div>
            </div>
        </div>
    );
}
