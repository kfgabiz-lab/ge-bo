'use client';

/**
 * 레이어 팝업 렌더러
 * - slug로 BE에서 LAYER 타입 템플릿 configJson을 불러와 팝업 렌더링
 * - listSlug + editId 조합으로 등록(POST) / 수정(PUT) API 자동 호출
 * - initialData의 키는 layer 필드의 fieldKey와 매핑되어 자동 채움
 * - layerButtons: configJson에 없으면 기본 [닫기, 저장] 버튼 사용
 * - file 타입: 업로드 → page_data 저장 → link API 순서로 처리
 * @example
 * <LayerPopupRenderer
 *   open={open} onClose={() => setOpen(false)}
 *   slug="user-form" listSlug="user-list"
 *   editId={null} onSaved={() => fetchData(0)} />
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle, Download } from 'lucide-react';
import api from '@/lib/api';
import { useCodeStore } from '@/store/useCodeStore';
import { toast } from 'sonner';
import WysiwygEditor from '@/components/common/WysiwygEditor';

/* ── 파일 업로드 API는 /api/v1이 아닌 /api 경로 사용 ── */
const FILE_API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002/api/v1').replace(/\/v1$/, '');

/* ── 파일 허용 타입 프리셋 ── */
const FILE_TYPE_PRESETS = {
    doc: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.hwp',
    image: '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp',
} as const;

/**
 * 파일 타입 모드에 따라 input[accept] 문자열 생성
 * @param mode     'doc' | 'image' | 'custom' | ''
 * @param customExts 커스텀 확장자 배열 (예: ['.zip', '.rar'])
 */
function getAcceptStr(mode: string, customExts: string[]): string {
    if (mode === 'doc') return FILE_TYPE_PRESETS.doc;
    if (mode === 'image') return FILE_TYPE_PRESETS.image;
    if (mode === 'custom') return customExts.join(',');
    return '';
}

/* ── 타입 정의 (layer 빌더와 동일 구조) ── */
type LayerFieldType = 'input' | 'select' | 'textarea' | 'editor' | 'date' | 'radio' | 'checkbox' | 'file' | 'image' | 'video';
type LayerButtonType = 'primary' | 'secondary' | 'blue' | 'success' | 'danger';
type LayerButtonAction = 'close' | 'save' | 'custom';

interface LayerFieldConfig {
    id: string;
    type: LayerFieldType;
    label: string;
    fieldKey?: string;
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
    required?: boolean;
    readonly?: boolean;
    options?: string[];
    codeGroupCode?: string;
    /* 파일 업로드 전용 필드 */
    maxFileCount?: number;
    maxFileSizeMB?: number;
    maxTotalSizeMB?: number;
    fileTypeMode?: 'doc' | 'image' | 'custom' | '';
    allowedExtensions?: string[];
}

interface LayerRowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;
    fields: LayerFieldConfig[];
}

interface LayerButtonConfig {
    id: string;
    label: string;
    type: LayerButtonType;
    action: LayerButtonAction;
}

interface LayerConfig {
    fieldRows: LayerRowConfig[];
    layerTitle: string;
    layerType: 'center' | 'right';
    layerWidth: 'sm' | 'md' | 'lg' | 'xl';
    layerButtons?: LayerButtonConfig[];
}

/* ── 하단 버튼 타입별 Tailwind 클래스 ── */
const LAYER_BTN_CLS: Record<LayerButtonType, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50',
    blue: 'bg-blue-500 text-white hover:bg-blue-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
};

const DEFAULT_LAYER_BUTTONS: LayerButtonConfig[] = [
    { id: 'lb-close', label: '닫기', type: 'secondary', action: 'close' },
    { id: 'lb-save', label: '저장', type: 'primary', action: 'save' },
];

const WIDTH_CLS: Record<string, string> = {
    sm: 'max-w-sm', md: 'max-w-2xl', lg: 'max-w-3xl', xl: 'max-w-4xl',
};
const COLS_CLS: Record<number, string> = {
    1: 'grid-cols-1', 2: 'grid-cols-2',
    3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5',
};
const COL_SPAN_CLS: Record<number, string> = {
    1: 'col-span-1', 2: 'col-span-2',
    3: 'col-span-3', 4: 'col-span-4', 5: 'col-span-5',
};

