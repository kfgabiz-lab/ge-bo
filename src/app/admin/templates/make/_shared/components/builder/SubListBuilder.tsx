'use client';

/**
 * SubListBuilder — 서브 목록(SubList) 위젯 설정 빌더 공통 컴포넌트
 *
 * Form과 독립된 다건 행 입력 목록을 구성한다.
 * - 위젯 기본 설정: connectedSlug, contentKey, title, addButtonLabel, showBorder, maxRows
 * - 컬럼 목록: DnD 순서변경 / 추가(FieldPickerTypeList) / 삭제
 * - 컬럼 편집 패널(Accordion): 타입별 공통 필드 컴포넌트 재사용
 *   input→InputField / select→SelectField / date→DateField /
 *   dateRange→DateRangeField / textarea→FormTextareaField /
 *   file→FileField / image→ImageField
 *
 * 사용법:
 *   <SubListBuilder widget={subListWidget} onChange={setSubListWidget} />
 */

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { CodeGroupDef } from '../../types';
import { Plus, GripVertical, Pencil, X } from 'lucide-react';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../contexts/BuilderI18nModeContext';
import { useI18n } from '@/hooks/use-i18n';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import { FieldPickerTypeList, FieldTypeItem } from '../FieldPickerTypeList';
import {
    InputField, SelectField, DateField, DateRangeField,
    FormTextareaField, FileField, ImageField,
    SlugSelectField,
} from './fields';
import type { FieldEditValues } from './fields/types';
import { createIdGenerator } from '../../utils';
import type { SubListWidget, SubListColumn, SubListColumnType } from '../renderer/types';

const uid = createIdGenerator('slc');

/* ── FieldPickerTypeList에 전달할 컬럼 타입 목록 ── */
const SUBLIST_COLUMN_TYPES: FieldTypeItem[] = [
    { type: 'input',     label: 'Input',      desc: '텍스트 입력' },
    { type: 'select',    label: 'Select',     desc: '셀렉트 박스' },
    { type: 'date',      label: 'Date',       desc: '날짜 단독' },
    { type: 'dateRange', label: 'Date Range', desc: '날짜 범위 (from~to)' },
    { type: 'textarea',  label: 'Textarea',   desc: '여러 줄 텍스트' },
    { type: 'file',      label: 'File',       desc: '파일 첨부' },
    { type: 'image',     label: 'Image',      desc: '이미지 업로드' },
];

interface SubListBuilderProps {
    widget: SubListWidget;
    onChange: (w: SubListWidget) => void;
    slugOptions: { id: number; slug: string; name: string }[];
}

/* ══════════════════════════════════════════════════════════════ */
/*  변환 유틸 — SubListColumn ↔ FieldEditValues                  */
/* ══════════════════════════════════════════════════════════════ */

/**
 * SubListColumn → FieldEditValues 변환
 * 공통 필드 컴포넌트(InputField 등)에 values prop으로 전달하기 위해 사용.
 * colSpan/rowSpan은 SubList에 개념이 없어 더미값(1) 전달.
 */
function toFieldValues(col: SubListColumn): FieldEditValues {
    return {
        label:            col.label,
        labelMsgKey:      col.labelMsgKey,
        label2:           col.label2,
        label2MsgKey:     col.label2MsgKey,
        fieldKey:         col.key,
        colSpan:          1,
        rowSpan:          1,
        placeholder:      col.placeholder,
        placeholderMsgKey: col.placeholderMsgKey,
        description:      col.description,
        descriptionMsgKey: col.descriptionMsgKey,
        required:         col.required,
        readonly:         col.readonly,
        options:          col.options,
        codeGroupCode:    col.codeGroup,
        /* 파일 */
        maxFileCount:     col.maxFileCount,
        maxFileSizeMB:    col.maxFileSizeMB,
        maxTotalSizeMB:   col.maxTotalSizeMB,
        fileTypeMode:     col.fileTypeMode as FieldEditValues['fileTypeMode'],
        allowedExtensions: col.allowedExtensions,
        /* 유효성검사 */
        minLength:        col.minLength,
        maxLength:        col.maxLength,
        showCharCount:    col.showCharCount,
        pattern:          col.pattern,
        patternDesc:      col.patternDesc,
        /* 기본값 */
        defaultValue:       col.defaultValue,
        defaultValueMsgKey: col.defaultValueMsgKey,
        defaultOptionValue: col.defaultOptionValue,
        /* date */
        defaultDateOffset: col.defaultDateOffset,
        defaultDate:       col.defaultDate,
        disablePast:       col.disablePast,
        /* dateRange */
        defaultStartDateOffset: col.defaultStartDateOffset,
        defaultStartDate:       col.defaultStartDate,
        disableStartPast:       col.disableStartPast,
        defaultEndDateOffset:   col.defaultEndDateOffset,
        defaultEndDate:         col.defaultEndDate,
        disableEndPast:         col.disableEndPast,
    };
}

