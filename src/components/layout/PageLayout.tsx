'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ROW_HEIGHT } from './GridCell';
import { PageGridContainer } from './PageGridContainer';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { usePageTitleStore } from '@/store/usePageTitleStore';

/** navMenus 트리에서 현재 pathname과 일치하는 메뉴 항목 반환 */
function findMenuByUrl(menus: MenuItem[], pathname: string): MenuItem | null {
    for (const item of menus) {
        if (item.url === pathname) return item;
        if (item.children?.length) {
            const found = findMenuByUrl(item.children, pathname);
            if (found) return found;
        }
    }
    return null;
}

/**
 * PageLayout — 12칸 그리드 기반 공통 페이지 레이아웃
 *
 * 빌더 미리보기 + 실제 생성 페이지 모두에서 동일하게 사용한다.
 * 한 곳만 수정하면 모든 페이지에 동일하게 반영된다.
 *
 * - mode='preview' : 빌더 미리보기용. showGrid 기본값 true
 * - mode='live'    : 실제 서비스 페이지. showGrid 기본값 false
 * - g 키           : 격자 가이드라인 on/off 토글 (preview/live 모두 동작)
 * - showGrid=true  : 격자선 + 테두리 + 배경색 표시 (모드 구분 없이 동일)
 * - showGrid=false : 격자선 없음, 테두리 없음, 배경 없음
 *
 * @example
 * // 빌더 미리보기
 * <PageLayout mode="preview">
 *   <GridCell colSpan={12} rowSpan={2}>
 *     <WidgetRenderer mode="preview" widget={searchWidget} />
 *   </GridCell>
 * </PageLayout>
 *
 * // 실제 페이지
 * <PageLayout title="게시판 목록" mode="live">
 *   <GridCell colSpan={12} rowSpan={2}>
 *     <WidgetRenderer mode="live" widget={searchWidget} />
 *   </GridCell>
 * </PageLayout>
 */

interface PageLayoutProps {
    title?: string;
    /** 페이지 제목 아래 표시되는 설명 (메뉴 관리에서 입력) */
    description?: string;
    /** preview: 빌더 미리보기 (격자 기본 표시) / live: 실제 서비스 페이지 (격자 기본 숨김) */
    mode?: 'preview' | 'live';
    children: React.ReactNode;
}

export default function PageLayout({ title, description, mode = 'live', children }: PageLayoutProps) {
    const pathname = usePathname();
    const navMenus = useMenuStore((state) => state.navMenus);

    /* 빌더에서 설정한 페이지 제목 (메뉴명 없을 때 폴백) */
    const pageTitle = usePageTitleStore(s => s.pageTitle);

    /* mode="live"일 때 현재 URL로 메뉴명/설명 자동 조회 — title prop 우선 */
    const autoMenu = mode === 'live' ? findMenuByUrl(navMenus, pathname || '') : null;
    /* 우선순위: title prop > 메뉴명 > 빌더 pageTitle */
    const displayTitle = title ?? autoMenu?.name ?? (mode === 'live' ? pageTitle : undefined);
    const displayDescription = description ?? autoMenu?.description;

    /* 격자 표시 여부 — preview는 기본 true, live는 기본 false */
    const [showGrid, setShowGrid] = useState(mode === 'preview');

    /* g 키로 격자 가이드라인 토글 (input/textarea/select 포커스 중엔 무시) */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === 'g' || e.key === 'G') setShowGrid(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    /* showGrid=true일 때 격자선 + 테두리 + 배경색 — 모드 구분 없이 동일하게 적용 */
    /* showGrid=true 일 때 격자선 배경 — PageGridContainer 위에 겹쳐 표시 */
    const overlayStyle: React.CSSProperties = showGrid ? {
        backgroundImage: `
            linear-gradient(to right,  #e2e8f0 1px, transparent 1px),
            linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
        `,
        backgroundSize: `calc(100% / 12) ${ROW_HEIGHT}px`,
    } : {};

    /* showGrid 상태가 테두리/배경을 결정 */
    const wrapCls = showGrid ? 'border border-slate-200 rounded-lg bg-slate-50' : '';

    return (
        <div className="space-y-3">
            {displayTitle && (
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{displayTitle}</h1>
                    {displayDescription && (
                        <p className="text-sm text-slate-500 mt-0.5">{displayDescription}</p>
                    )}
                </div>
            )}
            <div className={wrapCls} style={overlayStyle}>
                <PageGridContainer>
                    {children}
                </PageGridContainer>
            </div>
        </div>
    );
}
