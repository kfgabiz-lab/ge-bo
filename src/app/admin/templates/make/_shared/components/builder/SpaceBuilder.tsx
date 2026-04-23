'use client';

/**
 * SpaceBuilder — 공간영역(Space) 위젯 설정 빌더 공통 컴포넌트
 *
 * 텍스트(textarea) 아이템과 액션 버튼(action-button) 아이템을
 * 자유롭게 추가·삭제·정렬한다.
 * 각 아이템 설정은 공통 필드 컴포넌트(TextareaField, ActionButtonField)를 재사용한다.
 *
 * 사용법:
 *   <SpaceBuilder
 *     widget={spaceWidget}
 *     onChange={setSpaceWidget}
 *     layerTemplates={layerTemplates}
 *     slugOptions={slugOptions}
 *   />
 */

import React, { useState } from 'react';
import { AlignLeft, AlignCenter, AlignRight, MousePointerClick, X, GripVertical, Pencil, Plus } from 'lucide-react';
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createIdGenerator } from '../../utils';
import { TextareaField, ActionButtonField } from './fields';
import type { SpaceWidget } from '../renderer/types';
import type { SearchFieldConfig, TemplateItem } from '../../types';
import type { FieldEditValues } from './fields/types';

const uid = createIdGenerator('sp');

/**
 * 바탕색 옵션 — SPACE_BTN_COLORS와 동일한 색상 계열
 * value: CSS 색상값 ('none' = 없음/투명)
 */
export const BG_COLOR_OPTIONS: { value: string; label: string }[] = [
    { value: 'none',    label: '없음' },
    { value: '#0f172a', label: '검정' },
    { value: '#10b981', label: '초록' },
    { value: '#3b82f6', label: '파랑' },
    { value: '#facc15', label: '노랑' },
    { value: '#ef4444', label: '빨강' },
    { value: '#94a3b8', label: '회색' },
    { value: '#f472b4', label: '분홍' },
];

/** 버튼 색상 옵션 (SpaceRenderer의 SPACE_BTN_CLS와 대응) */
export const SPACE_BTN_COLORS = [
    { value: 'black', label: '검정', cls: 'bg-slate-900 text-white' },
    { value: 'green', label: '초록', cls: 'bg-emerald-500 text-white' },
    { value: 'blue', label: '파랑', cls: 'bg-blue-500 text-white' },
    { value: 'yellow', label: '노랑', cls: 'bg-yellow-400 text-slate-900' },
    { value: 'red', label: '빨강', cls: 'bg-red-500 text-white' },
    { value: 'gray', label: '회색', cls: 'bg-slate-400 text-white' },
    { value: 'pink', label: '분홍', cls: 'bg-pink-400 text-white' },
];

interface SpaceBuilderProps {
    /**
     * 수정 위치 안내:
     * 이 컴포넌트는 _shared/components/builder에 위치한 표준 컨텐츠 컴포넌트입니다.
     * 여기서 수정된 사항은 모든 위젯/레이어 빌더의 공간영역에 공통 적용됩니다.
     */
    widget: SpaceWidget;
    onChange: (w: SpaceWidget) => void;
    /** Quick-Detail 템플릿 목록 — ActionButton 페이지 연결용 */
    pageTemplates: TemplateItem[];
    formWidgets?: { widgetId: string; contentKey: string; connectedSlug?: string }[];
    /** true 시 ActionButton 아이템만 추가 가능 (Text 추가 버튼 숨김) */
    actionButtonOnly?: boolean;
    /** 아이템 ColSpan 최대값 (기본 12, 우측 드로어 등 좁은 공간에서 2로 제한) */
    maxColSpan?: number;
}

/** 
 * SortableSpaceItem — 드래그 가능한 공간영역 아이템 (Accordion 방식)
 */
