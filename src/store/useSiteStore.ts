import { create } from 'zustand';
import { toast } from 'sonner';
import api from '@/lib/api';

export interface Site {
    id: number;
    name: string;
    description: string | null;
    domain: string | null;
    isActive: boolean;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

export interface SiteCreateRequest {
    name: string;
    description?: string;
    domain?: string;
    isActive: boolean;
}

export interface SiteUpdateRequest {
    name: string;
    description?: string;
    domain?: string;
    isActive: boolean;
}

interface SiteState {
    sites: Site[];
    activeSiteId: number | null;
    isLoading: boolean;

    fetchSites: () => Promise<void>;
    createSite: (data: SiteCreateRequest) => Promise<Site>;
    updateSite: (id: number, data: SiteUpdateRequest) => Promise<Site>;
    deleteSite: (id: number) => Promise<void>;
    setActiveSiteId: (id: number | null) => void;
    loadActiveSiteFromStorage: () => void;
}

const STORAGE_KEY = 'bo_active_site_id';

export const useSiteStore = create<SiteState>((set, get) => ({
    sites: [],
    activeSiteId: null,
    isLoading: false,

    fetchSites: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<Site[]>('/sites');
            set({ sites: res.data, isLoading: false });
        } catch {
            set({ isLoading: false });
            toast.error('홈페이지 목록을 불러오지 못했습니다.');
        }
    },

    createSite: async (data) => {
        try {
            const res = await api.post<Site>('/sites', data);
            set(state => ({ sites: [...state.sites, res.data] }));
            return res.data;
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? '홈페이지 등록 중 오류가 발생했습니다.');
            throw e;
        }
    },

    updateSite: async (id, data) => {
        try {
            const res = await api.patch<Site>(`/sites/${id}`, data);
            set(state => ({ sites: state.sites.map(s => s.id === id ? res.data : s) }));
            return res.data;
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? '홈페이지 수정 중 오류가 발생했습니다.');
            throw e;
        }
    },

    deleteSite: async (id) => {
        try {
            await api.delete(`/sites/${id}`);
            set(state => ({ sites: state.sites.filter(s => s.id !== id) }));
            // 삭제된 항목이 활성 홈페이지였으면 초기화
            if (get().activeSiteId === id) {
                get().setActiveSiteId(null);
            }
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg ?? '홈페이지 삭제 중 오류가 발생했습니다.');
            throw e;
        }
    },

    setActiveSiteId: (id) => {
        set({ activeSiteId: id });
        if (id === null) {
            localStorage.removeItem(STORAGE_KEY);
        } else {
            localStorage.setItem(STORAGE_KEY, String(id));
        }
    },

    loadActiveSiteFromStorage: () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            set({ activeSiteId: Number(stored) });
        }
    },
}));
