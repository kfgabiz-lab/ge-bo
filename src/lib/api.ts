import axios, { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/auth-store";
import { useSiteStore } from "@/store/use-site-store";
import { useNavigationStore } from "@/store/use-navigation-store";

interface RetryableConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const BASE_URL = "/api/v1";

let refreshPromise: Promise<string> | null = null;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    const siteId = useSiteStore.getState().activeSiteId;
    if (siteId) {
      config.headers["X-Site-Id"] = String(siteId);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as RetryableConfig;

    const ACCESS_DENIED_CODES = ["SITE_ACCESS_DENIED", "MENU_ACCESS_DENIED", "FORBIDDEN"];
    if (error.response?.status === 403 && ACCESS_DENIED_CODES.includes(error.response?.data?.error)) {
      if (typeof window !== "undefined" && window.location.pathname !== "/bo/admin/no-permission") {
        const navigate = useNavigationStore.getState().navigate;
        if (navigate) {
          navigate("/admin/no-permission");
        } else {
          window.location.href = "/bo/admin/no-permission";
        }
      }
      return Promise.reject(error);
    }

    if (
      error.response?.status === 401 &&
      !original._retry &&
      original.url !== "/auth/refresh" &&
      original.url !== "/auth/logout"
    ) {
      original._retry = true;
      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh", {}, { withCredentials: true })
            .then((resp) => {
              const { accessToken, adminInfo } = resp.data;
              useAuthStore.getState().setAccessToken(accessToken, adminInfo);
              return accessToken as string;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const accessToken = await refreshPromise;
        original.headers.Authorization = `Bearer ${accessToken}`;
        return api(original);
      } catch {
        refreshPromise = null;
        await api.post("/auth/logout", {}, { withCredentials: true }).catch(() => {});
        useAuthStore.getState().logout();
        if (typeof window !== "undefined" && window.location.pathname !== "/bo/admin/login") {
          window.location.href = "/bo/admin/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export function getApiErrorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
  return message || fallback;
}

export default api;
