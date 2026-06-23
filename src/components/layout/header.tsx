'use client';

import { LogOut, ChevronRight, Home, Globe } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';
import { useMenuStore, MenuItem } from '@/store/use-menu-store';
import { useNavMenusQuery } from '@/hooks/use-menu-queries';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteStore } from '@/store/use-site-store';
import { usePageTitleStore } from '@/store/use-page-title-store';
import { LanguageSelector } from '@/components/layout/language-selector';
import { useI18n } from '@/hooks/use-i18n';


/** 메뉴 트리를 재귀 탐색해 현재 URL 경로(부모명 → 메뉴명) 반환 */
function findMenuBreadcrumb(
    menus: MenuItem[],
    pathname: string,
    t: (key: string) => string,
    parents: { label: string; href: string }[] = []
): { label: string; href: string }[] | null {
    for (const item of menus) {
        /* nameMsgKey 있으면 locale-aware 텍스트, 없으면 name fallback */
        const label = item.nameMsgKey ? t(item.nameMsgKey) : item.name;
        if (item.url === pathname) {
            return [...parents, { label, href: item.url }];
        }
        if (item.children && item.children.length > 0) {
            const result = findMenuBreadcrumb(
                item.children,
                pathname,
                t,
                [...parents, { label, href: item.url || '#' }]
            );
            if (result) return result;
        }
    }
    return null;
}

