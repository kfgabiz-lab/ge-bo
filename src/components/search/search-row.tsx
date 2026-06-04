'use client';

import React from 'react';

interface SearchRowProps {
    /** 그리드 컬럼 수 (기본 4) */
    cols?: 1 | 2 | 3 | 4 | 5;
    /** 자식 SearchField 컴포넌트들 */
    children: React.ReactNode;
}

/* ── cols에 따른 grid 클래스 매핑 ── */
const GRID_COLS_MAP: Record<number, string> = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
};

/**
 * 검색 폼 행 컴포넌트
 * - cols로 한 행의 컬럼 수 지정 (기본 4단)
 * - 내부에 SearchField를 배치
 */
export function SearchRow({ cols = 4, children }: SearchRowProps) {
    return (
        <div className={`grid ${GRID_COLS_MAP[cols]} gap-4`}>
            {children}
        </div>
    );
}
