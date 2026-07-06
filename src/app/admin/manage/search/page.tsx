'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SearchWidget, SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';
import api from '@/lib/api';

/* ── 검색관리 단건 타입 (목록 응답 기준) ── */
interface SearchMgmtItem {
    id: number;
    url: string;
}

/* ── Spring Page 응답 타입 ── */
interface PageResponse {
    content: SearchMgmtItem[];
    totalElements: number;
    totalPages: number;
    number: number; // 현재 페이지 (0-based)
}

const PAGE_SIZE = 20;

/* ── 페이지 컴포넌트 ── */
export default function SearchMgmtPage() {
    const router = useRouter();

    /* 목록 데이터 상태 */
    const [items, setItems] = useState<SearchMgmtItem[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [loading, setLoading] = useState(false);

    /* 검색 입력값 — 필드 ID 기준 (f1: URL) */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({ f1: '' });

    /* 검색 버튼 클릭 시 실제 조회에 사용되는 확정 검색값 */
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({ f1: '' });

    /* ── 목록 조회 — 실제 API 호출 (서버 페이징) ── */
    const fetchList = useCallback(async (page = 0, search = appliedSearch) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: String(page),
                size: String(PAGE_SIZE),
                sort: 'createdAt,desc',
            };
            if (search.f1) {
                params.url = search.f1;
            }

            const res = await api.get<PageResponse>('/search-manage', { params });
            setItems(res.data.content);
            setTotalElements(res.data.totalElements);
            const safePages = res.data.totalPages > 0
                ? res.data.totalPages
                : Math.ceil((res.data.totalElements ?? 0) / PAGE_SIZE) || 1;
            setTotalPages(safePages);
            setCurrentPage(page);
        } finally {
            setLoading(false);
        }
    }, [appliedSearch]);

    /* 초기 로드 */
    useEffect(() => {
        fetchList(0, { f1: '' });
    // 마운트 시 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── 수정 페이지 이동 (등록/수정 통합 화면, id === 'new'이면 신규 등록) ── */
    const goDetail = useCallback((id: number) => {
        router.push(`/admin/manage/search/${id}`);
    }, [router]);

    /* ── 검색 위젯 정의 ── */
    const SEARCH_WIDGET: SearchWidget = useMemo(() => ({
        type: 'search',
        widgetId: 'search-mgmt-search',
        contentKey: 'searchMgmtSearch',
        displayStyle: 'standard',
        rows: [
            {
                id: 'r1',
                cols: 4,
                fields: [
                    {
                        id: 'f1',
                        type: 'input',
                        label: 'URL',
                        colSpan: 1,
                        placeholder: 'URL 입력',
                    },
                ],
            },
        ],
    }), []);

    /* ── 테이블 위젯 정의 ── */
    const TABLE_WIDGET: TableWidget = useMemo(() => ({
        type: 'table',
        widgetId: 'search-mgmt-table',
        contentKey: 'searchMgmtList',
        displayMode: 'pagination',
        pageSize: PAGE_SIZE,
        connectedSearchIds: ['search-mgmt-search'],
        connectedSlug: '',
        columns: [
            {
                id: 'c1',
                header: 'URL',
                accessor: 'url',
                cellType: 'text',
                align: 'left',
                sortable: false,
            },
            {
                id: 'c2',
                header: '수정',
                accessor: '_actions',
                cellType: 'actions',
                align: 'center',
                sortable: false,
                actions: ['edit'],
                width: 70,
            },
        ],
    }), []);

    /* ── 등록 버튼 위젯 정의 (settings/sites 목록화면과 동일한 컨벤션) ── */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'search-mgmt-space',
        align: 'right',
        showBorder: false,
        items: [
            {
                id: 's1',
                type: 'action-button',
                label: '등록',
                colSpan: 1,
                color: 'black',
                connType: 'close',
            },
        ],
    }), []);

    /* ── 검색 핸들러 ── */
    const handleSearchChange = useCallback((fieldId: string, value: string) => {
        setSearchValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    const handleSearch = useCallback(() => {
        const nextSearch = { ...searchValues };
        setAppliedSearch(nextSearch);
        fetchList(0, nextSearch);
    }, [searchValues, fetchList]);

    const handleReset = useCallback(() => {
        const empty = { f1: '' };
        setSearchValues(empty);
        setAppliedSearch(empty);
        fetchList(0, empty);
    }, [fetchList]);

    /* ── 페이지 변경 핸들러 ── */
    const handlePageChange = useCallback((page: number) => {
        fetchList(page, appliedSearch);
    }, [fetchList, appliedSearch]);

    /* ── 테이블 액션 핸들러 — 수정 버튼 클릭 시 등록화면(2단계) 이동 ── */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            const id = row._id as number;
            if (id) goDetail(id);
        },
    }), [goDetail]);

    /* ── 테이블 렌더링용 데이터 변환 ── */
    const tableData = useMemo(
        () => items.map(item => ({
            _id: item.id,
            url: item.url,
        })) as unknown as Record<string, unknown>[],
        [items],
    );

    return (
        <PageLayout mode="live">
            {/* 검색 위젯 */}
            <GridCell colSpan={12} rowSpan={2}>
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

            {/* 등록 버튼 */}
            <GridCell colSpan={1} colStart={12} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={1}
                    onClose={() => router.push('/admin/manage/search/new')}
                />
            </GridCell>

            {/* 테이블 위젯 — 서버 페이징 */}
            <GridCell colSpan={12} rowSpan={15}>
                <WidgetRenderer
                    mode="live"
                    widget={TABLE_WIDGET}
                    contentColSpan={12}
                    tableData={tableData}
                    tableLoading={loading}
                    totalElements={totalElements}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={handlePageChange}
                    handlers={handlers}
                />
            </GridCell>
        </PageLayout>
    );
}
