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
import { GridCell, ROW_HEIGHT, GAP_SIZE } from '@/components/layout/GridCell';
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

    /* 빌더 미리보기 전용 — 위젯 선택 인터랙션 */
    /** 위젯 클릭 시 호출 — 빌더에서 선택 상태 업데이트에 사용 */
    onItemClick?: (itemId: string) => void;
    /** 현재 선택된 위젯 ID — ring UI 표시에 사용 */
    selectedItemId?: string | null;

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
    onContentAction?: (connectedContentWidgetIds: string[], action: 'save' | 'delete', goBackAfterAction?: boolean) => void;

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

    /* live 모드 전용 — 카테고리 */
    /** 카테고리 위젯별 선택 ID (widgetId → selectedId) */
    categorySelections?: Record<string, number | null>;
    /** 카테고리 항목 선택 시 호출 */
    onCategorySelect?: (widgetId: string, selectedId: number | null) => void;

    /* live 모드 전용 — 팝업 */
    dataSlug?: string;
    onRefresh?: () => void;

    /* live 모드 전용 — 파일 업로드 (팝업 내 form 위젯용) */
    /** widgetId → fieldId → File[] */
    fileValuesMap?: Record<string, Record<string, File[]>>;
    /** widgetId → fieldId → 파일 메타 배열 */
    existingFileMetaMap?: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>;
    /** fileId → blob URL 캐시 */
    imgBlobUrls?: Record<number, string>;
    /** (widgetId, fieldId, files, rowId?) 형태로 호출 — SubList 파일 변경 시 rowId 포함 */
    onFileChange?: (widgetId: string, fieldId: string, files: File[], rowId?: string) => void;
    /** (widgetId, fieldId, fileId) 형태로 호출 */
    onRemoveExisting?: (widgetId: string, fieldId: string, fileId: number) => void;
    /** Space 위젯 닫기 버튼 핸들러 (팝업 닫기용) */
    onClose?: () => void;

    /* live 모드 전용 — sublist */
    /** widgetId → SubListRow[] */
    subListRowsMap?: Record<string, import('./SubListRenderer').SubListRow[]>;
    /** SubList 행 변경 콜백 — (widgetId, rows) */
    onSubListRowsChange?: (widgetId: string, rows: import('./SubListRenderer').SubListRow[]) => void;

    /* live 모드 전용 — multiselect */
    /** widgetId → 선택된 ID 배열 */
    multiSelectValuesMap?: Record<string, number[]>;
    /** 선택 변경 콜백 — (widgetId, ids) */
    onMultiSelectChange?: (widgetId: string, ids: number[]) => void;
}

/**
 * widgetItems 배열 → outer div(span) + inner sub-grid(80px 행) 구조로 렌더링.
 * preview/live 모두 동일 함수 사용 — mode에 따라 WidgetRenderer가 자동 분기.
 */
