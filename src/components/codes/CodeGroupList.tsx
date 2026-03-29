'use client';

import React, { useEffect, useState } from 'react';
import { Database, Plus, Search } from 'lucide-react';
import { useCodeStore } from '@/store/useCodeStore';

export function CodeGroupList() {
    const { groups, selectedGroup, selectGroup, fetchGroups, isLoading, startCreate } = useCodeStore();
    const [search, setSearch] = useState('');

    useEffect(() => { fetchGroups(); }, [fetchGroups]);

    /* 그룹코드·그룹명 기준 실시간 필터 */
    const filtered = groups.filter(g =>
        g.groupCode.includes(search.toUpperCase()) ||
        g.groupName.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            {/* 헤더 */}
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-slate-400" />
                        코드 그룹
                        <span className="text-slate-400 font-normal">{groups.length}개</span>
                    </h2>
                    <button
                        onClick={startCreate}
                        className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded-md transition-all"
                    >
                        <Plus className="w-3 h-3" />추가
                    </button>
                </div>
                {/* 검색 */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="그룹코드 / 그룹명 검색"
                        className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                    />
                </div>
            </div>

            {/* 그룹 목록 */}
            <div className="flex-1 overflow-y-auto p-1.5">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Database className="w-6 h-6 mb-1.5" />
                        <span className="text-[11px]">
                            {search ? '검색 결과가 없습니다.' : '등록된 코드 그룹이 없습니다.'}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filtered.map(group => {
                            const isSelected = selectedGroup?.id === group.id;
                            return (
                                <button
                                    key={group.id}
                                    onClick={() => isSelected ? selectGroup(null) : selectGroup(group)}
                                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-left transition-all ${
                                        isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
                                    }`}
                                >
                                    {/* 그룹코드 뱃지 */}
                                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded font-mono ${
                                        isSelected ? 'bg-white/20 text-white/80' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {group.groupCode}
                                    </span>
                                    {/* 그룹명 */}
                                    <span className={`flex-1 text-xs font-medium truncate ${isSelected ? 'text-white' : ''}`}>
                                        {group.groupName}
                                    </span>
                                    {/* 비활성 뱃지 */}
                                    {!group.active && (
                                        <span className={`shrink-0 text-[9px] px-1 py-0.5 rounded ${
                                            isSelected ? 'bg-red-400/30 text-red-200' : 'bg-red-50 text-red-400'
                                        }`}>비활성</span>
                                    )}
                                    {/* 코드 수 */}
                                    <span className={`shrink-0 text-[10px] ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                        {group.details?.length || 0}
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
