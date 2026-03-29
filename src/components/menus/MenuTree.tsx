'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FileText, EyeOff, ChevronUp, ChevronDown as ChevronDownIcon, Plus } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';

/* ── 선택된 메뉴의 depth 계산 ── */
const getDepth = (item: MenuItem, allMenus: MenuItem[]): number => {
    if (!item.parentId) return 1;
    const flat: MenuItem[] = [];
    const flatten = (items: MenuItem[]) => { items.forEach(m => { flat.push(m); if (m.children) flatten(m.children); }); };
    flatten(allMenus);
    const parent = flat.find(m => m.id === item.parentId);
    if (!parent) return 1;
    return getDepth(parent, allMenus) + 1;
};

/* ── 트리 노드 ── */
const TreeNode = ({ item, depth = 0, isFirst = false, isLast = false }: { item: MenuItem; depth?: number; isFirst?: boolean; isLast?: boolean }) => {
    const { selectedMenu, selectMenu, moveMenu } = useMenuStore();
    const [expanded, setExpanded] = useState(true);
    const hasChildren = item.children && item.children.length > 0;
    const isSelected = selectedMenu?.id === item.id;
    const hasUrl = item.url && item.url.length > 0;

    const handleClick = () => {
        if (isSelected) selectMenu(null);
        else selectMenu(item);
    };

    /* 카테고리 노드 */
    if (item.isCategory) {
        return (
            <div className={depth === 0 ? 'mt-3 first:mt-0' : ''}>
                <div
                    className={`flex items-center justify-between px-3 py-1.5 cursor-pointer group ${isSelected ? 'bg-slate-100 rounded-md' : ''}`}
                    onClick={handleClick}
                >
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                    <div className={`items-center gap-0.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}>
                        <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'up'); }} disabled={isFirst} className={`p-0.5 rounded ${isFirst ? 'opacity-30' : 'text-slate-300 hover:text-slate-500'}`}><ChevronUp className="w-3 h-3" /></button>
                        <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'down'); }} disabled={isLast} className={`p-0.5 rounded ${isLast ? 'opacity-30' : 'text-slate-300 hover:text-slate-500'}`}><ChevronDownIcon className="w-3 h-3" /></button>
                    </div>
                </div>
                {hasChildren && (
                    <div>{item.children!.map((child, ci) => (
                        <TreeNode key={child.id} item={child} depth={depth + 1} isFirst={ci === 0} isLast={ci === item.children!.length - 1} />
                    ))}</div>
                )}
            </div>
        );
    }

    return (
        <div>
            <div
                className={`flex items-center gap-1.5 px-3 py-2 cursor-pointer rounded-md transition-all group ${
                    isSelected ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'
                }`}
                style={{ paddingLeft: `${depth * 16 + 12}px` }}
                onClick={handleClick}
            >
                {hasChildren ? (
                    <button onClick={e => { e.stopPropagation(); setExpanded(!expanded); }} className={`p-0.5 rounded ${isSelected ? 'text-white/70' : 'text-slate-400'}`}>
                        {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    </button>
                ) : <span className="w-4.5" />}

                {hasUrl
                    ? <FileText className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-slate-400'}`} />
                    : <Folder className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-white/80' : 'text-amber-400'}`} />
                }

                <span className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-white' : ''}`}>{item.name}</span>
                {!item.visible && <EyeOff className={`w-3 h-3 ${isSelected ? 'text-white/50' : 'text-slate-300'}`} />}

                <div className={`items-center gap-0.5 ${isSelected ? 'flex' : 'hidden group-hover:flex'}`}>
                    <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'up'); }} disabled={isFirst} className={`p-0.5 rounded ${isFirst ? 'opacity-30' : isSelected ? 'text-white/60' : 'text-slate-300 hover:text-slate-500'}`}><ChevronUp className="w-3 h-3" /></button>
                    <button onClick={e => { e.stopPropagation(); moveMenu(item.id, 'down'); }} disabled={isLast} className={`p-0.5 rounded ${isLast ? 'opacity-30' : isSelected ? 'text-white/60' : 'text-slate-300 hover:text-slate-500'}`}><ChevronDownIcon className="w-3 h-3" /></button>
                </div>
            </div>

            {hasChildren && expanded && (
                <div>{item.children!.map((child, ci) => (
                    <TreeNode key={child.id} item={child} depth={depth + 1} isFirst={ci === 0} isLast={ci === item.children!.length - 1} />
                ))}</div>
            )}
        </div>
    );
};

/* ── 메인 컴포넌트 ── */
export function MenuTree() {
    const { menus, activeTab, setActiveTab, fetchMenus, fetchRoles, isLoading, selectedMenu, startCreate } = useMenuStore();

    useEffect(() => {
        fetchMenus();
        fetchRoles();
    }, [activeTab, fetchMenus, fetchRoles]);

    /* 선택된 메뉴의 depth */
    const selectedDepth = selectedMenu ? getDepth(selectedMenu, menus) : 0;

    /* 추가 버튼 클릭 */
    const handleAdd = () => {
        startCreate(selectedMenu?.id ?? null, selectedDepth);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            {/* 헤더: BO/FO 탭 + 추가 버튼 */}
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                    {(['BO', 'FO'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${
                                activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {tab === 'BO' ? '백오피스 (BO)' : '프론트 (FO)'}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {selectedMenu ? `${selectedMenu.name} 하위에 추가` : '메뉴 추가'}
                </button>
                {selectedMenu && selectedDepth >= 2 && (
                    <p className="text-[10px] text-amber-500 text-center">3depth — 프로그램만 가능</p>
                )}
            </div>

            {/* 트리 */}
            <div className="flex-1 overflow-y-auto p-2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                    </div>
                ) : menus.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Folder className="w-8 h-8 mb-2" />
                        <span className="text-xs">등록된 메뉴가 없습니다.</span>
                    </div>
                ) : (
                    menus.map((item, i) => <TreeNode key={item.id} item={item} isFirst={i === 0} isLast={i === menus.length - 1} />)
                )}
            </div>
        </div>
    );
}
