'use client';

/**
 * MultiSelectRenderer — 다중선택 컨텐츠 위젯 렌더러
 *
 * 연결된 slug에서 옵션 목록을 가져와 체크박스 드롭다운으로 선택하고,
 * 선택된 항목을 태그로 표시한다. 저장 시 ID 배열을 contentKey로 저장한다.
 *
 * [동작]
 * - 입력창 클릭 → 드롭다운 열림
 * - 텍스트 입력 → 옵션 필터링
 * - 체크박스 클릭 → 선택/해제 (드롭다운 유지)
 * - 하단 태그 X → 해당 항목 선택 해제
 *
 * [모드]
 * - preview: 샘플 데이터, 드롭다운 항상 노출 (disabled)
 * - live: sourceSlug에서 전체 로드, 선택값 관리
 *
 * 사용법:
 *   <MultiSelectRenderer mode="preview" widget={widget} />
 *   <MultiSelectRenderer mode="live" widget={widget} selectedIds={ids} onChange={setIds} />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import api from '@/lib/api';
import { RendererContainer } from './RendererContainer';
import { FieldRenderer } from './FieldRenderer';
import type { MultiSelectWidget, MultiSelectExtraField, RendererMode } from './types';
import type { SearchFieldConfig } from '../../types';
import { useI18n } from '@/hooks/use-i18n';

/* ── 샘플 데이터 (preview 모드 전용) ── */
const PREVIEW_OPTIONS = [
    { id: 1, name: '홍길동', dept: '개발팀' },
    { id: 2, name: '이순신', dept: '운영팀' },
    { id: 3, name: '강감찬', dept: '기획팀' },
    { id: 4, name: '유관순', dept: '마케팅팀' },
    { id: 5, name: '세종대왕', dept: '경영팀' },
];
const PREVIEW_SELECTED_IDS = [1, 3];

/* ── 옵션 항목 타입 ── */
interface OptionItem {
    id: number;
    [key: string]: unknown;
}

/* ── Props ── */
export interface MultiSelectRendererProps {
    mode: RendererMode;
    widget: MultiSelectWidget;
    /** live 모드 — 현재 선택된 ID 배열 */
    selectedIds?: number[];
    /** live 모드 — 선택 변경 콜백 */
    onChange?: (ids: number[]) => void;
    /**
     * live 모드 — 항목별 추가 입력 필드 값
     * { [itemId]: { [fieldId]: value } }
     */
    extraFieldValues?: Record<number, Record<string, string>>;
    /** live 모드 — 추가 필드 값 변경 콜백 */
    onExtraFieldChange?: (itemId: number, fieldId: string, value: string) => void;
}

/**
 * MultiSelectExtraField → SearchFieldConfig 변환
 * FieldRenderer 재사용을 위해 최소 필드만 매핑
 */
function toFieldConfig(f: MultiSelectExtraField): SearchFieldConfig {
    return {
        id: f.key,                    // 저장 키는 key 사용 (id는 DnD 내부 식별자)
        type: f.type,
        label: f.label,
        colSpan: 1,
        options: f.options,
        required: f.required,
        placeholder: f.placeholder,
    };
}

/* ── 유틸: dot notation 경로로 중첩 객체 값 접근 (예: "form.title" → item['form']['title']) ── */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
        if (acc !== null && typeof acc === 'object') {
            return (acc as Record<string, unknown>)[key];
        }
        return undefined;
    }, obj);
}

/* ── 유틸: labelFields로 표시 텍스트 생성 (dot notation 지원) ── */
function buildLabel(item: OptionItem, labelFields: string): string {
    return labelFields
        .split(',')
        .map(f => String(getNestedValue(item as Record<string, unknown>, f.trim()) ?? ''))
        .filter(Boolean)
        .join(' > ');
}

