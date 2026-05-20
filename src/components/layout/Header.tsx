'use client';

import { LogOut, ChevronRight, Home, Globe, ChevronDown } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { useNavMenusQuery } from '@/hooks/useMenuQueries';
import { useQueryClient } from '@tanstack/react-query';
import { useSiteStore } from '@/store/useSiteStore';

/** 동적 세그먼트(숫자 ID, 'new') → 부모 세그먼트 기준으로 등록/수정 레이블 반환 */
const DYNAMIC_SEGMENT_LABEL_MAP: Record<string, { edit: string; create: string }> = {
    'users':  { edit: '관리자 수정',   create: '관리자 등록' },
    'roles':  { edit: '권한 수정',     create: '권한 등록' },
    'menus':  { edit: '메뉴 수정',     create: '메뉴 등록' },
    'sites':  { edit: '홈페이지 수정', create: '홈페이지 등록' },
};

const BREADCRUMB_MAP: Record<string, string> = {
    'admin': '관리자',
    'dashboard': '대시보드',
    'settings': '설정',
    'users': '사용자 관리',
    'roles': '권한 관리',
    'menus': '메뉴 관리',
    'sites': '홈페이지 관리',
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

/** 홈페이지 선택 드롭다운 컴포넌트 */
function SiteSelector() {
    const { activeSiteId, setActiveSiteId, loadActiveSiteFromStorage } = useSiteStore();
    const adminInfo = useAuthStore((state) => state.adminInfo);
    const logout = useAuthStore((state) => state.logout);
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [mySites, setMySites] = useState<{ id: number; name: string }[]>([]);
    const ref = useRef<HTMLDivElement>(null);

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
                const sites: { id: number; name: string }[] = res.data;
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

    /* 외부 클릭 시 닫기 */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeSite = mySites.find(s => s.id === activeSiteId);

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-all"
            >
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span className="max-w-[120px] truncate">
                    {activeSite ? activeSite.name : '홈페이지 선택'}
                </span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {mySites.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-slate-400 text-center">홈페이지 없음</div>
                    ) : (
                        mySites.map(site => (
                            <button
                                key={site.id}
                                onClick={() => { setActiveSiteId(site.id); setOpen(false); }}
                                className={`w-full text-left px-3 py-2 text-xs font-medium transition-all hover:bg-slate-50 ${
                                    activeSiteId === site.id ? 'text-slate-900 bg-slate-50 font-semibold' : 'text-slate-600'
                                }`}
                            >
                                {site.name}
                            </button>
                        ))
                    )}
                </div>
            )}
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

    /* React Query 기반 네비게이션 메뉴 캐싱 연동 */
    const { data: serverNavMenus } = useNavMenusQuery();

    useEffect(() => {
        if (serverNavMenus) {
            __syncQueryMenus(serverNavMenus, [], true); // isNav = true
        }
    }, [serverNavMenus, __syncQueryMenus]);

    /* 메뉴 트리에서 현재 경로 조회 → 없으면 URL 세그먼트 폴백 */
    const menuCrumbs = findMenuBreadcrumb(navMenus, pathname || '');
    const crumbs = menuCrumbs
        ? [{ label: '관리자', href: '/admin', isLast: false }, ...menuCrumbs.map((c, i) => ({ ...c, isLast: i === menuCrumbs.length - 1 }))]
        : (pathname || '').split('/').filter(Boolean).map((seg, i, arr) => {
            /* 숫자 ID 또는 'new' 세그먼트는 부모 세그먼트 기준으로 레이블 결정 */
            let label: string;
            if (BREADCRUMB_MAP[seg]) {
                label = BREADCRUMB_MAP[seg];
            } else if (/^\d+$/.test(seg) || seg === 'new') {
                const parentSeg = arr[i - 1];
                const dynMap = DYNAMIC_SEGMENT_LABEL_MAP[parentSeg];
                label = dynMap ? (seg === 'new' ? dynMap.create : dynMap.edit) : seg;
            } else {
                label = seg;
            }
            return { label, href: '/' + arr.slice(0, i + 1).join('/'), isLast: i === arr.length - 1 };
        });

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
                    로그아웃
                </button>
            </div>
        </header>
    );
}