/**
 * FieldEditValues 변경분 → SubListColumn patch 역변환
 * 공통 필드 컴포넌트의 onChange 결과를 SubListColumn에 반영하기 위해 사용.
 * colSpan/rowSpan 변경은 SubList에 적용 없으므로 무시.
 */
function fromFieldValues(updates: Partial<FieldEditValues>): Partial<SubListColumn> {
    const patch: Partial<SubListColumn> = {};
    if (updates.label             !== undefined) patch.label             = updates.label;
    if (updates.labelMsgKey       !== undefined) patch.labelMsgKey       = updates.labelMsgKey;
    if (updates.label2            !== undefined) patch.label2            = updates.label2;
    if (updates.label2MsgKey      !== undefined) patch.label2MsgKey      = updates.label2MsgKey;
    if (updates.fieldKey          !== undefined) patch.key               = updates.fieldKey;
    if (updates.placeholder       !== undefined) patch.placeholder       = updates.placeholder;
    if (updates.placeholderMsgKey !== undefined) patch.placeholderMsgKey = updates.placeholderMsgKey;
    if (updates.description       !== undefined) patch.description       = updates.description;
    if (updates.descriptionMsgKey !== undefined) patch.descriptionMsgKey = updates.descriptionMsgKey;
    if (updates.required          !== undefined) patch.required          = updates.required;
    if (updates.readonly          !== undefined) patch.readonly          = updates.readonly;
    if (updates.options           !== undefined) patch.options           = updates.options;
    if (updates.codeGroupCode     !== undefined) patch.codeGroup         = updates.codeGroupCode;
    /* 파일 */
    if (updates.maxFileCount      !== undefined) patch.maxFileCount      = updates.maxFileCount;
    if (updates.maxFileSizeMB     !== undefined) patch.maxFileSizeMB     = updates.maxFileSizeMB;
    if (updates.maxTotalSizeMB    !== undefined) patch.maxTotalSizeMB    = updates.maxTotalSizeMB;
    if (updates.fileTypeMode      !== undefined) patch.fileTypeMode      = updates.fileTypeMode;
    if (updates.allowedExtensions !== undefined) patch.allowedExtensions = updates.allowedExtensions;
    /* 유효성검사 */
    if (updates.minLength         !== undefined) patch.minLength         = updates.minLength;
    if (updates.maxLength         !== undefined) patch.maxLength         = updates.maxLength;
    if (updates.showCharCount     !== undefined) patch.showCharCount     = updates.showCharCount;
    if (updates.pattern           !== undefined) patch.pattern           = updates.pattern;
    if (updates.patternDesc       !== undefined) patch.patternDesc       = updates.patternDesc;
    /* 기본값 */
    if (updates.defaultValue       !== undefined) patch.defaultValue       = updates.defaultValue;
    if (updates.defaultValueMsgKey !== undefined) patch.defaultValueMsgKey = updates.defaultValueMsgKey;
    if (updates.defaultOptionValue !== undefined) patch.defaultOptionValue = updates.defaultOptionValue;
    /* date */
    if (updates.defaultDateOffset  !== undefined) patch.defaultDateOffset  = updates.defaultDateOffset;
    if (updates.defaultDate        !== undefined) patch.defaultDate        = updates.defaultDate;
    if (updates.disablePast        !== undefined) patch.disablePast        = updates.disablePast;
    /* dateRange */
    if (updates.defaultStartDateOffset !== undefined) patch.defaultStartDateOffset = updates.defaultStartDateOffset;
    if (updates.defaultStartDate       !== undefined) patch.defaultStartDate       = updates.defaultStartDate;
    if (updates.disableStartPast       !== undefined) patch.disableStartPast       = updates.disableStartPast;
    if (updates.defaultEndDateOffset   !== undefined) patch.defaultEndDateOffset   = updates.defaultEndDateOffset;
    if (updates.defaultEndDate         !== undefined) patch.defaultEndDate         = updates.defaultEndDate;
    if (updates.disableEndPast         !== undefined) patch.disableEndPast         = updates.disableEndPast;
    return patch;
}

/* ══════════════════════════════════════════ */
/*  SortableColumnItem — 드래그 가능한 컬럼 행  */
/* ══════════════════════════════════════════ */

