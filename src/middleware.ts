import { NextRequest, NextResponse } from "next/server";

/** SYSTEM_ADMIN 전용 경로 목록 */
const SYSTEM_ADMIN_PATHS = [
  "/admin/system",
  "/admin/database",
  "/admin/settings/slug-registry",
  "/admin/settings/users",
  "/admin/settings/roles",
  "/admin/templates/make",
  "/admin/templates/layer",
];

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
  response.headers.set("Content-Security-Policy", "frame-ancestors 'self'");

  /*
   * Google Maps, YouTube, 구글 루커 스튜디오 연동을 차단하므로 적용하지 않습니다.
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
 * 1) AppScan XSS 테스트 대응: 루트 경로의 위험 문자 패턴/비정상 메소드 차단
 * 2) bo_is_system 쿠키를 읽어 시스템관리자 전용 경로 보호 (role.is_system 기반)
 * 클라이언트 가드(SystemAdminGuard)가 2차 보호 담당
 */
export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  if (pathname === "/") {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return badRequest();
    }

    for (const [key, value] of searchParams.entries()) {
      if (suspiciousPattern.test(key) || suspiciousPattern.test(value)) {
        return badRequest();
      }
    }
  }

  const isProtected = SYSTEM_ADMIN_PATHS.some((path) => pathname.startsWith(path));
  if (!isProtected) return NextResponse.next();

  const isSystem = request.cookies.get("bo_is_system")?.value;
  if (isSystem !== "true") {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin/dashboard";
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};
