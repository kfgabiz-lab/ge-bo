'use client';

/**
 * ============================================================
 *  [페이지 메이커] Make > Layer — 레이어 팝업 자동 생성
 * ============================================================
 *  - 중앙 팝업: 화면 정중앙 모달
 *  - 우측 드로어: 오른쪽 슬라이드인 패널 (관리자관리 스타일)
 * ============================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Plus, Trash2, GripVertical, Copy, Check, Eye, Code,
    ChevronUp, ChevronDown, X, Pencil, Layers,
    PanelLeftOpen, PanelRight, LayoutTemplate,
    Save, Zap, Loader2, MousePointerClick,
    Search, Sparkles, Database,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useDatabaseStore } from '@/store/useDatabaseStore';
/* ── 공통 모듈 ── */
import { inputCls, selectCls, btnPrimary, btnSecondary } from '../_shared/styles';
import { CodeGroupDef, TemplateItem } from '../_shared/types';
import { parseOpt, needsOptions, toSlug, createIdGenerator, varName, showValidationError, findDuplicateKeys } from '../_shared/utils';
import { SelectArrow } from '../_shared/components/SelectArrow';
import { RowHeader } from '../_shared/components/RowHeader';
import { OptionInputRows, stringsToOpts, optsToStrings } from '../_shared/components/OptionInputRows';
import { CodeGroupSelector } from '../_shared/components/CodeGroupSelector';
import { ValidationSection, ValidationValues } from '../_shared/components/ValidationSection';
import { FieldPickerTypeList } from '../_shared/components/FieldPickerTypeList';
import { SaveModal, GenerateModal } from '../_shared/components/TemplateModals';
import { DndContext } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortableRows } from '../_shared/hooks/useSortableRows';
import { SortableRowWrapper, SortableFieldWrapper, EmptyFieldDropZone } from '../_shared/components/DndWrappers';

/* ══════════════════════════════════════════ */
/*  타입 정의                                  */
/* ══════════════════════════════════════════ */

/** 레이어 팝업 유형 */
type LayerType = 'center' | 'right';

/** 레이어 폼 필드 유형 */
type LayerFieldType = 'input' | 'select' | 'textarea' | 'editor' | 'date' | 'radio' | 'checkbox' | 'file' | 'image' | 'video';

/** 레이어 폼 필드 설정 */
interface LayerFieldConfig {
    id: string;
    type: LayerFieldType;
    label: string;
    fieldKey?: string;           // 폼 데이터 키 (미입력 시 라벨 자동변환)
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;  // row.cols 이하의 칸 수
    rowSpan?: 1 | 2 | 3;          // 세로 병합 (grid-row span), 기본 1
    required?: boolean;
    readonly?: boolean;          // 읽기 전용 여부
    options?: string[];          // select/radio/checkbox 옵션 ("텍스트:값" 형식)
    rows?: number;               // textarea 전용: 행 수
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    codeGroupCode?: string;      // 공통코드 연동 시 groupCode (undefined=수동, 문자열=공통코드 모드)
    // ── 파일 업로드 전용 설정 ──
    maxFileCount?: number;       // 최대 파일 수 (기본 1, 범위 1~20)
    maxFileSizeMB?: number;      // 개당 최대 용량 MB (기본 10, 범위 1~100)
    maxTotalSizeMB?: number;     // 전체 최대 용량 MB (기본 20)
    fileTypeMode?: 'doc' | 'image' | 'video' | 'custom' | '';  // 허용 유형 모드 (기본 '' = 모두 허용, video = 동영상 프리셋)
    allowedExtensions?: string[]; // 커스텀 모드 시 확장자 목록 (예: ['.jpg', '.png'])
    // ── video 필드 전용 ──
    videoMode?: 'url' | 'file'; // 동영상 입력 방식: url(유튜브/Vimeo) or file(파일 업로드)
}

/** 레이어 폼 행 설정 */
interface LayerRowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;   // 행 열 수
    fields: LayerFieldConfig[];
}

/** 중앙 팝업 너비 */
type LayerWidth = 'sm' | 'md' | 'lg' | 'xl';

/** 하단 버튼 스타일 타입 */
type LayerButtonType = 'primary' | 'secondary' | 'blue' | 'success' | 'danger';

/** 하단 버튼 액션 타입 */
type LayerButtonAction = 'close' | 'save' | 'custom';

/** 하단 버튼 설정 */
interface LayerButtonConfig {
    id: string;
    label: string;
    type: LayerButtonType;
    action: LayerButtonAction;
}

/* ── 버튼 타입별 Tailwind 클래스 (정적 선언 — purge 방지) ── */
const LAYER_BTN_TYPE_CLS: Record<LayerButtonType, string> = {
    primary: 'px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md shadow-sm transition-all',
    secondary: 'px-4 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all',
    blue: 'px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-md shadow-sm transition-all',
    success: 'px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold rounded-md shadow-sm transition-all',
    danger: 'px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-md shadow-sm transition-all',
};

/* ── 버튼 타입 배지 색상 ── */
const LAYER_BTN_TYPE_BADGE: Record<LayerButtonType, string> = {
    primary: 'bg-slate-900 text-white',
    secondary: 'bg-slate-100 text-slate-600',
    blue: 'bg-blue-100 text-blue-600',
    success: 'bg-emerald-100 text-emerald-600',
    danger: 'bg-red-100 text-red-600',
};

/* ── 기본 버튼 목록 (닫기 + 저장) ── */
const DEFAULT_LAYER_BUTTONS: LayerButtonConfig[] = [
    { id: 'lb-1', label: '닫기', type: 'secondary', action: 'close' },
    { id: 'lb-2', label: '저장', type: 'primary', action: 'save' },
];

/* ── 중앙 팝업 너비 맵 ── */
const LAYER_WIDTH_MAP: Record<LayerWidth, string> = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-3xl',
    xl: 'max-w-4xl',
};

/* ── 필드 유형 메타 ── */
const FIELD_TYPES: { type: LayerFieldType; label: string; desc: string; defaultColSpan: 1 | 2; defaultRowSpan: 1 | 2 | 3 }[] = [
    { type: 'input', label: 'Input', desc: '텍스트 입력', defaultColSpan: 1, defaultRowSpan: 1 },
    { type: 'select', label: 'Select', desc: '드롭다운', defaultColSpan: 1, defaultRowSpan: 1 },
    { type: 'textarea', label: 'Textarea', desc: '여러 줄 입력', defaultColSpan: 2, defaultRowSpan: 2 },
    { type: 'editor', label: 'Editor', desc: '위지윅 에디터', defaultColSpan: 2, defaultRowSpan: 3 },
    { type: 'date', label: 'Date', desc: '날짜 선택', defaultColSpan: 1, defaultRowSpan: 1 },
    { type: 'radio', label: 'Radio', desc: '단일 선택', defaultColSpan: 1, defaultRowSpan: 1 },
    { type: 'checkbox', label: 'Checkbox', desc: '복수 선택', defaultColSpan: 1, defaultRowSpan: 1 },
    { type: 'file', label: 'File', desc: '파일 업로드', defaultColSpan: 2, defaultRowSpan: 1 },
    { type: 'image', label: 'Image', desc: '이미지 등록', defaultColSpan: 2, defaultRowSpan: 1 },
    { type: 'video', label: 'Video', desc: 'URL · 파일 업로드', defaultColSpan: 2, defaultRowSpan: 2 },
];

/* ── 허용 파일 유형 프리셋 확장자 상수 ── */
const FILE_TYPE_PRESETS = {
    doc: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.hwp'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
    video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v'],
} as const;

/**
 * fileTypeMode와 커스텀 확장자 목록으로 input[accept] 문자열을 계산
 * @param mode  허용 유형 모드 ('doc' | 'image' | 'custom' | '')
 * @param customExts  커스텀 모드 시 확장자 배열
 * @returns accept 속성 문자열 (전체 허용이면 빈 문자열)
 */
function getAcceptString(mode: string, customExts: string[]): string {
    if (mode === 'doc') return FILE_TYPE_PRESETS.doc.join(',');
    if (mode === 'image') return FILE_TYPE_PRESETS.image.join(',');
    if (mode === 'video') return FILE_TYPE_PRESETS.video.join(',');
    if (mode === 'custom') return customExts.join(',');
    return ''; // 전체 허용
}

/**
 * 유튜브/Vimeo URL → embed URL 변환
 * @example
 * toEmbedUrl('https://www.youtube.com/watch?v=abc123') // 'https://www.youtube.com/embed/abc123'
 * toEmbedUrl('https://youtu.be/abc123')                // 'https://www.youtube.com/embed/abc123'
 * toEmbedUrl('https://vimeo.com/123456')               // 'https://player.vimeo.com/video/123456'
 */
function toEmbedUrl(url: string): string | null {
    if (!url) return null;
    /* 유튜브 watch 형식 */
    const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
    /* 유튜브 shorts 형식 */
    const ytShorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}`;
    /* Vimeo 형식 */
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null;
}

/* ── ID 생성 ── */
const uid = () => `l-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;

/* ── DB 연동: 자동 적용 시 제외할 시스템 컬럼 목록 ── */
const SYSTEM_COLUMNS = new Set([
    'reg_dt', 'mdf_dt', 'reg_user_id', 'mdf_user_id', 'reg_id', 'mdf_id',
    'reg_date', 'mdf_date', 'reg_user', 'mdf_user',
    'created_at', 'updated_at', 'created_by', 'updated_by',
    'create_dt', 'modify_dt', 'create_date', 'modify_date',
    'ins_dt', 'upd_dt', 'ins_user', 'upd_user', 'ins_user_id', 'upd_user_id',
    'insert_dt', 'update_dt', 'insert_user', 'update_user',
]);


/* ══════════════════════════════════════════ */
/*  확장자 태그 입력 컴포넌트 (편집 패널 공용)   */
/* ══════════════════════════════════════════ */
/**
 * 확장자 태그 입력/삭제 UI
 * - 점(.) 없으면 자동 추가
 * - 정규식 불충족 또는 중복 시 에러 표시
 * @example
 * <ExtensionTagInput extensions={['.jpg']} onChange={exts => ...} />
 */
