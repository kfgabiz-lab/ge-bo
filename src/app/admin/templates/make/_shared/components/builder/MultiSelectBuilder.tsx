'use client';

/**
 * MultiSelectBuilder — 다중선택(MultiSelect) 위젯 설정 빌더 공통 컴포넌트
 *
 * 설정 항목:
 *   - contentKey    : dataJson 저장 키 (영문 필수)
 *   - connectedSlug : 옵션 목록을 가져올 slug
 *   - sourceSlug    : 호출 slug
 *   - title         : 위젯 상단 타이틀
 *   - description   : 타이틀 아래 설명
 *   - labelFields   : 표시 필드 — 쉼표 구분, ' > ' 연결 (예: "name,dept")
 *   - showBorder    : 테두리 표시 여부
 *   - bgColor       : 바탕색
 *   - extraFields   : 선택 항목별 추가 입력 필드 목록 (DnD 순서 변경 / 추가 / 삭제)
 *
 * 사용법:
 *   <MultiSelectBuilder widget={widget} onChange={setWidget} slugOptions={slugOptions} />
 */

import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Plus, GripVertical, Pencil, X } from 'lucide-react';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { useBuilderI18nMode } from '../../contexts/BuilderI18nModeContext';
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
import { SlugSelectField } from './fields';
import { ExtraSimpleInputField, ExtraSimpleSelectField } from './fields';
import type { ExtraSimpleInputFieldValues } from './fields';
import type { ExtraSimpleSelectFieldValues } from './fields';
import type { SlugOption } from './fields';
import { FieldPickerTypeList, FieldTypeItem } from '../FieldPickerTypeList';
import { BG_COLOR_OPTIONS } from './SpaceBuilder';
import { createIdGenerator } from '../../utils';
import type { CodeGroupDef } from '../../types';
import type { MultiSelectWidget, MultiSelectExtraField, MultiSelectExtraFieldType } from '../renderer/types';
import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';
import { getConnFieldOptions, resolveEntityId, type ConnMode } from './connFieldOptions';
import { useEntityFields } from '../../hooks/useEntityFields';

const uid = createIdGenerator('ef');

/* ── extraField 타입 선택 목록 (FieldPickerTypeList에 전달) ── */
const EXTRA_FIELD_TYPES: FieldTypeItem[] = [
    { type: 'input',    label: 'Input',    desc: '텍스트 입력' },
    { type: 'date',     label: 'Date',     desc: '날짜 입력' },
    { type: 'select',   label: 'Select',   desc: '셀렉트 박스' },
    { type: 'radio',    label: 'Radio',    desc: '라디오 버튼' },
    { type: 'checkbox', label: 'Checkbox', desc: '체크박스' },
];

/* ── 타입별 배지 색상 ── */
const TYPE_BADGE_CLS: Record<MultiSelectExtraFieldType, string> = {
    input:    'bg-blue-50 text-blue-600',
    date:     'bg-green-50 text-green-600',
    select:   'bg-purple-50 text-purple-600',
    radio:    'bg-orange-50 text-orange-600',
    checkbox: 'bg-pink-50 text-pink-600',
};

/* ══════════════════════════════════════════════════════════ */
/*  SortableExtraFieldItem — 드래그 가능한 extraField 행      */
/* ══════════════════════════════════════════════════════════ */

