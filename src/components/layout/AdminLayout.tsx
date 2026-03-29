'use client';

import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/components/auth/AuthProvider';

export function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isLoginPage = pathname?.startsWith('/admin/login');

    if (isLoginPage) {
        return (
            <main className="min-h-screen bg-[#0A1F4E]">
                {children}
            </main>
        );
    }

    return (
        <AuthProvider>
            <div className="flex min-h-screen">
                <Sidebar />
                <div className="flex-1 ml-[220px] flex flex-col bg-gray-50 min-w-0 overflow-hidden">
                    <Header />
                    <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}
