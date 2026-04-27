'use client';

/**
 * FieldRenderer — 공통 단일 필드 렌더러
 *
 * SearchRenderer / FormRenderer 모두 이 컴포넌트를 재사용한다.
 * FormFieldItem이 SearchFieldConfig를 extend하므로 둘 다 그대로 전달 가능.
 *
 * - preview: disabled 상태 (빌더 미리보기용)
 * - live: 인터랙티브 입력 (실제 페이지용)
 *
 * 사용법:
 *   // SearchRenderer 내부
 *   <FieldRenderer mode={mode} field={field} value={values[field.id]} onChange={v => onChange(field.id, v)} codeGroups={codeGroups} />
 *
 *   // FormRenderer 내부
 *   <FieldRenderer mode={mode} field={f} fileList={...} onFileChange={...} />
 */

import React from 'react';
import { Calendar, Paperclip, Play, Film, Plus, X } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';
import { SearchFieldConfig, CodeGroupDef } from '../../types';
import { inputCls, selectCls } from '../../styles';
import { SelectArrow } from '../SelectArrow';
import { parseOpt } from '../../utils';
import type { RendererMode } from './types';

/* ── 파일 허용 타입 프리셋 ── */
const FILE_TYPE_PRESETS = {
    doc:   '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.hwp',
    image: '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp',
    video: '.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v',
} as const;

/**
 * 파일 타입 모드에 따라 input[accept] 문자열 생성
 * @param mode 'doc' | 'image' | 'video' | 'custom' | ''
 * @param customExts 커스텀 확장자 배열 (예: ['.zip', '.rar'])
 */
function getAcceptStr(mode: string, customExts: string[]): string {
    if (mode === 'doc')   return FILE_TYPE_PRESETS.doc;
    if (mode === 'image') return FILE_TYPE_PRESETS.image;
    if (mode === 'video') return FILE_TYPE_PRESETS.video;
    if (mode === 'custom') return customExts.join(',');
    return '';
}

/**
 * 유튜브/Vimeo URL → embed URL 변환
 * @example toEmbedUrl('https://youtu.be/abc123') // 'https://www.youtube.com/embed/abc123'
 */
function toEmbedUrl(url: string): string | null {
    if (!url) return null;
    const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
    const ytShorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null;
}

interface FieldRendererProps {
    mode: RendererMode;
    field: SearchFieldConfig;
    value?: string;
    onChange?: (v: string) => void;
    codeGroups?: CodeGroupDef[];
    /** action-button 클릭 시 호출 (SpaceRenderer 등에서 주입) */
    onButtonClick?: () => void;
    /* ── 파일/이미지/비디오 전용 (live 모드) ── */
    /** 새로 선택한 파일 목록 */
    fileList?: File[];
    /** 기존 파일 메타 (편집 모드) */
    existingFileMeta?: { id: number; origName: string; fileSize: number }[];
    /** 이미지 blob URL 캐시 (auth 헤더 포함 다운로드 후 캐싱) */
    imgBlobUrls?: Record<number, string>;
    /** 파일 변경 핸들러 */
    onFileChange?: (files: File[]) => void;
    /** 기존 파일 제거 핸들러 */
    onRemoveExisting?: (fileId: number) => void;
}

/**
 * 공통코드 → 옵션 문자열 배열 변환
 * codeGroupCode 있으면 codeGroups에서 해당 그룹 조회, 없으면 field.options 반환
 */
const resolveOptions = (field: SearchFieldConfig, codeGroups: CodeGroupDef[]): string[] => {
    if (field.codeGroupCode) {
        return codeGroups
            .find(g => g.groupCode === field.codeGroupCode)
            ?.details.filter(d => d.active)
            .map(d => `${d.name}:${d.code}`) ?? [];
    }
    return field.options ?? [];
};

