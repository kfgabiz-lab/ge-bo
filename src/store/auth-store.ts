import axios from "axios";
import { create } from "zustand";

interface AdminInfo {
  id: number;
  name: string;
  email: string;
  role: string;
  roleDisplayName: string;
  isSystem: boolean;
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

const BASE_URL = "/api/v1";

export const useAuthStore = create<AuthState>((set) => ({
  isLoggedIn: false,
  adminInfo: null,
  accessToken: null,

  login: (accessToken, adminInfo) => {
    set({ isLoggedIn: true, adminInfo, accessToken });
    if (typeof window !== "undefined") {
      document.cookie = `bo_is_system=${adminInfo.isSystem}; path=/; SameSite=Strict`;
    }
  },

  logout: () => {
    set({ isLoggedIn: false, adminInfo: null, accessToken: null });
    if (typeof window !== "undefined") {
      document.cookie = "bo_is_system=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
  },

  setAccessToken: (accessToken, adminInfo) => {
    set({ isLoggedIn: true, adminInfo, accessToken });
    if (typeof window !== "undefined") {
      document.cookie = `bo_is_system=${adminInfo.isSystem}; path=/; SameSite=Strict`;
    }
  },

  initFromStorage: async () => {
    try {
      const resp = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
      const { accessToken, adminInfo } = resp.data;
      set({ isLoggedIn: true, adminInfo, accessToken });
      if (typeof window !== "undefined") {
        document.cookie = `bo_is_system=${adminInfo.isSystem}; path=/; SameSite=Strict`;
      }
    } catch {}
  },
}));
