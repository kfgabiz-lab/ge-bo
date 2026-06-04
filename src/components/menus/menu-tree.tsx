'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Folder, Plus } from 'lucide-react';
import { useMenuStore, MenuItem } from '@/store/use-menu-store';
import { useMenusQuery, useRolesQuery } from '@/hooks/use-menu-queries';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useI18n } from '@/hooks/use-i18n';
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
import { SortableTreeNode } from './sortable-tree-node';

const INDENTATION_WIDTH = 16;

export function MenuTree() {
    const { menus, activeTab, setActiveTab, selectedMenu, startCreate, localUpdateMenuTree, __syncQueryMenus } = useMenuStore();
    const queryClient = useQueryClient();
    const { t } = useI18n();

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

    const handleDragEnd = async ({ active, over }: DragEndEvent) => {
        if (active.id && over?.id && active.id !== over.id) {
            const projected = getProjection(flattenedItems, Number(active.id), Number(over.id), offsetLeft, INDENTATION_WIDTH);

            if (projected) {
                const clonedItems = [...flattenedItems];
                const oldActiveIndex = clonedItems.findIndex(({ id }) => id === Number(active.id));
                const oldOverIndex = clonedItems.findIndex(({ id }) => id === Number(over.id));

                const childrenCount = getChildCount(flattenedItems, Number(active.id));
                const activeTreeItems = clonedItems.splice(oldActiveIndex, 1 + childrenCount);

                let newOverIndex = clonedItems.findIndex(({ id }) => id === Number(over.id));
                if (newOverIndex < 0) newOverIndex = clonedItems.length;

                const isBelow = oldActiveIndex < oldOverIndex;
                let insertPos = newOverIndex + (isBelow ? 1 : 0);
                let finalDepth = projected.depth;
                let finalParentId = projected.parentId;

                /* depth=0 아이템은 항상 root 위치에만 삽입 */
                const activeItemDepth = flattenedItems.find(i => i.id === Number(active.id))?.depth ?? 1;
                if (activeItemDepth === 0 && finalDepth > 0) {
                    finalDepth = 0;
                    finalParentId = null;
                    /* over 아이템의 depth-0 조상을 찾아 삽입 위치 재조정 */
                    let ancestorIdx = newOverIndex;
                    while (ancestorIdx > 0 && (clonedItems[ancestorIdx]?.depth ?? 0) > 0) {
                        ancestorIdx--;
                    }
                    if (!isBelow) {
                        /* 상향 드래그: depth-0 조상 앞에 삽입 */
                        insertPos = ancestorIdx;
                    } else {
                        /* 하향 드래그: depth-0 조상 그룹 끝 뒤에 삽입 */
                        let groupEnd = ancestorIdx + 1;
                        while (groupEnd < clonedItems.length && (clonedItems[groupEnd]?.depth ?? 0) > 0) {
                            groupEnd++;
                        }
                        insertPos = groupEnd;
                    }
                }

                clonedItems.splice(insertPos, 0, ...activeTreeItems);

                let isApplyingToChildren = false;
                let activeDepthDiff = 0;
                let childCountDown = 0;

                const updatedItems = clonedItems.map((item) => {
                    if (item.id === Number(active.id)) {
                        isApplyingToChildren = true;
                        childCountDown = childrenCount;
                        activeDepthDiff = finalDepth - item.depth;
                        return { ...item, depth: finalDepth, parentId: finalParentId };
                    }
                    if (isApplyingToChildren && childCountDown > 0) {
                        childCountDown--;
                        /* 자식 depth는 max 2(3depth)를 초과하지 않도록 제한 */
                        const newDepth = Math.min(item.depth + activeDepthDiff, 2);
                        return { ...item, depth: newDepth };
                    }
                    return item;
                });

                const finalTree = buildTree(updatedItems);

                function reorderTree(items: MenuItem[]) {
                    items.forEach((item, index) => {
                        item.sortOrder = index + 1;
                        if (item.children) reorderTree(item.children);
                    });
                }
                reorderTree(finalTree);

                /* 낙관적 업데이트 — 즉시 화면에 반영 */
                const prevTree = menus;
                localUpdateMenuTree(finalTree);

                /* 변경된 순서를 서버에 저장 */
                try {
                    const flatUpdated = flattenTree(finalTree);
                    await api.patch('/menus/sort-batch', flatUpdated.map(item => ({
                        id: item.id,
                        sortOrder: item.sortOrder,
                        parentId: item.parentId,
                    })));
                    await queryClient.invalidateQueries({ queryKey: ['menus', activeTab] });
                } catch {
                    /* 실패 시 원래 순서로 롤백 */
                    localUpdateMenuTree(prevTree);
                    toast.error(t('menu.sort_error'));
                }
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
                            {tab === 'BO' ? t('common.tab.bo') : t('common.tab.fo')}
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-all"
                >
                    <Plus className="w-3.5 h-3.5" />
                    {selectedMenu
                        ? t('menu.btn.add_under', { name: selectedMenu.nameMsgKey ? t(selectedMenu.nameMsgKey) : selectedMenu.name })
                        : t('menu.btn.add')
                    }
                </button>
                {selectedMenu && selectedDepth >= 2 && (
                    <p className="text-[10px] text-amber-500 text-center">{t('menu.notice.depth3')}</p>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {isMenusLoading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">{t('common.loading')}</span>
                    </div>
                ) : flattenedItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <Folder className="w-8 h-8 mb-2" />
                        <span className="text-xs">{t('menu.empty')}</span>
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
