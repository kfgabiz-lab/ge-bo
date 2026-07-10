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
 *
 * WHY Portal: 드롭다운이 `position:absolute`(자기 위치 기준)이면 스크롤 설정 패널
 * (`overflow-y-auto`)이나 모달 안에서 드롭다운이 잘리거나 가려진다.
 * → `bo/src/components/slug/slug-selector.tsx`, `bo/src/components/i18n/message-key-selector.tsx`에
 *   이미 동일한 `document.body` Portal 렌더링 + `position:fixed` 좌표 계산 로직이 각자 인라인으로
 *   중복 구현되어 있어, 그 패턴을 참고해 공통 훅(`@/hooks/use-dropdown-position`,
 *   `@/hooks/use-outside-click`)으로 추출하여 이 컴포넌트에 적용했다.
 *   (slug-selector.tsx / message-key-selector.tsx 자체는 이번 작업 범위 밖이라 아직
 *   인라인 구현 그대로이며 공통 훅으로 통합되지 않았다.)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { useDropdownPosition } from '@/hooks/use-dropdown-position';
import { useOutsideClick } from '@/hooks/use-outside-click';

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
    /* 라벨+입력 영역 전체 — 외부클릭 판정용 */
    const containerRef = useRef<HTMLDivElement>(null);
    /* input을 감싸는 relative div — Portal 드롭다운 위치 계산 anchor(폭·좌표 기준) */
    const inputWrapperRef = useRef<HTMLDivElement>(null);
    /* Portal로 body에 렌더링되는 드롭다운 콘텐츠 — 외부클릭 판정용 두 번째 ref */
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    /* 드롭다운 위치(top/left/width) 계산 — input 폭 그대로 사용(minWidth 미지정) */
    const { style: dropdownStyle, calcPos } = useDropdownPosition(inputWrapperRef, isOpen);

    /* 옵션 표시 텍스트 — formatDisplay prop 우선, 없으면 기본 "name (slug)" */
    const getDisplayText = (opt: SlugOption) => formatDisplay ? formatDisplay(opt) : formatOption(opt);

    /* value 외부 변경 시 입력창 텍스트 동기화 */
    useEffect(() => {
        const opt = slugOptions.find(s => s.slug === value);
        setSearch(opt ? getDisplayText(opt) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, slugOptions]);

    /* 외부 클릭 시 드롭다운 닫기 + 입력창 원상복구
       → containerRef(입력 영역)와 dropdownRef(Portal 드롭다운) 둘 다 아닐 때만 닫힘 */
    const closeAndRestore = useCallback(() => {
        setIsOpen(false);
        const opt = slugOptions.find(s => s.slug === value);
        setSearch(opt ? getDisplayText(opt) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, slugOptions]);
    useOutsideClick([containerRef, dropdownRef], closeAndRestore, isOpen);

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
        calcPos();
        /* 타이핑 시작 시 기존 선택 해제 */
        if (value) onChange('');
    };

    const handleFocus = () => {
        setIsOpen(true);
        calcPos();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            const opt = slugOptions.find(s => s.slug === value);
            setSearch(opt ? getDisplayText(opt) : '');
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
            <div ref={inputWrapperRef} className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
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
            </div>

            {/* 자동완성 드롭다운 — Portal로 body에 렌더링(모달·overflow 컨테이너에 가리지 않음) */}
            {isOpen && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto"
                >
                    {/* 빈값 선택 옵션 */}
                    <div
                        onClick={handleClear}
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
                                onClick={() => handleSelect(s)}
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
                </div>,
                document.body
            )}
        </div>
    );
}
