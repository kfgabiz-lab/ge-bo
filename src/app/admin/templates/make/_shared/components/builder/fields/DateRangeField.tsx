'use client';

/**
 * DateRangeField — 날짜 범위 (from~to) 필드 설정 컴포넌트
 * rangeSubType으로 날짜/년월/일시분/시분/시분초 5가지 범위 타입 통합 지원
 *
 * 사용법:
 *   <DateRangeField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5], minSpan: 2 }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS, INPUT_CLS } from './_FieldBase';
import { ToggleRow } from './_ToggleRow';

type RangeSubType = 'date' | 'yearMonth' | 'datetime' | 'time' | 'timeSec';

const BTN_CLS = 'w-6 h-7 text-xs font-bold rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 transition-colors flex-shrink-0';
const INPUT_DATE_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900';
const INPUT_DATE_READONLY_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-slate-50 text-slate-400';
const DATE_WRAP_CLS = 'flex-1 overflow-hidden flex-shrink-0';
const INPUT_NUM_CLS = 'w-10 border border-slate-200 rounded px-1 py-1.5 text-xs text-center bg-white focus:outline-none focus:border-slate-900';

/** 서브타입별 오늘 기준 N일 전 값 계산 — time/timeSec는 offset 무의미 */
const calcOffsetValue = (offset: number, subType: RangeSubType): string => {
    if (subType === 'time' || subType === 'timeSec') return '';
    const d = new Date();
    d.setDate(d.getDate() - offset);
    const iso = d.toISOString();
    if (subType === 'yearMonth') return iso.slice(0, 7);
    if (subType === 'datetime')  return iso.slice(0, 16);
    return iso.slice(0, 10); // date (기본)
};

