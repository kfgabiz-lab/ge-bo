'use client';

/**
 * JPA 엔티티 목록 (좌측 패널)
 * - 마운트 시 엔티티 목록 API 자동 호출
 * - 엔티티명 / 테이블명 실시간 검색
 * - 선택 시 우측 패널에 필드 정보 표시
 */

import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useEntityStore } from '@/store/useEntityStore';

export function EntityList() {
    const { entities, selectedEntity, selectEntity, isLoading, fetchEntities } = useEntityStore();
    const [search, setSearch] = useState('');

    /* 마운트 시 엔티티 목록 로드 */
    useEffect(() => { fetchEntities(); }, [fetchEntities]);

    /* 엔티티명 / 테이블명 기준 실시간 필터 */
    const filtered = entities.filter(e =>
        e.entityName.toLowerCase().includes(search.toLowerCase()) ||
        e.tableName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            {/* 헤더 */}
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-700">
                        엔티티 목록
                        <span className="text-slate-400 font-normal ml-1">{entities.length}개</span>
                    </h2>
                </div>
                {/* 검색 */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="엔티티명 / 테이블명 검색"
                        className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                    />
                </div>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto p-1.5">
                {isLoading ? (
                    /* 로딩 */
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    /* 빈 상태 */
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <span className="text-[11px]">
                            {search ? '검색 결과가 없습니다.' : '엔티티가 없습니다.'}
                        </span>
                    </div>
                ) : (
                    /* 엔티티 행 */
                    <div className="space-y-0.5">
                        {filtered.map(entity => {
                            const isSelected = selectedEntity?.entityName === entity.entityName;
                            return (
                                <button
                                    key={entity.entityName}
                                    onClick={() => selectEntity(isSelected ? null : entity)}
                                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-left transition-all ${
                                        isSelected
                                            ? 'bg-slate-900 text-white'
                                            : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    <div className="flex flex-col flex-1 min-w-0">
                                        {/* 엔티티명 */}
                                        <span className="text-[11px] font-mono font-medium truncate">
                                            {entity.entityName}
                                        </span>
                                        {/* 테이블명 */}
                                        <span className={`text-[10px] truncate ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
                                            {entity.tableName}
                                        </span>
                                    </div>
                                    {/* 필드 수 */}
                                    <span className={`text-[10px] shrink-0 ml-2 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                        {entity.fieldCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
