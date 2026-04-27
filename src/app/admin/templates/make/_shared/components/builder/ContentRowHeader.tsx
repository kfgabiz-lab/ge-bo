'use client';

/**
 * 컨텐츠 행 헤더 — 위젯 아이콘 + 라벨 + col×row 배지 + 고정/삭제 버튼
 *
 * - isFixed=true  → '고정' 텍스트 배지 표시
 * - isFixed=false → X 삭제 버튼 표시 (onRemove 필수)
 * - dragHandleProps → DnD 드래그 핸들 (SortableRowWrapper의 handleProps)
 *
 * 사용법 (고정 컨텐츠):
 *   <ContentRowHeader
 *     widgetType="form" label="Form — key" colSpan={12} rowSpan={3}
 *     isEditing={editingContentId === 'fixed-form'} isFixed
 *     onToggle={() => setEditingContentId(...)}
 *   />
 *
 * 사용법 (삭제 가능 + 드래그):
 *   <ContentRowHeader
 *     widgetType="space" label="공간영역" colSpan={c.colSpan} rowSpan={c.rowSpan}
 *     isEditing={editingContentId === c.id}
 *     onToggle={() => setEditingContentId(...)}
 *     onRemove={() => removeContent(item.id, c.id)}
 *     dragHandleProps={handleProps}
 *   />
 */

import React from 'react';
import { X, GripVertical, Search, AlignLeft, FileText, Table2 } from 'lucide-react';

/* 컨텐츠 타입별 시각 메타 (label·color·icon) */
const CONTENT_META: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    search: { label: 'Search',    color: 'text-sky-700',     icon: <Search    className="w-3.5 h-3.5" /> },
    table:  { label: 'Table',     color: 'text-emerald-700', icon: <Table2    className="w-3.5 h-3.5" /> },
    form:   { label: 'Form',      color: 'text-violet-700',  icon: <FileText  className="w-3.5 h-3.5" /> },
    space:  { label: '공간영역',   color: 'text-amber-700',   icon: <AlignLeft className="w-3.5 h-3.5" /> },
};

interface ContentRowHeaderProps {
    /** 컨텐츠 위젯 타입 ('search' | 'table' | 'form' | 'space' 등) */
    widgetType: string;
    /** 헤더에 표시할 라벨 (contentKey 포함 여부는 부모가 결정) */
    label: string;
    colSpan: number;
    rowSpan: number;
    /** 현재 편집 중 여부 — 배경 하이라이트 제어 */
    isEditing: boolean;
    /** true → '고정' 배지, false(기본) → X 삭제 버튼 */
    isFixed?: boolean;
    /** 헤더 클릭 시 편집 패널 토글 */
    onToggle: () => void;
    /** isFixed=false 일 때 X 버튼 클릭 핸들러 */
    onRemove?: () => void;
    /** DnD 드래그 핸들 props (SortableRowWrapper의 handleProps) */
    dragHandleProps?: Record<string, unknown>;
}

export function ContentRowHeader({
    widgetType,
    label,
    colSpan,
    rowSpan,
    isEditing,
    isFixed = false,
    onToggle,
    onRemove,
    dragHandleProps,
}: ContentRowHeaderProps) {
    const meta  = CONTENT_META[widgetType];
    const color = meta?.color ?? 'text-slate-600';
    const icon  = meta?.icon  ?? null;

    return (
        <div
            className={`flex items-center gap-1.5 px-3 py-1.5 cursor-pointer transition-all ${isEditing ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
            onClick={onToggle}
        >
            {/* DnD 드래그 핸들 (선택적) */}
            {dragHandleProps && (
                <span
                    {...dragHandleProps as React.HTMLAttributes<HTMLSpanElement>}
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                    className="cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0"
                >
                    <GripVertical className="w-3 h-3" />
                </span>
            )}

            {/* 위젯 타입 아이콘 */}
            <span className={`flex-shrink-0 ${color}`}>{icon}</span>

            {/* 라벨 */}
            <span className={`text-[10px] font-semibold flex-1 truncate ${color}`}>{label}</span>

            {/* col × row 배지 */}
            <span className="text-[9px] text-slate-300 flex-shrink-0 font-mono">
                {colSpan}×{rowSpan}
            </span>

            {/* 고정 배지 or X 삭제 버튼 */}
            {isFixed ? (
                <span className="text-[9px] text-slate-300 flex-shrink-0">고정</span>
            ) : (
                <button
                    onClick={e => { e.stopPropagation(); onRemove?.(); }}
                    className="p-0.5 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all flex-shrink-0"
                >
                    <X className="w-3 h-3" />
                </button>
            )}
        </div>
    );
}
