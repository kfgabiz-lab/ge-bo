'use client';

/**
 * 공통코드 관리 페이지
 * - 왼쪽: 코드 그룹 목록
 * - 오른쪽: 그룹 상세 편집 + 코드 상세 테이블
 */

import { CodeGroupList } from '@/components/codes/code-group-list';
import { CodeDetail } from '@/components/codes/code-detail';
import PageLayout from '@/components/layout/page-layout';

export default function CodesPage() {
    return (
        <PageLayout mode="live" noGrid>
            <div className="flex flex-col" style={{ height: 'calc(100vh - 170px)' }}>
                {/* 2단 레이아웃 */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-0 overflow-hidden">
                    <CodeGroupList />
                    <CodeDetail />
                </div>
            </div>
        </PageLayout>
    );
}
