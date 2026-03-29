'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

/**
 * 인증 상태 복원 및 보호 컴포넌트
 * - 앱 마운트 시 Refresh Token 쿠키로 Access Token 재발급
 * - 복원 완료 전까지 로딩 표시
 * - 인증 실패 시 로그인 페이지로 리다이렉트
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { isLoggedIn, initFromStorage } = useAuthStore();
    const [isInitializing, setIsInitializing] = useState(true);

    // 로그인 페이지는 인증 불필요
    const isLoginPage = pathname?.startsWith('/admin/login');

    useEffect(() => {
        // 로그인 페이지에서는 초기화 불필요
        if (isLoginPage) {
            setIsInitializing(false);
            return;
        }

        // 이미 로그인 상태면 초기화 스킵
        if (isLoggedIn) {
            setIsInitializing(false);
            return;
        }

        // Refresh Token 쿠키로 Access Token 재발급 시도
        const restore = async () => {
            await initFromStorage();
            setIsInitializing(false);
        };
        restore();
    }, [isLoginPage, isLoggedIn, initFromStorage]);

    // 초기화 완료 후 인증 실패 시 로그인 페이지로 리다이렉트
    useEffect(() => {
        if (!isInitializing && !isLoggedIn && !isLoginPage) {
            router.replace('/admin/login');
        }
    }, [isInitializing, isLoggedIn, isLoginPage, router]);

    // 로그인 페이지는 바로 렌더링
    if (isLoginPage) {
        return <>{children}</>;
    }

    // 초기화 중 로딩 표시
    if (isInitializing) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f4f5f7]">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-gray-500">세션을 확인하고 있습니다...</p>
                </div>
            </div>
        );
    }

    // 인증 실패 시 빈 화면 (리다이렉트 대기)
    if (!isLoggedIn) {
        return null;
    }

    return <>{children}</>;
}
