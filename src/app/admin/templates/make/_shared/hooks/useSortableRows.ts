/**
 * Row + Field 드래그 정렬 공통 훅
 *
 * - PointerSensor (distance: 5) 설정
 * - Row 순서 변경 / Field 순서 변경 (Row 내 + Row 간) 처리
 * - dndActiveTypeRef: state 대신 ref 사용 → stale closure 방지
 *
 * 사용 예시:
 *   const { sensors, handleDragStart, handleDragOver, handleDragEnd }
 *     = useSortableRows(fieldRows, setFieldRows);
 */

import { useRef, useState } from 'react';
import {
    PointerSensor, useSensor, useSensors,
    type DragStartEvent, type DragOverEvent, type DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';

/** useSortableRows에 전달할 Row 타입 — id + fields 배열 필수 */
type SortableRow<F extends { id: string }> = { id: string; fields: F[] };

export function useSortableRows<F extends { id: string }, R extends SortableRow<F>>(
    fieldRows: R[],
    setFieldRows: React.Dispatch<React.SetStateAction<R[]>>,
) {
    /* ── 센서: 마우스 5px 이동 후 드래그 활성화 ── */
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

    /* ── 드래그 중 활성 아이템 ID (DragOverlay 등에서 활용 가능) ── */
    const [dndActiveId, setDndActiveId] = useState<string | null>(null);

    /* ── 드래그 타입: state 대신 ref → 핸들러 간 stale closure 방지 ── */
    const dndActiveTypeRef = useRef<'row' | 'field' | null>(null);

    /* ── 드래그 시작: row/field 판별 ── */
    const handleDragStart = ({ active }: DragStartEvent) => {
        const id = active.id as string;
        setDndActiveId(id);
        dndActiveTypeRef.current = fieldRows.some(r => r.id === id) ? 'row' : 'field';
    };

    /* ── 드래그 중: Row 간 Field 이동 ── */
    const handleDragOver = ({ active, over }: DragOverEvent) => {
        /* Row 드래그 중이거나 같은 위치이면 처리 불필요 */
        if (!over || active.id === over.id || dndActiveTypeRef.current !== 'field') return;

        const activeId = active.id as string;
        const overId   = over.id as string;

        const activeRowIdx    = fieldRows.findIndex(r => r.fields.some(f => f.id === activeId));
        const overRowIdx      = fieldRows.findIndex(r => r.id === overId);              /* over가 Row 자체 */
        const overFieldRowIdx = fieldRows.findIndex(r => r.fields.some(f => f.id === overId)); /* over가 Field */
        const targetRowIdx    = overRowIdx !== -1 ? overRowIdx : overFieldRowIdx;

        /* 같은 Row 내 이동이면 handleDragEnd에서 처리 */
        if (activeRowIdx === -1 || targetRowIdx === -1 || activeRowIdx === targetRowIdx) return;

        setFieldRows(prev => {
            const activeField  = prev[activeRowIdx].fields.find(f => f.id === activeId)!;
            const overFieldIdx = overFieldRowIdx !== -1
                ? prev[overFieldRowIdx].fields.findIndex(f => f.id === overId)
                : prev[targetRowIdx].fields.length;

            return prev.map((r, i) => {
                if (i === activeRowIdx) return { ...r, fields: r.fields.filter(f => f.id !== activeId) } as R;
                if (i === targetRowIdx) {
                    const newFields = [...r.fields];
                    newFields.splice(overFieldIdx >= 0 ? overFieldIdx : newFields.length, 0, activeField);
                    return { ...r, fields: newFields } as R;
                }
                return r;
            });
        });
    };

    /* ── 드래그 종료: Row 순서 / 같은 Row 내 Field 순서 변경 ── */
    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        const activeType = dndActiveTypeRef.current;
        setDndActiveId(null);
        dndActiveTypeRef.current = null;

        if (!over || active.id === over.id) return;

        const activeId = active.id as string;
        const overId   = over.id as string;

        if (activeType === 'row') {
            /* Row 순서 변경 — closestCenter가 field ID를 반환할 수 있어 양쪽 처리 */
            const oldIdx = fieldRows.findIndex(r => r.id === activeId);
            let   newIdx = fieldRows.findIndex(r => r.id === overId);
            if (newIdx === -1) {
                /* over가 field인 경우, 해당 field가 속한 Row 인덱스 사용 */
                newIdx = fieldRows.findIndex(r => r.fields.some(f => f.id === overId));
            }
            if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
                setFieldRows(prev => arrayMove(prev, oldIdx, newIdx));
            }
        } else {
            /* 같은 Row 내 Field 순서 변경 (Row 간 이동은 handleDragOver에서 처리 완료) */
            const rowIdx = fieldRows.findIndex(r => r.fields.some(f => f.id === activeId));
            if (rowIdx === -1) return;

            const row    = fieldRows[rowIdx];
            const oldIdx = row.fields.findIndex(f => f.id === activeId);
            const newIdx = row.fields.findIndex(f => f.id === overId);

            if (oldIdx !== -1 && newIdx !== -1) {
                setFieldRows(prev => prev.map((r, i) =>
                    i === rowIdx ? { ...r, fields: arrayMove(r.fields, oldIdx, newIdx) } as R : r
                ));
            }
        }
    };

    return { sensors, dndActiveId, handleDragStart, handleDragOver, handleDragEnd };
}
