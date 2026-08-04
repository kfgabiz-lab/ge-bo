import { create } from "zustand";

export interface Site {
  id: number;
  name: string; // 한국어 사이트명 (BE에서 message_resource ko 값으로 자동 설정)
  nameMsgKey?: string; // message_resource.key
  description: string | null;
  domain: string | null;
  isActive: boolean;
  timezone?: string; // IANA 시간대 (예: Asia/Seoul) — STEP2에서 실제 저장/로드 연동 예정
  locale?: string; // BCP47 로케일 (예: en-US)
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface SiteCreateRequest {
  nameMsgKey: string; // message_resource.key (필수)
  description?: string;
  domain?: string;
  isActive: boolean;
  timezone?: string; // IANA 시간대 (예: Asia/Seoul) — STEP2에서 실제 저장/로드 연동 예정
  locale?: string; // BCP47 로케일 (예: en-US)
}

export interface SiteUpdateRequest {
  nameMsgKey: string; // message_resource.key (필수)
  description?: string;
  domain?: string;
  isActive: boolean;
  timezone?: string; // IANA 시간대 (예: Asia/Seoul) — STEP2에서 실제 저장/로드 연동 예정
  locale?: string; // BCP47 로케일 (예: en-US)
}

interface SiteState {
  sites: Site[];
  activeSiteId: number | null;
  sitesLoaded: boolean;

  setActiveSiteId: (id: number | null) => void;
  loadActiveSiteFromStorage: () => void;
  /** 헤더의 사이트 선택 드롭다운처럼 이미 목록을 받아온 곳에서, 별도 재조회 없이 store에 바로 채워넣을 때 사용 */
  setSites: (sites: Site[]) => void;
}

const STORAGE_KEY = "bo_active_site_id";

export const useSiteStore = create<SiteState>((set) => ({
  sites: [],
  activeSiteId: null,
  sitesLoaded: false,

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

  setSites: (sites) => set({ sites, sitesLoaded: true }),
}));

const WAIT_FOR_SITES_LOADED_TIMEOUT_MS = 5000;

export function waitForSitesLoaded(): Promise<void> {
  if (useSiteStore.getState().sitesLoaded) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      unsubscribe();
      clearTimeout(timer);
      resolve();
    };
    const unsubscribe = useSiteStore.subscribe((state) => {
      if (state.sitesLoaded) {
        finish();
      }
    });
    const timer = setTimeout(finish, WAIT_FOR_SITES_LOADED_TIMEOUT_MS);
  });
}
