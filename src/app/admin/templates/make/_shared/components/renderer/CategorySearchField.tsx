'use client';

/**
 * CategorySearchField — 카테고리 계층 검색 selectbox 렌더러
 *
 * - preview 모드: 샘플 옵션 표시 (disabled)
 * - live 모드: depth별 API 연동, 상위 선택값으로 하위 옵션 동적 로드
 *
 * onChange: 가장 깊이 선택된 항목의 ID 하나만 전달
 *
 * 사용법:
 *   <CategorySearchField mode={mode} field={field} value={value} onChange={onChange} isDisabled={isDisabled} />
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '@/lib/api';
import { resolveAccessor, evalConditionExpr } from '../../utils';
import type { SearchFieldConfig } from '../../types';
import type { RendererMode } from './types';

interface CategoryItem {
    value: string;
    text: string;
}

interface CategorySearchFieldProps {
    mode: RendererMode;
    field: SearchFieldConfig;
    value?: string;
    onChange?: (v: string) => void;
    isDisabled: boolean;
}

/** preview 모드 샘플 옵션 */
const PREVIEW_OPTIONS: CategoryItem[] = [
    { value: '1', text: '샘플 항목 1' },
    { value: '2', text: '샘플 항목 2' },
    { value: '3', text: '샘플 항목 3' },
];

/** selectbox 공통 클래스 */
const SELECT_CLS = 'flex-1 h-8 rounded border border-slate-200 bg-white px-2 text-[13px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-50 disabled:text-slate-400';

