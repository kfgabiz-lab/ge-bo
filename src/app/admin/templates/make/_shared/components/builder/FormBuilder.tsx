'use client';

/**
 * FormBuilder — 폼 위젯 필드 설정 빌더 공통 컴포넌트
 *
 * widget/page.tsx FormWidgetPanel을 추출하여 재사용 가능하게 만든 컴포넌트.
 * - SearchBuilder와 동일한 즉시 반영 방식 (타입 선택 → 즉시 추가 → 인라인 편집)
 * - 필드 설정은 builder/fields/* 컴포넌트 재사용 (InputField, SelectField 등)
 *
 * 사용법:
 *   <FormBuilder widget={formWidget} onChange={setFormWidget} slugOptions={slugOptions} />
 */

import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Pencil, X } from 'lucide-react';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors,
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api';
import { CodeGroupDef } from '../../types';
import { SearchFieldType, SearchFieldConfig } from '../SearchBuilder';
import { FieldPickerTypeList, FieldTypeItem } from '../FieldPickerTypeList';
import { createIdGenerator } from '../../utils';
import {
    InputField, SelectField, DateField, DateRangeField,
    RadioField, CheckboxField, ButtonField,
    FileField, ImageField, VideoField,
} from './fields';
import type { FieldEditValues } from './fields';
// SpaceBuilder와 동일한 스타일 유틸 재사용
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import { BG_COLOR_OPTIONS } from './SpaceBuilder';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 폼 위젯의 개별 필드 — SearchFieldConfig에 rowSpan 추가 */
export interface FormFieldItem extends Omit<SearchFieldConfig, 'colSpan'> {
    colSpan: number;    // 1~12 (12칸 그리드)
    rowSpan: number;    // 1~20 (행 높이 배수)
}

/** 폼 위젯 — 플랫 필드 목록 (row 개념 없음, 각 필드 col/row 개별 지정) */
export interface FormWidget {
    type: 'form';
    widgetId: string;
    contentKey: string;
    title?: string;             // 폼 섹션 타이틀 (예: 권한 및 보안)
    description?: string;       // 타이틀 아래 설명 (예: 필수 입력 항목은 * 로 표시됩니다.)
    showBorder?: boolean;       // 테두리 표시 여부 (기본 true)
    bgColor?: string;           // 바탕색 (기본 none)
    connectedSlug?: string;     // 연결 slug (API 엔드포인트 연동 대상)
    fields: FormFieldItem[];
}

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

/** Form 위젯 지원 필드 타입 */
const FORM_FIELD_TYPES: FieldTypeItem[] = [
    { type: 'input',     label: 'Input',      desc: '텍스트 입력',         defaultColSpan: 1 },
    { type: 'select',    label: 'Select',     desc: '셀렉트 박스',         defaultColSpan: 1 },
    { type: 'date',      label: 'Date',       desc: '날짜 단독',           defaultColSpan: 1 },
    { type: 'dateRange', label: 'Date Range', desc: '날짜 범위 (from~to)', defaultColSpan: 2 },
    { type: 'radio',     label: 'Radio',      desc: '라디오 단일선택',     defaultColSpan: 1 },
    { type: 'checkbox',  label: 'Checkbox',   desc: '체크박스 복수선택',   defaultColSpan: 1 },
    { type: 'button',    label: 'Button',     desc: '선택 버튼',           defaultColSpan: 1 },
    { type: 'file',      label: 'File',       desc: '파일 업로드',         defaultColSpan: 2 },
    { type: 'image',     label: 'Image',      desc: '이미지 등록',         defaultColSpan: 2 },
    { type: 'video',     label: 'Video',      desc: 'URL · 파일 업로드',   defaultColSpan: 2 },
];

const uid = createIdGenerator('fb');

/* ══════════════════════════════════════════ */
/*  SortableFormField — 드래그 가능한 필드 행  */
/* ══════════════════════════════════════════ */

/**
 * 드래그 가능한 폼 필드 행 — accordion 방식
 * 연필 클릭 시 하단 편집 패널 토글 (닫기 버튼 없음)
 */
