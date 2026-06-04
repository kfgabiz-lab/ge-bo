'use client';

import React, { useEffect } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { RouteTracker } from './route-tracker';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth/auth-provider';
import { useMenuStore } from '@/store/use-menu-store';
import { useI18nStore } from '@/store/use-i18n-store';

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname?.startsWith('/admin/login');
    const fetchMessages = useI18nStore(s => s.fetchMessages);
    const isLoaded      = useI18nStore(s => s.isLoaded);

    /* 앱 초기화 시 다국어 메시지 로드 (로그인 전후 모두 실행) */
    useEffect(() => {
        fetchMessages();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const { isSidebarCollapsed } = useMenuStore();

    /* 메시지 로드 완료 전 key값 노출 방지 — 전체 화면 스피너 */
    if (!isLoaded) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-white">
                <span className="w-7 h-7 border-2 border-[#4361ee] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (isLoginPage) {
        return (
            <main className="min-h-screen bg-[#0A1F4E]">
                {children}
            </main>
        );
    }

    return (
        <AuthProvider>
            <RouteTracker />
            <div className="flex min-h-screen">
                <Sidebar />
                <div className={`flex-1 flex flex-col bg-gray-50 min-w-0 overflow-hidden transition-all duration-300 ${isSidebarCollapsed ? 'ml-[70px]' : 'ml-[220px]'}`}>
                    <Header />
                    <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
