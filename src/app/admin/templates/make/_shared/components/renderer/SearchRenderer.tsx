'use client';

/**
 * SearchRenderer — 검색폼 전체 렌더러
 *
 * SearchForm + SearchRow + SearchField + SearchFieldRenderer를 조합한
 * 통합 검색폼 컴포넌트. preview/live 두 모드를 모두 지원한다.
 *
 * displayStyle:
 *   - 'standard' (기본): 그리드 행 레이아웃 + 하단 검색/초기화 버튼
 *   - 'simple':          한 줄 인라인 + 우측 검색/초기화 버튼
 *
 * 사용법:
 *   // preview (widget/page.tsx WidgetPreview 내부)
 *   <SearchRenderer mode="preview" rows={widget.rows} />
 *
 *   // live ([slug]/page.tsx)
 *   <SearchRenderer
 *     mode="live"
 *     rows={config.fieldRows}
 *     values={searchValues}
 *     onChangeValues={(id, v) => setSearchValues(prev => ({ ...prev, [id]: v }))}
 *     onSearch={handleSearch}
 *     onReset={resetValues}
 *     collapsible={config.collapsible}
 *     codeGroups={codeGroups}
 *   />
 */

import { useMemo } from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import { SearchRowConfig, CodeGroupDef } from '../../types';
import { evalFieldCondition } from '../../utils';
import { FieldRenderer } from './FieldRenderer';
import { RendererContainer } from './RendererContainer';
import type { RendererMode } from './types';
import { useI18n } from '@/hooks/use-i18n';

interface SearchRendererProps {
    mode: RendererMode;
    rows: SearchRowConfig[];
    /** 검색 레이아웃 스타일 — standard: 그리드(기본), simple: 한 줄 인라인 */
    displayStyle?: 'standard' | 'simple';
    /* live 모드 전용 props */
    values?: Record<string, string>;
    onChangeValues?: (fieldId: string, value: string) => void;
    onSearch?: () => void;
    onReset?: () => void;
    collapsible?: boolean;
    codeGroups?: CodeGroupDef[];
}

