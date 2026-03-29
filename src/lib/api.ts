import axios, { InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/authStore';

interface RetryableConfig extends InternalAxiosRequestConfig {
    _retry?: boolean;
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

/**
 * Axios 기본 인스턴스
 * - Access Token: Zustand 메모리에서 읽어 자동 첨부 (localStorage 미사용)
 * - withCredentials: Refresh Token httpOnly 쿠키 자동 전송
 * - 401 응답 시 /auth/refresh로 토큰 갱신 후 원래 요청 재시도
 */
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true,
});

// 요청 인터셉터: Zustand 메모리에서 Access Token 읽어 첨부
api.interceptors.request.use(
    (config) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 응답 인터셉터: 401 발생 시 Refresh Token 쿠키로 갱신 후 재시도
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config as RetryableConfig;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const resp = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
                const { accessToken, adminInfo } = resp.data;
                useAuthStore.getState().setAccessToken(accessToken, adminInfo);
                original.headers.Authorization = `Bearer ${accessToken}`;
                return api(original);
            } catch {
                // Refresh 실패 시 로그아웃 처리
                await axios.post(`${BASE_URL}/auth/logout`, {}, { withCredentials: true }).catch(() => {});
                useAuthStore.getState().logout();
                if (typeof window !== 'undefined' && window.location.pathname !== '/admin/login') {
                    window.location.href = '/admin/login';
                }
            }
        }

        return Promise.reject(error);
    }
);

export default api;
