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
import { useI18n } from '@/hooks/use-i18n';

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

/* ── 페이지 컴포넌트 ── */

export default function RolesSystemPage() {
    const router = useRouter();
    const { t } = useI18n();

    /* 전체 목록 (API에서 한 번에 로드) */
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [loading, setLoading] = useState(true);

    /* 검색 상태 — 내부값 기준(all/system/general) */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({ f1: '', f2: 'all' });
    const [appliedSearch, setAppliedSearch] = useState<Record<string, string>>({ f1: '', f2: 'all' });

    /* 페이지·정렬 상태 */
    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    /* 권한 목록 로드 */
    const loadRoles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/roles/assignable');
            setAllRoles(res.data);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRoles();
    }, [loadRoles]);

    /** 검색 위젯 — 언어 변경 시 라벨도 갱신 */
    const SEARCH_WIDGET: SearchWidget = useMemo(() => ({
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
                        label: t('common.label.displayName'),
                        colSpan: 1,
                        placeholder: t('role.placeholder.search'),
                    },
                    {
                        id: 'f2',
                        type: 'select',
                        label: t('common.label.type'),
                        colSpan: 1,
                        /* 내부값: 'all'/'system'/'general' */
                        options: ['all', 'system', 'general'],
                        optionLabels: {
                            all:     t('common.label.all'),
                            system:  t('common.label.dbsystem'),
                            general: t('common.type.general'),
                        },
                    },
                ],
            },
        ],
    }), [t]);

    /** 공간영역 위젯 — 권한 추가 버튼 */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'roles-space',
        align: 'right',
        showBorder: false,
        items: [
            {
                id: 's1',
                type: 'action-button',
                label: t('role.btn.add'),
                colSpan: 1,
                color: 'black',
                connType: 'close',
            },
        ],
    }), [t]);

    /** 테이블 위젯 */
    const TABLE_WIDGET: TableWidget = useMemo(() => ({
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
                header: t('role.label.code'),
                accessor: 'code',
                cellType: 'text',
                align: 'left',
                sortable: true,
                width: 160,
            },
            {
                id: 'c2',
                header: t('common.label.displayName'),
                accessor: 'displayName',
                cellType: 'text',
                align: 'left',
                sortable: true,
            },
            {
                id: 'c3',
                header: t('common.label.description'),
                accessor: 'description',
                cellType: 'text',
                align: 'left',
                sortable: false,
            },
            {
                id: 'c4',
                header: t('common.label.type'),
                accessor: 'isSystem',
                cellType: 'boolean',
                align: 'center',
                sortable: false,
                trueText: t('common.label.dbsystem'),
                falseText: t('common.type.general'),
                width: 80,
            },
            {
                id: 'c5',
                header: t('common.label.memberCount'),
                accessor: 'memberCount',
                cellType: 'text',
                align: 'center',
                sortable: false,
                width: 70,
            },
            {
                id: 'c6',
                header: t('common.label.manage'),
                accessor: '_actions',
                cellType: 'actions',
                align: 'center',
                sortable: false,
                actions: ['edit', 'delete'],
                width: 100,
            },
        ],
    }), [t]);

    /* 클라이언트 필터링 — 내부값(all/system/general) 기준 */
    const filteredRoles = useMemo(() => {
        const keyword = appliedSearch.f1?.trim().toLowerCase() ?? '';
        const type    = appliedSearch.f2 ?? 'all';

        return allRoles.filter(role => {
            const matchName = keyword === '' || role.displayName.toLowerCase().includes(keyword);
            const matchType =
                type === 'all'     ? true
                : type === 'system'  ? role.isSystem
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
        const initial = { f1: '', f2: 'all' };
        setSearchValues(initial);
        setAppliedSearch(initial);
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
            router.push(`/admin/settings/roles/${row.id}`);
        },
        onDelete: async (id) => {
            if (!confirm(t('role.confirm.delete'))) return;
            try {
                await api.delete(`/roles/${id}`);
                toast.success(t('role.deleted'));
                setAllRoles(prev => prev.filter(r => r.id !== id));
            } catch (e: unknown) {
                const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
                toast.error(msg ?? t('role.error.delete'));
            }
        },
    }), [router, t]);

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

            {/* 공간영역 — 권한 추가 버튼 */}
            <GridCell colSpan={1} colStart={12} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={1}
                    onClose={() => router.push('/admin/settings/roles/new')}
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
