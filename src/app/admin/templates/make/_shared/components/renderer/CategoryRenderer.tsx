'use client';

/**
 * CategoryRenderer — 카테고리 위젯 렌더러
 *
 * - preview: 샘플 카테고리 항목 표시 (빌더 미리보기용)
 * - live: page_data API로 실데이터 조회 + 등록/수정/삭제 기능
 *
 * 조회 방식:
 *   GET /page-data/{dbSlug}?eq_depth=1               (루트 카테고리)
 *   GET /page-data/{dbSlug}?eq_depth=2&eq_parentId=5 (선택된 상위 항목 기준 필터)
 *
 * depth 간 선택 연동:
 *   - 항목 클릭 시 onSelect(widgetId, selectedId) 호출
 *   - 상위 위젯(parentWidgetId)의 selectedId가 바뀌면 목록 재조회
 *
 * 사용법:
 *   // preview (빌더 미리보기)
 *   <CategoryRenderer mode="preview" widget={categoryWidget} />
 *
 *   // live (실제 페이지)
 *   <CategoryRenderer
 *     mode="live"
 *     widget={categoryWidget}
 *     selectedParentId={categorySelections[widget.parentWidgetId]}
 *     onSelect={(widgetId, id) => setCategorySelections(prev => ({ ...prev, [widgetId]: id }))}
 *   />
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import type { CategoryWidget } from './types';
import type { RendererMode } from './types';

/** 카테고리 항목 하나 */
interface CategoryItem {
    id: number;
    name: string;
    depth: number;
    parentId: number | null;
    code?: string;          // 항목 코드 (예: A-001)
    description?: string;   // 항목 설명
}

interface CategoryRendererProps {
    mode: RendererMode;
    widget: CategoryWidget;
    /** 상위 위젯에서 선택된 항목 ID — parentWidgetId가 있을 때 이 값으로 eq_parentId 필터 */
    selectedParentId?: number | null;
    /** 이 위젯에서 항목 선택 시 호출 — (widgetId, selectedId) */
    onSelect?: (widgetId: string, selectedId: number | null) => void;
}

/** 미리보기 샘플 데이터 (스크롤 확인용으로 충분한 수량) */
const PREVIEW_ITEMS: CategoryItem[] = [
    { id:  1, name: '항목 A', depth: 1, parentId: null, code: 'A-001', description: '첫 번째 항목에 대한 간단한 설명입니다.' },
    { id:  2, name: '항목 B', depth: 1, parentId: null, code: 'A-002', description: '두 번째 항목에 대한 간단한 설명입니다.' },
    { id:  3, name: '항목 C', depth: 1, parentId: null, code: 'A-003', description: '세 번째 항목에 대한 간단한 설명입니다.' },
    { id:  4, name: '항목 D', depth: 1, parentId: null, code: 'A-004', description: '네 번째 항목에 대한 간단한 설명입니다.' },
    { id:  5, name: '항목 E', depth: 1, parentId: null, code: 'A-005', description: '다섯 번째 항목에 대한 간단한 설명입니다.' },
    { id:  6, name: '항목 F', depth: 1, parentId: null, code: 'A-006', description: '여섯 번째 항목에 대한 간단한 설명입니다.' },
    { id:  7, name: '항목 G', depth: 1, parentId: null, code: 'A-007', description: '일곱 번째 항목에 대한 간단한 설명입니다.' },
    { id:  8, name: '항목 H', depth: 1, parentId: null, code: 'A-008', description: '여덟 번째 항목에 대한 간단한 설명입니다.' },
    { id:  9, name: '항목 I', depth: 1, parentId: null, code: 'A-009', description: '아홉 번째 항목에 대한 간단한 설명입니다.' },
    { id: 10, name: '항목 J', depth: 1, parentId: null, code: 'A-010', description: '열 번째 항목에 대한 간단한 설명입니다.' },
    { id: 11, name: '항목 K', depth: 1, parentId: null, code: 'A-011', description: '열한 번째 항목에 대한 간단한 설명입니다.' },
    { id: 12, name: '항목 L', depth: 1, parentId: null, code: 'A-012', description: '열두 번째 항목에 대한 간단한 설명입니다.' },
];