function SortableSpaceItem({
    item, idx, isEditing, onToggleEdit, onRemove, children
}: {
    item: SearchFieldConfig;
    idx: number;
    isEditing: boolean;
    onToggleEdit: () => void;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    const {
        attributes, listeners, setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef} style={style}
            className={`border rounded-md overflow-hidden bg-white transition-all ${isEditing ? 'border-slate-900 shadow-md' : 'border-slate-200'}`}
        >
            {/* 아이템 헤더 */}
            <div className={`flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none ${item.type === 'textarea' ? 'bg-amber-50' : 'bg-orange-50'}`} onClick={onToggleEdit}>
                {/* 드래그 핸들 — 이벤트 버블링 중단하여 클릭과 드래그 분리 */}
                <span
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors p-1"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </span>

                <span className={`text-[10px] font-semibold flex-1 ${item.type === 'textarea' ? 'text-amber-700' : 'text-orange-700'}`}>
                    {item.type === 'textarea'
                        ? <AlignLeft className="w-3 h-3 inline mr-1" />
                        : <MousePointerClick className="w-3 h-3 inline mr-1" />}
                    {item.type === 'textarea' ? 'Text' : 'Button'} #{idx + 1}
                    {item.label && <span className="ml-1.5 text-slate-400 font-normal">({item.label})</span>}
                </span>

                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    {/* 편집 토글 (아코디언) */}
                    <button
                        onClick={onToggleEdit}
                        className={`p-1 rounded transition-colors ${isEditing ? 'text-slate-900 bg-white/50' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                    {/* 삭제 */}
                    <button
                        onClick={onRemove}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* 아이템 설정 (Accordion) */}
            {isEditing && (
                <div className="p-2 border-t border-slate-100">
                    {children}
                </div>
            )}
        </div>
    );
}

export function SpaceBuilder({
    widget,
    onChange,
    pageTemplates,
    formWidgets = [],
    actionButtonOnly = false,
    maxColSpan = 12,
}: SpaceBuilderProps) {
    const [editingId, setEditingId] = useState<string | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3, // 3px 이상 움직여야 드래그 시작 (클릭과 구분)
            },
        }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /* 아이템 추가 — 기본 colSpan = maxColSpan (우측 드로어 등에서 전체 너비로 시작) */
    const addItem = (type: 'textarea' | 'action-button') => {
        const newItem: SearchFieldConfig = type === 'textarea'
            ? { id: uid(), type: 'textarea', label: '', fieldKey: '', colSpan: maxColSpan as 1|2|3|4|5, rowSpan: 1, content: '', fontSize: 13, bold: false, textColor: '#334155' }
            : { id: uid(), type: 'action-button', label: '버튼', fieldKey: '', colSpan: maxColSpan as 1|2|3|4|5, rowSpan: 1, color: 'blue', textColor: 'white' };
        onChange({ ...widget, items: [...widget.items, newItem] });
        setEditingId(newItem.id); // 추가 시 즉시 편집 모드
    };

    /* 드래그 재정렬 */
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = widget.items.findIndex(i => i.id === active.id);
        const newIdx = widget.items.findIndex(i => i.id === over.id);
        onChange({ ...widget, items: arrayMove(widget.items, oldIdx, newIdx) });
    };

    /* 아이템 삭제 */
    const removeItem = (id: string) =>
        onChange({ ...widget, items: widget.items.filter(i => i.id !== id) });

    /* 아이템 수정 */
    const updateItem = (id: string, patch: Partial<SearchFieldConfig>) =>
        onChange({ ...widget, items: widget.items.map(i => i.id === id ? { ...i, ...patch } : i) });

    const colSpanMode = { type: 'input' as const, min: 1, max: maxColSpan };
    const rowSpanConfig = { min: 1, max: 20 };

    return (
        <div className="space-y-4 pt-1">
            {/* 정렬 설정 */}
            <div className="flex flex-col gap-1.5 px-0.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">영역 정렬</label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-md w-fit">
                    {(['left', 'center', 'right'] as const).map(a => (
                        <button
                            key={a}
                            onClick={() => onChange({ ...widget, align: a })}
                            className={`p-1.5 rounded transition-all ${widget.align === a || (!widget.align && a === 'left') ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            title={a === 'left' ? '왼쪽 정렬' : a === 'center' ? '가운데 정렬' : '오른쪽 정렬'}
                        >
                            {a === 'left' && <AlignLeft className="w-4 h-4" />}
                            {a === 'center' && <AlignCenter className="w-4 h-4" />}
                            {a === 'right' && <AlignRight className="w-4 h-4" />}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테두리 유무 | 바탕색 — 한 줄 배치 */}
            <div className="grid grid-cols-2 gap-2 px-0.5">
                {/* 테두리 유무 */}
                <div>
                    <label className={LABEL_CLS}>테두리</label>
                    <ToggleRow
                        label={widget.showBorder ?? true ? '표시' : '숨김'}
                        value={widget.showBorder ?? true}
                        onChange={v => onChange({ ...widget, showBorder: v })}
                    />
                </div>
                {/* 바탕색 */}
                <div>
                    <label className={LABEL_CLS}>바탕색</label>
                    <select
                        value={widget.bgColor ?? 'none'}
                        onChange={e => onChange({ ...widget, bgColor: e.target.value })}
                        className={INPUT_CLS}
                    >
                        {BG_COLOR_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 아이템 목록 (DndContext 적용) */}
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={widget.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1">
                        {widget.items.map((item, idx) => (
                            <SortableSpaceItem
                                key={item.id}
                                item={item}
                                idx={idx}
                                isEditing={editingId === item.id}
                                onToggleEdit={() => setEditingId(editingId === item.id ? null : item.id)}
                                onRemove={() => removeItem(item.id)}
                            >
                                {item.type === 'textarea' && (
                                    <TextareaField
                                        values={item as FieldEditValues}
                                        onChange={patch => updateItem(item.id, patch as Partial<SearchFieldConfig>)}
                                        colSpanMode={colSpanMode}
                                        rowSpanConfig={rowSpanConfig}
                                        compact={true}
                                        codeGroups={[]}
                                        codeGroupsLoading={false}
                                    />
                                )}
                                {item.type === 'action-button' && (
                                    <ActionButtonField
                                        values={item as FieldEditValues}
                                        onChange={patch => updateItem(item.id, patch as Partial<SearchFieldConfig>)}
                                        colSpanMode={colSpanMode}
                                        rowSpanConfig={rowSpanConfig}
                                        compact={true}
                                        codeGroups={[]}
                                        codeGroupsLoading={false}
                                        pageTemplates={pageTemplates}
                                        formWidgets={formWidgets}
                                    />
                                )}
                            </SortableSpaceItem>
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            {/* 아이템 추가 버튼 — actionButtonOnly=true 시 Button만 표시 */}
            <div className="flex gap-1.5 pt-1">
                {!actionButtonOnly && (
                    <button
                        onClick={() => addItem('textarea')}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-dashed border-amber-200 rounded text-[10px] text-amber-600 hover:border-amber-400 hover:bg-amber-50 transition-all font-medium"
                    >
                        <Plus className="w-3 h-3" />Text 추가
                    </button>
                )}
                <button
                    onClick={() => addItem('action-button')}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 border border-dashed border-orange-200 rounded text-[10px] text-orange-600 hover:border-orange-400 hover:bg-orange-50 transition-all font-medium"
                >
                    <Plus className="w-3 h-3" />Button 추가
                </button>
            </div>
        </div>
    );
}
