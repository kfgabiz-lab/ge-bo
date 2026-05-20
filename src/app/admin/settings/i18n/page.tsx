'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type {
    SearchWidget,
    SpaceWidget,
} from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';
import { useMessageResourceStore, MessageResource } from '@/store/useMessageResourceStore';
import { MessageResourceDrawer } from '@/components/i18n/MessageResourceDrawer';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

/* ── 상수 ── */

const PAGE_SIZE = 20;

/** 검색 위젯 — key / 한국어 / 영어 / 사용여부 */
const SEARCH_WIDGET: SearchWidget = {
    type: 'search',
    widgetId: 'i18n-search',
    contentKey: 'i18nSearch',
    displayStyle: 'simple',
    rows: [
        {
            id: 'r1',
            cols: 4,
            fields: [
                { id: 'f1', type: 'input',  label: 'Key',     colSpan: 1, placeholder: '번역 키 검색' },
                { id: 'f2', type: 'input',  label: '한국어', colSpan: 1, placeholder: '한국어 검색' },
                { id: 'f3', type: 'input',  label: '영어',   colSpan: 1, placeholder: '영어 검색' },
                { id: 'f4', type: 'select', label: '사용여부', colSpan: 1, options: ['전체', '사용', '미사용'] },
            ],
        },
    ],
};

/** 공간영역 위젯 — 항목 추가 버튼 */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'i18n-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1', type: 'action-button', label: '항목 추가',
            colSpan: 1, color: 'black', connType: 'close',
        },
    ],
};

/** 테이블 위젯 */
const TABLE_WIDGET: TableWidget = {
    type: 'table',
    widgetId: 'i18n-table',
    contentKey: 'i18nList',
    displayMode: 'pagination',
    pageSize: PAGE_SIZE,
    connectedSearchIds: ['i18n-search'],
    columns: [
        { id: 'c1', header: 'Key',     accessor: 'key',       cellType: 'text',    align: 'left',   sortable: true,  width: 200 },
        { id: 'c2', header: '한국어', accessor: 'ko',        cellType: 'text',    align: 'left',   sortable: false },
        { id: 'c3', header: '영어',   accessor: 'en',        cellType: 'text',    align: 'left',   sortable: false },
        {
            id: 'c4', header: '사용여부', accessor: 'active', cellType: 'badge',   align: 'center', sortable: false, width: 90,
            cellOptions: [
                { value: 'true',  text: '사용',   color: 'green' },
                { value: 'false', text: '미사용', color: 'gray'  },
            ],
        },
        { id: 'c5', header: '등록일', accessor: 'createdAt', cellType: 'text',    align: 'center', sortable: true,  width: 160 },
        { id: 'c6', header: '관리',   accessor: '_actions',  cellType: 'actions', align: 'center', sortable: false, width: 100, actions: ['edit', 'delete'] },
    ],
};

/** 검색 필드 초기값 */
const INITIAL_SEARCH: Record<string, string> = { f1: '', f2: '', f3: '', f4: '전체' };

/* ── 페이지 컴포넌트 ── */

