'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import PageLayout from '@/components/layout/page-layout';
import { GridCell } from '@/components/layout/grid-cell';
import { WidgetRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { SpaceWidget } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import type { TableActionHandlers } from '@/app/admin/templates/make/_shared/components/renderer/types';
import { useSiteStore } from '@/store/use-site-store';
import { useI18n } from '@/hooks/use-i18n';

/* ── 상수 ── */
const PAGE_SIZE = 20;

/* ── 페이지 컴포넌트 ── */
export default function SitesPage() {
    const router = useRouter();
    const { t } = useI18n();
    const { sites, isLoading, fetchSites, deleteSite } = useSiteStore();

    const [currentPage, setCurrentPage] = useState(0);
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    useEffect(() => {
        fetchSites();
    }, [fetchSites]);

    /* 공간영역 — 홈페이지 추가 버튼 */
    const SPACE_WIDGET: SpaceWidget = useMemo(() => ({
        type: 'space',
        widgetId: 'sites-space',
        align: 'right',
        showBorder: false,
        items: [
            {
                id: 's1',
                type: 'action-button',
                label: t('site.btn.add'),
                colSpan: 1,
                color: 'black',
                connType: 'close',
            },
        ],
    }), [t]);

    /* 테이블 위젯 설정 */
    const TABLE_WIDGET: TableWidget = useMemo(() => ({
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
                header: t('site.label.name'),
                accessor: 'name',
                cellType: 'text',
                align: 'left',
                sortable: true,
            },
            {
                id: 'c2',
                header: t('common.label.domain'),
                accessor: 'domain',
                cellType: 'text',
                align: 'left',
                sortable: false,
            },
            {
                id: 'c2-1',
                header: t('common.label.description'),
                accessor: 'description',
                cellType: 'text',
                align: 'left',
                sortable: false,
            },
            {
                id: 'c3',
                header: t('common.label.isActive'),
                accessor: 'isActive',
                cellType: 'badge',
                align: 'center',
                sortable: false,
                width: 100,
                cellOptions: [
                    { value: 'true',  text: t('common.status.active'),   color: 'green' },
                    { value: 'false', text: t('common.status.inactive'), color: 'gray'  },
                ],
            },
            {
                id: 'c4',
                header: t('common.label.manage'),
                accessor: '_actions',
                cellType: 'actions',
                align: 'center',
                sortable: false,
                width: 100,
                actions: ['edit', 'delete'],
            },
        ],
    }), [t]);

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
            if (!confirm(t('site.confirm.delete'))) return;
            try {
                await deleteSite(id);
                toast.success(t('common.deleted'));
            } catch {
                /* store에서 toast 처리 */
            }
        },
    }), [router, deleteSite, t]);

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
                        name: t(s.name),
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
