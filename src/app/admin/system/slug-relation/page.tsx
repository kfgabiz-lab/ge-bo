'use client';

/**
 * SLUG 연동 관리 페이지
 * - 서로 다른 slug 간 관계(FILTER/FETCH)를 등록/수정/삭제
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { SlugSelector, type SlugOption } from '@/components/slug/slug-selector';

/* ══════════════════════════════════════════ */
/*  타입                                       */
/* ══════════════════════════════════════════ */

interface SlugRelation {
    id: number;
    masterSlug: string;
    slaveSlug: string;
    masterKey: string;
    slaveKey: string;
    joinType: string;
    slaveFilter: string | null;
    relationDir: string;
    fetchFields: string | null;
    fetchSeparator: string;
    slaveType: string;
    categoryDepth: number;
    categoryDepthFrom: number | null;
    description: string | null;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

interface PageResponse {
    content: SlugRelation[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

/* 빈 폼 초기값 */
const EMPTY_FORM = {
    masterSlug: '',
    slaveSlug: '',
    masterKey: 'id',
    slaveKey: '',
    joinType: 'EQ',
    slaveFilter: '',
    relationDir: 'FILTER',
    fetchFields: '',
    fetchSeparator: ',',
    slaveType: 'TABLE',
    categoryDepth: '1',
    categoryDepthFrom: '',
    description: '',
};

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

const JOIN_TYPES   = ['EQ', 'ARRAY_CONTAINS'];
const RELATION_DIRS = ['FILTER', 'FETCH'];
const SLAVE_TYPES  = ['TABLE', 'CATEGORY'];

/* 공통 input/select 스타일 */
const inputCls  = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white';
const selectCls = 'w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer';

/* 방향 배지 색상 */
const DIR_CLS: Record<string, string> = {
    FILTER: 'bg-blue-100 text-blue-700',
    FETCH:  'bg-emerald-100 text-emerald-700',
};

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function SlugRelationPage() {

    /* 목록 상태 */
    const [items, setItems]               = useState<SlugRelation[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage]   = useState(0);
    const [totalPages, setTotalPages]     = useState(0);
    const [loading, setLoading]           = useState(false);

    /* 필터 상태 */
    const [filterMaster, setFilterMaster]   = useState('');
    const [filterSlave, setFilterSlave]     = useState('');
    const [filterDir, setFilterDir]         = useState('');

    /* 슬러그 선택 옵션 */
    const [slugOptions, setSlugOptions] = useState<SlugOption[]>([]);

    /* 모달 상태 */
    const [modalOpen, setModalOpen]   = useState(false);
    const [editTarget, setEditTarget] = useState<SlugRelation | null>(null);
    const [form, setForm]             = useState({ ...EMPTY_FORM });
    const [saving, setSaving]         = useState(false);

    /* ── 슬러그 옵션 로드 (PAGE_DATA 타입만) ── */
    const fetchSlugs = useCallback(async () => {
        try {
            const res = await api.get<{ id: number; slug: string; name: string; type: string }[]>('/slug-registry/active');
            setSlugOptions(res.data.filter(d => d.type === 'PAGE_DATA').map(d => ({ id: d.id, slug: d.slug, name: d.name })));
        } catch {
            /* 목록 로드 실패해도 무시 */
        }
    }, []);

    /* ── 목록 조회 ── */
    const fetchList = useCallback(async (
        page = 0,
        master = filterMaster,
        slave  = filterSlave,
        dir    = filterDir,
    ) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), size: '20', sort: 'id,desc' };
            if (master) params.masterSlug  = master;
            if (slave)  params.slaveSlug   = slave;
            if (dir)    params.relationDir = dir;
            const res = await api.get<PageResponse>('/slug-relations', { params });
            setItems(res.data.content);
            setTotalElements(res.data.totalElements);
            setTotalPages(res.data.totalPages);
            setCurrentPage(res.data.number);
        } catch {
            toast.error('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterMaster, filterSlave, filterDir]);

    useEffect(() => { fetchList(0); fetchSlugs(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 검색 / 초기화 ── */
    const handleSearch = () => fetchList(0, filterMaster, filterSlave, filterDir);
    const handleReset  = () => {
        setFilterMaster(''); setFilterSlave(''); setFilterDir('');
        fetchList(0, '', '', '');
    };

    /* ── 등록 모달 열기 ── */
    const openCreate = () => {
        setEditTarget(null);
        setForm({ ...EMPTY_FORM });
        setModalOpen(true);
    };

    /* ── 수정 모달 열기 ── */
    const openEdit = (item: SlugRelation) => {
        setEditTarget(item);
        setForm({
            masterSlug:    item.masterSlug,
            slaveSlug:     item.slaveSlug,
            masterKey:     item.masterKey,
            slaveKey:      item.slaveKey,
            joinType:      item.joinType,
            slaveFilter:   item.slaveFilter   ?? '',
            relationDir:   item.relationDir,
            fetchFields:   item.fetchFields   ?? '',
            fetchSeparator: item.fetchSeparator,
            slaveType:     item.slaveType     ?? 'TABLE',
            categoryDepth: String(item.categoryDepth ?? 1),
            categoryDepthFrom: item.categoryDepthFrom != null ? String(item.categoryDepthFrom) : '',
            description:   item.description   ?? '',
        });
        setModalOpen(true);
    };

    /* ── 저장 (등록/수정) ── */
    const handleSave = async () => {
        if (!form.masterSlug.trim()) { toast.warning('Master Slug를 입력해주세요.'); return; }
        if (!form.slaveSlug.trim())  { toast.warning('Slave Slug를 입력해주세요.'); return; }
        if (!form.slaveKey.trim())   { toast.warning('Slave Key를 입력해주세요.'); return; }

        setSaving(true);
        try {
            const body = {
                masterSlug:    form.masterSlug.trim(),
                slaveSlug:     form.slaveSlug.trim(),
                masterKey:     form.masterKey.trim() || 'id',
                slaveKey:      form.slaveKey.trim(),
                joinType:      form.joinType,
                slaveFilter:   form.slaveFilter.trim()    || null,
                relationDir:   form.relationDir,
                fetchFields:   form.fetchFields.trim()    || null,
                fetchSeparator: form.fetchSeparator,
                slaveType:     form.relationDir === 'FETCH' ? (form.slaveType || 'TABLE') : 'TABLE',
                categoryDepth: form.slaveType === 'CATEGORY' ? (Number(form.categoryDepth) || 1) : 1,
                categoryDepthFrom: form.slaveType === 'CATEGORY' && form.categoryDepthFrom.trim()
                    ? (Number(form.categoryDepthFrom) || null)
                    : null,
                description:   form.description.trim()   || null,
            };
            if (editTarget) {
                await api.put(`/slug-relations/${editTarget.id}`, body);
                toast.success('수정되었습니다.');
            } else {
                await api.post('/slug-relations', body);
                toast.success('등록되었습니다.');
            }
            setModalOpen(false);
            fetchList(currentPage);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '저장 중 오류가 발생했습니다.');
        } finally {
            setSaving(false);
        }
    };

    /* ── 삭제 ── */
    const handleDelete = async (item: SlugRelation) => {
        if (!confirm(`"${item.masterSlug} → ${item.slaveSlug}" 연동 설정을 삭제하시겠습니까?`)) return;
        try {
            await api.delete(`/slug-relations/${item.id}`);
            toast.success('삭제되었습니다.');
            fetchList(currentPage);
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    /* ── 폼 필드 변경 ── */
    const setField = (key: keyof typeof EMPTY_FORM, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    return (
        <div className="h-full flex flex-col">

            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">SLUG 연동 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">서로 다른 Slug 간 관계(FILTER/FETCH)를 설정합니다.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    연동 등록
                </button>
            </div>

            {/* 필터 바 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">

                {/* Master Slug */}
                <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={filterMaster}
                        onChange={e => setFilterMaster(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Master Slug"
                        className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
                    />
                </div>

                {/* Slave Slug */}
                <div className="relative flex-1 min-w-[160px] max-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={filterSlave}
                        onChange={e => setFilterSlave(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Slave Slug"
                        className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
                    />
                </div>

                {/* 방향 */}
                <div className="relative">
                    <select
                        value={filterDir}
                        onChange={e => setFilterDir(e.target.value)}
                        className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white cursor-pointer min-w-[120px]"
                    >
                        <option value="">전체 방향</option>
                        {RELATION_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </div>

                <button onClick={handleSearch} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-all">
                    검색
                </button>
                <button onClick={handleReset} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all">
                    초기화
                </button>
            </div>

            {/* 테이블 카드 */}
            <div className="flex-1 bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col min-h-0">

                {/* 상단 건수 */}
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                        총 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건
                    </p>
                </div>

                {/* 테이블 */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-slate-50/90 border-b border-slate-200 backdrop-blur-sm">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[60px]">ID</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">Master Slug</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">Slave Slug</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap w-[130px]">Master Key</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap w-[130px]">Slave Key</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[120px]">Join Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap w-[130px]">Slave Filter</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[90px]">방향</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[100px]">Slave Type</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">설명</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[80px]">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="py-16 text-center text-sm text-slate-400">
                                        등록된 SLUG 연동이 없습니다.
                                    </td>
                                </tr>
                            ) : items.map(item => (
                                <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                    <td className="px-4 py-3 text-center text-slate-500 text-xs">{item.id}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{item.masterSlug}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-800">{item.slaveSlug}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.masterKey}</td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.slaveKey}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                                            {item.joinType}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.slaveFilter ?? '-'}</td>
                                    <td className="px-4 py-3 text-center">
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${DIR_CLS[item.relationDir] ?? 'bg-slate-100 text-slate-600'}`}>
                                            {item.relationDir}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        {item.relationDir === 'FETCH' && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.slaveType === 'CATEGORY' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'}`}>
                                                {item.slaveType ?? 'TABLE'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[240px] truncate" title={item.description ?? ''}>
                                        {item.description || <span className="text-slate-300">-</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                                title="수정"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="삭제"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-center gap-1">
                        <button
                            onClick={() => fetchList(0)}
                            disabled={currentPage === 0}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            처음
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i).map(p => (
                            <button
                                key={p}
                                onClick={() => fetchList(p)}
                                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                                    p === currentPage
                                        ? 'bg-slate-900 text-white font-semibold'
                                        : 'text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {p + 1}
                            </button>
                        ))}
                        <button
                            onClick={() => fetchList(totalPages - 1)}
                            disabled={currentPage === totalPages - 1}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            마지막
                        </button>
                    </div>
                )}
            </div>

            {/* 등록/수정 모달 */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">
                                {editTarget ? 'SLUG 연동 수정' : 'SLUG 연동 등록'}
                            </h2>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

                            {/* Master / Slave Slug — 검색 가능한 SlugSelector */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Master Slug <span className="text-red-500">*</span>
                                    </label>
                                    <SlugSelector
                                        value={form.masterSlug}
                                        onChange={v => setField('masterSlug', v)}
                                        slugOptions={slugOptions}
                                        placeholder="slug 선택"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">기준 슬러그 (조회 대상)</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                        Slave Slug <span className="text-red-500">*</span>
                                    </label>
                                    <SlugSelector
                                        value={form.slaveSlug}
                                        onChange={v => setField('slaveSlug', v)}
                                        slugOptions={slugOptions}
                                        placeholder="slug 선택"
                                    />
                                    <p className="mt-1 text-xs text-slate-400">관계 슬러그 (필터링/fetch 기준)</p>
                                </div>
                            </div>

                            {/* Master Key / Slave Key */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Master Key <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.masterKey}
                                        onChange={e => setField('masterKey', e.target.value)}
                                        placeholder="예: id"
                                        className={inputCls}
                                    />
                                    <p className="mt-1 text-xs text-slate-400">master에서 비교할 필드 경로</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slave Key <span className="text-red-500">*</span></label>
                                    <input
                                        value={form.slaveKey}
                                        onChange={e => setField('slaveKey', e.target.value)}
                                        placeholder="예: product.id"
                                        className={inputCls}
                                    />
                                    <p className="mt-1 text-xs text-slate-400">slave에서 master를 참조하는 필드 경로</p>
                                </div>
                            </div>

                            {/* Join Type / 방향 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Join Type</label>
                                    <div className="relative">
                                        <select value={form.joinType} onChange={e => setField('joinType', e.target.value)} className={selectCls}>
                                            {JOIN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">EQ: 단순 동등 / ARRAY_CONTAINS: 배열 포함</p>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">방향 (Relation Dir)</label>
                                    <div className="relative">
                                        <select value={form.relationDir} onChange={e => setField('relationDir', e.target.value)} className={selectCls}>
                                            {RELATION_DIRS.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-400">FILTER: slave→master 필터링 / FETCH: slave 포함 반환</p>
                                </div>
                            </div>

                            {/* Slave Filter */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slave Filter</label>
                                <input
                                    value={form.slaveFilter}
                                    onChange={e => setField('slaveFilter', e.target.value)}
                                    placeholder="예: depth=3 (없으면 비워두기)"
                                    className={inputCls}
                                />
                                <p className="mt-1 text-xs text-slate-400">slave 조회 시 고정 조건 (없으면 빈 값)</p>
                            </div>

                            {/* Slave Type — 항상 표시 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Slave Type</label>
                                <div className="relative">
                                    <select value={form.slaveType} onChange={e => setField('slaveType', e.target.value)} className={selectCls}>
                                        {SLAVE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                                <p className="mt-1 text-xs text-slate-400">TABLE: slave에서 직접 추출 / CATEGORY: 상위 계층 거슬러 추출</p>
                            </div>

                            {/* Category Depth / 시작 Depth — CATEGORY 타입일 때만 표시 */}
                            {form.slaveType === 'CATEGORY' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category Depth (끝)</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={5}
                                            value={form.categoryDepth}
                                            onChange={e => setField('categoryDepth', e.target.value)}
                                            className={inputCls}
                                        />
                                        <p className="mt-1 text-xs text-slate-400">표시할 마지막 계층 (최대 5)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">시작 Depth <span className="text-slate-300 font-normal">(선택)</span></label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={5}
                                            placeholder="비우면 끝 Depth와 동일"
                                            value={form.categoryDepthFrom}
                                            onChange={e => setField('categoryDepthFrom', e.target.value)}
                                            className={inputCls}
                                        />
                                        <p className="mt-1 text-xs text-slate-400">비우면 끝 Depth 하나만, 값 있으면 시작~끝 범위를 " &gt; "로 합쳐 표시 (예: 1~2 = "대분류 &gt; 중분류"). 매칭 레코드가 여러 건이면 그 사이는 Fetch Separator로 구분</p>
                                    </div>
                                </div>
                            )}

                            {/* Fetch Fields / Fetch Separator — FETCH 방향일 때만 표시 */}
                            {form.relationDir === 'FETCH' && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fetch Fields</label>
                                        <input
                                            value={form.fetchFields}
                                            onChange={e => setField('fetchFields', e.target.value)}
                                            placeholder="예: form1.title"
                                            className={inputCls}
                                        />
                                        <p className="mt-1 text-xs text-slate-400">표시할 slave 필드 경로 (dot notation)</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-700 mb-1.5">Fetch Separator</label>
                                        <input
                                            value={form.fetchSeparator}
                                            onChange={e => setField('fetchSeparator', e.target.value)}
                                            placeholder=","
                                            className={inputCls}
                                        />
                                        <p className="mt-1 text-xs text-slate-400">여러 값 구분자 (기본: ,)</p>
                                    </div>
                                </div>
                            )}

                            {/* 설명 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">설명</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setField('description', e.target.value)}
                                    placeholder="이 연동 설정에 대한 간단한 설명"
                                    rows={2}
                                    className={`${inputCls} resize-none`}
                                />
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold rounded-md transition-all disabled:opacity-60"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
