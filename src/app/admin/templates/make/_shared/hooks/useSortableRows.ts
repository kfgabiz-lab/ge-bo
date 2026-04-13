/**
 * Row + Field 드래그 정렬 공통 훅
 *
 * 핵심 설계:
 *   collision detection에서 드래그 대상 타입별 완전 분리
 *   - 필드 드래그: field id만 대상 → over는 항상 field (row 반환 불가)
 *   - 행 드래그:   row id만 대상  → over는 항상 row   (field 반환 불가)
 *
 *   → closestCenter가 row/field를 혼합 반환하여 발생하는 모든 오작동 원천 차단
 *
 * ping-pong 방지:
 *   activeContainerIdRef — cross-row 이동 후 React re-render 전에도 즉시 갱신
 *   (active.data.current.sortable.containerId는 re-render 후에야 갱신되므로 별도 ref 추적)
 *
 * page.tsx 필수 설정:
 *   outer SortableContext: items={rows}  (id 불필요)
 *   inner SortableContext: id={"rc-" + row.id}
 *   SortableRowWrapper:   data: { type: 'row' }
 *   SortableFieldWrapper: data: { type: 'field' }
 */

import { useRef, useState, useCallback, useMemo } from 'react';
import {
    PointerSensor, useSensor, useSensors, closestCenter,
    type DragStartEvent, type DragOverEvent, type DragEndEvent,
    type CollisionDetection,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/** inner SortableContext id prefix */
export const RC_PREFIX = 'rc-';

type SortableRow<F extends { id: string }> = { id: string; fields: F[] };

export function useSortableRows<F extends { id: string }, R extends SortableRow<F>>(
    fieldRows: R[],
    setFieldRows: React.Dispatch<React.SetStateAction<R[]>>,
) {
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
    const [dndActiveId, setDndActiveId] = useState<string | null>(null);

    /** cross-row 발생 여부 — handleDragEnd에서 same-row 재정렬 중복 방지 */
    const crossRowMovedRef = useRef(false);

    /**
     * ping-pong 방지용 ref
     * cross-row 이동 시 setFieldRows(상태 갱신) 이전에 즉시 동기 갱신
     * → 다음 DragOver 이벤트에서 stale 값 참조 차단
     */
    const activeContainerIdRef = useRef<string | null>(null);

    /** 행 id 집합 — collision detection 필터링용 */
    const rowIds = useMemo(() => new Set(fieldRows.map(r => r.id)), [fieldRows]);

    /**
     * 커스텀 collision detection
     * 필드/행 드래그를 완전히 분리하여 혼합 반환 원천 차단
     */
    const collisionDetection: CollisionDetection = useCallback((args) => {
        const activeType = args.active?.data?.current?.type as string | undefined;

        if (activeType === 'field') {
            /* 필드 드래그: field id만 → over는 항상 field (row div 절대 반환 안 함) */
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    c => !rowIds.has(c.id as string)
                ),
            });
        }

        if (activeType === 'row') {
            /* 행 드래그: row id만 → over는 항상 row (field 절대 반환 안 함) */
            return closestCenter({
                ...args,
                droppableContainers: args.droppableContainers.filter(
                    c => rowIds.has(c.id as string)
                ),
            });
        }

        return closestCenter(args);
    }, [rowIds]);

    /* ── 드래그 시작 ── */
    const handleDragStart = ({ active }: DragStartEvent) => {
        setDndActiveId(active.id as string);
        crossRowMovedRef.current = false;
        activeContainerIdRef.current = (active.data.current?.sortable?.containerId as string) ?? null;
    };

    /* ── 드래그 중: cross-row 이동만 처리 ── */
    const handleDragOver = ({ active, over }: DragOverEvent) => {
        if (!over || active.id === over.id) return;
        /* 필드 드래그만 처리 */
        if (active.data.current?.type !== 'field') return;

        const activeContainerId = activeContainerIdRef.current;
        if (!activeContainerId?.startsWith(RC_PREFIX)) return;

        /* collision detection이 field만 반환하므로 over는 항상 field */
        const targetContainerId = over.data.current?.sortable?.containerId as string | undefined;
        if (!targetContainerId?.startsWith(RC_PREFIX)) return;

        /* 같은 row → same-row 재정렬은 handleDragEnd에서 처리 */
        if (activeContainerId === targetContainerId) return;

        /* cross-row: ping-pong 방지를 위해 상태 갱신 전 ref 즉시 갱신 */
        crossRowMovedRef.current = true;
        activeContainerIdRef.current = targetContainerId;

        const sourceRowId = activeContainerId.slice(RC_PREFIX.length);
        const targetRowId = targetContainerId.slice(RC_PREFIX.length);
        const activeFieldId = active.id as string;
        const overFieldId = over.id as string;

        setFieldRows(prev => {
            const srcIdx = prev.findIndex(r => r.id === sourceRowId);
            const tgtIdx = prev.findIndex(r => r.id === targetRowId);
            if (srcIdx === -1 || tgtIdx === -1) return prev;

            const field = prev[srcIdx].fields.find(f => f.id === activeFieldId);
            if (!field) return prev;

            const overFieldIdx = prev[tgtIdx].fields.findIndex(f => f.id === overFieldId);
            const insertIdx = overFieldIdx !== -1 ? overFieldIdx : prev[tgtIdx].fields.length;

            return prev.map((r, i) => {
                if (i === srcIdx) return { ...r, fields: r.fields.filter(f => f.id !== activeFieldId) } as R;
                if (i === tgtIdx) {
                    const next = [...r.fields];
                    next.splice(insertIdx, 0, field);
                    return { ...r, fields: next } as R;
                }
                return r;
            });
        });
    };

    /* ── 드래그 종료 ── */
    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        const wasCrossRow = crossRowMovedRef.current;
        setDndActiveId(null);
        crossRowMovedRef.current = false;
        activeContainerIdRef.current = null;

        if (!over || active.id === over.id) return;

        const activeType = active.data.current?.type as string | undefined;

        if (activeType === 'field') {
            /* same-row 재정렬 — collision이 field만 반환하므로 over는 항상 field */
            const activeContainerId = active.data.current?.sortable?.containerId as string | undefined;
            const overContainerId = over.data.current?.sortable?.containerId as string | undefined;
            if (!activeContainerId?.startsWith(RC_PREFIX)) return;
            if (activeContainerId !== overContainerId) return;

            const rowId = activeContainerId.slice(RC_PREFIX.length);
            setFieldRows(prev => {
                const rowIdx = prev.findIndex(r => r.id === rowId);
                if (rowIdx === -1) return prev;
                const oldIdx = prev[rowIdx].fields.findIndex(f => f.id === active.id);
                const newIdx = prev[rowIdx].fields.findIndex(f => f.id === over.id);
                if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
                return prev.map((r, i) =>
                    i === rowIdx ? { ...r, fields: arrayMove(r.fields, oldIdx, newIdx) } as R : r
                );
            });

        } else if (activeType === 'row') {
            /* 행 순서 변경 — collision이 row만 반환하므로 over는 항상 row */
            setFieldRows(prev => {
                const oldIdx = prev.findIndex(r => r.id === active.id);
                const newIdx = prev.findIndex(r => r.id === over.id);
                if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return prev;
                return arrayMove(prev, oldIdx, newIdx);
            });
        }
    };

    return { sensors, collisionDetection, dndActiveId, handleDragStart, handleDragOver, handleDragEnd };
}
