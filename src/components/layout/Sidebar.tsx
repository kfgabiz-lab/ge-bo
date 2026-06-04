"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, ChevronRight } from 'lucide-react';
// import { Layers } from 'lucide-react'; /* 기존 로고 — 원복 시 주석 해제 */
import * as LucideIcons from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useMenuStore, MenuItem as DbMenu } from '@/store/use-menu-store';
import { useI18n } from '@/hooks/use-i18n';

/* ── 아이콘 동적 렌더러 ── */
const renderIcon = (name: string, className = 'w-4 h-4') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = (LucideIcons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
    if (!Icon) return null;
    return <Icon className={className} />;
};

/* ── 메뉴 아이템 ── */
const MenuItemComponent = ({ item, depth = 0, isCollapsed }: { item: DbMenu; depth?: number; isCollapsed?: boolean }) => {
    const pathname = usePathname();
    const { t } = useI18n();
    /* nameMsgKey 있으면 locale-aware 텍스트, 없으면 name 컬럼 fallback */
    const displayName = item.nameMsgKey ? t(item.nameMsgKey) : item.name;

    /* 비노출 메뉴는 렌더링하지 않음 — 상위가 숨김이면 children도 자동으로 숨겨짐 */
    if (!item.visible) return null;
    const hasChildren = item.children && item.children.length > 0;
    const hasUrl = item.url && item.url.length > 0;

    /* 활성 상태 판단 */
    const isDirectActive = hasUrl && item.url === pathname;
    const isChildActive = hasChildren && item.children?.some(child =>
        child.url === pathname || pathname?.startsWith(child.url || '') ||
        (child.children && child.children.some(gc => gc.url === pathname || pathname?.startsWith(gc.url || '')))
    );
    const isActive = isDirectActive || isChildActive;
    const [isOpen, setIsOpen] = useState(isActive ?? false);

    /* 경로 변경 시 활성 메뉴 자동 열기 */
    useEffect(() => {
        if (isActive) setIsOpen(true);
    }, [isActive]);

    const handleToggle = (e: React.MouseEvent) => {
        if (hasChildren) { e.preventDefault(); setIsOpen(!isOpen); }
    };

    const base = `relative flex items-center justify-between gap-2.5 py-2 pr-3 rounded-lg transition-all duration-150 text-[13px] group ${depth > 0 && !isCollapsed ? 'pl-9' : 'pl-3'} ${isCollapsed ? 'justify-center pr-0' : ''}`;
    const style = isActive
        ? 'bg-white/[0.08] text-white font-medium'
        : depth === 0
            ? 'text-slate-200 hover:bg-white/5 hover:text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-white';

    const inner = (
        <>
            {isActive && depth === 0 && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-emerald-400 rounded-r" />
            )}
            <div className={`flex items-center gap-2.5 flex-1 min-w-0 ${isCollapsed ? 'justify-center' : ''}`}>
                <span className={`flex-shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'} transition-colors`}>
                    {renderIcon(item.icon, depth > 0 ? 'w-3.5 h-3.5' : 'w-4 h-4')}
                </span>
                {!isCollapsed && <span className="truncate">{displayName}</span>}
            </div>
            {hasChildren && !isCollapsed && (
                <span className="text-slate-600 flex-shrink-0">
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </span>
            )}
        </>
    );

    return (
        <div>
            {hasChildren || !hasUrl ? (
                <button onClick={handleToggle} className={`${base} ${style} w-full`}>{inner}</button>
            ) : (
                <Link href={item.url || '#'} className={`${base} ${style}`}>{inner}</Link>
            )}
            {hasChildren && isOpen && !isCollapsed && (
                <div className="mt-0.5 relative">
                    <div className="absolute left-[22px] top-1 bottom-1 w-px bg-slate-800" />
                    <div className="space-y-0.5 mt-0.5">
                        {(item.children ?? []).map(child => (
                            <MenuItemComponent key={child.id} item={child} depth={depth + 1} isCollapsed={isCollapsed} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

/* ── 사이드바 ── */
export function Sidebar() {
    const adminInfo = useAuthStore((state) => state.adminInfo);
    const accessToken = useAuthStore((state) => state.accessToken);
    const { navMenus: rawMenus, fetchNavMenus, isSidebarCollapsed, toggleSidebar } = useMenuStore();
    const { t } = useI18n();

    /* SYSTEM_ADMIN이 아니면 isSystem=true 메뉴 제외 */
    const isSystemAdmin = adminInfo?.role === 'SYSTEM_ADMIN';
    const menus = isSystemAdmin ? rawMenus : rawMenus.filter(cat => !cat.isSystem);

    /* 카테고리별 접기 상태 (id Set) */
    const [collapsedCategories, setCollapsedCategories] = useState<Set<number>>(new Set());

    const toggleCategory = (id: number) => {
        setCollapsedCategories(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    /* 메뉴 조회 (로그인 후) */
    useEffect(() => {
        if (!accessToken) return;
        fetchNavMenus();
    }, [accessToken, fetchNavMenus]);

    return (
        <aside className={`h-screen bg-[#161929] text-slate-400 flex flex-col fixed left-0 top-0 border-r border-white/[0.04] z-50 transition-all duration-300 ${isSidebarCollapsed ? 'w-[70px]' : 'w-[220px]'}`}>
            {/* 로고 */}
            <div
                className="h-14 flex items-center gap-2.5 px-4 border-b border-white/[0.06] cursor-pointer hover:bg-white/[0.02]"
                onClick={toggleSidebar}
            >
                {/* 기존 로고 — 원복 시 주석 해제
                <div className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-emerald-400 to-blue-500 rounded-sm flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <Layers className="w-4 h-4 text-white" />
                </div>
                {!isSidebarCollapsed && <span className="text-white font-extrabold text-[14px] tracking-tight truncate">WORKSPACE</span>}
                */}
                {!isSidebarCollapsed && <img src="/bo/ls-electric-logo.png" alt="LS ELECTRIC" className="h-5 w-auto" />}
            </div>

            {/* 네비게이션 — DB 메뉴 기반 */}
            <nav className="flex-1 py-4 px-2.5 overflow-y-auto space-y-4">
                {menus.filter(cat => cat.visible !== false).map(category => (
                    /* 1depth 메뉴는 모두 카테고리 헤더 + 하위 메뉴 형태로 렌더링 */
                    <div key={category.id}>
                        {!isSidebarCollapsed && (
                            <button
                                onClick={() => toggleCategory(category.id)}
                                className="w-full flex items-center justify-between mb-2 px-3 group"
                            >
                                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest group-hover:text-slate-400 transition-colors">
                                    {category.nameMsgKey ? t(category.nameMsgKey) : category.name}
                                </span>
                                {collapsedCategories.has(category.id)
                                    ? <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-slate-500 transition-colors" />
                                    : <ChevronDown className="w-3 h-3 text-slate-600 group-hover:text-slate-500 transition-colors" />
                                }
                            </button>
                        )}
                        {!collapsedCategories.has(category.id) && (
                            <div className="space-y-0.5">
                                {(category.children ?? []).map(item => (
                                    <MenuItemComponent key={item.id} item={item} isCollapsed={isSidebarCollapsed} />
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </nav>

            {/* 유저 프로필 */}
            <div className={`p-3 border-t border-white/[0.04] ${isSidebarCollapsed ? 'flex justify-center' : ''}`}>
                <div className={`flex items-center gap-2.5 ${isSidebarCollapsed ? 'px-0 justify-center' : 'px-2'} py-2 rounded-lg hover:bg-white/[0.04] transition-all cursor-pointer`}>
                    <div className="w-7 h-7 rounded-lg bg-[#4361ee] flex items-center justify-center text-white font-bold text-[10px] uppercase flex-shrink-0">
                        {adminInfo?.name?.substring(0, 2) || 'AD'}
                    </div>
                    {!isSidebarCollapsed && (
                        <>
                            <div className="flex-1 min-w-0">
                                <p className="text-[12px] font-semibold text-slate-200 truncate">{adminInfo?.name || 'Administrator'}</p>
                                <p className="text-[10px] text-slate-500 truncate">{adminInfo?.email || 'admin@bo.com'}</p>
                            </div>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}
