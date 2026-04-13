'use client';

/**
 * DnD 정렬용 공통 래퍼 컴포넌트
 *
 * setNodeRef     → 외부 div (collision detection 측정 영역)
 * setActivatorNodeRef → grip handle span (drag 활성화 전용)
 *   → grip handle 이외 영역(field 텍스트, 버튼 등)에서 drag 절대 불가
 *
 * data.type 명시 → handleDragStart에서 row/field 100% 신뢰 판별
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

/* ── Row 래퍼 ── */
export function SortableRowWrapper({ id, children }: {
    id: string;
    children: (handleProps: Record<string, unknown>) => React.ReactNode;
}) {
    const {
        attributes, listeners,
        setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging,
    } = useSortable({ id, data: { type: 'row' } });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
                zIndex: isDragging ? 999 : undefined,
            }}
        >
            {children({ ref: setActivatorNodeRef, ...listeners, ...attributes })}
        </div>
    );
}

/* ── Field 래퍼 ── */
export function SortableFieldWrapper({ id, children }: {
    id: string;
    children: (handleProps: Record<string, unknown>, isDragging: boolean) => React.ReactNode;
}) {
    const {
        attributes, listeners,
        setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging,
    } = useSortable({ id, data: { type: 'field' } });

    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
        >
            {children({ ref: setActivatorNodeRef, ...listeners, ...attributes }, isDragging)}
        </div>
    );
}

/* ── Empty Field Drop Zone (빈 행에 필드 드래그 가능하도록 지원) ── */
export function EmptyFieldDropZone({ rowId }: { rowId: string }) {
    const { setNodeRef, isOver } = useDroppable({
        id: `empty-${rowId}`,
        data: {
            type: 'field',
            sortable: { containerId: `rc-${rowId}` },
        }
    });

    return (
        <div
            ref={setNodeRef}
            className={`flex items-center justify-center p-6 border-2 border-dashed rounded-lg text-sm transition-colors ${isOver ? 'bg-blue-50 border-blue-400 text-blue-500' : 'border-slate-200 text-slate-400 bg-slate-50'
                }`}
        >
            이곳으로 필드를 드래그하여 추가하세요
        </div>
    );
}
