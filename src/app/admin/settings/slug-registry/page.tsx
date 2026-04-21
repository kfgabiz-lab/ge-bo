'use client';

/**
 * DB Slug 관리 페이지
 * - 위젯 빌더 connectedSlug 연동용 slug 사전 등록/조회/수정/삭제
 * - type 필터 / 키워드 검색 지원
 * - 수정 시 slug 변경 불가
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

/* ══════════════════════════════════════════ */
/*  타입                                       */
/* ══════════════════════════════════════════ */

interface SlugRegistry {
    id: number;
    slug: string;
    name: string;
    type: string;
    description: string | null;
    active: boolean;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

interface PageResponse {
    content: SlugRegistry[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

/* 빈 폼 초기값 */
const EMPTY_FORM = {
    slug: '',
    name: '',
    type: 'PAGE_DATA',
    description: '',
    active: true,
};

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

const SLUG_TYPES = [
    { value: 'PAGE_DATA',     label: 'PAGE_DATA' },
    { value: 'PAGE_TEMPLATE', label: 'PAGE_TEMPLATE' },
    { value: 'ETC',           label: 'ETC' },
];

/* type별 배지 색상 */
const TYPE_CLS: Record<string, string> = {
    PAGE_DATA:     'bg-blue-100 text-blue-700',
    PAGE_TEMPLATE: 'bg-purple-100 text-purple-700',
    ETC:           'bg-slate-100 text-slate-600',
};

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white';
const selectCls = 'w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer';
const readonlyCls = 'w-full border border-slate-100 rounded-md px-3 py-2 text-sm text-slate-500 bg-slate-50 font-mono cursor-not-allowed';

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function SlugRegistryPage() {

    /* 목록 상태 */
    const [items, setItems] = useState<SlugRegistry[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    /* 필터 상태 */
    const [filterType, setFilterType] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');

    /* 모달 상태 */
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SlugRegistry | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    /* ── 목록 조회 ── */
    const fetchList = useCallback(async (page = 0, typ = filterType, kw = filterKeyword) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), size: '20', sort: 'slug,asc' };
            if (typ) params.type    = typ;
            if (kw)  params.keyword = kw;
            const res = await api.get<PageResponse>('/slug-registry', { params });
            setItems(res.data.content);
            setTotalElements(res.data.totalElements);
            setTotalPages(res.data.totalPages);
            setCurrentPage(res.data.number);
        } catch {
            toast.error('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterType, filterKeyword]);

    useEffect(() => { fetchList(0); }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 검색 / 초기화 ── */
    const handleSearch = () => fetchList(0, filterType, filterKeyword);
    const handleReset  = () => {
        setFilterType('');
        setFilterKeyword('');
        fetchList(0, '', '');
    };

    /* ── 등록 모달 열기 ── */
    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    /* ── 수정 모달 열기 ── */
    const openEdit = (item: SlugRegistry) => {
        setEditTarget(item);
        setForm({
            slug:        item.slug,            // 표시용 (수정 불가)
            name:        item.name,
            type:        item.type,
            description: item.description ?? '',
            active:      item.active,
        });
        setModalOpen(true);
    };

    /* ── 저장 (등록/수정) ── */
    const handleSave = async () => {
        if (!form.slug.trim())  { toast.warning('slug를 입력해주세요.'); return; }
        if (!form.name.trim())  { toast.warning('slug 별칭을 입력해주세요.'); return; }

        setSaving(true);
        try {
            const body = {
                slug:        form.slug.trim(),
                name:        form.name.trim(),
                type:        form.type,
                description: form.description.trim() || null,
                active:      form.active,
            };
            if (editTarget) {
                await api.put(`/slug-registry/${editTarget.id}`, body);
                toast.success('수정되었습니다.');
            } else {
                await api.post('/slug-registry', body);
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
    const handleDelete = async (item: SlugRegistry) => {
        if (!confirm(`"${item.slug}" slug를 삭제하시겠습니까?`)) return;
        try {
            await api.delete(`/slug-registry/${item.id}`);
            toast.success('삭제되었습니다.');
            fetchList(currentPage);
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    return (
        <div className="h-full flex flex-col">

            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">DB Slug 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">위젯 빌더 연동용 slug를 사전에 등록하고 관리합니다.</p>
                </div>
                <button
                    onClick={openCreate}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    Slug 등록
                </button>
            </div>

            {/* 필터 바 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* 타입 */}
                <div className="relative">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white cursor-pointer min-w-[150px]"
                    >
                        <option value="">전체 타입</option>
                        {SLUG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </div>

                {/* 키워드 */}
                <div className="relative flex-1 min-w-[200px] max-w-[320px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        value={filterKeyword}
                        onChange={e => setFilterKeyword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="slug 또는 별칭 검색"
                        className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
                    />
                </div>

                <button onClick={handleSearch} className="px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 transition-all">검색</button>
                <button onClick={handleReset}  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all">초기화</button>
            </div>

            {/* 테이블 카드 */}
            <div className="flex-1 bg-white border border-slate-200 rounded-md overflow-hidden flex flex-col min-h-0">

                {/* 상단 건수 */}
                <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-xs text-slate-500">
                        총 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건
                    </p>
                </div>

                {/* 테이블 */}
                <div className="flex-1 overflow-auto">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0">
                            <tr className="bg-slate-50/90 border-b border-slate-200 backdrop-blur-sm">
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">Slug</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">별칭</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[130px]">타입</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">설명</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[70px]">사용</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[80px]">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-16 text-center text-sm text-slate-400">
                                        등록된 slug가 없습니다
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-xs font-mono font-medium text-slate-800">{item.slug}</td>
                                        <td className="px-4 py-3 text-sm text-slate-700">{item.name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${TYPE_CLS[item.type] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 max-w-[240px] truncate" title={item.description ?? ''}>
                                            {item.description || '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`text-xs font-medium ${item.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {item.active ? 'Y' : 'N'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <button onClick={() => openEdit(item)} title="수정" className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all">
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => handleDelete(item)} title="삭제" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-1 px-4 py-3 border-t border-slate-100">
                        <button disabled={currentPage === 0} onClick={() => fetchList(currentPage - 1)}
                            className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">이전</button>
                        {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i).map(p => (
                            <button key={p} onClick={() => fetchList(p)}
                                className={`px-2.5 py-1.5 text-xs rounded border transition-all ${currentPage === p ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                                {p + 1}
                            </button>
                        ))}
                        <button disabled={currentPage >= totalPages - 1} onClick={() => fetchList(currentPage + 1)}
                            className="px-2.5 py-1.5 text-xs rounded border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all">다음</button>
                    </div>
                )}
            </div>

            {/* 등록/수정 모달 */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">

                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">
                                {editTarget ? 'Slug 수정' : 'Slug 등록'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div className="px-6 py-5 space-y-4">

                            {/* Slug */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Slug <span className="text-red-400">*</span>
                                    {editTarget && <span className="ml-2 text-[10px] font-normal text-slate-400">(등록 후 변경 불가)</span>}
                                </label>
                                {editTarget ? (
                                    /* 수정 시 — 읽기 전용 표시 */
                                    <input type="text" value={form.slug} readOnly className={readonlyCls} />
                                ) : (
                                    /* 등록 시 — 직접 입력 */
                                    <input
                                        type="text"
                                        value={form.slug}
                                        onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                        placeholder="예: boardListSave (영문/숫자/하이픈/언더스코어)"
                                        className={`${inputCls} font-mono`}
                                    />
                                )}
                            </div>

                            {/* 별칭 + 타입 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">별칭 <span className="text-red-400">*</span></label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                        placeholder="예: 게시판 목록"
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">타입 <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className={selectCls}>
                                            {SLUG_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    placeholder="slug 용도 설명을 입력하세요"
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white resize-none"
                                />
                            </div>

                            {/* 사용여부 */}
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active-check" checked={form.active}
                                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 text-slate-900 cursor-pointer" />
                                <label htmlFor="active-check" className="text-sm text-slate-700 cursor-pointer">사용</label>
                            </div>
                        </div>

                        {/* 모달 푸터 */}
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-all">
                                취소
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-60 transition-all">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                {editTarget ? '수정' : '등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
