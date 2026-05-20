import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    basePath: '/bo',
    /* Turbopack 기본 사용 — 별도 webpack 설정 불필요 */
    turbopack: {},
};

export default nextConfig;
