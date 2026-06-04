import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    /* 빌드 시 고정 환경변수 — .env 파일 없이 clone 후 바로 실행 가능 */
    env: {
        NEXT_PUBLIC_RECAPTCHA_SITE_KEY: '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
    },
    basePath: '/bo',
    reactStrictMode: false,
    /* Turbopack 기본 사용 — 별도 webpack 설정 불필요 */
    turbopack: {},
    /* 브라우저 → Next.js 서버 → API 서버(8080) 프록시 */
    async rewrites() {
        return [
            {
                source: '/api/v1/:path*',
                destination: 'http://localhost:8080/api/v1/:path*',
                basePath: false,
            },
        ];
    },
};

export default nextConfig;
