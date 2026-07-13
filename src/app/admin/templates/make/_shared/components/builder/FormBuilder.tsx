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
import { useSlugRelations } from '../../hooks/useSlugRelations';
import { useI18n } from '@/hooks/use-i18n';
import { Plus, GripVertical, Pencil, X, Globe } from 'lucide-react';
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
import api from '@/lib/api';
import { CodeGroupDef } from '../../types';
import { SearchFieldType, SearchFieldConfig } from '../SearchBuilder';
import { FieldPickerTypeList, FieldTypeItem } from '../FieldPickerTypeList';
import { createIdGenerator } from '../../utils';
import { buildFormFromEntity } from '../../utils/entityBuild';
import { EntityBuildButton } from './EntityBuildButton';
import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';
import {
    InputField, TextField, SelectField, DateField, DateRangeField,
    RadioField, CheckboxField, ButtonField,
    EditorField, FileField, ImageField, VideoField, MediaField,
    FormTextareaField, TimeField,
    SlugSelectField,
} from './fields';
import type { FieldEditValues, SlugOption } from './fields';
// SpaceBuilder와 동일한 스타일 유틸 재사용
import { LABEL_CLS, INPUT_CLS } from './fields/_FieldBase';
import { ToggleRow } from './fields/_ToggleRow';
import { BG_COLOR_OPTIONS } from './SpaceBuilder';
import { getConnFieldOptions, resolveEntityId, type ConnMode } from './connFieldOptions';
import { useEntityFields } from '../../hooks/useEntityFields';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 폼 위젯의 개별 필드 — SearchFieldConfig에 rowSpan 추가 */
export interface FormFieldItem extends Omit<SearchFieldConfig, 'colSpan'> {
    colSpan: number;        // 1~12 (12칸 그리드)
    rowSpan: number;        // 1~30 (행 높이 배수)
    hideCondition?: string;    // 동적 HIDE 조건 (예: "status=1,type=Y")
    disableCondition?: string; // 동적 Disable 조건 (예: "status=1,type=Y")
}

