'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Folder, Plus } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { useMenusQuery, useRolesQuery } from '@/hooks/useMenuQueries';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragMoveEvent,
    DragEndEvent,
    DragOverlay,
    defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { flattenTree, buildTree, getProjection, getChildCount } from './tree-utils';
import { SortableTreeNode } from './SortableTreeNode';

const INDENTATION_WIDTH = 16;

export function MenuTree() {
    const { menus, activeTab, setActiveTab, selectedMenu, startCreate, localUpdateMenuTree, __syncQueryMenus } = useMenuStore();

    const [activeId, setActiveId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);
    const [offsetLeft, setOffsetLeft] = useState(0);

    const flattenedItems = useMemo(() => flattenTree(menus), [menus]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor)
    );

    // React Query 통합 적용
    const { data: serverMenus, isLoading: isMenusLoading } = useMenusQuery(activeTab);
    const { data: serverRoles } = useRolesQuery();

    // 서버 데이터를 Zustand의 로컬 구동용 트리(menus)로 동기화
    useEffect(() => {
        if (serverMenus) {
            __syncQueryMenus(serverMenus, serverRoles || []);
        }
    }, [serverMenus, serverRoles, __syncQueryMenus]);

    const selectedDepth = useMemo(() => {
        if (!selectedMenu) return 0;
        const item = flattenedItems.find(f => f.id === selectedMenu.id);
        return item ? item.depth : 0;
    }, [selectedMenu, flattenedItems]);

    const handleAdd = () => {
        startCreate(selectedMenu?.id ?? null, selectedDepth);
    };

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(Number(active.id));
        setOverId(Number(active.id));
        setOffsetLeft(0);
    };

    const handleDragMove = ({ delta, over }: DragMoveEvent) => {
        setOffsetLeft(delta.x);
        if (over) setOverId(Number(over.id));
    };

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        if (active.id && over?.id && active.id !== over.id) {
            const projected = getProjection(flattenedItems, Number(active.id), Number(over.id), offsetLeft, INDENTATION_WIDTH);

            if (projected) {
                const clonedItems = [...flattenedItems];
                const oldActiveIndex = clonedItems.findIndex(({ id }) => id === active.id);
                const oldOverIndex = clonedItems.findIndex(({ id }) => id === over.id);

                const childrenCount = getChildCount(flattenedItems, Number(active.id));
                const activeTreeItems = clonedItems.splice(oldActiveIndex, 1 + childrenCount);

                let newOverIndex = clonedItems.findIndex(({ id }) => id === over.id);
                if (newOverIndex < 0) newOverIndex = clonedItems.length;

                // 드래그를 위에서 아래로 한 경우 타겟(over)의 밑(뒤)에 붙도록 보정
                const isBelow = oldActiveIndex < oldOverIndex;
                const insertPos = newOverIndex + (isBelow ? 1 : 0);

                clonedItems.splice(insertPos, 0, ...activeTreeItems);

                let isApplyingToChildren = false;
                let activeDepthDiff = 0;
                let childCountDown = 0;

                const updatedItems = clonedItems.map((item) => {
                    if (item.id === active.id) {
                        isApplyingToChildren = true;
                        childCountDown = childrenCount;
                        activeDepthDiff = projected.depth - item.depth;
                        return { ...item, depth: projected.depth, parentId: projected.parentId };
                    }
                    if (isApplyingToChildren && childCountDown > 0) {
                        childCountDown--;
                        return { ...item, depth: item.depth + activeDepthDiff };
                    }
                    return item;
                });

                const finalTree = buildTree(updatedItems);

                function reorderTree(items: MenuItem[]) {
                    items.forEach((item, index) => {
                        item.sortOrder = index;
                        if (item.children) reorderTree(item.children);
                    });
                }
                reorderTree(finalTree);
                localUpdateMenuTree(finalTree);
            }
        }

        setActiveId(null);
        setOverId(null);
        setOffsetLeft(0);
    };

    const handleDragCancel = () => {
        setActiveId(null);
        setOverId(null);
        setOffsetLeft(0);
    };

    const activeItem = useMemo(
        () => flattenedItems.find(({ id }) => id === activeId),
        [activeId, flattenedItems]
    );

    const projected = activeId && overId ? getProjection(flattenedItems, activeId, overId, offsetLeft, INDENTATION_WIDTH) : null;

    const itemsToRender = useMemo(() => {
        if (!activeId || !projected) return flattenedItems;
        const activeIndex = flattenedItems.findIndex(i => i.id === activeId);

        const childrenCount = getChildCount(flattenedItems, activeId);

        let foundActive = false;
        let count = 0;

        // 원본 배열 순서는 절대 바꾸지 않음 (dnd-kit 에러 방지)
        return flattenedItems.map(it => {
            if (it.id === activeId) {
                foundActive = true;
                count = childrenCount;
                return { ...it, depth: projected.depth, isGhost: true };
            }
            if (foundActive && count > 0) {
                count--;
                return { ...it, isHidden: true };
            }
            return it;
        });
    }, [flattenedItems, activeId, projected]);


    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                    {(['BO', 'FO'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
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

            <div className="flex-1 overflow-y-auto p-2">
                {isMenusLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                    </div>
                ) : flattenedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Folder className="w-8 h-8 mb-2" />
                        <span className="text-xs">등록된 메뉴가 없습니다.</span>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragStart={handleDragStart}
                        onDragMove={handleDragMove}
                        onDragEnd={handleDragEnd}
                        onDragCancel={handleDragCancel}
                    >
                        <SortableContext
                            items={itemsToRender.map(i => i.id.toString())}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-0.5">
                                {itemsToRender.map(item => (
                                    <SortableTreeNode
                                        key={item.id}
                                        item={item}
                                        indentationWidth={INDENTATION_WIDTH}
                                    />
                                ))}
                            </div>
                        </SortableContext>

                        <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '1' } } }) }}>
                            {activeItem ? (
                                <SortableTreeNode
                                    item={{
                                        ...activeItem,
                                        depth: activeItem.depth,
                                        childCountBadge: getChildCount(flattenedItems, activeId!)
                                    }}
                                    indentationWidth={INDENTATION_WIDTH}
                                />
                            ) : null}
                        </DragOverlay>
                    </DndContext>
                )}
            </div>
        </div>
    );
}
