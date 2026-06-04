import { create } from 'zustand';
import api from '@/lib/api';

interface MessageEntry {
    ko: string;
    en: string | null;
}

interface I18nState {
    messages: Record<string, MessageEntry>;
    isLoaded: boolean;
    fetchMessages: () => Promise<void>;
}

/**
 * 다국어 메시지 스토어
 * - 앱 초기화 시 GET /message-resources 전체 호출 후 캐시
 * - isLoaded로 중복 호출 방지
 */
export const useI18nStore = create<I18nState>((set, get) => ({
    messages: {},
    isLoaded: false,

    fetchMessages: async () => {
        if (get().isLoaded) return;
        try {
            const res = await api.get('/message-resources', {
                params: { active: 'true', size: 9999, page: 0 },
            });
            const map: Record<string, MessageEntry> = {};
            for (const item of res.data.content) {
                map[item.key] = { ko: item.ko, en: item.en ?? null };
            }
            set({ messages: map, isLoaded: true });
        } catch {
            /* 실패 시에도 isLoaded=true 처리 — 무한 재시도 방지 */
            set({ isLoaded: true });
        }
    },
}));
