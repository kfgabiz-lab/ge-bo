'use client';

import { SearchWidgetBuilder } from './SearchWidgetBuilder';
import { TableBuilder } from './TableBuilder';
import { FormBuilder } from './FormBuilder';
import { SpaceBuilder } from './SpaceBuilder';
import { CategoryBuilder } from './CategoryBuilder';
import { SubListBuilder } from './SubListBuilder';
import { MultiSelectBuilder } from './MultiSelectBuilder';
import { TabBuilder } from './TabBuilder';
import type { AnyWidget } from '../renderer/types';
import type { TemplateItem } from '../../types';
import type { ContentWidgetOption } from './fields/ActionButtonField';
import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';

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
        /** 현재 페이지의 Form + SubList 위젯 목록 — ActionButton 컨텐츠 연결용 */
        contentWidgets?: ContentWidgetOption[];
        /** @deprecated contentWidgets 사용 권장 */
        formWidgets?: Array<{ widgetId: string; contentKey: string; connectedSlug?: string }>;
        /** 필드 ColSpan 최대값 (기본 12, 우측 드로어 등 좁은 공간에서 2로 제한) */
        maxColSpan?: number;
        /** 현재 페이지의 카테고리 위젯 목록 — parentWidgetId 선택용 */
        categoryWidgets?: { widgetId: string; label?: string; depth: number }[];
        /** Space 위젯에서 ActionButton만 추가 가능하도록 제한 (quick-list, quick-detail 전용) */
        actionButtonOnly?: boolean;
        /** Slug Entity 필드 목록 — FormBuilder fieldKey selectbox 전환 + Search/Table/Form "이 위젯만 빌드" 버튼 공용 (widget 빌더 전용) */
        slugEntityFields?: SlugEntityFieldItem[];
    };
}

export function CommonBuilderDispatcher({ widget, onChange, context }: CommonBuilderDispatcherProps) {
    const { slugOptions, pageTemplates = [], searchWidgets = [], contentWidgets, formWidgets = [], maxColSpan, categoryWidgets = [], actionButtonOnly, slugEntityFields } = context;

    switch (widget.type) {
        case 'search':
            return (
                <SearchWidgetBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugEntityFields={slugEntityFields}
                />
            );

        case 'table':
            return (
                <TableBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    searchWidgets={searchWidgets}
                    slugOptions={slugOptions}
                    slugEntityFields={slugEntityFields}
                />
            );

        case 'form':
            return (
                <FormBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugOptions={slugOptions}
                    maxColSpan={maxColSpan}
                    slugEntityFields={slugEntityFields}
                />
            );

        case 'space':
            return (
                <SpaceBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    pageTemplates={pageTemplates}
                    contentWidgets={contentWidgets}
                    formWidgets={formWidgets}
                    actionButtonOnly={actionButtonOnly}
                    maxColSpan={maxColSpan}
                    slugOptions={slugOptions}
                />
            );

        case 'category':
            return (
                <CategoryBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugOptions={slugOptions}
                    categoryWidgets={categoryWidgets}
                    pageTemplates={pageTemplates}
                />
            );

        case 'sublist':
            return (
                <SubListBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugOptions={slugOptions}
                />
            );

        case 'multiselect':
            return (
                <MultiSelectBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    slugOptions={slugOptions}
                />
            );

        case 'tab':
            return (
                <TabBuilder
                    widget={widget}
                    onChange={w => onChange(w)}
                    pageTemplates={pageTemplates}
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