function SortableFormField({
    field, isEditing, onToggleEdit, onRemove, children,
}: {
    field: FormFieldItem;
    isEditing: boolean;
    onToggleEdit: () => void;
    onRemove: () => void;
    children?: React.ReactNode;
}) {
    const {
        attributes, listeners, setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging,
    } = useSortable({ id: field.id });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
            className={`border rounded-md transition-all bg-white ${isEditing ? 'border-slate-900' : 'border-slate-200'}`}
        >
            {/* 필드 헤더 */}
            <div className="flex items-center gap-1.5 px-2 py-1.5">
                <span
                    ref={setActivatorNodeRef}
                    {...listeners}
                    {...attributes}
                    className="cursor-grab text-slate-300 hover:text-slate-500 flex-shrink-0"
                >
                    <GripVertical className="w-3 h-3" />
                </span>
                {/* 타입 배지 */}
                <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded font-mono flex-shrink-0">{field.type}</span>
                {/* 라벨 */}
                <span className="text-[11px] font-medium text-slate-700 truncate flex-1">
                    {field.type === 'dateRange'
                        ? `${field.label || ''} ~ ${field.label2 || ''}`
                        : (field.label || <span className="italic text-slate-300">라벨 없음</span>)
                    }
                </span>
                {field.required && <span className="text-red-500 text-[10px] flex-shrink-0">*</span>}
                <span className="text-[10px] text-slate-400 flex-shrink-0">{field.colSpan ?? 1}×{field.rowSpan ?? 1}</span>
                {/* 연필 클릭 → 편집 패널 토글 */}
                <button
                    onClick={onToggleEdit}
                    className={`p-1 rounded flex-shrink-0 transition-colors ${isEditing ? 'text-slate-900 bg-slate-100' : 'text-slate-300 hover:text-blue-500'}`}
                >
                    <Pencil className="w-3 h-3" />
                </button>
                <button
                    onClick={onRemove}
                    className="p-1 rounded text-slate-300 hover:text-red-400 flex-shrink-0 transition-colors"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>

            {/* 편집 패널 — 연필 토글 시 accordion 방식으로 펼쳐짐 */}
            {isEditing && (
                <div className="px-2 pb-2 pt-1 border-t border-slate-100 space-y-2">
                    {children}
                </div>
            )}
        </div>
    );
}

/* ══════════════════════════════════════════ */
/*  FormBuilder 메인 컴포넌트                   */
/* ══════════════════════════════════════════ */

interface FormBuilderProps {
    widget: FormWidget;
    onChange: (w: FormWidget) => void;
    slugOptions: { id: number; slug: string; name: string }[];
    /** 필드 ColSpan 최대값 (기본 12, 우측 드로어 등 좁은 공간에서 2로 제한) */
    maxColSpan?: number;
}

