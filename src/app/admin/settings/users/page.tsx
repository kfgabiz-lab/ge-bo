'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore, Admin } from '@/store/useAdminStore';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type {
    SearchWidget,
    SpaceWidget,
} from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';

/* ── 상수 ── */

const PAGE_SIZE = 10;

/** 검색 위젯 설정 — 심플 서치 */
const SEARCH_WIDGET: SearchWidget = {
    type: 'search',
    widgetId: 'admins-search',
    contentKey: 'adminsSearch',
    displayStyle: 'simple',
    rows: [
        {
            id: 'r1',
            cols: 4,
            fields: [
                {
                    id: 'f1',
                    type: 'input',
                    label: '아이디',
                    colSpan: 1,
                    placeholder: '아이디 검색',
                },
                {
                    id: 'f2',
                    type: 'input',
                    label: '이름',
                    colSpan: 1,
                    placeholder: '이름 검색',
                },
                {
                    id: 'f3',
                    type: 'input',
                    label: '부서명',
                    colSpan: 1,
                    placeholder: '부서명 검색',
                },
                {
                    id: 'f4',
                    type: 'select',
                    label: '계정상태',
                    colSpan: 1,
                    options: ['전체', '활성', '비활성'],
                },
            ],
        },
    ],
};

/** 공간영역 위젯 설정 — 관리자 등록 버튼 */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'admins-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1',
            type: 'action-button',
            label: '관리자 등록',
            colSpan: 1,
            color: 'black',
            connType: 'close',
        },
    ],
};

/** 테이블 위젯 설정 */
const TABLE_WIDGET: TableWidget = {
    type: 'table',
    widgetId: 'admins-table',
    contentKey: 'adminsList',
    displayMode: 'pagination',
    pageSize: PAGE_SIZE,
    connectedSearchIds: ['admins-search'],
    connectedSlug: '',
    columns: [
        {
            id: 'c1',
            header: '아이디',
            accessor: 'email',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 150,
        },
        {
            id: 'c2',
            header: '이름',
            accessor: 'name',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 150,
        },
        {
            id: 'c3',
            header: '부서코드',
            accessor: 'deptCode',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 150,
        },
        {
            id: 'c4',
            header: '부서명',
            accessor: 'deptName',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 150,
        },
        {
            id: 'c5',
            header: '계정상태',
            accessor: 'isActiveText',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 90,
        },
        {
            id: 'c6',
            header: '비고',
            accessor: 'remark',
            cellType: 'text',
            align: 'center',
            sortable: false,
        },
        {
            id: 'c7',
            header: '등록일',
            accessor: 'createdAt',
            cellType: 'text',
            align: 'center',
            sortable: false,
            width: 110,
        },
        {
            id: 'c8',
            header: '관리',
            accessor: '_actions',
            cellType: 'actions',
            align: 'center',
            sortable: false,
            actions: ['edit'],
            width: 80,
        },
    ],
};

/** 검색 필드 초기값 */
const INITIAL_SEARCH: Record<string, string> = { f1: '', f2: '', f3: '', f4: '전체' };

/* ── 페이지 컴포넌트 ── */

export default function AdminAccountsPage() {
    const router = useRouter();
    const { admins, fetchAdmins } = useAdminStore();
    const [loading, setLoading] = useState(true);

    /* 검색 상태 */
    const [searchValues, setSearchValues] = useState<Record<string, string>>(INITIAL_SEARCH);
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>(INITIAL_SEARCH);

    /* 페이지·정렬 상태 */
    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    /* 관리자 목록 로드 */
    const loadAdmins = useCallback(async () => {
        setLoading(true);
        try {
            await fetchAdmins();
        } finally {
            setLoading(false);
        }
    }, [fetchAdmins]);

    useEffect(() => {
        loadAdmins();
    }, [loadAdmins]);

    /* 클라이언트 필터링 */
    const filteredAdmins = useMemo(() => {
        const email    = appliedSearch.f1?.trim().toLowerCase() ?? '';
        const name     = appliedSearch.f2?.trim().toLowerCase() ?? '';
        const deptName = appliedSearch.f3?.trim().toLowerCase() ?? '';
        const status   = appliedSearch.f4 ?? '전체';

        return admins.filter(admin => {
            const matchEmail    = email    === '' || admin.email.toLowerCase().includes(email);
            const matchName     = name     === '' || admin.name.toLowerCase().includes(name);
            const matchDeptName = deptName === '' || (admin.deptName ?? '').toLowerCase().includes(deptName);
            const matchStatus   =
                status === '전체' ? true
                : status === '활성' ? admin.isActive
                : !admin.isActive;
            return matchEmail && matchName && matchDeptName && matchStatus;
        });
    }, [admins, appliedSearch]);

    /* 클라이언트 정렬 */
    const sortedAdmins = useMemo(() => {
        if (!sortKey) return filteredAdmins;
        return [...filteredAdmins].sort((a, b) => {
            const aVal = String(a[sortKey as keyof Admin] ?? '');
            const bVal = String(b[sortKey as keyof Admin] ?? '');
            return sortDir === 'asc'
                ? aVal.localeCompare(bVal, 'ko')
                : bVal.localeCompare(aVal, 'ko');
        });
    }, [filteredAdmins, sortKey, sortDir]);

    /* 페이지네이션 */
    const pagedAdmins = useMemo(
        () => sortedAdmins.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
        [sortedAdmins, currentPage],
    );

    const totalElements = filteredAdmins.length;
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

    const handleSort = useCallback((accessor: string, dir: 'asc' | 'desc') => {
        setSortKey(accessor);
        setSortDir(dir);
    }, []);

    const handlePageChange = useCallback((page: number) => {
        setCurrentPage(page);
    }, []);

    /* 테이블 액션 핸들러 */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            router.push(`/admin/settings/users/${row._id}`);
        },
    }), [router]);

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

                {/* 관리자 등록 버튼 — 당분간 사용 안함 */}
                {/* <GridCell colSpan={1} colStart={12} rowSpan={1}>
                    <WidgetRenderer
                        mode="live"
                        widget={SPACE_WIDGET}
                        contentColSpan={1}
                        onClose={() => router.push('/admin/settings/users/new')}
                    />
                </GridCell> */}

                {/* 테이블 위젯 */}
                <GridCell colSpan={12} rowSpan={7}>
                    <WidgetRenderer
                        mode="live"
                        widget={TABLE_WIDGET}
                        contentColSpan={12}
                        tableData={pagedAdmins.map(a => ({
                            _id:          a.id,
                            email:        a.email,
                            name:         a.name,
                            deptCode:     a.deptCode ?? '-',
                            deptName:     a.deptName ?? '-',
                            isActiveText: a.isActive ? '활성' : '비활성',
                            remark:       a.remark ?? '-',
                            createdAt:    a.createdAt ? a.createdAt.slice(0, 10) : '-',
                        })) as unknown as Record<string, unknown>[]}
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
        </>
    );
}
