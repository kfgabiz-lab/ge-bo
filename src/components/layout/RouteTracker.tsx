'use client';

/**
 * 경로 변경 추적 컴포넌트
 *
 * pathname이 변경될 때마다 이전 pathname을 usePageTitleStore에 저장한다.
 * AdminLayout에 마운트하여 전체 어드민 영역에서 동작한다.
 *
 * 활용:
 *   Header에서 현재 URL이 메뉴에 없을 때 previousPath로 부모 메뉴 탐색
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { usePageTitleStore } from '@/store/usePageTitleStore';

export function RouteTracker() {
    const pathname = usePathname();
    const prevRef = useRef<string>('');
    const setPreviousPath = usePageTitleStore(s => s.setPreviousPath);

    useEffect(() => {
        /* pathname이 실제로 변경된 경우에만 이전 경로 저장 */
        if (prevRef.current && prevRef.current !== pathname) {
            setPreviousPath(prevRef.current);
        }
        prevRef.current = pathname || '';
    }, [pathname, setPreviousPath]);

    /* UI 없이 추적만 수행 */
    return null;
}
