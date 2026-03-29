'use client';

import { ChevronUp, ChevronDown, Trash2, GripVertical } from 'lucide-react';

interface RowHeaderProps {
    /** 현재 행 인덱스 (0부터 시작) */
    rowIdx: number;
    /** 전체 행 수 (위/아래 이동 버튼 disabled 처리용) */
    rowCount: number;
    /** 현재 열 수 */
    cols: 1 | 2 | 3 | 4 | 5;
    /** 열 수 변경 핸들러 */
    onChangeCols: (cols: 1 | 2 | 3 | 4 | 5) => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: () => void;
    /** 접힘 여부 (미전달 시 접기 기능 비활성화) */
    collapsed?: boolean;
    /** 접기/펼치기 토글 핸들러 */
    onToggleCollapse?: () => void;
    /** 드래그 핸들 props (dnd-kit listeners + attributes) */
    dragHandleProps?: Record<string, unknown>;
}

/**
 * 행 헤더 — Row N 라벨 + 1~5 열 선택 탭 + 접기 + 위/아래/삭제 버튼
 * @example
 * <RowHeader rowIdx={0} rowCount={rows.length} cols={row.cols}
 *   collapsed={collapsed} onToggleCollapse={toggle}
 *   onChangeCols={n => updateRowCols(i, n)}
 *   onMoveUp={() => moveRow(i, 'up')}
 *   onMoveDown={() => moveRow(i, 'down')}
 *   onRemove={() => removeRow(i)} />
 */
export const RowHeader = ({
    rowIdx, rowCount, cols, onChangeCols, onMoveUp, onMoveDown, onRemove,
    collapsed, onToggleCollapse, dragHandleProps,
}: RowHeaderProps) => (
    <div
        className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-b border-slate-100 cursor-pointer select-none"
        onClick={onToggleCollapse}
    >
        <div className="flex items-center gap-2">
            {/* Row 드래그 핸들 */}
            {dragHandleProps && (
                <span
                    {...(dragHandleProps as React.HTMLAttributes<HTMLSpanElement>)}
                    onClick={e => e.stopPropagation()}
                    className="cursor-grab active:cursor-grabbing touch-none"
                >
                    <GripVertical className="w-3 h-3 text-slate-300" />
                </span>
            )}
            {/* 접기 화살표 — onToggleCollapse 있을 때만 표시 */}
            {onToggleCollapse && (
                <ChevronDown
                    className={`w-3 h-3 text-slate-400 transition-transform ${collapsed ? '-rotate-90' : ''}`}
                />
            )}
            <span className="text-[10px] font-semibold text-slate-500">Row {rowIdx + 1}</span>
            {/* 열 수 선택 탭 (1~5) */}
            <div className="flex items-center gap-0.5">
                {([1, 2, 3, 4, 5] as const).map(n => (
                    <button
                        key={n}
                        type="button"
                        onClick={() => onChangeCols(n)}
                        className={`w-5 h-5 text-[10px] font-semibold rounded transition-all ${
                            cols === n
                                ? 'bg-slate-900 text-white'
                                : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'
                        }`}
                    >
                        {n}
                    </button>
                ))}
            </div>
        </div>
        {/* 위/아래/삭제 버튼 — 클릭 시 접기 토글 이벤트 버블링 차단 */}
        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
            <button
                onClick={onMoveUp}
                disabled={rowIdx === 0}
                className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30"
            >
                <ChevronUp className="w-3 h-3" />
            </button>
            <button
                onClick={onMoveDown}
                disabled={rowIdx === rowCount - 1}
                className="p-1 rounded text-slate-400 hover:bg-slate-200 disabled:opacity-30"
            >
                <ChevronDown className="w-3 h-3" />
            </button>
            <button
                onClick={onRemove}
                className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
            >
                <Trash2 className="w-3 h-3" />
            </button>
        </div>
    </div>
);
