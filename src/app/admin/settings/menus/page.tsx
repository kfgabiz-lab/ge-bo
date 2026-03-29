'use client';

/**
 * 메뉴 관리 페이지
 * - 왼쪽: BO/FO 탭 + 메뉴 트리
 * - 오른쪽: 선택 메뉴 상세 편집 + 역할별 권한
 */

import { MenuTree } from '@/components/menus/MenuTree';
import { MenuDetail } from '@/components/menus/MenuDetail';

export default function MenusPage() {
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">메뉴 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">시스템 메뉴를 관리하고 역할별 접근 권한을 설정합니다.</p>
                </div>
            </div>

            {/* 2단 레이아웃 — 뷰포트 높이에 맞춤 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 min-h-0 overflow-hidden">
                {/* 왼쪽: 메뉴 트리 */}
                <MenuTree />

                {/* 오른쪽: 상세 편집 */}
                <MenuDetail />
            </div>

        </div>
    );
}
