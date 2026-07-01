'use client';

/**
 * DateRangeStatusColumnField — dateRangeStatus 테이블 컬럼 설정
 *
 * 연결할 dateRange 컬럼 Key와 이전/포함/이후 상태 텍스트를 설정한다.
 * i18nMode 활성화 시 MessageKeySelector로 다국어 키 선택으로 전환된다.
 *
 * 사용법:
 *   <DateRangeStatusColumnField values={col} onChange={patch => updateColumn(col.id, patch)} />
 */

import React from 'react';
import { ColEditProps } from './col-types';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

export function DateRangeStatusColumnField({ values, onChange }: ColEditProps) {
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="space-y-2 pt-1 border-t border-slate-100">
            {/* 연결 dateRange 컬럼 Key */}
            <div>
                <label className={LABEL_CLS}>연결 dateRange 컬럼 Key <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    value={values.linkedDateRangeKey ?? ''}
                    onChange={e => onChange({ linkedDateRangeKey: e.target.value || undefined })}
                    placeholder="예: period"
                    className={`${INPUT_CLS} font-mono`}
                />
            </div>
            {/* 연결 dateRange 서브타입 — 상태 판정 기준 포맷 결정 */}
            <div>
                <label className={LABEL_CLS}>날짜 범위 서브타입</label>
                <select
                    value={values.linkedRangeSubType ?? 'date'}
                    onChange={e => onChange({ linkedRangeSubType: e.target.value as 'date' | 'yearMonth' | 'datetime' | 'time' | 'timeSec' })}
                    className={INPUT_CLS}
                >
                    <option value="date">날짜 (YYYY-MM-DD)</option>
                    <option value="yearMonth">년월 (YYYY-MM)</option>
                    <option value="datetime">날짜+시각 (YYYY-MM-DD HH:mm)</option>
                    <option value="time">시분 (HH:mm)</option>
                    <option value="timeSec">시분초 (HH:mm:ss)</option>
                </select>
            </div>
            {/* 3개 상태 텍스트 — 3열 그리드 */}
            <div className="grid grid-cols-3 gap-2">
                <div>
                    <label className={LABEL_CLS}>이전 텍스트</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={values.beforeTextMsgKey ?? ''}
                            onChange={key => onChange({ beforeTextMsgKey: key })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={values.beforeText ?? ''}
                            onChange={e => onChange({ beforeText: e.target.value || undefined })}
                            placeholder="예정"
                            className={INPUT_CLS}
                        />
                    )}
                </div>
                <div>
                    <label className={LABEL_CLS}>포함 텍스트</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={values.inRangeTextMsgKey ?? ''}
                            onChange={key => onChange({ inRangeTextMsgKey: key })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={values.inRangeText ?? ''}
                            onChange={e => onChange({ inRangeText: e.target.value || undefined })}
                            placeholder="진행중"
                            className={INPUT_CLS}
                        />
                    )}
                </div>
                <div>
                    <label className={LABEL_CLS}>이후 텍스트</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={values.afterTextMsgKey ?? ''}
                            onChange={key => onChange({ afterTextMsgKey: key })}
                            resourceType="WORD"
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={values.afterText ?? ''}
                            onChange={e => onChange({ afterText: e.target.value || undefined })}
                            placeholder="종료"
                            className={INPUT_CLS}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