/** 폼 위젯 — 플랫 필드 목록 (row 개념 없음, 각 필드 col/row 개별 지정) */
export interface FormWidget {    type: 'form';
    widgetId: string;
    contentKey: string;
    title?: string;             // 폼 섹션 타이틀 (예: 권한 및 보안)
    titleMsgKey?: string;       // 타이틀 다국어 키
    description?: string;       // 타이틀 아래 설명 (예: 필수 입력 항목은 * 로 표시됩니다.)
    descriptionMsgKey?: string; // 설명 다국어 키
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
    { type: 'input',          label: 'Input',            desc: '텍스트 입력',              defaultColSpan: 1 },
    { type: 'text',           label: 'Text',             desc: '연결 Slug 값 표시',        defaultColSpan: 1 },
    { type: 'select',         label: 'Select',           desc: '셀렉트 박스',              defaultColSpan: 1 },
    { type: 'date',           label: 'Date',             desc: '날짜/년월/일시 단독',      defaultColSpan: 1 },
    { type: 'dateRange',      label: 'Date Range',       desc: '날짜/년월/일시/시간 범위', defaultColSpan: 2 },
    { type: 'radio',          label: 'Radio',            desc: '라디오 단일선택',          defaultColSpan: 1 },
    { type: 'checkbox',       label: 'Checkbox',         desc: '체크박스 복수선택',        defaultColSpan: 1 },
    { type: 'button',         label: 'Button',           desc: '선택 버튼',                defaultColSpan: 1 },
    { type: 'editor',         label: 'Editor',           desc: '위지윅 에디터',            defaultColSpan: 2 },
    { type: 'file',           label: 'File',             desc: '파일 업로드',              defaultColSpan: 2 },
    { type: 'image',          label: 'Image',            desc: '이미지 등록',              defaultColSpan: 2 },
    { type: 'video',          label: 'Video',            desc: 'URL · 파일 업로드',        defaultColSpan: 2 },
    { type: 'media',          label: '미디어',           desc: '이미지·동영상 통합',        defaultColSpan: 2 },
    { type: 'textarea',       label: 'Textarea',         desc: '여러 줄 텍스트 입력',      defaultColSpan: 2 },
    { type: 'time',           label: 'Time',             desc: '시간 선택 (HH:MM)',        defaultColSpan: 1 },
    { type: 'hidden',         label: 'Hidden',           desc: '숨김 필드 (KEY + 기본값)', defaultColSpan: 1 },
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
    const { t } = useI18n();

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
                {/* 라벨 (hidden은 fieldKey 표시) */}
                <span className="text-[11px] font-medium text-slate-700 truncate flex-1">
                    {(field.type === 'dateRange' || field.type === 'yearMonthRange')
                        ? `${field.labelMsgKey ? t(field.labelMsgKey) : (field.label || '')} ~ ${field.label2MsgKey ? t(field.label2MsgKey) : (field.label2 || '')}`
                        : field.type === 'hidden'
                            ? (field.fieldKey || <span className="italic text-slate-300">Key 없음</span>)
                            : (field.labelMsgKey ? t(field.labelMsgKey) : (field.label || <span className="italic text-slate-300">라벨 없음</span>))
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
    slugOptions: SlugOption[];
    /** 필드 ColSpan 최대값 (기본 12, 우측 드로어 등 좁은 공간에서 2로 제한) */
    maxColSpan?: number;
    /** @deprecated 더 이상 FormBuilder 내부에서 직접 사용하지 않음 — widget.connectedSlug(이 Form의 연결 Entity) 기준으로
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

/** Form 위젯 필드 설정 빌더 */
export function FormBuilder({ widget, onChange, slugOptions, maxColSpan = 12, connLabel, connDefaultSlug, connMode, dataEntityOptions = [] }: FormBuilderProps) {
    /* "연결 Slug" 필드 옵션·표시 포맷 — entity/data/none 3-way 공통 헬퍼로 계산 */
    const connFieldOptions = getConnFieldOptions(connMode, slugOptions, dataEntityOptions);

    /* ── 이 컨텐츠(Form)가 실제로 연결된 Entity 기준 필드 목록 ──
       widget.connectedSlug(이 Form 자체의 연결 Entity)가 없으면 위젯 최상위 연결 Entity(connDefaultSlug)로 자연 폴백한다.
       fieldKey selectbox 옵션은 위젯 최상위가 아니라 이 값을 기준으로 구성해야 한다. */
    const effectiveSlug = widget.connectedSlug || connDefaultSlug;
    const entityId = resolveEntityId(effectiveSlug, connMode, slugOptions, dataEntityOptions);
    const contentEntityFields = useEntityFields(entityId);

    const { i18nMode } = useBuilderI18nMode();
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

    /* slug-relation 목록 — input 필드 "연결 Slug" 선택에 사용 */
    const slugRelations = useSlugRelations();

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
            /* date: 기본 서브타입 날짜로 초기화 */
            ...(type === 'date' && { dateSubType: 'date' as const }),
            /* dateRange: 기본 서브타입 날짜로 초기화 */
            ...(type === 'dateRange' && { rangeSubType: 'date' as const }),
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
                label:              f.label || '',
                labelMsgKey:        f.labelMsgKey,
                label2:             f.label2,
                label2MsgKey:       f.label2MsgKey,
                fieldKey:           f.fieldKey || '',
                colSpan:            f.colSpan,
                rowSpan:            f.rowSpan,
                placeholder:        f.placeholder,
                placeholderMsgKey:  f.placeholderMsgKey,
                description:        f.description,
                descriptionMsgKey:  f.descriptionMsgKey,
                required:           f.required,
                options:            f.options,
                codeGroupCode:      f.codeGroupCode,
                displayAs:          f.displayAs,
                multiSelect:        f.multiSelect,
                minLength:          f.minLength,
                maxLength:          f.maxLength,
                showCharCount:      f.showCharCount,
                pattern:            f.pattern,
                patternDesc:        f.patternDesc,
                minSelect:          f.minSelect,
                maxSelect:          f.maxSelect,
                isPk:               f.isPk,
                readonly:           f.readonly,
                hideCondition:      f.hideCondition,
                disableCondition:   f.disableCondition,
                maxFileCount:       f.maxFileCount,
                maxFileSizeMB:      f.maxFileSizeMB,
                maxTotalSizeMB:     f.maxTotalSizeMB,
                fileTypeMode:       f.fileTypeMode,
                allowedExtensions:  f.allowedExtensions,
                videoMode:          f.videoMode,
                mediaImageMaxSizeMB: f.mediaImageMaxSizeMB,
                mediaVideoMaxSizeMB: f.mediaVideoMaxSizeMB,
                defaultValue:        f.defaultValue,
                defaultValueMsgKey:  f.defaultValueMsgKey,
                defaultOptionValue:  f.defaultOptionValue,
                defaultDateOffset:      f.defaultDateOffset,
                defaultDate:            f.defaultDate,
                disablePast:            f.disablePast,
                defaultToday:           f.defaultToday,
                defaultStartDateOffset: f.defaultStartDateOffset,
                defaultStartDate:       f.defaultStartDate,
                disableStartPast:       f.disableStartPast,
                defaultStartToday:      f.defaultStartToday,
                defaultEndDateOffset:   f.defaultEndDateOffset,
                defaultEndDate:         f.defaultEndDate,
                disableEndPast:         f.disableEndPast,
                defaultEndToday:        f.defaultEndToday,
                /* date 서브타입 (yearMonth 기존 데이터 → yearMonth fallback) */
                dateSubType:            f.dateSubType ?? (f.type === 'yearMonth' ? 'yearMonth' : undefined),
                /* dateRange 서브타입 (yearMonthRange 기존 데이터 → yearMonth fallback) */
                rangeSubType:           f.rangeSubType ?? (f.type === 'yearMonthRange' ? 'yearMonth' : undefined),
                defaultTime:            f.defaultTime,
                timeStep:               f.timeStep,
                /* ── 데이터생성 ── */
                generationKey:      f.generationKey,
                dataReplacement:    f.dataReplacement,
                caseChange:         f.caseChange,
                appendText:         f.appendText,
                truncateLength:     f.truncateLength,
                dataGenerations:    f.dataGenerations,
                /* ── editor 전용 ── */
                editorType:         f.editorType,
                /* ── select 표시 방식 ── */
                selectType:         f.selectType,
                /* ── select SLUG 옵션 소스 ── */
                optionSlug:         f.optionSlug,
                optionValueKey:     f.optionValueKey,
                optionTextKey:      f.optionTextKey,
                optionOrderKey:     f.optionOrderKey,
                optionOrderDir:     f.optionOrderDir,
                optionFilter:       f.optionFilter,
                /* ── 연결 Slug (input/text 전용) ── */
                relationSlugId:     f.relationSlugId,
                /* ── Data 표현식 (input/text 전용) ── */
                data:               f.data,
                /* ── 다건 매칭 표시 방식 (text 전용) ── */
                fetchDisplayMode:   f.fetchDisplayMode,
            } satisfies FieldEditValues,
            onChange: (updates: Partial<FieldEditValues>) =>
                updateField(f.id, updates as Partial<FormFieldItem>),
            /* Form: 숫자 입력형 ColSpan (max는 prop으로 제어, 기본 12) */
            colSpanMode: { type: 'input' as const, min: 1, max: maxColSpan },
            /* RowSpan: 1~30 배수 */
            rowSpanConfig: { min: 1, max: 30 },
            codeGroups,
            codeGroupsLoading,
            slugEntityFields: contentEntityFields,
        };

