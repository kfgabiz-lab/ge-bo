'use client';

/**
 * CategoryField — 카테고리 계층 검색 필드 설정 컴포넌트
 *
 * 사용법:
 *   <CategoryField values={values} onChange={onChange}
 *     colSpanMode={{ type: 'button', options: [1,2,3,4,5] }}
 *     codeGroups={[]} codeGroupsLoading={false}
 *     slugOptions={slugOptions} />
 */

import React from 'react';
import { FieldEditProps } from './types';
import { FieldBase, INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { SlugSelectField } from './SlugSelectField';
import type { SlugOption } from './SlugSelectField';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../../contexts/BuilderI18nModeContext';
import type { SlugRelationOption } from '../../SearchBuilder';

interface CategoryFieldProps extends FieldEditProps {
    /** 카테고리 데이터 slug 목록 (PAGE_DATA 타입) */
    slugOptions: SlugOption[];
    /** 슬러그 로딩 여부 */
    slugOptionsLoading?: boolean;
    /** slug-relation 전체 목록 */
    slugRelationOptions?: SlugRelationOption[];
}

/** depth별 배열 특정 인덱스 값 업데이트 헬퍼 */
function updateDepthArray(arr: string[], index: number, value: string): string[] {
    const next = [...arr];
    next[index] = value;
    return next;
}

export function CategoryField({
    values, onChange, colSpanMode,
    autoFocus, onLabelKeyDown,
    slugOptions, slugOptionsLoading,
    slugRelationOptions = [],
}: CategoryFieldProps) {
    const { i18nMode } = useBuilderI18nMode();

    const maxDepth          = (values.maxDepth ?? 1) as 1 | 2 | 3 | 4;
    const depthLabels       = values.depthLabels       ?? [];
    const depthLabelMsgKeys = values.depthLabelMsgKeys ?? [];
    const depthValueFields  = values.depthValueFields  ?? [];
    const depthTextFields   = values.depthTextFields   ?? [];
    const depthFilters      = values.depthFilters      ?? [];

    /** depth 수 변경 시 모든 배열을 함께 잘라냄 */
    const handleMaxDepthChange = (d: 1 | 2 | 3 | 4) => {
        onChange({
            maxDepth: d,
            depthLabels:       depthLabels.slice(0, d),
            depthLabelMsgKeys: depthLabelMsgKeys.slice(0, d),
            depthValueFields:  depthValueFields.slice(0, d),
            depthTextFields:   depthTextFields.slice(0, d),
            depthFilters:      depthFilters.slice(0, d),
        });
    };

    return (
        <div className="space-y-1.5">
            {/* 라벨 / Key / ColSpan 공통 베이스 */}
            <FieldBase
                label={values.label}
                labelMsgKey={values.labelMsgKey}
                fieldKey={values.fieldKey}
                colSpan={values.colSpan}
                colSpanMode={colSpanMode}
                autoFocus={autoFocus}
                onLabelKeyDown={onLabelKeyDown}
                required={values.required}
                description={values.description}
                descriptionMsgKey={values.descriptionMsgKey}
                excludeFromSearch={values.excludeFromSearch}
                onChange={onChange}
            />

            {/* 카테고리 데이터 Slug 선택 */}
            {slugOptionsLoading ? (
                <div className="text-[10px] text-slate-400 py-1">슬러그 목록 로딩 중...</div>
            ) : (
                <SlugSelectField
                    value={values.dbSlug ?? ''}
                    onChange={slug => onChange({ dbSlug: slug || undefined })}
                    slugOptions={slugOptions}
                    label="카테고리 Slug"
                    emptyLabel="Slug를 선택하세요 (선택)"
                />
            )}

            {/* 연동 Slug 선택 (slug-relation 목록) */}
            <SlugSelectField
                label="연동 Slug"
                value={String(values.relationSlugId ?? '')}
                onChange={slug => onChange({ relationSlugId: slug ? Number(slug) : undefined })}
                slugOptions={slugRelationOptions.map(r => ({
                    id: r.id,
                    slug: String(r.id),
                    name: r.description
                        ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})`
                        : `${r.masterSlug} → ${r.slaveSlug}`,
                }))}
                formatDisplay={opt => opt.name}
                emptyLabel="연동 없음"
            />

            {/* 최대 Depth 선택 (1~4 버튼형) */}
            <div className="flex items-center justify-between">
                <span className={LABEL_CLS + ' !mb-0'}>최대 Depth</span>
                <div className="flex items-center gap-0.5">
                    {([1, 2, 3, 4] as const).map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => handleMaxDepthChange(d)}
                            className={`w-6 h-6 text-[10px] font-semibold rounded border transition-all
                                ${maxDepth === d
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* depth별 라벨(i18nMode 분기) | value 경로 | text 경로 */}
            <div className="space-y-1">
                {/* 헤더 */}
                <div className="grid grid-cols-[24px_1fr_72px_72px] gap-1 items-center">
                    <span />
                    <span className={LABEL_CLS + ' !mb-0'}>라벨</span>
                    <span className={LABEL_CLS + ' !mb-0'}>Value</span>
                    <span className={LABEL_CLS + ' !mb-0'}>Text</span>
                </div>

                {Array.from({ length: maxDepth }, (_, i) => (
                    <div key={i} className="space-y-0.5">
                        <div className="grid grid-cols-[24px_1fr_72px_72px] gap-1 items-center">
                            {/* depth 번호 */}
                            <span className="text-[10px] text-slate-400 text-right pr-0.5 shrink-0">
                                {i + 1}
                            </span>

                            {/* 라벨 — i18nMode: MessageKeySelector / 직접입력: input */}
                            {i18nMode ? (
                                <MessageKeySelector
                                    value={depthLabelMsgKeys[i] ?? ''}
                                    onChange={key => onChange({ depthLabelMsgKeys: updateDepthArray(depthLabelMsgKeys, i, key) })}
                                    resourceType="WORD"
                                    size="sm"
                                />
                            ) : (
                                <input
                                    type="text"
                                    value={depthLabels[i] ?? ''}
                                    onChange={e => onChange({ depthLabels: updateDepthArray(depthLabels, i, e.target.value) })}
                                    placeholder={['대분류', '중분류', '소분류', '세분류'][i]}
                                    className={INPUT_CLS}
                                />
                            )}

                            {/* Value — selectbox option value로 사용할 dataJson 경로 */}
                            <input
                                type="text"
                                value={depthValueFields[i] ?? ''}
                                onChange={e => onChange({ depthValueFields: updateDepthArray(depthValueFields, i, e.target.value) })}
                                placeholder="key 입력"
                                className={INPUT_CLS}
                            />

                            {/* Text — selectbox option 표시 텍스트 경로 */}
                            <input
                                type="text"
                                value={depthTextFields[i] ?? ''}
                                onChange={e => onChange({ depthTextFields: updateDepthArray(depthTextFields, i, e.target.value) })}
                                placeholder="key 입력"
                                className={INPUT_CLS}
                            />
                        </div>

                        {/* depth별 옵션 필터 조건식 — evalConditionExpr 문법 재사용 (선택) */}
                        <div className="grid grid-cols-[24px_1fr] gap-1 items-center">
                            <span />
                            <input
                                type="text"
                                value={depthFilters[i] ?? ''}
                                onChange={e => onChange({ depthFilters: updateDepthArray(depthFilters, i, e.target.value) })}
                                placeholder="옵션 필터 (선택, 예: status=1,type=Y)"
                                className={INPUT_CLS}
                            />
                        </div>
                    </div>
                ))}

                <div className="text-[9px] text-slate-300 pt-0.5">
                    경로 예시: id / dataJson.name / tab1.form1.title
                </div>
            </div>
        </div>
    );
}
