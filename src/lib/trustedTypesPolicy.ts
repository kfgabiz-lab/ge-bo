/**
 * CSP `require-trusted-types-for 'script'` 강제를 대비한 "default" Trusted Types 정책.
 *
 * WHY: React의 dangerouslySetInnerHTML, Next.js/Turbopack의 청크 동적 로딩(<script>.src 할당),
 * @googlemaps/js-api-loader의 동적 스크립트 삽입은 모두 Trusted Types가 감시하는 DOM sink다.
 * 이 라이브러리들은 Trusted Types를 직접 지원하지 않으므로, 브라우저가 기존 문자열 대입을
 * 그대로 통과시키도록 하는 "default" 정책을 최대한 먼저 등록해 둔다.
 *
 * 실제 HTML 살균은 이미 각 호출부(예: tiptap-editor.tsx의 sanitizeHtml())에서 끝난 뒤이므로
 * createHTML/createScript는 그대로 통과시키고, createScriptURL만 알려진 출처로 제한해
 * 정책이 없을 때보다 더 엄격하게 동작하도록 한다.
 *
 * 주의: 이 파일은 정책을 "등록"만 할 뿐이다. CSP에 require-trusted-types-for 'script'가
 * 실제로 없으면 브라우저는 이 정책 없이도 아무 제약 없이 동작한다 — 즉 지금 당장은
 * 동작에 아무 영향이 없는 안전한 선행 작업이다. 실제 강제 여부는 IIS가 설정하는 CSP에
 * 달려 있고, Report-Only로 먼저 검증한 뒤 강제로 전환해야 한다(src/app/layout.tsx 주석 참고).
 *
 * 2026-09-01: 이 파일이 한 번 유실됐다가 재작성됨 — 반드시 커밋해서 다시 사라지지 않게 할 것.
 *
 * 2026-09-01 중요 — 로딩 방식 주의: 처음엔 next/script의 strategy="beforeInteractive"로
 * 로드했으나, 실제로 헤더를 강제하고 헤드리스 브라우저로 검증해보니 그 방식은 이 정책을
 * self.__next_s 큐에 넣어두기만 하고 Next.js 런타임 청크(async)가 나중에 처리하는 구조라
 * 그 청크 자신의 부트스트랩(동적 <script src> 할당, innerHTML 사용)이 먼저 실행되어
 * TrustedTypes 위반으로 사이트 전체가 깨졌음(콘솔에 정책 등록 로그가 아예 안 찍혔음).
 * 반드시 src/app/layout.tsx에서 next/script가 아닌 순수 <script dangerouslySetInnerHTML>을
 * <head> 안에 직접 렌더링해야 한다 — 이러면 HTML 파싱 중 동기적으로 즉시 실행되어
 * Next의 async 청크보다 먼저 정책이 등록됨(Playwright로 실제 재현·검증 완료).
 */
export const TRUSTED_TYPES_DEFAULT_POLICY_SCRIPT = `
(function () {
  if (typeof window === "undefined") return;
  var tt = window.trustedTypes;
  if (!tt || typeof tt.createPolicy !== "function") return;
  if (typeof tt.defaultPolicy !== "undefined" && tt.defaultPolicy) return;
  var ALLOWED_SCRIPT_HOSTS = [
    window.location.host,
    "maps.googleapis.com",
    "www.googletagmanager.com",
    "www.youtube.com",
    "www.google.com",
    "www.gstatic.com"
  ];
  try {
    tt.createPolicy("default", {
      createHTML: function (s) { return s; },
      createScript: function (s) { return s; },
      createScriptURL: function (s) {
        try {
          var url = new URL(s, window.location.origin);
          if (ALLOWED_SCRIPT_HOSTS.indexOf(url.host) !== -1) return s;
        } catch (e) {}
        throw new Error("Blocked script URL by Trusted Types default policy: " + s);
      }
    });
  } catch (e) {
    /* Fast Refresh 등으로 정책이 이미 등록된 경우 무시 */
  }
})();
`;
