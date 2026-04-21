'use client';

import { useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';

/**
 * 현재 pathname과 일치하는 메뉴의 slug를 반환하는 훅
 *
 * 사용법:
 *   const pageSlug = useMenuPageSlug('fallback-slug');
 *   // 메뉴에 slug가 설정되어 있으면 그 값, 없으면 fallback-slug 사용
 *
 * @param defaultSlug - 메뉴에 slug가 없을 때 사용할 기본값
 */
export function useMenuPageSlug(defaultSlug: string): string {
    const pathname = usePathname();
    const navMenus = useMenuStore((state) => state.navMenus);

    const menuSlug = useMemo(
        () => findMenuSlug(navMenus, pathname || ''),
        [navMenus, pathname]
    );

    return menuSlug || defaultSlug;
}

/** 메뉴 트리를 재귀 탐색하여 현재 URL과 일치하는 메뉴의 slug 반환 */
function findMenuSlug(menus: MenuItem[], pathname: string): string | null {
    for (const item of menus) {
        if (item.url === pathname && item.slug) return item.slug;
        if (item.children?.length) {
            const found = findMenuSlug(item.children, pathname);
            if (found) return found;
        }
    }
    return null;
}