/** Form 위젯 필드 설정 빌더 */
export function FormBuilder({ widget, onChange, slugOptions, maxColSpan = 12 }: FormBuilderProps) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    /* 공통코드 목록 */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes')
            .then(res => setCodeGroups(res.data || []))
            .catch(() => { })
            .finally(() => setCodeGroupsLoading(false));
    }, []);

    /* 편집 상태 — 현재 펼쳐진 필드 ID */
    const [editingId, setEditingId] = useState<string | null>(null);
    /* 타입 선택 피커 표시 여부 */
    const [showPicker, setShowPicker] = useState(false);

    /**
     * 필드 값 즉시 업데이트 — SearchBuilder의 updateSearchField와 동일 패턴
     * 변경 즉시 onChange 호출 → widgetItems 갱신 → 템플릿 저장 시 최신값 반영
     */
    const updateField = (fieldId: string, updates: Partial<FormFieldItem>) => {
        onChange({
            ...widget,
            fields: widget.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
        });
    };

    /** 타입 선택 → 기본 필드 즉시 추가 → 인라인 편집 모드 진입 */
    const selectType = (type: string) => {
        const meta = FORM_FIELD_TYPES.find(t => t.type === type);
        const newField: FormFieldItem = {
            id: uid(),
            type: type as SearchFieldType,
            label: '',
            fieldKey: '',
            colSpan: meta?.defaultColSpan ?? 1,
            rowSpan: 1,
        };
        onChange({ ...widget, fields: [...widget.fields, newField] });
        setEditingId(newField.id);
        setShowPicker(false);
    };

    /** 드래그 재정렬 */
    const handleDragEnd = (event: import('@dnd-kit/core').DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = widget.fields.findIndex(f => f.id === active.id);
        const newIdx = widget.fields.findIndex(f => f.id === over.id);
        onChange({ ...widget, fields: arrayMove(widget.fields, oldIdx, newIdx) });
    };

    /**
     * 필드 타입에 맞는 설정 컴포넌트를 렌더링
     * - FormBuilder는 숫자입력형 ColSpan (1~12) + RowSpan (1~20) 사용
     */
    const renderFieldComponent = (f: FormFieldItem) => {
        const props = {
            values: {
                label:         f.label || '',
                label2:        f.label2,
                fieldKey:      f.fieldKey || '',
                colSpan:       f.colSpan,
                rowSpan:       f.rowSpan,
                placeholder:   f.placeholder,
                required:      f.required,
                options:       f.options,
                codeGroupCode: f.codeGroupCode,
                multiSelect:   f.multiSelect,
                minLength:     f.minLength,
                maxLength:     f.maxLength,
                pattern:       f.pattern,
                patternDesc:   f.patternDesc,
                minSelect:     f.minSelect,
                maxSelect:     f.maxSelect,
                isPk:          f.isPk,
                readonly:      f.readonly,
                maxFileCount:      f.maxFileCount,
                maxFileSizeMB:     f.maxFileSizeMB,
                maxTotalSizeMB:    f.maxTotalSizeMB,
                fileTypeMode:      f.fileTypeMode,
                allowedExtensions: f.allowedExtensions,
                videoMode:         f.videoMode,
            } satisfies FieldEditValues,
            onChange: (updates: Partial<FieldEditValues>) =>
                updateField(f.id, updates as Partial<FormFieldItem>),
            /* Form: 숫자 입력형 ColSpan (max는 prop으로 제어, 기본 12) */
            colSpanMode: { type: 'input' as const, min: 1, max: maxColSpan },
            /* RowSpan: 1~20 배수 */
            rowSpanConfig: { min: 1, max: 20 },
            codeGroups,
            codeGroupsLoading,
        };

        switch (f.type) {
            case 'input':     return <InputField {...props} />;
            case 'select':    return <SelectField {...props} />;
            case 'date':      return <DateField {...props} />;
            case 'dateRange': return <DateRangeField {...props} />;
            case 'radio':     return <RadioField {...props} />;
            case 'checkbox':  return <CheckboxField {...props} />;
            case 'button':    return <ButtonField {...props} />;
            case 'file':      return <FileField {...props} />;
            case 'image':     return <ImageField {...props} />;
            case 'video':     return <VideoField {...props} />;
            default:          return null;
        }
    };

    /* ── 렌더 ── */
    return (
        <div className="space-y-2 pt-1">
            {/* Key * | 연결 slug — 2열 그리드 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.contentKey}
                        onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                        placeholder="예: registerForm"
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">연결 slug</label>
                    <select
                        value={widget.connectedSlug ?? ''}
                        onChange={e => onChange({ ...widget, connectedSlug: e.target.value || undefined })}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900 bg-white"
                    >
                        <option value="">선택</option>
                        {slugOptions.map(s => (
                            <option key={s.id} value={s.slug}>{s.slug} ({s.name})</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* 타이틀 + 설명 — 1행 안에 함께 표시됨 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">타이틀</label>
                    <input
                        type="text"
                        value={widget.title ?? ''}
                        onChange={e => onChange({ ...widget, title: e.target.value || undefined })}
                        placeholder="예: 권한 및 보안"
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                    />
                </div>
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">설명</label>
                    <input
                        type="text"
                        value={widget.description ?? ''}
                        onChange={e => onChange({ ...widget, description: e.target.value || undefined })}
                        placeholder="예: 필수 항목은 * 로 표시됩니다."
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                    />
                </div>
            </div>

            {/* 테두리 유무 | 바탕색 — SpaceBuilder와 동일 패턴 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className={LABEL_CLS}>테두리</label>
                    <ToggleRow
                        label={widget.showBorder ?? true ? '표시' : '숨김'}
                        value={widget.showBorder ?? true}
                        onChange={v => onChange({ ...widget, showBorder: v })}
                    />
                </div>
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

            {/* 필드 목록 (드래그 재정렬) — accordion 구조 */}
            {widget.fields.length > 0 && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={widget.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {widget.fields.map(f => (
                                <SortableFormField
                                    key={f.id}
                                    field={f}
                                    isEditing={editingId === f.id}
                                    onToggleEdit={() => {
                                        setEditingId(editingId === f.id ? null : f.id);
                                        setShowPicker(false);
                                    }}
                                    onRemove={() => onChange({ ...widget, fields: widget.fields.filter(ff => ff.id !== f.id) })}
                                >
                                    {/* 편집 패널 — 필드 컴포넌트 재사용 */}
                                    {editingId === f.id && renderFieldComponent(f)}
                                </SortableFormField>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}

            {/* 필드 추가 */}
            {!editingId && (
                showPicker ? (
                    <div className="border border-slate-200 rounded-md p-2 bg-slate-50/50">
                        <FieldPickerTypeList
                            types={FORM_FIELD_TYPES}
                            onSelect={selectType}
                            onCancel={() => setShowPicker(false)}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowPicker(true)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-slate-200 rounded text-[10px] text-slate-400 hover:border-slate-400 hover:text-slate-600 transition-all"
                    >
                        <Plus className="w-3 h-3" />필드 추가
                    </button>
                )
            )}
        </div>
    );
}
