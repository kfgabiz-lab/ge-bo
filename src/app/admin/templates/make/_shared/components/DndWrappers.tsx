'use client';

/**
 * DnD 정렬용 공통 래퍼 컴포넌트
 * - SortableRowWrapper  : Row 단위 드래그 정렬
 * - SortableFieldWrapper: Field 단위 드래그 정렬
 *
 * 사용 예시:
 *   <SortableRowWrapper id={row.id}>
 *     {(handleProps) => <div>...</div>}
 *   </SortableRowWrapper>
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/* ── Row 정렬 래퍼 ── */
export function SortableRowWrapper({ id, children }: {
    id: string;
    /** handleProps를 RowHeader의 dragHandleProps로 전달 */
    children: (handleProps: Record<string, unknown>) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
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
            {children({ ...listeners, ...attributes })}
        </div>
    );
}

/* ── Field 정렬 래퍼 ── */
export function SortableFieldWrapper({ id, children }: {
    id: string;
    /** handleProps를 GripVertical span에 전달, isDragging으로 시각 처리 가능 */
    children: (handleProps: Record<string, unknown>, isDragging: boolean) => React.ReactNode;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
    return (
        <div
            ref={setNodeRef}
            style={{
                transform: CSS.Transform.toString(transform),
                transition,
                opacity: isDragging ? 0.4 : 1,
            }}
        >
            {children({ ...listeners, ...attributes }, isDragging)}
        </div>
    );
}
