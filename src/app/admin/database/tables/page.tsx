'use client';

/**
 * 데이터베이스 테이블 조회 페이지
 * - 왼쪽: 전체 테이블 목록 (검색 포함)
 * - 오른쪽: 선택한 테이블의 컬럼 상세 정보
 */

import { TableList } from '@/components/database/TableList';
import { TableColumns } from '@/components/database/TableColumns';

export default function DatabaseTablesPage() {
    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">테이블 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">데이터베이스 테이블 목록 및 컬럼 구조를 확인합니다.</p>
                </div>
            </div>

            {/* 2단 레이아웃 — 공통코드/메뉴 관리와 동일 패턴 */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 min-h-0 overflow-hidden">
                {/* 왼쪽: 테이블 목록 */}
                <TableList />

                {/* 오른쪽: 컬럼 상세 */}
                <TableColumns />
            </div>
        </div>
    );
}
