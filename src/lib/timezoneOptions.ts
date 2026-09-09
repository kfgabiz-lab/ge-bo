/* 시간대(timezone) select 옵션 — "라벨:값(IANA timezone)" 형식, 서비스 대상 국가 위주로 큐레이션 */
/* 주의: parseOpt()가 첫 번째 콜론(:) 기준으로 라벨/값을 분리하므로, 라벨에는 콜론을 쓰지 않는다 (예: "09:00" 대신 "0900") */
/* 라벨 앞의 "UTC±HHMM"은 표준시(비서머타임) 기준 참고값 — 실제 표기는 formatTzOffset()이 DST 반영해 계산한다 */
export const TIMEZONE_OPTIONS = [
  "UTC+0900 Seoul:Asia/Seoul",
  "UTC+0900 Tokyo:Asia/Tokyo",
  "UTC+0800 Shanghai:Asia/Shanghai",
  "UTC+0800 Hong Kong:Asia/Hong_Kong",
  "UTC+0800 Singapore:Asia/Singapore",
  "UTC+0700 Bangkok:Asia/Bangkok",
  "UTC+0700 Jakarta:Asia/Jakarta",
  "UTC+0700 Ho Chi Minh:Asia/Ho_Chi_Minh",
  "UTC+0530 Mumbai:Asia/Kolkata",
  "UTC+0400 Dubai:Asia/Dubai",
  "UTC+0000 London:Europe/London",
  "UTC+0100 Paris:Europe/Paris",
  "UTC+0100 Berlin:Europe/Berlin",
  "UTC-0500 New York:America/New_York",
  "UTC-0600 Chicago:America/Chicago",
  "UTC-0700 Denver:America/Denver",
  "UTC-0800 Los Angeles:America/Los_Angeles",
  "UTC+1000 Sydney:Australia/Sydney",
  "UTC+1200 Auckland:Pacific/Auckland",
  "UTC+0000 UTC:UTC",
];

/** TIMEZONE_OPTIONS를 { 도시명, IANA tz } 로 파싱 — 라벨 앞의 "UTC±HHMM " 참고값은 제거 */
export function getTimezoneEntries(): { city: string; tz: string }[] {
  return TIMEZONE_OPTIONS.map((opt) => {
    const i = opt.indexOf(":");
    return { city: opt.slice(0, i).replace(/^UTC[+-]\d{4}\s+/, ""), tz: opt.slice(i + 1) };
  });
}

/**
 * IANA timezone → 도시명. 큐레이션 목록에 있으면 그 표기(예: America/Chicago → "Chicago"),
 * 없으면 IANA 마지막 구간을 사람이 읽는 형태로 폴백(예: Asia/Ho_Chi_Minh → "Ho Chi Minh")
 */
export function getTimezoneCity(tz: string): string {
  const hit = getTimezoneEntries().find((e) => e.tz === tz);
  if (hit) return hit.city;
  const seg = tz.split("/").pop() ?? tz;
  return seg.replace(/_/g, " ");
}

/**
 * 주어진 IANA timezone의 특정 시점 UTC 오프셋을 "-5" / "+9" / "0" / "+5.5" 형식 문자열로 반환
 * - Intl의 longOffset("GMT-05:00")을 파싱하므로 서머타임(DST)이 자동 반영된다 (예: 시카고 여름 "-5", 겨울 "-6")
 * - 30분/45분 단위 존은 소수로 표기 (예: 인도 Asia/Kolkata → "+5.5")
 * - 잘못된 timezone 문자열 등 Intl 변환 실패 시 원본 값을 그대로 반환 — 절대 예외를 던지지 않음
 */
export function formatTzOffset(tz: string, atMs: number = Date.now()): string {
  try {
    const raw =
      new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "longOffset" })
        .formatToParts(new Date(atMs))
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    /* raw 예: "GMT-05:00" | "GMT+09:00" | "GMT+00:00" | "GMT+5:30" */
    const m = /([+-])(\d{1,2})(?::?(\d{2}))?/.exec(raw);
    if (!m) return tz;
    const num = parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) / 60 : 0);
    if (num === 0) return "0";
    return (m[1] === "-" ? "-" : "+") + num;
  } catch {
    return tz;
  }
}

/** formatTzOffset에 "UTC" 접두어를 붙인 표기 — "UTC-5" / "UTC+9" / "UTC+5.5" / "UTC"(오프셋 0) */
export function formatTzOffsetLabel(tz: string, atMs: number = Date.now()): string {
  const off = formatTzOffset(tz, atMs);
  return off === "0" ? "UTC" : `UTC${off}`;
}
