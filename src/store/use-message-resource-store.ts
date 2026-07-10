import { create } from 'zustand';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';

/* ── 타입 정의 ── */

export type MessageResourceType = 'WORD' | 'SENTENCE';

export interface MessageResource {
    id: number;
    key: string;
    ko: string;
    en: string | null;
    active: boolean;
    resourceType: MessageResourceType;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

export interface MessageResourcePageResponse {
    content: MessageResource[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    size: number;
}

export interface MessageResourceCreateRequest {
    key: string;
    ko: string;
    en?: string;
    resourceType?: MessageResourceType;
}

export interface MessageResourceUpdateRequest {
    ko: string;
    en?: string;
    active: boolean;
    resourceType?: MessageResourceType;
}

/* 검색 파라미터 */
export interface MessageResourceSearchParams {
    key: string;
    ko: string;
    en: string;
    active: string;       /* '전체' | '사용' | '미사용' */
    resourceType: string; /* '전체' | '단어' | '문장' */
    page: number;
    size: number;
}

/* ── 스토어 상태 타입 ── */

interface MessageResourceState {
    /* 목록 상태 */
    items: MessageResource[];
    totalElements: number;
    totalPages: number;
    currentPage: number;
    isLoading: boolean;

    /* Drawer 상태 */
    isDrawerOpen: boolean;
    selectedItem: MessageResource | null; /* null이면 등록 모드, 있으면 수정 모드 */

    /* 액션 */
    fetchItems: (params: MessageResourceSearchParams) => Promise<void>;
    createItem: (data: MessageResourceCreateRequest) => Promise<void>;
    updateItem: (id: number, data: MessageResourceUpdateRequest) => Promise<void>;
    deleteItem: (id: number) => Promise<void>;
    openDrawer: (item?: MessageResource) => void;
    closeDrawer: () => void;
}

/* ── 스토어 ── */

export const useMessageResourceStore = create<MessageResourceState>((set) => ({
    /* 초기값 */
    items: [],
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    isLoading: false,
    isDrawerOpen: false,
    selectedItem: null,

    /* 목록 조회 */
    fetchItems: async (params) => {
        set({ isLoading: true });
        try {
            const res = await api.get<MessageResourcePageResponse>('/message-resources', {
                params: {
                    key:          params.key,
                    ko:           params.ko,
                    en:           params.en,
                    active:       params.active === '전체' ? '' : params.active,
                    resourceType: params.resourceType === '전체' ? '' : params.resourceType,
                    page:         params.page,
                    size:         params.size,
                },
            });
            set({
                items:         res.data.content,
                totalElements: res.data.totalElements,
                totalPages:    res.data.totalPages,
                currentPage:   res.data.currentPage,
                isLoading:     false,
            });
        } catch {
            set({ isLoading: false });
            toast.error('다국어 목록을 불러오지 못했습니다.');
        }
    },

    /* 등록 */
    createItem: async (data) => {
        try {
            await api.post('/message-resources', data);
            toast.success('항목이 등록되었습니다.');
            set({ isDrawerOpen: false, selectedItem: null });
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, '등록 중 오류가 발생했습니다.'));
            throw e;
        }
    },

    /* 수정 */
    updateItem: async (id, data) => {
        try {
            await api.put(`/message-resources/${id}`, data);
            toast.success('항목이 수정되었습니다.');
            set({ isDrawerOpen: false, selectedItem: null });
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, '수정 중 오류가 발생했습니다.'));
            throw e;
        }
    },

    /* 삭제 */
    deleteItem: async (id) => {
        try {
            await api.delete(`/message-resources/${id}`);
            toast.success('항목이 삭제되었습니다.');
        } catch (e: unknown) {
            toast.error(getApiErrorMessage(e, '삭제 중 오류가 발생했습니다.'));
            throw e;
        }
    },

    /* Drawer 열기 — item 없으면 등록 모드, 있으면 수정 모드 */
    openDrawer: (item?) => {
        set({ isDrawerOpen: true, selectedItem: item ?? null });
    },

    /* Drawer 닫기 */
    closeDrawer: () => {
        set({ isDrawerOpen: false, selectedItem: null });
    },
}));
