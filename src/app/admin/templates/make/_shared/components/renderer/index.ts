/**
 * Renderer 컴포넌트 일괄 export
 *
 * - SearchFieldRenderer: 검색 단일 필드 (preview/live)
 * - SearchRenderer:      검색폼 전체 (preview/live)
 * - TableCellRenderer:   테이블 단일 셀 (preview/live)
 * - TableRenderer:       테이블 전체 (preview/live)
 * - FormRenderer:        Form 위젯 렌더링 (preview/live)
 * - SpaceRenderer:       공간영역 위젯 렌더링 (preview/live)
 * - WidgetRenderer:      위젯 타입 통합 dispatch (preview/live)
 * - PageGridRenderer:    widgetItems 배열 → 그리드 렌더링 (preview/live 공통 함수)
 */

export { FieldRenderer }       from './FieldRenderer';
export { SearchFieldRenderer } from './SearchFieldRenderer';
export { SearchRenderer }      from './SearchRenderer';
export { TableCellRenderer }   from './TableCellRenderer';
export { TableRenderer }       from './TableRenderer';
export { FormRenderer }        from './FormRenderer';
export { SpaceRenderer }       from './SpaceRenderer';
export { CategoryRenderer }    from './CategoryRenderer';
export { WidgetRenderer }      from './WidgetRenderer';
export { PageGridRenderer }    from './PageGridRenderer';

/* 타입 export */
export type {
    RendererMode,
    TextWidget,
    SpaceItem,
    SpaceWidget,
    SearchWidget,
    CategoryWidget,
    AnyWidget,
    TableActionHandlers,
    SearchHandlers,
} from './types';

export type {
    PageContentItem,
    PageWidgetItem,
    PageTableData,
} from './PageGridRenderer';
