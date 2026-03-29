'use client';

import { Bell, Settings, LogOut, ChevronRight, Home } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';

const BREADCRUMB_MAP: Record<string, string> = {
    'admin': '관리자',
    'dashboard': '대시보드',
    'settings': '설정',
    'users': '사용자 관리',
    'roles': '권한 관리',
    'menus': '메뉴 관리',
    'content': '콘텐츠',
    'display': '디스플레이',
    'boards': '게시판',
    'templates': '템플릿',
    'ui-components': 'UI 컴포넌트',
    'list-layout': '목록형 레이아웃',
    'grid-layout': '카드형 레이아웃',
    'form-layout': '폼형 레이아웃',
    'dashboard-layout': '대시보드 레이아웃',
    'search-layout': '검색 템플릿',
    'list': '목록',
    'server-pagination': '서버사이드 페이징',
    'virtual-scroll': '가상 스크롤링',
    'demo': '데모',
    'page1': 'Page1',
    'page2': 'Page2',
    'form': '폼',
    'layout-right': 'Layout(Right)',
};

/** 메뉴 트리를 재귀 탐색해 현재 URL 경로(부모명 → 메뉴명) 반환 */
function findMenuBreadcrumb(
    menus: MenuItem[],
    pathname: string,
    parents: { label: string; href: string }[] = []
): { label: string; href: string }[] | null {
    for (const item of menus) {
        if (item.url === pathname) {
            return [...parents, { label: item.name, href: item.url }];
        }
        if (item.children && item.children.length > 0) {
            const result = findMenuBreadcrumb(
                item.children,
                pathname,
                [...parents, { label: item.name, href: item.url || '#' }]
            );
            if (result) return result;
        }
    }
    return null;
}

export function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const logout = useAuthStore((state) => state.logout);
    const navMenus = useMenuStore((state) => state.navMenus);

    /* 메뉴 트리에서 현재 경로 조회 → 없으면 URL 세그먼트 폴백 */
    const menuCrumbs = findMenuBreadcrumb(navMenus, pathname || '');
    const crumbs = menuCrumbs
        ? [{ label: '관리자', href: '/admin', isLast: false }, ...menuCrumbs.map((c, i) => ({ ...c, isLast: i === menuCrumbs.length - 1 }))]
        : (pathname || '').split('/').filter(Boolean).map((seg, i, arr) => ({
            label: BREADCRUMB_MAP[seg] || seg,
            href: '/' + arr.slice(0, i + 1).join('/'),
            isLast: i === arr.length - 1,
        }));

    const handleLogout = async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            // 쿠키 삭제 실패해도 클라이언트 상태는 초기화
        }
        logout();
        router.push('/admin/login');
    };

    return (
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-10">
            {/* 브레드크럼 */}
            <nav className="flex items-center gap-1.5 text-sm">
                <Home className="w-3.5 h-3.5 text-gray-400" />
                {crumbs.map((crumb) => (
                    <span key={crumb.href} className="flex items-center gap-1.5">
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
            <div className="flex items-center gap-1">
                <button className="relative w-8 h-8 flex items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-slate-900 transition-all">
                    <Bell className="w-4 h-4" />
                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                </button>
                <button className="w-8 h-8 flex items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-slate-900 transition-all">
                    <Settings className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-gray-200 mx-1" />
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-sm text-xs font-semibold transition-all tracking-tight"
                >
                    <LogOut className="w-3.5 h-3.5" />
                    로그아웃
                </button>
            </div>
        </header>
    );
}