const ExtensionTagInput = ({ extensions, onChange }: { extensions: string[]; onChange: (exts: string[]) => void }) => {
    const [input, setInput] = React.useState('');
    const [error, setError] = React.useState('');

    const addExt = () => {
        let ext = input.trim();
        if (!ext) return;
        if (!ext.startsWith('.')) ext = '.' + ext;
        if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setError('영문/숫자 확장자만 입력 가능합니다. (예: .jpg)'); return; }
        if (extensions.includes(ext)) { setError('이미 추가된 확장자입니다.'); return; }
        onChange([...extensions, ext]);
        setInput('');
        setError('');
    };

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-1">
                <input
                    type="text"
                    value={input}
                    onChange={e => { setInput(e.target.value); setError(''); }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addExt(); } }}
                    placeholder=".jpg"
                    className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs font-mono focus:outline-none"
                />
                <button type="button" onClick={addExt} disabled={!input.trim()} className="px-2 py-1 text-[10px] font-semibold bg-slate-900 text-white rounded hover:bg-slate-800 disabled:opacity-40 transition-all">추가</button>
            </div>
            {error && <p className="text-[10px] text-red-500">{error}</p>}
            {extensions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {extensions.map(ext => (
                        <span key={ext} className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] rounded font-mono">
                            {ext}
                            <button type="button" onClick={() => onChange(extensions.filter(e => e !== ext))} className="text-slate-400 hover:text-slate-700"><X className="w-2 h-2" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  필드 미리보기 렌더러                        */
/* ══════════════════════════════════════════ */
const FieldPreview = ({ field, value, onChange, codeGroups = [] }: {
    field: LayerFieldConfig;
    value?: string;
    onChange?: (v: string) => void;
    codeGroups?: CodeGroupDef[];
}) => {
    const handle = (v: string) => onChange?.(v);
    /* codeGroupCode 있으면 공통코드에서 옵션 계산, 없으면 수동 옵션 사용 */
    const opts = (() => {
        if (field.codeGroupCode && codeGroups.length > 0) {
            const grp = codeGroups.find(g => g.groupCode === field.codeGroupCode);
            return grp?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) || [];
        }
        return field.options?.length ? field.options : needsOptions(field.type) ? ['옵션1:opt1', '옵션2:opt2', '옵션3:opt3'] : [];
    })();

    switch (field.type) {
        case 'input':
            return <input type="text" placeholder={field.placeholder || '입력하세요'} className={`${inputCls} ${field.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} value={value || ''} onChange={e => !field.readonly && handle(e.target.value)} readOnly={field.readonly} />;

        case 'textarea':
            return <textarea placeholder={field.placeholder || '입력하세요'} rows={field.rows || 3} className={`${inputCls} resize-none ${field.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} value={value || ''} onChange={e => !field.readonly && handle(e.target.value)} readOnly={field.readonly} />;

        case 'select':
            return (
                <div className="relative">
                    <select className={`${selectCls} ${field.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} value={value || ''} onChange={e => !field.readonly && handle(e.target.value)} disabled={field.readonly}>
                        <option value="">{field.placeholder || '선택하세요'}</option>
                        {opts.map(opt => {
                            const { text, value: v } = parseOpt(opt);
                            return <option key={opt} value={v}>{text}</option>;
                        })}
                    </select>
                    <SelectArrow />
                </div>
            );

        case 'date':
            return <input type="date" className={`${inputCls} ${field.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`} value={value || ''} onChange={e => !field.readonly && handle(e.target.value)} readOnly={field.readonly} />;

        case 'radio':
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {opts.map(opt => {
                        const { text, value: v } = parseOpt(opt);
                        return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value={v} checked={value === v} onChange={() => handle(v)} className="w-4 h-4 border-slate-400 text-slate-900 cursor-pointer" />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );

        case 'checkbox': {
            const selected = (value || '').split(',').filter(Boolean);
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {opts.map(opt => {
                        const { text, value: v } = parseOpt(opt);
                        const isChecked = selected.includes(v);
                        return (
                            <label key={opt} className={`flex items-center gap-2 ${field.readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                <input type="checkbox" value={v} checked={isChecked} disabled={field.readonly} onChange={() => {
                                    if (field.readonly) return;
                                    const next = isChecked ? selected.filter(s => s !== v) : [...selected, v];
                                    handle(next.join(','));
                                }} className={`w-4 h-4 rounded border-slate-400 text-slate-900 ${field.readonly ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );
        }

        case 'file': {
            /* 허용 형식 텍스트 계산 */
            const modeLabel = (() => {
                if (field.fileTypeMode === 'doc') return '문서 파일만 허용';
                if (field.fileTypeMode === 'image') return '이미지 파일만 허용';
                if (field.fileTypeMode === 'custom') return (field.allowedExtensions || []).join(', ') || '커스텀';
                return ''; // 전체 허용 — 미표시
            })();
            const maxCount = field.maxFileCount ?? 1;
            const maxSizeMB = field.maxFileSizeMB ?? 10;
            const maxTotalMB = field.maxTotalSizeMB ?? 20;
            return (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm py-1">
                        <span>📎</span>
                        <span className="font-medium">파일 선택</span>
                        <span className="text-slate-300">또는 여기에 드래그 &amp; 드롭</span>
                    </div>
                    <p className="text-xs text-slate-400">
                        최대 {maxCount}개 · 개당 {maxSizeMB}MB · 전체 {maxTotalMB}MB
                    </p>
                    {modeLabel && (
                        <p className="text-xs text-slate-400">허용: {modeLabel}</p>
                    )}
                </div>
            );
        }

        case 'image': {
            const maxCount = field.maxFileCount ?? 1;
            const maxSizeMB = field.maxFileSizeMB ?? 10;
            return (
                <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50 text-center space-y-1">
                    <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm py-1">
                        <span>🖼️</span>
                        <span className="font-medium">이미지 선택</span>
                        <span className="text-slate-300">또는 여기에 드래그 &amp; 드롭</span>
                    </div>
                    <p className="text-xs text-slate-400">
                        최대 {maxCount}개 · 개당 {maxSizeMB}MB
                    </p>
                    <p className="text-xs text-slate-400">허용: jpg, jpeg, png, gif, webp, svg, bmp</p>
                </div>
            );
        }

        case 'video': {
            /* videoMode: 'url'(기본) = 유튜브/Vimeo URL 임베드, 'file' = 파일 업로드 */
            const mode = field.videoMode ?? 'url';

            if (mode === 'file') {
                /* 파일 업로드 모드 */
                const fileModeLabel = (() => {
                    if (field.fileTypeMode === 'video') return 'mp4, mov, avi, mkv, webm, wmv, flv, m4v';
                    if (field.fileTypeMode === 'custom') return (field.allowedExtensions || []).join(', ') || '커스텀';
                    return '';
                })();
                const vfMaxCount = field.maxFileCount ?? 1;
                const vfMaxSizeMB = field.maxFileSizeMB ?? 500;
                const vfMaxTotalMB = field.maxTotalSizeMB ?? 500;
                return (
                    <div className="space-y-1.5">
                        {/* 탭 표시 (미리보기 전용 — 실제 전환 불가) */}
                        <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md text-[10px] font-semibold w-fit">
                            <span className="px-2.5 py-1 rounded text-slate-400">URL</span>
                            <span className="px-2.5 py-1 rounded bg-white text-slate-900 shadow-sm">파일 업로드</span>
                        </div>
                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 bg-slate-50/50 text-center space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm py-1">
                                <span>🎬</span>
                                <span className="font-medium">동영상 선택</span>
                                <span className="text-slate-300">또는 여기에 드래그 &amp; 드롭</span>
                            </div>
                            <p className="text-xs text-slate-400">
                                최대 {vfMaxCount}개 · 개당 {vfMaxSizeMB}MB · 전체 {vfMaxTotalMB}MB
                            </p>
                            {fileModeLabel && <p className="text-xs text-slate-400">허용: {fileModeLabel}</p>}
                        </div>
                    </div>
                );
            }

            /* URL 모드 (기본) */
            const embedUrl = toEmbedUrl(value || '');
            return (
                <div className="space-y-1.5">
                    {/* 탭 표시 (미리보기 전용 — 실제 전환 불가) */}
                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md text-[10px] font-semibold w-fit">
                        <span className="px-2.5 py-1 rounded bg-white text-slate-900 shadow-sm">URL</span>
                        <span className="px-2.5 py-1 rounded text-slate-400">파일 업로드</span>
                    </div>
                    <input
                        type="text"
                        placeholder="유튜브 또는 Vimeo URL을 입력하세요"
                        className={inputCls}
                        value={value || ''}
                        onChange={e => !field.readonly && onChange?.(e.target.value)}
                        readOnly={field.readonly}
                    />
                    {/* URL 입력 시 즉시 iframe 미리보기 */}
                    {embedUrl ? (
                        <div className="aspect-video w-full max-h-[240px] rounded-lg overflow-hidden border border-slate-200 bg-black">
                            <iframe
                                src={embedUrl}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                            />
                        </div>
                    ) : value ? (
                        <p className="text-xs text-red-400 px-1">지원하지 않는 URL 형식입니다. (유튜브, Vimeo만 가능)</p>
                    ) : (
                        <div className="aspect-video w-full max-h-[240px] rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                            <span className="text-slate-400 text-sm">▶ 미리보기</span>
                        </div>
                    )}
                </div>
            );
        }

        case 'editor':
            return (
                <div className="border border-slate-200 rounded-lg p-4 bg-slate-50 flex flex-col items-center justify-center gap-2 min-h-[160px]">
                    <Sparkles className="w-6 h-6 text-slate-300" />
                    <span className="text-xs text-slate-400 font-medium text-center">에디터 영역<br /><span className="text-[10px] opacity-60">(생성된 파일에서 확인 가능)</span></span>
                </div>
            );

        default:
            return null;
    }
};

/* ══════════════════════════════════════════ */
/*  폼 필드 JSX 생성 (공통)                    */
/* ══════════════════════════════════════════ */
const buildFieldsJsx = (rows: LayerRowConfig[], ind: (n: number) => string, baseDepth: number): string[] => {
    const lines: string[] = [];
    /* varName은 _shared/utils에서 import한 함수 사용 */
    const fieldVar = (f: LayerFieldConfig) => f.fieldKey || varName(f.label);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const d = baseDepth;

    rows.forEach(row => {
        /* row별 독립 grid — cols에 따라 열 수 결정 */
        lines.push(`${ind(d)}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(${row.cols}, minmax(0, 1fr))', gap: '1.25rem 1rem' }}>`);
        row.fields.forEach(f => {
            const n = fieldVar(f);
            const setter = `set${cap(n)}`;
            const colSpan = Math.min(f.colSpan, row.cols);
            const rowSpanStyle = f.rowSpan && f.rowSpan > 1 ? `, gridRow: 'span ${f.rowSpan}'` : '';
            lines.push(`${ind(d + 1)}<div style={{ gridColumn: 'span ${colSpan}'${rowSpanStyle} }}>`);
            lines.push(`${ind(d + 2)}<label className="text-xs font-medium text-slate-700 mb-1.5 block">`);
            lines.push(`${ind(d + 3)}${f.label}${f.required ? ' <span className="text-red-500">*</span>' : ''}`);
            lines.push(`${ind(d + 2)}</label>`);

            switch (f.type) {
                case 'input':
                    if (f.readonly) {
                        lines.push(`${ind(d + 2)}<input type="text" value={${n}} readOnly placeholder="${f.placeholder || '입력하세요'}" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />`);
                    } else {
                        lines.push(`${ind(d + 2)}<input type="text" value={${n}} onChange={e => ${setter}(e.target.value)} placeholder="${f.placeholder || '입력하세요'}" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
                    }
                    break;
                case 'textarea':
                    if (f.readonly) {
                        lines.push(`${ind(d + 2)}<textarea value={${n}} readOnly placeholder="${f.placeholder || '입력하세요'}" rows={${f.rows || 3}} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed resize-none" />`);
                    } else {
                        lines.push(`${ind(d + 2)}<textarea value={${n}} onChange={e => ${setter}(e.target.value)} placeholder="${f.placeholder || '입력하세요'}" rows={${f.rows || 3}} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none" />`);
                    }
                    break;
                case 'select':
                    lines.push(`${ind(d + 2)}<div className="relative">`);
                    if (f.readonly) {
                        lines.push(`${ind(d + 3)}<select value={${n}} disabled className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm bg-slate-50 text-slate-500 cursor-not-allowed">`);
                    } else {
                        lines.push(`${ind(d + 3)}<select value={${n}} onChange={e => ${setter}(e.target.value)} className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">`);
                    }
                    lines.push(`${ind(d + 4)}<option value="">${f.placeholder || '선택하세요'}</option>`);
                    if (f.codeGroupCode) {
                        lines.push(`${ind(d + 4)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <option key={d.code} value={d.code}>{d.name}</option>)}`);
                    } else {
                        (f.options || []).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            lines.push(`${ind(d + 4)}<option value="${value}">${text}</option>`);
                        });
                    }
                    lines.push(`${ind(d + 3)}</select>`);
                    lines.push(`${ind(d + 3)}<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />`);
                    lines.push(`${ind(d + 2)}</div>`);
                    break;
                case 'date':
                    if (f.readonly) {
                        lines.push(`${ind(d + 2)}<input type="date" value={${n}} readOnly className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-slate-50 text-slate-500 cursor-not-allowed" />`);
                    } else {
                        lines.push(`${ind(d + 2)}<input type="date" value={${n}} onChange={e => ${setter}(e.target.value)} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />`);
                    }
                    break;
                case 'radio':
                    lines.push(`${ind(d + 2)}<div className="flex items-center gap-4 pt-0.5">`);
                    if (f.codeGroupCode) {
                        lines.push(`${ind(d + 3)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="radio" name="${n}" value={d.code} checked={${n} === d.code} onChange={() => ${setter}(d.code)} className="w-4 h-4 border-slate-400 text-slate-900 cursor-pointer" /><span className="text-sm text-slate-700">{d.name}</span></label>)}`);
                    } else {
                        (f.options || []).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            lines.push(`${ind(d + 3)}<label className="flex items-center gap-2 cursor-pointer">`);
                            lines.push(`${ind(d + 4)}<input type="radio" name="${n}" value="${value}" checked={${n} === '${value}'} onChange={e => ${setter}(e.target.value)} className="w-4 h-4 border-slate-400 text-slate-900 cursor-pointer" />`);
                            lines.push(`${ind(d + 4)}<span className="text-sm text-slate-700">${text}</span>`);
                            lines.push(`${ind(d + 3)}</label>`);
                        });
                    }
                    lines.push(`${ind(d + 2)}</div>`);
                    break;
                case 'checkbox':
                    lines.push(`${ind(d + 2)}<div className="flex items-center gap-4 pt-0.5">`);
                    if (f.codeGroupCode) {
                        /* readonly 여부에 따라 disabled 속성 포함 */
                        if (f.readonly) {
                            lines.push(`${ind(d + 3)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-not-allowed opacity-60"><input type="checkbox" value={d.code} checked={${n}.includes(d.code)} disabled onChange={() => {}} className="w-4 h-4 rounded border-slate-400 text-slate-900 cursor-not-allowed" /><span className="text-sm text-slate-700">{d.name}</span></label>)}`);
                        } else {
                            lines.push(`${ind(d + 3)}{groups.find(g => g.groupCode === '${f.codeGroupCode}')?.details.filter(d => d.active).map(d => <label key={d.code} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" value={d.code} checked={${n}.includes(d.code)} onChange={() => ${setter}(${n}.includes(d.code) ? ${n}.filter(v => v !== d.code) : [...${n}, d.code])} className="w-4 h-4 rounded border-slate-400 text-slate-900 cursor-pointer" /><span className="text-sm text-slate-700">{d.name}</span></label>)}`);
                        }
                    } else {
                        (f.options || []).forEach(opt => {
                            const { text, value } = parseOpt(opt);
                            if (f.readonly) {
                                lines.push(`${ind(d + 3)}<label className="flex items-center gap-2 cursor-not-allowed opacity-60">`);
                                lines.push(`${ind(d + 4)}<input type="checkbox" value="${value}" checked={${n}.includes('${value}')} disabled onChange={() => {}} className="w-4 h-4 rounded border-slate-400 text-slate-900 cursor-not-allowed" />`);
                            } else {
                                lines.push(`${ind(d + 3)}<label className="flex items-center gap-2 cursor-pointer">`);
                                lines.push(`${ind(d + 4)}<input type="checkbox" value="${value}" checked={${n}.includes('${value}')} onChange={e => ${setter}(prev => e.target.checked ? [...prev, '${value}'] : prev.filter(s => s !== '${value}'))} className="w-4 h-4 rounded border-slate-400 text-slate-900 cursor-pointer" />`);
                            }
                            lines.push(`${ind(d + 4)}<span className="text-sm text-slate-700">${text}</span>`);
                            lines.push(`${ind(d + 3)}</label>`);
                        });
                    }
                    lines.push(`${ind(d + 2)}</div>`);
                    break;
                case 'file': {
                    /* accept 속성 계산 */
                    const acceptStr = getAcceptString(f.fileTypeMode || '', f.allowedExtensions || []);
                    const isMultiple = (f.maxFileCount ?? 1) > 1;
                    lines.push(`${ind(d + 2)}<input`);
                    lines.push(`${ind(d + 3)}type="file"`);
                    if (isMultiple) lines.push(`${ind(d + 3)}multiple`);
                    if (acceptStr) lines.push(`${ind(d + 3)}accept="${acceptStr}"`);
                    lines.push(`${ind(d + 3)}onChange={e => ${setter}(Array.from(e.target.files || []))}`);
                    lines.push(`${ind(d + 3)}className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"`);
                    lines.push(`${ind(d + 2)}/>`);
                    lines.push(`${ind(d + 2)}<p className="text-xs text-slate-500 mt-1">`);
                    lines.push(`${ind(d + 3)}최대 ${f.maxFileCount ?? 1}개 · 개당 ${f.maxFileSizeMB ?? 10}MB · 전체 ${f.maxTotalSizeMB ?? 20}MB`);
                    lines.push(`${ind(d + 2)}</p>`);
                    break;
                }
                case 'video': {
                    if (f.videoMode === 'file') {
                        /* 파일 업로드 모드 */
                        const vfAcceptStr = getAcceptString(f.fileTypeMode || '', f.allowedExtensions || []);
                        const isMultiVf = (f.maxFileCount ?? 1) > 1;
                        lines.push(`${ind(d + 2)}<input`);
                        lines.push(`${ind(d + 3)}type="file"`);
                        if (isMultiVf) lines.push(`${ind(d + 3)}multiple`);
                        if (vfAcceptStr) lines.push(`${ind(d + 3)}accept="${vfAcceptStr}"`);
                        lines.push(`${ind(d + 3)}onChange={e => ${setter}(Array.from(e.target.files || []))}`);
                        lines.push(`${ind(d + 3)}className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"`);
                        lines.push(`${ind(d + 2)}/>`);
                        lines.push(`${ind(d + 2)}<p className="text-xs text-slate-500 mt-1">`);
                        lines.push(`${ind(d + 3)}최대 ${f.maxFileCount ?? 1}개 · 개당 ${f.maxFileSizeMB ?? 500}MB · 전체 ${f.maxTotalSizeMB ?? 500}MB`);
                        lines.push(`${ind(d + 2)}</p>`);
                    } else {
                        /* URL 모드 (기본) — 유튜브/Vimeo URL 입력 + iframe 렌더링 */
                        lines.push(`${ind(d + 2)}<input`);
                        lines.push(`${ind(d + 3)}type="text"`);
                        lines.push(`${ind(d + 3)}value={${n}}`);
                        lines.push(`${ind(d + 3)}onChange={e => ${setter}(e.target.value)}`);
                        lines.push(`${ind(d + 3)}placeholder="유튜브 또는 Vimeo URL을 입력하세요"`);
                        lines.push(`${ind(d + 3)}className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"`);
                        lines.push(`${ind(d + 2)}/>`);
                        lines.push(`${ind(d + 2)}{${n} && toEmbedUrl(${n}) && (`);
                        lines.push(`${ind(d + 3)}<div className="aspect-video w-full max-h-[240px] rounded-lg overflow-hidden border border-slate-200 mt-2">`);
                        lines.push(`${ind(d + 4)}<iframe src={toEmbedUrl(${n})!} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />`);
                        lines.push(`${ind(d + 3)}</div>`);
                        lines.push(`${ind(d + 2)})}`);
                    }
                    break;
                }
                case 'image': {
                    /* 이미지 전용 — accept는 이미지 확장자 고정 */
                    const imgAccept = '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp';
                    const isMultiImg = (f.maxFileCount ?? 1) > 1;
                    lines.push(`${ind(d + 2)}<input`);
                    lines.push(`${ind(d + 3)}type="file"`);
                    if (isMultiImg) lines.push(`${ind(d + 3)}multiple`);
                    lines.push(`${ind(d + 3)}accept="${imgAccept}"`);
                    lines.push(`${ind(d + 3)}onChange={e => ${setter}(Array.from(e.target.files || []))}`);
                    lines.push(`${ind(d + 3)}className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"`);
                    lines.push(`${ind(d + 2)}/>`);
                    lines.push(`${ind(d + 2)}<p className="text-xs text-slate-500 mt-1">`);
                    lines.push(`${ind(d + 3)}최대 ${f.maxFileCount ?? 1}개 · 개당 ${f.maxFileSizeMB ?? 10}MB · jpg, jpeg, png, gif, webp, svg, bmp`);
                    lines.push(`${ind(d + 2)}</p>`);
                    break;
                }
                case 'editor': {
                    lines.push(`${ind(d + 2)}<WysiwygEditor initialValue={${n}} onChange={v => ${setter}(v)} />`);
                    break;
                }
            }
            lines.push(`${ind(d + 1)}</div>`);
        });
        lines.push(`${ind(d)}</div>`);
    });

    return lines;
};

/* ══════════════════════════════════════════ */
/*  코드 생성기                                */
/* ══════════════════════════════════════════ */
const buildLayerTsx = (
    rows: LayerRowConfig[],
    layerTitle: string,
    layerType: LayerType,
    layerWidth: LayerWidth,
    layerButtons: LayerButtonConfig[] = DEFAULT_LAYER_BUTTONS,
): string => {
    const allFields = rows.flatMap(r => r.fields);
    if (allFields.length === 0) return '// 폼 필드를 추가해주세요';

    const ind = (n: number) => '    '.repeat(n);
    const lines: string[] = [];

    /* varName은 _shared/utils에서 import한 함수 사용 */
    const fieldVar = (f: LayerFieldConfig) => f.fieldKey || varName(f.label);
    const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const needsChevron = allFields.some(f => f.type === 'select');
    /* 파일/이미지/동영상(파일모드) 업로드 필드 존재 여부 */
    const hasFileField = allFields.some(f => f.type === 'file' || f.type === 'image' || (f.type === 'video' && f.videoMode === 'file'));
    /* URL 임베드 비디오 필드 존재 여부 (URL 모드만) */
    const hasVideoField = allFields.some(f => f.type === 'video' && f.videoMode !== 'file');
    /* 에디터 필드 존재 여부 */
    const hasEditor = allFields.some(f => f.type === 'editor');
    const lucideIcons = ['X', ...(needsChevron ? ['ChevronDown'] : [])];
    /* 공통코드 연동 필드 존재 여부 */
    const hasCodeGroup = allFields.some(f => f.codeGroupCode);

    /* ── imports ── */
    lines.push("'use client';");
    lines.push('// ================================================================');
    lines.push('// 📄 이 파일은 페이지 메이커로 자동 생성된 팝업 컴포넌트입니다.');
    lines.push('//');
    lines.push('// 📁 파일 구조');
    lines.push('//   [1] 설정 영역    — 폼 입력값 등 초기값을 정의합니다');
    lines.push('//   [2] JS 로직 영역 — 저장, 닫기, 유효성 검사 등 기능 코드입니다  ← 수정 포인트');
    lines.push('//   [3] 화면 영역    — 브라우저에 보이는 팝업 화면(HTML) 코드입니다  ← 수정 포인트');
    lines.push('//');
    lines.push('// ✏️ 자주 수정하는 것들');
    lines.push('//   • 저장 API 경로  → handleSave() 함수 안의 URL을 수정하세요');
    lines.push('//   • 팝업 열기/닫기 → 부모 컴포넌트에서 isOpen / onClose 를 제어합니다');
    lines.push('//   • 화면 레이아웃  → return ( ... ) 안의 HTML 코드를 수정하세요');
    lines.push('//');
    lines.push('// 💡 사용법 (부모 컴포넌트에서)');
    lines.push('//   const [open, setOpen] = useState(false);');
    lines.push('//   <LayerPopup isOpen={open} onClose={() => setOpen(false)} onSave={(data) => console.log(data)} />');
    lines.push('//');
    lines.push('// 💡 JSX(HTML) 작성 팁');
    lines.push('//   • {변수명} — 중괄호 안에 JS 변수를 넣으면 화면에 값이 출력됩니다');
    lines.push('//   • className — HTML의 class 속성과 같습니다 (스타일 지정)');
    lines.push('// ================================================================');
    lines.push('');
    lines.push(`import React, { useState, useEffect } from 'react';`);
    lines.push(`import { ${lucideIcons.join(', ')} } from 'lucide-react';`);
    lines.push("import { toast } from 'sonner';");
    lines.push("import api from '@/lib/api';");
    if (hasCodeGroup) lines.push("import { useCodeStore } from '@/store/useCodeStore';");
    if (hasEditor) lines.push("import WysiwygEditor from '@/components/common/WysiwygEditor';");
    lines.push('');

    /* ── Props 타입 ── */
    lines.push('interface LayerPopupProps {');
    lines.push(`${ind(1)}isOpen: boolean;`);
    lines.push(`${ind(1)}onClose: () => void;`);
    lines.push(`${ind(1)}onSave?: (data: Record<string, unknown>) => Promise<void>;`);
    lines.push(`${ind(1)}editId?: number | null;`);
    lines.push(`${ind(1)}listSlug?: string;`);
    lines.push('}');
    lines.push('');

    /* ── 컴포넌트 시작 ── */
    lines.push('export default function LayerPopup({ isOpen, onClose, onSave, editId, listSlug }: LayerPopupProps) {');
    lines.push('');
    if (hasCodeGroup) {
        lines.push(`${ind(1)}/* ── 공통코드 그룹 ── */`);
        lines.push(`${ind(1)}const { groups, fetchGroups } = useCodeStore();`);
        lines.push(`${ind(1)}useEffect(() => { fetchGroups(); }, [fetchGroups]);`);
        lines.push('');
    }
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    lines.push(`${ind(1)}// [1] 설정 영역`);
    lines.push(`${ind(1)}// 팝업 폼의 각 입력 필드 값을 저장하는 변수입니다.`);
    lines.push(`${ind(1)}// useState('기본값') — 따옴표 안의 값이 초기값입니다.`);
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox') lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState<string[]>([]);`);
        else if (f.type === 'file' || f.type === 'image' || (f.type === 'video' && f.videoMode === 'file')) lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState<File[]>([]);`);
        else lines.push(`${ind(1)}const [${n}, set${cap(n)}] = useState('');`);
    });
    /* 파일 업로드가 있으면 FILE_TYPE_PRESETS 상수 추가 */
    if (hasFileField) {
        lines.push('');
        lines.push(`${ind(1)}/* ── 허용 파일 유형 프리셋 ── */`);
        lines.push(`${ind(1)}const FILE_PRESETS = {`);
        lines.push(`${ind(2)}doc:   ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.hwp'],`);
        lines.push(`${ind(2)}image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],`);
        lines.push(`${ind(2)}video: ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.wmv', '.flv', '.m4v'],`);
        lines.push(`${ind(1)}};`);
    }
    /* 비디오 필드가 있으면 toEmbedUrl 함수 추가 */
    if (hasVideoField) {
        lines.push('');
        lines.push(`${ind(1)}/* ── 유튜브/Vimeo URL → embed URL 변환 ── */`);
        lines.push(`${ind(1)}const toEmbedUrl = (url: string): string | null => {`);
        lines.push(`${ind(2)}const ytWatch = url.match(/(?:youtube\\.com\\/watch\\?v=|youtu\\.be\\/)([a-zA-Z0-9_-]{11})/);`);
        lines.push(`${ind(2)}if (ytWatch) return \`https://www.youtube.com/embed/\${ytWatch[1]}\`;`);
        lines.push(`${ind(2)}const ytShorts = url.match(/youtube\\.com\\/shorts\\/([a-zA-Z0-9_-]{11})/);`);
        lines.push(`${ind(2)}if (ytShorts) return \`https://www.youtube.com/embed/\${ytShorts[1]}\`;`);
        lines.push(`${ind(2)}const vimeo = url.match(/vimeo\\.com\\/(\\d+)/);`);
        lines.push(`${ind(2)}if (vimeo) return \`https://player.vimeo.com/video/\${vimeo[1]}\`;`);
        lines.push(`${ind(2)}return null;`);
        lines.push(`${ind(1)}};`);
    }
    lines.push('');

    /* ── handleReset ── */
    lines.push('');
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    lines.push(`${ind(1)}// [2] JS 로직 영역`);
    lines.push(`${ind(1)}// 버튼 클릭 시 동작, 유효성 검사, API 호출 등 기능 코드입니다.`);
    lines.push(`${ind(1)}// ✏️ 저장 API를 바꾸려면 handleSave() 안의 URL을 수정하세요.`);
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    lines.push(`${ind(1)}// 초기화 — 모든 입력 필드를 빈 값으로 되돌립니다`);
    lines.push(`${ind(1)}const handleReset = () => {`);
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'checkbox') lines.push(`${ind(2)}set${cap(n)}([]);`);
        else if (f.type === 'file' || f.type === 'image' || (f.type === 'video' && f.videoMode === 'file')) lines.push(`${ind(2)}set${cap(n)}([]);`);
        else lines.push(`${ind(2)}set${cap(n)}('');`);
    });
    lines.push(`${ind(1)}};`);
    lines.push('');

    /* ── isOpen/editId 연동 useEffect: 수정 모드면 서버 조회, 아니면 초기화 ── */
    lines.push(`${ind(1)}/* 팝업 열릴 때: editId 있으면 기존 데이터 조회 후 폼 채우기, 없으면 초기화 */`);
    lines.push(`${ind(1)}useEffect(() => {`);
    lines.push(`${ind(2)}if (!isOpen) return;`);
    lines.push(`${ind(2)}if (editId != null && listSlug) {`);
    lines.push(`${ind(3)}api.get(\`/page-data/\${listSlug}/\${editId}\`)`);
    lines.push(`${ind(4)}.then(res => {`);
    lines.push(`${ind(5)}const d: Record<string, unknown> = typeof res.data.dataJson === 'string'`);
    lines.push(`${ind(6)}? JSON.parse(res.data.dataJson)`);
    lines.push(`${ind(6)}: (res.data.dataJson ?? {});`);
    /* 각 필드별 set 호출 — 체크박스/파일 제외 */
    allFields.forEach(f => {
        const n = fieldVar(f);
        const key = f.fieldKey || varName(f.label);
        if (f.type === 'checkbox') {
            /* 체크박스: 배열로 복원 */
            lines.push(`${ind(5)}const ${n}Val = d['${key}']; set${cap(n)}(Array.isArray(${n}Val) ? ${n}Val.map(String) : []);`);
        } else if (f.type !== 'file' && f.type !== 'image' && f.type !== 'video') {
            /* 일반 텍스트 필드: 문자열로 변환 후 set */
            lines.push(`${ind(5)}set${cap(n)}(String(d['${key}'] ?? ''));`);
        }
        /* 파일/이미지/비디오 필드는 pre-fill 불가 — 생략 */
    });
    lines.push(`${ind(4)}}).catch(() => handleReset());`);
    lines.push(`${ind(2)}} else {`);
    lines.push(`${ind(3)}handleReset();`);
    lines.push(`${ind(2)}}`);
    lines.push(`${ind(1)}}, [isOpen, editId]); // eslint-disable-line react-hooks/exhaustive-deps`);
    lines.push('');

    /* ── handleClose ── */
    lines.push(`${ind(1)}/* ── 닫기: 값 초기화 후 닫음 ── */`);
    lines.push(`${ind(1)}const handleClose = () => {`);
    lines.push(`${ind(2)}handleReset();`);
    lines.push(`${ind(2)}onClose();`);
    lines.push(`${ind(1)}};`);
    lines.push('');

    /* ── handleSave ── */
    lines.push(`${ind(1)}/* ── 저장: validation 후 API 호출 ── */`);
    lines.push(`${ind(1)}const handleSave = async () => {`);
    lines.push(`${ind(2)}const errors: string[] = [];`);
    lines.push('');
    allFields.forEach(f => {
        const n = fieldVar(f);
        if (f.type === 'input') {
            if (f.required) lines.push(`${ind(2)}if (!${n}.trim()) errors.push('[필수] ${f.label}');`);
            if (f.minLength) lines.push(`${ind(2)}if (${n} && ${n}.trim().length < ${f.minLength}) errors.push(\`[최소 ${f.minLength}자] ${f.label} (현재 \${${n}.trim().length}자)\`);`);
            if (f.maxLength) lines.push(`${ind(2)}if (${n} && ${n}.trim().length > ${f.maxLength}) errors.push(\`[최대 ${f.maxLength}자] ${f.label} (현재 \${${n}.trim().length}자)\`);`);
            if (f.pattern) {
                const escapedPattern = f.pattern.replace(/\\/g, '\\\\');
                lines.push(`${ind(2)}if (${n} && !new RegExp('${escapedPattern}').test(${n})) errors.push('[${f.patternDesc || '형식 오류'}] ${f.label}');`);
            }
        } else if (f.type === 'textarea') {
            if (f.required) lines.push(`${ind(2)}if (!${n}.trim()) errors.push('[필수] ${f.label}');`);
            if (f.minLength) lines.push(`${ind(2)}if (${n} && ${n}.trim().length < ${f.minLength}) errors.push(\`[최소 ${f.minLength}자] ${f.label} (현재 \${${n}.trim().length}자)\`);`);
            if (f.maxLength) lines.push(`${ind(2)}if (${n} && ${n}.trim().length > ${f.maxLength}) errors.push(\`[최대 ${f.maxLength}자] ${f.label} (현재 \${${n}.trim().length}자)\`);`);
        } else if (f.type === 'editor') {
            lines.push(`${ind(2)}const ${n}Plain = ${n}.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();`);
            if (f.required) lines.push(`${ind(2)}if (!${n}Plain) errors.push('[필수] ${f.label}');`);
            if (f.minLength) lines.push(`${ind(2)}if (${n}Plain && ${n}Plain.length < ${f.minLength}) errors.push(\`[최소 ${f.minLength}자] ${f.label} (현재 \${${n}Plain.length}자)\`);`);
            if (f.maxLength) lines.push(`${ind(2)}if (${n}Plain && ${n}Plain.length > ${f.maxLength}) errors.push(\`[최대 ${f.maxLength}자] ${f.label} (현재 \${${n}Plain.length}자)\`);`);
        } else if (f.type === 'checkbox') {
            if (f.required) lines.push(`${ind(2)}if (${n}.length === 0) errors.push('[필수] ${f.label}');`);
            if (f.minSelect) lines.push(`${ind(2)}if (${n}.length < ${f.minSelect}) errors.push(\`[최소 ${f.minSelect}개 선택] ${f.label}\`);`);
            if (f.maxSelect) lines.push(`${ind(2)}if (${n}.length > ${f.maxSelect}) errors.push(\`[최대 ${f.maxSelect}개 선택] ${f.label}\`);`);
        } else if (f.type === 'file') {
            const maxCount = f.maxFileCount ?? 1;
            const maxSizeMB = f.maxFileSizeMB ?? 10;
            const maxTotalMB = f.maxTotalSizeMB ?? 20;
            const acceptStr = getAcceptString(f.fileTypeMode || '', f.allowedExtensions || []);
            if (f.required) lines.push(`${ind(2)}if (${n}.length === 0) errors.push('[필수] ${f.label}');`);
            lines.push(`${ind(2)}if (${n}.length > ${maxCount}) errors.push('파일은 최대 ${maxCount}개까지 첨부할 수 있습니다.');`);
            lines.push(`${ind(2)}${n}.forEach(file => {`);
            lines.push(`${ind(3)}if (file.size > ${maxSizeMB} * 1024 * 1024) errors.push(\`'\${file.name}'의 크기가 ${maxSizeMB}MB를 초과합니다.\`);`);
            lines.push(`${ind(2)}});`);
            lines.push(`${ind(2)}if (${n}.reduce((sum, f) => sum + f.size, 0) > ${maxTotalMB} * 1024 * 1024) errors.push('첨부 파일의 전체 크기는 ${maxTotalMB}MB를 초과할 수 없습니다.');`);
            if (acceptStr) {
                const exts = acceptStr.split(',').map(e => `'${e.trim()}'`).join(', ');
                lines.push(`${ind(2)}${n}.forEach(file => {`);
                lines.push(`${ind(3)}const ext = '.' + file.name.split('.').pop()?.toLowerCase();`);
                lines.push(`${ind(3)}if (![${exts}].includes(ext)) errors.push(\`허용되지 않는 파일 형식입니다. (${acceptStr}만 가능)\`);`);
                lines.push(`${ind(2)}});`);
            }
        } else if (f.type === 'image') {
            const imgMaxCount = f.maxFileCount ?? 1;
            const imgMaxSizeMB = f.maxFileSizeMB ?? 10;
            const imgExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'].map(e => `'${e}'`).join(', ');
            if (f.required) lines.push(`${ind(2)}if (${n}.length === 0) errors.push('[필수] ${f.label}');`);
            lines.push(`${ind(2)}if (${n}.length > ${imgMaxCount}) errors.push('이미지는 최대 ${imgMaxCount}개까지 첨부할 수 있습니다.');`);
            lines.push(`${ind(2)}${n}.forEach(file => {`);
            lines.push(`${ind(3)}if (file.size > ${imgMaxSizeMB} * 1024 * 1024) errors.push(\`'\${file.name}'의 크기가 ${imgMaxSizeMB}MB를 초과합니다.\`);`);
            lines.push(`${ind(3)}const ext = '.' + file.name.split('.').pop()?.toLowerCase();`);
            lines.push(`${ind(3)}if (![${imgExts}].includes(ext)) errors.push(\`'\${file.name}'은 허용되지 않는 형식입니다.\`);`);
            lines.push(`${ind(2)}});`);
        } else if (f.type === 'video') {
            if (f.videoMode === 'file') {
                /* 파일 업로드 모드 validation */
                const vfMaxCount = f.maxFileCount ?? 1;
                const vfMaxSizeMB = f.maxFileSizeMB ?? 500;
                const vfMaxTotalMB = f.maxTotalSizeMB ?? 500;
                const vfAcceptStr = getAcceptString(f.fileTypeMode || '', f.allowedExtensions || []);
                if (f.required) lines.push(`${ind(2)}if (${n}.length === 0) errors.push('[필수] ${f.label}');`);
                lines.push(`${ind(2)}if (${n}.length > ${vfMaxCount}) errors.push('동영상은 최대 ${vfMaxCount}개까지 첨부할 수 있습니다.');`);
                lines.push(`${ind(2)}${n}.forEach(file => {`);
                lines.push(`${ind(3)}if (file.size > ${vfMaxSizeMB} * 1024 * 1024) errors.push(\`'\${file.name}'의 크기가 ${vfMaxSizeMB}MB를 초과합니다.\`);`);
                lines.push(`${ind(2)}});`);
                lines.push(`${ind(2)}if (${n}.reduce((sum, f) => sum + f.size, 0) > ${vfMaxTotalMB} * 1024 * 1024) errors.push('동영상 전체 크기는 ${vfMaxTotalMB}MB를 초과할 수 없습니다.');`);
                if (vfAcceptStr) {
                    const vfExts = vfAcceptStr.split(',').map(e => `'${e.trim()}'`).join(', ');
                    lines.push(`${ind(2)}${n}.forEach(file => {`);
                    lines.push(`${ind(3)}const ext = '.' + file.name.split('.').pop()?.toLowerCase();`);
                    lines.push(`${ind(3)}if (![${vfExts}].includes(ext)) errors.push(\`허용되지 않는 동영상 형식입니다. (${vfAcceptStr}만 가능)\`);`);
                    lines.push(`${ind(2)}});`);
                }
            } else {
                /* URL 모드 validation */
                if (f.required) lines.push(`${ind(2)}if (!${n}) errors.push('[필수] ${f.label}');`);
                lines.push(`${ind(2)}if (${n} && !toEmbedUrl(${n})) errors.push('[유튜브/Vimeo URL만 가능] ${f.label}');`);
            }
        } else {
            if (f.required) lines.push(`${ind(2)}if (!${n}) errors.push('[필수] ${f.label}');`);
        }
    });
    lines.push('');
    lines.push(`${ind(2)}if (errors.length > 0) {`);
    lines.push(`${ind(3)}toast.error(\`입력 오류: \${errors.join(', ')}\`);`);
    lines.push(`${ind(3)}return;`);
    lines.push(`${ind(2)}}`);
    lines.push('');
    lines.push(`${ind(2)}/* formData 구성 — 파일 필드는 File[] 배열로 포함 */`);
    lines.push(`${ind(2)}const formData = {`);
    allFields.forEach(f => lines.push(`${ind(3)}${fieldVar(f)},`));
    lines.push(`${ind(2)}};`);
    lines.push('');
    lines.push(`${ind(2)}try {`);
    lines.push(`${ind(3)}await onSave?.(formData);`);
    lines.push(`${ind(2)}} catch (err) {`);
    lines.push(`${ind(3)}console.error('저장 실패:', err);`);
    lines.push(`${ind(2)}}`);
    lines.push(`${ind(1)}};`);
    lines.push('');
    lines.push(`${ind(1)}if (!isOpen) return null;`);
    lines.push('');
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    lines.push(`${ind(1)}// [3] 화면(HTML) 영역`);
    lines.push(`${ind(1)}// 실제로 화면에 그려지는 팝업 HTML 코드입니다.`);
    lines.push(`${ind(1)}// 구성: 배경 오버레이 → 팝업 카드 → 헤더 → 본문(필드들) → 푸터(버튼들)`);
    lines.push(`${ind(1)}// ✏️ 버튼 텍스트·색상·위치를 바꾸려면 푸터 영역을 수정하세요.`);
    lines.push(`${ind(1)}// ──────────────────────────────────────────────────────`);
    lines.push(`${ind(1)}return (`);

    if (layerType === 'center') {
        /* ── 중앙 팝업 JSX ── */
        const widthClass = LAYER_WIDTH_MAP[layerWidth];
        lines.push(`${ind(2)}<div className="fixed inset-0 z-50 flex items-center justify-center p-4">`);
        lines.push(`${ind(3)}{/* 배경 오버레이 */}`);
        lines.push(`${ind(3)}<div className="absolute inset-0 bg-black/40" onClick={handleClose} />`);
        lines.push(`${ind(3)}{/* 팝업 카드 */}`);
        lines.push(`${ind(3)}<div className="relative w-full ${widthClass} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]">`);
        lines.push(`${ind(4)}{/* 헤더 */}`);
        lines.push(`${ind(4)}<div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">`);
        lines.push(`${ind(5)}<h2 className="text-base font-bold text-slate-900">${layerTitle || '레이어 팝업'}</h2>`);
        lines.push(`${ind(5)}<button onClick={handleClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all"><X className="w-4 h-4 text-slate-500" /></button>`);
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}{/* 본문 */}`);
        lines.push(`${ind(4)}<div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">`);
        buildFieldsJsx(rows, ind, 5).forEach(l => lines.push(l));
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}{/* 푸터 */}`);
        lines.push(`${ind(4)}<div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">`);
        (layerButtons.length > 0 ? layerButtons : DEFAULT_LAYER_BUTTONS).forEach(btn => {
            const handler = btn.action === 'close' ? 'handleClose' : btn.action === 'save' ? 'handleSave' : 'undefined';
            const cls = LAYER_BTN_TYPE_CLS[btn.type];
            lines.push(`${ind(5)}<button type="button" onClick={${handler}} className="${cls}">${btn.label}</button>`);
        });
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(3)}</div>`);
        lines.push(`${ind(2)}</div>`);
    } else {
        /* ── 우측 드로어 JSX ── */
        lines.push(`${ind(2)}<div className="fixed inset-0 z-[100] flex justify-end">`);
        lines.push(`${ind(3)}{/* 배경 오버레이 */}`);
        lines.push(`${ind(3)}<div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={handleClose} />`);
        lines.push(`${ind(3)}{/* 드로어 패널 */}`);
        lines.push(`${ind(3)}<div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-200">`);
        lines.push(`${ind(4)}{/* 헤더 */}`);
        lines.push(`${ind(4)}<div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">`);
        lines.push(`${ind(5)}<div>`);
        lines.push(`${ind(6)}<h2 className="text-sm font-bold text-slate-900">${layerTitle || '레이어 팝업'}</h2>`);
        lines.push(`${ind(5)}</div>`);
        lines.push(`${ind(5)}<button onClick={handleClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all"><X className="w-4 h-4" /></button>`);
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}{/* 본문 */}`);
        lines.push(`${ind(4)}<div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">`);
        buildFieldsJsx(rows, ind, 5).forEach(l => lines.push(l));
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(4)}{/* 푸터 */}`);
        lines.push(`${ind(4)}<div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200">`);
        (layerButtons.length > 0 ? layerButtons : DEFAULT_LAYER_BUTTONS).forEach(btn => {
            const handler = btn.action === 'close' ? 'handleClose' : btn.action === 'save' ? 'handleSave' : 'undefined';
            const cls = LAYER_BTN_TYPE_CLS[btn.type];
            lines.push(`${ind(5)}<button type="button" onClick={${handler}} className="${cls}">${btn.label}</button>`);
        });
        lines.push(`${ind(4)}</div>`);
        lines.push(`${ind(3)}</div>`);
        lines.push(`${ind(2)}</div>`);
    }

    lines.push(`${ind(1)});`);
    lines.push('}');

    return lines.join('\n');
};

