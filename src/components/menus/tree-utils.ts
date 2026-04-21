import { MenuItem } from '@/store/useMenuStore';

export interface FlattenedItem extends MenuItem {
    parentId: number | null;
    depth: number;
    index: number;
    collapsed?: boolean;
    isHidden?: boolean;
    isGhost?: boolean;
    childCountBadge?: number;
}

export function flattenTree(items: MenuItem[], depth = 0, parentId: number | null = null): FlattenedItem[] {
    return items.reduce<FlattenedItem[]>((acc, item, index) => {
        const flattened: FlattenedItem = { ...item, depth, parentId, index };
        acc.push(flattened);
        if (item.children && item.children.length > 0) {
            acc.push(...flattenTree(item.children, depth + 1, item.id));
        }
        return acc;
    }, []);
}

export function buildTree(flattenedItems: FlattenedItem[]): MenuItem[] {
    const rootItems: MenuItem[] = [];
    const lookup: Record<number, MenuItem> = {};

    for (const item of flattenedItems) {
        const { depth, index, parentId, collapsed, ...menuItem } = item;
        const itemCopy = { ...menuItem, parentId, children: [] };
        lookup[item.id] = itemCopy;

        if (item.parentId === null) {
            rootItems.push(itemCopy);
        } else if (lookup[item.parentId]) {
            lookup[item.parentId].children!.push(itemCopy);
        }
    }

    // 순서 정렬 (Flattened 배열의 순서를 그대로 보장)
    return rootItems;
}

// 드래그 중인 아이템의 투영된 위치(부모, 깊이 등) 계산
export function getProjection(
    items: FlattenedItem[],
    activeId: number,
    overId: number,
    dragOffset: number,
    indentationWidth: number
) {
    const overItemIndex = items.findIndex(({ id }) => id === overId);
    const activeItemIndex = items.findIndex(({ id }) => id === activeId);
    const activeItem = items[activeItemIndex];

    if (overItemIndex === -1 || activeItemIndex === -1) return null;

    const newItems = [...items];
    newItems.splice(activeItemIndex, 1);
    newItems.splice(overItemIndex, 0, activeItem);

    const previousItem = newItems[overItemIndex - 1];
    const nextItem = newItems[overItemIndex + 1];

    let depth = activeItem.depth;
    if (dragOffset) {
        const projectedDepth = activeItem.depth + Math.round(dragOffset / indentationWidth);

        const maxDepth = previousItem ? previousItem.depth + 1 : 0;
        const minDepth = nextItem ? nextItem.depth : 0;

        if (projectedDepth >= minDepth && projectedDepth <= maxDepth) {
            depth = projectedDepth;
        } else if (projectedDepth < minDepth) {
            depth = minDepth;
        } else {
            depth = maxDepth;
        }
    }

    // max depth 3 제한 (0, 1, 2 = 3depth)
    if (depth > 2) depth = 2;

    let parentId: number | null = null;
    if (depth === 0 || !previousItem) {
        parentId = null;
    } else if (depth === previousItem.depth) {
        parentId = previousItem.parentId;
    } else if (depth > previousItem.depth) {
        parentId = previousItem.id;
    } else {
        let currentItem = previousItem;
        while (currentItem && currentItem.depth >= depth) {
            parentId = currentItem.parentId;
            const parent = newItems.find(i => i.id === parentId);
            if (parent) currentItem = parent;
            else break;
        }
    }

    return { depth, maxDepth: 2, minDepth: 0, parentId };
}

export function getChildCount(items: FlattenedItem[], id: number) {
    const itemIndex = items.findIndex((i) => i.id === id);
    if (itemIndex === -1) return 0;

    let count = 0;
    for (let i = itemIndex + 1; i < items.length; i++) {
        if (items[i].depth > items[itemIndex].depth) {
            count++;
        } else {
            break;
        }
    }
    return count;
}
