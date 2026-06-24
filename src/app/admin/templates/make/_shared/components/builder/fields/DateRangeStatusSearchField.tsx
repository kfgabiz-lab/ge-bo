'use client';

/**
 * DateRangeStatusSearchField — dateRangeStatus 검색 필드 설정
 *
 * 연결할 dateRange 필드 Key, 표시 방식(select/radio), 상태 텍스트 3개를 설정한다.
 * i18nMode 활성화 시 MessageKeySelector로 다국어 키 선택으로 전환된다.
 *
 * 사용법:
 *   <DateRangeStatusSearchField values={field} onChange={onChange} colSpanMode={...} codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

export function DateRangeStatusSearchField({
    values, onChange, colSpanMode, rowSpanConfig,
    autoFocus, onLabelKeyDown, hideColSpan, hideConditionFields,
}: FieldEditProps) {
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="space-y-1.5">
            <FieldBase
                label={values.label}
                labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan}
                colSpanMode={colSpanMode}
                rowSpan={values.rowSpan}
                rowSpanConfig={rowSpanConfig}
                autoFocus={autoFocus}
                onLabelKeyDown={onLabelKeyDown}
                required={values.required}
                description={values.description}
                descriptionMsgKey={values.descriptionMsgKey}
                hideColSpan={hideColSpan}
                hideConditionFields={hideConditionFields}
                excludeFromSearch={values.excludeFromSearch}
                onChange={onChange}
            />
            {/* 연결 dateRange 필드 Key */}
            <div>
                <label className={LABEL_CLS}>연결 dateRange 필드 Key <span className="text-red-400">*</span></label>
                <input
                    type="text"
                    value={values.linkedDateRangeKey ?? ''}
                    onChange={e => onChange({ linkedDateRangeKey: e.target.value || undefined })}
                    placeholder="예: period"
                    className={`${INPUT_CLS} font-mono`}
                />
            </div>
            {/* 표시 방식 — select / radio 토글 */}
            <div>
                <label className={LABEL_CLS}>표시 방식</label>
                <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                    {(['select', 'radio'] as const).map(style => (
                        <button
                            key={style}
                            type="button"
                            onClick={() => onChange({ statusDisplayStyle: style })}
                            className={`flex-1 py-1.5 text-[10px] font-semibold rounded transition-all ${
                                (values.statusDisplayStyle ?? 'select') === style
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {style === 'select' ? 'Select' : 'Radio'}
                        </button>
                    ))}
                </div>
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