        switch (f.type) {
            /* fetchRelations: slug-relation 목록 전달 → InputField "연결 Slug" 섹션 표시 */
            case 'input':          return <InputField {...props} fetchRelations={slugRelations.filter(r => r.relationDir === 'FETCH')} />;
            case 'text':            return <TextField {...props} fetchRelations={slugRelations.filter(r => r.relationDir === 'FETCH')} />;
            /* slugOptions: FormBuilder props에서 전달받은 PAGE_DATA slug 목록 — SLUG 탭 옵션 소스 선택에 사용 */
            case 'select':         return <SelectField {...props} slugOptions={slugOptions} />;
            case 'date':           return <DateField {...props} />;
            case 'dateRange':      return <DateRangeField {...props} />;
            case 'yearMonth':      return <DateField {...props} />;
            case 'yearMonthRange': return <DateRangeField {...props} />;
            case 'radio':          return <RadioField {...props} />;
            case 'checkbox':  return <CheckboxField {...props} />;
            case 'button':    return <ButtonField {...props} />;
            case 'editor':    return <EditorField {...props} />;
            case 'file':      return <FileField {...props} />;
            case 'image':     return <ImageField {...props} />;
            case 'video':     return <VideoField {...props} />;
            case 'media':     return <MediaField {...props} />;
            case 'time':      return <TimeField {...props} />;
            case 'textarea':  return <FormTextareaField {...props} />;
            /* hidden: KEY(fieldKey) + VALUE(defaultValue) 한 줄 배치 */
            case 'hidden':
                return (
                    <div className="flex gap-2">
                        <div className="flex-1">
                            <label className={LABEL_CLS}>Key <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                className={INPUT_CLS}
                                value={f.fieldKey ?? ''}
                                placeholder="예: depth"
                                onChange={e => updateField(f.id, { fieldKey: e.target.value })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className={LABEL_CLS}>Value <span className="text-slate-400 font-normal">(기본값)</span></label>
                            <input
                                type="text"
                                className={INPUT_CLS}
                                value={(f as any).defaultValue ?? ''}
                                placeholder="예: 1"
                                onChange={e => updateField(f.id, { defaultValue: e.target.value || undefined } as any)}
                            />
                        </div>
                    </div>
                );
            default:          return null;
        }
    };

