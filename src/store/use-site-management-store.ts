import { create } from "zustand";
import { toast } from "sonner";
import api, { getApiErrorMessage } from "@/lib/api";
import type { Site, SiteCreateRequest, SiteUpdateRequest } from "./use-site-store";

interface SiteManagementState {
  sites: Site[];
  isLoading: boolean;

  fetchSites: () => Promise<void>;
  createSite: (data: SiteCreateRequest) => Promise<Site>;
  updateSite: (id: number, data: SiteUpdateRequest) => Promise<Site>;
}

/**
 * 홈페이지 관리(사이트 관리 목록/등록/수정/삭제) 전용 스토어
 * - useSiteStore(sites/activeSiteId)는 헤더 사이트 선택기·타임존 조회용 "내 계정에 연동된 사이트"만 다룬다
 * - 여기서는 관리 화면에서 필요한 "전체 사이트" 목록을 별도로 관리해 두 화면이 같은 배열을 덮어쓰지 않게 한다
 */
export const useSiteManagementStore = create<SiteManagementState>((set) => ({
  sites: [],
  isLoading: false,

  fetchSites: async () => {
    set({ isLoading: true });
    try {
      const res = await api.get<Site[]>("/sites");
      set({ sites: res.data, isLoading: false });
    } catch {
      set({ isLoading: false });
      toast.error("홈페이지 목록을 불러오지 못했습니다.");
    }
  },

  createSite: async (data) => {
    try {
      const res = await api.post<Site>("/sites", data);
      set((state) => ({ sites: [...state.sites, res.data] }));
      return res.data;
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "홈페이지 등록 중 오류가 발생했습니다."));
      throw e;
    }
  },

  updateSite: async (id, data) => {
    try {
      const res = await api.patch<Site>(`/sites/${id}`, data);
      set((state) => ({ sites: state.sites.map((s) => (s.id === id ? res.data : s)) }));
      return res.data;
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "홈페이지 수정 중 오류가 발생했습니다."));
      throw e;
    }
  },
}));
