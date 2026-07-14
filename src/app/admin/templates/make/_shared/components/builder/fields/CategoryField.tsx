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
    /** slug-relation 전체 목록 중 FILTER 타입 — "연동 Slug"(relationSlugId, 카테고리 목록 자체 필터링)용 */
    slugRelationOptions?: SlugRelationOption[];
    /** slug-relation 전체 목록 중 FETCH 타입 — "옵션 사전필터"(optionFilterRelationSlugId)용 */
    fetchRelationOptions?: SlugRelationOption[];
}

/** depth별 배열 특정 인덱스 값 업데이트 헬퍼 */
function updateDepthArray(arr: string[], index: number, value: string): string[] {
    const next = [...arr];
    next[index] = value;
    return next;
}

/** 표시 Depth(activeDepths) 변경 시 depth별 배열을 새 순서에 맞게 재정렬
 *  — 기존에 값이 있던 depth는 그대로 유지하고, 새로 추가된 depth는 빈 문자열로 채운다 */
function remapDepthArray(arr: string[], oldDepths: number[], newDepths: number[]): string[] {
    return newDepths.map(d => {
        const oldIdx = oldDepths.indexOf(d);
        return oldIdx >= 0 ? (arr[oldIdx] ?? '') : '';
    });
}

/** 토글 결과 depth 배열이 "오름차순 연속 정수"인지 검사 — 아니면 그 토글 클릭은 무시한다 */
function isContiguousAscending(depths: number[]): boolean {
    if (depths.length === 0) return false;
    const sorted = [...depths].sort((a, b) => a - b);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] !== sorted[i - 1] + 1) return false;
    }
    return true;
}

/** depth별 라벨 placeholder — 실제 depth 번호(1~4) 기준 */
const DEPTH_LABEL_PLACEHOLDERS = ['대분류', '중분류', '소분류', '세분류'];

