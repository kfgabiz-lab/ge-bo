'use client';

/**
 * ColumnBaseField — 컬럼 기본 설정 (헤더명, Key, 너비, 정렬, 정렬활성화)
 *
 * 모든 셀 타입에 공통으로 나타나는 기본 컬럼 설정 UI.
 * actions 타입은 헤더명/Key 숨김, 그 외 타입은 전체 표시.
 *
 * 사용법:
 *   // 편집 모드
 *   <ColumnBaseField values={col} onChange={patch => updateColumn(col.id, patch)} />
 *   // 추가 모드 (헤더명 자동 포커스)
 *   <ColumnBaseField values={pendingCol} onChange={patch => setPendingCol(prev => ({ ...prev!, ...patch }))} autoFocus />
 */

import React from 'react';
import { ColEditProps } from './col-types';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';

interface ColumnBaseFieldProps extends ColEditProps {
    /** 추가 모드: 헤더명 input 자동 포커스 */
    autoFocus?: boolean;
}

export function ColumnBaseField({ values, onChange, autoFocus }: ColumnBaseFieldProps) {
    const isActions = values.cellType === 'actions';

    return (
        <div className="space-y-2">
            {/* 헤더명 / Key — 2열 그리드 (actions 타입 제외) */}
            {!isActions && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>헤더명 <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={values.header ?? ''}
                            autoFocus={autoFocus}
                            onChange={e => onChange({ header: e.target.value })}
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={values.accessor ?? ''}
                            onChange={e => onChange({ accessor: e.target.value })}
                            className={`${INPUT_CLS} font-mono`}
                        />
                    </div>
                </div>
            )}

            {/* 너비(+단위) / 정렬 — 2열 그리드 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>너비</label>
                    <div className="flex">
                        <input
                            type="number"
                            value={values.width ?? ''}
                            onChange={e => onChange({ width: Number(e.target.value) || undefined })}
                            className="flex-1 min-w-0 border border-slate-200 rounded-l px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                        <select
                            value={values.widthUnit ?? 'px'}
                            onChange={e => onChange({ widthUnit: e.target.value as 'px' | '%' })}
                            className="border border-l-0 border-slate-200 rounded-r px-1 py-1.5 text-xs bg-slate-50 focus:outline-none focus:border-slate-900"
                        >
                            <option value="px">px</option>
                            <option value="%">%</option>
                        </select>
                    </div>
                </div>
                <div>
                    <label className={LABEL_CLS}>정렬</label>
                    <select
                        value={values.align ?? 'left'}
                        onChange={e => onChange({ align: e.target.value as 'left' | 'center' | 'right' })}
                        className={INPUT_CLS}
                    >
                        <option value="left">좌측</option>
                        <option value="center">중앙</option>
                        <option value="right">우측</option>
                    </select>
                </div>
            </div>

            {/* 정렬 활성화 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={values.sortable ?? true}
                    onChange={e => onChange({ sortable: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-400 text-slate-900"
                />
                <span className="text-[11px] text-slate-600">정렬 활성화</span>
            </label>
        </div>
    );
}
