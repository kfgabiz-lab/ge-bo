/* 시간대(timezone) select 옵션 — "라벨:값(IANA timezone)" 형식, 서비스 대상 국가 위주로 큐레이션 */
/* 주의: parseOpt()가 첫 번째 콜론(:) 기준으로 라벨/값을 분리하므로, 라벨에는 콜론을 쓰지 않는다 (예: "09:00" 대신 "0900") */
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

/** IANA timezone 값(예: America/New_York) → TIMEZONE_OPTIONS의 라벨(예: "UTC-0500 New York") 역매핑, 매핑 없으면 원본 값 그대로 폴백 */
export function getTimezoneLabel(value: string): string {
  const match = TIMEZONE_OPTIONS.find((opt) => opt.slice(opt.indexOf(":") + 1) === value);
  return match ? match.slice(0, match.indexOf(":")) : value;
}
