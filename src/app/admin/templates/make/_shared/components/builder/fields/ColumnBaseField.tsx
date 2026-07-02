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
import { SlugSelectField } from './SlugSelectField';
import { buildFetchKey } from './utils';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import type { SlugRelationOption } from '../../SearchBuilder';

interface ColumnBaseFieldProps extends ColEditProps {
    /** 추가 모드: 헤더명 input 자동 포커스 */
    autoFocus?: boolean;
    /** 연결 가능한 FETCH 슬러그 목록 (TableBuilder에서 connectedSlug 기준으로 필터링하여 전달) */
    fetchRelations?: SlugRelationOption[];
}

export function ColumnBaseField({ values, onChange, autoFocus, fetchRelations = [] }: ColumnBaseFieldProps) {
    const isActions = values.cellType === 'actions';
    const { i18nMode } = useBuilderI18nMode();

    return (
        <div className="space-y-2">
            {/* 헤더명 | 연결Slug — 2열 그리드 (actions 타입 제외) */}
            {!isActions && (
                <>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={LABEL_CLS}>헤더명 <span className="text-red-400">*</span></label>
                            {i18nMode ? (
                                <MessageKeySelector
                                    value={values.headerMsgKey ?? ''}
                                    onChange={key => onChange({ headerMsgKey: key })}
                                    resourceType="WORD"
                                    size="sm"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={values.header ?? ''}
                                    autoFocus={autoFocus}
                                    onChange={e => onChange({ header: e.target.value })}
                                    className={INPUT_CLS}
                                />
                            )}
                        </div>
                        <div>
                            <SlugSelectField
                                label="연결 Slug"
                                value={String(values.relationSlugId ?? '')}
                                onChange={slug => {
                                    if (slug) {
                                        const id = Number(slug);
                                        const selected = fetchRelations.find(r => r.id === id);
                                        onChange({
                                            relationSlugId: id,
                                            accessor: selected ? buildFetchKey(selected.id) : values.accessor,
                                        });
                                    } else {
                                        onChange({ relationSlugId: undefined });
                                    }
                                }}
                                slugOptions={fetchRelations.map(r => ({
                                    id: r.id,
                                    slug: String(r.id),
                                    name: r.description
                                        ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})`
                                        : `${r.masterSlug} → ${r.slaveSlug}`,
                                }))}
                                formatDisplay={opt => opt.name}
                                emptyLabel="연동 없음"
                            />
                        </div>
                    </div>

                    {/* KEY / DATA — 2열 그리드 */}
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                            <input
                                type="text"
                                value={values.accessor ?? ''}
                                onChange={e => onChange({ accessor: e.target.value })}
                                className={`${INPUT_CLS} font-mono`}
                            />
                        </div>
                        <div>
                            <label className={LABEL_CLS}>Data</label>
                            <input
                                type="text"
                                value={values.data ?? ''}
                                onChange={e => onChange({ data: e.target.value || undefined })}
                                className={`${INPUT_CLS} font-mono`}
                                placeholder="예: code=1?title|title2"
                            />
                        </div>
                    </div>
                </>
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
