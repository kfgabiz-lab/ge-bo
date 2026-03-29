'use client';

/**
 * JPA 엔티티 조회 페이지
 * - 왼쪽: 전체 엔티티 목록 (검색 포함)
 * - 오른쪽: 선택한 엔티티의 필드 상세 정보
 */

import { EntityList } from '@/components/database/EntityList';
import { EntityFields } from '@/components/database/EntityFields';

export default function DatabaseEntitiesPage() {
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">엔티티 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">JPA 엔티티 목록 및 필드 구조를 확인합니다.</p>
                </div>
            </div>

            {/* 2단 레이아웃 — 테이블 관리 페이지와 동일 패턴 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-0 overflow-hidden">
                {/* 왼쪽: 엔티티 목록 */}
                <EntityList />

                {/* 오른쪽: 필드 상세 */}
                <EntityFields />
            </div>
        </div>
    );
}
