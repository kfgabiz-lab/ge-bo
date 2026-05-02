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
import dynamic from 'next/dynamic';
import { Calendar, Paperclip, Film, Plus, X } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';

/* 에디터는 SSR 불가 — 클라이언트에서만 로드 */
const WysiwygEditor = dynamic(() => import('@/components/common/WysiwygEditor'), { ssr: false });
import { ROW_HEIGHT } from '@/components/layout/GridCell';
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

/**
 * 새로 선택된 File 객체를 이미지로 미리보기
 * object URL을 생성하고 언마운트 시 자동 해제
 */
function FileImagePreview({ file, className }: { file: File; className?: string }) {
    const [src, setSrc] = React.useState('');
    React.useEffect(() => {
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);
    return src ? <img src={src} alt={file.name} className={className} /> : null;
}

/**
 * 새로 선택된 File 객체를 동영상으로 미리보기
 *
 * Edge 호환 처리:
 * - video 엘리먼트를 먼저 DOM에 렌더링(src 없이) → 레이아웃에 배치 확정
 * - useEffect에서 DOM 직접 조작(src 주입 + load()) → Edge GPU 디코딩 타이밍 문제 우회
 * - React state로 src를 관리하면 엘리먼트 생성과 src 부착이 동시에 일어나
 *   Edge에서 첫 프레임 디코딩을 건너뛰는 버그 발생
 */
function FileVideoPreview({ file, cellHeight }: { file: File; cellHeight: number }) {
    const videoRef = React.useRef<HTMLVideoElement>(null);

    React.useEffect(() => {
        const el = videoRef.current;
        if (!el) return;

        const url = URL.createObjectURL(file);
        el.src = url;

        /* 데이터 로드 완료 후 0.001초 seek → 첫 프레임 렌더링 보장 (Edge/Safari 대응) */
        const handleLoadedData = () => {
            el.currentTime = 0.001;
        };
        el.addEventListener('loadeddata', handleLoadedData);

        return () => {
            el.removeEventListener('loadeddata', handleLoadedData);
            /* 컴포넌트 언마운트 시 src 해제 후 blob URL 회수 */
            el.src = '';
            URL.revokeObjectURL(url);
        };
    }, [file]);

    return (
        <video
            ref={videoRef}
            controls
            playsInline
            preload="auto"
            style={{ width: '100%', height: `${cellHeight}px`, display: 'block' }}
        />
    );
}

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
                    rows={(field as unknown as { rows?: number }).rows ?? 3}
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
            /* rowSpan 기반 명시적 높이 계산 — editor 케이스와 동일한 방식 */
            const fileRowSpan = (field as unknown as { rowSpan?: number }).rowSpan ?? 1;
            const fileHeight = `${fileRowSpan * ROW_HEIGHT - (field.label ? 44 : 24)}px`;

            /* validation 정보 (빌더 설정값 그대로 표시) */
            const maxCount = field.maxFileCount ?? 1;
            const maxSizeMB = (field as unknown as { maxFileSizeMB?: number }).maxFileSizeMB ?? 10;
            const maxTotalMB = (field as unknown as { maxTotalSizeMB?: number }).maxTotalSizeMB ?? 20;
            const fileTypeLabelMap: Record<string, string> = { '': '전체', doc: '문서', image: '이미지', video: '동영상', custom: '커스텀' };
            const fileTypeLabel = fileTypeLabelMap[field.fileTypeMode ?? ''] ?? '전체';
            const validationInfo = `최대 ${maxCount}개 · 개당 ${maxSizeMB}MB · 전체 ${maxTotalMB}MB · 허용: ${fileTypeLabel}`;

            /* preview / live 빈 상태 공통 UI — 중앙 정렬 + validation 정보 */
            const filePlaceholder = (
                <>
                    <Paperclip className="w-5 h-5" />
                    <span className="text-xs font-medium">파일 업로드</span>
                    <span className="text-[10px] text-center leading-relaxed">{validationInfo}</span>
                </>
            );

            /* preview: 비활성 placeholder — live 빈 상태와 동일한 UI */
            if (isPreview) {
                return (
                    <div style={{ height: fileHeight }} className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-200 rounded-md text-slate-400 overflow-hidden">
                        {filePlaceholder}
                    </div>
                );
            }

            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            const canAdd = !isReadOnly && currentCount < maxCount;

            /* 파일 input 공통 — 중복 제거 */
            const fileInput = (
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
            );

            /* 빈 상태: preview와 동일한 UI, live는 전체 영역 클릭으로 파일 선택 */
            if (currentCount === 0) {
                return (
                    <div style={{ height: fileHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}>
                        {canAdd ? (
                            <label className="flex-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                {filePlaceholder}
                                {fileInput}
                            </label>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                {filePlaceholder}
                            </div>
                        )}
                    </div>
                );
            }

            /* 파일 있을 때: 파일 목록 + 하단 validation 정보 + 추가 버튼 */
            return (
                <div style={{ height: fileHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}>
                    {/* 파일 목록 */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {existingFileMeta?.map(meta => (
                            <div key={meta.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex-shrink-0">
                                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <span className="text-slate-700 truncate flex-1">{meta.origName}</span>
                                <span className="text-slate-400 flex-shrink-0">{(meta.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                                {!isReadOnly && (
                                    <button type="button" onClick={() => onRemoveExisting?.(meta.id)} className="text-slate-400 hover:text-red-500 flex-shrink-0 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
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
                    </div>
                    {/* 하단: validation 정보 + 파일 추가 버튼 */}
                    <div className="flex-shrink-0 px-2 pb-2 flex flex-col gap-1">
                        <p className="text-[10px] text-slate-300 text-center">{validationInfo}</p>
                        {canAdd && (
                            <label className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 border border-dashed border-slate-300 rounded-md text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all">
                                <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                파일 추가 ({currentCount}/{maxCount})
                                {fileInput}
                            </label>
                        )}
                    </div>
                </div>
            );
        }

        /* ── image ── */
        case 'image': {
            /* rowSpan 기반 명시적 높이 계산 */
            const imgRowSpan = (field as unknown as { rowSpan?: number }).rowSpan ?? 2;
            const imgHeight = `${imgRowSpan * ROW_HEIGHT - (field.label ? 44 : 24)}px`;

            const imgMaxCount = field.maxFileCount ?? 1;
            const imgFormatInfo = `최대 ${imgMaxCount}개 · jpg, png, gif, webp`;

            /* preview / live 빈 상태 공통 UI */
            const imgPlaceholder = (
                <>
                    <ImageIcon className="w-6 h-6" />
                    <span className="text-xs font-medium">이미지 추가</span>
                    <span className="text-[10px] text-center leading-relaxed">{imgFormatInfo}</span>
                </>
            );

            /* preview: 비활성 — live 빈 상태와 동일한 UI */
            if (isPreview) {
                return (
                    <div style={{ height: imgHeight }} className="flex flex-col items-center justify-center gap-1.5 border border-dashed border-slate-200 rounded-md text-slate-400 overflow-hidden">
                        {imgPlaceholder}
                    </div>
                );
            }

            const maxCount = imgMaxCount;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            const canAdd = !isReadOnly && currentCount < maxCount;
            return (
                <div style={{ height: imgHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}>
                    {currentCount === 0 ? (
                        /* 빈 상태: preview와 동일한 UI, live는 전체 영역 클릭으로 파일 선택 */
                        canAdd ? (
                            <label className="flex-1 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all gap-1.5">
                                {imgPlaceholder}
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
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                {imgPlaceholder}
                            </div>
                        )
                    ) : (() => {
                        /* 이미지 있음 — 이미지 수에 따라 격자 자동 계산, 컨테이너에 꽉 차게 (스크롤 없음) */

                        /* 표시 아이템: 기존 파일 + 신규 파일 + 추가 버튼 */
                        const displayItems: Array<
                            | { kind: 'existing'; meta: { id: number; origName: string; fileSize: number } }
                            | { kind: 'new'; file: File; idx: number }
                            | { kind: 'add' }
                        > = [
                            ...(existingFileMeta ?? []).map(m => ({ kind: 'existing' as const, meta: m })),
                            ...(fileList ?? []).map((f, i) => ({ kind: 'new' as const, file: f, idx: i })),
                            ...(canAdd ? [{ kind: 'add' as const }] : []),
                        ];

                        /* 이미지 수 기반 격자 열/행 계산 */
                        const cols = Math.max(1, Math.ceil(Math.sqrt(displayItems.length)));
                        const rows = Math.max(1, Math.ceil(displayItems.length / cols));

                        /* 셀 높이 = (컨테이너 높이 - 패딩 - 간격) ÷ 행 수 */
                        const PAD_PX = 8;  /* p-1: 4px × 2 */
                        const GAP_PX = 4;  /* gap-1: 4px */
                        const containerH = imgRowSpan * ROW_HEIGHT - (field.label ? 44 : 24);
                        const cellH = Math.floor((containerH - PAD_PX - GAP_PX * (rows - 1)) / rows);

                        return (
                            <div className="p-1 overflow-hidden" style={{ height: imgHeight }}>
                                <div
                                    className="grid gap-1"
                                    style={{
                                        gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                        gridAutoRows: `${cellH}px`,
                                    }}
                                >
                                    {displayItems.map((item, i) => {
                                        if (item.kind === 'existing') {
                                            return (
                                                <div key={item.meta.id} className="relative rounded-md overflow-hidden border border-slate-200 group">
                                                    {imgBlobUrls?.[item.meta.id]
                                                        ? <img src={imgBlobUrls[item.meta.id]} alt={item.meta.origName} className="w-full h-full object-contain" />
                                                        : <div className="w-full h-full flex items-center justify-center bg-slate-100"><ImageIcon className="w-5 h-5 text-slate-300" /></div>
                                                    }
                                                    {!isReadOnly && (
                                                        <button type="button" onClick={() => onRemoveExisting?.(item.meta.id)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X className="w-2.5 h-2.5 text-white" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                        if (item.kind === 'new') {
                                            return (
                                                <div key={`new-${item.idx}`} className="relative rounded-md overflow-hidden border border-blue-200 group">
                                                    <FileImagePreview file={item.file} className="w-full h-full object-contain" />
                                                    {!isReadOnly && (
                                                        <button type="button" onClick={() => onFileChange?.(fileList!.filter((_, fi) => fi !== item.idx))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <X className="w-2.5 h-2.5 text-white" />
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        }
                                        /* 추가 버튼 셀 */
                                        return (
                                            <label key={`add-${i}`} className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all">
                                                <Plus className="w-4 h-4" />
                                                <span className="text-[10px] mt-0.5">추가</span>
                                                <input type="file" className="sr-only" accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp" multiple={maxCount > 1} onChange={e => { const newFiles = Array.from(e.target.files ?? []); onFileChange?.([...(fileList ?? []), ...newFiles].slice(0, maxCount)); e.target.value = ''; }} />
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            );
        }

        /* ── video ── */
        case 'video': {
            const videoMode = field.videoMode ?? 'url';
            /* rowSpan 기반 명시적 높이 계산 */
            const vidRowSpan = (field as unknown as { rowSpan?: number }).rowSpan ?? 2;
            const vidHeight = `${vidRowSpan * ROW_HEIGHT - (field.label ? 44 : 24)}px`;
            /* URL 모드: 텍스트 입력 + embed 미리보기 */
            if (videoMode === 'url') {
                const embedUrl = toEmbedUrl(value);
                return (
                    <div style={{ height: vidHeight }} className="flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden">
                        {/* input 항상 상단 고정 */}
                        <div className="p-2 flex-shrink-0">
                            <input
                                type="text"
                                disabled={isPreview}
                                readOnly={isReadOnly}
                                className={`${inputCls}${readonlyCls} w-full`}
                                value={value}
                                placeholder="YouTube / Vimeo URL을 입력하세요"
                                onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                            />
                        </div>
                        {/* URL 입력 시 하단 embed */}
                        {embedUrl && (
                            <div className="flex-1 overflow-hidden">
                                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="video-preview" />
                            </div>
                        )}
                    </div>
                );
            }
            /* 파일 모드: 파일 업로드 + 미리보기 */
            const maxCount = field.maxFileCount ?? 1;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            /* preview에서는 업로드 버튼 비활성 */
            const canAdd = !isPreview && !isReadOnly && currentCount < maxCount;

            /* 빈 상태 */
            if (currentCount === 0) {
                return (
                    <div style={{ height: vidHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}>
                        {canAdd ? (
                            <label className="flex-1 flex flex-col items-center justify-center gap-1.5 cursor-pointer text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                <Film className="w-5 h-5" />
                                <span className="text-xs font-medium">동영상 업로드</span>
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
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400">
                                <Film className="w-5 h-5" />
                                <span className="text-xs font-medium">동영상 업로드</span>
                            </div>
                        )}
                    </div>
                );
            }

            /* 파일 있음 — 이미지와 동일한 격자 레이아웃 + 비디오 미리보기 */
            return (() => {
                const displayItems: Array<
                    | { kind: 'existing'; meta: { id: number; origName: string; fileSize: number } }
                    | { kind: 'new'; file: File; idx: number }
                    | { kind: 'add' }
                > = [
                    ...(existingFileMeta ?? []).map(m => ({ kind: 'existing' as const, meta: m })),
                    ...(fileList ?? []).map((f, i) => ({ kind: 'new' as const, file: f, idx: i })),
                    ...(canAdd ? [{ kind: 'add' as const }] : []),
                ];

                /* 이미지와 동일한 격자 계산 */
                const cols = Math.max(1, Math.ceil(Math.sqrt(displayItems.length)));
                const rows = Math.max(1, Math.ceil(displayItems.length / cols));
                const PAD_PX = 8;
                const GAP_PX = 4;
                const containerH = vidRowSpan * ROW_HEIGHT - (field.label ? 44 : 24);
                const cellH = Math.floor((containerH - PAD_PX - GAP_PX * (rows - 1)) / rows);

                return (
                    /* isolation:isolate — 독립 stacking context 생성으로 부모(GridCell/RendererContainer)의
                       overflow:hidden이 Edge video GPU compositing 레이어를 clip하는 것을 차단 */
                    <div className="p-1" style={{ height: vidHeight, isolation: 'isolate' }}>
                        <div
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridAutoRows: `${cellH}px`,
                            }}
                        >
                            {displayItems.map((item, i) => {
                                if (item.kind === 'existing') {
                                    /* 기존 파일: 파일명 + 크기 표시 (서버 스트리밍 미지원) */
                                    return (
                                        <div key={item.meta.id} className="relative flex flex-col items-center justify-center gap-1 rounded-md border border-slate-200 bg-slate-50 group overflow-hidden">
                                            <Film className="w-6 h-6 text-slate-300" />
                                            <span className="text-[10px] text-slate-500 px-1 truncate w-full text-center">{item.meta.origName}</span>
                                            <span className="text-[10px] text-slate-400">{(item.meta.fileSize / 1024 / 1024).toFixed(1)}MB</span>
                                            {!isReadOnly && (
                                                <button type="button" onClick={() => onRemoveExisting?.(item.meta.id)} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-2.5 h-2.5 text-white" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                                if (item.kind === 'new') {
                                    /* 신규 파일: 비디오 플레이어로 미리보기
                                       overflow-hidden 제거 — rounded+overflow 조합이 Edge에서 video 검은화면 버그 유발 */
                                    return (
                                        <div key={`new-${item.idx}`} className="relative border border-blue-200 group" style={{ borderRadius: '6px' }}>
                                            <FileVideoPreview file={item.file} cellHeight={cellH} />
                                            {!isReadOnly && (
                                                <button type="button" onClick={() => onFileChange?.(fileList!.filter((_, fi) => fi !== item.idx))} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <X className="w-2.5 h-2.5 text-white" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                }
                                /* 추가 버튼 셀 */
                                return (
                                    <label key={`add-${i}`} className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all">
                                        <Plus className="w-4 h-4" />
                                        <span className="text-[10px] mt-0.5">추가</span>
                                        <input type="file" className="sr-only" accept={getAcceptStr(field.fileTypeMode ?? 'video', field.allowedExtensions ?? [])} multiple={maxCount > 1} onChange={e => { const newFiles = Array.from(e.target.files ?? []); onFileChange?.([...(fileList ?? []), ...newFiles].slice(0, maxCount)); e.target.value = ''; }} />
                                    </label>
                                );
                            })}
                        </div>
                    </div>
                );
            })();
        }

        /* ── editor ── 위지윅 에디터 (preview/live 모두 실제 에디터 렌더링) */
        case 'editor': {
            /* rowSpan × ROW_HEIGHT 로 에디터 높이 계산 — Toast UI는 px 값 필요 (100% 미지원) */
            /* 라벨 있으면 라벨 높이(~20px) 추가 차감, 없으면 더 크게 */
            const rowSpan = (field as unknown as { rowSpan?: number }).rowSpan ?? 3;
            const editorHeight = `${rowSpan * ROW_HEIGHT - (field.label ? 44 : 24)}px`;
            return (
                <WysiwygEditor
                    initialValue={value}
                    onChange={isPreview ? undefined : v => onChange?.(v)}
                    height={editorHeight}
                />
            );
        }

        /* ── hidden ── 화면에 렌더링하지 않음 — 저장 시 defaultValue로 자동 포함 */
        case 'hidden':
            return null;

        default:
            return null;
    }
}
