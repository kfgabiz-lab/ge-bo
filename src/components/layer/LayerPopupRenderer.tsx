'use client';

/**
 * 레이어 팝업 렌더러
 * - slug로 BE에서 LAYER 타입 템플릿 configJson을 불러와 팝업 렌더링
 * - listSlug + editId 조합으로 등록(POST) / 수정(PUT) API 자동 호출
 * - initialData의 키는 layer 필드의 fieldKey와 매핑되어 자동 채움
 * - layerButtons: configJson에 없으면 기본 [닫기, 저장] 버튼 사용
 * @example
 * <LayerPopupRenderer
 *   open={open} onClose={() => setOpen(false)}
 *   slug="user-form" listSlug="user-list"
 *   editId={null} onSaved={() => fetchData(0)} />
 */

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useCodeStore } from '@/store/useCodeStore';
import { toast } from 'sonner';

/* ── 타입 정의 (layer 빌더와 동일 구조) ── */
type LayerFieldType = 'input' | 'select' | 'textarea' | 'date' | 'radio' | 'checkbox';
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

/* ── 하단 버튼 타입별 Tailwind 클래스 (동적 purge 방지) ── */
const LAYER_BTN_CLS: Record<LayerButtonType, string> = {
    primary:   'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-200 text-slate-600 bg-white hover:bg-slate-50',
    blue:      'bg-blue-500 text-white hover:bg-blue-600',
    success:   'bg-emerald-500 text-white hover:bg-emerald-600',
    danger:    'bg-red-500 text-white hover:bg-red-600',
};

/* configJson에 layerButtons 없을 때 기본 버튼 */
const DEFAULT_LAYER_BUTTONS: LayerButtonConfig[] = [
    { id: 'lb-close', label: '닫기', type: 'secondary', action: 'close' },
    { id: 'lb-save',  label: '저장', type: 'primary',   action: 'save'  },
];

/* ── layerWidth → Tailwind 클래스 (동적 클래스 purge 방지) ── */
const WIDTH_CLS: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
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

/* ── Props ── */
interface LayerPopupRendererProps {
    open: boolean;
    onClose: () => void;
    /** LAYER 타입 템플릿의 slug */
    slug: string;
    /** 행 데이터 — fieldKey 기준으로 필드에 자동 채움 */
    initialData?: Record<string, unknown>;
    /** 데이터 저장 대상 LIST 페이지 slug (없으면 저장 API 호출 안 함) */
    listSlug?: string;
    /** 수정 모드 데이터 ID (없으면 신규 등록) */
    editId?: number | null;
    /** 저장/수정 완료 후 콜백 (목록 새로고침용) */
    onSaved?: () => void;
}

export default function LayerPopupRenderer({
    open, onClose, slug, initialData = {}, listSlug, editId, onSaved,
}: LayerPopupRendererProps) {
    const [config, setConfig] = useState<LayerConfig | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    /* 팝업 내 필드 값 */
    const [values, setValues] = useState<Record<string, string>>({});
    const { groups: codeGroups } = useCodeStore();

    /* open=true 또는 slug 변경 시 템플릿 로딩 */
    useEffect(() => {
        if (!open || !slug) return;
        setLoading(true);
        setError(null);
        setConfig(null);
        setSaving(false);

        api.get(`/page-templates/by-slug/${slug}`)
            .then(res => {
                const cfg: LayerConfig = JSON.parse(res.data.configJson);
                setConfig(cfg);

                /* initialData → fieldKey 기준으로 필드 초기값 설정 */
                const init: Record<string, string> = {};
                cfg.fieldRows.flatMap(r => r.fields).forEach(f => {
                    const key = f.fieldKey || f.label;
                    if (initialData[key] !== undefined) {
                        init[f.id] = String(initialData[key]);
                    }
                });
                setValues(init);
            })
            .catch(() => setError('팝업 설정을 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [open, slug]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!open) return null;

    const updateValue = (id: string, val: string) =>
        setValues(prev => ({ ...prev, [id]: val }));

    /** 저장 처리 — required 필드 검사 후 fieldKey 기준으로 dataJson 구성, POST/PUT API 호출 */
    const handleSave = async () => {
        if (!listSlug) return;

        /* required 필드 빈값 검사 */
        const allFields = config?.fieldRows.flatMap(r => r.fields) ?? [];
        const emptyRequired = allFields.find(f => f.required && !(values[f.id] || '').trim());
        if (emptyRequired) {
            toast.warning(`'${emptyRequired.label}' 항목은 필수 입력입니다.`);
            return;
        }

        setSaving(true);
        try {
            /* 각 필드의 fieldKey(없으면 label)를 dataJson 키로 사용 */
            const dataJson: Record<string, unknown> = {};
            config?.fieldRows.flatMap(r => r.fields).forEach(f => {
                const key = f.fieldKey || f.label;
                dataJson[key] = values[f.id] ?? '';
            });

            if (editId) {
                await api.put(`/page-data/${listSlug}/${editId}`, { dataJson });
                toast.success('수정되었습니다.');
            } else {
                await api.post(`/page-data/${listSlug}`, { dataJson });
                toast.success('저장되었습니다.');
            }
            onSaved?.();
            onClose();
        } catch {
            toast.error('저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    /* 단일 필드 렌더링 */
    const renderField = (f: LayerFieldConfig) => {
        const val = values[f.id] || '';
        const opts = f.codeGroupCode
            ? (codeGroups.find(g => g.groupCode === f.codeGroupCode)
                ?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) ?? [])
            : (f.options ?? []);

        /* readonly 공통 클래스 */
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
                                <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" value={value} checked={isChecked} onChange={() => {
                                        const next = isChecked ? selected.filter(v => v !== value) : [...selected, value];
                                        updateValue(f.id, next.join(','));
                                    }} className="w-4 h-4 rounded cursor-pointer" />
                                    <span className="text-sm text-slate-700">{text}</span>
                                </label>
                            );
                        })}
                    </div>
                );
            }
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

    /* 하단 버튼 — layerButtons 기반 (없으면 기본 [닫기, 저장]) */
    const activeButtons = config?.layerButtons ?? DEFAULT_LAYER_BUTTONS;
    const footerButtons = (
        <>
            {activeButtons.map(btn => {
                const handleClick =
                    btn.action === 'close' ? onClose :
                    btn.action === 'save'  ? handleSave :
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
