'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Check, X, Search, Pencil, RotateCcw } from 'lucide-react';
import { useCodeStore, CodeDetail } from '@/store/use-code-store';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/use-i18n';
import { MessageKeySelector } from '@/components/i18n/message-key-selector';

/* 기타 필드 목록 */
const EXTRAS = ['extra1', 'extra2', 'extra3', 'extra4', 'extra5'] as const;
type ExtraKey = typeof EXTRAS[number];

/* 행별 편집 상태 타입 */
type EditRow = {
    code: string;
    name: string;
    nameMsgKey: string;
    sortOrder: number;
    active: boolean;
    extras: Record<ExtraKey, string>;
};

export function CodeDetailTable({ groupId }: { groupId: number }) {
    const { selectedGroup, addDetail, updateDetail, deleteDetail } = useCodeStore();
    const { t } = useI18n();
    const details = selectedGroup?.details || [];

    /* t()를 클로저로 활용하는 validation 함수 */
    const CODE_REGEX = /^[A-Z0-9_]{1,30}$/;
    const XSS_CHARS = /[<>"']/;

    const validateCode = (v: string): string => {
        if (!v.trim()) return t('validation.code.code.required');
        if (!CODE_REGEX.test(v.trim())) return t('validation.code.code.format');
        return '';
    };
    const validateName = (v: string): string => {
        if (!v.trim()) return t('validation.code.codeName.required');
        if (XSS_CHARS.test(v)) return t('validation.xss');
        return '';
    };

    /* 인라인 추가 */
    const [isAdding, setIsAdding] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newNameMsgKey, setNewNameMsgKey] = useState('');
    const [newSort, setNewSort] = useState(details.length + 1);
    const [newExtras, setNewExtras] = useState<Record<ExtraKey, string>>({ extra1: '', extra2: '', extra3: '', extra4: '', extra5: '' });
    const [addCodeErr, setAddCodeErr] = useState('');
    const [addNameErr, setAddNameErr] = useState('');

    /* 다중 인라인 편집 — Map<id, EditRow> */
    const [editingRows, setEditingRows] = useState<Map<number, EditRow>>(new Map());

    /* 토글 중인 코드 ID (중복 클릭 방지) */
    const [togglingId, setTogglingId] = useState<number | null>(null);

    /* 코드 검색 필터 */
    const [search, setSearch] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');

    const handleSearch = () => setAppliedSearch(search);
    const handleReset = () => { setSearch(''); setAppliedSearch(''); };

    const filtered = details.filter(d =>
        appliedSearch === '' ||
        d.code.includes(appliedSearch.toUpperCase()) ||
        d.name.toLowerCase().includes(appliedSearch.toLowerCase())
    );

    /* ── 편집 Map 헬퍼 ── */
    const startEdit = (d: CodeDetail) => {
        if (editingRows.has(d.id)) return;
        setEditingRows(prev => new Map(prev).set(d.id, {
            code: d.code,
            name: d.name,
            nameMsgKey: d.nameMsgKey || '',
            sortOrder: d.sortOrder,
            active: d.active,
            extras: { extra1: d.extra1 || '', extra2: d.extra2 || '', extra3: d.extra3 || '', extra4: d.extra4 || '', extra5: d.extra5 || '' },
        }));
    };

    const cancelEdit = (id: number) => {
        setEditingRows(prev => { const m = new Map(prev); m.delete(id); return m; });
    };

    const setEditField = (id: number, field: keyof Omit<EditRow, 'extras'>, value: string | number) => {
        setEditingRows(prev => {
            const row = prev.get(id);
            if (!row) return prev;
            return new Map(prev).set(id, { ...row, [field]: value });
        });
    };

    const setEditExtra = (id: number, key: ExtraKey, value: string) => {
        setEditingRows(prev => {
            const row = prev.get(id);
            if (!row) return prev;
            return new Map(prev).set(id, { ...row, extras: { ...row.extras, [key]: value } });
        });
    };

    /* ── 추가 ── */
    const handleAdd = async () => {
        const ce = validateCode(newCode);
        setAddCodeErr(ce);
        if (!newNameMsgKey) { setAddNameErr(t('validation.code.codeName.required')); return; }
        if (ce) { toast.error(ce); return; }
        setAddNameErr('');

        if (details.some(d => d.code === newCode.trim().toUpperCase())) {
            setAddCodeErr(t('code.detail.duplicate'));
            return;
        }

        try {
            await addDetail(groupId, {
                code: newCode.trim().toUpperCase(), name: '', nameMsgKey: newNameMsgKey,
                sortOrder: newSort, active: true, ...newExtras,
            });
            toast.success(t('code.detail.added'));
            setNewCode(''); setNewNameMsgKey(''); setNewSort(details.length + 2);
            setNewExtras({ extra1: '', extra2: '', extra3: '', extra4: '', extra5: '' });
            setAddCodeErr(''); setAddNameErr(''); setIsAdding(false);
        } catch { /* store에서 토스트 처리 */ }
    };

    /* ── 편집 저장 ── */
    const handleEditSave = async (detailId: number) => {
        const row = editingRows.get(detailId);
        if (!row) return;

        const ce = validateCode(row.code);
        if (ce) { toast.error(ce); return; }
        if (!row.nameMsgKey) { toast.error(t('validation.code.codeName.required')); return; }

        if (details.some(d => d.id !== detailId && d.code === row.code.trim().toUpperCase())) {
            toast.error(t('code.detail.duplicate'));
            return;
        }

        try {
            await updateDetail(groupId, detailId, {
                code: row.code.trim().toUpperCase(), name: '', nameMsgKey: row.nameMsgKey,
                sortOrder: row.sortOrder, active: row.active, ...row.extras,
            });
            toast.success(t('code.detail.saved'));
            cancelEdit(detailId);
        } catch { /* store에서 토스트 처리 */ }
    };

    /* ── 삭제 ── */
    const handleDelete = async (detailId: number, codeName: string) => {
        if (!confirm(`'${codeName}' 코드를 삭제하시겠습니까?`)) return;
        try {
            await deleteDetail(groupId, detailId);
            cancelEdit(detailId);
            toast.success(t('code.detail.deleted'));
        } catch { /* store에서 토스트 처리 */ }
    };

    /* ── 사용여부 토글 ── */
    const handleToggleActive = async (d: CodeDetail) => {
        if (togglingId) return;
        setTogglingId(d.id);
        try {
            await updateDetail(groupId, d.id, {
                code: d.code, name: d.name, sortOrder: d.sortOrder, active: !d.active,
                extra1: d.extra1, extra2: d.extra2, extra3: d.extra3, extra4: d.extra4, extra5: d.extra5,
            });
        } catch {
            toast.error(t('code.detail.toggleError'));
        } finally {
            setTogglingId(null);
        }
    };

    /* 공통 input 스타일 */
    const inputCls = 'w-full border border-slate-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-slate-900';

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-slate-700 shrink-0">
                    {t('code.title.detail')}
                    <span className="ml-1.5 text-slate-400 font-normal">{details.length}개</span>
                </h3>
                {/* 검색 영역 */}
                <div className="flex-1 flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-1.5">
                    <div className="flex-1 flex items-center gap-2">
                        <label className="text-xs font-medium text-slate-600 shrink-0">{t('code.title.detail')}</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
                            placeholder={t('code.placeholder.codeSearch')}
                            className="flex-1 border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                        />
                    </div>
                    <button
                        onClick={handleReset}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 text-xs font-medium rounded-md hover:bg-slate-50 transition-all"
                    >
                        <RotateCcw className="w-3 h-3" /> {t('common.btn.reset')}
                    </button>
                    <button
                        onClick={handleSearch}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-md shadow-sm transition-all"
                    >
                        <Search className="w-3 h-3" /> {t('common.btn.search')}
                    </button>
                </div>
                {/* 코드 추가 버튼 */}
                {!isAdding && (
                    <button
                        onClick={() => { setIsAdding(true); setNewSort(details.length + 1); }}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-all"
                    >
                        <Plus className="w-3 h-3" />{t('common.btn.add')}
                    </button>
                )}
            </div>

            {/* 테이블 — 가로 스크롤 허용 */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-left w-[120px]">{t('common.label.code')}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-left w-[220px]">{t('common.label.codeName')}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[50px]">{t('common.label.sort')}</th>
                            {EXTRAS.map((_, i) => (
                                <th key={i} className="px-2 py-2 text-[11px] font-semibold text-slate-600 text-left w-[90px]">{`${t('common.label.extra')}${i + 1}`}</th>
                            ))}
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[50px]">{t('common.label.isActive')}</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[60px]">{t('common.label.manage')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 인라인 추가 행 — 테이블 최상단 */}
                        {isAdding && (
                            <tr className="bg-blue-50/50 border-b border-slate-100">
                                <td className="px-2 py-1.5">
                                    <input type="text" value={newCode}
                                        onChange={e => { setNewCode(e.target.value.toUpperCase()); if (addCodeErr) setAddCodeErr(''); }}
                                        placeholder="CODE"
                                        className={`${inputCls} font-mono ${addCodeErr ? 'border-red-400' : ''}`}
                                        autoFocus />
                                    {addCodeErr && <p className="text-[9px] text-red-500 mt-0.5">{addCodeErr}</p>}
                                </td>
                                <td className="px-2 py-1.5">
                                    <MessageKeySelector
                                        value={newNameMsgKey}
                                        onChange={v => { setNewNameMsgKey(v); if (addNameErr) setAddNameErr(''); }}
                                        resourceType={undefined}
                                    />
                                    {addNameErr && <p className="text-[9px] text-red-500 mt-0.5">{addNameErr}</p>}
                                </td>
                                <td className="px-2 py-1.5">
                                    <input type="number" value={newSort}
                                        onChange={e => setNewSort(Number(e.target.value))}
                                        className={`${inputCls} text-center`} />
                                </td>
                                {EXTRAS.map(key => (
                                    <td key={key} className="px-2 py-1.5">
                                        <input type="text" value={newExtras[key]}
                                            onChange={e => setNewExtras(prev => ({ ...prev, [key]: e.target.value }))}
                                            className={inputCls} />
                                    </td>
                                ))}
                                <td className="px-2 py-1.5 text-center">
                                    <span className="text-[11px] text-emerald-600">{t('common.status.active')}</span>
                                </td>
                                <td className="px-2 py-1.5 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                        <button onClick={handleAdd} className="p-1 rounded text-emerald-500 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
                                        <button onClick={() => { setIsAdding(false); setAddCodeErr(''); setAddNameErr(''); }} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                                    </div>
                                </td>
                            </tr>
                        )}

                        {filtered.map(d => {
                            const editing = editingRows.get(d.id);
                            const isEditing = !!editing;

                            return (
                                <tr key={d.id} className={`border-b border-slate-100 ${isEditing ? 'bg-amber-50/50' : 'hover:bg-slate-50/50'}`}>
                                    {isEditing ? (
                                        /* 편집 모드 */
                                        <>
                                            <td className="px-2 py-1.5">
                                                <input type="text" value={editing.code}
                                                    onChange={e => setEditField(d.id, 'code', e.target.value.toUpperCase())}
                                                    onKeyDown={e => { if (e.key === 'Escape') cancelEdit(d.id); }}
                                                    className={`${inputCls} font-mono`} />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <MessageKeySelector
                                                    value={editing.nameMsgKey}
                                                    onChange={v => setEditingRows(prev => {
                                                        const row = prev.get(d.id);
                                                        if (!row) return prev;
                                                        return new Map(prev).set(d.id, { ...row, nameMsgKey: v });
                                                    })}
                                                    resourceType={undefined}
                                                />
                                            </td>
                                            <td className="px-2 py-1.5">
                                                <input type="number" value={editing.sortOrder}
                                                    onChange={e => setEditField(d.id, 'sortOrder', Number(e.target.value))}
                                                    className={`${inputCls} text-center`} />
                                            </td>
                                            {EXTRAS.map(key => (
                                                <td key={key} className="px-2 py-1.5">
                                                    <input type="text" value={editing.extras[key]}
                                                        onChange={e => setEditExtra(d.id, key, e.target.value)}
                                                        className={inputCls} />
                                                </td>
                                            ))}
                                            <td className="px-2 py-1.5 text-center">
                                                <select
                                                    value={editing.active ? 'Y' : 'N'}
                                                    onChange={e => setEditingRows(prev => {
                                                        const row = prev.get(d.id);
                                                        if (!row) return prev;
                                                        return new Map(prev).set(d.id, { ...row, active: e.target.value === 'Y' });
                                                    })}
                                                    className="w-full border border-slate-300 rounded px-1 py-1 text-xs focus:outline-none focus:border-slate-900"
                                                >
                                                    <option value="Y">{t('common.status.active')}</option>
                                                    <option value="N">{t('common.status.inactive')}</option>
                                                </select>
                                            </td>
                                            <td className="px-2 py-1.5 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => handleEditSave(d.id)} className="p-1 rounded text-emerald-500 hover:bg-emerald-50"><Check className="w-3.5 h-3.5" /></button>
                                                    <button onClick={() => cancelEdit(d.id)} className="p-1 rounded text-slate-400 hover:bg-slate-100"><X className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        /* 보기 모드 */
                                        <>
                                            <td className="px-3 py-2 text-xs font-mono text-slate-700">{d.code}</td>
                                            <td className="px-3 py-2 text-xs text-slate-700">
                                                {d.nameMsgKey ? t(d.nameMsgKey) : d.name}
                                            </td>
                                            <td className="px-3 py-2 text-xs text-slate-500 text-center">{d.sortOrder}</td>
                                            {EXTRAS.map(key => (
                                                <td key={key} className="px-2 py-2 text-xs text-slate-500 truncate max-w-[90px]">{d[key] || '-'}</td>
                                            ))}
                                            <td className="px-3 py-2 text-center">
                                                <button onClick={() => handleToggleActive(d)} disabled={togglingId === d.id}
                                                    className={`text-[11px] font-medium px-1.5 py-0.5 rounded transition-all ${
                                                        togglingId === d.id ? 'opacity-50 cursor-wait' :
                                                        d.active ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100' : 'text-slate-400 bg-slate-50 hover:bg-slate-100'
                                                    }`}>
                                                    {d.active ? t('common.status.active') : t('common.status.inactive')}
                                                </button>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <button onClick={() => startEdit(d)} className="p-1 rounded text-slate-400 hover:bg-slate-100">
                                                        <Pencil className="w-3 h-3" />
                                                    </button>
                                                    <button onClick={() => handleDelete(d.id, d.name)} className="p-1 rounded text-slate-400 hover:bg-red-50 hover:text-red-500">
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
