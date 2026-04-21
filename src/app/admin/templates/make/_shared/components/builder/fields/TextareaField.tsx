'use client';

/**
 * TextareaField — 여러 줄 텍스트 내용 입력 필드 설정 컴포넌트
 *
 * 텍스트 블록을 구성할 때 사용하는 빌더 설정 컴포넌트.
 * Space 위젯의 텍스트 아이템 설정에 사용하며, 향후 다른 위젯에서도 재사용 가능.
 *
 * 사용법:
 *   <TextareaField values={field} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, LABEL_CLS } from './_FieldBase';

export function TextareaField({
    values,
    onChange,
    colSpanMode,
    rowSpanConfig,
    compact,
    autoFocus,
    onLabelKeyDown
}: FieldEditProps) {
    return (
        <FieldBase
            label={values.label}
            fieldKey={values.fieldKey || ''}
            colSpan={values.colSpan}
            colSpanMode={colSpanMode}
            rowSpan={values.rowSpan}
            rowSpanConfig={rowSpanConfig}
            compact={compact}
            autoFocus={autoFocus}
            isPk={values.isPk}
                required={values.required}
                readonly={values.readonly}
            onChange={onChange}
            onLabelKeyDown={onLabelKeyDown}
        >
            <div className="space-y-2.5">
                {/* 텍스트 내용 입력 */}
                <div>
                    <label className={LABEL_CLS}>내용</label>
                    <textarea
                        value={values.content ?? ''}
                        onChange={e => onChange({ content: e.target.value })}
                        placeholder="표시할 텍스트를 입력하세요"
                        rows={3}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs resize-none focus:outline-none focus:border-slate-900 leading-normal"
                    />
                </div>

                {/* 스타일 설정 (크기, 굵게, 색상) */}
                <div className="flex items-end gap-3 border-t border-slate-100 pt-2.5">
                    <div className="flex-1">
                        <label className={LABEL_CLS}>글자 크기 (px)</label>
                        <input
                            type="number"
                            value={values.fontSize ?? 12}
                            onChange={e => onChange({ fontSize: Number(e.target.value) })}
                            className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-900"
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>굵게</label>
                        <button
                            type="button"
                            onClick={() => onChange({ bold: !values.bold })}
                            className={`h-7 px-3 rounded text-[10px] font-bold border transition-all ${values.bold ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'}`}
                        >
                            B
                        </button>
                    </div>
                    <div className="flex-1">
                        <label className={LABEL_CLS}>색상</label>
                        <select
                            value={values.textColor ?? '#334155'}
                            onChange={e => onChange({ textColor: e.target.value })}
                            className="w-full border border-slate-200 rounded px-1.5 py-1 text-xs focus:outline-none focus:border-slate-900 bg-white"
                        >
                            <option value="#334155">기본 (Slate)</option>
                            <option value="#000000">검정</option>
                            <option value="#64748b">회색</option>
                            <option value="#ef4444">빨강</option>
                            <option value="#3b82f6">파랑</option>
                            <option value="#10b981">초록</option>
                            <option value="#f59e0b">주황</option>
                            <option value="#8b5cf6">보라</option>
                        </select>
                    </div>
                </div>
            </div>
        </FieldBase>
    );
}
