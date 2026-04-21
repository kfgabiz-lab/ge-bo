'use client';

/**
 * SearchBuilder — 검색 행/필드 빌더 공통 컴포넌트
 *
 * list/page.tsx 검색 빌더 UI를 그대로 추출하여 재사용 가능하게 만든 컴포넌트.
 * list/page.tsx는 수정하지 않으며, widget/page.tsx 등에서 사용.
 *
 * 사용법:
 *   <SearchBuilder rows={rows} onChange={setRows} />
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
    Plus, Trash2, GripVertical,
    ChevronUp, ChevronDown, X, Pencil,
} from 'lucide-react';
import { CodeGroupDef, SearchFieldType, SearchFieldConfig, SearchRowConfig } from '../types';
import { needsOptions as sharedNeedsOptions, createIdGenerator } from '../utils';
import { RowHeader } from './RowHeader';
import { FieldPickerTypeList } from './FieldPickerTypeList';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortableRows } from '../hooks/useSortableRows';
import { SortableRowWrapper, SortableFieldWrapper, EmptyFieldDropZone } from './DndWrappers';
import api from '@/lib/api';
import {
    InputField, SelectField, DateField, DateRangeField,
    RadioField, CheckboxField, ButtonField,
} from './builder/fields';
import type { FieldEditValues } from './builder/fields';

/* ══════════════════════════════════════════ */
/*  타입 정의 — _shared/types.ts에서 import    */
/*  하위 호환을 위해 re-export                  */
/* ══════════════════════════════════════════ */

export type { SearchFieldType, SearchFieldConfig, SearchRowConfig };

/* ══════════════════════════════════════════ */
/*  Props                                     */
/* ══════════════════════════════════════════ */

interface SearchBuilderProps {
    rows: SearchRowConfig[];
    onChange: (rows: SearchRowConfig[]) => void;
}

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

/** 필드 유형 메타 (list/page.tsx FIELD_TYPES와 동일) */
const FIELD_TYPES: { type: SearchFieldType; label: string; desc: string; defaultColSpan: 1 | 2 }[] = [
    { type: 'input',     label: 'Input',      desc: '텍스트 입력',       defaultColSpan: 1 },
    { type: 'select',    label: 'Select',     desc: '셀렉트 박스',       defaultColSpan: 1 },
    { type: 'date',      label: 'Date',       desc: '날짜 단독',         defaultColSpan: 1 },
    { type: 'dateRange', label: 'Date Range', desc: '날짜 범위 (from~to)', defaultColSpan: 2 },
    { type: 'radio',     label: 'Radio',      desc: '라디오 단일선택',   defaultColSpan: 1 },
    { type: 'checkbox',  label: 'Checkbox',   desc: '체크박스 복수선택', defaultColSpan: 1 },
    { type: 'button',    label: 'Button',     desc: '선택 버튼',         defaultColSpan: 1 },
];

/** 옵션이 필요한 필드 타입 여부 */
const needsOptions = (type: SearchFieldType | null) =>
    sharedNeedsOptions(type) || type === 'button';

const uid = createIdGenerator('sb');

/* ══════════════════════════════════════════ */
/*  컴포넌트                                   */
/* ══════════════════════════════════════════ */