export function CategoryRenderer({ mode, widget, selectedParentId, onSelect }: CategoryRendererProps) {
    const isPreview = mode === 'preview';

    /* ── 상태 ── */
    const [items, setItems]               = useState<CategoryItem[]>([]);
    const [loading, setLoading]           = useState(false);
    const [selectedId, setSelectedId]     = useState<number | null>(null);

    /* 등록/수정 입력 상태 */
    const [inputName, setInputName]       = useState('');
    const [showInput, setShowInput]       = useState(false);   // 등록 입력창 표시
    const [editId, setEditId]             = useState<number | null>(null); // 수정 중인 항목 ID
    const [editName, setEditName]         = useState('');

    /* ── depth 2 이상: 상위 선택 없으면 목록 비움 ── */
    const needsParent = widget.depth > 1 && widget.parentWidgetId;
    const parentNotSelected = needsParent && selectedParentId == null;

    /* ── 목록 조회 ── */
    const fetchItems = useCallback(async () => {
        if (isPreview) { setItems(PREVIEW_ITEMS); return; }
        if (!widget.dbSlug) return;
        if (parentNotSelected) { setItems([]); return; }

        setLoading(true);
        try {
            const params: Record<string, string> = { eq_depth: String(widget.depth) };
            /* 상위 선택값이 있으면 parentId 필터 적용 */
            if (widget.depth > 1 && selectedParentId != null) {
                params.eq_parentId = String(selectedParentId);
            }
            const res = await api.get(`/page-data/${widget.dbSlug}`, { params });
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({
                    id: item.id,
                    name: String(item.dataJson.name ?? ''),
                    depth: Number(item.dataJson.depth ?? widget.depth),
                    parentId: item.dataJson.parentId != null ? Number(item.dataJson.parentId) : null,
                    code: item.dataJson.code != null ? String(item.dataJson.code) : undefined,
                    description: item.dataJson.description != null ? String(item.dataJson.description) : undefined,
                }));
            setItems(rows);
        } catch {
            toast.error('카테고리 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    }, [isPreview, widget.dbSlug, widget.depth, widget.parentWidgetId, selectedParentId, parentNotSelected]);

    /* 상위 선택값이 바뀔 때마다 재조회 + 선택 초기화 */
    useEffect(() => {
        setSelectedId(null);
        onSelect?.(widget.widgetId, null);
        fetchItems();
    }, [selectedParentId]);

    /* 최초 마운트 조회 */
    useEffect(() => { fetchItems(); }, []);

    /* ── 항목 선택 ── */
    const handleSelect = (item: CategoryItem) => {
        if (isPreview) return;
        const next = selectedId === item.id ? null : item.id;
        setSelectedId(next);
        onSelect?.(widget.widgetId, next);
    };

    /* ── 등록 ── */
    const handleCreate = async () => {
        if (!inputName.trim()) { toast.warning('이름을 입력하세요.'); return; }
        try {
            const dataJson: Record<string, unknown> = {
                name: inputName.trim(),
                depth: widget.depth,
            };
            /* depth 2 이상이면 상위 선택값을 parentId로 저장 */
            if (widget.depth > 1 && selectedParentId != null) {
                dataJson.parentId = selectedParentId;
            }
            await api.post(`/page-data/${widget.dbSlug}`, { dataJson });
            toast.success('등록되었습니다.');
            setInputName('');
            setShowInput(false);
            fetchItems();
        } catch {
            toast.error('등록 중 오류가 발생했습니다.');
        }
    };

    /* ── 수정 ── */
    const handleEdit = async (id: number) => {
        if (!editName.trim()) { toast.warning('이름을 입력하세요.'); return; }
        const target = items.find(i => i.id === id);
        if (!target) return;
        try {
            const dataJson: Record<string, unknown> = {
                name: editName.trim(),
                depth: target.depth,
            };
            if (target.parentId != null) dataJson.parentId = target.parentId;
            await api.put(`/page-data/${widget.dbSlug}/${id}`, { dataJson });
            toast.success('수정되었습니다.');
            setEditId(null);
            setEditName('');
            fetchItems();
        } catch {
            toast.error('수정 중 오류가 발생했습니다.');
        }
    };

    /* ── 삭제 ── */
    const handleDelete = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await api.delete(`/page-data/${widget.dbSlug}/${id}`);
            toast.success('삭제되었습니다.');
            /* 삭제된 항목이 선택 중이었으면 선택 해제 */
            if (selectedId === id) {
                setSelectedId(null);
                onSelect?.(widget.widgetId, null);
            }
            fetchItems();
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    /* ── 래퍼 스타일 ── */
    const wrapperCls = `h-full w-full rounded overflow-hidden flex flex-col bg-white ${widget.showBorder !== false ? 'border border-slate-200' : ''}`;

    return (
        <div className={wrapperCls}>

            {/* 헤더: 레이블 + 등록 버튼 */}
            <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200 flex-shrink-0">
                <span className="text-xs font-semibold text-slate-700">
                    {widget.label || `카테고리 (depth ${widget.depth})`}
                </span>
                {/* 등록 버튼 — live: 활성 / preview: 구조 확인용으로 흐릿하게 표시 */}
                {(widget.allowCreate !== false) && !parentNotSelected && (
                    <button
                        onClick={() => { if (!isPreview) { setShowInput(v => !v); setInputName(''); } }}
                        className={`flex items-center gap-1 text-[11px] transition-colors ${
                            isPreview
                                ? 'pointer-events-none opacity-40 text-slate-500'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        <Plus className="w-3.5 h-3.5" />
                        추가
                    </button>
                )}
            </div>

            {/* 등록 입력창 */}
            {showInput && (
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-slate-100 bg-slate-50 flex-shrink-0">
                    <input
                        type="text"
                        autoFocus
                        value={inputName}
                        onChange={e => setInputName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowInput(false); }}
                        placeholder="카테고리 이름"
                        className="flex-1 border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400"
                    />
                    <button onClick={handleCreate} className="p-1 text-emerald-600 hover:text-emerald-700">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setShowInput(false)} className="p-1 text-slate-400 hover:text-slate-600">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* 항목 목록 — flex-1로 남은 높이 채우고, 항목 많으면 스크롤 */}
            <div className="flex-1 min-h-0 overflow-y-auto">

                {/* 상위 미선택 안내 */}
                {parentNotSelected && (
                    <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">상위 카테고리를 선택하세요</span>
                    </div>
                )}

                {/* 로딩 */}
                {!parentNotSelected && loading && (
                    <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300">불러오는 중...</span>
                    </div>
                )}

                {/* 항목 없음 */}
                {!parentNotSelected && !loading && items.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <span className="text-[11px] text-slate-300 italic">항목이 없습니다</span>
                    </div>
                )}

                {/* 항목 카드 목록 */}
                {!parentNotSelected && !loading && items.length > 0 && (
                    <div className="p-2 space-y-1.5">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                className={`group relative rounded-lg border cursor-pointer transition-all
                                    ${selectedId === item.id
                                        ? 'bg-slate-900 border-slate-700 shadow-md'
                                        : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-sm'
                                    }`}
                            >
                                {/* 선택 강조 — 좌측 액센트 바 */}
                                {selectedId === item.id && (
                                    <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-emerald-400 rounded-r" />
                                )}

                                {/* 수정 입력창 */}
                                {editId === item.id ? (
                                    <div className="flex items-center gap-1.5 px-3 py-2.5">
                                        <input
                                            type="text"
                                            autoFocus
                                            value={editName}
                                            onChange={e => setEditName(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleEdit(item.id); if (e.key === 'Escape') setEditId(null); }}
                                            onClick={e => e.stopPropagation()}
                                            className="flex-1 border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                                        />
                                        <button onClick={e => { e.stopPropagation(); handleEdit(item.id); }} className="p-0.5 text-emerald-600 hover:text-emerald-700">
                                            <Check className="w-3 h-3" />
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setEditId(null); }} className="p-0.5 text-slate-400 hover:text-slate-600">
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="px-3 py-2.5">

                                        {/* 1행: 코드 | 타이틀 | 우측 버튼 */}
                                        <div className="flex items-center gap-2 mb-1">
                                            {item.code && (
                                                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                                    selectedId === item.id
                                                        ? 'bg-white/20 text-white/80'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {item.code}
                                                </span>
                                            )}
                                            <span className={`flex-1 text-xs font-semibold truncate ${
                                                selectedId === item.id ? 'text-white' : 'text-slate-800'
                                            }`}>
                                                {item.name}
                                            </span>
                                            {/* live: hover 시 수정/삭제 / preview: ChevronRight */}
                                            {!isPreview ? (
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                                    onClick={e => e.stopPropagation()}>
                                                    {(widget.allowEdit !== false) && (
                                                        <button
                                                            onClick={() => { setEditId(item.id); setEditName(item.name); }}
                                                            className={`p-0.5 transition-colors ${selectedId === item.id ? 'text-slate-300 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
                                                        >
                                                            <Pencil className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                    {(widget.allowDelete !== false) && (
                                                        <button
                                                            onClick={() => handleDelete(item.id)}
                                                            className={`p-0.5 transition-colors ${selectedId === item.id ? 'text-slate-300 hover:text-red-300' : 'text-slate-400 hover:text-red-500'}`}
                                                        >
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <ChevronRight className={`w-3 h-3 flex-shrink-0 ${selectedId === item.id ? 'text-white/40' : 'text-slate-300'}`} />
                                            )}
                                        </div>

                                        {/* 2행: 설명 */}
                                        {item.description && (
                                            <p className={`text-[10px] line-clamp-1 ${
                                                selectedId === item.id ? 'text-white/60' : 'text-slate-400'
                                            }`}>
                                                {item.description}
                                            </p>
                                        )}

                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
