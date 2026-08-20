import { NextRequest, NextResponse } from "next/server";

/*
 * AppScan에서 주로 사용하는 단순 XSS 테스트 패턴을 차단합니다.
 *
 * 주의:
 * 이것은 XSS의 보조 방어 수단입니다.
 * 실제 출력값에 대한 HTML escaping 및 안전한 React 렌더링은 별도로 필요합니다.
 */
const suspiciousPattern = /[<>"'`;]|javascript:|alert\s*\(|onerror\s*=|onload\s*=/i;

/*
 * 미들웨어가 직접 생성하는 오류 응답에는 next.config.ts의 headers가
 * 기대한 방식으로 적용되지 않을 가능성에 대비해 동일한 헤더를 직접 설정합니다.
 */
function applySecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Content-Security-Policy", "frame-ancestors 'self'; object-src 'none'; base-uri 'self'");

  /*
   * COEP(Cross-Origin-Embedder-Policy) 미적용:
   * require-corp, credentialless 둘 다 구글 루커 스튜디오/유튜브·Vimeo/구글 지도 임베드가 깨짐.
   * 2026-07-27, 2026-08-14 재검증 완료(둘 다 실패). 보안점검 예외 등록 필요.
   *
   * response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
   */

  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  return response;
}

function badRequest(): NextResponse {
  return applySecurityHeaders(
    new NextResponse("Bad Request", {
      status: 400,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    })
  );
}

/**
 * Next.js 미들웨어 — 요청 레벨 1차 방어
 * AppScan XSS 테스트 대응: 위험 문자 패턴/비정상 메소드 차단
 *
 * 존재하지 않는 경로(404)라도 Next.js RSC 하이드레이션 페이로드
 * (self.__next_f.push(...))에 요청 URL이 그대로 반영되므로
 * (NAHP_BO_20260727 보고서: /moderation.php, /nodes/OOB_DAVWindow.html 등),
 * 쿼리스트링 검사는 루트 경로뿐 아니라 모든 경로에 적용한다.
 * 단, 비-GET/HEAD 메소드 차단은 Next.js Server Action(POST) 동작을
 * 막지 않도록 루트 경로로 한정한다.
 */
/*
 * Azure App Service 앞단(플랫폼 프론트엔드)이 실제 접속 IP를 X-Forwarded-For의
 * 마지막 값으로 붙여준다 — 클라이언트가 헤더에 값을 미리 넣어 보내도 앞쪽에 이어붙여질
 * 뿐이므로, 마지막 값만 취하면 위조 불가능한 실제 접속 IP를 얻을 수 있다.
 * 이 값으로 헤더 전체를 덮어써서 /api/v1 rewrite 대상(API 서버)에는 검증된 단일 IP만 전달한다.
 */
function withTrustedForwardedFor(request: NextRequest): Headers {
  const headers = new Headers(request.headers);
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const realIp = forwardedFor
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
      .pop();
    if (realIp) {
      headers.set("x-forwarded-for", realIp);
    }
  }
  return headers;
}

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/" && request.method !== "GET" && request.method !== "HEAD") {
    return badRequest();
  }

  for (const [key, value] of searchParams.entries()) {
    if (suspiciousPattern.test(key) || suspiciousPattern.test(value)) {
      return badRequest();
    }
  }

  return NextResponse.next({ request: { headers: withTrustedForwardedFor(request) } });
}

export const config = {
  matcher: ["/:path*"],
};
