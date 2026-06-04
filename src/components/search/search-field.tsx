'use client';

import React from 'react';

interface SearchFieldProps {
    /** 필드 라벨 */
    label?: string;
    /** 필수 여부 표시 */
    required?: boolean;
    /** 라벨 하단 설명 텍스트 */
    description?: string;
    /** 차지할 컬럼 수 (기본 1) */
    colSpan?: 1 | 2 | 3 | 4 | 5;
    /** 자식 컴포넌트 (Input, Select, Checkbox 등) */
    children: React.ReactNode;
}

/* ── colSpan에 따른 클래스 매핑 ── */
const COL_SPAN_MAP: Record<number, string> = {
    1: 'col-span-1',
    2: 'col-span-2',
    3: 'col-span-3',
    4: 'col-span-4',
    5: 'col-span-5',
};

/**
 * 검색 폼 필드 래퍼
 * - 라벨 + 필수 표시 자동 처리
 * - colSpan으로 그리드 내 차지 영역 지정
 * - 안에 어떤 입력 컴포넌트든 삽입 가능
 */
export function SearchField({ label, required, description, colSpan = 1, children }: SearchFieldProps) {
    return (
        <div className={COL_SPAN_MAP[colSpan]}>
            {label && (
                <label className="block text-xs font-semibold text-slate-700 flex-shrink-0">
                    {label}
                    {required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {/* 설명 — description 유무와 무관하게 항상 동일 높이 예약 → input 위치 정렬 */}
            <p className="text-[10px] text-slate-400 mb-1 leading-tight truncate min-h-[13px]">
                {description}
            </p>
            {children}
        </div>
    );
}
