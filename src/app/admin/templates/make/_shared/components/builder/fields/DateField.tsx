'use client';

/**
 * DateField — 날짜 단독 필드 설정 컴포넌트
 * dateSubType으로 날짜/년월/일시분초 3가지 타입 통합 지원
 *
 * 사용법:
 *   <DateField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

type DateSubType = 'date' | 'yearMonth' | 'datetime';

const BTN_CLS = 'w-6 h-7 text-xs font-bold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0';
const INPUT_DATE_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';
const INPUT_DATE_READONLY_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-slate-50 text-slate-400';
const DATE_WRAP_CLS = 'w-[calc(var(--spacing)*25)] overflow-hidden flex-shrink-0';
const INPUT_NUM_CLS = 'w-10 border border-slate-200 rounded px-1 py-1.5 text-xs text-center bg-white focus:outline-none focus:border-slate-900';

/** 서브타입별 오늘 기준 N일 전 값 계산 */
const calcOffsetValue = (offset: number, subType: DateSubType): string => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = d.toISOString();
    if (subType === 'yearMonth') return iso.slice(0, 7);
    if (subType === 'datetime')  return iso.slice(0, 16);
    return iso.slice(0, 10);
};

export function DateField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields }: FieldEditProps) {
    /* yearMonth 기존 타입은 yearMonth subType으로 fallback */
    const subType: DateSubType = (values.dateSubType as DateSubType) ?? 'date';
    const offset = values.defaultDateOffset ?? 0;
    /* 0이 아닌 경우 자동계산 표시 */
    const isAutoCalc = offset !== 0;
    /* 오늘날짜 토글 ON 시 +/- 버튼·입력 전체 비활성화 */
    const isTodayLocked = values.defaultToday === true;

    /* 서브타입 변경 시 날짜 기본값 초기화 */
    const handleSubTypeChange = (val: DateSubType) => {
        onChange({
            dateSubType: val,
            defaultDateOffset: undefined,
            defaultDate: undefined,
        });
    };

    /* - 클릭: 날짜를 더 과거로 (offset 증가) */
    const handleMinus = () => {
        const n = offset + 1;
        onChange({ defaultDateOffset: n, defaultDate: calcOffsetValue(n, subType) });
    };

    /* + 클릭: 날짜를 더 미래로 (offset 감소), 0이 되면 수동 입력 전환 */
    const handlePlus = () => {
        const n = offset - 1;
        if (n === 0) {
            onChange({ defaultDateOffset: undefined, defaultDate: undefined });
        } else {
            onChange({ defaultDateOffset: n, defaultDate: calcOffsetValue(n, subType) });
        }
    };

    const handleOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        if (n === 0) {
            onChange({ defaultDateOffset: undefined, defaultDate: undefined });
        } else {
            onChange({ defaultDateOffset: n, defaultDate: calcOffsetValue(n, subType) });
        }
    };

    /* 서브타입별 input type */
    const inputType = subType === 'yearMonth' ? 'month'
        : subType === 'datetime' ? 'datetime-local'
        : 'date';

    const disableLabel = subType === 'yearMonth' ? '이전 년월 비활성화'
        : subType === 'datetime' ? '이전 일시 비활성화'
        : '이전 날짜 비활성화';

    return (
        <div className="space-y-1.5">
            {/* 날짜 타입 선택 — 라벨/Key보다 먼저 배치 */}
            <div>
                <label className={LABEL_CLS}>날짜 타입</label>
                <select
                    value={subType}
                    onChange={e => handleSubTypeChange(e.target.value as DateSubType)}
                    className={INPUT_CLS}
                >
                    <option value="date">날짜 (YYYY-MM-DD)</option>
                    <option value="yearMonth">년월 (YYYY-MM)</option>
                    <option value="datetime">일시분초 (YYYY-MM-DD HH:mm)</option>
                </select>
            </div>

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
                excludeFromSearch={values.excludeFromSearch}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                slugEntityFields={slugEntityFields}
                onChange={onChange}
            />

            {/* 기본값 섹션 */}
            <div>
                <label className={LABEL_CLS}>기본값</label>
                <div className="flex items-center gap-1">
                    {/* 오늘날짜 ON 시 +/- 버튼·숫자 input 비활성화 */}
                    <button
                        type="button"
                        onClick={handleMinus}
                        disabled={isTodayLocked}
                        className={`${BTN_CLS} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >-</button>
                    <input
                        type="number"
                        value={offset}
                        onChange={handleOffsetInput}
                        disabled={isTodayLocked}
                        className={`${INPUT_NUM_CLS} disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed`}
                    />
                    <button
                        type="button"
                        onClick={handlePlus}
                        disabled={isTodayLocked}
                        className={`${BTN_CLS} disabled:opacity-40 disabled:cursor-not-allowed`}
                    >+</button>
                    {/* 날짜 input — offset≠0이면 자동계산 readonly, 0이면 수동 입력, 오늘날짜 ON 시 비활성화 */}
                    <div className={DATE_WRAP_CLS}>
                        {isTodayLocked ? (
                            <input
                                type={inputType}
                                value={calcOffsetValue(0, subType)}
                                readOnly
                                disabled
                                className={INPUT_DATE_READONLY_CLS}
                            />
                        ) : isAutoCalc ? (
                            <input
                                type={inputType}
                                value={calcOffsetValue(offset, subType)}
                                readOnly
                                className={INPUT_DATE_READONLY_CLS}
                            />
                        ) : (
                            <input
                                type={inputType}
                                value={values.defaultDate ?? ''}
                                onChange={e => onChange({ defaultDate: e.target.value || undefined })}
                                className={INPUT_DATE_CLS}
                            />
                        )}
                    </div>
                </div>
                {/* 하단 토글 2개 — 이전 날짜 비활성화 | 오늘날짜 */}
                <div className="flex items-center justify-between mt-2">
                    <ToggleRow
                        label={disableLabel}
                        value={values.disablePast ?? false}
                        onChange={v => onChange({ disablePast: v || undefined })}
                    />
                    <ToggleRow
                        label="오늘날짜"
                        value={values.defaultToday ?? false}
                        onChange={v => {
                            /* 오늘날짜 ON 시 offset·수동날짜 초기화 */
                            onChange({
                                defaultToday: v || undefined,
                                defaultDateOffset: v ? undefined : values.defaultDateOffset,
                                defaultDate: v ? undefined : values.defaultDate,
                            });
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
