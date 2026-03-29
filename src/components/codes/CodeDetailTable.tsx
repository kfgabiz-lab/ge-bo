'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Check, X, Search, Pencil } from 'lucide-react';
import { useCodeStore, CodeDetail } from '@/store/useCodeStore';
import { toast } from 'sonner';

/* ── Validation ── */
const CODE_REGEX = /^[A-Z0-9_]{1,30}$/;
const XSS_CHARS = /[<>"']/;

const validateCode = (v: string): string => {
    if (!v.trim()) return '코드값을 입력해주세요.';
    if (!CODE_REGEX.test(v.trim())) return '영문 대문자, 숫자, _만 사용 가능합니다.';
    return '';
};
const validateName = (v: string): string => {
    if (!v.trim()) return '코드명을 입력해주세요.';
    if (XSS_CHARS.test(v)) return '허용되지 않는 문자가 포함되어 있습니다.';
    return '';
};

/* 기타 필드 목록 */
const EXTRAS = ['extra1', 'extra2', 'extra3', 'extra4', 'extra5'] as const;
type ExtraKey = typeof EXTRAS[number];

/* 행별 편집 상태 타입 */
type EditRow = {
    code: string;
    name: string;
    sortOrder: number;
    active: boolean;
    extras: Record<ExtraKey, string>;
};

export function CodeDetailTable({ groupId }: { groupId: number }) {
    const { selectedGroup, addDetail, updateDetail, deleteDetail } = useCodeStore();
    const details = selectedGroup?.details || [];

    /* 인라인 추가 */
    const [isAdding, setIsAdding] = useState(false);
    const [newCode, setNewCode] = useState('');
    const [newName, setNewName] = useState('');
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
    const filtered = details.filter(d =>
        d.code.includes(search.toUpperCase()) ||
        d.name.toLowerCase().includes(search.toLowerCase())
    );

    /* ── 편집 Map 헬퍼 ── */
    const startEdit = (d: CodeDetail) => {
        /* 이미 편집 중이면 무시 */
        if (editingRows.has(d.id)) return;
        setEditingRows(prev => new Map(prev).set(d.id, {
            code: d.code,
            name: d.name,
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
        const ne = validateName(newName);
        setAddCodeErr(ce);
        setAddNameErr(ne);
        if (ce || ne) { toast.error(ce || ne); return; }

        if (details.some(d => d.code === newCode.trim().toUpperCase())) {
            setAddCodeErr('동일 그룹 내에 같은 코드값이 존재합니다.');
            return;
        }

        try {
            await addDetail(groupId, {
                code: newCode.trim().toUpperCase(), name: newName.trim(),
                sortOrder: newSort, active: true, ...newExtras,
            });
            toast.success('코드가 추가되었습니다.');
            setNewCode(''); setNewName(''); setNewSort(details.length + 2);
            setNewExtras({ extra1: '', extra2: '', extra3: '', extra4: '', extra5: '' });
            setAddCodeErr(''); setAddNameErr(''); setIsAdding(false);
        } catch { /* store에서 토스트 처리 */ }
    };

    /* ── 편집 저장 ── */
    const handleEditSave = async (detailId: number) => {
        const row = editingRows.get(detailId);
        if (!row) return;

        const ce = validateCode(row.code);
        const ne = validateName(row.name);
        if (ce || ne) { toast.error(ce || ne); return; }

        if (details.some(d => d.id !== detailId && d.code === row.code.trim().toUpperCase())) {
            toast.error('동일 그룹 내에 같은 코드값이 존재합니다.');
            return;
        }

        try {
            await updateDetail(groupId, detailId, {
                code: row.code.trim().toUpperCase(), name: row.name.trim(),
                sortOrder: row.sortOrder, active: row.active, ...row.extras,
            });
            toast.success('코드가 수정되었습니다.');
            cancelEdit(detailId);
        } catch { /* store에서 토스트 처리 */ }
    };

    /* ── 삭제 ── */
    const handleDelete = async (detailId: number, codeName: string) => {
        if (!confirm(`'${codeName}' 코드를 삭제하시겠습니까?`)) return;
        try {
            await deleteDetail(groupId, detailId);
            cancelEdit(detailId);
            toast.success('코드가 삭제되었습니다.');
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
            toast.error('사용여부 변경에 실패했습니다.');
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
                    코드 상세
                    <span className="ml-1.5 text-slate-400 font-normal">{details.length}개</span>
                </h3>
                {/* 코드 검색 */}
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="코드값 / 코드명 검색"
                        className="w-full pl-6 pr-2 py-1 text-[11px] border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                </div>
                {/* 코드 추가 버튼 */}
                {!isAdding && (
                    <button
                        onClick={() => { setIsAdding(true); setNewSort(details.length + 1); }}
                        className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-all"
                    >
                        <Plus className="w-3 h-3" />코드 추가
                    </button>
                )}
            </div>

            {/* 테이블 — 가로 스크롤 허용 */}
            <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full min-w-[900px]">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-left w-[120px]">코드값</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-left w-[130px]">코드명</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[50px]">정렬</th>
                            {EXTRAS.map((_, i) => (
                                <th key={i} className="px-2 py-2 text-[11px] font-semibold text-slate-600 text-left w-[90px]">기타{i + 1}</th>
                            ))}
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[50px]">사용</th>
                            <th className="px-3 py-2 text-[11px] font-semibold text-slate-600 text-center w-[60px]">관리</th>
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
                                    <input type="text" value={newName}
                                        onChange={e => { setNewName(e.target.value); if (addNameErr) setAddNameErr(''); }}
                                        onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setIsAdding(false); }}
                                        placeholder="코드명" className={`${inputCls} ${addNameErr ? 'border-red-400' : ''}`} />
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
                                    <span className="text-[11px] text-emerald-600">Y</span>
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
                                                <input type="text" value={editing.name}
                                                    onChange={e => setEditField(d.id, 'name', e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') handleEditSave(d.id); if (e.key === 'Escape') cancelEdit(d.id); }}
                                                    className={inputCls} />
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
                                                    <option value="Y">Y</option>
                                                    <option value="N">N</option>
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
                                            <td className="px-3 py-2 text-xs text-slate-700">{d.name}</td>
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
                                                    {d.active ? 'Y' : 'N'}
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
