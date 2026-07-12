'use client';

/**
 * TableRenderer — 테이블 전체 렌더러 (헤더 + 바디)
 *
 * - preview: 5행 샘플 데이터 (빌더 미리보기용)
 * - live: 실데이터 + 정렬 + 페이지네이션 / 무한스크롤 (실제 페이지용)
 *
 * 무한스크롤(scroll 모드):
 *   - 내부 스크롤 컨테이너(scrollContainerRef) 안에 sentinel 배치
 *   - IntersectionObserver root = 내부 스크롤 컨테이너 → window 기준 오작동 방지
 *   - 스크롤 끝 도달 시 onLoadMore() 자동 호출
 *
 * 사용법:
 *   // preview (widget/page.tsx WidgetPreview 내부)
 *   <TableRenderer mode="preview" columns={widget.columns} />
 *
 *   // live — 페이지네이션
 *   <TableRenderer
 *     mode="live"
 *     columns={config.tableColumns}
 *     data={tableData}
 *     displayMode="pagination"
 *     totalElements={total} totalPages={pages} currentPage={page}
 *     onPageChange={(p) => fetchData(p)}
 *   />
 *
 *   // live — 무한스크롤
 *   <TableRenderer
 *     mode="live"
 *     columns={config.tableColumns}
 *     data={tableData}
 *     displayMode="scroll"
 *     hasMore={hasMore}
 *     appendLoading={appendLoading}
 *     onLoadMore={() => fetchNextPage()}
 *   />
 */

import { useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useI18n } from '@/hooks/use-i18n';
import { TableColumnConfig, CodeGroupDef } from '../../types';
import { TableCellRenderer } from './TableCellRenderer';
import { RendererContainer } from './RendererContainer';
import type { RendererMode, TableActionHandlers } from './types';

/** preview 샘플 행 기본값 (pageSize prop 미지정 시) */
const PREVIEW_ROW_COUNT = 5;
const DEFAULT_PAGE_SIZE = 10;

/* ── 정렬 아이콘 (live 모드 헤더 전용) ── */
const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
    if (sorted === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-blue-500" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
};

interface TableRendererProps {
    mode: RendererMode;
    columns: TableColumnConfig[];
    /** 행 다중선택 체크박스 활성화 여부 */
    enableRowSelection?: boolean;
    /** 현재 선택된 행 ID 배열 (외부 상태 — widgetSub page에서 관리) */
    selectedRowIds?: number[];
    /** 행 선택 변경 콜백 */
    onRowsSelect?: (selectedIds: number[]) => void;
    /* live 모드 전용 props */
    data?: Record<string, unknown>[];
    isLoading?: boolean;
    sortKey?: string | null;
    sortDir?: 'asc' | 'desc';
    onSort?: (accessor: string, dir: 'asc' | 'desc' | null) => void;
    codeGroups?: CodeGroupDef[];
    handlers?: TableActionHandlers;
    /* live 모드 페이지네이션 전용 (preview에서는 pageSize가 샘플 행 수로 사용됨) */
    pageSize?: number;          // 페이지당 행 수
    totalElements?: number;     // 총 데이터 건수
    totalPages?: number;        // 총 페이지 수
    currentPage?: number;       // 현재 페이지 (0-based)
    onPageChange?: (page: number) => void;
    displayMode?: 'pagination' | 'scroll';  // scroll 모드면 페이지네이션 숨김
    /* 무한스크롤 전용 (displayMode='scroll' 일 때) */
    onLoadMore?: () => void;        // 다음 페이지 로드 요청 콜백
    appendLoading?: boolean;        // 추가 로딩 중 여부 (하단 스피너)
    hasMore?: boolean;              // 다음 페이지 존재 여부
}

