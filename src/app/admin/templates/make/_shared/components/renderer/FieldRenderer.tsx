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

import React, { useRef, useId } from 'react';
import { useI18n } from '@/hooks/use-i18n';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';
import { CategorySearchField } from './CategorySearchField';
import dynamic from 'next/dynamic';
import { Calendar, Paperclip, Film, Plus, X } from 'lucide-react';
import { Image as ImageIcon } from 'lucide-react';

/* 에디터는 SSR 불가 — 클라이언트에서만 로드 */
const WysiwygEditor = dynamic(() => import('@/components/common/wysiwyg-editor'), { ssr: false });
import { ROW_HEIGHT } from '@/components/layout/grid-cell';
import { SearchFieldConfig, CodeGroupDef } from '../../types';
import { inputCls, selectCls } from '../../styles';
import { FILE_TYPE_PRESETS, FILE_TYPE_LABELS } from '../../constants';
import { SelectArrow } from '../SelectArrow';

/** bytes → 사람이 읽기 쉬운 단위로 변환 (1MB 미만이면 KB, 이상이면 MB) */
const fmtSize = (bytes: number) =>
    bytes >= 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)}MB`
        : `${Math.round(bytes / 1024)}KB`;
import { parseOpt } from '../../utils';
import type { RendererMode } from './types';
import api from '@/lib/api';
import { toast } from 'sonner';

/**
 * 서버에 저장된 파일 다운로드
 * @param fileId  page_file.id
 * @param origName 저장 시 사용할 파일명
 */
async function downloadFile(fileId: number, origName: string) {
    try {
        const res = await api.get(`/page-files/${fileId}`, { responseType: 'blob' });
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = origName;
        a.click();
        URL.revokeObjectURL(url);
    } catch {
        toast.error('파일 다운로드에 실패했습니다.');
    }
}

/**
 * 아직 미저장 상태인 로컬 File 객체 다운로드
 * @param file  브라우저 File 객체
 */
function downloadLocalFile(file: File) {
    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(url);
}

/* FILE_TYPE_PRESETS — constants.ts 공통 상수 사용 */

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
 * 선택된 파일 목록에서 허용 확장자를 벗어난 파일 걸러내기
 * accept 문자열이 비어있으면 모든 파일 허용
 */
function filterByAccept(files: File[], acceptStr: string): { valid: File[]; rejected: string[] } {
    if (!acceptStr) return { valid: files, rejected: [] };
    const exts = new Set(acceptStr.split(',').map(e => e.trim().toLowerCase()));
    const valid: File[] = [];
    const rejected: string[] = [];
    for (const f of files) {
        const ext = '.' + (f.name.split('.').pop() ?? '').toLowerCase();
        if (exts.has(ext)) valid.push(f);
        else rejected.push(f.name);
    }
    return { valid, rejected };
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
    /** dateRange 전용: 시작일 (valueFrom/valueTo 사용 시 value 무시) */
    valueFrom?: string;
    /** dateRange 전용: 종료일 */
    valueTo?: string;
    /** dateRange 전용: 시작일 변경 핸들러 */
    onFromChange?: (v: string) => void;
    /** dateRange 전용: 종료일 변경 핸들러 */
    onToChange?: (v: string) => void;
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
    /** 동적 Disable 조건 결과 — true 시 live 모드에서도 disabled 처리 */
    forceDisabled?: boolean;
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
            /* nameMsgKey 있으면 msgKey를 text로 저장 → FieldRenderer에서 t(text)로 번역 */
            .map(d => `${d.nameMsgKey ? d.nameMsgKey : d.name}:${d.code}`) ?? [];
    }
    return field.options ?? [];
};

/**
 * 파일 선택 입력 — useRef + programmatic click() 방식
 *
 * Edge에서 overflow-y-auto 스크롤 컨테이너 내부의 label>input[absolute inset-0] 패턴은
 * 파일 선택 다이얼로그가 닫힌 뒤 onChange가 발화하지 않는 버그가 있음.
 * 이를 우회하기 위해 input을 display:none으로 숨기고 버튼 onClick에서 input.click()을 호출.
 *
 * 사용법:
 *   <FileInput accept=".jpg,.png" multiple onChange={files => handleFiles(files)} renderTrigger={ref => (
 *     <label onClick={() => ref.current?.click()} className="cursor-pointer ...">...</label>
 *   )} />
 */
interface FileInputProps {
    accept?: string;
    multiple?: boolean;
    onChange: (files: File[]) => void;
    /** 클릭 트리거 UI — inputRef를 받아 onClick에서 inputRef.current?.click() 호출 */
    renderTrigger: (inputRef: React.RefObject<HTMLInputElement | null>) => React.ReactNode;
}

function FileInput({ accept, multiple, onChange, renderTrigger }: FileInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        onChange(files);
        /* 같은 파일을 다시 선택할 수 있도록 value 초기화 */
        e.target.value = '';
    };

    return (
        <>
            {/* display:none — overflow/scroll 컨테이너의 영향 완전히 차단 */}
            <input
                ref={inputRef}
                type="file"
                accept={accept}
                multiple={multiple}
                style={{ display: 'none' }}
                onChange={handleChange}
            />
            {renderTrigger(inputRef)}
        </>
    );
}

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

interface ColorPresetSelectorProps {
    colors: string[];
    selectedColor: string;
    disabled: boolean;
    onChange: (color: string) => void;
}

/**
 * ColorPresetSelector — Preset 원형 버튼형 색상 선택기
 * preview: disabled=true → pointer-events-none (UI 동일 유지)
 * live: 클릭으로 색상 선택, outline으로 선택 표시
 */
function ColorPresetSelector({ colors, selectedColor, disabled, onChange }: ColorPresetSelectorProps) {
    return (
        <div className="flex items-center gap-2 flex-wrap p-1">
            {colors.map(color => {
                const isSelected = selectedColor === color;
                return (
                    <button
                        key={color}
                        type="button"
                        disabled={disabled}
                        onClick={() => onChange(color)}
                        title={color}
                        /* preview: cursor-default, live: hover 확대 효과 */
                        className={`w-7 h-7 rounded-full flex-shrink-0 transition-all ${
                            disabled ? 'cursor-default' : 'cursor-pointer hover:scale-110'
                        }`}
                        style={{
                            backgroundColor: color,
                            /* 선택된 색상: 해당 색상으로 outline 표시 */
                            outline: isSelected ? `3px solid ${color}` : 'none',
                            outlineOffset: isSelected ? '2px' : '0',
                            /* 미선택: 연한 테두리 */
                            boxShadow: isSelected ? 'none' : '0 0 0 1px rgba(0,0,0,0.12)',
                        }}
                    />
                );
            })}
            {colors.length === 0 && (
                <span className="text-xs text-slate-400 italic">색상 옵션 없음</span>
            )}
        </div>
    );
}

export function FieldRenderer({
    mode,
    field,
    value = '',
    onChange,
    valueFrom,
    valueTo,
    onFromChange,
    onToChange,
    codeGroups = [],
    onButtonClick,
    fileList,
    existingFileMeta,
    imgBlobUrls,
    onFileChange,
    onRemoveExisting,
    forceDisabled = false,
}: FieldRendererProps) {
    const isPreview = mode === 'preview';
    const { t } = useI18n();
    /* 탭 keep-alive 환경에서 radio name 충돌 방지 — 인스턴스별 고유 prefix */
    const uid = useId();
    /* preview 또는 동적 Disable 조건 충족 시 비활성 */
    const isDisabled = isPreview || forceDisabled;
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
        case 'input': {
            const inputEl = (
                <input
                    type="text"
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    placeholder={
                        field.placeholderMsgKey
                            ? t(field.placeholderMsgKey)
                            : (field.placeholder || '입력하세요')
                    }
                    maxLength={field.showCharCount && field.maxLength ? field.maxLength : undefined}
                    className={`${inputCls}${readonlyCls}`}
                    value={value}
                    onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                />
            );
            /* 글자수 표시 ON + maxLength 설정된 경우: 카운터 표시 */
            if (field.showCharCount && field.maxLength) {
                return (
                    <div>
                        {inputEl}
                        <div className="text-right text-[10px] text-slate-400 mt-0.5">
                            {value.length}/{field.maxLength}
                        </div>
                    </div>
                );
            }
            return inputEl;
        }

        /* ── select ── */
        case 'select':
            return (
                <div className="relative">
                    <select
                        disabled={isDisabled || isReadOnly}
                        className={`${selectCls}${readonlyCls}`}
                        value={value}
                        onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                    >
                        <option value="">{field.placeholderMsgKey ? t(field.placeholderMsgKey) : (field.placeholder || t('common.select.placeholder'))}</option>
                        {opts.map(opt => {
                            const { text, value: val } = parseOpt(opt);
                            return <option key={opt} value={val}>{t(text)}</option>;
                        })}
                    </select>
                    <SelectArrow />
                </div>
            );

        /* ── yearMonth — date 통합 케이스로 fall-through (하위 호환) ── */
        case 'yearMonth':
        /* ── date — dateSubType으로 날짜/년월/일시분초 3가지 타입 통합 ── */
        case 'date': {
            /* yearMonth 기존 데이터는 yearMonth subType으로 처리 */
            const dateSubType = field.type === 'yearMonth' ? 'yearMonth' : (field.dateSubType ?? 'date');
            const inputType = dateSubType === 'yearMonth' ? 'month'
                : dateSubType === 'datetime' ? 'datetime-local'
                : 'date';
            /* 오늘 값 (min 제약에 사용) — 서브타입별 포맷 */
            const getTodayVal = (): string => {
                const iso = new Date().toISOString();
                if (dateSubType === 'yearMonth') return iso.slice(0, 7);
                if (dateSubType === 'datetime') return iso.slice(0, 16);
                return iso.slice(0, 10);
            };
            /* offset 기반 기본값 계산 — 서브타입별 포맷 */
            const calcDateDefault = (offset?: number, date?: string): string => {
                /* defaultToday ON 시 오늘 날짜 최우선 반환 */
                if (field.defaultToday) {
                    const iso = new Date().toISOString();
                    if (dateSubType === 'yearMonth') return iso.slice(0, 7);
                    if (dateSubType === 'datetime') return iso.slice(0, 16);
                    return iso.slice(0, 10);
                }
                if (offset !== undefined && offset !== 0) {
                    const d = new Date();
                    d.setDate(d.getDate() - offset);
                    const iso = d.toISOString();
                    if (dateSubType === 'yearMonth') return iso.slice(0, 7);
                    if (dateSubType === 'datetime') return iso.slice(0, 16);
                    return iso.slice(0, 10);
                }
                return date ?? '';
            };
            const dateDefault = calcDateDefault(field.defaultDateOffset, field.defaultDate);
            /* 토글 ON: 기본값(또는 오늘)을 고정 min으로 */
            const dateMin = field.disablePast ? (dateDefault || getTodayVal()) : undefined;
            return (
                <input
                    type={inputType}
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    className={`${inputCls}${readonlyCls}`}
                    value={value}
                    min={dateMin}
                    onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                />
            );
        }

        /* ── yearMonthRange — dateRange 통합 케이스로 fall-through (하위 호환) ── */
        case 'yearMonthRange':
        /* ── dateRange — rangeSubType으로 날짜/년월/일시분초/시분초 4가지 타입 통합 ── */
        case 'dateRange': {
            /* yearMonthRange 기존 데이터는 yearMonth subType으로 처리 */
            const subType = (field.type === 'yearMonthRange')
                ? 'yearMonth'
                : (field.rangeSubType ?? 'date');

            const from = valueFrom ?? '';
            const to   = valueTo ?? '';

            const inputType = subType === 'yearMonth' ? 'month'
                : subType === 'datetime' ? 'datetime-local'
                : subType === 'time' ? 'time'
                : 'date';

            /* 서브타입별 오늘 값 계산 (min 제약에 사용) */
            const getToday = (): string => {
                const iso = new Date().toISOString();
                if (subType === 'yearMonth') return iso.slice(0, 7);
                if (subType === 'datetime') return iso.slice(0, 16);
                if (subType === 'time') return new Date().toTimeString().slice(0, 5);
                return iso.slice(0, 10);
            };

            /* offset 기반 기본값 계산 — 서브타입에 따라 포맷 분기 */
            const calcRangeDefault = (offset?: number, date?: string): string => {
                if (offset !== undefined && offset !== 0) {
                    const d = new Date();
                    d.setDate(d.getDate() - offset);
                    const iso = d.toISOString();
                    if (subType === 'yearMonth') return iso.slice(0, 7);
                    if (subType === 'datetime') return iso.slice(0, 16);
                    return iso.slice(0, 10);
                }
                return date ?? '';
            };

            const startDefault = calcRangeDefault(field.defaultStartDateOffset, field.defaultStartDate);
            const endDefault   = calcRangeDefault(field.defaultEndDateOffset,   field.defaultEndDate);
            const todayVal     = getToday();
            const startMin = field.disableStartPast ? (startDefault || todayVal) : undefined;
            const endMin   = field.disableEndPast   ? (endDefault   || todayVal) : undefined;

            return (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type={inputType}
                            disabled={isDisabled}
                            readOnly={isReadOnly}
                            className={`${inputCls} pl-9${readonlyCls}`}
                            value={from}
                            min={startMin}
                            onChange={isReadOnly ? undefined : e => onFromChange?.(e.target.value)}
                        />
                    </div>
                    <span className="text-sm text-slate-400 flex-shrink-0">~</span>
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <input
                            type={inputType}
                            disabled={isDisabled}
                            readOnly={isReadOnly}
                            className={`${inputCls} pl-9${readonlyCls}`}
                            value={to}
                            min={endMin}
                            onChange={isReadOnly ? undefined : e => onToChange?.(e.target.value)}
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
                                    name={`${uid}-field-${field.id}`}
                                    disabled={isDisabled || isReadOnly}
                                    value={val}
                                    checked={!isPreview && value === val}
                                    onChange={isReadOnly ? undefined : () => onChange?.(val)}
                                    className="w-4 h-4 cursor-pointer"
                                />
                                <span className="text-sm text-slate-700">{t(text)}</span>
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
                                    disabled={isDisabled || isReadOnly}
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
                                <span className="text-sm text-slate-700">{t(text)}</span>
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
                                    {t(text)}
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
                                disabled={isDisabled}
                                onClick={() => onChange?.(val)}
                                className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${isActive
                                    ? 'bg-slate-900 text-white border-slate-900'
                                    : 'text-slate-500 border-slate-200 hover:bg-slate-100 disabled:cursor-default'
                                    }`}
                            >
                                {t(text)}
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
            /* 글자수 표시 ON + maxLength 설정된 경우: 카운터 표시 */
            if (field.showCharCount && field.maxLength) {
                return (
                    <div className="flex flex-col h-full">
                        <textarea
                            disabled={isDisabled}
                            readOnly={isReadOnly}
                            className={`${inputCls} resize-none flex-1 min-h-0${readonlyCls}`}
                            value={value}
                            maxLength={field.maxLength}
                            placeholder={isReadOnly ? '' : (field.placeholderMsgKey ? t(field.placeholderMsgKey) : (field.placeholder || '텍스트를 입력하세요'))}
                            onChange={isReadOnly ? undefined : e => onChange(e.target.value)}
                        />
                        <div className="text-right text-[10px] text-slate-400 mt-0.5">
                            {value.length}/{field.maxLength}
                        </div>
                    </div>
                );
            }
            return (
                <textarea
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    className={`${inputCls} resize-none h-full${readonlyCls}`}
                    value={value}
                    placeholder={isReadOnly ? '' : (field.placeholderMsgKey ? t(field.placeholderMsgKey) : (field.placeholder || '텍스트를 입력하세요'))}
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
                    disabled={isDisabled}
                    onClick={onButtonClick}
                    className={`text-xs px-4 py-2.5 rounded-md font-bold transition-all shadow-sm flex items-center justify-center min-h-[40px] min-w-[72px] w-full whitespace-nowrap hover:opacity-90 disabled:cursor-default ${bgCls} ${textCls}`}
                >
                    {field.labelMsgKey ? t(field.labelMsgKey) : (field.label || '버튼')}
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

            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            /* preview에서는 canAdd=false → pointer-events-none, file input 미렌더 */
            const canAdd = !isPreview && !isReadOnly && currentCount < maxCount;

            const fileAcceptStr = getAcceptStr(field.fileTypeMode ?? '', field.allowedExtensions ?? []);

            /* 파일 선택 후 공통 처리 — 형식 검증 + 목록 병합 */
            const handleFileSelect = (selected: File[]) => {
                const { valid, rejected } = filterByAccept(selected, fileAcceptStr);
                if (rejected.length > 0) alert(`허용되지 않는 파일 형식입니다.\n${rejected.join('\n')}`);
                if (valid.length > 0) onFileChange?.([...(fileList ?? []), ...valid].slice(0, maxCount));
            };

            /* 빈 상태: preview/live 동일한 label 구조 — canAdd 여부로 기능만 분기 */
            if (currentCount === 0) {
                return (
                    <div style={{ height: fileHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}
                        onDragOver={canAdd ? e => e.preventDefault() : undefined}
                        onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleFileSelect(files); } : undefined}
                    >
                        {canAdd ? (
                            /* FileInput: display:none input + renderTrigger → Edge overflow-y-auto 내부 onChange 버그 우회 */
                            <FileInput
                                accept={fileAcceptStr}
                                multiple={maxCount > 1}
                                onChange={handleFileSelect}
                                renderTrigger={inputRef => (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                        {filePlaceholder}
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 pointer-events-none">
                                {filePlaceholder}
                            </div>
                        )}
                    </div>
                );
            }

            /* 파일 있을 때: 파일 목록 + 하단 validation 정보 + 추가 버튼 */
            return (
                <div style={{ height: fileHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}
                    onDragOver={canAdd ? e => e.preventDefault() : undefined}
                    onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleFileSelect(files); } : undefined}
                >
                    {/* 파일 목록 */}
                    <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {existingFileMeta?.map(meta => (
                            <div key={meta.id} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs flex-shrink-0">
                                <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                <button
                                    type="button"
                                    title="클릭하여 다운로드"
                                    onClick={() => downloadFile(meta.id, meta.origName)}
                                    className="text-slate-700 truncate flex-1 text-left hover:text-blue-600 hover:underline transition-colors"
                                >
                                    {meta.origName}
                                </button>
                                <span className="text-slate-400 flex-shrink-0">{fmtSize(meta.fileSize)}</span>
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
                                <button
                                    type="button"
                                    title="클릭하여 다운로드"
                                    onClick={() => downloadLocalFile(file)}
                                    className="text-slate-700 truncate flex-1 text-left hover:text-blue-600 hover:underline transition-colors"
                                >
                                    {file.name}
                                </button>
                                <span className="text-slate-400 flex-shrink-0">{fmtSize(file.size)}</span>
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
                            <FileInput
                                accept={fileAcceptStr}
                                multiple={maxCount > 1}
                                onChange={handleFileSelect}
                                renderTrigger={inputRef => (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                        className="flex items-center justify-center gap-1.5 cursor-pointer px-3 py-1.5 border border-dashed border-slate-300 rounded-md text-xs text-slate-500 hover:border-slate-500 hover:text-slate-700 transition-all"
                                    >
                                        <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                                        파일 추가 ({currentCount}/{maxCount})
                                    </div>
                                )}
                            />
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

            const maxCount = imgMaxCount;
            const currentCount = (existingFileMeta?.length ?? 0) + (fileList?.length ?? 0);
            /* preview에서는 canAdd=false → pointer-events-none, file input 미렌더 */
            const canAdd = !isPreview && !isReadOnly && currentCount < maxCount;

            /* 이미지 파일 선택 후 공통 처리 */
            const handleImgSelect = (selected: File[]) => {
                const { valid, rejected } = filterByAccept(selected, FILE_TYPE_PRESETS.image);
                if (rejected.length > 0) alert(`허용되지 않는 파일 형식입니다.\n${rejected.join('\n')}`);
                if (valid.length > 0) onFileChange?.([...(fileList ?? []), ...valid].slice(0, maxCount));
            };

            return (
                <div style={{ height: imgHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}
                    onDragOver={canAdd ? e => e.preventDefault() : undefined}
                    onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleImgSelect(files); } : undefined}
                >
                    {currentCount === 0 ? (
                        /* 빈 상태: canAdd일 때 FileInput(programmatic click), 아닐 때 정적 UI */
                        canAdd ? (
                            <FileInput
                                accept={FILE_TYPE_PRESETS.image}
                                multiple={maxCount > 1}
                                onChange={handleImgSelect}
                                renderTrigger={inputRef => (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                        {imgPlaceholder}
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 pointer-events-none">
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
                                        /* 추가 버튼 셀 — FileInput(programmatic click)으로 Edge overflow 내 onChange 버그 우회 */
                                        return (
                                            <FileInput
                                                key={`add-${i}`}
                                                accept={FILE_TYPE_PRESETS.image}
                                                multiple={maxCount > 1}
                                                onChange={handleImgSelect}
                                                renderTrigger={inputRef => (
                                                    <div
                                                        role="button"
                                                        tabIndex={0}
                                                        onClick={() => inputRef.current?.click()}
                                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                                        className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[10px] mt-0.5">추가</span>
                                                    </div>
                                                )}
                                            />
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
                                disabled={isDisabled}
                                readOnly={isReadOnly}
                                className={`${inputCls}${readonlyCls} w-full`}
                                value={value}
                                placeholder="YouTube / Vimeo URL을 입력하세요"
                                onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                            />
                        </div>
                        {/* embed URL 있으면 iframe, 없으면 미리보기 placeholder */}
                        {embedUrl ? (
                            <div className="flex-1 overflow-hidden">
                                <iframe src={embedUrl} className="w-full h-full" allowFullScreen title="video-preview" />
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-300 pointer-events-none">
                                <Film className="w-6 h-6" />
                                <span className="text-[11px]">URL 입력 시 미리보기가 표시됩니다</span>
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

            const vidAcceptStr = getAcceptStr(field.fileTypeMode ?? 'video', field.allowedExtensions ?? []);

            /* 비디오 파일 선택 후 공통 처리 */
            const handleVidSelect = (selected: File[]) => {
                const { valid, rejected } = filterByAccept(selected, vidAcceptStr);
                if (rejected.length > 0) alert(`허용되지 않는 파일 형식입니다.\n${rejected.join('\n')}`);
                if (valid.length > 0) onFileChange?.([...(fileList ?? []), ...valid].slice(0, maxCount));
            };

            /* 빈 상태: canAdd일 때 FileInput(programmatic click), 아닐 때 정적 UI */
            if (currentCount === 0) {
                return (
                    <div style={{ height: vidHeight }} className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}
                        onDragOver={canAdd ? e => e.preventDefault() : undefined}
                        onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleVidSelect(files); } : undefined}
                    >
                        {canAdd ? (
                            <FileInput
                                accept={vidAcceptStr}
                                multiple={maxCount > 1}
                                onChange={handleVidSelect}
                                renderTrigger={inputRef => (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 cursor-pointer hover:text-slate-600 hover:bg-slate-50 transition-all"
                                    >
                                        <Film className="w-5 h-5" />
                                        <span className="text-xs font-medium">동영상 업로드</span>
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-slate-400 pointer-events-none">
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
                    <div className="p-1" style={{ height: vidHeight, isolation: 'isolate' }}
                        onDragOver={canAdd ? e => e.preventDefault() : undefined}
                        onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleVidSelect(files); } : undefined}
                    >
                        <div
                            className="grid gap-1"
                            style={{
                                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                                gridAutoRows: `${cellH}px`,
                            }}
                        >
                            {displayItems.map((item, i) => {
                                if (item.kind === 'existing') {
                                    const blobUrl = imgBlobUrls?.[item.meta.id];
                                    return (
                                        /* blob URL 있으면 video 플레이어, 없으면 로딩 중 아이콘 표시 */
                                        <div key={item.meta.id} className="relative border border-slate-200 group" style={{ borderRadius: '6px' }}>
                                            {blobUrl ? (
                                                <video
                                                    src={blobUrl}
                                                    controls
                                                    playsInline
                                                    preload="auto"
                                                    style={{ width: '100%', height: `${cellH}px`, display: 'block' }}
                                                />
                                            ) : (
                                                <div className="w-full flex flex-col items-center justify-center gap-1 bg-slate-50" style={{ height: `${cellH}px` }}>
                                                    <Film className="w-6 h-6 text-slate-300" />
                                                    <span className="text-[10px] text-slate-400">로딩 중...</span>
                                                </div>
                                            )}
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
                                /* 추가 버튼 셀 — FileInput(programmatic click)으로 Edge overflow 내 onChange 버그 우회 */
                                return (
                                    <FileInput
                                        key={`add-${i}`}
                                        accept={vidAcceptStr}
                                        multiple={maxCount > 1}
                                        onChange={handleVidSelect}
                                        renderTrigger={inputRef => (
                                            <div
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => inputRef.current?.click()}
                                                onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                                className="flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-md cursor-pointer text-slate-400 hover:border-slate-500 hover:text-slate-600 transition-all"
                                            >
                                                <Plus className="w-4 h-4" />
                                                <span className="text-[10px] mt-0.5">추가</span>
                                            </div>
                                        )}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })();
        }

        /* ── media ── 이미지 + 동영상 통합 업로드 */
        case 'media': {
            /* rowSpan 기반 명시적 높이 계산 */
            const mediaRowSpan = (field as unknown as { rowSpan?: number }).rowSpan ?? 2;
            const mediaHeightPx = mediaRowSpan * ROW_HEIGHT - (field.label ? 44 : 24);
            const mediaHeight = `${mediaHeightPx}px`;

            /* 기능용 확장자 배열 — accept 문자열 생성에 사용 (FILE_TYPE_PRESETS 고정) */
            const imgExts  = FILE_TYPE_PRESETS.image.split(',');
            const vidExts  = FILE_TYPE_PRESETS.video.split(',');
            const imgMaxMB = field.mediaImageMaxSizeMB ?? 5;
            const vidMaxMB = field.mediaVideoMaxSizeMB ?? 20;
            /* UI 안내 텍스트용 레이블 */
            const imgLabel = FILE_TYPE_LABELS.image;
            const vidLabel = FILE_TYPE_LABELS.video;

            /* 확장자 배열 → accept 문자열 변환 (점(.) 없는 항목에도 점 보장) */
            const toAccept = (exts: string[]) =>
                exts.map(e => e.startsWith('.') ? e : '.' + e).join(',');

            /**
             * 파일명으로 이미지 여부 판별
             * @param name  파일명 (확장자 포함)
             * @param exts  허용 이미지 확장자 배열 (예: ['.jpg', '.png'])
             */
            const isImageFile = (name: string, exts: string[]): boolean => {
                const ext = '.' + (name.split('.').pop() ?? '').toLowerCase();
                return exts.map(e => e.toLowerCase()).includes(ext);
            };

            /* 신규 파일 목록 */
            const mediaFiles = fileList ?? [];
            /* 기존 저장 파일 (최대 1개) */
            const existingMedia = existingFileMeta?.[0] ?? null;
            const hasFile = mediaFiles.length > 0 || !!existingMedia;

            /* preview 또는 live 빈 상태 공통 UI */
            const mediaPlaceholder = (
                <div className="flex flex-col items-center justify-center gap-1.5 text-slate-400">
                    {/* 이미지·동영상 아이콘 나란히 */}
                    <div className="flex items-center gap-3">
                        {/* 사진 아이콘 */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3 17.25V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v9.75M8.25 12a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                        </svg>
                        {/* 동영상 아이콘 */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                    </div>
                    <span className="text-xs font-medium">미디어 업로드</span>
                    {/* 형식·용량 안내 텍스트 */}
                    <div className="text-[10px] text-center leading-relaxed">
                        <p>이미지 — {imgLabel} · 최대 {imgMaxMB}MB</p>
                        <p>동영상 — {vidLabel} · 최대 {vidMaxMB}MB</p>
                    </div>
                </div>
            );

            /* preview: pointer-events-none + 동일 UI */
            if (isPreview) {
                return (
                    <div
                        style={{ height: mediaHeight }}
                        className="flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden pointer-events-none"
                    >
                        {existingMedia ? (
                            /* 기존 저장 파일 표시 */
                            <div className="flex-1 relative overflow-hidden">
                                {isImageFile(existingMedia.origName, imgExts) ? (
                                    /* 이미지: blob URL 있으면 미리보기, 로딩 중이면 아이콘 */
                                    imgBlobUrls?.[existingMedia.id]
                                        ? <img src={imgBlobUrls[existingMedia.id]} alt={existingMedia.origName} className="w-full h-full object-contain" />
                                        : <div className="w-full h-full flex items-center justify-center bg-slate-50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>
                                ) : (
                                    /* 동영상: blob URL 있으면 video 재생, 로딩 중이면 아이콘 */
                                    imgBlobUrls?.[existingMedia.id]
                                        ? <video src={imgBlobUrls[existingMedia.id]} controls playsInline preload="auto" style={{ width: '100%', height: '100%', display: 'block' }} />
                                        : <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500">
                                            <Film className="w-6 h-6 text-slate-300" />
                                            <span className="text-xs font-medium truncate max-w-full px-4">{existingMedia.origName}</span>
                                            <span className="text-[10px] text-slate-400">{fmtSize(existingMedia.fileSize)}</span>
                                          </div>
                                )}
                            </div>
                        ) : hasFile ? (
                            /* preview에서 신규 파일이 있는 경우: 파일명 표시 */
                            <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-hidden">
                                {mediaFiles.map((file, idx) => {
                                    const isImg = isImageFile(file.name, imgExts);
                                    return (
                                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                            {isImg
                                                ? <ImageIcon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                                : <Film className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                                            }
                                            <span className="text-slate-700 truncate flex-1">{file.name}</span>
                                            <span className="text-slate-400 flex-shrink-0">{fmtSize(file.size)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            /* preview 빈 상태 */
                            <div className="flex-1 flex flex-col items-center justify-center">
                                {mediaPlaceholder}
                            </div>
                        )}
                    </div>
                );
            }

            /* live 모드 */
            const canAdd = !isReadOnly && mediaFiles.length === 0 && !existingMedia;
            const mediaAccept = toAccept([...imgExts, ...vidExts]);

            /* 파일 선택 처리 — 확장자 체크 + 이미지/동영상 크기 개별 검증 */
            const handleMediaSelect = (selected: File[]) => {
                const { valid, rejected } = filterByAccept(selected, mediaAccept);
                if (rejected.length > 0) alert(`허용되지 않는 파일 형식입니다.\n${rejected.join('\n')}`);
                if (valid.length === 0) return;

                const file = valid[0];
                const isImg = isImageFile(file.name, imgExts);
                const maxMB = isImg ? imgMaxMB : vidMaxMB;
                if (file.size > maxMB * 1024 * 1024) {
                    toast.warning(`${isImg ? '이미지' : '동영상'} 파일은 최대 ${maxMB}MB까지 업로드 가능합니다.`);
                    return;
                }
                onFileChange?.([file]);
            };

            /* live 빈 상태 */
            if (!hasFile) {
                return (
                    <div
                        style={{ height: mediaHeight }}
                        className={`flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden${isReadOnly ? ' opacity-75' : ''}`}
                        onDragOver={canAdd ? e => e.preventDefault() : undefined}
                        onDrop={canAdd ? e => { e.preventDefault(); const files = Array.from(e.dataTransfer.files); if (files.length > 0) handleMediaSelect(files); } : undefined}
                    >
                        {canAdd ? (
                            <FileInput
                                accept={mediaAccept}
                                multiple={false}
                                onChange={handleMediaSelect}
                                renderTrigger={inputRef => (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => inputRef.current?.click()}
                                        onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
                                        className="flex-1 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 transition-all"
                                    >
                                        {mediaPlaceholder}
                                    </div>
                                )}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center pointer-events-none">
                                {mediaPlaceholder}
                            </div>
                        )}
                    </div>
                );
            }

            /* live 파일 있는 상태 — 기존 파일 우선, 없으면 신규 파일 */
            if (existingMedia) {
                /* 기존 저장 파일 표시 — origName 확장자로 이미지/동영상 판별 */
                const existingIsImg = isImageFile(existingMedia.origName, imgExts);
                const existingBlobUrl = imgBlobUrls?.[existingMedia.id];
                return (
                    <div
                        style={{ height: mediaHeight, isolation: 'isolate' }}
                        className="flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden"
                    >
                        <div className="flex-1 relative overflow-hidden">
                            {existingIsImg ? (
                                existingBlobUrl
                                    ? /* 이미지: blob URL 미리보기 */
                                      <img src={existingBlobUrl} alt={existingMedia.origName} className="w-full h-full object-contain" />
                                    : /* 이미지 blob URL 로딩 중: 아이콘 표시 */
                                      <div className="w-full h-full flex items-center justify-center bg-slate-50"><ImageIcon className="w-6 h-6 text-slate-300" /></div>
                            ) : (
                                existingBlobUrl
                                    ? /* 동영상: blob URL로 video 재생 */
                                      <video src={existingBlobUrl} controls playsInline preload="auto" style={{ width: '100%', height: '100%', display: 'block' }} />
                                    : /* 동영상 blob URL 로딩 중: 아이콘 표시 */
                                      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-500">
                                          <Film className="w-6 h-6 text-slate-300" />
                                          <span className="text-[10px] text-slate-400">로딩 중...</span>
                                      </div>
                            )}
                            {/* 기존 파일 제거 버튼 */}
                            {!isReadOnly && (
                                <button
                                    type="button"
                                    onClick={() => onRemoveExisting?.(existingMedia.id)}
                                    className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                                >
                                    <X className="w-3 h-3 text-white" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            }

            /* live 신규 파일 선택 후 — 이미지면 img 미리보기, 동영상이면 아이콘+파일명 */
            const selectedFile = mediaFiles[0];
            const selectedIsImg = isImageFile(selectedFile.name, imgExts);

            return (
                <div
                    style={{ height: mediaHeight }}
                    className="flex flex-col border border-dashed border-slate-200 rounded-md overflow-hidden"
                >
                    <div className="flex-1 relative overflow-hidden">
                        {selectedIsImg ? (
                            /* 이미지 미리보기 */
                            <FileImagePreview
                                file={selectedFile}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            /* 동영상: 비디오 플레이어 미리보기 */
                            <FileVideoPreview file={selectedFile} cellHeight={mediaHeightPx} />
                        )}
                        {/* 신규 파일 제거 버튼 */}
                        {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => onFileChange?.([])}
                                className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        )}
                    </div>
                </div>
            );
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

        /* ── color ── Preset 원형 버튼형 색상 선택 */
        case 'color': {
            /* options 배열이 HEX 색상 목록 */
            const colorOptions = field.options ?? [];
            const selectedColor = value ?? '';
            return (
                <ColorPresetSelector
                    colors={colorOptions}
                    selectedColor={selectedColor}
                    disabled={isDisabled}
                    onChange={color => onChange?.(color)}
                />
            );
        }

        /* ── time ── */
        case 'time':
            return (
                <input
                    type="time"
                    disabled={isDisabled}
                    readOnly={isReadOnly}
                    className={`${inputCls}${readonlyCls}`}
                    value={value}
                    step={field.timeStep ? field.timeStep * 60 : undefined}
                    onChange={isReadOnly ? undefined : e => onChange?.(e.target.value)}
                />
            );

        /* ── hidden ── 화면에 렌더링하지 않음 — 저장 시 defaultValue로 자동 포함 */
        case 'hidden':
            return null;

        /* ── message-key-select ── */
        case 'message-key-select':
            return (
                <MessageKeySelector
                    value={value}
                    onChange={v => onChange?.(v)}
                    disabled={isDisabled}
                />
            );

        /* ── category ── 카테고리 계층 검색 (CategorySearchField 컴포넌트에 위임) */
        case 'category':
            return (
                <CategorySearchField
                    mode={mode}
                    field={field}
                    value={value}
                    onChange={onChange}
                    isDisabled={isDisabled}
                />
            );

        /* ── dateRangeStatus ── 날짜 범위 상태 필터 (이전/포함/이후 선택) */
        case 'dateRangeStatus': {
            /* 다국어 키 우선, 없으면 직접 텍스트, 없으면 기본값 */
            const beforeLabel  = field.beforeTextMsgKey  ? t(field.beforeTextMsgKey)  : (field.beforeText  || '예정');
            const inRangeLabel = field.inRangeTextMsgKey ? t(field.inRangeTextMsgKey) : (field.inRangeText || '진행중');
            const afterLabel   = field.afterTextMsgKey   ? t(field.afterTextMsgKey)   : (field.afterText   || '종료');
            /* select 방식 */
            if (!field.statusDisplayStyle || field.statusDisplayStyle === 'select') {
                return (
                    <div className="relative">
                        <select
                            disabled={isDisabled}
                            className={selectCls}
                            value={isPreview ? '' : value}
                            onChange={isPreview ? undefined : e => onChange?.(e.target.value)}
                        >
                            <option value="">전체</option>
                            <option value="before">{beforeLabel}</option>
                            <option value="in_range">{inRangeLabel}</option>
                            <option value="after">{afterLabel}</option>
                        </select>
                        <SelectArrow />
                    </div>
                );
            }
            /* radio 방식 */
            const statusOpts: { label: string; val: string }[] = [
                { label: '전체',       val: '' },
                { label: beforeLabel,  val: 'before' },
                { label: inRangeLabel, val: 'in_range' },
                { label: afterLabel,   val: 'after' },
            ];
            return (
                <div className="flex items-center gap-4 py-2">
                    {statusOpts.map(opt => (
                        <label key={opt.val} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default' : 'cursor-pointer'}`}>
                            <input
                                type="radio"
                                name={`${uid}-field-${field.id}`}
                                disabled={isDisabled}
                                value={opt.val}
                                checked={!isPreview && value === opt.val}
                                onChange={isPreview ? undefined : () => onChange?.(opt.val)}
                                className="w-4 h-4 cursor-pointer"
                            />
                            <span className="text-sm text-slate-700">{opt.label}</span>
                        </label>
                    ))}
                </div>
            );
        }

        default:
            return null;
    }
}
