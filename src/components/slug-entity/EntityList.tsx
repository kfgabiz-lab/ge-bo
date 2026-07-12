'use client';

/**
 * Slug Entity 목록 패널 (좌측)
 * - 마운트 시 entity 목록 API 자동 호출
 * - slug / name 실시간 검색
 * - 선택 시 상세 API 호출 후 우측 패널에 필드 편집 표시
 * - 신규 등록 모달 포함
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Search, Plus, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api, { getApiErrorMessage } from '@/lib/api';

/* ── 타입 ── */
export interface SlugEntityItem {
    id: number;
    slug: string;
    name: string;
    tableName: string | null;
    description: string | null;
    active: boolean;
    fieldCount: number;
    fields: SlugEntityFieldItem[];
    /** 마스터(부모) Entity ID — 없으면 독립 Entity */
    parentEntityId: number | null;
    /** 마스터(부모) Entity slug — 화면 표시용 */
    parentEntitySlug: string | null;
    createdBy: string;
    createdAt: string;
    updatedBy: string;
    updatedAt: string;
}

export interface SlugEntityFieldItem {
    id?: number;
    key: string | null;
    label: string;
    columnType: string;
    columnLength: number | null;
    /** 빌더 필드 타입 (예: input, textarea, date 등) — 빌드 시 columnType 자동 매핑보다 우선 적용 */
    fieldType?: string | null;
    /** 공통코드 그룹 코드 — select/radio/checkbox 옵션 자동 연결용 */
    codeGroupCode?: string | null;
    /** 기본값 */
    defaultValue?: string | null;
    /** 연동 대상 Slug Entity ID — columnType === 'ENTITY_REF'일 때 이 필드가 어느 Slug Entity를 참조하는지 가리키는 단일 참조값 (실제 레코드 id 배열과는 별개의 메타 정보) */
    connectedEntityId?: number | null;
    isNullable: boolean;
    description: string | null;
    sortOrder: number;
}

/* ── 빈 등록 폼 초기값 ── */
const EMPTY_FORM = { slug: '', name: '', tableName: '', description: '', active: true, parentEntityId: '' };

/* ── 스타일 상수 ── */
const ITEM_SELECTED = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all bg-slate-900 text-white';
const ITEM_DEFAULT  = 'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all hover:bg-slate-50 text-slate-700';
const INPUT_CLS = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white';

/* ── Props ── */
interface Props {
    selectedId: number | null;
    onSelect: (entity: SlugEntityItem | null) => void;
    onCreated: (entity: SlugEntityItem) => void;
}

