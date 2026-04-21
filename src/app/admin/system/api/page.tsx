'use client';

/**
 * API 정보 관리 페이지
 * - 백엔드 API 엔드포인트 목록을 등록/조회/수정/삭제
 * - 카테고리(공통코드 API_CATEGORY) / 메서드 / 키워드 필터 지원
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Search, X, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { useCodeStore } from '@/store/useCodeStore';
import { useEntityStore } from '@/store/useEntityStore';
import { EntityInfoPopup } from '@/components/database/EntityInfoPopup';

/* ══════════════════════════════════════════ */
/*  타입                                       */
/* ══════════════════════════════════════════ */

interface ApiInfo {
    id: number;
    category: string | null;
    name: string;
    method: string;
    urlPattern: string;
    description: string | null;
    connectedEntity: string | null;
    active: boolean;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

interface PageResponse {
    content: ApiInfo[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

/* 빈 폼 초기값 */
const EMPTY_FORM = {
    category: '',
    name: '',
    method: 'GET',
    urlPattern: '',
    description: '',
    connectedEntity: '',
    active: true,
};

/* ══════════════════════════════════════════ */
/*  상수                                       */
/* ══════════════════════════════════════════ */

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/* HTTP 메서드별 배지 색상 */
const METHOD_CLS: Record<string, string> = {
    GET: 'bg-emerald-100 text-emerald-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-yellow-100 text-yellow-700',
    PATCH: 'bg-purple-100 text-purple-700',
    DELETE: 'bg-red-100 text-red-700',
};

const inputCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white';
const selectCls = 'w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer';

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

export default function ApiInfoPage() {
    /* 공통코드 — API_CATEGORY */
    const { groups: codeGroups, fetchGroups } = useCodeStore();
    const categoryOptions = codeGroups.find(g => g.groupCode === 'API_CATEGORY')?.details ?? [];

    /* 엔티티 스토어 */
    const { entities, fetchEntities } = useEntityStore();

    /* 목록 상태 */
    const [items, setItems] = useState<ApiInfo[]>([]);
    const [totalElements, setTotalElements] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    /* 필터 상태 */
    const [filterCategory, setFilterCategory] = useState('');
    const [filterMethod, setFilterMethod] = useState('');
    const [filterKeyword, setFilterKeyword] = useState('');

    /* 모달 상태 */
    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<ApiInfo | null>(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);

    /* 동기화 상태 */
    const [syncing, setSyncing] = useState(false);
    const [entitySyncing, setEntitySyncing] = useState(false);

    /* 팝업 상태 */
    const [popupEntity, setPopupEntity] = useState<string | null>(null);

    /* ── 목록 조회 ── */
    const fetchList = useCallback(async (page = 0, cat = filterCategory, mth = filterMethod, kw = filterKeyword) => {
        setLoading(true);
        try {
            const params: Record<string, string> = { page: String(page), size: '20', sort: 'name,asc' };
            if (cat) params.category = cat;
            if (mth) params.method = mth;
            if (kw) params.keyword = kw;
            const res = await api.get<PageResponse>('/api-infos', { params });
            setItems(res.data.content);
            setTotalElements(res.data.totalElements);
            setTotalPages(res.data.totalPages);
            setCurrentPage(res.data.number);
        } catch {
            toast.error('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, [filterCategory, filterMethod, filterKeyword]);

    useEffect(() => {
        fetchGroups();
        fetchEntities();
        fetchList(0);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /* ── 검색 ── */
    const handleSearch = () => fetchList(0, filterCategory, filterMethod, filterKeyword);

    /* ── 필터 초기화 ── */
    const handleReset = () => {
        setFilterCategory('');
        setFilterMethod('');
        setFilterKeyword('');
        fetchList(0, '', '', '');
    };

    /* ── 등록 모달 열기 ── */
    const openCreate = () => {
        setEditTarget(null);
        setForm(EMPTY_FORM);
        setModalOpen(true);
    };

    /* ── 수정 모달 열기 ── */
    const openEdit = (item: ApiInfo) => {
        setEditTarget(item);
        setForm({
            category: item.category ?? '',
            name: item.name,
            method: item.method,
            urlPattern: item.urlPattern,
            description: item.description ?? '',
            connectedEntity: item.connectedEntity ?? '',
            active: item.active,
        });
        setModalOpen(true);
    };

    /* ── 저장 (등록/수정) ── */
    const handleSave = async () => {
        if (!form.name.trim()) { toast.warning('API 명칭을 입력해주세요.'); return; }
        if (!form.urlPattern.trim()) { toast.warning('URL 패턴을 입력해주세요.'); return; }

        setSaving(true);
        try {
            const body = {
                category: form.category || null,
                name: form.name.trim(),
                method: form.method,
                urlPattern: form.urlPattern.trim(),
                description: form.description.trim() || null,
                connectedEntity: form.connectedEntity || null,
                active: form.active,
            };
            if (editTarget) {
                await api.put(`/api-infos/${editTarget.id}`, body);
                toast.success('수정되었습니다.');
            } else {
                await api.post('/api-infos', body);
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
    const handleDelete = async (item: ApiInfo) => {
        if (!confirm(`"${item.name}" API 정보를 삭제하시겠습니까?`)) return;
        try {
            await api.delete(`/api-infos/${item.id}`);
            toast.success('삭제되었습니다.');
            fetchList(currentPage);
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    /* ── 동기화 ── */
    const handleSync = async () => {
        setSyncing(true);
        try {
            const res = await api.post<{ addedCount: number; skippedCount: number }>('/api-infos/sync');
            const { addedCount, skippedCount } = res.data;
            if (addedCount > 0) {
                toast.success(`${addedCount}건 추가되었습니다. (${skippedCount}건 중복 건너뜀)`);
                fetchList(0);
            } else {
                toast.info(`추가된 API가 없습니다. (${skippedCount}건 이미 존재)`);
            }
        } catch {
            toast.error('동기화 중 오류가 발생했습니다.');
        } finally {
            setSyncing(false);
        }
    };

    /* ── Entity 동기화 ── */
    const handleEntitySync = async () => {
        setEntitySyncing(true);
        try {
            const res = await api.post<number>('/api-infos/sync-entities');
            const updatedCount = res.data;
            if (updatedCount > 0) {
                toast.success(`${updatedCount}건의 API에 Entity가 자동 연결되었습니다.`);
                fetchList(0);
            } else {
                toast.info(`새롭게 자동 연결된 항목이 없습니다.`);
            }
        } catch {
            toast.error('Entity 동기화 중 오류가 발생했습니다.');
        } finally {
            setEntitySyncing(false);
        }
    };

    /* ── 카테고리 이름 반환 ── */
    const getCategoryName = (code: string | null) => {
        if (!code) return '-';
        return categoryOptions.find(o => o.code === code)?.name ?? code;
    };

    return (
        <div className="h-full flex flex-col">

            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">API 정보 관리</h1>
                    <p className="text-sm text-slate-500 mt-0.5">백엔드 API 엔드포인트 목록을 관리합니다.</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Entity 동기화 버튼 */}
                    <button
                        onClick={handleEntitySync}
                        disabled={entitySyncing}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-sm font-semibold transition-all disabled:opacity-60"
                        title="API URL을 기반으로 적절한 Entity를 자동 매핑합니다"
                    >
                        <RefreshCw className={`w-4 h-4 ${entitySyncing ? 'animate-spin' : ''}`} />
                        Entity 동기화
                    </button>
                    {/* 동기화 버튼 — Spring MVC 엔드포인트 스캔 후 없는 것만 추가 */}
                    <button
                        onClick={handleSync}
                        disabled={syncing}
                        className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-md text-sm font-semibold transition-all disabled:opacity-60"
                        title="등록된 API 엔드포인트를 스캔하여 없는 것만 추가합니다"
                    >
                        <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                        API 동기화
                    </button>
                    <button
                        onClick={openCreate}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-sm font-semibold transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        API 등록
                    </button>
                </div>
            </div>

            {/* 필터 바 */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
                {/* 카테고리 */}
                <div className="relative">
                    <select
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white cursor-pointer min-w-[130px]"
                    >
                        <option value="">전체 카테고리</option>
                        {categoryOptions.filter(o => o.active).map(o => (
                            <option key={o.code} value={o.code}>{o.name}</option>
                        ))}
                    </select>
                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                </div>

                {/* 메서드 */}
                <div className="relative">
                    <select
                        value={filterMethod}
                        onChange={e => setFilterMethod(e.target.value)}
                        className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white cursor-pointer min-w-[110px]"
                    >
                        <option value="">전체 메서드</option>
                        {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
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
                        placeholder="API 명칭 또는 URL 검색"
                        className="w-full border border-slate-200 rounded-md pl-9 pr-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 bg-white"
                    />
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
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap w-[110px]">카테고리</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">API 명칭</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[90px]">메서드</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">URL 패턴</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap w-[130px]">연결 Entity</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-left whitespace-nowrap">설명</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[70px]">사용</th>
                                <th className="px-4 py-3 text-xs font-semibold text-slate-600 text-center whitespace-nowrap w-[80px]">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <Loader2 className="w-5 h-5 animate-spin text-slate-300 mx-auto" />
                                    </td>
                                </tr>
                            ) : items.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-16 text-center text-sm text-slate-400">
                                        등록된 API 정보가 없습니다
                                    </td>
                                </tr>
                            ) : (
                                items.map(item => (
                                    <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-3 text-sm text-slate-600">{getCategoryName(item.category)}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{item.name}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${METHOD_CLS[item.method] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {item.method}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-600 max-w-[280px] truncate" title={item.urlPattern}>
                                            {item.urlPattern}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-mono font-medium">
                                            {item.connectedEntity ? (
                                                <button
                                                    onClick={() => setPopupEntity(item.connectedEntity)}
                                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                                                >
                                                    {item.connectedEntity}
                                                </button>
                                            ) : (
                                                <span className="text-slate-400 px-2">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate" title={item.description ?? ''}>
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
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">

                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">
                                {editTarget ? 'API 정보 수정' : 'API 정보 등록'}
                            </h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 모달 바디 */}
                        <div className="px-6 py-5 space-y-4">

                            {/* 카테고리 + 메서드 */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">카테고리</label>
                                    <div className="relative">
                                        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className={selectCls}>
                                            <option value="">선택</option>
                                            {categoryOptions.filter(o => o.active).map(o => (
                                                <option key={o.code} value={o.code}>{o.name}</option>
                                            ))}
                                        </select>
                                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">메서드 <span className="text-red-400">*</span></label>
                                    <div className="relative">
                                        <select value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))} className={selectCls}>
                                            {HTTP_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                                        </select>
                                        <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                    </div>
                                </div>
                            </div>

                            {/* API 명칭 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">API 명칭 <span className="text-red-400">*</span></label>
                                <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="예: 게시판 목록 조회" className={inputCls} />
                            </div>

                            {/* URL 패턴 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">URL 패턴 <span className="text-red-400">*</span></label>
                                <input type="text" value={form.urlPattern} onChange={e => setForm(f => ({ ...f, urlPattern: e.target.value }))}
                                    placeholder="예: /api/v1/page-data/{slug}" className={`${inputCls} font-mono`} />
                            </div>

                            {/* 연결 엔티티 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">연결 Entity (JPA 엔티티 자동매핑 대상)</label>
                                <div className="relative">
                                    <select
                                        value={form.connectedEntity}
                                        onChange={e => setForm(f => ({ ...f, connectedEntity: e.target.value }))}
                                        className={selectCls}
                                    >
                                        <option value="">-- 연결 대상 없음 --</option>
                                        {entities.map(e => (
                                            <option key={e.entityName} value={e.entityName}>
                                                {e.entityName} ({e.tableName})
                                            </option>
                                        ))}
                                    </select>
                                    <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
                                </div>
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명</label>
                                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2} placeholder="API 설명을 입력하세요"
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white resize-none" />
                            </div>

                            {/* 사용여부 */}
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="active-check" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
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

            {/* Entity 정보 팝업 */}
            {popupEntity && (
                <EntityInfoPopup
                    entityName={popupEntity}
                    onClose={() => setPopupEntity(null)}
                />
            )}
        </div>
    );
}