export function MultiSelectRenderer({ mode, widget, selectedIds = [], onChange, extraFieldValues = {}, onExtraFieldChange }: MultiSelectRendererProps) {
    const isPreview = mode === 'preview';
    const { t } = useI18n();
    const labelFields = widget.labelFields || 'name';

    /* ── 상태 ── */
    const [options,  setOptions]  = useState<OptionItem[]>([]);
    const [selected, setSelected] = useState<number[]>(isPreview ? PREVIEW_SELECTED_IDS : selectedIds);
    const [search,   setSearch]   = useState('');
    const [isOpen,   setIsOpen]   = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    /* ── 옵션 로드 ── */
    useEffect(() => {
        if (isPreview) {
            setOptions(PREVIEW_OPTIONS as OptionItem[]);
            return;
        }
        if (!widget.sourceSlug) return;
        /* 호출 slug에서 전체 목록 한 번에 로드 (페이징 없음) */
        api.get(`/page-data/${widget.sourceSlug}`, { params: { size: 9999 } })
            .then(res => {
                const rows = (res.data.content ?? []) as { dataJson: Record<string, unknown> }[];
                setOptions(rows.map(r => ({ id: Number(r.dataJson['id'] ?? 0), ...r.dataJson })));
            })
            .catch(() => {});
    }, [isPreview, widget.sourceSlug]);

    /* ── live: 외부 selectedIds 동기화 ── */
    useEffect(() => {
        if (!isPreview) setSelected(selectedIds);
    }, [isPreview, selectedIds]);

    /* ── 바깥 클릭 시 드롭다운 닫기 ── */
    useEffect(() => {
        function handleOutsideClick(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleOutsideClick);
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, []);

    /* ── 체크 토글 ── */
    const toggleItem = useCallback((id: number) => {
        setSelected(prev => {
            const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
            onChange?.(next);
            return next;
        });
    }, [onChange]);

    /* ── 태그 제거 ── */
    const removeItem = useCallback((id: number) => {
        setSelected(prev => {
            const next = prev.filter(x => x !== id);
            onChange?.(next);
            return next;
        });
    }, [onChange]);

    /* ── 필터링된 옵션 ── */
    const filteredOptions = options.filter(opt => {
        if (!search) return true;
        return buildLabel(opt, labelFields).toLowerCase().includes(search.toLowerCase());
    });

    /* ── 선택된 옵션 (태그 표시용) ── */
    const selectedOptions = options.filter(opt => selected.includes(opt.id));

    return (
        <RendererContainer showBorder={widget.showBorder ?? true} bgColor={widget.bgColor}>
            <div className="p-3 flex flex-col gap-3 h-full">

                {/* 타이틀 */}
                {(widget.titleMsgKey || widget.title) && (
                    <p className="text-sm font-medium text-slate-700">
                        {widget.titleMsgKey ? t(widget.titleMsgKey) : widget.title}
                    </p>
                )}

                {/* 설명 */}
                {(widget.descriptionMsgKey || widget.description) && (
                    <p className="text-xs text-slate-500">
                        {widget.descriptionMsgKey ? t(widget.descriptionMsgKey) : widget.description}
                    </p>
                )}

                {/* 드롭다운 영역 */}
                <div ref={containerRef} className="relative">

                    {/* 토글 버튼 */}
                    <button
                        type="button"
                        disabled={isPreview}
                        onClick={() => setIsOpen(prev => !prev)}
                        className="w-full flex items-center justify-between gap-2 px-3 py-2 border border-slate-300 rounded-md bg-white text-sm hover:border-slate-400 transition-colors disabled:cursor-default"
                    >
                        <span className={selected.length > 0 ? 'text-slate-800' : 'text-slate-400'}>
                            {selected.length > 0
                                ? `${selected.length}개 선택됨`
                                : (widget.placeholderMsgKey ? t(widget.placeholderMsgKey) : (widget.placeholder ?? '항목을 선택하세요'))}
                        </span>
                        <ChevronDown className={`w-4 h-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* 드롭다운 패널 — live: 클릭 시 절대 위치로 표시, preview: 닫힌 상태 유지 */}
                    {isOpen && (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg">

                            {/* 검색 입력 */}
                            <div className="p-2 border-b border-slate-100">
                                <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded border border-slate-200">
                                    <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                    <input
                                        type="text"
                                        disabled={isPreview}
                                        value={search}
                                        onChange={e => setSearch(e.target.value)}
                                        placeholder="검색..."
                                        className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 outline-none"
                                    />
                                </div>
                            </div>

                            {/* 옵션 목록 */}
                            <ul className="max-h-48 overflow-y-auto py-1">
                                {filteredOptions.length === 0 ? (
                                    <li className="px-3 py-2 text-xs text-slate-400 text-center">
                                        항목이 없습니다
                                    </li>
                                ) : (
                                    filteredOptions.map(opt => {
                                        const isChecked = selected.includes(opt.id);
                                        return (
                                            <li key={opt.id}>
                                                <label className={`flex items-center gap-2.5 px-3 py-2 hover:bg-slate-50 transition-colors ${isPreview ? 'cursor-default' : 'cursor-pointer'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        disabled={isPreview}
                                                        onChange={() => !isPreview && toggleItem(opt.id)}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 accent-slate-800"
                                                    />
                                                    <span className="text-sm text-slate-700">
                                                        {buildLabel(opt, labelFields)}
                                                    </span>
                                                </label>
                                            </li>
                                        );
                                    })
                                )}
                            </ul>
                        </div>
                    )}
                </div>

                {/* 선택된 항목 목록 — 항목명 + 추가 필드 1줄 배치 */}
                {selectedOptions.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                        {selectedOptions.map(opt => {
                            const hasExtra = (widget.extraFields?.length ?? 0) > 0;
                            const itemVals = extraFieldValues[opt.id] ?? {};

                            return (
                                <div
                                    key={opt.id}
                                    className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 flex items-center gap-2 overflow-x-auto"
                                >
                                    {/* 항목명 — 고정 너비로 잘림 방지 */}
                                    <span className="text-xs font-medium text-slate-700 shrink-0 whitespace-nowrap">
                                        {buildLabel(opt, labelFields)}
                                    </span>

                                    {/* 구분선 */}
                                    {hasExtra && (
                                        <div className="w-px h-4 bg-slate-300 shrink-0" />
                                    )}

                                    {/* 추가 입력 필드 — 1줄 인라인 배치 */}
                                    {hasExtra && widget.extraFields!.map((ef, idx) => (
                                        <React.Fragment key={ef.id}>
                                            {/* 필드 사이 구분선 */}
                                            {idx > 0 && (
                                                <div className="w-px h-4 bg-slate-200 shrink-0" />
                                            )}
                                            <div className={`shrink-0 ${
                                                /* radio/checkbox는 auto, input/select/date는 고정 폭 */
                                                ef.type === 'radio' || ef.type === 'checkbox'
                                                    ? 'min-w-fit'
                                                    : 'w-[120px]'
                                            }`}>
                                                {/* FieldRenderer — placeholder에 label 대체 */}
                                                <FieldRenderer
                                                    mode={isPreview ? 'preview' : 'live'}
                                                    field={{
                                                        ...toFieldConfig(ef),
                                                        /* input/select/date는 placeholder로 label 표시 */
                                                        placeholder: ef.placeholder ?? ef.label,
                                                    }}
                                                    value={isPreview ? '' : (itemVals[ef.key] ?? '')}
                                                    onChange={v => onExtraFieldChange?.(opt.id, ef.key, v)}
                                                />
                                            </div>
                                        </React.Fragment>
                                    ))}

                                    {/* X버튼 — 오른쪽 끝 고정 */}
                                    <button
                                        type="button"
                                        disabled={isPreview}
                                        onClick={() => removeItem(opt.id)}
                                        className="ml-auto text-slate-400 hover:text-slate-600 transition-colors disabled:cursor-default shrink-0"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

            </div>
        </RendererContainer>
    );
}
