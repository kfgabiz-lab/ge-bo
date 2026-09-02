import { useSiteStore } from "@/store/use-site-store";
import { serverNowMs } from "@/store/use-server-clock-store";

/** getDateParts가 반환하는 시각의 연/월/일/시/분/초 문자열 조각 */
export interface NowParts {
  YYYY: string;
  MM: string;
  DD: string;
  hh: string;
  mm: string;
  ss: string;
}

/**
 * 현재 활성 사이트(useSiteStore)의 timezone 조회
 * - 아직 사이트 목록이 로드되지 않았거나(activeSiteId 없음), 해당 사이트에 timezone이 비어있으면 undefined 반환
 *   → 호출부(getNowParts)에서 브라우저 로컬 시각으로 안전하게 폴백
 * - 컴포넌트 바깥(순수 함수)에서 zustand 상태를 읽어야 하므로 훅이 아닌 getState()를 사용
 */
function getActiveSiteTimezone(): string | undefined {
  const { activeSiteId, sites } = useSiteStore.getState();
  if (!activeSiteId) return undefined;
  const site = sites.find((s) => s.id === activeSiteId);
  return site?.timezone || undefined;
}

/**
 * 임의의 시각(Date)을 "활성 사이트의 timezone" 기준 연/월/일/시/분/초 문자열로 분해
 * - 활성 사이트 timezone이 없거나(로드 전 등) Intl 변환에 실패하면(잘못된 timezone 문자열 등)
 *   기존 동작과 동일하게 브라우저 로컬 시각(Date의 로컬 getter)으로 폴백 — 절대 예외를 던지지 않음
 * - en-CA 로케일 + formatToParts는 다른 로케일의 자릿수/구분자 표기 차이 없이 항상 4자리 연도·2자리 월일시분초를
 *   안정적으로 뽑아낼 수 있어 문자열 파싱 없이 그대로 조립 가능
 */
export function getDateParts(date: Date): NowParts {
  const zone = getActiveSiteTimezone();
  if (zone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: zone,
        hour12: false,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).formatToParts(date);
      const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
      /* 일부 브라우저는 hour12:false에서 자정을 "24"로 표기 — input[type=time] 등은 00~23 범위만 허용하므로 보정 */
      const hh = get("hour") === "24" ? "00" : get("hour");
      return { YYYY: get("year"), MM: get("month"), DD: get("day"), hh, mm: get("minute"), ss: get("second") };
    } catch {
      /* 잘못된 timezone 문자열 등 — 아래 로컬 폴백으로 진행 */
    }
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    YYYY: String(date.getFullYear()),
    MM: pad(date.getMonth() + 1),
    DD: pad(date.getDate()),
    hh: pad(date.getHours()),
    mm: pad(date.getMinutes()),
    ss: pad(date.getSeconds()),
  };
}

/** 현재 시각을 "활성 사이트의 timezone" 기준 연/월/일/시/분/초 문자열로 분해 (getDateParts 참고) */
export function getNowParts(): NowParts {
  return getDateParts(new Date(serverNowMs()));
}

export function formatServerClockTime(): string {
  const { hh, mm, ss } = getNowParts();
  return `${hh}:${mm}:${ss}`;
}