function SortableColumnItem({
    col, idx, isEditing, onToggleEdit, onRemove, children,
}: {
    col: SubListColumn;
    idx: number;
    isEditing: boolean;
    onToggleEdit: () => void;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    const {
        attributes, listeners, setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging,
    } = useSortable({ id: col.id });
    const { t } = useI18n();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    /* 컬럼 타입별 배지 색상 */
    const typeBadgeCls: Record<SubListColumnType, string> = {
        input:     'bg-blue-50 text-blue-600',
        select:    'bg-purple-50 text-purple-600',
        date:      'bg-green-50 text-green-600',
        dateRange: 'bg-teal-50 text-teal-600',
        textarea:  'bg-amber-50 text-amber-600',
        file:      'bg-orange-50 text-orange-600',
        image:     'bg-pink-50 text-pink-600',
    };

    return (
        <div
            ref={setNodeRef} style={style}
            className={`border rounded-md overflow-hidden bg-white transition-all ${isEditing ? 'border-slate-900 shadow-md' : 'border-slate-200'}`}
        >
            {/* 컬럼 헤더 */}
            <div
                className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer select-none bg-slate-50"
                onClick={onToggleEdit}
            >
                {/* 드래그 핸들 */}
                <span
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    className="cursor-grab text-slate-300 hover:text-slate-500 transition-colors p-1"
                    onClick={e => e.stopPropagation()}
                >
                    <GripVertical className="w-3.5 h-3.5" />
                </span>

                {/* 순번 + 타입 배지 + 라벨(key) */}
                <span className="text-[10px] text-slate-400 font-medium w-4">{idx + 1}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${typeBadgeCls[col.type]}`}>
                    {col.type}
                </span>
                <span className="text-xs text-slate-700 flex-1 truncate">
                    {col.labelMsgKey ? t(col.labelMsgKey) : (col.label || <span className="text-slate-300 italic">라벨 없음</span>)}
                    {col.key && <span className="ml-1.5 text-[10px] text-slate-400">({col.key})</span>}
                </span>

                {/* 편집·삭제 버튼 */}
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <button
                        onClick={onToggleEdit}
                        className={`p-1 rounded transition-colors ${isEditing ? 'text-slate-900 bg-white/50' : 'text-slate-400 hover:text-blue-500'}`}
                    >
                        <Pencil className="w-3 h-3" />
                    </button>
                    <button
                        onClick={onRemove}
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            </div>

            {/* 편집 패널 (Accordion) */}
            {isEditing && (
                <div className="p-3 border-t border-slate-100 space-y-3">
                    {children}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════ */
/*  ColumnEditPanel — 컬럼 설정 편집 패널      */
/* ══════════════════════════════════════════ */

function ColumnEditPanel({
    col, onChange, codeGroups, codeGroupsLoading,
}: {
    col: SubListColumn;
    onChange: (patch: Partial<SubListColumn>) => void;
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
}) {
    const values = toFieldValues(col);
    const handleChange = (updates: Partial<FieldEditValues>) =>
        onChange(fromFieldValues(updates));

    /* 모든 공통 필드 컴포넌트에 전달하는 공통 props */
    const commonProps = {
        values,
        onChange: handleChange,
        colSpanMode: { type: 'input' as const, min: 1, max: 12 },
        codeGroups,
        codeGroupsLoading,
        hideColSpan: true,           // SubList 컬럼은 colSpan 개념 없음 — ColSpan 입력란 숨김
        hideConditionFields: true,   // SubList 렌더러는 동적 조건 미지원 — HIDE/Disable 조건 입력란 숨김
    };

    return (
        <div className="space-y-3">
            {/* 타입별 공통 필드 컴포넌트 */}
            {col.type === 'input'     && <InputField        {...commonProps} />}
            {col.type === 'select'    && <SelectField       {...commonProps} />}
            {col.type === 'date'      && <DateField         {...commonProps} />}
            {col.type === 'dateRange' && <DateRangeField    {...commonProps} />}
            {col.type === 'textarea'  && <FormTextareaField {...commonProps} />}
            {col.type === 'file'      && <FileField         {...commonProps} />}
            {col.type === 'image'     && <ImageField        {...commonProps} />}

        </div>
    );
}

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */

export function SubListBuilder({ widget, onChange, slugOptions }: SubListBuilderProps) {
    const { i18nMode } = useBuilderI18nMode();
    const [editingColId, setEditingColId] = useState<string | null>(null);
    const [showPicker, setShowPicker] = useState(false);

    /* 공통코드 목록 — FormBuilder와 동일한 패턴 */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes')
            .then(res => setCodeGroups(res.data || []))
            .catch(() => {})
            .finally(() => setCodeGroupsLoading(false));
    }, []);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /* ── 타입 선택 후 컬럼 추가 ── */
    const addColumn = (type: SubListColumnType) => {
        const newCol: SubListColumn = {
            id: uid(), key: '', label: '', type,
            required: false,
        };
        onChange({ ...widget, columns: [...widget.columns, newCol] });
        setEditingColId(newCol.id);
        setShowPicker(false);
    };

    /* ── 컬럼 삭제 ── */
    const removeColumn = (id: string) =>
        onChange({ ...widget, columns: widget.columns.filter(c => c.id !== id) });

    /* ── 컬럼 수정 ── */
    const updateColumn = (id: string, patch: Partial<SubListColumn>) =>
        onChange({ ...widget, columns: widget.columns.map(c => c.id === id ? { ...c, ...patch } : c) });

    /* ── DnD 재정렬 ── */
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = widget.columns.findIndex(c => c.id === active.id);
        const newIdx = widget.columns.findIndex(c => c.id === over.id);
        onChange({ ...widget, columns: arrayMove(widget.columns, oldIdx, newIdx) });
    };

    return (
        <div className="space-y-5 pt-1">

            {/* ── 위젯 기본 설정 ── */}
            <section className="space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">기본 설정</h4>

                {/* connectedSlug */}
                <SlugSelectField
                    value={widget.connectedSlug ?? ''}
                    onChange={slug => onChange({ ...widget, connectedSlug: slug || undefined })}
                    slugOptions={slugOptions}
                />

                {/* contentKey */}
                <div>
                    <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.contentKey}
                        onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                        placeholder="예: subList1 (페이지 내 고유)"
                        className={INPUT_CLS}
                    />
                </div>

                {/* title / addButtonLabel */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>헤더 타이틀</label>
                        {i18nMode ? (
                            <MessageKeySelector
                                value={widget.titleMsgKey ?? ''}
                                onChange={key => onChange({ ...widget, titleMsgKey: key || undefined })}
                                resourceType="WORD"
                                size="sm"
                            />
                        ) : (
                            <input
                                type="text"
                                value={widget.title ?? ''}
                                onChange={e => onChange({ ...widget, title: e.target.value || undefined })}
                                placeholder="예: 코드 상세"
                                className={INPUT_CLS}
                            />
                        )}
                    </div>
                    <div>
                        <label className={LABEL_CLS}>추가 버튼 텍스트</label>
                        {i18nMode ? (
                            <MessageKeySelector
                                value={widget.addButtonLabelMsgKey ?? ''}
                                onChange={key => onChange({ ...widget, addButtonLabelMsgKey: key || undefined })}
                                resourceType="WORD"
                                size="sm"
                            />
                        ) : (
                            <input
                                type="text"
                                value={widget.addButtonLabel ?? ''}
                                onChange={e => onChange({ ...widget, addButtonLabel: e.target.value || undefined })}
                                placeholder="+ 추가"
                                className={INPUT_CLS}
                            />
                        )}
                    </div>
                </div>

                {/* maxRows */}
                <div>
                    <label className={LABEL_CLS}>최대 행 수 (0=제한없음)</label>
                    <input
                        type="number" min={0}
                        value={widget.maxRows ?? 0}
                        onChange={e => onChange({ ...widget, maxRows: Number(e.target.value) })}
                        className={INPUT_CLS}
                    />
                </div>

                {/* showBorder */}
                <div>
                    <label className={LABEL_CLS}>테두리</label>
                    <ToggleRow
                        label={widget.showBorder !== false ? '표시' : '숨김'}
                        value={widget.showBorder !== false}
                        onChange={v => onChange({ ...widget, showBorder: v })}
                    />
                </div>
            </section>

            {/* ── 컬럼 목록 ── */}
            <section className="space-y-2">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    컬럼 목록 ({widget.columns.length}개)
                </h4>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={widget.columns.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {widget.columns.map((col, idx) => (
                                <SortableColumnItem
                                    key={col.id}
                                    col={col}
                                    idx={idx}
                                    isEditing={editingColId === col.id}
                                    onToggleEdit={() => setEditingColId(editingColId === col.id ? null : col.id)}
                                    onRemove={() => removeColumn(col.id)}
                                >
                                    <ColumnEditPanel
                                        col={col}
                                        onChange={patch => updateColumn(col.id, patch)}
                                        codeGroups={codeGroups}
                                        codeGroupsLoading={codeGroupsLoading}
                                    />
                                </SortableColumnItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* 컬럼 추가 — FieldPickerTypeList 사용 (FormBuilder 동일 패턴) */}
                {showPicker ? (
                    <div className="border border-slate-200 rounded-md p-2 bg-slate-50/50">
                        <FieldPickerTypeList
                            types={SUBLIST_COLUMN_TYPES}
                            onSelect={type => addColumn(type as SubListColumnType)}
                            onCancel={() => setShowPicker(false)}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowPicker(true)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-blue-200 rounded text-[10px] text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all font-medium"
                    >
                        <Plus className="w-3 h-3" />컬럼 추가
                    </button>
                )}
            </section>

        </div>
    );
}
