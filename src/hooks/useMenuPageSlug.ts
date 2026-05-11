'use client';

/**
 * 페이지 데이터 slug 반환 훅
 *
 * 사용법:
 *   const pageSlug = useMenuPageSlug('fallback-slug');
 *
 * @param defaultSlug - 페이지 식별 슬러그 (URL 파라미터 등에서 전달)
 */
export function useMenuPageSlug(defaultSlug: string): string {
    return defaultSlug;
}