export default function I18nPage() {
    const {
        items, totalElements, totalPages, currentPage,
        isLoading, fetchItems, deleteItem, openDrawer,
    } = useMessageResourceStore();

    /* 검색 상태 */
    const [searchValues, setSearchValues]   = useState<Record<string, string>>(INITIAL_SEARCH);
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(INITIAL_SEARCH);

    /* 정렬 상태 */
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    /* 삭제 대상 */
    const [deleteTarget, setDeleteTarget] = useState<MessageResource | null>(null);

    /* 검색 파라미터 → fetchItems 호출용 변환 */
    const buildSearchParams = useCallback((search: Record<string, string>, page: number) => ({
        key:    search.f1 ?? '',
        ko:     search.f2 ?? '',
        en:     search.f3 ?? '',
        active: search.f4 ?? '전체',
        page,
        size:   PAGE_SIZE,
    }), []);

    /* 페이지 진입 시 목록 조회 */
    useEffect(() => {
        fetchItems(buildSearchParams(INITIAL_SEARCH, 0));
    }, [fetchItems, buildSearchParams]);

    /* 검색 필드 변경 */
    const handleSearchChange = useCallback((fieldId: string, value: string) => {
        setSearchValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    /* 검색 버튼 */
    const handleSearch = useCallback(() => {
        setAppliedSearch({ ...searchValues });
        fetchItems(buildSearchParams(searchValues, 0));
    }, [searchValues, fetchItems, buildSearchParams]);

    /* 초기화 버튼 */
    const handleReset = useCallback(() => {
        setSearchValues(INITIAL_SEARCH);
        setAppliedSearch(INITIAL_SEARCH);
        fetchItems(buildSearchParams(INITIAL_SEARCH, 0));
    }, [fetchItems, buildSearchParams]);

    /* 페이지 변경 */
    const handlePageChange = useCallback((page: number) => {
        fetchItems(buildSearchParams(appliedSearch, page));
    }, [appliedSearch, fetchItems, buildSearchParams]);

    /* 정렬 변경 */
    const handleSort = useCallback((accessor: string, dir: 'asc' | 'desc') => {
        setSortKey(accessor);
        setSortDir(dir);
    }, []);

    /* 삭제 확인 */
    const handleDeleteConfirm = useCallback(async () => {
        if (!deleteTarget) return;
        try {
            await deleteItem(deleteTarget.id);
            fetchItems(buildSearchParams(appliedSearch, currentPage));
        } catch {
            /* 오류는 store에서 toast 처리 */
        } finally {
            setDeleteTarget(null);
        }
    }, [deleteTarget, deleteItem, fetchItems, buildSearchParams, appliedSearch, currentPage]);

    /* 테이블 액션 핸들러 */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            /* 테이블 row → MessageResource 타입으로 변환 후 Drawer 오픈 */
            const item = items.find(i => i.id === Number(row._id));
            if (item) openDrawer(item);
        },
        onDelete: (id) => {
            const item = items.find(i => i.id === id);
            if (item) setDeleteTarget(item);
        },
    }), [items, openDrawer]);

    /* 테이블 데이터 — active를 string으로 변환 (badge cellType 호환) */
    const tableData = useMemo(() =>
        items.map(item => ({
            _id:       item.id,
            key:       item.key,
            ko:        item.ko,
            en:        item.en ?? '',
            active:    String(item.active),
            createdAt: item.createdAt ? item.createdAt.replace('T', ' ').substring(0, 16) : '',
        })) as unknown as Record<string, unknown>[],
    [items]);

    return (
        <>
            <PageLayout mode="live">
                {/* 검색 위젯 */}
                <GridCell colSpan={12} rowSpan={1}>
                    <WidgetRenderer
                        mode="live"
                        widget={SEARCH_WIDGET}
                        contentColSpan={12}
                        searchValues={searchValues}
                        onSearchChange={handleSearchChange}
                        onSearch={handleSearch}
                        onReset={handleReset}
                    />
                </GridCell>

                {/* 항목 추가 버튼 */}
                <GridCell colSpan={1} colStart={12} rowSpan={1}>
                    <WidgetRenderer
                        mode="live"
                        widget={SPACE_WIDGET}
                        contentColSpan={1}
                        onClose={() => openDrawer()}
                    />
                </GridCell>

                {/* 테이블 위젯 */}
                <GridCell colSpan={12} rowSpan={7}>
                    <WidgetRenderer
                        mode="live"
                        widget={TABLE_WIDGET}
                        contentColSpan={12}
                        tableData={tableData}
                        tableLoading={isLoading}
                        totalElements={totalElements}
                        totalPages={totalPages}
                        currentPage={currentPage}
                        onPageChange={handlePageChange}
                        sortKey={sortKey}
                        sortDir={sortDir}
                        onSort={handleSort}
                        handlers={handlers}
                    />
                </GridCell>
            </PageLayout>

            {/* 등록/수정 Drawer */}
            <MessageResourceDrawer />

            {/* 삭제 확인 모달 */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteConfirm}
                title="항목 삭제"
                description={`'${deleteTarget?.key}' 항목을 삭제하시겠습니까?`}
                confirmText="삭제하기"
                variant="danger"
            />
        </>
    );
}
