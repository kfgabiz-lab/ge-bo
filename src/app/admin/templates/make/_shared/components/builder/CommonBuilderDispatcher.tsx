'use client';

import { TextareaField } from './fields/TextareaField';
import { SearchWidgetBuilder } from './SearchWidgetBuilder';
import { TableBuilder } from './TableBuilder';
import { FormBuilder } from './FormBuilder';
import { SpaceBuilder } from './SpaceBuilder';
import { CategoryBuilder } from './CategoryBuilder';
import type { AnyWidget } from '../renderer/types';
import type { TemplateItem } from '../../types';

/**
 * CommonBuilderDispatcher — 위젯 타입별 설정 빌더 통합 디스패처
 * 
 * 모든 빌더(Widget, List, Layer 등)에서 공통으로 위젯 설정을 처리할 때 사용한다.
 * 빌더 페이지(page.tsx)의 인라인 분기 로직을 이 컴포넌트로 이관하여 표준화한다.
 */

interface CommonBuilderDispatcherProps {
    widget: AnyWidget;
    onChange: (w: AnyWidget) => void;
    // 컨텐츠 구성을 위한 외부 데이터 컨텍스트
    context: {
        slugOptions: { id: number; slug: string; name: string }[];
        pageTemplates?: TemplateItem[];
        searchWidgets?: Array<{ widgetId: string; contentKey: string }>;
        formWidgets?: Array<{ widgetId: string; contentKey: string; connectedSlug?: string }>;
        /** 필드 ColSpan 최대값 (기본 12, 우측 드로어 등 좁은 공간에서 2로 제한) */
        maxColSpan?: number;
        /** 현재 페이지의 카테고리 위젯 목록 — parentWidgetId 선택용 */
        categoryWidgets?: { widgetId: string; label?: string; depth: number }[];
    };
}

export function CommonBuilderDispatcher({ widget, onChange, context }: CommonBuilderDispatcherProps) {
    const { slugOptions, pageTemplates = [], searchWidgets = [], formWidgets = [], maxColSpan, categoryWidgets = [] } = context;

    switch (widget.type) {
        case 'text':
            return (
                <div className="pt-1">
                    <TextareaField
                        values={widget as any}
                        onChange={patch => onChange({ ...widget, ...patch })}
                        colSpanMode={{ type: 'button', options: [1, 2, 3, 4, 5] }}
                        codeGroups={[]}
                        codeGroupsLoading={false}
                    />
                </div>
            );

        case 'search':
            return (
                <SearchWidgetBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                />
            );

        case 'table':
            return (
                <TableBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    searchWidgets={searchWidgets}
                    slugOptions={slugOptions}
                />
            );

        case 'form':
            return (
                <FormBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugOptions={slugOptions}
                    maxColSpan={maxColSpan}
                />
            );

        case 'space':
            return (
                <SpaceBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    pageTemplates={pageTemplates}
                    formWidgets={formWidgets}
                />
            );

        case 'category':
            return (
                <CategoryBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    categoryWidgets={categoryWidgets}
                />
            );

        default:
            return (
                <div className="p-4 text-center text-xs text-slate-400">
                    알 수 없는 위젯 타입입니다.
                </div>
            );
    }
}