export function TableRenderer({
    mode,
    columns,
    enableRowSelection = false,
    selectedRowIds = [],
    onRowsSelect,
    data = [],
    isLoading = false,
    sortKey,
    sortDir = 'asc',
    onSort,
    codeGroups = [],
    handlers,
    pageSize = PREVIEW_ROW_COUNT,
    totalElements = 0,
    totalPages = 0,
    currentPage = 0,
    onPageChange,
    displayMode,
    onLoadMore,
    appendLoading = false,
    hasMore = true,
}: TableRendererProps) {
    const isPreview = mode === 'preview';
    const isScroll = (displayMode ?? 'pagination') === 'scroll';
    const { t } = useI18n();

    /* 무한스크롤 sentinel — scroll+live 모드 스크롤 컨테이너 내부에 배치 */
    const sentinelRef = useRef<HTMLDivElement>(null);

    /**
     * 내부 스크롤 컨테이너 ref
     * - scroll+live 모드에서 테이블 바디 + sentinel을 감싸는 overflow-y-auto 영역
     * - IntersectionObserver의 root로 사용 → window 기준 오작동 방지
     */
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    /* onLoadMore 최신값 ref — Observer 콜백에서 stale closure 방지 */
    const onLoadMoreRef = useRef(onLoadMore);
    useEffect(() => { onLoadMoreRef.current = onLoadMore; });

    /**
     * IntersectionObserver 등록 — scroll+live 모드일 때만
     * root를 내부 스크롤 컨테이너로 지정하여 컨테이너 내 sentinel 감지
     */
    useEffect(() => {
        if (isPreview || !isScroll) return;
        const el = sentinelRef.current;
        const container = scrollContainerRef.current;
        if (!el || !container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    onLoadMoreRef.current?.();
                }
            },
            { root: container, threshold: 0.1 },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [isPreview, isScroll]);

    /**
     * 로드 완료 후 재트리거 — sentinel이 스크롤 컨테이너 내에 여전히 있으면 다음 페이지 자동 요청
     *
     * 발동 시점:
     *  - isLoading: true→false (초기 데이터 로드 완료)
     *  - appendLoading: true→false (스크롤 추가 로드 완료)
     *
     * setTimeout(0) 적용 이유:
     *  - React는 자식 effect → 부모 effect 순서로 실행
     *  - 이 effect(자식)가 실행될 때 page.tsx(부모)의 tableDataMapRef sync effect가 아직 미완료
     *  - tableDataMapRef.current가 구 값(appendLoading=true)이라 handleLoadMore가 early return
     *  - setTimeout(0)으로 한 틱 뒤로 미뤄 부모 effect가 먼저 완료되도록 보장
     */
    useEffect(() => {
        if (isPreview || !isScroll || isLoading || appendLoading || !hasMore) return;
        const el = sentinelRef.current;
        const container = scrollContainerRef.current;
        if (!el || !container) return;

        /* 한 틱 뒤 실행 — 부모의 tableDataMapRef sync effect 완료 후 sentinel 감지 */
        const timer = setTimeout(() => {
            const containerRect = container.getBoundingClientRect();
            const sentinelRect = el.getBoundingClientRect();
            const inContainerView =
                sentinelRect.top < containerRect.bottom &&
                sentinelRect.bottom > containerRect.top;

            if (inContainerView) {
                onLoadMoreRef.current?.();
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [isLoading, appendLoading, isPreview, isScroll, hasMore]);

    /* 컬럼 없음 */
    if (!columns.length) {
        return (
            <div className="h-full w-full flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic">컬럼 없음</span>
            </div>
        );
    }

    return (
        /* RendererContainer — h-full w-full + 테두리 공통 처리
           scroll+live: flex-col 추가로 내부 스크롤 레이아웃 활성화 */
        <RendererContainer className={`bg-white${isScroll && !isPreview ? ' flex flex-col' : ''}`}>

            {/* 총 건수 / 표시 범위 (preview: 샘플값, live: 실제값) */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                <p className="text-xs text-slate-500">
                    {t('common.pagination.total', { count: isPreview ? '00' : totalElements.toLocaleString() })}
                </p>
                <p className="text-xs text-slate-400">
                    {isPreview
                        ? t('common.pagination.showing', { start: '1', end: String(pageSize) })
                        : totalElements > 0
                            ? isScroll
                                ? t('common.pagination.showing', { start: '1', end: String(Math.min((currentPage + 1) * (pageSize || DEFAULT_PAGE_SIZE), totalElements)) })
                                : t('common.pagination.showing', { start: String(currentPage * (pageSize || DEFAULT_PAGE_SIZE) + 1), end: String(Math.min((currentPage + 1) * (pageSize || DEFAULT_PAGE_SIZE), totalElements)) })
                            : ''
                    }
                </p>
            </div>

            {/*
              * scroll+live: scrollContainerRef를 부착하고 flex-1 + overflow-y-auto 적용
              *   → 내부 스크롤 활성화, sentinel이 이 컨테이너 안에 배치됨
              * 그 외: 기존 overflow-x-auto 유지
              */}
            <div
                ref={isScroll && !isPreview ? scrollContainerRef : undefined}
                className={`overflow-x-auto${isScroll && !isPreview ? ' flex-1 overflow-y-auto' : ''}`}
            >
                <table className="w-full text-sm">

                    {/* ── 헤더 ── */}
                    <thead className="sticky top-0 z-10">
                        <tr className="border-b border-slate-200 bg-slate-50/80">
                            {/* 전체선택 체크박스 — enableRowSelection=true 일 때만 표시 */}
                            {enableRowSelection && (
                                <th className="w-10 px-2 py-3 text-center flex-shrink-0 sticky left-0 z-20 bg-slate-50/80">
                                    <input
                                        type="checkbox"
                                        disabled={isPreview}
                                        checked={!isPreview && data.length > 0 && data.every(row => selectedRowIds.includes(row._id as number))}
                                        onChange={e => {
                                            if (isPreview) return;
                                            const allIds = data.map(row => row._id as number).filter(Boolean);
                                            onRowsSelect?.(e.target.checked ? allIds : []);
                                        }}
                                        className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer disabled:cursor-default"
                                    />
                                </th>
                            )}
                            {columns.map(col => (
                                <th
                                    key={col.id}
                                    className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                                    style={{
                                        textAlign: 'center',
                                        width: col.width ? `${col.width}${col.widthUnit || 'px'}` : undefined,
                                    }}
                                >
                                    {col.sortable ? (
                                        /* sortable 컬럼: preview는 포인터 없는 버튼, live는 클릭 가능 */
                                        <button
                                            onClick={!isPreview ? () => {
                                                const isCurrentCol = sortKey === col.accessor;
                                                /* desc → asc → default(null) → desc 순환 */
                                                const nextDir: 'asc' | 'desc' | null =
                                                    !isCurrentCol ? 'desc'
                                                    : sortDir === 'desc' ? 'asc'
                                                    : null;
                                                onSort?.(col.accessor, nextDir);
                                            } : undefined}
                                            className={`flex items-center justify-center gap-1 w-full transition-colors ${isPreview ? 'cursor-default' : 'hover:text-slate-900'}`}
                                        >
                                            {col.headerMsgKey ? t(col.headerMsgKey) : (col.header || (col.cellType === 'actions' ? t('common.label.action') : '—'))}
                                            <SortIcon sorted={isPreview ? false : (sortKey === col.accessor ? sortDir : false)} />
                                        </button>
                                    ) : (
                                        <span className="flex items-center justify-center gap-1">
                                            {col.headerMsgKey ? t(col.headerMsgKey) : (col.header || (col.cellType === 'actions' ? t('common.label.action') : '—'))}
                                        </span>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    {/* ── 바디 ── */}
                    <tbody>
                        {isPreview ? (
                            /* preview: pageSize개 샘플 행 */
                            Array.from({ length: pageSize }, (_, rowIdx) => (
                                <tr
                                    key={rowIdx}
                                    className="border-b border-slate-100 hover:bg-slate-50/50"
                                >
                                    {/* preview 체크박스 — disabled 샘플 표시 */}
                                    {enableRowSelection && (
                                        <td className="w-10 px-2 py-3 text-center sticky left-0 bg-white">
                                            <input type="checkbox" disabled className="w-3.5 h-3.5 rounded border-slate-300 cursor-default" />
                                        </td>
                                    )}
                                    {columns.map(col => (
                                        <td
                                            key={col.id}
                                            className="px-4 py-3 max-w-[200px] overflow-hidden"
                                            style={{ textAlign: col.align }}
                                        >
                                            <TableCellRenderer
                                                mode="preview"
                                                col={col}
                                                rowIndex={rowIdx}
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : isLoading ? (
                            /* live: 초기/검색 로딩 중 */
                            <tr>
                                <td colSpan={columns.length} className="py-16 text-center">
                                    <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        {t('common.table.loading')}
                                    </span>
                                </td>
                            </tr>
                        ) : !data.length ? (
                            /* live: 데이터 없음 */
                            <tr>
                                <td colSpan={columns.length} className="py-16 text-center text-sm text-slate-400">
                                    {t('common.table.no_data')}
                                </td>
                            </tr>
                        ) : (
                            /* live: 실제 데이터 행 */
                            data.map((row, rowIdx) => {
                                const rowId = row._id as number;
                                const isSelected = enableRowSelection && selectedRowIds.includes(rowId);
                                return (
                                    <tr
                                        key={rowId || rowIdx}
                                        className={`border-b border-slate-100 last:border-0 transition-all ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/50'}`}
                                    >
                                        {/* live 체크박스 — 개별 행 선택 */}
                                        {enableRowSelection && (
                                            <td className="w-10 px-2 py-3 text-center sticky left-0 bg-inherit">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={e => {
                                                        const next = e.target.checked
                                                            ? [...selectedRowIds, rowId]
                                                            : selectedRowIds.filter(id => id !== rowId);
                                                        onRowsSelect?.(next);
                                                    }}
                                                    className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-900 cursor-pointer"
                                                />
                                            </td>
                                        )}
                                        {columns.map(col => (
                                            <td
                                                key={col.id}
                                                className="px-4 py-3 max-w-[200px] overflow-hidden"
                                                style={{ textAlign: col.align }}
                                            >
                                                <TableCellRenderer
                                                    mode="live"
                                                    col={col}
                                                    row={row}
                                                    codeGroups={codeGroups}
                                                    handlers={handlers}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* sentinel — scroll+live 모드: 스크롤 컨테이너 내부 하단에 배치 */}
                {isScroll && !isPreview && (
                    <div ref={sentinelRef} className="py-6 text-center">
                        {hasMore ? (
                            <div className="flex flex-col items-center gap-2">
                                <Loader2 className="w-5 h-5 animate-spin text-slate-300" />
                                <span className="text-[10px] text-slate-400 font-medium tracking-tight">{t('common.pagination.loading_more')}</span>
                            </div>
                        ) : data.length > 0 ? (
                            <div className="py-2">
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-sm">
                                    {t('common.pagination.all_loaded', { count: totalElements.toLocaleString() })}
                                </span>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            {/* preview 전용 스크롤 모드 인디케이터 */}
            {isScroll && isPreview && (
                <div className="py-3 text-center border-t border-dashed border-slate-200 bg-slate-50/60">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                        <span>↓</span>
                        무한스크롤 모드
                    </span>
                </div>
            )}

            {/* 페이지네이션 (scroll 모드 제외 / preview: 샘플 3페이지 disabled, live: totalPages >= 1이면 항상 표시) */}
            {!isScroll && (isPreview || totalPages >= 1) && (
                <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">
                    <button
                        disabled={isPreview || currentPage === 0}
                        onClick={() => onPageChange?.(currentPage - 1)}
                        className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {t('common.btn.prev')}
                    </button>
                    {isPreview ? (
                        /* preview: 샘플 페이지 버튼 3개 (1번 활성) */
                        [1, 2, 3].map(p => (
                            <button
                                key={p}
                                disabled
                                className={`px-2.5 py-1.5 text-xs rounded border transition-all ${p === 1 ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600'
                                    } disabled:cursor-default`}
                            >
                                {p}
                            </button>
                        ))
                    ) : (
                        /* live: 실제 페이지 버튼 — 10개 단위 그룹 표시 */
                        (() => {
                            const groupStart = Math.floor(currentPage / 10) * 10;
                            const groupEnd = Math.min(groupStart + 10, totalPages);
                            return Array.from({ length: groupEnd - groupStart }, (_, i) => groupStart + i);
                        })().map(p => (
                            <button
                                key={p}
                                onClick={() => onPageChange?.(p)}
                                className={`px-2.5 py-1.5 text-xs rounded border transition-all ${currentPage === p ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {p + 1}
                            </button>
                        ))
                    )}
                    <button
                        disabled={isPreview || currentPage >= totalPages - 1}
                        onClick={() => onPageChange?.(currentPage + 1)}
                        className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                        {t('common.btn.next')}
                    </button>
                </div>
            )}
        </RendererContainer>
    );
}