export function PageGridRenderer({
    widgetItems,
    mode,
    onItemClick,
    selectedItemId,
    searchValues,
    onSearchChange,
    onSearch,
    onReset,
    codeGroups,
    formValuesMap,
    onFormValuesChange,
    onContentAction,
    tableDataMap,
    sortKeyMap,
    sortDirMap,
    onSort,
    onPageChange,
    onLoadMore,
    categorySelections,
    onCategorySelect,
    dataSlug,
    onRefresh,
    fileValuesMap,
    existingFileMetaMap,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    onClose,
    subListRowsMap,
    onSubListRowsChange,
    multiSelectValuesMap,
    onMultiSelectChange,
}: PageGridRendererProps) {
    /* ── 카테고리 dbSlug 상속 맵 ──
     * depth 2+ 위젯은 dbSlug가 없으므로 parentWidgetId 체인을 타고 올라가 상위 dbSlug 상속.
     * widgetId → resolvedDbSlug */
    const categoryDbSlugMap = (() => {
        const allWidgets = widgetItems.flatMap(item => item.contents.map(c => c.widget));
        const catWidgets = allWidgets.filter(w => w.type === 'category') as { widgetId: string; dbSlug?: string; parentWidgetId?: string }[];
        const slugMap: Record<string, string> = {};

        /* 1차: dbSlug가 있는 위젯 먼저 등록 */
        catWidgets.forEach(w => { if (w.dbSlug) slugMap[w.widgetId] = w.dbSlug; });

        /* 2차: dbSlug 없는 위젯은 parentWidgetId 체인 탐색 (최대 5 depth) */
        catWidgets.filter(w => !w.dbSlug).forEach(w => {
            let cur = w;
            for (let i = 0; i < 5; i++) {
                if (!cur.parentWidgetId) break;
                const parent = catWidgets.find(p => p.widgetId === cur.parentWidgetId);
                if (!parent) break;
                if (parent.dbSlug) { slugMap[w.widgetId] = parent.dbSlug; break; }
                cur = parent;
            }
        });

        return slugMap;
    })();

    return (
        <>
            {widgetItems.map(item => (
                /* outer 셀 — GridCell 로 colSpan/rowSpan/height 일괄 관리 */
                <GridCell
                    key={item.id}
                    colSpan={item.colSpan}
                    rowSpan={item.rowSpan}
                    onClick={onItemClick ? () => onItemClick(item.id) : undefined}
                    className={onItemClick ? `cursor-pointer transition-all ${selectedItemId === item.id ? 'ring-2 ring-inset ring-slate-900' : 'hover:ring-1 hover:ring-inset hover:ring-slate-300'}` : undefined}
                >
                    {/* inner sub-grid — track = ROW_HEIGHT - GAP_SIZE, rowGap = GAP_SIZE → 합계 ROW_HEIGHT 유지 */}
                    <div
                        className="w-full"
                        style={{
                            display: 'grid',
                            gridTemplateColumns: `repeat(${item.colSpan}, 1fr)`,
                            gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                            gridAutoFlow: 'row dense',
                            rowGap: `${GAP_SIZE}px`,
                            columnGap: 0,
                        }}
                    >
                        {item.contents.map(c => {
                            const wid = (c.widget as { widgetId?: string }).widgetId ?? '';
                            const td = tableDataMap?.[wid];
                            /* category 위젯 dbSlug 상속 — depth 2+ 위젯에 상위 slug 주입 */
                            const resolvedWidget = (c.widget.type === 'category' && wid && categoryDbSlugMap[wid] && !(c.widget as { dbSlug?: string }).dbSlug)
                                ? { ...c.widget, dbSlug: categoryDbSlugMap[wid] }
                                : c.widget;
                            return (
                                <div
                                    key={c.id}
                                    style={{
                                        /* space 위젯: align 기반 그리드 열 위치 계산 (정렬 보장) */
                                        gridColumn: c.widget.type === 'space'
                                            ? getSpaceGridColumn(c.widget.align, Math.min(c.colSpan, item.colSpan), item.colSpan)
                                            : `span ${Math.min(c.colSpan, item.colSpan)}`,
                                        gridRow: `span ${c.rowSpan}`,
                                        /* height = rowSpan × ROW_HEIGHT - GAP_SIZE (track + gap 합계 맞춤) */
                                        height: `${c.rowSpan * ROW_HEIGHT - GAP_SIZE}px`,
                                    }}
                                >
                                    <WidgetRenderer
                                        mode={mode}
                                        widget={resolvedWidget}
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
                                        onContentAction={onContentAction}
                                        onClose={onClose}
                                        /* SubList */
                                        subListRowsMap={subListRowsMap}
                                        onSubListRowsChange={onSubListRowsChange}
                                        /* 파일 업로드 — SubList 파일 변경 시 rowId도 함께 전달 */
                                        fileValues={fileValuesMap?.[wid]}
                                        existingFileMeta={existingFileMetaMap?.[wid]}
                                        imgBlobUrls={imgBlobUrls}
                                        onFileChange={onFileChange ? (fieldId, files, rowId?) => onFileChange(wid, fieldId, files, rowId) : undefined}
                                        onRemoveExisting={onRemoveExisting ? (fieldId, fileId) => onRemoveExisting(wid, fieldId, fileId) : undefined}
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
                                        /* 카테고리 */
                                        categorySelections={categorySelections}
                                        onCategorySelect={onCategorySelect}
                                        /* multiselect */
                                        multiSelectValuesMap={multiSelectValuesMap}
                                        onMultiSelectChange={onMultiSelectChange}
                                        /* 팝업 */
                                        dataSlug={dataSlug}
                                        onRefresh={onRefresh}
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
