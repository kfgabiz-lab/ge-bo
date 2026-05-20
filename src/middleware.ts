import { NextRequest, NextResponse } from 'next/server';

/** SYSTEM_ADMIN 전용 경로 목록 */
const SYSTEM_ADMIN_PATHS = [
    '/admin/system',
    '/admin/database',
    '/admin/settings/slug-registry',
    '/admin/templates/make',
    '/admin/templates/layer',
];

/**
 * Next.js 미들웨어 — 라우트 레벨 접근 제어 (1차 보호)
 * bo_is_system 쿠키를 읽어 시스템관리자 전용 경로 보호 (role.is_system 기반)
 * 클라이언트 가드(SystemAdminGuard)가 2차 보호 담당
 */
export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const isProtected = SYSTEM_ADMIN_PATHS.some(path => pathname.startsWith(path));
    if (!isProtected) return NextResponse.next();

    const isSystem = request.cookies.get('bo_is_system')?.value;
    if (isSystem !== 'true') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    return NextResponse.next();
}

export const config = {
    /* /admin/ 하위 전체에 적용, _next 정적 파일 제외 */
    matcher: ['/admin/:path*'],
};