function SortableExtraFieldItem({
    field, idx, isEditing, onToggleEdit, onRemove, children,
}: {
    field: MultiSelectExtraField;
    idx: number;
    isEditing: boolean;
    onToggleEdit: () => void;
    onRemove: () => void;
    children: React.ReactNode;
}) {
    const {
        attributes, listeners, setNodeRef, setActivatorNodeRef,
        transform, transition, isDragging,
    } = useSortable({ id: field.id });

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
            {/* 헤더 행 */}
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
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${TYPE_BADGE_CLS[field.type]}`}>
                    {field.type}
                </span>
                <span className="text-xs text-slate-700 flex-1 truncate">
                    {field.label || <span className="text-slate-300 italic">라벨 없음</span>}
                    {field.key && <span className="ml-1.5 text-[10px] text-slate-400">({field.key})</span>}
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

/* ══════════════════════════════════════════════════════════ */
/*  ExtraFieldEditPanel — 타입별 편집 패널                    */
/* ══════════════════════════════════════════════════════════ */

function ExtraFieldEditPanel({
    field, onChange, codeGroups, codeGroupsLoading, slugEntityFields,
}: {
    field: MultiSelectExtraField;
    onChange: (patch: Partial<MultiSelectExtraField>) => void;
    codeGroups: CodeGroupDef[];
    codeGroupsLoading: boolean;
    /** Slug Entity 필드 목록 — 있으면 추가 필드 Key 입력이 selectbox로 전환됨 (widget 빌더 전용) */
    slugEntityFields?: SlugEntityFieldItem[];
}) {
    /* ExtraSimpleInputField용 values 변환 */
    const inputValues: ExtraSimpleInputFieldValues = {
        label:            field.label,
        labelMsgKey:      field.labelMsgKey,
        fieldKey:         field.key,           // key=사용자 입력 저장키, 빈 값으로 시작
        placeholder:      field.placeholder,
        placeholderMsgKey: field.placeholderMsgKey,
        required:         field.required,
    };

    /* ExtraSimpleSelectField용 values 변환 */
    const selectValues: ExtraSimpleSelectFieldValues = {
        label:         field.label,
        labelMsgKey:   field.labelMsgKey,
        fieldKey:      field.key,              // key=사용자 입력 저장키, 빈 값으로 시작
        options:       field.options,
        codeGroupCode: field.codeGroupCode,
        required:      field.required,
    };

    /* 타입별 편집 본문 — input/date: ExtraSimpleInputField, 그 외: ExtraSimpleSelectField */
    const body = (field.type === 'input' || field.type === 'date') ? (
        <ExtraSimpleInputField
            values={inputValues}
            onChange={updates => onChange({
                ...(updates.label             !== undefined && { label:             updates.label }),
                ...(updates.labelMsgKey       !== undefined && { labelMsgKey:       updates.labelMsgKey }),
                ...(updates.fieldKey          !== undefined && { key:               updates.fieldKey }),
                ...(updates.placeholder       !== undefined && { placeholder:       updates.placeholder }),
                ...(updates.placeholderMsgKey !== undefined && { placeholderMsgKey: updates.placeholderMsgKey }),
                ...(updates.required          !== undefined && { required:          updates.required }),
            })}
            slugEntityFields={slugEntityFields}
        />
    ) : (
        <ExtraSimpleSelectField
            values={selectValues}
            onChange={updates => onChange({
                ...(updates.label         !== undefined && { label:         updates.label }),
                ...(updates.labelMsgKey   !== undefined && { labelMsgKey:   updates.labelMsgKey }),
                ...(updates.fieldKey      !== undefined && { key:           updates.fieldKey }),
                ...(updates.options       !== undefined && { options:       updates.options }),
                ...(updates.codeGroupCode !== undefined && { codeGroupCode: updates.codeGroupCode }),
                ...(updates.required      !== undefined && { required:      updates.required }),
            })}
            codeGroups={codeGroups}
            codeGroupsLoading={codeGroupsLoading}
            slugEntityFields={slugEntityFields}
        />
    );

    /* 표시 위치(좌/우) select — 타입 공통, 항목명 기준 좌/우 배치 */
    const positionSelect = (
        <div>
            <label className={LABEL_CLS}>표시 위치</label>
            <select
                value={field.position ?? 'right'}
                onChange={e => onChange({ position: e.target.value as 'left' | 'right' })}
                className={INPUT_CLS}
            >
                <option value="right">오른쪽</option>
                <option value="left">왼쪽</option>
            </select>
        </div>
    );

    return <>{body}{positionSelect}</>;
}

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                               */
/* ══════════════════════════════════════════ */

interface MultiSelectBuilderProps {
    widget: MultiSelectWidget;
    onChange: (w: MultiSelectWidget) => void;
    slugOptions: SlugOption[];
    /** @deprecated 더 이상 MultiSelectBuilder 내부에서 직접 사용하지 않음 — widget.connectedSlug(이 MultiSelect의 연결 Entity) 기준으로
     *  useEntityFields 훅을 통해 자체적으로 재조회한다(contentEntityFields). CommonBuilderDispatcher 호환을 위해 타입만 유지. */
    slugEntityFields?: SlugEntityFieldItem[];
    /** "연결 Slug" 필드의 라벨 override — entity/data 연결 모드일 때 "연결 Entity"로 표시 */
    connLabel?: string;
    /** "연결 Slug" 필드의 기본값 — entity/data 연결 모드일 때 선택된 연결 Entity(slug) 값 */
    connDefaultSlug?: string;
    /** "연결 Slug" 필드가 따를 연결 모드 — 'entity'면 entity 연결된 slug만, 'data'면 dataEntityOptions를 옵션으로 사용 */
    connMode?: ConnMode;
    /** Data Entity 타입 전용 — connMode==='data'일 때 "연결 Slug" 옵션 소스 */
    dataEntityOptions?: SlugOption[];
}

export function MultiSelectBuilder({ widget, onChange, slugOptions, connLabel, connDefaultSlug, connMode, dataEntityOptions = [] }: MultiSelectBuilderProps) {
    /* "연결 Slug" 필드 옵션·표시 포맷 — entity/data/none 3-way 공통 헬퍼로 계산 */
    const connFieldOptions = getConnFieldOptions(connMode, slugOptions, dataEntityOptions);

    /* ── 이 컨텐츠(MultiSelect)가 실제로 연결된 Entity 기준 필드 목록 ──
       widget.connectedSlug(이 MultiSelect 자체의 연결 Entity)가 없으면 위젯 최상위 연결 Entity(connDefaultSlug)로 자연 폴백한다.
       추가 입력 필드 Key selectbox 옵션은 위젯 최상위가 아니라 이 값을 기준으로 구성해야 한다. */
    const effectiveSlug = widget.connectedSlug || connDefaultSlug;
    const entityId = resolveEntityId(effectiveSlug, connMode, slugOptions, dataEntityOptions);
    const contentEntityFields = useEntityFields(entityId);

    const { i18nMode } = useBuilderI18nMode();
    const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
    const [showPicker, setShowPicker]         = useState(false);

    /* 공통코드 목록 — SubListBuilder와 동일한 패턴 */
    const [codeGroups, setCodeGroups]             = useState<CodeGroupDef[]>([]);
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

    const extraFields = widget.extraFields ?? [];

    /* ── 추가 필드 추가 ── */
    const addExtraField = (type: MultiSelectExtraFieldType) => {
        const newField: MultiSelectExtraField = {
            id:       uid(),   // DnD 내부 식별자 (자동생성)
            key:      '',      // 저장 키 — 사용자 입력 (빈 값으로 시작)
            type,
            label:    '',
            required: false,
        };
        onChange({ ...widget, extraFields: [...extraFields, newField] });
        setEditingFieldId(newField.id);
        setShowPicker(false);
    };

    /* ── 추가 필드 삭제 ── */
    const removeExtraField = (id: string) =>
        onChange({ ...widget, extraFields: extraFields.filter(f => f.id !== id) });

    /* ── 추가 필드 수정 ── */
    const updateExtraField = (id: string, patch: Partial<MultiSelectExtraField>) =>
        onChange({ ...widget, extraFields: extraFields.map(f => f.id === id ? { ...f, ...patch } : f) });

    /* ── DnD 재정렬 ── */
    const handleDragEnd = (event: any) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;
        const oldIdx = extraFields.findIndex(f => f.id === active.id);
        const newIdx = extraFields.findIndex(f => f.id === over.id);
        onChange({ ...widget, extraFields: arrayMove(extraFields, oldIdx, newIdx) });
    };

    return (
        <div className="space-y-5 pt-1">

            {/* ── 기본 설정 ── */}
            <section className="space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">기본 설정</h4>

                {/* Key | 연결 Slug */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>Key <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={widget.contentKey}
                            onChange={e => onChange({ ...widget, contentKey: e.target.value })}
                            placeholder="예: multiSelect1 (페이지 내 고유)"
                            className={INPUT_CLS}
                        />
                    </div>
                    <SlugSelectField
                        label={connLabel}
                        value={widget.connectedSlug ?? connDefaultSlug ?? ''}
                        onChange={slug => onChange({ ...widget, connectedSlug: slug })}
                        slugOptions={connFieldOptions.options}
                        formatDisplay={connFieldOptions.formatDisplay}
                    />
                </div>

                {/* 호출 Slug */}
                <SlugSelectField
                    label="호출 Slug"
                    value={widget.sourceSlug ?? ''}
                    onChange={slug => onChange({ ...widget, sourceSlug: slug })}
                    slugOptions={slugOptions}
                />

                {/* 호출 Slug 옵션 필터 — evalConditionExpr 문법 재사용 (선택) */}
                <div>
                    <label className={LABEL_CLS}>옵션 필터 <span className="text-slate-300 font-normal">(선택)</span></label>
                    <input
                        type="text"
                        value={widget.sourceFilter ?? ''}
                        onChange={e => onChange({ ...widget, sourceFilter: e.target.value || undefined })}
                        placeholder="예: status=1,type=Y"
                        className={INPUT_CLS}
                    />
                </div>

                {/* 표시 필드 */}
                <div>
                    <label className={LABEL_CLS}>표시 필드 <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.labelFields ?? ''}
                        onChange={e => onChange({ ...widget, labelFields: e.target.value })}
                        placeholder="예: name,dept (쉼표 구분)"
                        className={INPUT_CLS}
                    />
                </div>

                {/* 타이틀 | 설명 */}
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>타이틀</label>
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
                                placeholder="예: 담당자 선택"
                                className={INPUT_CLS}
                            />
                        )}
                    </div>
                    <div>
                        <label className={LABEL_CLS}>설명</label>
                        {i18nMode ? (
                            <MessageKeySelector
                                value={widget.descriptionMsgKey ?? ''}
                                onChange={key => onChange({ ...widget, descriptionMsgKey: key || undefined })}
                                resourceType="SENTENCE"
                                size="sm"
                            />
                        ) : (
                            <input
                                type="text"
                                value={widget.description ?? ''}
                                onChange={e => onChange({ ...widget, description: e.target.value || undefined })}
                                placeholder="예: 복수 선택 가능"
                                className={INPUT_CLS}
                            />
                        )}
                    </div>
                </div>

                {/* Placeholder */}
                <div>
                    <label className={LABEL_CLS}>Placeholder</label>
                    {i18nMode ? (
                        <MessageKeySelector
                            value={widget.placeholderMsgKey ?? ''}
                            onChange={key => onChange({ ...widget, placeholderMsgKey: key || undefined })}
                            size="sm"
                        />
                    ) : (
                        <input
                            type="text"
                            value={widget.placeholder ?? ''}
                            onChange={e => onChange({ ...widget, placeholder: e.target.value || undefined })}
                            placeholder="예: 항목을 선택하세요"
                            className={INPUT_CLS}
                        />
                    )}
                </div>

                {/* 테두리 | 바탕색 */}
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
            </section>

            {/* ── 추가 입력 필드 목록 ── */}
            <section className="space-y-2">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
                    추가 입력 필드 ({extraFields.length}개)
                </h4>
                <p className="text-[10px] text-slate-400">선택된 항목 옆에 인라인으로 표시되는 입력 필드를 설정합니다.</p>

                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={extraFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-1">
                            {extraFields.map((field, idx) => (
                                <SortableExtraFieldItem
                                    key={field.id}
                                    field={field}
                                    idx={idx}
                                    isEditing={editingFieldId === field.id}
                                    onToggleEdit={() => setEditingFieldId(editingFieldId === field.id ? null : field.id)}
                                    onRemove={() => removeExtraField(field.id)}
                                >
                                    <ExtraFieldEditPanel
                                        field={field}
                                        onChange={patch => updateExtraField(field.id, patch)}
                                        codeGroups={codeGroups}
                                        codeGroupsLoading={codeGroupsLoading}
                                        slugEntityFields={contentEntityFields}
                                    />
                                </SortableExtraFieldItem>
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {/* 필드 추가 — FieldPickerTypeList */}
                {showPicker ? (
                    <div className="border border-slate-200 rounded-md p-2 bg-slate-50/50">
                        <FieldPickerTypeList
                            types={EXTRA_FIELD_TYPES}
                            onSelect={type => addExtraField(type as MultiSelectExtraFieldType)}
                            onCancel={() => setShowPicker(false)}
                        />
                    </div>
                ) : (
                    <button
                        onClick={() => setShowPicker(true)}
                        className="w-full flex items-center justify-center gap-1 py-1.5 border border-dashed border-blue-200 rounded text-[10px] text-blue-500 hover:border-blue-400 hover:bg-blue-50 transition-all font-medium"
                    >
                        <Plus className="w-3 h-3" />추가 필드 추가
                    </button>
                )}
            </section>

        </div>
    );
}
