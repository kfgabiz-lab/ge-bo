'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import api from '@/lib/api';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type {
    SearchWidget,
    SpaceWidget,
} from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';

/* ── 타입 ── */

interface Role {
    id: number;
    code: string;
    displayName: string;
    description: string;
    color: string;
    isSystem: boolean;
    memberCount: number;
}

/* ── 상수 ── */

const PAGE_SIZE = 10;

/** 검색 위젯 설정 — 심플 서치 (한 줄 인라인) */
const SEARCH_WIDGET: SearchWidget = {
    type: 'search',
    widgetId: 'roles-search',
    contentKey: 'rolesSearch',
    displayStyle: 'simple',
    rows: [
        {
            id: 'r1',
            cols: 3,
            fields: [
                {
                    id: 'f1',
                    type: 'input',
                    label: '표시명',
                    colSpan: 1,
                    placeholder: '표시명 검색',
                },
                {
                    id: 'f2',
                    type: 'select',
                    label: '유형',
                    colSpan: 1,
                    options: ['전체', '시스템', '일반'],
                },
            ],
        },
    ],
};

/** 공간영역 위젯 설정 — 권한 추가 버튼 (onClose로 페이지 이동 연결) */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'roles-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1',
            type: 'action-button',
            label: '권한 추가',
            colSpan: 1,
            color: 'black',
            connType: 'close',
        },
    ],
};

/** 테이블 위젯 설정 */
const TABLE_WIDGET: TableWidget = {
    type: 'table',
    widgetId: 'roles-table',
    contentKey: 'rolesList',
    displayMode: 'pagination',
    pageSize: PAGE_SIZE,
    connectedSearchIds: ['roles-search'],
    connectedSlug: '',
    columns: [
        {
            id: 'c1',
            header: '코드',
            accessor: 'code',
            cellType: 'text',
            align: 'left',
            sortable: true,
            width: 160,
        },
        {
            id: 'c2',
            header: '표시명',
            accessor: 'displayName',
            cellType: 'text',
            align: 'left',
            sortable: true,
        },
        {
            id: 'c3',
            header: '설명',
            accessor: 'description',
            cellType: 'text',
            align: 'left',
            sortable: false,
        },
        {
            id: 'c4',
            header: '유형',
            accessor: 'isSystem',
            cellType: 'boolean',
            align: 'center',
            sortable: false,
            trueText: '시스템',
            falseText: '일반',
            width: 80,
        },
        {
            id: 'c5',
            header: '인원',
            accessor: 'memberCount',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 70,
        },
        {
            id: 'c6',
            header: '관리',
            accessor: '_actions',
            cellType: 'actions',
            align: 'center',
            sortable: false,
            actions: ['edit', 'delete'],
            width: 100,
        },
    ],
};

/** 검색 필드 초기값 */
const INITIAL_SEARCH: Record<string, string> = { f1: '', f2: '전체' };

/* ── 페이지 컴포넌트 ── */

export default function RolesSystemPage() {
    const router = useRouter();

    /* 전체 목록 (API에서 한 번에 로드) */
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    /* 검색 상태 */
    const [searchValues, setSearchValues] = useState<Record<string, string>>(INITIAL_SEARCH);
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(INITIAL_SEARCH);

    /* 페이지·정렬 상태 */
    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');


    /* 권한 목록 로드 */
    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/roles');
            setAllRoles(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    /* 클라이언트 필터링 */
    const filteredRoles = useMemo(() => {
        const keyword = appliedSearch.f1?.trim().toLowerCase() ?? '';
        const type = appliedSearch.f2 ?? '전체';

        return allRoles.filter(role => {
            const matchName = keyword === '' || role.displayName.toLowerCase().includes(keyword);
            const matchType =
                type === '전체' ? true
                : type === '시스템' ? role.isSystem
                : !role.isSystem;
            return matchName && matchType;
        });
    }, [allRoles, appliedSearch]);

    /* 클라이언트 정렬 */
    const sortedRoles = useMemo(() => {
        if (!sortKey) return filteredRoles;
        return [...filteredRoles].sort((a, b) => {
            const aVal = String(a[sortKey as keyof Role] ?? '');
            const bVal = String(b[sortKey as keyof Role] ?? '');
            return sortDir === 'asc'
                ? aVal.localeCompare(bVal, 'ko')
                : bVal.localeCompare(aVal, 'ko');
        });
    }, [filteredRoles, sortKey, sortDir]);

    /* 페이지네이션 */
    const pagedRoles = useMemo(
        () => sortedRoles.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
        [sortedRoles, currentPage],
    );

    const totalElements = filteredRoles.length;
    const totalPages = Math.ceil(totalElements / PAGE_SIZE);

    /* 검색 핸들러 */
    const handleSearchChange = useCallback((fieldId: string, value: string) => {
        setSearchValues(prev => ({ ...prev, [fieldId]: value }));
    }, []);

    const handleSearch = useCallback(() => {
        setAppliedSearch({ ...searchValues });
        setCurrentPage(0);
    }, [searchValues]);

    const handleReset = useCallback(() => {
        setSearchValues(INITIAL_SEARCH);
        setAppliedSearch(INITIAL_SEARCH);
        setCurrentPage(0);
    }, []);

    const handleSort = useCallback((accessor: string, dir: 'asc' | 'desc' | null) => {
        setSortKey(accessor);
        if (dir) setSortDir(dir);
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    /* 테이블 액션 핸들러 */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            router.push(`/admin/system/roles/${row.id}`);
        },
        onDelete: async (id) => {
            if (!confirm('해당 권한을 삭제하시겠습니까?')) return;
            try {
                await api.delete(`/roles/${id}`);
                toast.success('권한이 삭제되었습니다.');
                setAllRoles(prev => prev.filter(r => r.id !== id));
            } catch (e: unknown) {
                const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                toast.error(msg ?? '삭제 중 오류가 발생했습니다.');
            }
        },
    }), [router]);

    return (
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

            {/* 공간영역 — 권한 추가 버튼 (align:'right', colSpan:1 → 12번째 칸에 배치) */}
            <GridCell colSpan={1} colStart={12} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={1}
                    onClose={() => router.push('/admin/system/roles/new')}
                />
            </GridCell>

            {/* 테이블 위젯 */}
            <GridCell colSpan={12} rowSpan={7}>
                <WidgetRenderer
                    mode="live"
                    widget={TABLE_WIDGET}
                    contentColSpan={12}
                    tableData={pagedRoles.map(r => ({ _id: r.id, ...r })) as unknown as Record<string, unknown>[]}
                    tableLoading={loading}
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
    );
}
