'use client';

/**
 * CategorySearchField — 카테고리 계층 검색 selectbox 렌더러
 *
 * - preview 모드: 샘플 옵션 표시 (disabled)
 * - live 모드: 상위 depth 선택 시 하위 depth 옵션이 로드되는 정방향 캐스케이딩 selectbox
 *   화면에 노출할 depth는 field.activeDepths(없으면 field.maxDepth로부터 파생)로 결정한다.
 *
 * 로드/선택 로직은 useCategoryCascade 훅이 전담하고, 이 컴포넌트는 순수하게
 * 훅이 돌려주는 값(depthValues/depthOptions/depthLoading/disabledDepths)만으로
 * selectbox 목록을 그린다.
 *
 * onChange: 가장 깊이 선택된 항목의 ID를 상위로 전달
 *
 * 사용법:
 *   <CategorySearchField mode={mode} field={field} value={value} onChange={onChange} isDisabled={isDisabled} />
 */

import React from 'react';
import { useI18n } from '@/hooks/use-i18n';
import type { SearchFieldConfig } from '../../types';
import type { RendererMode } from './types';
import { useCategoryCascade, type CategoryItem } from './useCategoryCascade';

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
    mode, field, onChange, isDisabled,
}: CategorySearchFieldProps) {
    const { t } = useI18n();
    const isPreview = mode === 'preview';
    /* 화면에 노출할 depth 번호 배열 — 미설정 시(레거시 데이터) maxDepth로부터 [1..maxDepth] 파생 (하위호환) */
    const activeDepths = field.activeDepths ?? Array.from({ length: field.maxDepth ?? 1 }, (_, i) => i + 1);
    const depthLabels     = field.depthLabels     ?? [];
    const depthLabelMsgKeys = field.depthLabelMsgKeys ?? [];

    /* 로드·선택 로직은 훅이 전담 — 컴포넌트는 반환값으로 그리기만 함 */
    const { depthValues, depthOptions, depthLoading, disabledDepths, handleSelect } =
        useCategoryCascade({ mode, field, onChange });

    /* ── preview 모드: 샘플 selectbox (disabled) ── */
    if (isPreview) {
        return (
            <div className="flex gap-2 w-full">
                {activeDepths.map((_, i) => (
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
            {activeDepths.map((_, i) => {
                const options     = depthOptions[i];
                const loading     = depthLoading[i];
                const selectedVal = depthValues[i];
                /* 상위 depth 미선택 시 비활성 */
                const isFieldDisabled = disabledDepths[i];

                /* placeholder 텍스트: msgKey > 라벨 > 기본값 순 (기본값 "{n}depth"는 설정 누락 시의 식별자성 표기라 번역 대상 아님) */
                const labelText     = depthLabelMsgKeys[i] || depthLabels[i] || `${i + 1}depth`;
                const prevLabelText = depthLabelMsgKeys[i - 1] || depthLabels[i - 1] || `${i}depth`;
                const placeholder = loading
                    ? t('common.loading')
                    : isFieldDisabled
                        ? t('common.category.select_after', { label: prevLabelText })
                        : t('common.category.label_select', { label: labelText });

                return (
                    <select
                        key={i}
                        value={selectedVal}
                        disabled={isDisabled || isFieldDisabled || loading}
                        onChange={e => handleSelect(i, e.target.value)}
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