export function EntityList({ selectedId, onSelect, onCreated }: Props) {
    const [entities, setEntities] = useState<SlugEntityItem[]>([]);
    const [search, setSearch]     = useState('');
    const [loading, setLoading]   = useState(false);

    /* 마스터 Entity 선택 옵션 — 등록 모달용 (신규 등록이라 자기 자신 제외 불필요) */
    const [entityOptions, setEntityOptions] = useState<{ id: number; slug: string; name: string }[]>([]);

    /* 등록 모달 상태 */
    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm]           = useState(EMPTY_FORM);
    const [saving, setSaving]       = useState(false);

    /* 목록 조회 */
    const fetchList = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get<{ content: SlugEntityItem[] }>('/slug-entity', {
                params: { page: 0, size: 100, sort: 'createdAt,desc' },
            });
            setEntities(res.data.content);
        } catch {
            toast.error('목록을 불러오는 중 오류가 발생했습니다.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchList(); }, [fetchList]);

    /* 마스터 Entity 옵션 로드 */
    useEffect(() => {
        api.get<{ id: number; slug: string; name: string }[]>('/slug-entity/active')
            .then(res => setEntityOptions(res.data || []))
            .catch(() => { /* 조회 실패 시 빈 배열 유지 */ });
    }, []);

    /* 클라이언트 필터 */
    const filtered = entities.filter(e =>
        e.slug.toLowerCase().includes(search.toLowerCase()) ||
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    /* entity 선택 — 상세 API 호출로 필드 포함 데이터 로드 */
    const handleSelect = async (entity: SlugEntityItem | null) => {
        if (!entity) { onSelect(null); return; }
        try {
            const res = await api.get<SlugEntityItem>(`/slug-entity/${entity.id}`);
            onSelect(res.data);
        } catch {
            toast.error('entity 정보를 불러오는 중 오류가 발생했습니다.');
        }
    };

    /* 등록 저장 */
    const handleSave = async () => {
        if (!form.slug.trim()) { toast.warning('slug를 입력해주세요.'); return; }
        if (!form.name.trim()) { toast.warning('표시명을 입력해주세요.'); return; }

        setSaving(true);
        try {
            const res = await api.post<SlugEntityItem>('/slug-entity', {
                slug:           form.slug.trim(),
                name:           form.name.trim(),
                tableName:      form.tableName.trim() || null,
                description:    form.description.trim() || null,
                active:         form.active,
                parentEntityId: form.parentEntityId ? Number(form.parentEntityId) : null,
            });
            toast.success('등록되었습니다.');
            setModalOpen(false);
            setForm(EMPTY_FORM);
            await fetchList();
            /* 신규 등록된 entity도 다음 등록 시 마스터 Entity 옵션에 즉시 노출되도록 갱신 */
            api.get<{ id: number; slug: string; name: string }[]>('/slug-entity/active')
                .then(r => setEntityOptions(r.data || []))
                .catch(() => {});
            /* 등록 후 상세 조회로 fields 포함된 entity 전달 */
            const detail = await api.get<SlugEntityItem>(`/slug-entity/${res.data.id}`);
            onCreated(detail.data);
        } catch (err: unknown) {
            toast.error(getApiErrorMessage(err, '저장 중 오류가 발생했습니다.'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full min-h-0 flex flex-col">

            {/* 헤더 */}
            <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold text-slate-700">
                        Entity 목록
                        <span className="text-slate-400 font-normal ml-1">{entities.length}개</span>
                    </h2>
                    <button
                        onClick={() => { setForm(EMPTY_FORM); setModalOpen(true); }}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold rounded transition-all"
                    >
                        <Plus className="w-3 h-3" />
                        등록
                    </button>
                </div>

                {/* 검색 */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="slug / 표시명 검색"
                        className="w-full pl-7 pr-3 py-1.5 text-[11px] border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                    />
                </div>
            </div>

            {/* 목록 */}
            <div className="flex-1 overflow-y-auto p-1.5">
                {loading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                        <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                        <span className="text-xs">불러오는 중...</span>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-400">
                        <span className="text-[11px]">
                            {search ? '검색 결과가 없습니다.' : '등록된 entity가 없습니다.'}
                        </span>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {filtered.map(entity => {
                            const isSelected = selectedId === entity.id;
                            return (
                                <button
                                    key={entity.id}
                                    onClick={() => handleSelect(isSelected ? null : entity)}
                                    className={isSelected ? ITEM_SELECTED : ITEM_DEFAULT}
                                >
                                    <div className="flex flex-col items-start flex-1 min-w-0">
                                        <span className="text-[11px] font-mono font-semibold truncate w-full">
                                            {entity.slug}
                                        </span>
                                        <span className={`text-[10px] truncate w-full ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                            {entity.name}
                                        </span>
                                        {entity.description && (
                                            <span
                                                className={`text-[10px] truncate w-full ${isSelected ? 'text-white/40' : 'text-slate-300'}`}
                                                title={entity.description}
                                            >
                                                {entity.description}
                                            </span>
                                        )}
                                    </div>
                                    <span className={`text-[10px] shrink-0 ml-2 ${isSelected ? 'text-white/60' : 'text-slate-400'}`}>
                                        {entity.fieldCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* 등록 모달 */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => setModalOpen(false)} />
                    <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">

                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h2 className="text-base font-bold text-slate-900">Entity 등록</h2>
                            <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-5 space-y-4">
                            {/* Slug */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    Slug <span className="text-red-400">*</span>
                                    <span className="ml-2 text-[10px] font-normal text-slate-400">(등록 후 변경 불가)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.slug}
                                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                                    placeholder="예: member (영문/숫자/하이픈/언더스코어)"
                                    className={`${INPUT_CLS} font-mono`}
                                />
                            </div>

                            {/* 표시명 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">표시명 <span className="text-red-400">*</span></label>
                                <input
                                    type="text"
                                    value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                    placeholder="예: 회원"
                                    className={INPUT_CLS}
                                />
                            </div>

                            {/* DB 테이블명 (선택) */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    DB 테이블명
                                    <span className="ml-2 text-[10px] font-normal text-slate-400">(선택, entity 생성 기능에 사용)</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.tableName}
                                    onChange={e => setForm(f => ({ ...f, tableName: e.target.value }))}
                                    placeholder="예: tbl_member"
                                    className={`${INPUT_CLS} font-mono`}
                                />
                            </div>

                            {/* 마스터 Entity — 선택 시 저장 후 자식 필드 목록에 참조 필드가 자동 추가됨 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                                    마스터 Entity
                                    <span className="ml-2 text-[10px] font-normal text-slate-400">(선택, 이 entity가 참조하는 부모 entity)</span>
                                </label>
                                <select
                                    value={form.parentEntityId}
                                    onChange={e => setForm(f => ({ ...f, parentEntityId: e.target.value }))}
                                    className={`${INPUT_CLS} cursor-pointer`}
                                >
                                    <option value="">— 없음 (독립 entity) —</option>
                                    {entityOptions.map(o => (
                                        <option key={o.id} value={o.id}>{o.slug} ({o.name})</option>
                                    ))}
                                </select>
                            </div>

                            {/* 설명 */}
                            <div>
                                <label className="block text-xs font-semibold text-slate-600 mb-1.5">설명</label>
                                <textarea
                                    value={form.description}
                                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    rows={2}
                                    placeholder="entity 용도 설명"
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white resize-none"
                                />
                            </div>

                            {/* 사용여부 */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="entity-active"
                                    checked={form.active}
                                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                                    className="w-4 h-4 rounded border-slate-300 cursor-pointer"
                                />
                                <label htmlFor="entity-active" className="text-sm text-slate-700 cursor-pointer">사용</label>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
                            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-semibold text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50">
                                취소
                            </button>
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md disabled:opacity-60">
                                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