export function FieldRenderer({
    mode,
    field,
    value = '',
    onChange,
    codeGroups = [],
    onButtonClick,
    fileList,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
}: FieldRendererProps) {
    const isPreview = mode === 'preview';
    /* live 모드에서 읽기 전용 여부 */
    const isReadOnly = !isPreview && !!field.readonly;
    /* 읽기 전용 스타일 — 입력 불가 시각적 표시 */
    const readonlyCls = isReadOnly ? ' bg-slate-50 text-slate-500 cursor-default' : '';

    /* preview: field.options 앞 3~4개 샘플, live: 실제 옵션 (공통코드 포함) */
    const previewOpts = field.options?.slice(0, 4) ?? [];
    const liveOpts = resolveOptions(field, codeGroups);
    const opts = isPreview ? previewOpts : liveOpts;

    switch (field.type) {

        /* ── input ── */
        case 'input':
            return (
                <input
                    type="text"
                    disabled={isPreview}
                    readOnly={isReadOnly}
                    placeholder={field.placeholder || '입력하세요'}
                    className={`${inputCls}${readonlyCls}`}
                    value={value}
                    onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                />
            );

        /* ── select ── */
        case 'select':
            return (
                <div className="relative">
                    <select
                        disabled={isPreview || isReadOnly}
                        className={`${selectCls}${readonlyCls}`}
                        value={value}
                        onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                    >
                        <option value="">{field.placeholder || '선택하세요'}</option>
                        {opts.map(opt => {
                            const { text, value: val } = parseOpt(opt);
                            return <option key={opt} value={val}>{text}</option>;
                        })}
                    </select>
                    <SelectArrow />
                </div>
            );

        /* ── date ── */
        case 'date':
            return (
                <input
                    type="date"
                    disabled={isPreview}
                    readOnly={isReadOnly}
                    className={`${inputCls}${readonlyCls}`}
                    value={value}
                    onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                />
            );

        /* ── dateRange ── */
        case 'dateRange': {
            const parts = (value || '~').split('~');
            const from = parts[0] || '';
            const to = parts[1] || '';
            return (
                /* preview/live 동일 UI — 달력 아이콘 + date input, preview는 disabled만 적용 */
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            disabled={isPreview}
                            readOnly={isReadOnly}
                            className={`${inputCls} pl-9${readonlyCls}`}
                            value={from}
                            onChange={isReadOnly ? undefined : e => onChange?.(`${e.target.value}~${to}`)}
                        />
                    </div>
                    <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="date"
                            disabled={isPreview}
                            readOnly={isReadOnly}
                            className={`${inputCls} pl-9${readonlyCls}`}
                            value={to}
                            onChange={isReadOnly ? undefined : e => onChange?.(`${from}~${e.target.value}`)}
                        />
                    </div>
                </div>
            );
        }

        /* ── radio ── */
        case 'radio': {
            const radioOpts = isPreview
                ? (field.options?.slice(0, 3) ?? ['옵션1:o1', '옵션2:o2'])
                : opts;
            return (
                <div className="flex items-center gap-4 py-2">
                    {radioOpts.map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        return (
                            <label key={opt} className={`flex items-center gap-2 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                                <input
                                    type="radio"
                                    name={`field-${field.id}`}
                                    disabled={isPreview || isReadOnly}
                                    value={val}
                                    checked={!isPreview && value === val}
                                    onChange={isReadOnly ? undefined : () => onChange?.(val)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );
        }

        /* ── checkbox ── */
        case 'checkbox': {
            const cbOpts = isPreview
                ? (field.options?.slice(0, 3) ?? ['옵션1:o1', '옵션2:o2'])
                : opts;
            const selected = (value || '').split(',').filter(Boolean);
            return (
                <div className="flex items-center gap-4 py-2">
                    {cbOpts.map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const isChecked = selected.includes(val);
                        return (
                            <label key={opt} className={`flex items-center gap-2 ${isReadOnly ? 'cursor-default' : 'cursor-pointer'}`}>
                                <input
                                    type="checkbox"
                                    disabled={isPreview || isReadOnly}
                                    value={val}
                                    checked={!isPreview && isChecked}
                                    onChange={isReadOnly ? undefined : () => {
                                        const next = isChecked
                                            ? selected.filter(v => v !== val)
                                            : [...selected, val];
                                        onChange?.(next.join(','));
                                    }}
                                    className="w-4 h-4 rounded cursor-pointer"
                                />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );
        }

        /* ── button ── */
        case 'button': {
            const btnOpts = isPreview
                ? (field.options?.slice(0, 4) ?? ['전체:all', '오늘:today', '1주:1w'])
                : opts;

            /* 다중선택 모드 (live only) */
            if (field.multiSelect && !isPreview) {
                const selected = (value || '').split(',').filter(Boolean);
                return (
                    <div className="flex items-center flex-wrap gap-1.5">
                        {btnOpts.map(opt => {
                            const { text, value: val } = parseOpt(opt);
                            const isActive = selected.includes(val);
                            return (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => {
                                        const next = isActive
                                            ? selected.filter(v => v !== val)
                                            : [...selected, val];
                                        onChange?.(next.join(','));
                                    }}
                                    className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'text-slate-500 border-slate-200 hover:bg-slate-100'
                                        }`}
                                >
                                    {text}
                                </button>
                            );
                        })}
                    </div>
                );
            }

            /* 단일선택 모드 (preview 포함) */
            return (
                <div className="flex items-center flex-wrap gap-1.5">
                    {btnOpts.map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const isActive = !isPreview && value === val;
                        return (
                            <button
                                key={opt}
                                type="button"
                                disabled={isPreview}
                                onClick={() => onChange?.(val)}
                                className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'text-slate-500 border-slate-200 hover:bg-slate-100 disabled:cursor-default'
                                    }`}
                            >
                                {text}
                            </button>
                        );
                    })}
                </div>
            );
        }

        /* ── textarea ── */
        case 'textarea': {
            /* onChange 없으면 정적 텍스트 표시 (SpaceRenderer 등 표시 전용 컨텍스트) */
            if (!onChange) {
                const style: React.CSSProperties = {
                    fontSize: field.fontSize ? `${field.fontSize}px` : '12px',
                    fontWeight: field.bold ? 'bold' : 'normal',
                    color: field.textColor || '#334155',
                };
                return (
                    <div style={style} className="whitespace-pre-wrap leading-relaxed px-1">
                        {field.content || value || (
                            <span className="text-slate-300 italic">텍스트 없음</span>
                        )}
                    </div>
                );
            }
            /* onChange 있으면 편집 가능한 textarea (FormRenderer 등 입력 컨텍스트) */
            return (
                <textarea
                    disabled={isPreview}
                    readOnly={isReadOnly}
                    className={`${inputCls} resize-none${readonlyCls}`}
                    value={value}
                    rows={3}
                    placeholder={field.placeholder || '텍스트를 입력하세요'}
                    onChange={isReadOnly ? undefined : e => onChange(e.target.value)}
                />
            );
        }

        /* ── action-button ── */
        case 'action-button': {
            /* 버튼 색상 → Tailwind 정적 클래스 맵 (동적 문자열 사용 금지) */
            /* 배경색 맵 */
            const BG_COLOR_MAP: Record<string, string> = {
                black: 'bg-slate-900',
                green: 'bg-emerald-500',
                blue: 'bg-blue-500',
                yellow: 'bg-yellow-400',
                red: 'bg-red-500',
                gray: 'bg-slate-400',
                pink: 'bg-pink-400',
            };
            /* 글자색 맵 */
            const TEXT_COLOR_MAP: Record<string, string> = {
                white: 'text-white',
                black: 'text-slate-900',
                green: 'text-emerald-500',
                blue: 'text-blue-500',
                yellow: 'text-yellow-400',
                red: 'text-red-500',
                gray: 'text-slate-400',
                pink: 'text-pink-400',
            };

            const bgCls = BG_COLOR_MAP[field.color ?? 'black'] ?? BG_COLOR_MAP.black;
            const textCls = TEXT_COLOR_MAP[field.textColor ?? 'white'] ?? TEXT_COLOR_MAP.white;

            return (
                <button
                    type="button"
                    disabled={isPreview}
                    onClick={onButtonClick}
                    className={`text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] min-w-[72px] w-full whitespace-nowrap hover:opacity-90 disabled:cursor-default ${bgCls} ${textCls}`}
                >
                    {field.label || '버튼'}
                </button>
            );
        }

        /* ── file ── */
        case 'file': {
            /* preview: 비활성 placeholder — h-full로 rowSpan 높이 채움 */
            if (isPreview) {
                return (
                    <div className="flex items-center gap-2 border border-dashed border-slate-200 rounded-md px-3 py-2 text-slate-400 text-xs h-full">
                        <Paperclip className="w-4 h-4 flex-shrink-0" />파일 업로드
                    </div>
                );
            }
            const maxCount = field.maxFileCount ?? 1;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            const canAdd = !isReadOnly && currentCount < maxCount;
            return (
                /* h-full: rowSpan 높이를 채워 파일 목록이 아래로 확장되도록 */
                <div className={`h-full flex flex-col gap-1.5 overflow-y-auto${isReadOnly ? ' opacity-75' : ''}`}>
                    {/* 기존 파일 목록 */}
                    {existingFileMeta?.map(meta => (
                        <div key={meta.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex-shrink-0">
                            <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate flex-1">{meta.origName}</span>
                            <span className="text-slate-400 flex-shrink-0">{(meta.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                            {/* 읽기 전용이면 삭제 버튼 숨김 */}
                            {!isReadOnly && (
                                <button type="button" onClick={() => onRemoveExisting?.(meta.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {/* 새 파일 목록 */}
                    {fileList?.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs flex-shrink-0">
                            <Paperclip className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate flex-1">{file.name}</span>
                            <span className="text-slate-400 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                            {!isReadOnly && (
                                <button type="button" onClick={() => onFileChange?.(fileList.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {/* 파일 추가 버튼 — 읽기 전용이면 숨김 */}
                    {canAdd && (
                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-slate-300 rounded-md text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all flex-shrink-0">
                            <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                            파일 선택 ({currentCount}/{maxCount})
                            <input
                                type="file"
                                className="sr-only"
                                multiple={maxCount > 1}
                                accept={getAcceptStr(field.fileTypeMode ?? '', field.allowedExtensions ?? [])}
                                onChange={e => {
                                    const newFiles = Array.from(e.target.files ?? []);
                                    onFileChange?.([...(fileList ?? []), ...newFiles].slice(0, maxCount));
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    )}
                </div>
            );
        }

        /* ── image ── */
        case 'image': {
            /* preview: 비활성 placeholder */
            if (isPreview) {
                return (
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-md h-full min-h-[60px] text-slate-400 gap-1 text-xs">
                        <ImageIcon className="w-5 h-5" />이미지
                    </div>
                );
            }
            const maxCount = field.maxFileCount ?? 1;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            const canAdd = !isReadOnly && currentCount < maxCount;
            return (
                <div className={`space-y-2${isReadOnly ? ' opacity-75' : ''}`}>
                    <div className="flex flex-wrap gap-2">
                        {/* 기존 이미지 */}
                        {existingFileMeta?.map(meta => (
                            <div key={meta.id} className="relative w-16 h-16 rounded-md overflow-hidden border border-slate-200 group flex-shrink-0">
                                {imgBlobUrls?.[meta.id]
                                    ? <img src={imgBlobUrls[meta.id]} alt={meta.origName} className="w-full h-full object-cover" />
                                    : <div className="w-full h-full flex items-center justify-center bg-slate-100"><ImageIcon className="w-5 h-5 text-slate-300" /></div>
                                }
                                {/* 읽기 전용이면 삭제 버튼 숨김 */}
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={() => onRemoveExisting?.(meta.id)}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {/* 새 이미지 — 파일명 표시 (blob URL 없이 간단하게) */}
                        {fileList?.map((file, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-md overflow-hidden border border-blue-200 bg-blue-50 group flex-shrink-0 flex flex-col items-center justify-center p-1">
                                <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
                                <span className="text-[9px] text-blue-600 text-center leading-tight mt-0.5 break-all line-clamp-2">{file.name}</span>
                                {!isReadOnly && (
                                    <button
                                        type="button"
                                        onClick={() => onFileChange?.(fileList.filter((_, i) => i !== idx))}
                                        className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X className="w-2.5 h-2.5 text-white" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {/* 이미지 추가 버튼 — 읽기 전용이면 숨김 */}
                        {canAdd && (
                            <label className="w-16 h-16 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all flex-shrink-0">
                                <Plus className="w-4 h-4" />
                                <span className="text-[10px] mt-0.5">추가</span>
                                <input
                                    type="file"
                                    className="sr-only"
                                    accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
                                    multiple={maxCount > 1}
                                    onChange={e => {
                                        const newFiles = Array.from(e.target.files ?? []);
                                        onFileChange?.([...(fileList ?? []), ...newFiles].slice(0, maxCount));
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                        )}
                    </div>
                    {currentCount > 0 && (
                        <p className="text-[10px] text-slate-400">{currentCount}/{maxCount}개</p>
                    )}
                </div>
            );
        }

        /* ── video ── */
        case 'video': {
            const videoMode = field.videoMode ?? 'url';
            /* preview: 비활성 placeholder */
            if (isPreview) {
                return (
                    <div className="flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-md h-full min-h-[60px] text-slate-400 gap-1 text-xs">
                        {videoMode === 'url'
                            ? <><Play className="w-5 h-5" />URL 입력</>
                            : <><Film className="w-5 h-5" />파일 업로드</>
                        }
                    </div>
                );
            }
            /* live — URL 모드: 텍스트 입력 + embed 미리보기 */
            if (videoMode === 'url') {
                const embedUrl = toEmbedUrl(value);
                return (
                    <div className="space-y-2">
                        <input
                            type="text"
                            readOnly={isReadOnly}
                            className={`${inputCls}${readonlyCls}`}
                            value={value}
                            placeholder="YouTube / Vimeo URL을 입력하세요"
                            onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                        />
                        {embedUrl && (
                            <div className="aspect-video rounded-md overflow-hidden border border-slate-200">
                                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="video-preview" />
                            </div>
                        )}
                    </div>
                );
            }
            /* live — 파일 모드: 파일 업로드 */
            const maxCount = field.maxFileCount ?? 1;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            const canAdd = !isReadOnly && currentCount < maxCount;
            return (
                <div className={`space-y-1.5${isReadOnly ? ' opacity-75' : ''}`}>
                    {existingFileMeta?.map(meta => (
                        <div key={meta.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                            <Film className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate flex-1">{meta.origName}</span>
                            <span className="text-slate-400 flex-shrink-0">{(meta.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                            {/* 읽기 전용이면 삭제 버튼 숨김 */}
                            {!isReadOnly && (
                                <button type="button" onClick={() => onRemoveExisting?.(meta.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {fileList?.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 bg-blue-50 border border-blue-200 rounded-md text-xs">
                            <Film className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                            <span className="text-slate-700 truncate flex-1">{file.name}</span>
                            <span className="text-slate-400 flex-shrink-0">{(file.size / 1024 / 1024).toFixed(1)}MB</span>
                            {!isReadOnly && (
                                <button type="button" onClick={() => onFileChange?.(fileList.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    {/* 파일 추가 버튼 — 읽기 전용이면 숨김 */}
                    {canAdd && (
                        <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border border-dashed border-slate-300 rounded-md text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all">
                            <Film className="w-3.5 h-3.5 flex-shrink-0" />
                            동영상 파일 선택 ({currentCount}/{maxCount})
                            <input
                                type="file"
                                className="sr-only"
                                accept={getAcceptStr(field.fileTypeMode ?? 'video', field.allowedExtensions ?? [])}
                                onChange={e => {
                                    const newFiles = Array.from(e.target.files ?? []);
                                    onFileChange?.([...(fileList ?? []), ...newFiles].slice(0, maxCount));
                                    e.target.value = '';
                                }}
                            />
                        </label>
                    )}
                </div>
            );
        }

        default:
            return null;
    }
}