    /* ── 렌더 ── */
    return (
        <div className="space-y-2 pt-1">
            {/* Key * | 연결 slug */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                    <input
                        type="text"
                        value={widget.contentKey}
                        onChange={e => onChange({ ...widget, contentKey: e.target.value.replace(/\./g, '_') })}
                        placeholder="예: registerForm (페이지 내 고유)"
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900"
                    />
                </div>
                <SlugSelectField
                    value={widget.connectedSlug ?? connDefaultSlug ?? ''}
                    onChange={slug => onChange({ ...widget, connectedSlug: slug || undefined })}
                    slugOptions={connFieldOptions.options}
                    formatDisplay={connFieldOptions.formatDisplay}
                    label={connLabel}
                />
            </div>

            {/* 타이틀 + 설명 — 1행 안에 함께 표시됨 */}
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">타이틀</label>
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
                            placeholder="예: 권한 및 보안"
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    )}
                </div>
                <div>
                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">설명</label>
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
                            placeholder="예: 필수 항목은 * 로 표시됩니다."
                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900"
                        />
                    )}
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

            {/* 필드 구성 헤더 — "이 위젯만 빌드" 버튼 */}
            <div className="flex items-center justify-between pt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">필드 구성</p>
                <EntityBuildButton
                    onClick={() => onChange(buildFormFromEntity(widget, contentEntityFields))}
                    disabled={!contentEntityFields.length}
                    title="Slug Entity 필드로 폼 필드 자동 구성"
                />
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
