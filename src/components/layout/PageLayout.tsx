'use client';

/**
 * PageLayout — 일반 페이지 레이아웃 컴포넌트
 * - 순수 레이아웃 래퍼: 비즈니스 로직 없음
 * - QUICK_DETAIL / QUICK_LIST / LIST 페이지 공통 사용
 * @example
 * <PageLayout title="게시판 목록">
 *   <SearchWidget />
 *   <TableWidget />
 * </PageLayout>
 */

interface PageLayoutProps {
    title?: string;
    children: React.ReactNode;
}

export default function PageLayout({ title, children }: PageLayoutProps) {
    return (
        <div className="space-y-5">
            {title && (
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                </div>
            )}
            {children}
        </div>
    );
}
