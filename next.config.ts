import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* 빌드 시 고정 환경변수 — .env 파일 없이 clone 후 바로 실행 가능 */
  env: {
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI",
  },
  basePath: "/bo",
  reactStrictMode: false,
  /* AppScan 보안 스캔 지적: X-Powered-By 헤더로 프레임워크 노출 방지 */
  poweredByHeader: false,
  /* Turbopack 기본 사용 — 별도 webpack 설정 불필요 */
  turbopack: {},
  /* 브라우저 → Next.js 서버 → API 서버(8080) 프록시 */
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:8080/api/v1/:path*",
        basePath: false,
      },
    ];
  },
  /* AppScan 보안 스캔(NAHP_BO_20260715) 지적 사항 대응 */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          // 유튜브, 구글맵 사용으로 보안점검 예외 등록 필요.
          // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
