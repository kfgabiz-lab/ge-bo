'use client';

/**
 * 현재 페이지 제목 + 이전 경로 전역 스토어
 *
 * - pageTitle  : 빌더에서 설정한 페이지 제목 (메뉴명 없을 때 Header/PageLayout 폴백)
 * - previousPath: 직전 pathname (메뉴에 없는 페이지의 부모 크럼 탐색에 사용)
 *
 * 사용법:
 *   // 위젯 렌더러: 템플릿 로딩 후
 *   const { setPageTitle } = usePageTitleStore();
 *   setPageTitle(config.pageTitle || '');
 *
 *   // RouteTracker: 경로 변경 시
 *   const { setPreviousPath } = usePageTitleStore();
 *   setPreviousPath(prevPathname);
 *
 *   // Header: 부모 크럼 탐색
 *   const previousPath = usePageTitleStore(s => s.previousPath);
 */

import { create } from 'zustand';

interface PageTitleStore {
    pageTitle: string;
    setPageTitle: (title: string) => void;
    /** 직전 pathname — 현재 페이지가 메뉴에 없을 때 부모 크럼 탐색용 */
    previousPath: string;
    setPreviousPath: (path: string) => void;
}

export const usePageTitleStore = create<PageTitleStore>((set) => ({
    pageTitle: '',
    setPageTitle: (title) => set({ pageTitle: title }),
    previousPath: '',
    setPreviousPath: (path) => set({ previousPath: path }),
}));
