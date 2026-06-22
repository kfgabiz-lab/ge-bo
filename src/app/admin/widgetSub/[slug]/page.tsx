'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { PageWidgetItem } from '@/app/admin/templates/make/_shared/components/renderer';
import type { TableWidget } from '@/app/admin/templates/make/_shared/components/builder/TableBuilder';
import api from '@/lib/api';
import { useCodeStore } from '@/store/use-code-store';
import { usePageTitleStore } from '@/store/use-page-title-store';
import { useI18n } from '@/hooks/use-i18n';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMenuPageSlug } from '@/hooks/use-menu-page-slug';
import PageLayout from '@/components/layout/page-layout';
import { useWidgetPageState, flatWidgets } from '@/app/admin/templates/make/_shared/hooks/useWidgetPageState';

/* ══════════════════════════════════════════ */
/*  메인 페이지 — /admin/widgetSub/{slug}     */
/* ══════════════════════════════════════════ */

export default function GeneratedPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug }      = React.use(params);
    const router        = useRouter();
    const searchParams  = useSearchParams();
    const dataSlug      = useMenuPageSlug(slug);
    const { groups: codeGroups, fetchGroups } = useCodeStore();
    const setPageTitle  = usePageTitleStore(s => s.setPageTitle);
    const { t }         = useI18n();

    /* 템플릿 로딩 상태 */
    const [loading,     setLoading]     = useState(true);
    const [error,       setError]       = useState<string | null>(null);
    const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);

    /* 공통 훅 — 검색·테이블·폼·파일·SubList·MultiSelect 상태 및 핸들러 전체 */
    const { gridProps } = useWidgetPageState(widgetItems, slug, {
        enableUrlEditMode: true,
        onGoBack: () => router.back(),
    });

    /* 템플릿 로딩 */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`)
            .then(res => {
                const raw = JSON.parse(res.data.configJson) as Record<string, unknown>;
                const items: PageWidgetItem[] = raw.widgetItems ? raw.widgetItems as PageWidgetItem[] : [];
                setWidgetItems(items);
                /* pageTitleMsgKey 우선 → 없으면 pageTitle 직접 텍스트 사용 */
                const msgKey = (raw.pageTitleMsgKey as string) || '';
                setPageTitle(msgKey ? t(msgKey) : ((raw.pageTitle as string) || ''));
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 팝업 저장에 사용할 dataSlug — 테이블 connectedSlug 우선 */
    const resolvedDataSlug = useMemo(() => {
        const tw = flatWidgets(widgetItems).find(w => w.type === 'table') as TableWidget | undefined;
        return tw?.connectedSlug ?? dataSlug;
    }, [widgetItems, dataSlug]);

    /* hideCondition/disableCondition 평가용 URL 파라미터 (id·group_id 제외) */
    const urlParams = useMemo(() => {
        const SKIP = new Set(['id', 'group_id']);
        const map: Record<string, string> = {};
        searchParams.forEach((value, key) => { if (!SKIP.has(key)) map[key] = value; });
        return map;
    }, [searchParams]);

    /* ── 로딩 ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">페이지 로딩 중...</span>
            </div>
        );
    }

    /* ── 오류 ── */
    if (error) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error}</span>
            </div>
        );
    }

    return (
        <PageLayout mode="live">
            <PageGridRenderer
                mode="live"
                widgetItems={widgetItems}
                codeGroups={codeGroups}
                dataSlug={resolvedDataSlug}
                urlParams={urlParams}
                {...gridProps}
            />
        </PageLayout>
    );
}
