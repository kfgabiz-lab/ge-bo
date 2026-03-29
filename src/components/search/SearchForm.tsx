'use client';

import React, { useState } from 'react';
import { Search, RotateCcw, ChevronUp, ChevronDown } from 'lucide-react';

interface SearchFormProps {
    /** 접기/펼치기 기능 사용 여부 (기본 false) */
    collapsible?: boolean;
    /** collapsible 시 초기 펼침 상태 (기본 true) */
    defaultExpanded?: boolean;
    /** 검색 버튼 클릭 핸들러 */
    onSearch?: () => void;
    /** 초기화 버튼 클릭 핸들러 */
    onReset?: () => void;
    /** 검색 버튼 텍스트 (기본 '검색') */
    searchLabel?: string;
    /** 액션 버튼 숨김 여부 (인라인 검색 바 등에서 사용) */
    hideActions?: boolean;
    /** 자식 SearchRow 컴포넌트들 */
    children: React.ReactNode;
}

/**
 * 검색 폼 컨테이너
 * - 접기/펼치기 토글 자동 제공 (collapsible)
 * - 검색/초기화 버튼 자동 제공
 * - 내부에 SearchRow > SearchField 구조로 사용
 */
export function SearchForm({
    collapsible = false,
    defaultExpanded = true,
    onSearch,
    onReset,
    searchLabel = '검색',
    hideActions = false,
    children,
}: SearchFormProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className="bg-white rounded-md border border-slate-200">
            {/* 접기/펼치기 헤더 */}
            {collapsible && (
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors rounded-t-xl"
                >
                    <div className="flex items-center gap-2">
                        <Search className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-700">상세 검색</span>
                    </div>
                    {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-slate-400" />
                        : <ChevronDown className="w-4 h-4 text-slate-400" />
                    }
                </button>
            )}

            {/* 필드 영역 */}
            {(!collapsible || isExpanded) && (
                <>
                    <div className={`px-4 space-y-3 ${collapsible ? 'pt-3 pb-4 border-t border-slate-100' : 'py-3'}`}>
                        {children}
                    </div>

                    {/* 액션 버튼 */}
                    {!hideActions && (
                        <div className="flex items-center justify-end gap-2 px-4 py-2 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                            <button
                                onClick={onReset}
                                className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-white transition-all"
                            >
                                <RotateCcw className="w-3 h-3" /> 초기화
                            </button>
                            <button
                                onClick={onSearch}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all"
                            >
                                <Search className="w-3 h-3" /> {searchLabel}
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
