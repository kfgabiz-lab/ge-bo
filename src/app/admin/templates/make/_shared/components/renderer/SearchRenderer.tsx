'use client';

/**
 * SearchRenderer — 검색폼 전체 렌더러
 *
 * SearchForm + SearchRow + SearchField + SearchFieldRenderer를 조합한
 * 통합 검색폼 컴포넌트. preview/live 두 모드를 모두 지원한다.
 *
 * - preview: 빌더 우측 미리보기 패널용 (disabled, 샘플 데이터)
 * - live: 실제 생성 페이지용 ([slug]/page.tsx 검색폼 블록 대체)
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

import React from 'react';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import { SearchRowConfig, CodeGroupDef } from '../../types';
import { FieldRenderer } from './FieldRenderer';
import type { RendererMode } from './types';

interface SearchRendererProps {
    mode: RendererMode;
    rows: SearchRowConfig[];
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
    values = {},
    onChangeValues,
    onSearch,
    onReset,
    collapsible = false,
    codeGroups = [],
}: SearchRendererProps) {
    const isPreview = mode === 'preview';

    /* 행이 없을 때 — preview는 안내 텍스트, live는 null */
    if (!rows.length) {
        return isPreview ? (
            <p className="text-sm text-slate-400 text-center py-2">검색 행을 추가하세요</p>
        ) : null;
    }

    return (
        <div className="w-full">
            <SearchForm
                /* preview: collapsible 비활성, 핸들러 noop */
                collapsible={!isPreview && collapsible}
                onSearch={isPreview ? () => {} : (onSearch ?? (() => {}))}
                onReset={isPreview ? () => {} : (onReset ?? (() => {}))}
            >
                {rows.map(row => (
                    <SearchRow key={row.id} cols={row.cols}>
                        {row.fields.map(field => (
                            <SearchField
                                key={field.id}
                                /* dateRange: label ~ label2 형식으로 표시 */
                                label={
                                    field.type === 'dateRange'
                                        ? `${field.label} ~ ${field.label2 || ''}`
                                        : (field.label || undefined)
                                }
                                colSpan={field.colSpan}
                                required={field.required}
                            >
                                <FieldRenderer
                                    mode={mode}
                                    field={field}
                                    value={values[field.id] || ''}
                                    onChange={v => onChangeValues?.(field.id, v)}
                                    codeGroups={codeGroups}
                                />
                            </SearchField>
                        ))}
                    </SearchRow>
                ))}
            </SearchForm>
        </div>
    );
}