export function SearchBuilder({ rows, onChange }: SearchBuilderProps) {

    /* ── DnD: rows prop을 그대로 쓰되, 변경 시 onChange 호출 ── */
    const rowsSetter = useCallback<React.Dispatch<React.SetStateAction<SearchRowConfig[]>>>(
        (updater) => {
            const next = typeof updater === 'function' ? updater(rows) : updater;
            onChange(next);
        },
        [rows, onChange],
    );
    const { sensors, collisionDetection, handleDragStart, handleDragOver, handleDragEnd } =
        useSortableRows(rows, rowsSetter);

    /* ── 행 접기/펼치기 ── */
    const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
    const toggleRowCollapse = (id: string) =>
        setCollapsedRows(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });

    /* ── 필드 추가 플로우 상태 ── */
    const [showFieldPicker, setShowFieldPicker] = useState<string | null>(null); // row id
    const [pendingType, setPendingType]         = useState<SearchFieldType | null>(null);
    const [pendingValues, setPendingValues]     = useState<FieldEditValues | null>(null);

    /* ── 필드 편집 상태 ── */
    const [editingField, setEditingField] = useState<string | null>(null);

    /* ── 공통코드 ── */
    const [codeGroups, setCodeGroups]           = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);

    /* 공통코드 로드 */
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes').then(res => {
            setCodeGroups(res.data || []);
        }).catch(() => {}).finally(() => setCodeGroupsLoading(false));
    }, []);

    /* ══════════════════════════════════════════ */
    /*  행 조작                                   */
    /* ══════════════════════════════════════════ */

    const addRow = () =>
        onChange([...rows, { id: uid(), cols: 4, fields: [] }]);

    const removeRow = (rowId: string) => {
        onChange(rows.filter(r => r.id !== rowId));
        if (showFieldPicker === rowId) setShowFieldPicker(null);
    };

    const moveRow = (rowId: string, direction: 'up' | 'down') => {
        const idx = rows.findIndex(r => r.id === rowId);
        const target = direction === 'up' ? idx - 1 : idx + 1;
        if (target < 0 || target >= rows.length) return;
        const next = [...rows];
        [next[idx], next[target]] = [next[target], next[idx]];
        onChange(next);
    };

    const updateRowCols = (rowId: string, cols: 1|2|3|4|5) =>
        onChange(rows.map(r => r.id === rowId ? { ...r, cols } : r));

    /* ══════════════════════════════════════════ */
    /*  필드 조작                                  */
    /* ══════════════════════════════════════════ */

    const removeSearchField = (rowId: string, fieldId: string) => {
        onChange(rows.map(r =>
            r.id === rowId ? { ...r, fields: r.fields.filter(f => f.id !== fieldId) } : r
        ));
        if (editingField === fieldId) setEditingField(null);
    };

    const updateSearchField = (fieldId: string, updates: Partial<SearchFieldConfig>) =>
        onChange(rows.map(r => ({
            ...r,
            fields: r.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
        })));

    const moveFieldInRow = (rowId: string, fieldIdx: number, direction: 'up' | 'down') => {
        const target = direction === 'up' ? fieldIdx - 1 : fieldIdx + 1;
        onChange(rows.map(r => {
            if (r.id !== rowId || target < 0 || target >= r.fields.length) return r;
            const next = [...r.fields];
            [next[fieldIdx], next[target]] = [next[target], next[fieldIdx]];
            return { ...r, fields: next };
        }));
    };

    /* ══════════════════════════════════════════ */
    /*  필드 추가 플로우                            */
    /* ══════════════════════════════════════════ */

    /** 필드 유형 선택 시 pendingValues 초기화 */
    const selectFieldType = (type: SearchFieldType) => {
        const defaultColSpan = FIELD_TYPES.find(t => t.type === type)?.defaultColSpan || 1;
        setPendingType(type);
        setPendingValues({
            label: '',
            label2: '',
            fieldKey: '',
            placeholder: '',
            colSpan: defaultColSpan,
            required: false,
            options: [],
            codeGroupCode: undefined,
            multiSelect: false,
        });
    };

    /** 추가 버튼 비활성화 여부 */
    const isAddDisabled = (): boolean => {
        if (!pendingType || !pendingValues) return true;
        const { label, label2, fieldKey, codeGroupCode, options } = pendingValues;
        if (!label.trim() || !fieldKey.trim()) return true;
        if (pendingType === 'dateRange' && !label2?.trim()) return true;
        if (needsOptions(pendingType)) {
            const hasCodeGroup = !!codeGroupCode;
            const hasOptions = !!options?.some(o => o.trim());
            if (!hasCodeGroup && !hasOptions) return true;
        }
        return false;
    };

    /** 필드 추가 확정 */
    const confirmAddField = () => {
        if (!showFieldPicker || !pendingType || !pendingValues) return;
        if (isAddDisabled()) return;

        const {
            label, label2, fieldKey, placeholder,
            colSpan, required, options, codeGroupCode, multiSelect,
            minLength, maxLength, pattern, patternDesc, minSelect, maxSelect,
        } = pendingValues;

        const newField: SearchFieldConfig = {
            id: uid(),
            type: pendingType,
            label: label.trim(),
            label2: pendingType === 'dateRange' ? label2?.trim() : undefined,
            fieldKey: fieldKey.trim() || undefined,
            placeholder: placeholder?.trim() || (pendingType === 'input' ? '입력하세요' : pendingType === 'select' ? '전체' : ''),
            colSpan: colSpan as 1|2|3|4|5,
            required: required || undefined,
            options: options?.length ? options : undefined,
            codeGroupCode: codeGroupCode || undefined,
            multiSelect: pendingType === 'button' && multiSelect ? true : undefined,
            minLength: pendingType === 'input' && minLength ? minLength : undefined,
            maxLength: pendingType === 'input' && maxLength ? maxLength : undefined,
            pattern: pendingType === 'input' && pattern ? pattern : undefined,
            patternDesc: pendingType === 'input' && patternDesc ? patternDesc : undefined,
            minSelect: pendingType === 'checkbox' && minSelect ? minSelect : undefined,
            maxSelect: pendingType === 'checkbox' && maxSelect ? maxSelect : undefined,
        };

        onChange(rows.map(r =>
            r.id === showFieldPicker ? { ...r, fields: [...r.fields, newField] } : r
        ));
        cancelAddField();
    };

    const cancelAddField = () => {
        setPendingType(null);
        setPendingValues(null);
        setShowFieldPicker(null);
    };

    /* ══════════════════════════════════════════ */
    /*  필드 컴포넌트 렌더 헬퍼                     */
    /* ══════════════════════════════════════════ */

    /**
     * 필드 타입에 맞는 설정 컴포넌트를 렌더링
     * - SearchBuilder는 버튼형 ColSpan (1~5) 사용
     */
    const renderFieldComponent = (
        type: SearchFieldType,
        values: FieldEditValues,
        onChangeFn: (updates: Partial<FieldEditValues>) => void,
        extra?: {
            autoFocus?: boolean;
            onLabelKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
        }
    ) => {
        const props = {
            values,
            onChange: onChangeFn,
            colSpanMode: {
                type: 'button' as const,
                options: [1, 2, 3, 4, 5],
                minSpan: type === 'dateRange' ? 2 : 1,
            },
            codeGroups,
            codeGroupsLoading,
            autoFocus: extra?.autoFocus,
            onLabelKeyDown: extra?.onLabelKeyDown,
        };
        switch (type) {
            case 'input':     return <InputField {...props} />;
            case 'select':    return <SelectField {...props} />;
            case 'date':      return <DateField {...props} />;
            case 'dateRange': return <DateRangeField {...props} />;
            case 'radio':     return <RadioField {...props} />;
            case 'checkbox':  return <CheckboxField {...props} />;
            case 'button':    return <ButtonField {...props} />;
            default:          return null;
        }
    };

    /* ══════════════════════════════════════════ */
    /*  렌더                                      */
    /* ══════════════════════════════════════════ */

    return (
        <div className="space-y-2">
            <DndContext
                sensors={sensors}
                collisionDetection={collisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                accessibility={{ announcements: { onDragStart() { return ''; }, onDragOver() { return ''; }, onDragEnd() { return ''; }, onDragCancel() { return ''; } }, screenReaderInstructions: { draggable: '' } }}
            >
                <SortableContext items={rows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {rows.map((row, ri) => (
                        <SortableRowWrapper key={row.id} id={row.id}>
                            {(rowHandleProps) => (
                                <div className="border border-slate-200 rounded-lg overflow-hidden">
                                    {/* ── 행 헤더 ── */}
                                    <RowHeader
                                        rowIdx={ri}
                                        rowCount={rows.length}
                                        cols={row.cols}
                                        onChangeCols={n => updateRowCols(row.id, n)}
                                        onMoveUp={() => moveRow(row.id, 'up')}
                                        onMoveDown={() => moveRow(row.id, 'down')}
                                        onRemove={() => removeRow(row.id)}
                                        collapsed={collapsedRows.has(row.id)}
                                        onToggleCollapse={() => toggleRowCollapse(row.id)}
                                        dragHandleProps={rowHandleProps}
                                    />

                                    {/* ── 행 내부 (접히면 숨김) ── */}
                                    {!collapsedRows.has(row.id) && (
                                        <div className="p-2 space-y-1.5">
                                            <SortableContext
                                                id={`rc-${row.id}`}
                                                items={row.fields.map(f => f.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {/* 필드 목록 */}
                                                {row.fields.length > 0 ? row.fields.map((field, fi) => (
                                                    <SortableFieldWrapper key={field.id} id={field.id}>
                                                        {(fieldHandleProps) => (
                                                            <div className={`border rounded-md transition-all ${editingField === field.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100'}`}>
                                                                {/* 필드 헤더 */}
                                                                <div className="flex items-center gap-1.5 px-2 py-1.5">
                                                                    <span
                                                                        ref={fieldHandleProps.ref as React.Ref<HTMLSpanElement>}
                                                                        {...Object.fromEntries(Object.entries(fieldHandleProps).filter(([k]) => k !== 'ref')) as React.HTMLAttributes<HTMLSpanElement>}
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 px-1 rounded hover:bg-slate-100"
                                                                    >
                                                                        <GripVertical className="w-3 h-3 text-slate-400" />
                                                                    </span>
                                                                    <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{field.type}</span>
                                                                    <span className="text-[11px] font-medium text-slate-700 truncate flex-1">
                                                                        {field.type === 'dateRange' ? `${field.label} ~ ${field.label2 || ''}` : field.label}
                                                                    </span>
                                                                    {field.required && <span className="text-red-500 text-[10px] font-bold">*</span>}
                                                                    {field.colSpan > 1 && <span className="text-[10px] text-slate-400">×{field.colSpan}</span>}
                                                                    <div className="flex items-center gap-0.5">
                                                                        <button onClick={() => moveFieldInRow(row.id, fi, 'up')} disabled={fi === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                                                        <button onClick={() => moveFieldInRow(row.id, fi, 'down')} disabled={fi === row.fields.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                                                        <button onClick={() => setEditingField(editingField === field.id ? null : field.id)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><Pencil className="w-3 h-3" /></button>
                                                                        <button onClick={() => removeSearchField(row.id, field.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                                    </div>
                                                                </div>

                                                                {/* 필드 편집 패널 — 필드 컴포넌트 재사용 */}
                                                                {editingField === field.id && (
                                                                    <div className="px-2 pb-1.5 pt-1 space-y-1.5 border-t border-slate-100">
                                                                        {renderFieldComponent(
                                                                            field.type,
                                                                            {
                                                                                label:         field.label,
                                                                                label2:        field.label2,
                                                                                fieldKey:      field.fieldKey || '',
                                                                                colSpan:       field.colSpan,
                                                                                placeholder:   field.placeholder,
                                                                                required:      field.required,
                                                                                options:       field.options,
                                                                                codeGroupCode: field.codeGroupCode,
                                                                                multiSelect:   field.multiSelect,
                                                                                minLength:     field.minLength,
                                                                                maxLength:     field.maxLength,
                                                                                pattern:       field.pattern,
                                                                                patternDesc:   field.patternDesc,
                                                                                minSelect:     field.minSelect,
                                                                                maxSelect:     field.maxSelect,
                                                                            },
                                                                            updates => updateSearchField(field.id, updates as Partial<SearchFieldConfig>)
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </SortableFieldWrapper>
                                                )) : (
                                                    <EmptyFieldDropZone rowId={row.id} />
                                                )}
                                            </SortableContext>

                                            {/* 필드 추가 */}
                                            {showFieldPicker === row.id ? (
                                                <div className="border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50">
                                                    {pendingType && pendingValues ? (
                                                        <div className="p-2 space-y-2">
                                                            {/* 헤더 */}
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{pendingType}</span>
                                                                    <span className="text-[10px] font-semibold text-slate-500">필드 설정</span>
                                                                </div>
                                                                <button onClick={cancelAddField} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                                            </div>

                                                            {/* 필드 추가 패널 — 필드 컴포넌트 재사용 */}
                                                            {renderFieldComponent(
                                                                pendingType,
                                                                pendingValues,
                                                                updates => setPendingValues(prev => prev ? { ...prev, ...updates } : prev),
                                                                {
                                                                    autoFocus: true,
                                                                    onLabelKeyDown: e => {
                                                                        if (e.key === 'Enter' && pendingType !== 'dateRange') confirmAddField();
                                                                        if (e.key === 'Escape') cancelAddField();
                                                                    },
                                                                }
                                                            )}

                                                            {/* 취소 | 추가 버튼 */}
                                                            <div className="flex gap-1.5">
                                                                <button onClick={cancelAddField} className="px-3 py-2 border border-slate-200 text-slate-500 text-xs rounded-md hover:bg-slate-50 transition-all">취소</button>
                                                                <button
                                                                    onClick={confirmAddField}
                                                                    disabled={isAddDisabled()}
                                                                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-md transition-all"
                                                                >
                                                                    추가
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        /* 필드 유형 선택 */
                                                        <FieldPickerTypeList
                                                            types={FIELD_TYPES}
                                                            onSelect={type => selectFieldType(type as SearchFieldType)}
                                                            onCancel={() => setShowFieldPicker(null)}
                                                        />
                                                    )}
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => { setShowFieldPicker(row.id); setPendingType(null); }}
                                                    className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                                                >
                                                    <Plus className="w-3 h-3" />필드 추가
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </SortableRowWrapper>
                    ))}
                </SortableContext>
            </DndContext>

            {/* 행 추가 버튼 */}
            <button
                onClick={addRow}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
            >
                <Plus className="w-3.5 h-3.5" />행 추가
            </button>
        </div>
    );
}
