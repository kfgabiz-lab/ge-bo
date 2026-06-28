'use client';

/**
 * SlugSelectField — slug 레지스트리 연결 공통 Autocomplete 컴포넌트
 *
 * 사용법:
 *   <SlugSelectField
 *     value={widget.connectedSlug ?? ''}
 *     onChange={slug => onChange({ ...widget, connectedSlug: slug || undefined })}
 *     slugOptions={slugOptions}
 *   />
 *
 * label / required / emptyLabel 선택 override 가능.
 * 입력창에 검색어를 타이핑하면 name/slug 기준으로 실시간 필터링.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';

export interface SlugOption {
    id: number;
    slug: string;
    name: string;
}

interface SlugSelectFieldProps {
    value: string;
    onChange: (slug: string) => void;
    slugOptions: SlugOption[];
    /** 드롭다운 라벨 — 기본값: "연결 Slug" */
    label?: string;
    /** * 표시 여부 — 기본값: false */
    required?: boolean;
    /** 빈 값 옵션 텍스트 — 기본값: "선택 안 함" */
    emptyLabel?: string;
    /** true 시 라벨 렌더링 생략 — flex 행 인라인 배치 시 사용 */
    hideLabel?: boolean;
    /** 선택 후 입력창에 표시할 텍스트 커스터마이징 — 기본값: "name (slug)" */
    formatDisplay?: (opt: SlugOption) => string;
}

/** 옵션 표시 텍스트 포맷: "name (slug)" */
const formatOption = (opt: SlugOption) => `${opt.name} (${opt.slug})`;

export function SlugSelectField({
    value,
    onChange,
    slugOptions,
    label = '연결 Slug',
    required = false,
    emptyLabel = '선택 안 함',
    hideLabel = false,
    formatDisplay,
}: SlugSelectFieldProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    /* 옵션 표시 텍스트 — formatDisplay prop 우선, 없으면 기본 "name (slug)" */
    const getDisplayText = (opt: SlugOption) => formatDisplay ? formatDisplay(opt) : formatOption(opt);

    /* value 외부 변경 시 입력창 텍스트 동기화 */
    useEffect(() => {
        const opt = slugOptions.find(s => s.slug === value);
        setSearch(opt ? getDisplayText(opt) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, slugOptions]);

    /* 외부 클릭 시 드롭다운 닫기 + 입력창 원상복구 */
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                const opt = slugOptions.find(s => s.slug === value);
                setSearch(opt ? getDisplayText(opt) : '');
            }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, slugOptions]);

    /* 검색어 기반 필터링 — name 또는 slug 포함 여부 */
    const filtered = useMemo(() => {
        if (!search) return slugOptions;
        const q = search.toLowerCase();
        return slugOptions.filter(s =>
            s.name.toLowerCase().includes(q) || s.slug.toLowerCase().includes(q)
        );
    }, [search, slugOptions]);

    const handleSelect = (opt: SlugOption) => {
        onChange(opt.slug);
        setSearch(getDisplayText(opt));
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setSearch('');
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setIsOpen(true);
        /* 타이핑 시작 시 기존 선택 해제 */
        if (value) onChange('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            const opt = slugOptions.find(s => s.slug === value);
            setSearch(opt ? formatOption(opt) : '');
        }
    };

    return (
        <div ref={containerRef}>
            {!hideLabel && (
                <label className={LABEL_CLS}>
                    {label}
                    {required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
            )}
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={emptyLabel}
                    className={INPUT_CLS}
                />
                {/* 선택 해제 버튼 — 값이 있을 때만 표시 */}
                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs leading-none"
                    >
                        ✕
                    </button>
                )}

                {/* 자동완성 드롭다운 */}
                {isOpen && (
                    <div className="absolute z-50 w-full mt-0.5 bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
                        {/* 빈값 선택 옵션 */}
                        <div
                            onMouseDown={handleClear}
                            className="px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 cursor-pointer"
                        >
                            {emptyLabel}
                        </div>
                        {filtered.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-slate-400">검색 결과 없음</div>
                        ) : (
                            filtered.map(s => (
                                <div
                                    key={s.id}
                                    onMouseDown={() => handleSelect(s)}
                                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${
                                        s.slug === value
                                            ? 'bg-slate-100 font-semibold text-slate-900'
                                            : 'text-slate-700'
                                    }`}
                                >
                                    {s.name}
                                    <span className="text-slate-400 ml-1">({s.slug})</span>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
