'use client';

/**
 * ============================================================
 *  [위젯 렌더러] /admin/widget/{slug}
 * ============================================================
 *  - DB에서 slug로 위젯 템플릿(PAGE 타입) 로딩
 *  - configJson.widgetItems → 12칸 그리드 레이아웃으로 렌더링
 *  - 공통 훅(useWidgetPageState)으로 검색·테이블·폼·서브리스트·파일업로드·멀티셀렉트 상태 관리
 *  - 공통 renderer 컴포넌트 사용 (변경 시 빌더 미리보기와 동시 반영)
 * ============================================================
 */

import React, { useState, useEffect } from 'react';
import PageLayout from '@/components/layout/page-layout';
import { Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useCodeStore } from '@/store/use-code-store';
import { usePageTitleStore } from '@/store/use-page-title-store';
import { PageGridRenderer } from '@/app/admin/templates/make/_shared/components/renderer';
import type { PageWidgetItem } from '@/app/admin/templates/make/_shared/components/renderer';
import { useWidgetPageState } from '@/app/admin/templates/make/_shared/hooks/useWidgetPageState';
import type { ConnectedType } from '@/app/admin/templates/make/_shared/hooks/useOutputMode';
import { useI18n } from '@/hooks/use-i18n';

/* ══════════════════════════════════════════ */
/*  타입                                      */
/* ══════════════════════════════════════════ */

interface WidgetConfig {
    widgetItems: PageWidgetItem[];
    pageTitle?: string;
    /** 페이지 레벨 메인 연결 타입 — 'entity' | 'data'면 Table 위젯이 Slug Entity REST API를 조회한다 */
    connectedType?: ConnectedType;
}

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function WidgetRendererPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const { groups: codeGroups, fetchGroups } = useCodeStore();
    const setPageTitle = usePageTitleStore(s => s.setPageTitle);
    const { t } = useI18n();

    /* 템플릿 로딩 상태 */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [widgetItems, setWidgetItems] = useState<PageWidgetItem[]>([]);
    const [connectedType, setConnectedType] = useState<ConnectedType | undefined>(undefined);

    /* 공통 훅 — 검색·테이블·폼·서브리스트·파일업로드·멀티셀렉트 상태 및 핸들러 전체 */
    const { gridProps } = useWidgetPageState(widgetItems, slug, { connectedType });

    /* 템플릿 + 공통코드 로딩 */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`, { params: { type: 'PAGE' } })
            .then(res => {
                const config = JSON.parse(res.data.configJson) as WidgetConfig;
                const items = config.widgetItems || [];
                setWidgetItems(items);
                setConnectedType(config.connectedType || undefined);
                /* 빌더에서 설정한 페이지 제목을 전역 스토어에 저장 */
                setPageTitle(config.pageTitle || '');
            })
            .catch(() => setError(t('common.error.page_load')))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 로딩 ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
        );
    }

    /* ── 오류 ── */
    if (error) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-500">
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
                {...gridProps}
            />
        </PageLayout>
    );
}
