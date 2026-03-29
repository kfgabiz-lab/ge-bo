'use client';

/**
 * 공통코드 관리 페이지
 * - 왼쪽: 코드 그룹 목록
 * - 오른쪽: 그룹 상세 편집 + 코드 상세 테이블
 */

import { CodeGroupList } from '@/components/codes/CodeGroupList';
import { CodeDetail } from '@/components/codes/CodeDetail';

export default function CodesPage() {
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">공통코드 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">시스템에서 사용하는 공통코드를 관리합니다.</p>
                </div>
            </div>

            {/* 2단 레이아웃 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-0 overflow-hidden">
                <CodeGroupList />
                <CodeDetail />
            </div>
        </div>
    );
}