const inputCls = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";

/* "텍스트:값" 형식 옵션 파싱 */
const parseOpt = (opt: string) => {
    const idx = opt.lastIndexOf(':');
    if (idx === -1) return { text: opt, value: opt };
    return { text: opt.slice(0, idx), value: opt.slice(idx + 1) };
};

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

/* ── Props ── */
interface LayerPopupRendererProps {
    open: boolean;
    onClose: () => void;
    slug: string;
    initialData?: Record<string, unknown>;
    listSlug?: string;
    editId?: number | null;
    onSaved?: () => void;
}

export default function LayerPopupRenderer({
    open, onClose, slug, initialData = {}, listSlug, editId, onSaved,
}: LayerPopupRendererProps) {
    const [config, setConfig] = useState<LayerConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    /* 일반 필드 값 (text/select/date/radio/checkbox) */
    const [values, setValues] = useState<Record<string, string>>({});
    /* 새로 선택한 파일 목록 */
    const [fileValues, setFileValues] = useState<Record<string, File[]>>({});
    /* 편집 모드에서 기존 파일 ID 목록 */
    const [existingFileIds, setExistingFileIds] = useState<Record<string, number[]>>({});
    /* 편집 모드에서 기존 파일 메타데이터 (파일명·크기 표시용) */
    const [existingFileMeta, setExistingFileMeta] = useState<Record<string, { id: number; origName: string; fileSize: number }[]>>({});
    /* 기존 이미지 필드의 blob URL 캐시 (auth 헤더 포함 다운로드 후 캐싱) */
    const [imgBlobUrls, setImgBlobUrls] = useState<Record<number, string>>({});
    /* 드래그 중인 파일 필드 ID (시각적 강조용) */
    const [dragOverId, setDragOverId] = useState<string | null>(null);

    const { groups: codeGroups } = useCodeStore();

    /* open=true 또는 slug/editId 변경 시 템플릿 로딩 */
    useEffect(() => {
        if (!open || !slug) return;
        setLoading(true);
        setError(null);
        setConfig(null);
        setSaving(false);
        setFileValues({});
        setExistingFileIds({});
        setExistingFileMeta({});

        api.get(`/page-templates/by-slug/${slug}?type=LAYER`)
            .then(async res => {
                const cfg: LayerConfig = JSON.parse(res.data.configJson);
                setConfig(cfg);

                /* 수정 모드: editId가 있으면 서버에서 기존 데이터 조회 */
                let sourceData: Record<string, unknown> = { ...initialData };
                if (editId != null && listSlug) {
                    try {
                        const editRes = await api.get(`/page-data/${listSlug}/${editId}`);
                        /* dataJson 파싱 후 initialData에 병합 (서버 데이터 우선) */
                        const parsed: Record<string, unknown> =
                            typeof editRes.data.dataJson === 'string'
                                ? JSON.parse(editRes.data.dataJson)
                                : (editRes.data.dataJson ?? {});
                        sourceData = { ...sourceData, ...parsed };
                    } catch {
                        /* 개별 조회 실패는 무시하고 빈 폼으로 열기 */
                    }
                }

                const init: Record<string, string> = {};
                const existingIds: Record<string, number[]> = {};

                cfg.fieldRows.flatMap(r => r.fields).forEach(f => {
                    const key = f.fieldKey || f.label;
                    if (f.type === 'file' || f.type === 'image') {
                        /* 파일/이미지 필드: sourceData에서 fileId 배열 추출 (편집 모드) */
                        const ids = sourceData[key];
                        if (Array.isArray(ids)) {
                            existingIds[f.id] = ids.map(Number);
                        }
                    } else {
                        /* 일반 필드: 문자열로 변환 */
                        if (sourceData[key] !== undefined) {
                            init[f.id] = String(sourceData[key]);
                        }
                    }
                });

                setValues(init);
                setExistingFileIds(existingIds);

                /* 기존 파일 메타데이터 조회 — 파일명·크기 표시용 */
                const allIds = Object.values(existingIds).flat();
                if (allIds.length > 0) {
                    const metaRes = await api.get('/page-files/meta', {
                        baseURL: FILE_API_BASE,
                        params: { ids: allIds.join(',') },
                    });
                    /* 필드별로 메타데이터 분류 */
                    const metaMap: Record<string, { id: number; origName: string; fileSize: number }[]> = {};
                    Object.entries(existingIds).forEach(([fieldId, ids]) => {
                        metaMap[fieldId] = metaRes.data.filter((m: { id: number; origName: string; fileSize: number }) =>
                            ids.includes(m.id)
                        );
                    });
                    setExistingFileMeta(metaMap);

                    /* 이미지 필드의 기존 파일 — blob URL 미리 로딩 (auth 헤더 포함) */
                    const imageFieldIds = new Set(
                        cfg.fieldRows.flatMap(r => r.fields)
                            .filter(f => f.type === 'image')
                            .map(f => f.id)
                    );
                    const imgIds = Object.entries(existingIds)
                        .filter(([fieldId]) => imageFieldIds.has(fieldId))
                        .flatMap(([, ids]) => ids);

                    if (imgIds.length > 0) {
                        const blobMap: Record<number, string> = {};
                        await Promise.all(imgIds.map(async id => {
                            try {
                                const res = await api.get(`/page-files/${id}`, {
                                    baseURL: FILE_API_BASE,
                                    responseType: 'blob',
                                });
                                blobMap[id] = URL.createObjectURL(res.data);
                            } catch {
                                /* 개별 이미지 로드 실패는 무시 */
                            }
                        }));
                        setImgBlobUrls(blobMap);
                    }
                }
            })
            .catch(() => setError('팝업 설정을 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [open, slug, editId]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    const updateValue = (id: string, val: string) =>
        setValues(prev => ({ ...prev, [id]: val }));

    /**
     * 저장 처리
     * 1단계: 파일 필드 업로드 → fileId 수집
     * 2단계: dataJson 구성 (파일 필드는 fileId 배열로 저장)
     * 3단계: page_data POST/PUT
     * 4단계: 새 파일 link API 호출
     */
    const handleSave = async () => {
        if (!listSlug) return;

        const allFields = config?.fieldRows.flatMap(r => r.fields) ?? [];

        /* required 검사 — 파일/이미지 필드는 기존+신규 합산으로 판단 */
        const emptyRequired = allFields.find(f => {
            if (!f.required) return false;
            if (f.type === 'file' || f.type === 'image') {
                return (existingFileIds[f.id]?.length || 0) + (fileValues[f.id]?.length || 0) === 0;
            }
            return !(values[f.id] || '').trim();
        });
        if (emptyRequired) {
            toast.warning(`'${emptyRequired.label}' 항목은 필수 입력입니다.`);
            return;
        }

        setSaving(true);
        try {
            /* ── 1단계: 파일/이미지 필드 업로드 ── */
            const fileFields = allFields.filter(f => f.type === 'file' || f.type === 'image');
            /* key → 저장할 fileId 배열 */
            const uploadedFileIdsMap: Record<string, number[]> = {};
            /* 이번 저장에서 새로 업로드된 fileId (link API용) */
            const newlyUploadedIds: number[] = [];

            for (const f of fileFields) {
                const key = f.fieldKey || f.label;
                const existing = existingFileIds[f.id] || [];
                const newFiles = fileValues[f.id] || [];
                const allIds: number[] = [...existing];

                for (const file of newFiles) {
                    const formData = new FormData();
                    formData.append('file', file);
                    formData.append('templateSlug', listSlug);
                    formData.append('fieldKey', key);

                    /* Axios 1.x에서 인스턴스 기본 Content-Type(application/json)이 FormData를
                     * JSON으로 직렬화하는 문제 방지 — transformRequest에서 Content-Type 헤더를 삭제해
                     * 브라우저가 multipart/form-data; boundary=...를 자동으로 설정하도록 위임 */
                    const res = await api.post('/page-files/upload', formData, {
                        baseURL: FILE_API_BASE,
                        transformRequest: (data, headers) => {
                            if (headers) headers.delete('Content-Type');
                            return data;
                        },
                    });
                    allIds.push(res.data.id);
                    newlyUploadedIds.push(res.data.id);
                }
                uploadedFileIdsMap[key] = allIds;
            }

            /* ── 2단계: dataJson 구성 ── */
            const dataJson: Record<string, unknown> = {};
            allFields.forEach(f => {
                const key = f.fieldKey || f.label;
                if (f.type === 'file' || f.type === 'image') {
                    /* 파일/이미지 필드: fileId 배열 저장 */
                    dataJson[key] = uploadedFileIdsMap[key] ?? existingFileIds[f.id] ?? [];
                } else {
                    dataJson[key] = values[f.id] ?? '';
                }
            });

            /* ── 3단계: page_data 저장 ── */
            let savedDataId: number | null = null;
            if (editId) {
                await api.put(`/page-data/${listSlug}/${editId}`, { dataJson });
                savedDataId = editId;
                toast.success('수정되었습니다.');
            } else {
                const res = await api.post(`/page-data/${listSlug}`, { dataJson });
                savedDataId = res.data.id;
                toast.success('저장되었습니다.');
            }

            /* ── 4단계: 새로 업로드된 파일에 dataId 연결 ── */
            if (newlyUploadedIds.length > 0 && savedDataId) {
                await api.patch('/page-files/link', {
                    fileIds: newlyUploadedIds,
                    dataId: savedDataId,
                }, { baseURL: FILE_API_BASE });
            }

            onSaved?.();
            onClose();
        } catch (err) {
            /* 어느 단계에서 실패했는지 콘솔에 기록 — 브라우저 개발자 도구에서 확인 */
            console.error('[LayerPopupRenderer] 저장 실패:', err);
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    /* ── 단일 필드 렌더링 ── */
    const renderField = (f: LayerFieldConfig) => {
        const val = values[f.id] || '';
        const opts = f.codeGroupCode
            ? (codeGroups.find(g => g.groupCode === f.codeGroupCode)
                ?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) ?? [])
            : (f.options ?? []);

        const roCls = f.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : '';

        switch (f.type) {
            case 'input':
                return <input type="text" placeholder={f.placeholder || '입력하세요'} className={`${inputCls} ${roCls}`} value={val} onChange={e => !f.readonly && updateValue(f.id, e.target.value)} readOnly={f.readonly} />;
            case 'textarea':
                return <textarea placeholder={f.placeholder || '입력하세요'} className={`${inputCls} resize-none ${roCls}`} rows={3} value={val} onChange={e => !f.readonly && updateValue(f.id, e.target.value)} readOnly={f.readonly} />;
            case 'date':
                return <input type="date" className={`${inputCls} ${roCls}`} value={val} onChange={e => !f.readonly && updateValue(f.id, e.target.value)} readOnly={f.readonly} />;
            case 'select':
                return (
                    <div className="relative">
                        <select className={`${inputCls} appearance-none pr-8 ${f.readonly ? roCls : 'cursor-pointer'}`} value={val} onChange={e => updateValue(f.id, e.target.value)} disabled={f.readonly}>
                            <option value="">{f.placeholder || '선택하세요'}</option>
                            {opts.map(opt => {
                                const { text, value } = parseOpt(opt);
                                return <option key={opt} value={value}>{text}</option>;
                            })}
                        </select>
                        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                    </div>
                );
            case 'radio':
                return (
                    <div className="flex items-center gap-4 pt-0.5">
                        {opts.map(opt => {
                            const { text, value } = parseOpt(opt);
                            return (
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" name={`popup-${f.id}`} value={value} checked={val === value} onChange={() => updateValue(f.id, value)} className="w-4 h-4 cursor-pointer" />
                                    <span className="text-sm text-slate-700">{text}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            case 'checkbox': {
                const selected = val.split(',').filter(Boolean);
                return (
                    <div className="flex items-center gap-4 pt-0.5">
                        {opts.map(opt => {
                            const { text, value } = parseOpt(opt);
                            const isChecked = selected.includes(value);
                            return (
                                <label key={opt} className={`flex items-center gap-2 ${f.readonly ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                                    <input type="checkbox" value={value} checked={isChecked} disabled={f.readonly} onChange={() => {
                                        if (f.readonly) return;
                                        const next = isChecked ? selected.filter(v => v !== value) : [...selected, value];
                                        updateValue(f.id, next.join(','));
                                    }} className={`w-4 h-4 rounded ${f.readonly ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                                    <span className="text-sm text-slate-700">{text}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            }
            case 'file': {
                const selectedFiles = fileValues[f.id] || [];
                const existingIds = existingFileIds[f.id] || [];
                const existingMeta = existingFileMeta[f.id] || [];
                const maxCount = f.maxFileCount ?? 1;
                const maxSizeMB = f.maxFileSizeMB ?? 10;
                const maxTotalMB = f.maxTotalSizeMB ?? 20;
                const totalCount = existingIds.length + selectedFiles.length;
                const accept = getAcceptStr(f.fileTypeMode || '', f.allowedExtensions || []);

                /* 허용 형식 텍스트 — 실제 확장자 목록으로 표시 */
                const modeLabel = (() => {
                    if (f.fileTypeMode === 'doc') return FILE_TYPE_PRESETS.doc.split(',').join(', ');
                    if (f.fileTypeMode === 'image') return FILE_TYPE_PRESETS.image.split(',').join(', ');
                    if (f.fileTypeMode === 'custom') return (f.allowedExtensions || []).join(', ') || '';
                    return '';
                })();

                /**
                 * 파일 확장자 허용 여부 검사
                 * accept 문자열이 비어있으면 전체 허용
                 */
                const isAllowedType = (file: File): boolean => {
                    if (!accept) return true;
                    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
                    return accept.split(',').includes(ext);
                };

                /* 파일 선택 핸들러 */
                const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    /* 파일 타입 검증 */
                    const wrongType = files.find(file => !isAllowedType(file));
                    if (wrongType) {
                        toast.warning(`허용되지 않는 파일 형식입니다. (${modeLabel || '전체 허용'})`);
                        e.target.value = '';
                        return;
                    }
                    /* 개당 파일 크기 검증 */
                    const overSize = files.find(file => file.size > maxSizeMB * 1024 * 1024);
                    if (overSize) {
                        toast.warning(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
                        e.target.value = '';
                        return;
                    }
                    /* 최대 파일 수 초과 방지 */
                    const canAdd = maxCount - totalCount;
                    const next = [...selectedFiles, ...files].slice(0, selectedFiles.length + canAdd);
                    setFileValues(prev => ({ ...prev, [f.id]: next }));
                    e.target.value = '';
                };

                /* 선택된 파일 제거 */
                const removeFile = (idx: number) => {
                    setFileValues(prev => ({
                        ...prev,
                        [f.id]: (prev[f.id] || []).filter((_, i) => i !== idx),
                    }));
                };

                /* 기존 파일 개별 제거 */
                const removeExisting = (id: number) => {
                    setExistingFileIds(prev => ({
                        ...prev,
                        [f.id]: (prev[f.id] || []).filter(eid => eid !== id),
                    }));
                    setExistingFileMeta(prev => ({
                        ...prev,
                        [f.id]: (prev[f.id] || []).filter(m => m.id !== id),
                    }));
                };

                /**
                 * 기존 파일 다운로드 — GET /api/page-files/{id} (스트리밍)
                 * a 태그에 blob URL을 연결해 브라우저 다운로드 처리
                 */
                const downloadFile = async (id: number, origName: string) => {
                    try {
                        const res = await api.get(`/page-files/${id}`, {
                            baseURL: FILE_API_BASE,
                            responseType: 'blob',
                        });
                        const url = URL.createObjectURL(res.data);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = origName;
                        a.click();
                        URL.revokeObjectURL(url);
                    } catch {
                        toast.error('파일 다운로드 중 오류가 발생했습니다.');
                    }
                };

                return (
                    <div className="space-y-1.5">
                        {/* 편집 모드: 기존 파일 목록 (메타데이터 있으면 파일명, 없으면 로딩 표시) */}
                        {existingIds.length > 0 && existingMeta.length === 0 && (
                            <p className="text-xs text-slate-500">기존 첨부 파일 {existingIds.length}개 (로딩 중...)</p>
                        )}
                        {existingMeta.map(meta => (
                            <div key={meta.id} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-all">
                                {/* 파일명 + 크기 세로 배치 */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-700 truncate">{meta.origName}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{(meta.fileSize / 1024 / 1024).toFixed(1)}MB</p>
                                </div>
                                {/* 다운로드 버튼 */}
                                <button
                                    type="button"
                                    onClick={() => downloadFile(meta.id, meta.origName)}
                                    title="다운로드"
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all shrink-0"
                                >
                                    <Download className="w-4 h-4" />
                                </button>
                                {/* readonly가 아닐 때만 삭제 버튼 표시 */}
                                {!f.readonly && (
                                    <button type="button" onClick={() => removeExisting(meta.id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        {/* 새로 선택한 파일 목록 — readonly일 때 숨김 */}
                        {!f.readonly && selectedFiles.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-md border border-slate-200 text-sm">
                                <span className="flex-1 truncate text-slate-700">{file.name}</span>
                                <span className="text-xs text-slate-400 shrink-0">
                                    {(file.size / 1024 / 1024).toFixed(1)}MB
                                </span>
                                <button type="button" onClick={() => removeFile(idx)}
                                    className="text-slate-400 hover:text-red-500 transition-colors shrink-0">
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                        {/* 드롭존 — readonly이거나 최대 파일 수 초과 시 숨김 */}
                        {!f.readonly && totalCount < maxCount && (
                            <label
                                className="block cursor-pointer"
                                onDragOver={e => {
                                    /* 브라우저 기본 동작(새 탭 열기 등) 막기 */
                                    e.preventDefault();
                                    setDragOverId(f.id);
                                }}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setDragOverId(null);
                                    /* 드롭된 파일을 파일 선택과 동일한 검증 로직으로 처리 */
                                    const files = Array.from(e.dataTransfer.files);
                                    /* 파일 타입 검증 */
                                    const wrongType = files.find(file => !isAllowedType(file));
                                    if (wrongType) {
                                        toast.warning(`허용되지 않는 파일 형식입니다. (${modeLabel || '전체 허용'})`);
                                        return;
                                    }
                                    /* 개당 파일 크기 검증 */
                                    const overSize = files.find(file => file.size > maxSizeMB * 1024 * 1024);
                                    if (overSize) {
                                        toast.warning(`파일 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
                                        return;
                                    }
                                    const canAdd = maxCount - totalCount;
                                    const next = [...selectedFiles, ...files].slice(0, selectedFiles.length + canAdd);
                                    setFileValues(prev => ({ ...prev, [f.id]: next }));
                                }}
                            >
                                <div className={`border-2 border-dashed rounded-lg p-3 text-center space-y-1 transition-all
                                    ${dragOverId === f.id
                                        ? 'border-slate-500 bg-slate-100'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                                    }`}>
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
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple={maxCount > 1}
                                    accept={accept || undefined}
                                    onChange={handleFileChange}
                                />
                            </label>
                        )}
                    </div>
                );
            }
            case 'image': {
                const selectedImgs = fileValues[f.id] || [];
                const existingIds = existingFileIds[f.id] || [];
                const existingMeta = existingFileMeta[f.id] || [];
                const maxCount = f.maxFileCount ?? 1;
                const maxSizeMB = f.maxFileSizeMB ?? 10;
                const totalCount = existingIds.length + selectedImgs.length;
                const imgAccept = FILE_TYPE_PRESETS.image;

                /** 이미지 확장자 허용 여부 검사 */
                const isAllowedImg = (file: File): boolean => {
                    const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
                    return imgAccept.split(',').includes(ext);
                };

                /** 이미지 선택 핸들러 */
                const handleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
                    const files = Array.from(e.target.files || []);
                    const wrongType = files.find(file => !isAllowedImg(file));
                    if (wrongType) {
                        toast.warning('이미지 파일만 업로드할 수 있습니다. (jpg, png, gif, webp, svg, bmp)');
                        e.target.value = '';
                        return;
                    }
                    const overSize = files.find(file => file.size > maxSizeMB * 1024 * 1024);
                    if (overSize) {
                        toast.warning(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`);
                        e.target.value = '';
                        return;
                    }
                    const canAdd = maxCount - totalCount;
                    const next = [...selectedImgs, ...files].slice(0, selectedImgs.length + canAdd);
                    setFileValues(prev => ({ ...prev, [f.id]: next }));
                    e.target.value = '';
                };

                /** 새 이미지 제거 */
                const removeImg = (idx: number) => {
                    setFileValues(prev => ({
                        ...prev,
                        [f.id]: (prev[f.id] || []).filter((_, i) => i !== idx),
                    }));
                };

                /** 기존 이미지 제거 */
                const removeExistingImg = (id: number) => {
                    setExistingFileIds(prev => ({ ...prev, [f.id]: (prev[f.id] || []).filter(eid => eid !== id) }));
                    setExistingFileMeta(prev => ({ ...prev, [f.id]: (prev[f.id] || []).filter(m => m.id !== id) }));
                };

                /* 이미지 확장자 파일만 표시 (doc 등 비이미지 파일 제외) */
                const IMG_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
                const imageOnlyMeta = existingMeta.filter(meta => {
                    const ext = '.' + (meta.origName.split('.').pop() ?? '').toLowerCase();
                    return IMG_EXTS.includes(ext);
                });

                return (
                    <div className="space-y-2">
                        {/* 기존 이미지 썸네일 그리드 — 이미지 확장자만, blob URL 사용 */}
                        {imageOnlyMeta.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {imageOnlyMeta.map(meta => (
                                    <div key={meta.id} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                        {imgBlobUrls[meta.id] ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={imgBlobUrls[meta.id]}
                                                alt={meta.origName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            /* blob URL 로딩 중 */
                                            <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">로딩 중...</div>
                                        )}
                                        {/* readonly가 아닐 때만 삭제 버튼 */}
                                        {!f.readonly && (
                                            <button
                                                type="button"
                                                onClick={() => removeExistingImg(meta.id)}
                                                className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* 새로 선택한 이미지 썸네일 — readonly일 때 숨김 */}
                        {!f.readonly && selectedImgs.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                                {selectedImgs.map((file, idx) => (
                                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={URL.createObjectURL(file)}
                                            alt={file.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeImg(idx)}
                                            className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* 이미지 업로드 드롭존 — readonly이거나 최대 수 초과 시 숨김 */}
                        {!f.readonly && totalCount < maxCount && (
                            <label
                                className="block cursor-pointer"
                                onDragOver={e => { e.preventDefault(); setDragOverId(f.id); }}
                                onDragLeave={() => setDragOverId(null)}
                                onDrop={e => {
                                    e.preventDefault();
                                    setDragOverId(null);
                                    const files = Array.from(e.dataTransfer.files);
                                    const wrongType = files.find(file => !isAllowedImg(file));
                                    if (wrongType) { toast.warning('이미지 파일만 업로드할 수 있습니다.'); return; }
                                    const overSize = files.find(file => file.size > maxSizeMB * 1024 * 1024);
                                    if (overSize) { toast.warning(`이미지 크기는 ${maxSizeMB}MB 이하여야 합니다.`); return; }
                                    const canAdd = maxCount - totalCount;
                                    setFileValues(prev => ({ ...prev, [f.id]: [...selectedImgs, ...files].slice(0, selectedImgs.length + canAdd) }));
                                }}
                            >
                                <div className={`border-2 border-dashed rounded-lg p-3 text-center space-y-1 transition-all
                                    ${dragOverId === f.id
                                        ? 'border-slate-500 bg-slate-100'
                                        : 'border-slate-200 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                                    }`}>
                                    <div className="flex items-center justify-center gap-1.5 text-slate-400 text-sm py-1">
                                        <span>🖼️</span>
                                        <span className="font-medium">이미지 선택</span>
                                        <span className="text-slate-300">또는 드래그 &amp; 드롭</span>
                                    </div>
                                    <p className="text-xs text-slate-400">
                                        최대 {maxCount}개 · 개당 {maxSizeMB}MB
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    multiple={maxCount > 1}
                                    accept={imgAccept}
                                    onChange={handleImgChange}
                                />
                            </label>
                        )}
                    </div>
                );
            }
            case 'video': {
                const embedUrl = toEmbedUrl(values[f.id] || '');
                const currentVal = values[f.id] || '';
                return (
                    <div className="space-y-2">
                        {/* URL 입력 — readonly일 때 비활성 */}
                        <input
                            type="text"
                            value={currentVal}
                            onChange={e => !f.readonly && updateValue(f.id, e.target.value)}
                            readOnly={f.readonly}
                            placeholder="유튜브 또는 Vimeo URL을 입력하세요"
                            className={`${inputCls} ${f.readonly ? 'bg-slate-50 text-slate-500 cursor-not-allowed' : ''}`}
                        />
                        {/* URL 파싱 성공 시 iframe 미리보기 */}
                        {embedUrl ? (
                            <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-black">
                                <iframe
                                    src={embedUrl}
                                    className="w-full h-full"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                />
                            </div>
                        ) : currentVal ? (
                            <p className="text-xs text-red-400 px-1">지원하지 않는 URL 형식입니다. (유튜브, Vimeo만 가능)</p>
                        ) : (
                            <div className="aspect-video w-full rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center">
                                <span className="text-slate-400 text-sm">▶ URL 입력 시 미리보기가 표시됩니다</span>
                            </div>
                        )}
                    </div>
                );
            }
            case 'editor':
                return (
                    <WysiwygEditor
                        initialValue={val}
                        onChange={v => updateValue(f.id, v)}
                    />
                );
            default:
                return null;
        }
    };

    /* 팝업 내용 영역 */
    const bodyContent = (
        <div className="space-y-4">
            {loading && (
                <div className="flex items-center justify-center py-12 gap-2 text-slate-400">
                    <Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">불러오는 중...</span>
                </div>
            )}
            {error && (
                <div className="flex items-center justify-center py-12 gap-2 text-red-400">
                    <AlertCircle className="w-5 h-5" /><span className="text-sm">{error}</span>
                </div>
            )}
            {!loading && !error && config?.fieldRows.map(row => (
                <div key={row.id} className={`grid gap-4 ${COLS_CLS[row.cols] || 'grid-cols-1'}`}>
                    {row.fields.map(f => (
                        <div key={f.id} className={COL_SPAN_CLS[f.colSpan] || 'col-span-1'}>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">
                                {f.label}
                                {f.required && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {renderField(f)}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

    /* 하단 버튼 */
    const activeButtons = config?.layerButtons ?? DEFAULT_LAYER_BUTTONS;
    const footerButtons = (
        <>
            {activeButtons.map(btn => {
                const handleClick =
                    btn.action === 'close' ? onClose :
                        btn.action === 'save' ? handleSave :
                            undefined;
                return (
                    <button
                        key={btn.id}
                        onClick={handleClick}
                        disabled={saving && btn.action === 'save'}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all disabled:opacity-60 ${LAYER_BTN_CLS[btn.type] || LAYER_BTN_CLS.secondary}`}
                    >
                        {saving && btn.action === 'save' ? '저장 중...' : btn.label}
                    </button>
                );
            })}
        </>
    );

    const title = config?.layerTitle || '팝업';

    /* ── center 팝업 ── */
    if (!config || config.layerType === 'center') {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={onClose} />
                <div className={`relative w-full ${WIDTH_CLS[config?.layerWidth || 'md'] || 'max-w-md'} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}>
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all"><X className="w-4 h-4 text-slate-500" /></button>
                    </div>
                    <div className="flex-1 overflow-y-auto px-6 py-5">{bodyContent}</div>
                    <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50/50 shrink-0">{footerButtons}</div>
                </div>
            </div>
        );
    }

    /* ── right 드로어 ── */
    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />
            <div className={`relative h-full ${WIDTH_CLS[config.layerWidth] || 'max-w-md'} w-full bg-white shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-base font-bold text-slate-900">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-md hover:bg-slate-100 transition-all"><X className="w-4 h-4 text-slate-500" /></button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5">{bodyContent}</div>
                <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-200 shrink-0">{footerButtons}</div>
            </div>
        </div>
    );
}