export function CategoryField({
    values, onChange, colSpanMode,
    autoFocus, onLabelKeyDown,
    slugOptions, slugOptionsLoading,
    slugRelationOptions = [],
    fetchRelationOptions = [],
}: CategoryFieldProps) {
    const { i18nMode } = useBuilderI18nMode();

    /* 화면에 노출할 depth 번호 배열 — 미설정 시(레거시 데이터) maxDepth로부터 [1..maxDepth]를 파생해 기존 동작 유지 */
    const activeDepths: number[] = values.activeDepths
        ?? Array.from({ length: values.maxDepth ?? 1 }, (_, i) => i + 1);

    const depthLabels       = values.depthLabels       ?? [];
    const depthLabelMsgKeys = values.depthLabelMsgKeys ?? [];
    const depthValueFields  = values.depthValueFields  ?? [];
    const depthTextFields   = values.depthTextFields   ?? [];
    const depthFilters      = values.depthFilters      ?? [];
    const depthParentFields = values.depthParentFields ?? [];

    /** 표시 Depth 버튼 토글 — 결과가 비연속이면 클릭 자체를 무시 */
    const handleToggleDepth = (d: number) => {
        const nextRaw = activeDepths.includes(d)
            ? activeDepths.filter(x => x !== d)
            : [...activeDepths, d];
        const next = [...nextRaw].sort((a, b) => a - b);
        if (!isContiguousAscending(next)) return;

        onChange({
            activeDepths: next,
            maxDepth: Math.max(...next) as 1 | 2 | 3 | 4, // 레거시 필드도 함께 갱신 — 하위호환 파생값과 어긋나지 않게 유지
            depthLabels:       remapDepthArray(depthLabels, activeDepths, next),
            depthLabelMsgKeys: remapDepthArray(depthLabelMsgKeys, activeDepths, next),
            depthValueFields:  remapDepthArray(depthValueFields, activeDepths, next),
            depthTextFields:   remapDepthArray(depthTextFields, activeDepths, next),
            depthFilters:      remapDepthArray(depthFilters, activeDepths, next),
            depthParentFields: remapDepthArray(depthParentFields, activeDepths, next),
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
                hideCondition={values.hideCondition}
                disableCondition={values.disableCondition}
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

            {/* 연동 Slug 선택 (slug-relation FILTER 목록) — 카테고리 목록 자체를 필터링 */}
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

            {/* 옵션 사전필터 — FETCH 관계 데이터 기준으로 카테고리 옵션 목록 자체를 좁힘 (선택) */}
            <div className="space-y-1 border border-slate-100 rounded p-1.5 bg-slate-50/50">
                <span className={LABEL_CLS + ' !mb-0.5'}>옵션 사전필터 (선택)</span>

                <SlugSelectField
                    label="연동 Slug (FETCH)"
                    value={String(values.optionFilterRelationSlugId ?? '')}
                    onChange={slug => onChange({ optionFilterRelationSlugId: slug ? Number(slug) : undefined })}
                    slugOptions={fetchRelationOptions.map(r => ({
                        id: r.id,
                        slug: String(r.id),
                        name: r.description
                            ? `${r.description} (${r.masterSlug} → ${r.slaveSlug})`
                            : `${r.masterSlug} → ${r.slaveSlug}`,
                    }))}
                    formatDisplay={opt => opt.name}
                    emptyLabel="연동 없음"
                />

                <div className="grid grid-cols-2 gap-1">
                    <div>
                        <label className={LABEL_CLS + ' !mb-0.5'}>필터 depth</label>
                        <input
                            type="number"
                            min={1}
                            max={4}
                            value={values.optionFilterDepth ?? ''}
                            onChange={e => onChange({ optionFilterDepth: e.target.value ? Number(e.target.value) : undefined })}
                            placeholder="예: 4"
                            className={INPUT_CLS}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS + ' !mb-0.5'}>부모 ID 경로</label>
                        <input
                            type="text"
                            value={values.optionFilterParentField ?? ''}
                            onChange={e => onChange({ optionFilterParentField: e.target.value || undefined })}
                            placeholder="예: product.parentId"
                            className={INPUT_CLS}
                        />
                    </div>
                </div>

                <div>
                    <label className={LABEL_CLS + ' !mb-0.5'}>필터 조건식</label>
                    <input
                        type="text"
                        value={values.optionFilterExpr ?? ''}
                        onChange={e => onChange({ optionFilterExpr: e.target.value || undefined })}
                        placeholder="예: _fetchedRel11=P"
                        className={INPUT_CLS}
                    />
                </div>
            </div>

            {/* 표시 Depth 선택 (1~4 다중 토글, 오름차순 연속만 허용) */}
            <div className="flex items-center justify-between">
                <span className={LABEL_CLS + ' !mb-0'}>표시 Depth</span>
                <div className="flex items-center gap-0.5">
                    {([1, 2, 3, 4] as const).map(d => (
                        <button
                            key={d}
                            type="button"
                            onClick={() => handleToggleDepth(d)}
                            className={`w-6 h-6 text-[10px] font-semibold rounded border transition-all
                                ${activeDepths.includes(d)
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-100'}`}
                        >
                            {d}
                        </button>
                    ))}
                </div>
            </div>

            {/* depth별 라벨(i18nMode 분기) / value 경로 | text 경로 */}
            <div className="space-y-1">
                {/* 헤더 — 1줄: 라벨 / 2줄: Value | Text */}
                <div className="grid grid-cols-[24px_1fr] gap-1 items-center">
                    <span />
                    <span className={LABEL_CLS + ' !mb-0'}>라벨</span>
                </div>
                <div className="grid grid-cols-[24px_1fr_1fr] gap-1 items-center">
                    <span />
                    <span className={LABEL_CLS + ' !mb-0'}>Value</span>
                    <span className={LABEL_CLS + ' !mb-0'}>Text</span>
                </div>

                {activeDepths.map((depthNum, i) => (
                    <div key={depthNum} className="space-y-0.5">
                        {/* 1줄: depth 번호 + 라벨 */}
                        <div className="grid grid-cols-[24px_1fr] gap-1 items-center">
                            {/* depth 번호 — activeDepths[i]를 그대로 표시 (연속 표시 순서가 아닌 실제 depth) */}
                            <span className="text-[10px] text-slate-400 text-right pr-0.5 shrink-0">
                                {depthNum}
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
                                    placeholder={DEPTH_LABEL_PLACEHOLDERS[depthNum - 1]}
                                    className={INPUT_CLS}
                                />
                            )}
                        </div>

                        {/* 2줄: Value | Text */}
                        <div className="grid grid-cols-[24px_1fr_1fr] gap-1 items-center">
                            <span />

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

                        {/* depth별 상위(부모) ID 경로 — 선택 항목의 dataJson에서 부모 id를 읽는 경로.
                            옵션 사전필터의 상향 교집합 매핑에도 사용되므로 항상 노출한다 */}
                        <div className="grid grid-cols-[24px_1fr] gap-1 items-center">
                            <span />
                            <input
                                type="text"
                                value={depthParentFields[i] ?? ''}
                                onChange={e => onChange({ depthParentFields: updateDepthArray(depthParentFields, i, e.target.value) })}
                                placeholder="상위 부모 ID 경로 (선택, 예: category.parentId)"
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
