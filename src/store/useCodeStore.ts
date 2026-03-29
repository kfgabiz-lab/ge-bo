'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import api from '@/lib/api';

/* ── 타입 정의 ── */
export interface CodeDetail {
    id: number;
    code: string;
    name: string;
    sortOrder: number;
    active: boolean;
    description?: string;
    extra1?: string;
    extra2?: string;
    extra3?: string;
    extra4?: string;
    extra5?: string;
}

export interface CodeGroup {
    id: number;
    groupCode: string;
    groupName: string;
    description?: string;
    active: boolean;
    details: CodeDetail[];
}

interface CodeStore {
    /* 상태 */
    groups: CodeGroup[];
    selectedGroup: CodeGroup | null;
    isLoading: boolean;
    isDirty: boolean;
    isCreating: boolean;

    /* 액션 */
    fetchGroups: () => Promise<void>;
    selectGroup: (group: CodeGroup | null) => void;
    setIsDirty: (dirty: boolean) => void;
    startCreate: () => void;
    cancelCreate: () => void;
    createGroup: (data: { groupCode: string; groupName: string; description?: string }) => Promise<void>;
    updateGroup: (id: number, data: Partial<CodeGroup>) => Promise<void>;
    deleteGroup: (id: number) => Promise<void>;
    addDetail: (groupId: number, detail: Omit<CodeDetail, 'id'>) => Promise<void>;
    updateDetail: (groupId: number, detailId: number, data: Partial<CodeDetail>) => Promise<void>;
    deleteDetail: (groupId: number, detailId: number) => Promise<void>;
}

/* ── API 경로 ── */
const API_PATH = '/codes';

/* ── Store ── */
export const useCodeStore = create<CodeStore>((set, get) => ({
    groups: [],
    selectedGroup: null,
    isLoading: false,
    isDirty: false,
    isCreating: false,

    fetchGroups: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get(API_PATH);
            set({ groups: res.data });
        } catch {
            toast.error('코드 그룹을 불러오는 중 오류가 발생했습니다.');
        } finally {
            set({ isLoading: false });
        }
    },

    selectGroup: (group) => {
        if (get().isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return;
        set({ selectedGroup: group, isDirty: false, isCreating: false });
    },

    setIsDirty: (dirty) => set({ isDirty: dirty }),
    startCreate: () => set({ isCreating: true, selectedGroup: null, isDirty: false }),
    cancelCreate: () => set({ isCreating: false }),

    createGroup: async (data) => {
        try {
            await api.post(API_PATH, data);
            await get().fetchGroups();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '그룹 추가 중 오류가 발생했습니다.');
            throw err;
        }
    },

    updateGroup: async (id, data) => {
        try {
            const res = await api.put(`${API_PATH}/${id}`, data);
            await get().fetchGroups();
            const sel = get().selectedGroup;
            if (sel?.id === id) set({ selectedGroup: res.data });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '그룹 수정 중 오류가 발생했습니다.');
            throw err;
        }
    },

    deleteGroup: async (id) => {
        try {
            await api.delete(`${API_PATH}/${id}`);
            set({ selectedGroup: null });
            await get().fetchGroups();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '그룹 삭제 중 오류가 발생했습니다.');
            throw err;
        }
    },

    addDetail: async (groupId, detail) => {
        try {
            await api.post(`${API_PATH}/${groupId}/details`, detail);
            await get().fetchGroups();
            /* 선택된 그룹 갱신 */
            const updated = get().groups.find(g => g.id === groupId);
            if (updated) set({ selectedGroup: updated });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '코드 추가 중 오류가 발생했습니다.');
            throw err;
        }
    },

    updateDetail: async (groupId, detailId, data) => {
        try {
            await api.put(`${API_PATH}/${groupId}/details/${detailId}`, data);
            await get().fetchGroups();
            const updated = get().groups.find(g => g.id === groupId);
            if (updated) set({ selectedGroup: updated });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '코드 수정 중 오류가 발생했습니다.');
            throw err;
        }
    },

    deleteDetail: async (groupId, detailId) => {
        try {
            await api.delete(`${API_PATH}/${groupId}/details/${detailId}`);
            await get().fetchGroups();
            const updated = get().groups.find(g => g.id === groupId);
            if (updated) set({ selectedGroup: updated });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '코드 삭제 중 오류가 발생했습니다.');
            throw err;
        }
    },
}));
