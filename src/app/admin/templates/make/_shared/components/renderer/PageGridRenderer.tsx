'use client';

/**
 * PageGridRenderer — widgetItems 배열을 outer+inner 그리드로 렌더링하는 공통 컴포넌트
 *
 * 빌더 미리보기(preview)와 실제 서비스 페이지(live) 모두 이 하나의 컴포넌트로 렌더링.
 * PageLayout 안에서 자식으로 사용한다.
 *
 * 사용법:
 *   // 미리보기 (빌더)
 *   <PageLayout mode="preview">
 *     <PageGridRenderer mode="preview" widgetItems={previewItems} />
 *   </PageLayout>
 *
 *   // 운영 페이지
 *   <PageLayout mode="live">
 *     <PageGridRenderer mode="live" widgetItems={widgetItems} {...liveHandlers} />
 *   </PageLayout>
 */

import { getSpaceGridColumn } from '../../utils';
import { GridCell, ROW_HEIGHT } from '@/components/layout/GridCell';
import { WidgetRenderer } from './WidgetRenderer';
import type { AnyWidget, RendererMode } from './types';
import type { CodeGroupDef } from '../../types';

/* ── 공유 타입 (generated/[slug], widget/[slug], 빌더 미리보기 모두 사용) ── */

/** PageLayout 내부의 개별 컨텐츠 아이템 (위젯 + 그리드 크기) */
export interface PageContentItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    widget: AnyWidget;
}

/** PageLayout 외부 셀 (colSpan×rowSpan을 차지하며, 내부에 복수 컨텐츠 보유) */
export interface PageWidgetItem {
    id: string;
    colSpan: number;
    rowSpan: number;
    contents: PageContentItem[];
}

/** 테이블 위젯별 데이터 상태 */
export interface PageTableData {
    rows: Record<string, unknown>[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    loading: boolean;
    appendLoading: boolean;
    hasMore: boolean;
    nextPage: number;
}

interface PageGridRendererProps {
    widgetItems: PageWidgetItem[];
    mode: RendererMode;

    /* live 모드 전용 — 검색 */
    searchValues?: Record<string, string>;
    onSearchChange?: (fieldId: string, value: string) => void;
    /** widgetId를 인자로 받아 해당 위젯의 검색 실행 */
    onSearch?: (widgetId: string) => void;
    /** widgetId를 인자로 받아 해당 위젯의 초기화 실행 */
    onReset?: (widgetId: string) => void;
    codeGroups?: CodeGroupDef[];

    /* live 모드 전용 — 폼 */
    /** widgetId → 필드값 맵 */
    formValuesMap?: Record<string, Record<string, string>>;
    /** (widgetId, fieldId, value) 형태로 호출 */
    onFormValuesChange?: (widgetId: string, fieldId: string, value: string) => void;
    onFormAction?: (connectedFormWidgetId: string, action: 'save' | 'delete') => void;

    /* live 모드 전용 — 테이블 */
    tableDataMap?: Record<string, PageTableData>;
    sortKeyMap?: Record<string, string | null>;
    sortDirMap?: Record<string, 'asc' | 'desc'>;
    /** (widgetId, accessor, dir) 형태로 호출 */
    onSort?: (widgetId: string, accessor: string, dir: 'asc' | 'desc') => void;
    /** (widgetId, page) 형태로 호출 */
    onPageChange?: (widgetId: string, page: number) => void;
    /** (widgetId) 형태로 호출 */
    onLoadMore?: (widgetId: string) => void;

    /* live 모드 전용 — 팝업 */
    dataSlug?: string;
    onPopupSaved?: () => void;
}

/**
 * widgetItems 배열 → outer div(span) + inner sub-grid(80px 행) 구조로 렌더링.
 * preview/live 모두 동일 함수 사용 — mode에 따라 WidgetRenderer가 자동 분기.
 */
export function PageGridRenderer({
    widgetItems,
    mode,
    searchValues,
    onSearchChange,
    onSearch,
    onReset,
    codeGroups,
    formValuesMap,
    onFormValuesChange,
    onFormAction,
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort,
    onPageChange,
    onLoadMore,
    dataSlug,
    onPopupSaved,
}: PageGridRendererProps) {
    return (
        <>
            {widgetItems.map(item => (
                /* outer 셀 — GridCell 로 colSpan/rowSpan/height 일괄 관리 */
                <GridCell key={item.id} colSpan={item.colSpan} rowSpan={item.rowSpan}>
                    {/* inner sub-grid — ROW_HEIGHT 고정 행, gap:0으로 배경 격자선과 정확히 일치 */}
                    <div
                        className="w-full"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${item.colSpan}, 1fr)`,
                            gridAutoRows: `${ROW_HEIGHT}px`,
                            gridAutoFlow: 'row dense',
                            gap: 0,
                        }}
                    >
                        {item.contents.map(c => {
                            const wid = (c.widget as { widgetId?: string }).widgetId ?? '';
                            const td = tableDataMap?.[wid];
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        /* space 위젯: align 기반 그리드 열 위치 계산 (정렬 보장) */
                                        gridColumn: c.widget.type === 'space'
                                            ? getSpaceGridColumn(c.widget.align, Math.min(c.colSpan, item.colSpan), item.colSpan)
                                            : `span ${Math.min(c.colSpan, item.colSpan)}`,
                                        gridRow: `span ${c.rowSpan}`,
                                        /* ROW_HEIGHT 단일 상수 사용 — gap:0이므로 rowSpan × ROW_HEIGHT 만 사용 */
                                        height: `${c.rowSpan * ROW_HEIGHT}px`,
                                    }}
                                >
                                    <WidgetRenderer
                                        mode={mode}
                                        widget={c.widget}
                                        contentColSpan={c.colSpan}
                                        /* 검색 */
                                        searchValues={searchValues}
                                        onSearchChange={onSearchChange}
                                        onSearch={wid ? () => onSearch?.(wid) : undefined}
                                        onReset={wid ? () => onReset?.(wid) : undefined}
                                        codeGroups={codeGroups}
                                        /* 폼 */
                                        formValues={formValuesMap?.[wid] ?? {}}
                                        onFormValuesChange={(fieldId, value) => onFormValuesChange?.(wid, fieldId, value)}
                                        onFormAction={onFormAction}
                                        /* 테이블 */
                                        tableData={td?.rows}
                                        tableLoading={td?.loading}
                                        sortKey={sortKeyMap?.[wid] ?? null}
                                        sortDir={sortDirMap?.[wid] ?? 'asc'}
                                        onSort={(accessor, dir) => onSort?.(wid, accessor, dir)}
                                        totalElements={td?.totalElements}
                                        totalPages={td?.totalPages}
                                        currentPage={td?.currentPage}
                                        onPageChange={(page) => onPageChange?.(wid, page)}
                                        onLoadMore={() => onLoadMore?.(wid)}
                                        appendLoading={td?.appendLoading}
                                        hasMore={td?.hasMore ?? true}
                                        /* 팝업 */
                                        dataSlug={dataSlug}
                                        onPopupSaved={onPopupSaved}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </GridCell>
            ))}
        </>
    );
}
