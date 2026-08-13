import { create } from "zustand";
import api from "@/lib/api";

type ServerClockStatus = "idle" | "syncing" | "synced" | "failed";

interface ServerClockState {
  anchorServerMs: number | null;
  anchorPerfMs: number | null;
  status: ServerClockStatus;
}

interface ServerTimeResponse {
  epochMillis: number;
  iso: string;
}

export const useServerClockStore = create<ServerClockState>(() => ({
  anchorServerMs: null,
  anchorPerfMs: null,
  status: "idle",
}));

export function serverNowMs(): number {
  const { anchorServerMs, anchorPerfMs, status } = useServerClockStore.getState();
  if (status === "synced" && anchorServerMs !== null && anchorPerfMs !== null) {
    return anchorServerMs + (performance.now() - anchorPerfMs);
  }
  return Date.now();
}

async function attemptSync(): Promise<boolean> {
  useServerClockStore.setState({ status: "syncing" });
  const t0 = performance.now();
  try {
    const res = await api.get<ServerTimeResponse>("/public/server-time", { timeout: 5000 });
    const t1 = performance.now();
    useServerClockStore.setState({
      anchorServerMs: res.data.epochMillis + (t1 - t0) / 2,
      anchorPerfMs: t1,
      status: "synced",
    });
    return true;
  } catch {
    useServerClockStore.setState({ status: "failed" });
    return false;
  }
}

const RETRY_DELAYS_MS = [3000, 10000];

export async function syncServerClock(): Promise<void> {
  const ok = await attemptSync();
  if (ok) return;
  for (const delay of RETRY_DELAYS_MS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    const retried = await attemptSync();
    if (retried) return;
  }
}

const WAIT_FOR_SERVER_CLOCK_TIMEOUT_MS = 5000;

export function waitForServerClock(): Promise<void> {
  const status = useServerClockStore.getState().status;
  if (status === "synced" || status === "failed") {
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
    const unsubscribe = useServerClockStore.subscribe((state) => {
      if (state.status === "synced" || state.status === "failed") {
        finish();
      }
    });
    const timer = setTimeout(finish, WAIT_FOR_SERVER_CLOCK_TIMEOUT_MS);
  });
}

const AUTO_SYNC_INTERVAL_MS = 30 * 60 * 1000;
const VISIBILITY_SYNC_THROTTLE_MS = 60 * 1000;

export function startServerClockAutoSync(): () => void {
  let lastSyncAt = performance.now();

  const handleVisibilityChange = () => {
    if (document.visibilityState !== "visible") return;
    if (performance.now() - lastSyncAt < VISIBILITY_SYNC_THROTTLE_MS) return;
    lastSyncAt = performance.now();
    syncServerClock();
  };

  const intervalId = setInterval(() => {
    if (document.visibilityState === "hidden") return;
    lastSyncAt = performance.now();
    syncServerClock();
  }, AUTO_SYNC_INTERVAL_MS);

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