export function SearchRenderer({
    mode,
    rows,
    displayStyle = 'standard',
    values = {},
    onChangeValues,
    onSearch,
    onReset,
    collapsible = false,
    codeGroups = [],
}: SearchRendererProps) {
    const isPreview = mode === 'preview';
    const { t } = useI18n();

    /* fieldKey → fieldId 역매핑 — hideCondition/disableCondition 평가용 */
    const keyToId = useMemo(() => {
        const map: Record<string, string> = {};
        rows.forEach(row =>
            row.fields.forEach(f => { if (f.fieldKey) map[f.fieldKey] = f.id; })
        );
        return map;
    }, [rows]);

    /* live 모드에서 hideCondition 충족 시 해당 필드 숨김 */
    const shouldHide = (fieldKey: string | undefined, hideCondition: string | undefined): boolean =>
        !isPreview && !!hideCondition && !!fieldKey && evalFieldCondition(hideCondition, keyToId, values);

    /* live 모드에서 disableCondition 충족 시 해당 필드 비활성화 */
    const shouldDisable = (disableCondition: string | undefined): boolean =>
        !isPreview && !!disableCondition && evalFieldCondition(disableCondition, keyToId, values);

    /* 행이 없을 때 — preview는 안내 텍스트, live는 null */
    if (!rows.length) {
        return isPreview ? (
            <p className="text-sm text-slate-400 text-center py-2">검색 행을 추가하세요</p>
        ) : null;
    }

    /* ── 심플버전: 한 줄 인라인 레이아웃 ── */
    if (displayStyle === 'simple') {
        const row = rows[0];
        const cols = row.cols ?? 5;
        /* cols → Tailwind grid-cols 클래스 매핑 (SearchRow와 동일 방식) */
        const GRID_COLS: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' };
        const COL_SPAN: Record<number, string>  = { 1: 'col-span-1',  2: 'col-span-2',  3: 'col-span-3',  4: 'col-span-4',  5: 'col-span-5'  };
        return (
            /* RendererContainer — h-full w-full + 테두리 공통 처리 (simple: flex 인라인) */
            <RendererContainer className="flex items-center gap-3 bg-white px-4">
                {/* 필드 영역 — SearchRow와 동일한 grid gap-4 방식 */}
                <div className={`flex-1 grid ${GRID_COLS[cols] ?? 'grid-cols-5'} gap-4`}>
                    {row.fields.map(field => {
                        if (shouldHide(field.fieldKey, field.hideCondition)) return null;
                        return (
                        <div key={field.id} className={COL_SPAN[Math.min(field.colSpan ?? 1, cols)] ?? 'col-span-1'}>
                            <FieldRenderer
                                mode={mode}
                                field={field}
                                value={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? undefined : (values[field.id] || '')}
                                onChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? undefined : v => onChangeValues?.(field.id, v)}
                                valueFrom={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? (values[field.id + '_from'] || '') : undefined}
                                valueTo={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? (values[field.id + '_to'] || '') : undefined}
                                onFromChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? v => onChangeValues?.(field.id + '_from', v) : undefined}
                                onToChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? v => onChangeValues?.(field.id + '_to', v) : undefined}
                                codeGroups={codeGroups}
                                forceDisabled={shouldDisable(field.disableCondition)}
                            />
                        </div>
                        );
                    })}
                </div>
                {/* 검색/초기화 버튼 — SearchForm과 동일한 버튼 스타일, 항상 표시 */}
                <button
                    onClick={isPreview ? undefined : onReset}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all"
                >
                    <RotateCcw className="w-3 h-3" /> {t('common.btn.reset')}
                </button>
                <button
                    onClick={isPreview ? undefined : onSearch}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all"
                >
                    <Search className="w-3 h-3" /> {t('common.btn.search')}
                </button>
            </RendererContainer>
        );
    }

    /* ── 현재버전(standard): SearchForm 자체 스타일 사용 — RendererContainer 불필요 ── */
    return (
        <RendererContainer showBorder={false}>
            <SearchForm
                /* preview: collapsible 비활성, 핸들러 noop */
                collapsible={!isPreview && collapsible}
                onSearch={isPreview ? () => {} : (onSearch ?? (() => {}))}
                onReset={isPreview ? () => {} : (onReset ?? (() => {}))}
            >
                {rows.map(row => (
                    <SearchRow key={row.id} cols={row.cols}>
                        {row.fields.map(field => {
                            if (shouldHide(field.fieldKey, field.hideCondition)) return null;
                            return (
                            <SearchField
                                key={field.id}
                                /* dateRange: label ~ label2 형식으로 표시 / msgKey 우선 처리 */
                                label={
                                    (field.type === 'dateRange' || field.type === 'yearMonthRange')
                                        ? `${field.labelMsgKey ? t(field.labelMsgKey) : field.label} ~ ${field.label2MsgKey ? t(field.label2MsgKey) : (field.label2 || '')}`
                                        : (field.labelMsgKey ? t(field.labelMsgKey) : (field.label || undefined))
                                }
                                colSpan={field.colSpan}
                                required={field.required}
                                description={field.descriptionMsgKey ? t(field.descriptionMsgKey) : field.description}
                            >
                                <FieldRenderer
                                    mode={mode}
                                    field={field}
                                    value={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? undefined : (values[field.id] || '')}
                                    onChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? undefined : v => onChangeValues?.(field.id, v)}
                                    valueFrom={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? (values[field.id + '_from'] || '') : undefined}
                                    valueTo={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? (values[field.id + '_to'] || '') : undefined}
                                    onFromChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? v => onChangeValues?.(field.id + '_from', v) : undefined}
                                    onToChange={(field.type === 'dateRange' || field.type === 'yearMonthRange') ? v => onChangeValues?.(field.id + '_to', v) : undefined}
                                    codeGroups={codeGroups}
                                    forceDisabled={shouldDisable(field.disableCondition)}
                                />
                            </SearchField>
                            );
                        })}
                    </SearchRow>
                ))}
            </SearchForm>
        </RendererContainer>
    );
}