/* ══════════════════════════════════════════ */
/*  미리보기: 중앙 팝업                        */
/* ══════════════════════════════════════════ */
const CenterPreview = ({ rows, layerTitle, layerWidth, layerButtons = DEFAULT_LAYER_BUTTONS, previewValues, setPreviewValues, codeGroups = [] }: {
    rows: LayerRowConfig[];
    layerTitle: string;
    layerWidth: LayerWidth;
    layerButtons?: LayerButtonConfig[];
    previewValues: Record<string, string>;
    setPreviewValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    codeGroups?: CodeGroupDef[];
}) => {
    const allFields = rows.flatMap(r => r.fields);
    /* 미리보기 저장 버튼 — required + min/max/pattern validation */
    const handlePreviewSave = () => {
        const errors = allFields.reduce<string[]>((acc, f) => {
            const v = previewValues[f.id] || '';
            // 필수 체크
            if (f.required && !v.trim()) { acc.push(`[필수] ${f.label}`); return acc; }
            // input 타입 — 길이·정규식 체크
            if (f.type === 'input') {
                if (f.minLength && v.trim().length > 0 && v.trim().length < f.minLength)
                    acc.push(`[최소 ${f.minLength}자] ${f.label} (현재 ${v.trim().length}자)`);
                if (f.maxLength && v.trim().length > f.maxLength)
                    acc.push(`[최대 ${f.maxLength}자] ${f.label} (현재 ${v.trim().length}자)`);
                if (f.pattern && v && !new RegExp(f.pattern).test(v))
                    acc.push(`[${f.patternDesc || '형식 오류'}] ${f.label}`);
            }
            return acc;
        }, []);
        if (errors.length > 0) { showValidationError(errors); return; }
        toast.success('저장되었습니다. (미리보기)');
    };
    if (allFields.length === 0) return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <LayoutTemplate className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">왼쪽에서 행과 필드를 추가하세요</p>
            <p className="text-xs text-slate-300 mt-1">필드를 추가하면 팝업 미리보기가 표시됩니다</p>
        </div>
    );

    return (
        <div className="flex items-center justify-center min-h-full p-8">
            <div className={`w-full ${LAYER_WIDTH_MAP[layerWidth]} bg-white rounded-xl shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <h2 className="text-base font-bold text-slate-900">{layerTitle || '레이어 팝업'}</h2>
                    <button className="p-1.5 rounded-md hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>
                <div className="px-6 py-5 space-y-4">
                    {/* row별로 cols에 맞게 grid 렌더링 */}
                    {rows.map(row => (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))`, gap: '1.25rem 1rem' }}>
                            {row.fields.map(field => (
                                <div key={field.id} style={{ gridColumn: `span ${Math.min(field.colSpan, row.cols)}` }}>
                                    <label className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <FieldPreview
                                        field={field}
                                        value={previewValues[field.id]}
                                        onChange={v => setPreviewValues(prev => ({ ...prev, [field.id]: v }))}
                                        codeGroups={codeGroups}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 rounded-b-xl">
                    {(layerButtons.length > 0 ? layerButtons : DEFAULT_LAYER_BUTTONS).map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={btn.action === 'save' ? handlePreviewSave : undefined}
                            className={LAYER_BTN_TYPE_CLS[btn.type]}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  미리보기: 우측 드로어                       */
/* ══════════════════════════════════════════ */
const RightPreview = ({ rows, layerTitle, layerButtons = DEFAULT_LAYER_BUTTONS, previewValues, setPreviewValues, codeGroups = [] }: {
    rows: LayerRowConfig[];
    layerTitle: string;
    layerButtons?: LayerButtonConfig[];
    previewValues: Record<string, string>;
    setPreviewValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    codeGroups?: CodeGroupDef[];
}) => {
    const allFields = rows.flatMap(r => r.fields);
    /* 미리보기 저장 버튼 — required + min/max/pattern validation */
    const handlePreviewSave = () => {
        const errors = allFields.reduce<string[]>((acc, f) => {
            const v = previewValues[f.id] || '';
            // 필수 체크
            if (f.required && !v.trim()) { acc.push(`[필수] ${f.label}`); return acc; }
            // input 타입 — 길이·정규식 체크
            if (f.type === 'input') {
                if (f.minLength && v.trim().length > 0 && v.trim().length < f.minLength)
                    acc.push(`[최소 ${f.minLength}자] ${f.label} (현재 ${v.trim().length}자)`);
                if (f.maxLength && v.trim().length > f.maxLength)
                    acc.push(`[최대 ${f.maxLength}자] ${f.label} (현재 ${v.trim().length}자)`);
                if (f.pattern && v && !new RegExp(f.pattern).test(v))
                    acc.push(`[${f.patternDesc || '형식 오류'}] ${f.label}`);
            }
            return acc;
        }, []);
        if (errors.length > 0) { showValidationError(errors); return; }
        toast.success('저장되었습니다. (미리보기)');
    };
    if (allFields.length === 0) return (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
            <PanelRight className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-400">왼쪽에서 행과 필드를 추가하세요</p>
            <p className="text-xs text-slate-300 mt-1">필드를 추가하면 드로어 미리보기가 표시됩니다</p>
        </div>
    );

    return (
        /* 실제 드로어와 동일한 구조 (고정 너비 패널) */
        <div className="h-full flex justify-end bg-black/20">
            <div className="w-[420px] bg-white h-full shadow-xl flex flex-col border-l border-slate-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-sm font-bold text-slate-900">{layerTitle || '레이어 팝업'}</h2>
                    </div>
                    <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                    {/* row별로 cols에 맞게 grid 렌더링 */}
                    {rows.map(row => (
                        <div key={row.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${row.cols}, minmax(0, 1fr))`, gap: '1.25rem 1rem' }}>
                            {row.fields.map(field => (
                                <div key={field.id} style={{ gridColumn: `span ${Math.min(field.colSpan, row.cols)}`, gridRow: field.rowSpan && field.rowSpan > 1 ? `span ${field.rowSpan}` : undefined }}>
                                    <label className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                                        {field.label}
                                        {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    <FieldPreview
                                        field={field}
                                        value={previewValues[field.id]}
                                        onChange={v => setPreviewValues(prev => ({ ...prev, [field.id]: v }))}
                                        codeGroups={codeGroups}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200">
                    {(layerButtons.length > 0 ? layerButtons : DEFAULT_LAYER_BUTTONS).map(btn => (
                        <button
                            key={btn.id}
                            type="button"
                            onClick={btn.action === 'save' ? handlePreviewSave : undefined}
                            className={LAYER_BTN_TYPE_CLS[btn.type]}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */
export default function MakeLayerPage() {

    /* ── 빌더 상태 ── */
    const [fieldRows, setFieldRows] = useState<LayerRowConfig[]>([]);
    const [layerTitle, setLayerTitle] = useState('레이어 팝업');
    /** 접힌 행 ID 집합 — Row 헤더 클릭으로 토글 */
    const [collapsedRows, setCollapsedRows] = useState<Set<string>>(new Set());
    const toggleRowCollapse = (id: string) =>
        setCollapsedRows(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
    const [layerType, setLayerType] = useState<LayerType>('center');
    const [layerWidth, setLayerWidth] = useState<LayerWidth>('md');
    /* 하단 버튼 목록 — 기본값: 닫기 + 저장 */
    const [layerButtons, setLayerButtons] = useState<LayerButtonConfig[]>(DEFAULT_LAYER_BUTTONS);
    /* 버튼 ID 생성기 (렌더마다 재생성 방지) */
    const btnIdGenRef = useRef(createIdGenerator('lb'));

    /* ── Drag & Drop — 공통 훅 사용 ── */
    const { sensors, collisionDetection, handleDragStart, handleDragOver, handleDragEnd } = useSortableRows(fieldRows, setFieldRows);

    /* ── 패널/탭 상태 ── */
    const [leftPanelOpen, setLeftPanelOpen] = useState(true);
    /* 패널 내부 설정 탭: 폼 필드 / 하단 버튼 */
    const [activePanelTab, setActivePanelTab] = useState<'field' | 'button'>('field');
    const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
    const [copied, setCopied] = useState(false);

    /* ── 데이터 소스 선택 (공통 JSON / DB 연동) ── */
    const [dataSource, setDataSource] = useState<'json' | 'db'>('json');
    const [dbTableSearch, setDbTableSearch] = useState('');
    const { tables, selectedTable, selectTable, isLoading: isDbLoading, isColumnsLoading, fetchTables } = useDatabaseStore();

    /* ── 공통코드 목록 ── */
    const [codeGroups, setCodeGroups] = useState<CodeGroupDef[]>([]);
    const [codeGroupsLoading, setCodeGroupsLoading] = useState(false);

    /* 페이지 마운트 시 공통코드 조회 */
    useEffect(() => {
        setCodeGroupsLoading(true);
        api.get('/codes').then(res => setCodeGroups(res.data)).catch(() => { }).finally(() => setCodeGroupsLoading(false));
    }, []);

    /* ── 필드 추가 다이얼로그 ── */
    const [showFieldPicker, setShowFieldPicker] = useState<number | null>(null);
    const [pendingType, setPendingType] = useState<LayerFieldType | null>(null);
    const [pendingLabel, setPendingLabel] = useState('');
    const [pendingOptionMode, setPendingOptionMode] = useState<'manual' | 'code'>('manual');
    const [pendingCodeGroupCode, setPendingCodeGroupCode] = useState('');
    const [pendingFieldKey, setPendingFieldKey] = useState('');
    const [pendingColSpan, setPendingColSpan] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [pendingRowSpan, setPendingRowSpan] = useState<1 | 2 | 3>(1);
    const [pendingPlaceholder, setPendingPlaceholder] = useState('');
    const [pendingRequired, setPendingRequired] = useState(false);
    const [pendingRows, setPendingRows] = useState(3);
    const [pendingOptions, setPendingOptions] = useState<{ text: string; value: string }[]>([]);
    const [pendingMinLength, setPendingMinLength] = useState<number | undefined>();
    const [pendingMaxLength, setPendingMaxLength] = useState<number | undefined>();
    const [pendingPattern, setPendingPattern] = useState('');
    const [pendingPatternDesc, setPendingPatternDesc] = useState('');
    const [pendingMinSelect, setPendingMinSelect] = useState<number | undefined>();
    const [pendingMaxSelect, setPendingMaxSelect] = useState<number | undefined>();
    // ── 파일 업로드 전용 pending 상태 ──
    const [pendingMaxFileCount, setPendingMaxFileCount] = useState<number>(1);
    const [pendingMaxFileSizeMB, setPendingMaxFileSizeMB] = useState<number>(10);
    const [pendingMaxTotalSizeMB, setPendingMaxTotalSizeMB] = useState<number>(20);
    const [pendingFileTypeMode, setPendingFileTypeMode] = useState<'doc' | 'image' | 'video' | 'custom' | ''>('');
    // ── video 전용: URL/파일 모드 ──
    const [pendingVideoMode, setPendingVideoMode] = useState<'url' | 'file'>('url');
    const [pendingAllowedExtensions, setPendingAllowedExtensions] = useState<string[]>([]);
    const [pendingExtInput, setPendingExtInput] = useState('');   // 확장자 입력 임시값
    const [pendingExtError, setPendingExtError] = useState('');   // 확장자 인라인 에러
    const [pendingReadonly, setPendingReadonly] = useState(false); // 읽기 전용 여부

    /* ── 필드 편집 ── */
    const [editingField, setEditingField] = useState<string | null>(null);

    /* ── 미리보기 각 필드 값 ── */
    const [previewValues, setPreviewValues] = useState<Record<string, string>>({});

    /* ── 페이지 템플릿 상태 ── */
    const [currentTemplateId, setCurrentTemplateId] = useState<number | null>(null);
    const [currentTemplateName, setCurrentTemplateName] = useState('');
    /* 저장 모달 */
    const [showSaveModal, setShowSaveModal] = useState(false);
    const [saveModalName, setSaveModalName] = useState('');
    const [saveModalSlug, setSaveModalSlug] = useState('');
    const [saveModalDesc, setSaveModalDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    /* 불러오기 드롭다운 */
    const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
    const [templateSearchQuery, setTemplateSearchQuery] = useState(''); // 템플릿 검색어
    const [templateList, setTemplateList] = useState<TemplateItem[]>([]);
    const [isLoadingList, setIsLoadingList] = useState(false);
    /* 템플릿 인라인 편집 상태 */
    const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
    const [editingTemplateName, setEditingTemplateName] = useState('');
    const [editingTemplateSlug, setEditingTemplateSlug] = useState('');
    const [isDeletingId, setIsDeletingId] = useState<number | null>(null);
    const [isDuplicatingId, setIsDuplicatingId] = useState<number | null>(null);
    /* 생성 이력 드롭다운 */
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
    const [historyList, setHistoryList] = useState<{ id: number; name: string; folderName: string; fileName: string; createdAt: string }[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [isDeletingHistoryId, setIsDeletingHistoryId] = useState<number | null>(null);
    /* 생성 모달 */
    const [showGenerateModal, setShowGenerateModal] = useState(false);
    const [generateName, setGenerateName] = useState('');
    const [generateSlug, setGenerateSlug] = useState('');
    const [generateFileName, setGenerateFileName] = useState('LayerPopup');
    const [isGenerating, setIsGenerating] = useState(false);

    /* ── 템플릿 목록 자동 로딩 (패널 마운트 시 1회) ── */
    useEffect(() => {
        setIsLoadingList(true);
        api.get('/page-templates')
            .then(res => setTemplateList(res.data))
            .catch(() => { })
            .finally(() => setIsLoadingList(false));
    }, []);

    /* ── 생성된 코드 ── */
    const generatedCode = buildLayerTsx(fieldRows, layerTitle, layerType, layerWidth, layerButtons);

    /* ── 복사 ── */
    const handleCopy = async () => {
        await navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };


    /* ══════════════════════════════════════ */
    /*  저장 / 불러오기 / 생성 핸들러            */
    /* ══════════════════════════════════════ */

    /* configJson → 메이커 상태 복원 */
    const restoreFromConfigJson = (configJson: string) => {
        try {
            const parsed = JSON.parse(configJson);
            /* cols 필드 없는 구버전 템플릿 대비 기본값 2 적용 + 필드 ID 중복 재생성 */
            if (parsed.fieldRows) {
                const deduped = (parsed.fieldRows as LayerRowConfig[]).map(r => ({
                    ...r,
                    id: uid(),
                    cols: r.cols ?? 2,
                    fields: r.fields.map(f => ({
                        ...f,
                        id: uid(),
                    })),
                }));
                setFieldRows(deduped);
            }
            if (parsed.layerTitle) setLayerTitle(parsed.layerTitle);
            if (parsed.layerType) setLayerType(parsed.layerType);
            if (parsed.layerWidth) setLayerWidth(parsed.layerWidth);
            /* 구버전 템플릿 하위 호환 — layerButtons 없으면 기본값 유지 */
            if (parsed.layerButtons) setLayerButtons(parsed.layerButtons);
            else setLayerButtons(DEFAULT_LAYER_BUTTONS);
        } catch {
            toast.error('설정 데이터 파싱 중 오류가 발생했습니다.');
        }
    };

    /* ══════════════════════════════════════ */
    /*  하단 버튼 조작 함수                    */
    /* ══════════════════════════════════════ */

    /** 버튼 추가 */
    const addLayerButton = () => {
        const newBtn: LayerButtonConfig = {
            id: btnIdGenRef.current(),
            label: '버튼',
            type: 'secondary',
            action: 'custom',
        };
        setLayerButtons(prev => [...prev, newBtn]);
    };

    /** 버튼 필드 업데이트 */
    const updateLayerButton = (id: string, patch: Partial<LayerButtonConfig>) => {
        setLayerButtons(prev => prev.map(b => b.id === id ? { ...b, ...patch } : b));
    };

    /** 버튼 삭제 */
    const removeLayerButton = (id: string) => {
        setLayerButtons(prev => prev.filter(b => b.id !== id));
    };

    /** 버튼 순서 이동 */
    const moveLayerButton = (idx: number, dir: 'up' | 'down') => {
        setLayerButtons(prev => {
            const arr = [...prev];
            const target = dir === 'up' ? idx - 1 : idx + 1;
            if (target < 0 || target >= arr.length) return arr;
            [arr[idx], arr[target]] = [arr[target], arr[idx]];
            return arr;
        });
    };

    /* fieldKey 중복 검사 — 저장/생성 전 공통 사용 */
    const checkDuplicateKeys = (): boolean => {
        // 이미 추가된 필드 key 목록
        const existingKeys = fieldRows.flatMap(r => r.fields).map(f => f.fieldKey?.trim() || varName(f.label));
        // 추가 패널이 열려있고 key가 입력된 경우 함께 검사
        const pendingKey = pendingType !== null ? (pendingFieldKey.trim() || varName(pendingLabel)) : '';
        const allKeys = [...existingKeys, pendingKey];

        const dupes = findDuplicateKeys(allKeys);
        if (dupes.length > 0) {
            toast.error(`key 중복: ${dupes.join(', ')}`);
            return false;
        }
        return true;
    };

    /* 저장 열기 */
    const handleSaveOpen = () => {
        if (!checkDuplicateKeys()) return;
        setSaveModalName(currentTemplateName || '');
        /* 신규 저장일 때만 slug/설명 초기화 — 수정 모드는 기존 값 유지 */
        if (!currentTemplateId) {
            setSaveModalSlug('');
            setSaveModalDesc('');
        }
        setShowSaveModal(true);
    };

    /* 저장 확인 */
    const handleSaveConfirm = async () => {
        const trimmedName = saveModalName.trim();
        const trimmedSlug = saveModalSlug.trim();
        const trimmedDesc = saveModalDesc.trim();

        if (!trimmedName || !trimmedSlug) return;
        setIsSaving(true);

        const configJson = JSON.stringify({ fieldRows, layerTitle, layerType, layerWidth, layerButtons });
        try {
            if (currentTemplateId) {
                const res = await api.put(`/page-templates/${currentTemplateId}`, {
                    name: trimmedName,
                    slug: trimmedSlug,
                    description: trimmedDesc,
                    configJson,
                    templateType: 'LAYER',
                });
                setCurrentTemplateName(res.data.name);
                toast.success('템플릿이 수정되었습니다.');
            } else {
                const res = await api.post('/page-templates', {
                    name: trimmedName,
                    slug: trimmedSlug,
                    description: trimmedDesc,
                    configJson,
                    templateType: 'LAYER',
                });
                setCurrentTemplateId(res.data.id);
                setCurrentTemplateName(res.data.name);
                setSaveModalSlug(res.data.slug);
                toast.success('템플릿이 저장되었습니다.');
            }
            setShowSaveModal(false);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string, fieldErrors?: Record<string, string> } } };
            const data = axiosError.response?.data;
            const msg = data?.message;
            const fieldErrors = data?.fieldErrors;

            if (fieldErrors) {
                const detailMsg = Object.entries(fieldErrors)
                    .map(([field, error]) => `• ${field}: ${error}`)
                    .join('\n');
                toast.error(`유효성 검증 실패:\n${detailMsg}`);
            } else {
                toast.error(msg || '저장 중 오류가 발생했습니다.');
            }
        } finally {
            setIsSaving(false);
        }
    };

    /* 드롭다운 토글 (마운트 시 자동 로드한 목록 사용) */
    const toggleTemplateDropdown = () => {
        setShowHistoryDropdown(false);
        setShowTemplateDropdown(prev => !prev);
        setTemplateSearchQuery(''); // 열고 닫을 때 검색어 초기화
    };

    /* LAYER 타입 템플릿만 필터링 + 검색어 필터 */
    const layerTypeTemplates = templateList
        .filter(t => t.templateType === 'LAYER')
        .filter(t => !templateSearchQuery || t.name.toLowerCase().includes(templateSearchQuery.toLowerCase()));

    /* ── DB 연동: DB 컬럼 → 레이어 폼 필드 자동 생성 ── */
    const handleDbAutoApply = useCallback(() => {
        if (!selectedTable || selectedTable.columns.length === 0) return;

        /* 시스템 컬럼 및 PK 제외 */
        const targetCols = selectedTable.columns.filter(
            col => !SYSTEM_COLUMNS.has(col.columnName.toLowerCase()) && !col.isPrimaryKey
        );

        /* DB 타입 → 레이어 필드 타입 매핑 */
        const newFields: LayerFieldConfig[] = targetCols.map(col => {
            const dt = col.dataType.toLowerCase();
            const label = col.comment || col.columnName;
            const key = col.columnName;

            let type: LayerFieldType = 'input';
            let rowSpan: 1 | 2 | 3 | undefined;

            if (dt === 'boolean' || (dt.includes('tinyint') && col.length === 1)) {
                type = 'select';
            } else if (dt.includes('datetime') || dt.includes('timestamp')) {
                type = 'date';
            } else if (dt === 'text' || dt === 'longtext' || dt === 'clob') {
                type = 'textarea';
                rowSpan = 2;
            } else if (dt.includes('select') || dt === 'enum') {
                type = 'select';
            }

            return {
                id: uid(),
                type,
                label,
                fieldKey: key,
                colSpan: (type === 'textarea' ? 2 : 1) as 1 | 2,
                rowSpan,
            };
        });

        /* 2칸 기준으로 row 패킹 */
        const ROW_COLS = 2 as const;
        const newFieldRows: LayerRowConfig[] = [];
        let currentFields: LayerFieldConfig[] = [];
        let remaining = ROW_COLS;

        for (const field of newFields) {
            if (field.colSpan > remaining) {
                if (currentFields.length > 0) {
                    newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
                }
                currentFields = [field];
                remaining = ROW_COLS - field.colSpan;
            } else {
                currentFields.push(field);
                remaining -= field.colSpan;
            }
            if (remaining === 0) {
                newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
                currentFields = [];
                remaining = ROW_COLS;
            }
        }
        if (currentFields.length > 0) {
            newFieldRows.push({ id: uid(), cols: ROW_COLS, fields: currentFields });
        }

        setFieldRows(newFieldRows);
        setActivePanelTab('field');
        toast.success(`"${selectedTable.tableName}" 자동 적용 완료 (필드 ${newFields.length}개)`);
    }, [selectedTable, setFieldRows, setActivePanelTab]);

    /* 불러오기 선택 */
    const handleLoadSelect = (tpl: TemplateItem) => {
        restoreFromConfigJson(tpl.configJson);
        setCurrentTemplateId(tpl.id);
        setCurrentTemplateName(tpl.name);
        setSaveModalSlug(tpl.slug);
        setSaveModalDesc(tpl.description || '');
        setEditingTemplateId(null);
        setShowTemplateDropdown(false);
        toast.success(`"${tpl.name}" 템플릿을 불러왔습니다.`);
    };

    /* ── 생성 이력 드롭다운 토글 (열 때 API 호출 + 템플릿 드롭다운 닫기) ── */
    const toggleHistoryDropdown = async () => {
        setShowTemplateDropdown(false);
        if (!showHistoryDropdown) {
            setIsLoadingHistory(true);
            try {
                const res = await api.get('/tsx-generation', { params: { templateType: 'LAYER', size: 50 } });
                setHistoryList(res.data.content);
            } catch {
                toast.error('생성 이력 로딩 중 오류가 발생했습니다.');
            } finally {
                setIsLoadingHistory(false);
            }
        }
        setShowHistoryDropdown(prev => !prev);
    };

    /** 생성 이력 선택 — configJson을 빌더에 복원 */
    const handleHistorySelect = async (id: number, name: string) => {
        try {
            const res = await api.get(`/tsx-generation/${id}`);
            restoreFromConfigJson(res.data.configJson);
            setShowHistoryDropdown(false);
            toast.success(`"${name}" 이력을 불러왔습니다.`);
        } catch {
            toast.error('이력 불러오기 중 오류가 발생했습니다.');
        }
    };

    /** 생성 이력 삭제 */
    const handleDeleteHistory = async (id: number) => {
        if (!window.confirm('이력을 삭제하시겠습니까?')) return;
        setIsDeletingHistoryId(id);
        try {
            await api.delete(`/tsx-generation/${id}`);
            setHistoryList(prev => prev.filter(h => h.id !== id));
            toast.success('이력이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeletingHistoryId(null);
        }
    };

    /* 템플릿 삭제 */
    const handleDeleteTemplate = async (id: number) => {
        if (!window.confirm('템플릿을 삭제하시겠습니까?')) return;
        setIsDeletingId(id);
        try {
            await api.delete(`/page-templates/${id}`);
            setTemplateList(prev => prev.filter(t => t.id !== id));
            if (currentTemplateId === id) {
                setCurrentTemplateId(null);
                setCurrentTemplateName('');
            }
            toast.success('템플릿이 삭제되었습니다.');
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeletingId(null);
        }
    };

    /* 템플릿 복사 */
    const handleDuplicateTemplate = async (tpl: TemplateItem) => {
        setIsDuplicatingId(tpl.id);
        try {
            const newName = `${tpl.name} (복사)`;
            const newSlug = `${tpl.slug}-copy`;
            const res = await api.post('/page-templates', {
                name: newName,
                slug: newSlug,
                description: tpl.description || '',
                configJson: tpl.configJson,
                templateType: 'LAYER',
            });
            setTemplateList(prev => [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name)));
            toast.success(`"${newName}" 으로 복사되었습니다.`);
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string, fieldErrors?: Record<string, string> } } };
            const data = axiosError.response?.data;
            if (data?.fieldErrors) {
                const detailMsg = Object.entries(data.fieldErrors)
                    .map(([field, error]) => `• ${field}: ${error}`)
                    .join('\n');
                toast.error(`복사 실패 (유효성 검증):\n${detailMsg}`);
            } else {
                toast.error(data?.message || '복사 중 오류가 발생했습니다.');
            }
        } finally {
            setIsDuplicatingId(null);
        }
    };

    /* 템플릿 이름/slug 인라인 수정 */
    const handleUpdateTemplateMeta = async (id: number, existingConfigJson: string) => {
        const trimmedName = editingTemplateName.trim();
        const trimmedSlug = editingTemplateSlug.trim();
        if (!trimmedName || !trimmedSlug) return;

        try {
            const res = await api.put(`/page-templates/${id}`, {
                name: trimmedName,
                slug: trimmedSlug,
                configJson: existingConfigJson,
                templateType: 'LAYER',
            });
            setTemplateList(prev => prev.map(t => t.id === id ? res.data : t));
            if (currentTemplateId === id) setCurrentTemplateName(trimmedName);
            setEditingTemplateId(null);
            toast.success('정보가 수정되었습니다.');
        } catch (err: unknown) {
            const axiosError = err as { response?: { data?: { message?: string, fieldErrors?: Record<string, string> } } };
            const data = axiosError.response?.data;
            if (data?.fieldErrors) {
                const detailMsg = Object.entries(data.fieldErrors)
                    .map(([field, error]) => `• ${field}: ${error}`)
                    .join('\n');
                toast.error(`수정 실패 (유효성 검증):\n${detailMsg}`);
            } else {
                toast.error(data?.message || '수정 중 오류가 발생했습니다.');
            }
        }
    };

    /* 생성 열기 */
    const handleGenerateOpen = () => {
        if (!checkDuplicateKeys()) return;
        setGenerateName(saveModalName || '');
        setGenerateSlug(saveModalSlug || '');
        setGenerateFileName('LayerPopup');
        setShowGenerateModal(true);
    };

    /* 생성 확인 (TSX 파일 생성 + 이력 저장) */
    const handleGenerateConfirm = async () => {
        if (!generateName.trim() || !generateSlug.trim() || !generateFileName.trim()) return;
        setIsGenerating(true);
        const configJson = JSON.stringify({ fieldRows, layerTitle, layerType, layerWidth, layerButtons });
        try {
            const tsxCode = generatedCode;

            /* 1. TSX 파일만 생성 (page_template DB 저장 없음) */
            await api.post('/page-templates/generate', {
                slug: generateSlug,
                fileName: generateFileName,
                tsxCode,
                templateType: 'LAYER',
            });

            /* 2. 생성 이력 저장 (tsx_generation 테이블) */
            await api.post('/tsx-generation', {
                name: generateName,
                folderName: generateSlug,
                fileName: generateFileName + '.tsx',
                templateType: 'LAYER',
                configJson,
                tsxCode,
            });

            toast.success(`${generateFileName}.tsx 생성 완료! → /admin/generated/${generateSlug}/${generateFileName}.tsx`);
            setShowGenerateModal(false);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || 'TSX 파일 생성 중 오류가 발생했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    /* ══════════════════════════════════════ */
    /*  필드 조작 함수                         */
    /* ══════════════════════════════════════ */
    const selectFieldType = (type: LayerFieldType) => {
        setPendingType(type);
        setPendingLabel('');
        setPendingFieldKey('');
        setPendingColSpan(FIELD_TYPES.find(t => t.type === type)?.defaultColSpan || 1);
        setPendingRowSpan((FIELD_TYPES.find(t => t.type === type)?.defaultRowSpan || 1) as 1 | 2 | 3);
        setPendingPlaceholder('');
        setPendingRequired(false);
        setPendingRows(3);
        setPendingOptions([{ text: '', value: '' }]);
        setPendingMinLength(undefined);
        setPendingMaxLength(undefined);
        setPendingPattern('');
        setPendingPatternDesc('');
        setPendingMinSelect(undefined);
        setPendingMaxSelect(undefined);
        setPendingOptionMode('manual');
        setPendingCodeGroupCode('');
        // 파일 업로드 전용 초기값
        setPendingMaxFileCount(1);
        setPendingMaxFileSizeMB(10);
        setPendingMaxTotalSizeMB(20);
        setPendingFileTypeMode('');
        setPendingAllowedExtensions([]);
        // video 전용 모드 초기값
        setPendingVideoMode('url');
        setPendingExtInput('');
        setPendingExtError('');
    };

    const confirmAddField = () => {
        if (showFieldPicker === null || !pendingType || !pendingLabel.trim() || !pendingFieldKey.trim()) return;
        /* 공통코드 모드 여부 (select/radio/checkbox만) */
        const isCodeMode = pendingOptionMode === 'code' && needsOptions(pendingType);
        if (isCodeMode && !pendingCodeGroupCode) return;
        const validOpts = pendingOptions.filter(o => o.text.trim());
        if (!isCodeMode && needsOptions(pendingType) && validOpts.length === 0) return;

        const newField: LayerFieldConfig = {
            id: uid(),
            type: pendingType,
            label: pendingLabel.trim(),
            fieldKey: pendingFieldKey.trim(),
            placeholder: pendingPlaceholder.trim() || undefined,
            colSpan: pendingColSpan,
            rowSpan: pendingType === 'textarea' && pendingRowSpan > 1 ? pendingRowSpan : undefined,
            required: pendingRequired || undefined,
            /* 공통코드 모드면 codeGroupCode 저장, 수동 모드면 options 저장 */
            options: !isCodeMode && needsOptions(pendingType)
                ? validOpts.map(o => `${o.text.trim()}:${o.value.trim() || o.text.trim()}`)
                : undefined,
            codeGroupCode: isCodeMode ? pendingCodeGroupCode : undefined,
            rows: pendingType === 'textarea' ? pendingRows : undefined,
            minLength: pendingType === 'input' && pendingMinLength ? pendingMinLength : undefined,
            maxLength: (pendingType === 'input' || pendingType === 'textarea') && pendingMaxLength ? pendingMaxLength : undefined,
            pattern: pendingType === 'input' && pendingPattern ? pendingPattern : undefined,
            patternDesc: pendingType === 'input' && pendingPatternDesc ? pendingPatternDesc : undefined,
            minSelect: pendingType === 'checkbox' && pendingMinSelect ? pendingMinSelect : undefined,
            maxSelect: pendingType === 'checkbox' && pendingMaxSelect ? pendingMaxSelect : undefined,
            // 파일 업로드 전용 필드 (file, image, 또는 video의 파일 모드)
            maxFileCount: (pendingType === 'file' || pendingType === 'image' || (pendingType === 'video' && pendingVideoMode === 'file')) ? pendingMaxFileCount : undefined,
            maxFileSizeMB: (pendingType === 'file' || pendingType === 'image' || (pendingType === 'video' && pendingVideoMode === 'file')) ? pendingMaxFileSizeMB : undefined,
            maxTotalSizeMB: (pendingType === 'file' || (pendingType === 'video' && pendingVideoMode === 'file')) ? pendingMaxTotalSizeMB : undefined,
            fileTypeMode: (pendingType === 'file' || (pendingType === 'video' && pendingVideoMode === 'file')) ? pendingFileTypeMode : undefined,
            allowedExtensions: (pendingType === 'file' || (pendingType === 'video' && pendingVideoMode === 'file')) ? pendingAllowedExtensions : undefined,
            // video 전용
            videoMode: pendingType === 'video' ? pendingVideoMode : undefined,
            readonly: pendingReadonly || undefined,
        };

        setFieldRows(prev => prev.map((row, i) =>
            i === showFieldPicker ? { ...row, fields: [...row.fields, newField] } : row
        ));
        setPendingType(null);
        setPendingLabel('');
        setPendingFieldKey('');
        setPendingOptions([]);
        setPendingReadonly(false);
        setShowFieldPicker(null);
    };

    const cancelAddField = () => {
        setPendingType(null);
        setPendingLabel('');
        setPendingFieldKey('');
        setShowFieldPicker(null);
    };

    const removeField = (rowIdx: number, id: string) => {
        setFieldRows(prev => {
            const next = prev.map((row, i) =>
                i === rowIdx ? { ...row, fields: row.fields.filter(f => f.id !== id) } : row
            );
            return next.filter(row => row.fields.length > 0);
        });
        if (editingField === id) setEditingField(null);
    };

    const updateField = (id: string, updates: Partial<LayerFieldConfig>) => {
        setFieldRows(prev =>
            prev.map(row => ({ ...row, fields: row.fields.map(f => f.id === id ? { ...f, ...updates } : f) }))
        );
    };

    const moveField = (rowIdx: number, fieldIdx: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? fieldIdx - 1 : fieldIdx + 1;
        setFieldRows(prev => prev.map((row, i) => {
            if (i !== rowIdx || target < 0 || target >= row.fields.length) return row;
            const next = [...row.fields];
            [next[fieldIdx], next[target]] = [next[target], next[fieldIdx]];
            return { ...row, fields: next };
        }));
    };

    const addRow = () => setFieldRows(prev => [...prev, { id: uid(), cols: 2, fields: [] }]);

    const updateRowCols = (rowIdx: number, cols: 1 | 2 | 3 | 4 | 5) => {
        setFieldRows(prev => prev.map((row, i) => i === rowIdx ? { ...row, cols } : row));
    };

    const removeRow = (rowIdx: number) => {
        setFieldRows(prev => prev.filter((_, i) => i !== rowIdx));
        setShowFieldPicker(null);
    };

    const moveRow = (rowIdx: number, dir: 'up' | 'down') => {
        const target = dir === 'up' ? rowIdx - 1 : rowIdx + 1;
        setFieldRows(prev => {
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            [next[rowIdx], next[target]] = [next[target], next[rowIdx]];
            return next;
        });
    };

    /* ══════════════════════════════════════ */
    /*  렌더                                   */
    /* ══════════════════════════════════════ */
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => { setIsMounted(true); }, []);
    if (!isMounted) return <div className="p-10 flex items-center justify-center min-h-[50vh]"><Loader2 className="w-8 h-8 text-slate-300 animate-spin" /></div>;

    return (
        <div className="space-y-5">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-slate-400" />
                        레이어 팝업 빌더
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        팝업 유형과 폼 필드를 구성하여 레이어 팝업 코드를 생성하세요.
                        {currentTemplateName && (
                            <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">
                                <Save className="w-3 h-3" />{currentTemplateName}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            {/* ── 메인 레이아웃 ── */}
            <div className={`grid ${leftPanelOpen ? 'grid-cols-[340px_1fr]' : 'grid-cols-1'} gap-5 items-start`}>

                {/* ════════════════════════════════════ */}
                {/* 왼쪽 빌더 패널                       */}
                {/* ════════════════════════════════════ */}
                {leftPanelOpen && (
                    <div className="bg-white border border-slate-200 rounded-xl sticky top-4">
                        {/* 템플릿 선택 드롭다운 */}
                        <div className="px-3 pt-2.5 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <div className="relative">
                                {/* 드롭다운 트리거 */}
                                <button
                                    onClick={toggleTemplateDropdown}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-md text-xs transition-all ${showTemplateDropdown ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                                >
                                    <span className={currentTemplateName ? 'text-slate-800 font-medium' : 'text-slate-400'}>
                                        {currentTemplateName || '템플릿 선택...'}
                                    </span>
                                    {isLoadingList
                                        ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                                        : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showTemplateDropdown ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                                {/* 드롭다운 목록 */}
                                {showTemplateDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                                        {/* 검색 입력 */}
                                        <div className="px-2 py-1.5 border-b border-slate-100">
                                            <div className="flex items-center gap-1.5 px-2 py-1 border border-slate-200 rounded-md bg-slate-50 focus-within:border-slate-400 focus-within:bg-white transition-all">
                                                <Search className="w-3 h-3 text-slate-400 shrink-0" />
                                                <input
                                                    autoFocus
                                                    value={templateSearchQuery}
                                                    onChange={e => setTemplateSearchQuery(e.target.value)}
                                                    placeholder="템플릿 검색..."
                                                    className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                                                />
                                                {templateSearchQuery && (
                                                    <button onClick={() => setTemplateSearchQuery('')} className="text-slate-300 hover:text-slate-500">
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {layerTypeTemplates.length === 0 ? (
                                            <div className="py-5 text-center text-xs text-slate-400">
                                                {templateSearchQuery ? '검색 결과가 없습니다.' : '저장된 템플릿이 없습니다.'}
                                            </div>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                                {layerTypeTemplates.map(tpl => (
                                                    <div
                                                        key={tpl.id}
                                                        className={`group px-3 py-2 transition-all ${currentTemplateId === tpl.id ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                                                    >
                                                        {editingTemplateId === tpl.id ? (
                                                            /* 인라인 편집 폼 */
                                                            <div className="space-y-1.5 py-0.5">
                                                                <input
                                                                    value={editingTemplateName}
                                                                    onChange={e => setEditingTemplateName(e.target.value)}
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-900"
                                                                    placeholder="이름"
                                                                    autoFocus
                                                                />
                                                                {/* 수정 시 slug 변경 불가 */}
                                                                <input
                                                                    value={editingTemplateSlug}
                                                                    readOnly
                                                                    onClick={e => e.stopPropagation()}
                                                                    className="w-full border border-slate-200 rounded px-2 py-1 text-[10px] font-mono bg-slate-50 text-slate-400 cursor-not-allowed"
                                                                    placeholder="slug"
                                                                />
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setEditingTemplateId(null); }}
                                                                        className="flex-1 py-1 text-[10px] text-slate-500 border border-slate-200 rounded hover:bg-slate-50 transition-all"
                                                                    >취소</button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); handleUpdateTemplateMeta(tpl.id, tpl.configJson); }}
                                                                        disabled={!editingTemplateName.trim() || !editingTemplateSlug.trim()}
                                                                        className="flex-1 py-1 text-[10px] text-white bg-slate-900 rounded hover:bg-slate-800 disabled:opacity-40 transition-all"
                                                                    >저장</button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            /* 일반 항목 */
                                                            <div className="flex items-center gap-1">
                                                                {/* 이름 클릭 → 불러오기 */}
                                                                <button
                                                                    onClick={() => handleLoadSelect(tpl)}
                                                                    className="flex-1 text-left min-w-0"
                                                                >
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className="text-[11px] font-medium text-slate-800 truncate">{tpl.name}</span>
                                                                        {currentTemplateId === tpl.id && (
                                                                            <span className="text-[9px] font-bold text-blue-500 bg-blue-100 px-1 py-0.5 rounded shrink-0">현재</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-[10px] text-slate-400 font-mono truncate">{tpl.slug}</p>
                                                                </button>
                                                                {/* 수정/복사/삭제 — hover 시 표시 */}
                                                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); setEditingTemplateId(tpl.id); setEditingTemplateName(tpl.name); setEditingTemplateSlug(tpl.slug); }}
                                                                        className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-all"
                                                                        title="수정"
                                                                    ><Pencil className="w-3 h-3" /></button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); handleDuplicateTemplate(tpl); }}
                                                                        disabled={isDuplicatingId === tpl.id}
                                                                        className="p-1 rounded text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all disabled:opacity-50"
                                                                        title="복사"
                                                                    >
                                                                        {isDuplicatingId === tpl.id
                                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                            : <Copy className="w-3 h-3" />}
                                                                    </button>
                                                                    <button
                                                                        onClick={e => { e.stopPropagation(); handleDeleteTemplate(tpl.id); }}
                                                                        disabled={isDeletingId === tpl.id}
                                                                        className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50"
                                                                        title="삭제"
                                                                    >
                                                                        {isDeletingId === tpl.id
                                                                            ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                            : <Trash2 className="w-3 h-3" />}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* 생성 이력 드롭다운 */}
                        <div className="px-3 pb-2 border-b border-slate-100 bg-slate-50/30">
                            <div className="relative">
                                <button
                                    onClick={toggleHistoryDropdown}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 border rounded-md text-xs transition-all ${showHistoryDropdown ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                                >
                                    <span className="text-slate-400">생성 이력...</span>
                                    {isLoadingHistory
                                        ? <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
                                        : <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showHistoryDropdown ? 'rotate-180' : ''}`} />
                                    }
                                </button>
                                {showHistoryDropdown && (
                                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
                                        {historyList.length === 0 ? (
                                            <div className="py-5 text-center text-xs text-slate-400">생성 이력이 없습니다.</div>
                                        ) : (
                                            <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                                                {historyList.map(h => (
                                                    <div key={h.id} className="group px-3 py-2 hover:bg-slate-50 transition-all">
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleHistorySelect(h.id, h.name)}
                                                                className="flex-1 text-left min-w-0"
                                                            >
                                                                <span className="text-[11px] font-medium text-slate-800 truncate block">{h.name}</span>
                                                                <p className="text-[10px] text-slate-400 font-mono truncate">{h.folderName}/{h.fileName}</p>
                                                            </button>
                                                            <button
                                                                onClick={e => { e.stopPropagation(); handleDeleteHistory(h.id); }}
                                                                disabled={isDeletingHistoryId === h.id}
                                                                className="p-1 rounded opacity-0 group-hover:opacity-100 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all disabled:opacity-50 shrink-0"
                                                                title="삭제"
                                                            >
                                                                {isDeletingHistoryId === h.id
                                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                                    : <Trash2 className="w-3 h-3" />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 데이터 소스 선택 탭 (List와 동일 패턴) */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1">
                            <button
                                onClick={() => setDataSource('json')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${dataSource === 'json'
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400 hover:text-slate-700'
                                    }`}
                            >
                                <Code className="w-3 h-3" />
                                공통(JSON)
                            </button>
                            <button
                                onClick={() => { setDataSource('db'); if (tables.length === 0) fetchTables(); }}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md border transition-all ${dataSource === 'db'
                                    ? 'bg-blue-600 text-white border-blue-600'
                                    : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                    }`}
                            >
                                <Database className="w-3 h-3" />
                                DB 연동
                            </button>
                        </div>

                        {/* DB 연동 모드: 테이블 선택 패널 */}
                        {dataSource === 'db' && (
                            <div className="border-b border-slate-100 bg-blue-50/30">
                                {/* 테이블 검색 */}
                                <div className="px-3 pt-2.5 pb-1.5">
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                        <input
                                            type="text"
                                            value={dbTableSearch}
                                            onChange={e => setDbTableSearch(e.target.value)}
                                            placeholder="테이블명 / 설명 검색"
                                            className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400 bg-white"
                                        />
                                    </div>
                                </div>
                                {/* 테이블 목록 */}
                                <div className="max-h-[160px] overflow-y-auto px-1.5 pb-1.5 space-y-0.5">
                                    {isDbLoading ? (
                                        <div className="flex items-center justify-center py-4 gap-2 text-slate-400">
                                            <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                                            <span className="text-[11px]">불러오는 중...</span>
                                        </div>
                                    ) : tables.filter(t =>
                                        t.tableName.toLowerCase().includes(dbTableSearch.toLowerCase()) ||
                                        (t.comment ?? '').toLowerCase().includes(dbTableSearch.toLowerCase())
                                    ).length === 0 ? (
                                        <div className="py-4 text-center text-[11px] text-slate-400">
                                            {dbTableSearch ? '검색 결과가 없습니다.' : '테이블이 없습니다.'}
                                        </div>
                                    ) : (
                                        tables
                                            .filter(t =>
                                                t.tableName.toLowerCase().includes(dbTableSearch.toLowerCase()) ||
                                                (t.comment ?? '').toLowerCase().includes(dbTableSearch.toLowerCase())
                                            )
                                            .map(table => {
                                                const isSelected = selectedTable?.tableName === table.tableName;
                                                return (
                                                    <button
                                                        key={table.tableName}
                                                        onClick={() => selectTable(isSelected ? null : table)}
                                                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${isSelected
                                                            ? 'bg-blue-600 text-white'
                                                            : 'hover:bg-blue-50 text-slate-700'
                                                            }`}
                                                    >
                                                        {/* comment 우선 표시, 없으면 tableName */}
                                                        <div className="flex flex-col flex-1 min-w-0 mr-1.5">
                                                            <span className="text-[11px] font-medium truncate">
                                                                {table.comment || table.tableName}
                                                            </span>
                                                            {table.comment && (
                                                                <span className={`text-[10px] font-mono truncate ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                                    {table.tableName}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] shrink-0 ${isSelected ? 'text-blue-200' : 'text-slate-400'}`}>
                                                            {table.columnCount}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                    )}
                                </div>
                                {/* 자동 적용 버튼 */}
                                <div className="px-3 py-2 border-t border-blue-100/60">
                                    <button
                                        disabled={!selectedTable || isColumnsLoading}
                                        onClick={handleDbAutoApply}
                                        className={`w-full flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-md transition-all ${selectedTable && !isColumnsLoading
                                            ? 'bg-blue-600 text-white hover:bg-blue-700'
                                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                            }`}
                                    >
                                        {isColumnsLoading
                                            ? <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                            : <Sparkles className="w-3 h-3" />
                                        }
                                        {isColumnsLoading
                                            ? '컬럼 로딩 중...'
                                            : selectedTable
                                                ? `"${selectedTable.tableName}" 자동 적용`
                                                : '테이블을 선택하세요'
                                        }
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 패널 헤더: 팝업 유형 탭 + 닫기 버튼 */}
                        <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
                                <button
                                    onClick={() => setLayerType('center')}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${layerType === 'center' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <LayoutTemplate className="w-3 h-3" />중앙 팝업
                                </button>
                                <button
                                    onClick={() => setLayerType('right')}
                                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${layerType === 'right' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    <PanelRight className="w-3 h-3" />우측 드로어
                                </button>
                            </div>
                            <button onClick={() => setLeftPanelOpen(false)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-200 transition-all" title="패널 닫기">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        {/* 설정 탭: 폼 필드 / 하단 버튼 */}
                        <div className="px-3 py-1.5 border-b border-slate-100 bg-white flex items-center gap-1">
                            <button
                                onClick={() => setActivePanelTab('field')}
                                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activePanelTab === 'field' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <Layers className="w-3 h-3" />폼 필드
                            </button>
                            <button
                                onClick={() => setActivePanelTab('button')}
                                className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold rounded transition-all ${activePanelTab === 'button' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                <MousePointerClick className="w-3 h-3" />하단 버튼 <span className="text-slate-400 font-normal">{layerButtons.length}</span>
                            </button>
                        </div>
                        <div className="p-3 space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">

                            {/* ════ 폼 필드 탭 ════ */}
                            {activePanelTab === 'field' && (<>

                                {/* ── 팝업 기본 설정 ── */}
                                <div className="border border-slate-100 rounded-lg p-3 space-y-3">
                                    <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">팝업 설정</h3>

                                    {/* 팝업 제목 */}
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 제목</label>
                                        <input
                                            type="text"
                                            value={layerTitle}
                                            onChange={e => setLayerTitle(e.target.value)}
                                            placeholder="레이어 팝업"
                                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                        />
                                    </div>

                                    {/* 팝업 너비 (중앙 팝업만) */}
                                    {layerType === 'center' && (
                                        <div>
                                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">팝업 너비</label>
                                            <div className="relative">
                                                <select
                                                    value={layerWidth}
                                                    onChange={e => setLayerWidth(e.target.value as LayerWidth)}
                                                    className={selectCls}
                                                >
                                                    <option value="sm">Small — 384px</option>
                                                    <option value="md">Medium — 672px</option>
                                                    <option value="lg">Large — 768px</option>
                                                    <option value="xl">X-Large — 896px</option>
                                                </select>
                                                <SelectArrow />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* ── 행 목록 ── */}
                                <DndContext sensors={sensors} collisionDetection={collisionDetection} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd} accessibility={{ announcements: { onDragStart() { return ''; }, onDragOver() { return ''; }, onDragEnd() { return ''; }, onDragCancel() { return ''; } }, screenReaderInstructions: { draggable: '' } }}>
                                    <SortableContext items={fieldRows.map(r => r.id)} strategy={verticalListSortingStrategy}>
                                        {fieldRows.map((row, rowIdx) => (
                                            <SortableRowWrapper key={row.id} id={row.id}>
                                                {(rowHandleProps) => (
                                                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                                                        {/* 행 헤더 — 공통 컴포넌트 */}
                                                        <RowHeader
                                                            rowIdx={rowIdx}
                                                            rowCount={fieldRows.length}
                                                            cols={row.cols}
                                                            onChangeCols={n => updateRowCols(rowIdx, n)}
                                                            onMoveUp={() => moveRow(rowIdx, 'up')}
                                                            onMoveDown={() => moveRow(rowIdx, 'down')}
                                                            onRemove={() => removeRow(rowIdx)}
                                                            collapsed={collapsedRows.has(row.id)}
                                                            onToggleCollapse={() => toggleRowCollapse(row.id)}
                                                            dragHandleProps={rowHandleProps}
                                                        />

                                                        {/* 필드 목록 — 접힘 시 숨김 */}
                                                        {!collapsedRows.has(row.id) && (<div className="p-3 space-y-1.5">
                                                            <SortableContext id={`rc-${row.id}`} items={row.fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                                                                {row.fields.length > 0 ? (
                                                                    row.fields.map((field, fieldIdx) => (
                                                                        <SortableFieldWrapper key={field.id} id={field.id}>
                                                                            {(fieldHandleProps) => (
                                                                                <div className={`border rounded-md transition-all ${editingField === field.id ? 'border-slate-900 bg-slate-50' : 'border-slate-100'}`}>
                                                                                    <div
                                                                                        className="flex items-center gap-1.5 px-2 py-1.5 cursor-pointer"
                                                                                        onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                                                                                    >
                                                                                        <span
                                                                                            ref={fieldHandleProps.ref as React.Ref<HTMLSpanElement>}
                                                                                            {...Object.fromEntries(Object.entries(fieldHandleProps).filter(([k]) => k !== 'ref')) as React.HTMLAttributes<HTMLSpanElement>}
                                                                                            onClick={e => e.stopPropagation()}
                                                                                            className="cursor-grab active:cursor-grabbing touch-none flex-shrink-0 px-1 py-1 rounded hover:bg-slate-100"
                                                                                        >
                                                                                            <GripVertical className="w-4 h-4 text-slate-400" />
                                                                                        </span>
                                                                                        <span className="text-[10px] px-1 py-0.5 bg-slate-100 text-slate-500 rounded font-mono">{FIELD_TYPES.find(t => t.type === field.type)?.label}</span>
                                                                                        <span className="text-[11px] font-medium text-slate-700 truncate flex-1">{field.label}</span>
                                                                                        {field.required && <span className="text-red-500 text-[10px] font-bold">*</span>}
                                                                                        {field.readonly && <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1 py-0.5 rounded">RO</span>}
                                                                                        {field.colSpan > 1 && <span className="text-[10px] text-slate-400">C×{field.colSpan}</span>}
                                                                                        {field.rowSpan && field.rowSpan > 1 && <span className="text-[10px] text-slate-400">R×{field.rowSpan}</span>}
                                                                                        <div className="flex items-center gap-0.5">
                                                                                            <button onClick={e => { e.stopPropagation(); moveField(rowIdx, fieldIdx, 'up'); }} disabled={fieldIdx === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                                                                            <button onClick={e => { e.stopPropagation(); moveField(rowIdx, fieldIdx, 'down'); }} disabled={fieldIdx === row.fields.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                                                                            <button onClick={e => { e.stopPropagation(); setEditingField(editingField === field.id ? null : field.id); }} className="p-1 rounded text-slate-400 hover:bg-slate-100"><Pencil className="w-3 h-3" /></button>
                                                                                            <button onClick={e => { e.stopPropagation(); removeField(rowIdx, field.id); }} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {/* ── 인라인 필드 편집 패널 ── */}
                                                                                    {editingField === field.id && (
                                                                                        <div className="px-2 pb-2 pt-1 space-y-2 border-t border-slate-100">
                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">라벨</label>
                                                                                                    <input type="text" value={field.label} onChange={e => updateField(field.id, { label: e.target.value })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">ColSpan</label>
                                                                                                    <div className="flex items-center gap-0.5">
                                                                                                        {Array.from({ length: row.cols }, (_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5).map(n => (
                                                                                                            <button key={n} onClick={() => updateField(field.id, { colSpan: n })} className={`w-6 h-6 text-[10px] font-semibold rounded transition-all ${field.colSpan === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                                                                                        ))}
                                                                                                    </div>
                                                                                                </div>
                                                                                                {/* RowSpan: textarea 전용 */}
                                                                                                {field.type === 'textarea' && (
                                                                                                    <div>
                                                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">RowSpan</label>
                                                                                                        <div className="flex items-center gap-0.5">
                                                                                                            {([1, 2, 3] as const).map(n => (
                                                                                                                <button key={n} onClick={() => updateField(field.id, { rowSpan: n > 1 ? n : undefined })} className={`w-6 h-6 text-[10px] font-semibold rounded transition-all ${(field.rowSpan ?? 1) === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                            <div>
                                                                                                <label className="text-[10px] font-medium text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                                                                                                <input type="text" value={field.fieldKey || ''} onChange={e => updateField(field.id, { fieldKey: e.target.value || undefined })} placeholder="예: userName" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-slate-900" />
                                                                                            </div>
                                                                                            {(field.type === 'input' || field.type === 'textarea' || field.type === 'select' || field.type === 'editor') && (
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">Placeholder</label>
                                                                                                    <input type="text" value={field.placeholder || ''} onChange={e => updateField(field.id, { placeholder: e.target.value || undefined })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                                                </div>
                                                                                            )}
                                                                                            {(field.type === 'input' || field.type === 'textarea' || field.type === 'editor') && (
                                                                                                <div className="grid grid-cols-2 gap-2">
                                                                                                    <div>
                                                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">최소 길이 (Min)</label>
                                                                                                        <input type="number" min={0} value={field.minLength || ''} onChange={e => updateField(field.id, { minLength: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">최대 길이 (Max)</label>
                                                                                                        <input type="number" min={0} value={field.maxLength || ''} onChange={e => updateField(field.id, { maxLength: e.target.value ? Number(e.target.value) : undefined })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900" />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                            {field.type === 'input' && (
                                                                                                <div className="space-y-2">
                                                                                                    <div>
                                                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">정규식 (Pattern)</label>
                                                                                                        <input type="text" value={field.pattern || ''} onChange={e => updateField(field.id, { pattern: e.target.value || undefined })} placeholder="예: ^[a-zA-Z]+$" className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs font-mono focus:outline-none" />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-[10px] font-medium text-slate-500 mb-1 block">정규식 설명 (Error Msg)</label>
                                                                                                        <input type="text" value={field.patternDesc || ''} onChange={e => updateField(field.id, { patternDesc: e.target.value || undefined })} placeholder="예: 영문만 입력 가능합니다." className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
                                                                                                    </div>
                                                                                                </div>
                                                                                            )}
                                                                                            {field.type === 'textarea' && (
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-medium text-slate-500 mb-1 block">행 수</label>
                                                                                                    <input type="number" min={2} max={10} value={field.rows || 3} onChange={e => updateField(field.id, { rows: Number(e.target.value) })} className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none" />
                                                                                                </div>
                                                                                            )}
                                                                                            {/* ── 파일 업로드 설정 (file 전용, 편집 패널) ── */}
                                                                                            {field.type === 'file' && (
                                                                                                <div className="space-y-2 pt-1 border-t border-slate-100">
                                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">파일 업로드 설정</p>
                                                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                                                        <div>
                                                                                                            <label className="text-[10px] text-slate-500 mb-0.5 block">최대 파일 수</label>
                                                                                                            <input
                                                                                                                type="number" min={1} max={20}
                                                                                                                value={field.maxFileCount ?? 1}
                                                                                                                onChange={e => updateField(field.id, { maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                                                                                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                            />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="text-[10px] text-slate-500 mb-0.5 block">개당 최대 (MB)</label>
                                                                                                            <input
                                                                                                                type="number" min={1} max={100}
                                                                                                                value={field.maxFileSizeMB ?? 10}
                                                                                                                onChange={e => {
                                                                                                                    const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                                                                                                    const totalFix = (field.maxTotalSizeMB ?? 20) < v ? v : undefined;
                                                                                                                    updateField(field.id, { maxFileSizeMB: v, ...(totalFix ? { maxTotalSizeMB: totalFix } : {}) });
                                                                                                                }}
                                                                                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-[10px] text-slate-500 mb-0.5 block">전체 최대 (MB)</label>
                                                                                                        <input
                                                                                                            type="number" min={1}
                                                                                                            value={field.maxTotalSizeMB ?? 20}
                                                                                                            onChange={e => {
                                                                                                                const v = Number(e.target.value) || 1;
                                                                                                                updateField(field.id, { maxTotalSizeMB: Math.max(v, field.maxFileSizeMB ?? 10) });
                                                                                                            }}
                                                                                                            className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                        />
                                                                                                    </div>
                                                                                                    {/* 허용 파일 유형 라디오 */}
                                                                                                    <div>
                                                                                                        <label className="text-[10px] text-slate-500 mb-1 block">허용 파일 유형</label>
                                                                                                        <div className="flex items-center gap-2 flex-wrap">
                                                                                                            {(['', 'doc', 'image', 'custom'] as const).map(mode => (
                                                                                                                <label key={mode} className="flex items-center gap-1 cursor-pointer">
                                                                                                                    <input
                                                                                                                        type="radio"
                                                                                                                        checked={(field.fileTypeMode ?? '') === mode}
                                                                                                                        onChange={() => updateField(field.id, { fileTypeMode: mode, allowedExtensions: [] })}
                                                                                                                        className="w-3 h-3 text-slate-900 cursor-pointer"
                                                                                                                    />
                                                                                                                    <span className="text-[10px] text-slate-700">
                                                                                                                        {mode === '' ? '전체' : mode === 'doc' ? '문서' : mode === 'image' ? '이미지' : '커스텀'}
                                                                                                                    </span>
                                                                                                                </label>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    {/* 커스텀 확장자 입력 (편집 패널용 — 로컬 상태 없이 직접 업데이트) */}
                                                                                                    {field.fileTypeMode === 'custom' && (
                                                                                                        <div className="space-y-1">
                                                                                                            <ExtensionTagInput
                                                                                                                extensions={field.allowedExtensions || []}
                                                                                                                onChange={exts => updateField(field.id, { allowedExtensions: exts })}
                                                                                                            />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                            {/* ── 동영상 설정 (video 전용, 편집 패널) ── */}
                                                                                            {field.type === 'video' && (
                                                                                                <div className="space-y-2 pt-1 border-t border-slate-100">
                                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">동영상 설정</p>
                                                                                                    {/* URL / 파일 업로드 탭 */}
                                                                                                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => updateField(field.id, { videoMode: 'url', maxFileCount: undefined, maxFileSizeMB: undefined, maxTotalSizeMB: undefined, fileTypeMode: undefined, allowedExtensions: undefined })}
                                                                                                            className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${(field.videoMode ?? 'url') === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                                        >URL (유튜브/Vimeo)</button>
                                                                                                        <button
                                                                                                            type="button"
                                                                                                            onClick={() => updateField(field.id, { videoMode: 'file', maxFileCount: 1, maxFileSizeMB: 500, maxTotalSizeMB: 500, fileTypeMode: 'video', allowedExtensions: [] })}
                                                                                                            className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${field.videoMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                                        >파일 업로드</button>
                                                                                                    </div>
                                                                                                    {/* 파일 모드 설정 */}
                                                                                                    {field.videoMode === 'file' && (
                                                                                                        <div className="space-y-1.5">
                                                                                                            <div className="grid grid-cols-2 gap-1.5">
                                                                                                                <div>
                                                                                                                    <label className="text-[10px] text-slate-500 mb-0.5 block">최대 파일 수</label>
                                                                                                                    <input
                                                                                                                        type="number" min={1} max={20}
                                                                                                                        value={field.maxFileCount ?? 1}
                                                                                                                        onChange={e => updateField(field.id, { maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                                                                                                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                                <div>
                                                                                                                    <label className="text-[10px] text-slate-500 mb-0.5 block">개당 최대 (MB)</label>
                                                                                                                    <input
                                                                                                                        type="number" min={1}
                                                                                                                        value={field.maxFileSizeMB ?? 500}
                                                                                                                        onChange={e => {
                                                                                                                            const v = Math.max(1, Number(e.target.value) || 1);
                                                                                                                            const totalFix = (field.maxTotalSizeMB ?? 500) < v ? v : undefined;
                                                                                                                            updateField(field.id, { maxFileSizeMB: v, ...(totalFix ? { maxTotalSizeMB: totalFix } : {}) });
                                                                                                                        }}
                                                                                                                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                                    />
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <div>
                                                                                                                <label className="text-[10px] text-slate-500 mb-0.5 block">전체 최대 (MB)</label>
                                                                                                                <input
                                                                                                                    type="number" min={1}
                                                                                                                    value={field.maxTotalSizeMB ?? 500}
                                                                                                                    onChange={e => updateField(field.id, { maxTotalSizeMB: Math.max(Number(e.target.value) || 1, field.maxFileSizeMB ?? 500) })}
                                                                                                                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                                />
                                                                                                            </div>
                                                                                                            {/* 허용 파일 유형 */}
                                                                                                            <div>
                                                                                                                <label className="text-[10px] text-slate-500 mb-1 block">허용 파일 유형</label>
                                                                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                                                                    {(['video', '', 'custom'] as const).map(mode => (
                                                                                                                        <label key={mode} className="flex items-center gap-1 cursor-pointer">
                                                                                                                            <input
                                                                                                                                type="radio"
                                                                                                                                checked={(field.fileTypeMode ?? 'video') === mode}
                                                                                                                                onChange={() => updateField(field.id, { fileTypeMode: mode, allowedExtensions: [] })}
                                                                                                                                className="w-3 h-3 text-slate-900 cursor-pointer"
                                                                                                                            />
                                                                                                                            <span className="text-[10px] text-slate-700">{mode === 'video' ? '동영상' : mode === '' ? '전체' : '커스텀'}</span>
                                                                                                                        </label>
                                                                                                                    ))}
                                                                                                                </div>
                                                                                                                {(field.fileTypeMode ?? 'video') === 'video' && (
                                                                                                                    <p className="text-[10px] text-slate-400 mt-1">mp4, mov, avi, mkv, webm, wmv, flv, m4v</p>
                                                                                                                )}
                                                                                                            </div>
                                                                                                            {field.fileTypeMode === 'custom' && (
                                                                                                                <ExtensionTagInput
                                                                                                                    extensions={field.allowedExtensions || []}
                                                                                                                    onChange={exts => updateField(field.id, { allowedExtensions: exts })}
                                                                                                                />
                                                                                                            )}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                            {/* ── 이미지 등록 설정 (image 전용, 편집 패널) ── */}
                                                                                            {field.type === 'image' && (
                                                                                                <div className="space-y-2 pt-1 border-t border-slate-100">
                                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">이미지 등록 설정</p>
                                                                                                    <div className="grid grid-cols-2 gap-1.5">
                                                                                                        <div>
                                                                                                            <label className="text-[10px] text-slate-500 mb-0.5 block">최대 이미지 수</label>
                                                                                                            <input
                                                                                                                type="number" min={1} max={20}
                                                                                                                value={field.maxFileCount ?? 1}
                                                                                                                onChange={e => updateField(field.id, { maxFileCount: Math.max(1, Math.min(20, Number(e.target.value) || 1)) })}
                                                                                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                            />
                                                                                                        </div>
                                                                                                        <div>
                                                                                                            <label className="text-[10px] text-slate-500 mb-0.5 block">개당 최대 (MB)</label>
                                                                                                            <input
                                                                                                                type="number" min={1} max={50}
                                                                                                                value={field.maxFileSizeMB ?? 10}
                                                                                                                onChange={e => updateField(field.id, { maxFileSizeMB: Math.max(1, Math.min(50, Number(e.target.value) || 1)) })}
                                                                                                                className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                                                                                                            />
                                                                                                        </div>
                                                                                                    </div>
                                                                                                    <p className="text-[10px] text-slate-400">허용 형식: jpg, jpeg, png, gif, webp, svg, bmp (고정)</p>
                                                                                                </div>
                                                                                            )}
                                                                                            {/* 필수 항목 토글 */}
                                                                                            <div className="flex items-center justify-between px-1 py-1">
                                                                                                <span className="text-[10px] font-medium text-slate-500">필수 항목</span>
                                                                                                <button type="button" onClick={() => updateField(field.id, { required: !field.required || undefined })} className={`relative w-9 h-5 rounded-full transition-colors ${field.required ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.required ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                                                                </button>
                                                                                            </div>
                                                                                            {/* 읽기 전용 토글 */}
                                                                                            <div className="flex items-center justify-between px-1 py-1">
                                                                                                <span className="text-[10px] font-medium text-slate-500">읽기 전용 (Readonly)</span>
                                                                                                <button type="button" onClick={() => updateField(field.id, { readonly: !field.readonly || undefined })} className={`relative w-9 h-5 rounded-full transition-colors ${field.readonly ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${field.readonly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                                                                </button>
                                                                                            </div>
                                                                                            {needsOptions(field.type) && (
                                                                                                <div className="space-y-1.5">
                                                                                                    {/* 수동 입력 / 공통코드 탭 */}
                                                                                                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                                                        <button type="button" onClick={() => updateField(field.id, { codeGroupCode: undefined })} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${field.codeGroupCode === undefined ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>수동 입력</button>
                                                                                                        <button type="button" onClick={() => updateField(field.id, { codeGroupCode: '' })} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${field.codeGroupCode !== undefined ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>공통코드</button>
                                                                                                    </div>
                                                                                                    {field.codeGroupCode !== undefined ? (
                                                                                                        /* 공통코드 선택 UI — 공통 컴포넌트 */
                                                                                                        <CodeGroupSelector
                                                                                                            codeGroups={codeGroups}
                                                                                                            codeGroupsLoading={codeGroupsLoading}
                                                                                                            value={field.codeGroupCode || ''}
                                                                                                            onChange={(code, opts) => updateField(field.id, { codeGroupCode: code, options: opts })}
                                                                                                        />
                                                                                                    ) : (
                                                                                                        /* 수동 입력 UI — 공통 컴포넌트 */
                                                                                                        <div className="space-y-1">
                                                                                                            <label className="text-[10px] font-medium text-slate-500 block">옵션 (text : value)</label>
                                                                                                            <OptionInputRows
                                                                                                                options={stringsToOpts(field.options || [])}
                                                                                                                onChange={opts => updateField(field.id, { options: optsToStrings(opts) })}
                                                                                                            />
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </SortableFieldWrapper>
                                                                    ))
                                                                ) : (
                                                                    <EmptyFieldDropZone rowId={row.id} />
                                                                )}
                                                            </SortableContext>

                                                            {/* ── 필드 추가 버튼 ── */}
                                                            {showFieldPicker !== rowIdx && (
                                                                <button
                                                                    onClick={() => { setShowFieldPicker(rowIdx); setPendingType(null); }}
                                                                    className="w-full flex items-center justify-center gap-1.5 py-2 border border-dashed border-slate-300 rounded-lg text-xs text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"
                                                                >
                                                                    <Plus className="w-3.5 h-3.5" />필드 추가
                                                                </button>
                                                            )}

                                                            {/* ── 필드 추가 다이얼로그 ── */}
                                                            {showFieldPicker === rowIdx && (
                                                                <div className="border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50">
                                                                    {!pendingType ? (
                                                                        /* 필드 유형 선택 — 공통 컴포넌트 */
                                                                        <FieldPickerTypeList
                                                                            types={FIELD_TYPES}
                                                                            onSelect={type => selectFieldType(type as LayerFieldType)}
                                                                            onCancel={cancelAddField}
                                                                        />
                                                                    ) : (
                                                                        /* 라벨 입력 + 필드 설정 단계 */
                                                                        <div className="p-2 space-y-2">
                                                                            {/* 헤더: 유형 뱃지 + 라벨 입력 */}
                                                                            <div className="flex items-center justify-between">
                                                                                <div className="flex items-center gap-1.5">
                                                                                    <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-mono">{FIELD_TYPES.find(t => t.type === pendingType)?.label}</span>
                                                                                    <span className="text-[10px] font-semibold text-slate-500">라벨 입력</span>
                                                                                </div>
                                                                                <button onClick={() => setPendingType(null)} className="text-slate-400 hover:text-slate-600"><X className="w-3.5 h-3.5" /></button>
                                                                            </div>

                                                                            {/* 라벨 */}
                                                                            <div>
                                                                                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">라벨 <span className="text-red-400">*</span></label>
                                                                                <input type="text" value={pendingLabel} onChange={e => setPendingLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !needsOptions(pendingType)) confirmAddField(); if (e.key === 'Escape') cancelAddField(); }} placeholder="예: 사용자명" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" autoFocus />
                                                                            </div>

                                                                            {/* Key */}
                                                                            <div>
                                                                                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Key <span className="text-red-400">*</span></label>
                                                                                <input type="text" value={pendingFieldKey} onChange={e => setPendingFieldKey(e.target.value)} placeholder="예: userName" className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900" />
                                                                            </div>

                                                                            {/* ColSpan: row.cols 이하로 동적 표시 */}
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[10px] font-semibold text-slate-500">ColSpan (가로 칸 수)</span>
                                                                                <div className="flex items-center gap-0.5">
                                                                                    {Array.from({ length: row.cols }, (_, i) => (i + 1) as 1 | 2 | 3 | 4 | 5).map(n => (
                                                                                        <button key={n} type="button" onClick={() => setPendingColSpan(n)} className={`w-5 h-5 text-[10px] font-semibold rounded transition-all ${pendingColSpan === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                                                                    ))}
                                                                                </div>
                                                                            </div>

                                                                            {/* RowSpan: textarea 전용 */}
                                                                            {pendingType === 'textarea' && (
                                                                                <div className="flex items-center justify-between">
                                                                                    <span className="text-[10px] font-semibold text-slate-500">RowSpan (세로 칸 수)</span>
                                                                                    <div className="flex items-center gap-0.5">
                                                                                        {([1, 2, 3] as const).map(n => (
                                                                                            <button key={n} type="button" onClick={() => setPendingRowSpan(n)} className={`w-5 h-5 text-[10px] font-semibold rounded transition-all ${pendingRowSpan === n ? 'bg-slate-900 text-white' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-100'}`}>{n}</button>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>
                                                                            )}

                                                                            {/* Placeholder */}
                                                                            {(pendingType === 'input' || pendingType === 'textarea' || pendingType === 'select' || pendingType === 'editor') && (
                                                                                <div>
                                                                                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">Placeholder</label>
                                                                                    <input type="text" value={pendingPlaceholder} onChange={e => setPendingPlaceholder(e.target.value)} placeholder={pendingType === 'select' ? '선택하세요' : '입력하세요'} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
                                                                                </div>
                                                                            )}

                                                                            {/* 행 수 (textarea 전용) */}
                                                                            {pendingType === 'textarea' && (
                                                                                <div>
                                                                                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">행 수</label>
                                                                                    <input type="number" min={2} max={10} value={pendingRows} onChange={e => setPendingRows(Number(e.target.value))} className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none" />
                                                                                </div>
                                                                            )}

                                                                            {/* ── 동영상 모드 탭 (video 전용) ── */}
                                                                            {pendingType === 'video' && (
                                                                                <div className="space-y-2 pt-1 border-t border-slate-200">
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">동영상 입력 방식</p>
                                                                                    {/* URL / 파일 업로드 탭 */}
                                                                                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setPendingVideoMode('url');
                                                                                                /* 파일 설정 초기화 */
                                                                                                setPendingMaxFileCount(1);
                                                                                                setPendingMaxFileSizeMB(10);
                                                                                                setPendingMaxTotalSizeMB(20);
                                                                                                setPendingFileTypeMode('');
                                                                                                setPendingAllowedExtensions([]);
                                                                                            }}
                                                                                            className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingVideoMode === 'url' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                        >URL (유튜브/Vimeo)</button>
                                                                                        <button
                                                                                            type="button"
                                                                                            onClick={() => {
                                                                                                setPendingVideoMode('file');
                                                                                                /* 파일 모드 기본값 */
                                                                                                setPendingMaxFileCount(1);
                                                                                                setPendingMaxFileSizeMB(500);
                                                                                                setPendingMaxTotalSizeMB(500);
                                                                                                setPendingFileTypeMode('video');
                                                                                                setPendingAllowedExtensions([]);
                                                                                            }}
                                                                                            className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingVideoMode === 'file' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                                                                        >파일 업로드</button>
                                                                                    </div>

                                                                                    {/* 파일 모드 설정 패널 */}
                                                                                    {pendingVideoMode === 'file' && (
                                                                                        <div className="space-y-2">
                                                                                            {/* 최대 파일 수 / 개당 최대 용량 */}
                                                                                            <div className="grid grid-cols-2 gap-2">
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">최대 파일 수 <span className="font-normal text-slate-400">(1~20)</span></label>
                                                                                                    <input
                                                                                                        type="number" min={1} max={20}
                                                                                                        value={pendingMaxFileCount}
                                                                                                        onChange={e => setPendingMaxFileCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                                                                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                                    />
                                                                                                </div>
                                                                                                <div>
                                                                                                    <label className="text-[10px] font-semibold text-slate-500 mb-1 block">개당 최대 용량 <span className="font-normal text-slate-400">(MB)</span></label>
                                                                                                    <input
                                                                                                        type="number" min={1}
                                                                                                        value={pendingMaxFileSizeMB}
                                                                                                        onChange={e => {
                                                                                                            const v = Math.max(1, Number(e.target.value) || 1);
                                                                                                            setPendingMaxFileSizeMB(v);
                                                                                                            if (pendingMaxTotalSizeMB < v) setPendingMaxTotalSizeMB(v);
                                                                                                        }}
                                                                                                        className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                                    />
                                                                                                </div>
                                                                                            </div>
                                                                                            {/* 전체 최대 용량 */}
                                                                                            <div>
                                                                                                <label className="text-[10px] font-semibold text-slate-500 mb-1 block">전체 최대 용량 <span className="font-normal text-slate-400">(MB)</span></label>
                                                                                                <input
                                                                                                    type="number" min={1}
                                                                                                    value={pendingMaxTotalSizeMB}
                                                                                                    onChange={e => setPendingMaxTotalSizeMB(Math.max(Number(e.target.value) || 1, pendingMaxFileSizeMB))}
                                                                                                    className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                                />
                                                                                            </div>
                                                                                            {/* 허용 파일 유형 */}
                                                                                            <div>
                                                                                                <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block">허용 파일 유형</label>
                                                                                                <div className="flex items-center gap-3 flex-wrap">
                                                                                                    {(['video', '', 'custom'] as const).map(mode => (
                                                                                                        <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                                                                                            <input
                                                                                                                type="radio"
                                                                                                                name="pendingVideoFileTypeMode"
                                                                                                                checked={pendingFileTypeMode === mode}
                                                                                                                onChange={() => { setPendingFileTypeMode(mode); setPendingAllowedExtensions([]); setPendingExtInput(''); setPendingExtError(''); }}
                                                                                                                className="w-3.5 h-3.5 text-slate-900 cursor-pointer"
                                                                                                            />
                                                                                                            <span className="text-xs text-slate-700">{mode === 'video' ? '동영상' : mode === '' ? '전체' : '커스텀'}</span>
                                                                                                        </label>
                                                                                                    ))}
                                                                                                </div>
                                                                                                {pendingFileTypeMode === 'video' && (
                                                                                                    <p className="text-[10px] text-slate-400 mt-1">mp4, mov, avi, mkv, webm, wmv, flv, m4v</p>
                                                                                                )}
                                                                                            </div>
                                                                                            {/* 커스텀 확장자 입력 */}
                                                                                            {pendingFileTypeMode === 'custom' && (
                                                                                                <div className="space-y-1.5">
                                                                                                    <div className="flex items-center gap-1.5">
                                                                                                        <input
                                                                                                            type="text"
                                                                                                            value={pendingExtInput}
                                                                                                            onChange={e => { setPendingExtInput(e.target.value); setPendingExtError(''); }}
                                                                                                            onKeyDown={e => {
                                                                                                                if (e.key === 'Enter') {
                                                                                                                    e.preventDefault();
                                                                                                                    let ext = pendingExtInput.trim();
                                                                                                                    if (!ext) return;
                                                                                                                    if (!ext.startsWith('.')) ext = '.' + ext;
                                                                                                                    if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setPendingExtError('영문/숫자 확장자만 입력 가능합니다.'); return; }
                                                                                                                    if (pendingAllowedExtensions.includes(ext)) { setPendingExtError('이미 추가된 확장자입니다.'); return; }
                                                                                                                    setPendingAllowedExtensions(prev => [...prev, ext]);
                                                                                                                    setPendingExtInput(''); setPendingExtError('');
                                                                                                                }
                                                                                                            }}
                                                                                                            placeholder=".mp4"
                                                                                                            className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none"
                                                                                                        />
                                                                                                        <button type="button" onClick={() => {
                                                                                                            let ext = pendingExtInput.trim();
                                                                                                            if (!ext) return;
                                                                                                            if (!ext.startsWith('.')) ext = '.' + ext;
                                                                                                            if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setPendingExtError('영문/숫자 확장자만 입력 가능합니다.'); return; }
                                                                                                            if (pendingAllowedExtensions.includes(ext)) { setPendingExtError('이미 추가된 확장자입니다.'); return; }
                                                                                                            setPendingAllowedExtensions(prev => [...prev, ext]);
                                                                                                            setPendingExtInput(''); setPendingExtError('');
                                                                                                        }} disabled={!pendingExtInput.trim()} className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-40 transition-all">추가</button>
                                                                                                    </div>
                                                                                                    {pendingExtError && <p className="text-[10px] text-red-500">{pendingExtError}</p>}
                                                                                                    {pendingAllowedExtensions.length > 0 && (
                                                                                                        <div className="flex flex-wrap gap-1">
                                                                                                            {pendingAllowedExtensions.map(ext => (
                                                                                                                <span key={ext} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-mono">
                                                                                                                    {ext}
                                                                                                                    <button type="button" onClick={() => setPendingAllowedExtensions(prev => prev.filter(e => e !== ext))} className="text-slate-400 hover:text-slate-700"><X className="w-2.5 h-2.5" /></button>
                                                                                                                </span>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* ── 파일 업로드 설정 (file 전용) ── */}
                                                                            {pendingType === 'file' && (
                                                                                <div className="space-y-2 pt-1 border-t border-slate-200">
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">파일 업로드 설정</p>

                                                                                    {/* 최대 파일 수 / 개당 최대 용량 */}
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">최대 파일 수 <span className="font-normal text-slate-400">(1~20)</span></label>
                                                                                            <input
                                                                                                type="number" min={1} max={20}
                                                                                                value={pendingMaxFileCount}
                                                                                                onChange={e => setPendingMaxFileCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                                                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">개당 최대 용량 <span className="font-normal text-slate-400">(MB)</span></label>
                                                                                            <input
                                                                                                type="number" min={1} max={100}
                                                                                                value={pendingMaxFileSizeMB}
                                                                                                onChange={e => {
                                                                                                    const v = Math.max(1, Math.min(100, Number(e.target.value) || 1));
                                                                                                    setPendingMaxFileSizeMB(v);
                                                                                                    /* 전체 용량이 개당보다 작으면 자동 보정 */
                                                                                                    if (pendingMaxTotalSizeMB < v) setPendingMaxTotalSizeMB(v);
                                                                                                }}
                                                                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                            />
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* 전체 최대 용량 */}
                                                                                    <div>
                                                                                        <label className="text-[10px] font-semibold text-slate-500 mb-1 block">전체 최대 용량 <span className="font-normal text-slate-400">(MB)</span></label>
                                                                                        <input
                                                                                            type="number" min={1}
                                                                                            value={pendingMaxTotalSizeMB}
                                                                                            onChange={e => {
                                                                                                const v = Number(e.target.value) || 1;
                                                                                                /* 개당 용량보다 작으면 자동 보정 (에러 없이) */
                                                                                                setPendingMaxTotalSizeMB(Math.max(v, pendingMaxFileSizeMB));
                                                                                            }}
                                                                                            className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                        />
                                                                                    </div>

                                                                                    {/* 허용 파일 유형 */}
                                                                                    <div>
                                                                                        <label className="text-[10px] font-semibold text-slate-500 mb-1.5 block">허용 파일 유형</label>
                                                                                        <div className="flex items-center gap-3 flex-wrap">
                                                                                            {(['', 'doc', 'image', 'custom'] as const).map(mode => (
                                                                                                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                                                                                                    <input
                                                                                                        type="radio"
                                                                                                        name="pendingFileTypeMode"
                                                                                                        checked={pendingFileTypeMode === mode}
                                                                                                        onChange={() => {
                                                                                                            setPendingFileTypeMode(mode);
                                                                                                            /* 모드 변경 시 allowedExtensions 초기화 */
                                                                                                            setPendingAllowedExtensions([]);
                                                                                                            setPendingExtInput('');
                                                                                                            setPendingExtError('');
                                                                                                        }}
                                                                                                        className="w-3.5 h-3.5 text-slate-900 cursor-pointer"
                                                                                                    />
                                                                                                    <span className="text-xs text-slate-700">
                                                                                                        {mode === '' ? '전체' : mode === 'doc' ? '문서' : mode === 'image' ? '이미지' : '커스텀'}
                                                                                                    </span>
                                                                                                </label>
                                                                                            ))}
                                                                                        </div>
                                                                                    </div>

                                                                                    {/* 커스텀 확장자 입력 UI */}
                                                                                    {pendingFileTypeMode === 'custom' && (
                                                                                        <div className="space-y-1.5">
                                                                                            <div className="flex items-center gap-1.5">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={pendingExtInput}
                                                                                                    onChange={e => {
                                                                                                        setPendingExtInput(e.target.value);
                                                                                                        setPendingExtError('');
                                                                                                    }}
                                                                                                    onKeyDown={e => {
                                                                                                        if (e.key === 'Enter') {
                                                                                                            e.preventDefault();
                                                                                                            /* 확장자 추가 로직 */
                                                                                                            let ext = pendingExtInput.trim();
                                                                                                            if (!ext) return;
                                                                                                            /* 점 없으면 자동 추가 */
                                                                                                            if (!ext.startsWith('.')) ext = '.' + ext;
                                                                                                            /* 정규식 검증 */
                                                                                                            if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setPendingExtError('영문/숫자 확장자만 입력 가능합니다. (예: .jpg)'); return; }
                                                                                                            /* 중복 검증 */
                                                                                                            if (pendingAllowedExtensions.includes(ext)) { setPendingExtError('이미 추가된 확장자입니다.'); return; }
                                                                                                            setPendingAllowedExtensions(prev => [...prev, ext]);
                                                                                                            setPendingExtInput('');
                                                                                                            setPendingExtError('');
                                                                                                        }
                                                                                                    }}
                                                                                                    placeholder=".jpg"
                                                                                                    className="flex-1 border border-slate-300 rounded-md px-2 py-1.5 text-sm font-mono focus:outline-none"
                                                                                                />
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        let ext = pendingExtInput.trim();
                                                                                                        if (!ext) return;
                                                                                                        if (!ext.startsWith('.')) ext = '.' + ext;
                                                                                                        if (!/^\.[a-zA-Z0-9]+$/.test(ext)) { setPendingExtError('영문/숫자 확장자만 입력 가능합니다. (예: .jpg)'); return; }
                                                                                                        if (pendingAllowedExtensions.includes(ext)) { setPendingExtError('이미 추가된 확장자입니다.'); return; }
                                                                                                        setPendingAllowedExtensions(prev => [...prev, ext]);
                                                                                                        setPendingExtInput('');
                                                                                                        setPendingExtError('');
                                                                                                    }}
                                                                                                    disabled={!pendingExtInput.trim()}
                                                                                                    className="px-2.5 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-40 transition-all"
                                                                                                >추가</button>
                                                                                            </div>
                                                                                            {pendingExtError && (
                                                                                                <p className="text-[10px] text-red-500">{pendingExtError}</p>
                                                                                            )}
                                                                                            {/* 추가된 확장자 태그 목록 */}
                                                                                            {pendingAllowedExtensions.length > 0 && (
                                                                                                <div className="flex flex-wrap gap-1">
                                                                                                    {pendingAllowedExtensions.map(ext => (
                                                                                                        <span key={ext} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded-full font-mono">
                                                                                                            {ext}
                                                                                                            <button type="button" onClick={() => setPendingAllowedExtensions(prev => prev.filter(e => e !== ext))} className="text-slate-400 hover:text-slate-700">
                                                                                                                <X className="w-2.5 h-2.5" />
                                                                                                            </button>
                                                                                                        </span>
                                                                                                    ))}
                                                                                                </div>
                                                                                            )}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* ── 이미지 등록 설정 (image 전용) ── */}
                                                                            {pendingType === 'image' && (
                                                                                <div className="space-y-2 pt-1 border-t border-slate-200">
                                                                                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">이미지 등록 설정</p>
                                                                                    <div className="grid grid-cols-2 gap-2">
                                                                                        <div>
                                                                                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">최대 이미지 수 <span className="font-normal text-slate-400">(1~20)</span></label>
                                                                                            <input
                                                                                                type="number" min={1} max={20}
                                                                                                value={pendingMaxFileCount}
                                                                                                onChange={e => setPendingMaxFileCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                                                                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <label className="text-[10px] font-semibold text-slate-500 mb-1 block">개당 최대 용량 <span className="font-normal text-slate-400">(MB)</span></label>
                                                                                            <input
                                                                                                type="number" min={1} max={50}
                                                                                                value={pendingMaxFileSizeMB}
                                                                                                onChange={e => setPendingMaxFileSizeMB(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
                                                                                                className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm focus:outline-none"
                                                                                            />
                                                                                        </div>
                                                                                    </div>
                                                                                    <p className="text-[10px] text-slate-400">허용 형식: jpg, jpeg, png, gif, webp, svg, bmp (고정)</p>
                                                                                </div>
                                                                            )}

                                                                            {/* 옵션 (select/radio/checkbox) */}
                                                                            {needsOptions(pendingType) && (
                                                                                <div className="space-y-1.5">
                                                                                    {/* 수동 입력 / 공통코드 탭 */}
                                                                                    <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                                                                                        <button type="button" onClick={() => { setPendingOptionMode('manual'); setPendingCodeGroupCode(''); setPendingOptions([{ text: '', value: '' }]); }} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingOptionMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>수동 입력</button>
                                                                                        <button type="button" onClick={() => setPendingOptionMode('code')} className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${pendingOptionMode === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>공통코드</button>
                                                                                    </div>
                                                                                    {pendingOptionMode === 'code' ? (
                                                                                        /* 공통코드 선택 UI — 공통 컴포넌트 */
                                                                                        <CodeGroupSelector
                                                                                            codeGroups={codeGroups}
                                                                                            codeGroupsLoading={codeGroupsLoading}
                                                                                            value={pendingCodeGroupCode}
                                                                                            onChange={(code, opts) => {
                                                                                                setPendingCodeGroupCode(code);
                                                                                                if (opts) setPendingOptions(stringsToOpts(opts));
                                                                                            }}
                                                                                        />
                                                                                    ) : (
                                                                                        /* 수동 입력 UI — 공통 컴포넌트 */
                                                                                        <OptionInputRows
                                                                                            options={pendingOptions}
                                                                                            onChange={setPendingOptions}
                                                                                        />
                                                                                    )}
                                                                                </div>
                                                                            )}

                                                                            {/* 필수항목 토글 + Validation — 공통 컴포넌트 */}
                                                                            <ValidationSection
                                                                                fieldType={pendingType}
                                                                                values={{
                                                                                    required: pendingRequired,
                                                                                    minLength: pendingMinLength,
                                                                                    maxLength: pendingMaxLength,
                                                                                    pattern: pendingPattern,
                                                                                    patternDesc: pendingPatternDesc,
                                                                                    minSelect: pendingMinSelect,
                                                                                    maxSelect: pendingMaxSelect,
                                                                                }}
                                                                                onChange={updates => {
                                                                                    if (updates.required !== undefined) setPendingRequired(updates.required);
                                                                                    if ('minLength' in updates) setPendingMinLength(updates.minLength);
                                                                                    if ('maxLength' in updates) setPendingMaxLength(updates.maxLength);
                                                                                    if (updates.pattern !== undefined) setPendingPattern(updates.pattern);
                                                                                    if (updates.patternDesc !== undefined) setPendingPatternDesc(updates.patternDesc);
                                                                                    if ('minSelect' in updates) setPendingMinSelect(updates.minSelect);
                                                                                    if ('maxSelect' in updates) setPendingMaxSelect(updates.maxSelect);
                                                                                }}
                                                                            />

                                                                            {/* 읽기 전용 토글 — 모든 필드 타입 공통 */}
                                                                            <div className="flex items-center justify-between px-1 py-1">
                                                                                <span className="text-[10px] font-medium text-slate-500">읽기 전용 (Readonly)</span>
                                                                                <button type="button" onClick={() => setPendingReadonly(v => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${pendingReadonly ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${pendingReadonly ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                                                                </button>
                                                                            </div>

                                                                            {/* 취소 | 추가 (list 스타일 버튼 순서 통일) */}
                                                                            <div className="flex gap-2 pt-1">
                                                                                <button onClick={cancelAddField} className="px-3 py-2 border border-slate-200 text-slate-500 text-xs rounded-md hover:bg-slate-50 transition-all">취소</button>
                                                                                <button
                                                                                    onClick={confirmAddField}
                                                                                    disabled={!pendingLabel.trim() || !pendingFieldKey.trim() || (needsOptions(pendingType) && (pendingOptionMode === 'code' ? !pendingCodeGroupCode : pendingOptions.filter(o => o.text.trim()).length === 0))}
                                                                                    className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-semibold rounded-md transition-all"
                                                                                >
                                                                                    추가
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>)}
                                                    </div>
                                                )}
                                            </SortableRowWrapper>
                                        ))}
                                    </SortableContext>
                                </DndContext>

                                {/* ── 행 추가 버튼 ── */}
                                <button
                                    onClick={addRow}
                                    className="w-full flex items-center justify-center gap-1.5 py-2.5 border-2 border-dashed border-slate-200 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"
                                >
                                    <Plus className="w-3.5 h-3.5" />행 추가
                                </button>

                            </>)}

                            {/* ════ 하단 버튼 탭 ════ */}
                            {activePanelTab === 'button' && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between mb-1">
                                        <p className="text-[11px] text-slate-400">팝업 하단에 표시될 버튼을 설정합니다.</p>
                                        <button
                                            onClick={addLayerButton}
                                            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-all"
                                        >
                                            <Plus className="w-3 h-3" />추가
                                        </button>
                                    </div>

                                    {layerButtons.length === 0 && (
                                        <div className="py-6 text-center text-xs text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
                                            버튼이 없습니다. 추가 버튼을 눌러 생성하세요.
                                        </div>
                                    )}

                                    {layerButtons.map((btn, idx) => (
                                        <div key={btn.id} className="border border-slate-200 rounded-lg p-3 space-y-2 bg-white">
                                            {/* 헤더: 타입 배지 + 이동/삭제 */}
                                            <div className="flex items-center justify-between">
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${LAYER_BTN_TYPE_BADGE[btn.type]}`}>
                                                    {btn.type}
                                                </span>
                                                <div className="flex items-center gap-0.5">
                                                    <button onClick={() => moveLayerButton(idx, 'up')} disabled={idx === 0} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronUp className="w-3 h-3" /></button>
                                                    <button onClick={() => moveLayerButton(idx, 'down')} disabled={idx === layerButtons.length - 1} className="p-1 rounded text-slate-400 hover:bg-slate-100 disabled:opacity-30"><ChevronDown className="w-3 h-3" /></button>
                                                    <button onClick={() => removeLayerButton(btn.id)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                                                </div>
                                            </div>

                                            {/* 레이블 */}
                                            <div>
                                                <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">버튼 레이블</label>
                                                <input
                                                    value={btn.label}
                                                    onChange={e => updateLayerButton(btn.id, { label: e.target.value })}
                                                    className="w-full border border-slate-200 rounded-md px-2.5 py-1.5 text-xs focus:outline-none focus:border-slate-900 transition-all"
                                                    placeholder="버튼 이름"
                                                />
                                            </div>

                                            {/* 스타일 */}
                                            <div>
                                                <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">스타일</label>
                                                <div className="relative">
                                                    <select
                                                        value={btn.type}
                                                        onChange={e => updateLayerButton(btn.id, { type: e.target.value as LayerButtonType })}
                                                        className={selectCls}
                                                    >
                                                        <option value="primary">Primary (기본 · 검정)</option>
                                                        <option value="secondary">Secondary (보조 · 회색)</option>
                                                        <option value="blue">Blue (파랑)</option>
                                                        <option value="success">Success (초록)</option>
                                                        <option value="danger">Danger (위험 · 빨강)</option>
                                                    </select>
                                                    <SelectArrow />
                                                </div>
                                            </div>

                                            {/* 액션 */}
                                            <div>
                                                <label className="text-[10px] font-semibold text-slate-500 mb-0.5 block">액션</label>
                                                <div className="relative">
                                                    <select
                                                        value={btn.action}
                                                        onChange={e => updateLayerButton(btn.id, { action: e.target.value as LayerButtonAction })}
                                                        className={selectCls}
                                                    >
                                                        <option value="close">닫기 (close)</option>
                                                        <option value="save">저장 (save)</option>
                                                        <option value="custom">커스텀 (custom)</option>
                                                    </select>
                                                    <SelectArrow />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════ */}
                {/* 오른쪽: 미리보기 + 코드              */}
                {/* ════════════════════════════════════ */}
                <div className="space-y-4">
                    {/* 상단 툴바 */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {!leftPanelOpen && (
                                <button onClick={() => setLeftPanelOpen(true)} className="p-1.5 rounded-md text-slate-400 hover:bg-slate-100 transition-all border border-slate-200" title="패널 열기">
                                    <PanelLeftOpen className="w-4 h-4" />
                                </button>
                            )}
                            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setActiveTab('preview')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Eye className="w-3.5 h-3.5" />미리보기
                                </button>
                                <button
                                    onClick={() => setActiveTab('code')}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                                >
                                    <Code className="w-3.5 h-3.5" />코드
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <button onClick={handleSaveOpen} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-all" title={currentTemplateId ? '템플릿 수정 저장' : '새 템플릿 저장'}>
                                <Save className="w-3.5 h-3.5" />{currentTemplateId ? '수정' : '저장'}
                            </button>
                            <button onClick={handleGenerateOpen} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 rounded-md hover:bg-emerald-600 transition-all" title="TSX 파일 생성">
                                <Zap className="w-3.5 h-3.5" />생성
                            </button>
                            <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all">
                                {copied ? <><Check className="w-3.5 h-3.5 text-emerald-500" />복사됨</> : <><Copy className="w-3.5 h-3.5" />코드 복사</>}
                            </button>
                        </div>
                    </div>

                    {/* 컨텐츠 영역 */}
                    {activeTab === 'preview' ? (
                        /* 미리보기 */
                        layerType === 'center' ? (
                            fieldRows.flatMap(r => r.fields).length > 0 ? (
                                <div className="bg-slate-100 rounded-xl min-h-[500px] overflow-y-auto">
                                    <CenterPreview
                                        rows={fieldRows}
                                        layerTitle={layerTitle}
                                        layerWidth={layerWidth}
                                        layerButtons={layerButtons}
                                        previewValues={previewValues}
                                        setPreviewValues={setPreviewValues}
                                        codeGroups={codeGroups}
                                    />
                                </div>
                            ) : (
                                <CenterPreview
                                    rows={fieldRows}
                                    layerTitle={layerTitle}
                                    layerWidth={layerWidth}
                                    layerButtons={layerButtons}
                                    previewValues={previewValues}
                                    setPreviewValues={setPreviewValues}
                                    codeGroups={codeGroups}
                                />
                            )
                        ) : (
                            fieldRows.flatMap(r => r.fields).length > 0 ? (
                                <div className="bg-slate-100 rounded-xl overflow-hidden" style={{ height: '600px' }}>
                                    <RightPreview
                                        rows={fieldRows}
                                        layerTitle={layerTitle}
                                        layerButtons={layerButtons}
                                        previewValues={previewValues}
                                        setPreviewValues={setPreviewValues}
                                        codeGroups={codeGroups}
                                    />
                                </div>
                            ) : (
                                <RightPreview
                                    rows={fieldRows}
                                    layerTitle={layerTitle}
                                    layerButtons={layerButtons}
                                    previewValues={previewValues}
                                    setPreviewValues={setPreviewValues}
                                    codeGroups={codeGroups}
                                />
                            )
                        )
                    ) : (
                        /* 코드 뷰 */
                        <div className="bg-[#161929] rounded-xl p-5 overflow-x-auto min-h-[300px]">
                            <pre className="text-xs text-slate-300 font-mono leading-relaxed whitespace-pre">{generatedCode}</pre>
                        </div>
                    )}
                </div>
            </div>

            {/* 저장 모달 — 공통 컴포넌트 */}
            <SaveModal
                show={showSaveModal}
                onClose={() => setShowSaveModal(false)}
                isEdit={!!currentTemplateId}
                name={saveModalName}
                slug={saveModalSlug}
                desc={saveModalDesc}
                isSaving={isSaving}
                onNameChange={setSaveModalName}
                onSlugChange={setSaveModalSlug}
                onDescChange={setSaveModalDesc}
                onConfirm={handleSaveConfirm}
                toSlug={toSlug}
            />

            {/* 생성 모달 — 공통 컴포넌트 */}
            <GenerateModal
                show={showGenerateModal}
                onClose={() => setShowGenerateModal(false)}
                name={generateName}
                slug={generateSlug}
                fileName={generateFileName}
                isGenerating={isGenerating}
                onNameChange={setGenerateName}
                onSlugChange={setGenerateSlug}
                onFileNameChange={setGenerateFileName}
                onConfirm={handleGenerateConfirm}
            />

        </div >
    );
}
