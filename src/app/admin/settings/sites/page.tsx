'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/PageLayout';
import { GridCell } from '@/components/layout/GridCell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';
import { useSiteStore } from '@/store/useSiteStore';

/* ── 상수 ── */

const PAGE_SIZE = 20;

/** 공간영역 — 홈페이지 추가 버튼 */
const SPACE_WIDGET: SpaceWidget = {
    type: 'space',
    widgetId: 'sites-space',
    align: 'right',
    showBorder: false,
    items: [
        {
            id: 's1',
            type: 'action-button',
            label: '홈페이지 추가',
            colSpan: 1,
            color: 'black',
            connType: 'close',
        },
    ],
};

/** 테이블 위젯 설정 */
const TABLE_WIDGET: TableWidget = {
    type: 'table',
    widgetId: 'sites-table',
    contentKey: 'sitesList',
    displayMode: 'pagination',
    pageSize: PAGE_SIZE,
    connectedSearchIds: [],
    connectedSlug: '',
    columns: [
        {
            id: 'c1',
            header: '홈페이지명',
            accessor: 'name',
            cellType: 'text',
            align: 'left',
            sortable: true,
        },
        {
            id: 'c2',
            header: '도메인',
            accessor: 'domain',
            cellType: 'text',
            align: 'left',
            sortable: false,
        },
        {
            id: 'c2-1',
            header: '설명',
            accessor: 'description',
            cellType: 'text',
            align: 'left',
            sortable: false,
        },
        {
            id: 'c3',
            header: '사용여부',
            accessor: 'isActive',
            cellType: 'badge',
            align: 'center',
            sortable: false,
            width: 100,
            cellOptions: [
                { value: 'true',  text: '사용',   color: 'green' },
                { value: 'false', text: '미사용', color: 'gray'  },
            ],
        },
        {
            id: 'c4',
            header: '관리',
            accessor: '_actions',
            cellType: 'actions',
            align: 'center',
            sortable: false,
            width: 100,
            actions: ['edit', 'delete'],
        },
    ],
};

/* ── 페이지 컴포넌트 ── */

export default function SitesPage() {
    const router = useRouter();
    const { sites, isLoading, fetchSites, deleteSite } = useSiteStore();

    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    /* 정렬 */
    const sortedSites = useMemo(() => {
        if (!sortKey) return sites;
        return [...sites].sort((a, b) => {
            const aVal = String(a[sortKey as keyof typeof a] ?? '');
            const bVal = String(b[sortKey as keyof typeof b] ?? '');
            return sortDir === 'asc' ? aVal.localeCompare(bVal, 'ko') : bVal.localeCompare(aVal, 'ko');
        });
    }, [sites, sortKey, sortDir]);

    /* 페이지네이션 */
    const pagedSites = useMemo(
        () => sortedSites.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE),
        [sortedSites, currentPage],
    );

    const totalPages = Math.ceil(sites.length / PAGE_SIZE);

    const handleSort = useCallback((accessor: string, dir: 'asc' | 'desc') => {
        setSortKey(accessor);
        setSortDir(dir);
        setCurrentPage(0);
    }, []);

    /* 테이블 액션 핸들러 */
    const handlers: TableActionHandlers = useMemo(() => ({
        onEdit: (row) => {
            router.push(`/admin/settings/sites/${row.id}`);
        },
        onDelete: async (id) => {
            if (!confirm('해당 홈페이지를 삭제하시겠습니까?')) return;
            try {
                await deleteSite(id);
                toast.success('홈페이지가 삭제되었습니다.');
            } catch {
                /* store에서 toast 처리 */
            }
        },
    }), [router, deleteSite]);

    return (
        <PageLayout mode="live">
            {/* 홈페이지 추가 버튼 */}
            <GridCell colSpan={1} colStart={12} rowSpan={1}>
                <WidgetRenderer
                    mode="live"
                    widget={SPACE_WIDGET}
                    contentColSpan={1}
                    onClose={() => router.push('/admin/settings/sites/new')}
                />
            </GridCell>

            {/* 테이블 위젯 */}
            <GridCell colSpan={12} rowSpan={7}>
                <WidgetRenderer
                    mode="live"
                    widget={TABLE_WIDGET}
                    contentColSpan={12}
                    tableData={pagedSites.map(s => ({
                        ...s,
                        id: s.id,
                        isActive: String(s.isActive),
                    })) as unknown as Record<string, unknown>[]}
                    tableLoading={isLoading}
                    totalElements={sites.length}
                    totalPages={totalPages}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                    handlers={handlers}
                />
            </GridCell>
        </PageLayout>
    );
}