/** 홈페이지 선택 셀렉트박스 컴포넌트 */
function SiteSelector() {
    const { activeSiteId, setActiveSiteId, loadActiveSiteFromStorage } = useSiteStore();
    const adminInfo = useAuthStore((state) => state.adminInfo);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const { t } = useI18n();
    const [mySites, setMySites] = useState<{ id: number; name: string; nameMsgKey?: string }[]>([]);

    /* 마운트 시 localStorage 복원 */
    useEffect(() => {
        loadActiveSiteFromStorage();
    }, [loadActiveSiteFromStorage]);

    /* 내 계정에 연동된 사이트만 조회 + 사이트 없는 사용자 차단 */
    useEffect(() => {
        if (!adminInfo?.id) return;

        const fetchSites = async () => {
            try {
                const res = await api.get(`/admins/${adminInfo.id}/sites`);
                const sites: { id: number; name: string; nameMsgKey?: string }[] = res.data;
                setMySites(sites);

                if (sites.length === 0) {
                    /* 배정된 사이트가 없으면 서버 쿠키까지 삭제 후 강제 로그아웃 — 루프 방지 */
                    toast.error('접근 가능한 홈페이지가 없습니다. 관리자에게 문의하세요.');
                    await api.post('/auth/logout').catch(() => {});
                    logout();
                    router.push('/admin/login');
                    return;
                }

                /* activeSiteId가 없거나 내 사이트 목록에 없으면 첫 번째 사이트 자동 선택 */
                const currentId = useSiteStore.getState().activeSiteId;
                const isValid = currentId !== null && sites.some(s => s.id === currentId);
                if (!isValid) {
                    setActiveSiteId(sites[0].id);
                }
            } catch {
                setMySites([]);
            }
        };

        fetchSites();
    }, [adminInfo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 사이트 변경 — activeSiteId 업데이트 후 페이지 전체 새로고침 */
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setActiveSiteId(Number(e.target.value));
        window.location.reload();
    };

    return (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md">
            <Globe className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
            <select
                value={activeSiteId ?? ''}
                onChange={handleChange}
                className="text-xs font-semibold text-slate-700 bg-transparent outline-none cursor-pointer max-w-[120px]"
            >
                {mySites.length === 0 ? (
                    <option value="">{t('site.selector.empty')}</option>
                ) : (
                    mySites.map(site => (
                        <option key={site.id} value={site.id}>
                            {site.nameMsgKey ? t(site.nameMsgKey) : site.name}
                        </option>
                    ))
                )}
            </select>
        </div>
    );
}

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);
    const navMenus = useMenuStore((state) => state.navMenus);
    const __syncQueryMenus = useMenuStore((state) => state.__syncQueryMenus);
    const queryClient = useQueryClient();
    const pageTitle = usePageTitleStore(s => s.pageTitle);
    const previousPath = usePageTitleStore(s => s.previousPath);
    const { t } = useI18n();

    /* React Query 기반 네비게이션 메뉴 캐싱 연동 */
    const { data: serverNavMenus } = useNavMenusQuery();

    useEffect(() => {
        if (serverNavMenus) {
            __syncQueryMenus(serverNavMenus, [], true); // isNav = true
        }
    }, [serverNavMenus, __syncQueryMenus]);

    /* 메뉴 트리에서 현재 경로 조회 → 없으면 URL 세그먼트 폴백 */
    const menuCrumbs = findMenuBreadcrumb(navMenus, pathname || '', t);
    /* 메뉴명이 비어있을 때 빌더 pageTitle로 대체 (우선순위: 메뉴명 > pageTitle) */
    const resolvedCrumbs = menuCrumbs?.map((c, i, arr) =>
        i === arr.length - 1 && !c.label.trim() && pageTitle
            ? { ...c, label: pageTitle }
            : c
    );
    /* 메뉴에 없는 페이지 — previousPath로 부모 메뉴 전체 크럼 탐색 */
    const parentCrumbs = !resolvedCrumbs && previousPath
        ? findMenuBreadcrumb(navMenus, previousPath, t) ?? null
        : null;

    const crumbs = resolvedCrumbs
        ? [...resolvedCrumbs.map((c, i) => ({ ...c, isLast: i === resolvedCrumbs.length - 1 }))]
        : (() => {
            /* pageTitle이 있으면 단일 크럼으로 표시, 없으면 마지막 URL 세그먼트 폴백 */
            const lastLabel = pageTitle || (pathname || '').split('/').filter(Boolean).pop() || '';
            const lastHref = pathname || '/';
            const items: { label: string; href: string; isLast: boolean }[] = [];
            /* 부모 크럼 전체 — previousPath에서 찾은 계층 모두 앞에 추가 */
            if (parentCrumbs) {
                parentCrumbs.forEach(c => items.push({ label: c.label, href: c.href, isLast: false }));
            }
            items.push({ label: lastLabel, href: lastHref, isLast: true });
            return items;
        })();

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            /* 쿠키 삭제 실패해도 클라이언트 상태 초기화 */
        }
        /* 계정 전환 시 이전 사용자의 메뉴 캐시가 재사용되지 않도록 제거 */
        queryClient.removeQueries({ queryKey: ['menus', 'nav'] });
        logout();
        router.push('/admin/login');
    };

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
            {/* 브레드크럼 */}
            <nav className="flex items-center gap-1.5 text-sm">
                <Home className="w-3.5 h-3.5 text-gray-400" />
                {crumbs.map((crumb, i) => (
                    <span key={`${crumb.href}-${i}`} className="flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        {crumb.isLast ? (
                            <span className="font-semibold text-slate-900 tracking-tight">{crumb.label}</span>
                        ) : (
                            <span
                                className="text-gray-500 hover:text-slate-900 cursor-pointer transition-colors font-medium"
                                onClick={() => router.push(crumb.href)}
                            >
                                {crumb.label}
                            </span>
                        )}
                    </span>
                ))}
            </nav>

            {/* 우측 액션 */}
            <div className="flex items-center gap-2">
                {/* 홈페이지 선택 드롭다운 */}
                <SiteSelector />
                {/* 다국어 선택 드롭다운 */}
                <LanguageSelector />

                {/* 알림 아이콘 — 추후 활성화
                <button className="relative w-8 h-8 flex items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-slate-900 transition-all">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button> */}
                {/* 설정 아이콘 — 추후 활성화
                <button className="w-8 h-8 flex items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-slate-900 transition-all">
                    <Settings className="w-4 h-4" />
                </button> */}
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-sm text-xs font-semibold transition-all tracking-tight"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    {t('common.btn.logout')}
                </button>
            </div>
        </header>
    );
}