export function DateRangeField({ values, onChange, colSpanMode, rowSpanConfig, autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields, slugEntityFields }: FieldEditProps) {
    /* yearMonthRange 기존 타입은 yearMonth subType으로 fallback */
    const subType: RangeSubType = (values.rangeSubType as RangeSubType) ?? 'date';
    const isTime = subType === 'time' || subType === 'timeSec'; // 시간 계열 타입 여부

    const startOffset = values.defaultStartDateOffset ?? 0;
    const endOffset   = values.defaultEndDateOffset   ?? 0;
    /* time 타입은 offset 개념 없음 */
    const isStartAuto = !isTime && startOffset !== 0;
    const isEndAuto   = !isTime && endOffset   !== 0;

    /* 시작 offset 핸들러 */
    const handleStartMinus = () => {
        const n = startOffset + 1;
        onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetValue(n, subType) });
    };
    const handleStartPlus = () => {
        const n = startOffset - 1;
        n === 0
            ? onChange({ defaultStartDateOffset: undefined, defaultStartDate: undefined })
            : onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetValue(n, subType) });
    };
    const handleStartOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        n === 0
            ? onChange({ defaultStartDateOffset: undefined, defaultStartDate: undefined })
            : onChange({ defaultStartDateOffset: n, defaultStartDate: calcOffsetValue(n, subType) });
    };

    /* 종료 offset 핸들러 */
    const handleEndMinus = () => {
        const n = endOffset + 1;
        onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetValue(n, subType) });
    };
    const handleEndPlus = () => {
        const n = endOffset - 1;
        n === 0
            ? onChange({ defaultEndDateOffset: undefined, defaultEndDate: undefined })
            : onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetValue(n, subType) });
    };
    const handleEndOffsetInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const n = Number(e.target.value) || 0;
        n === 0
            ? onChange({ defaultEndDateOffset: undefined, defaultEndDate: undefined })
            : onChange({ defaultEndDateOffset: n, defaultEndDate: calcOffsetValue(n, subType) });
    };

    /* 서브타입별 input type / 라벨 */
    const inputType = subType === 'yearMonth' ? 'month'
        : subType === 'datetime' ? 'datetime-local'
        : (subType === 'time' || subType === 'timeSec') ? 'time'
        : 'date';

    const startLabel = subType === 'timeSec' ? '시작 시분초 기본값'
        : subType === 'time' ? '시작 시분 기본값'
        : subType === 'yearMonth' ? '시작 년월 기본값'
        : subType === 'datetime' ? '시작 일시 기본값'
        : '시작일 기본값';

    const endLabel = subType === 'timeSec' ? '종료 시분초 기본값'
        : subType === 'time' ? '종료 시분 기본값'
        : subType === 'yearMonth' ? '종료 년월 기본값'
        : subType === 'datetime' ? '종료 일시 기본값'
        : '종료일 기본값';

    const disableLabel = isTime ? '(토글 on - 이전 시간 비활성화)'
        : subType === 'yearMonth' ? '(토글 on - 이전 년월 비활성화)'
        : '(토글 on - 이전 날짜 비활성화)';

    /* 서브타입 변경 시 날짜 기본값 초기화 */
    const handleSubTypeChange = (val: RangeSubType) => {
        onChange({
            rangeSubType: val,
            defaultStartDateOffset: undefined,
            defaultStartDate: undefined,
            defaultEndDateOffset: undefined,
            defaultEndDate: undefined,
        });
    };

    return (
        <div className="space-y-1.5">
            {/* 범위 타입 선택 — 라벨/Key보다 먼저 배치 */}
            <div>
                <label className={LABEL_CLS}>범위 타입</label>
                <select
                    value={subType}
                    onChange={e => handleSubTypeChange(e.target.value as RangeSubType)}
                    className={INPUT_CLS}
                >
                    <option value="date">날짜 (YYYY-MM-DD)</option>
                    <option value="yearMonth">년월 (YYYY-MM)</option>
                    <option value="datetime">일시분초 (YYYY-MM-DD HH:mm)</option>
                    <option value="time">시분 (HH:mm)</option>
                    <option value="timeSec">시분초 (HH:mm:ss)</option>
                </select>
            </div>

            {/* 단일 날짜 범위 검색 — date 단일 컬럼을 범위 검색 시 사용 */}
            <div>
                <label className={LABEL_CLS}>단일 날짜 범위 검색</label>
                <ToggleRow
                    label="단일 date 컬럼을 범위 필터링 (_gte/_lte)"
                    value={values.singleDateRange ?? false}
                    onChange={v => onChange({ singleDateRange: v || undefined })}
                />
            </div>

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
                excludeFromSearch={values.excludeFromSearch}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                slugEntityFields={slugEntityFields}
                onChange={onChange}
            />

            {/* 시작 기본값 */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>
                        {startLabel}
                        {!isTime && <span className="text-slate-300 font-normal"> {disableLabel}</span>}
                    </label>
                    {isTime ? (
                        /* 시간 계열: 직접 시간 입력 (offset 없음), timeSec는 초 단위 step=1 */
                        <input
                            type="time"
                            step={subType === 'timeSec' ? 1 : undefined}
                            value={values.defaultStartDate ?? ''}
                            onChange={e => onChange({ defaultStartDate: e.target.value || undefined })}
                            className={INPUT_DATE_CLS}
                        />
                    ) : (
                        /* 나머지 타입: offset ±버튼 + 날짜 입력 */
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={handleStartMinus} className={BTN_CLS}>-</button>
                            <input type="number" value={startOffset} onChange={handleStartOffsetInput} className={INPUT_NUM_CLS} />
                            <button type="button" onClick={handleStartPlus} className={BTN_CLS}>+</button>
                            <div className={DATE_WRAP_CLS}>
                                {isStartAuto ? (
                                    <input type={inputType} value={calcOffsetValue(startOffset, subType)} readOnly className={INPUT_DATE_READONLY_CLS} />
                                ) : (
                                    <input type={inputType} value={values.defaultStartDate ?? ''} onChange={e => onChange({ defaultStartDate: e.target.value || undefined })} className={INPUT_DATE_CLS} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 pb-1">
                    <ToggleRow label="" value={values.disableStartPast ?? false} onChange={v => onChange({ disableStartPast: v || undefined })} />
                </div>
            </div>

            {/* 종료 기본값 */}
            <div className="flex items-end gap-2">
                <div className="flex-1">
                    <label className={LABEL_CLS}>
                        {endLabel}
                        {!isTime && <span className="text-slate-300 font-normal"> {disableLabel}</span>}
                    </label>
                    {isTime ? (
                        /* 시간 계열: 직접 시간 입력 (offset 없음), timeSec는 초 단위 step=1 */
                        <input
                            type="time"
                            step={subType === 'timeSec' ? 1 : undefined}
                            value={values.defaultEndDate ?? ''}
                            onChange={e => onChange({ defaultEndDate: e.target.value || undefined })}
                            className={INPUT_DATE_CLS}
                        />
                    ) : (
                        <div className="flex items-center gap-1">
                            <button type="button" onClick={handleEndMinus} className={BTN_CLS}>-</button>
                            <input type="number" value={endOffset} onChange={handleEndOffsetInput} className={INPUT_NUM_CLS} />
                            <button type="button" onClick={handleEndPlus} className={BTN_CLS}>+</button>
                            <div className={DATE_WRAP_CLS}>
                                {isEndAuto ? (
                                    <input type={inputType} value={calcOffsetValue(endOffset, subType)} readOnly className={INPUT_DATE_READONLY_CLS} />
                                ) : (
                                    <input type={inputType} value={values.defaultEndDate ?? ''} onChange={e => onChange({ defaultEndDate: e.target.value || undefined })} className={INPUT_DATE_CLS} />
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="flex-shrink-0 pb-1">
                    <ToggleRow label="" value={values.disableEndPast ?? false} onChange={v => onChange({ disableEndPast: v || undefined })} />
                </div>
            </div>

            {/* 최대 조회 기간 — 검색 시 범위 초과 방지 (0 또는 미설정 시 제한 없음) */}
            <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">최대 조회 기간</p>
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>
                            기간 <span className="text-slate-300 font-normal">(선택)</span>
                        </label>
                        {/* INPUT_CLS 재사용 — 셀 전체 너비를 채워야 하므로 좁은 INPUT_NUM_CLS 대신 사용 */}
                        <input
                            type="number"
                            min={0}
                            value={values.maxRangeValue ?? ''}
                            onChange={e => {
                                const n = Number(e.target.value) || 0;
                                onChange({ maxRangeValue: n > 0 ? n : undefined });
                            }}
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>단위</label>
                        {/* INPUT_CLS 기존 상수 재사용 */}
                        <select
                            value={values.maxRangeUnit ?? 'day'}
                            onChange={e => onChange({ maxRangeUnit: e.target.value as 'day' | 'week' | 'month' | 'year' })}
                            className={INPUT_CLS}
                        >
                            <option value="day">일</option>
                            <option value="week">주</option>
                            <option value="month">월</option>
                            <option value="year">년</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
