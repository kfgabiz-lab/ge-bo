'use client';

/**
 * BooleanTextField — Boolean 셀 True/False 텍스트 설정
 *
 * boolean 타입 컬럼에서 true/false 값을 표시할 텍스트를 지정한다.
 * (예: 공개 / 비공개, 활성 / 비활성)
 *
 * 사용법:
 *   <BooleanTextField values={col} onChange={patch => updateColumn(col.id, patch)} />
 *   <BooleanTextField values={pendingCol} onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))} />
 */

import React from 'react';
import { ColEditProps } from './col-types';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';

export function BooleanTextField({ values, onChange }: ColEditProps) {
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
            <div>
                <label className={LABEL_CLS}>True 텍스트</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.trueTextMsgKey ?? ''}
                        onChange={key => onChange({ trueTextMsgKey: key })}
                        resourceType="WORD"
                        size="sm"
                    />
                ) : (
                    <input
                        type="text"
                        value={values.trueText ?? ''}
                        onChange={e => onChange({ trueText: e.target.value })}
                        placeholder="공개"
                        className={INPUT_CLS}
                    />
                )}
            </div>
            <div>
                <label className={LABEL_CLS}>False 텍스트</label>
                {i18nMode ? (
                    <MessageKeySelector
                        value={values.falseTextMsgKey ?? ''}
                        onChange={key => onChange({ falseTextMsgKey: key })}
                        resourceType="WORD"
                        size="sm"
                    />
                ) : (
                    <input
                        type="text"
                        value={values.falseText ?? ''}
                        onChange={e => onChange({ falseText: e.target.value })}
                        placeholder="비공개"
                        className={INPUT_CLS}
                    />
                )}
            </div>
        </div>
    );
}
