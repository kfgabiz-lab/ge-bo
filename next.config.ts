import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
          // { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },  // IIS에 설정
          // { key: "Cross-Origin-Resource-Policy", value: "same-origin" }, // IIS에 설정
          // { key: "Cross-Origin-Opener-Policy", value: "same-origin" }, // IIS에 설정
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // { key: "Content-Security-Policy", value: "frame-ancestors 'self'" }, // IIS에 설정
          // COEP(Cross-Origin-Embedder-Policy) 미적용:
          // require-corp, credentialless 둘 다 구글 루커 스튜디오/유튜브·Vimeo/구글 지도 임베드가 깨짐.
          // 2026-07-27, 2026-08-14 재검증 완료(둘 다 실패). 보안점검 예외 등록 필요.
          // { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
        ],
      },
    ];
  },
};

export default nextConfig;
