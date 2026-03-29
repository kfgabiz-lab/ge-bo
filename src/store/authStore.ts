import axios from 'axios';
import { create } from 'zustand';

interface AdminInfo {
    id: number;
    name: string;
    email: string;
    role: 'SUPER_ADMIN' | 'EDITOR';
}

interface AuthState {
    isLoggedIn: boolean;
    adminInfo: AdminInfo | null;
    accessToken: string | null;
    login: (accessToken: string, adminInfo: AdminInfo) => void;
    logout: () => void;
    setAccessToken: (accessToken: string, adminInfo: AdminInfo) => void;
    initFromStorage: () => Promise<void>;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

/**
 * 로그인 세션 전역 상태 - Zustand
 * Access Token은 메모리에만 저장 (XSS 방어)
 * Refresh Token은 httpOnly 쿠키로 서버에서 관리
 */
export const useAuthStore = create<AuthState>((set) => ({
    isLoggedIn: false,
    adminInfo: null,
    accessToken: null,

    /** 로그인 성공 시 호출 - 토큰과 관리자 정보를 메모리에만 저장 */
    login: (accessToken, adminInfo) => {
        set({ isLoggedIn: true, adminInfo, accessToken });
    },

    /** 로그아웃 - 메모리 상태 초기화 (쿠키 삭제는 api.ts에서 처리) */
    logout: () => {
        set({ isLoggedIn: false, adminInfo: null, accessToken: null });
    },

    /** 토큰 갱신 후 상태 업데이트 */
    setAccessToken: (accessToken, adminInfo) => {
        set({ isLoggedIn: true, adminInfo, accessToken });
    },

    /**
     * 페이지 새로고침 후 세션 복원
     * httpOnly 쿠키의 Refresh Token으로 새 Access Token 발급
     */
    initFromStorage: async () => {
        try {
            const resp = await axios.post(
                `${BASE_URL}/auth/refresh`,
                {},
                { withCredentials: true }
            );
            const { accessToken, adminInfo } = resp.data;
            set({ isLoggedIn: true, adminInfo, accessToken });
        } catch {
            set({ isLoggedIn: false, adminInfo: null, accessToken: null });
        }
    },
}));