export function CategorySearchField({
    mode, field, value, onChange, isDisabled,
}: CategorySearchFieldProps) {
    const isPreview = mode === 'preview';
    const maxDepth        = field.maxDepth        ?? 1;
    const depthLabels     = field.depthLabels     ?? [];
    const depthLabelMsgKeys = field.depthLabelMsgKeys ?? [];

    /* ── 배열 참조가 매 렌더마다 바뀌므로 ref로 최신값 유지 ── */
    const depthValueFieldsRef = useRef(field.depthValueFields ?? []);
    const depthTextFieldsRef  = useRef(field.depthTextFields  ?? []);
    const depthFiltersRef     = useRef(field.depthFilters     ?? []);
    depthValueFieldsRef.current = field.depthValueFields ?? [];
    depthTextFieldsRef.current  = field.depthTextFields  ?? [];
    depthFiltersRef.current     = field.depthFilters     ?? [];

    /* ── 각 depth별 선택된 값 ── */
    const [depthValues, setDepthValues] = useState<string[]>(Array(maxDepth).fill(''));
    /* ── 각 depth별 옵션 목록 ── */
    const [depthOptions, setDepthOptions] = useState<CategoryItem[][]>(Array(maxDepth).fill([]));
    /* ── 각 depth별 로딩 상태 ── */
    const [depthLoading, setDepthLoading] = useState<boolean[]>(Array(maxDepth).fill(false));

    /** depth N 옵션을 API로 로드 */
    const loadDepthOptions = useCallback(async (depth: number, parentValue: string | null) => {
        if (!field.dbSlug) return;

        const depthIdx = depth - 1;
        setDepthLoading(prev => { const next = [...prev]; next[depthIdx] = true; return next; });

        try {
            const params: Record<string, string> = { eq_depth: String(depth) };
            /* 상위 depth 선택값이 있으면 eq_parentId 파라미터로 필터 */
            if (parentValue) params.eq_parentId = parentValue;

            const res = await api.get(`/page-data/${field.dbSlug}`, { params });

            /* ref로 최신 경로값 참조 — 의존성 배열에 배열 객체를 넣지 않음 */
            const valueField = depthValueFieldsRef.current[depthIdx] || 'id';
            const textField  = depthTextFieldsRef.current[depthIdx]  || '';
            const filterExpr = depthFiltersRef.current[depthIdx];

            const rawItems = (res.data?.content ?? []) as unknown[];
            /* depthFilters 지정 시 raw item(dataJson) 단계에서 먼저 필터 — evalConditionExpr 공통함수 재사용 */
            const filteredItems = filterExpr
                ? rawItems.filter((item) => {
                    const dataJson = (item as { dataJson?: Record<string, unknown> }).dataJson ?? {};
                    return evalConditionExpr(filterExpr, (key) => {
                        const v = resolveAccessor(dataJson, key);
                        return v != null ? String(v) : undefined;
                    });
                })
                : rawItems;

            /* CategoryRenderer 동일 패턴: item.dataJson 기준으로 경로 접근 */
            const items: CategoryItem[] = filteredItems.map((item) => {
                const raw      = item as { id: number; dataJson?: Record<string, unknown> };
                const dataJson = raw.dataJson ?? {};
                const resolved = resolveAccessor(dataJson, valueField);
                return {
                    value: String(resolved != null ? resolved : raw.id ?? ''),
                    text:  String(resolveAccessor(dataJson, textField) ?? ''),
                };
            });

            setDepthOptions(prev => { const next = [...prev]; next[depthIdx] = items; return next; });
        } catch {
            /* 오류 시 빈 목록 유지 */
        } finally {
            setDepthLoading(prev => { const next = [...prev]; next[depthIdx] = false; return next; });
        }
    }, [field.dbSlug]); // dbSlug만 의존 — 배열 ref로 최신값 접근하여 무한루프 방지

    /* depth 1은 컴포넌트 마운트 시 즉시 로드 (live 모드에서만) */
    useEffect(() => {
        if (isPreview) return;
        loadDepthOptions(1, null);
    }, [isPreview, loadDepthOptions]);

    /** depth N selectbox 선택 처리 */
    const handleSelect = (depth: number, selectedValue: string) => {
        const depthIdx = depth - 1;

        /* 현재 depth 값 저장, 하위 depth 선택값·옵션 전부 초기화 */
        setDepthValues(prev => {
            const next = [...prev];
            next[depthIdx] = selectedValue;
            for (let i = depthIdx + 1; i < maxDepth; i++) next[i] = '';
            return next;
        });
        setDepthOptions(prev => {
            const next = [...prev];
            for (let i = depthIdx + 1; i < maxDepth; i++) next[i] = [];
            return next;
        });

        /* onChange: 가장 깊이 선택된 값 하나만 전달 */
        onChange?.(selectedValue);

        /* 선택값이 있으면 다음 depth 옵션 즉시 로드 */
        if (selectedValue && depth < maxDepth) {
            loadDepthOptions(depth + 1, selectedValue);
        }
    };

    /* ── preview 모드: 샘플 selectbox (disabled) ── */
    if (isPreview) {
        return (
            <div className="flex gap-2 w-full">
                {Array.from({ length: maxDepth }, (_, i) => (
                    <select key={i} disabled className={SELECT_CLS}>
                        <option value="">
                            {depthLabelMsgKeys[i]
                                ? depthLabelMsgKeys[i]
                                : depthLabels[i]
                                    ? `${depthLabels[i]} 선택`
                                    : `${i + 1}depth 선택`}
                        </option>
                        {PREVIEW_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.text}</option>
                        ))}
                    </select>
                ))}
            </div>
        );
    }

    /* ── live 모드: API 연동 selectbox ── */
    return (
        <div className="flex gap-2 w-full">
            {Array.from({ length: maxDepth }, (_, i) => {
                const depth       = i + 1;
                const options     = depthOptions[i];
                const loading     = depthLoading[i];
                const selectedVal = depthValues[i];
                /* 상위 depth 값이 없으면 이 selectbox 비활성 (depth 1은 항상 활성) */
                const isParentEmpty = i > 0 && !depthValues[i - 1];

                /* placeholder 텍스트: msgKey > 라벨 > 기본값 순 */
                const labelText = depthLabelMsgKeys[i] || depthLabels[i] || `${depth}depth`;
                const placeholder = loading
                    ? '로딩 중...'
                    : isParentEmpty
                        ? `${depthLabelMsgKeys[i - 1] || depthLabels[i - 1] || `${i}depth`} 선택 후 이용`
                        : `${labelText} 선택`;

                return (
                    <select
                        key={i}
                        value={selectedVal}
                        disabled={isDisabled || isParentEmpty || loading}
                        onChange={e => handleSelect(depth, e.target.value)}
                        className={SELECT_CLS}
                    >
                        <option value="">{placeholder}</option>
                        {options.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.text}</option>
                        ))}
                    </select>
                );
            })}
        </div>
    );
}
