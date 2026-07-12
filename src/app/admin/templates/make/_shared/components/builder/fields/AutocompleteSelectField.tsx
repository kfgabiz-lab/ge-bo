'use client';

/**
 * AutocompleteSelectField<T, V> — 검색 필터 + Portal 드롭다운 공통 제네릭 코어
 *
 * WHY: SlugSelectField / ApiInfoSelectField 가 "입력창 + Portal 드롭다운 + 검색 필터"라는
 * 완전히 동일한 UI/동작을 각자 복붙으로 중복 구현하고 있었다.
 * (차이점은 값 타입(string vs number), API 옵션 필드명, 표시 텍스트 포맷뿐)
 * → 공통 로직을 이 제네릭 코어로 추출하고, 기존 2개 컴포넌트는 이 코어를 감싸는
 *   얇은 래퍼(도메인 전용 타입/포맷만 지정)로 남긴다. 동작은 기존과 100% 동일.
 *
 * 제네릭 파라미터:
 *   T — 옵션 항목 타입 (예: SlugOption, ApiInfoOption)
 *   V — 선택 값 타입 (예: string(slug), number(id))
 *
 * 값 비교는 getOptionValue(opt) === value 로 수행하므로 V는 primitive(string/number)여야 한다.
 * "빈 값"은 emptyValue prop으로 지정한다 (slug='', apiInfo=undefined).
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';
import { useDropdownPosition } from '@/hooks/use-dropdown-position';
import { useOutsideClick } from '@/hooks/use-outside-click';

export interface AutocompleteSelectFieldProps<T, V> {
    /** 현재 선택된 값 */
    value: V;
    /** 선택/해제 시 호출 — 해제 시 emptyValue 전달 */
    onChange: (value: V) => void;
    /** 옵션 목록 */
    options: T[];
    /** 옵션 → 비교/저장에 사용할 값 추출 */
    getOptionValue: (opt: T) => V;
    /** 옵션 → React key */
    getOptionKey: (opt: T) => React.Key;
    /** 옵션 → 입력창/목록 기본 표시 텍스트 */
    getDisplayText: (opt: T) => string;
    /** 검색 필터 — query(소문자)로 필터링 */
    filterOption: (opt: T, query: string) => boolean;
    /** 해제 시 onChange에 전달할 빈 값 (예: '' 또는 undefined) */
    emptyValue: V;
    /** 값이 비었는지 판정 — 미지정 시 value === emptyValue */
    isEmpty?: (value: V) => boolean;
    /** 목록 항목 커스텀 렌더링 — 미지정 시 getDisplayText(opt) 텍스트 사용 */
    renderOption?: (opt: T, selected: boolean) => React.ReactNode;
    /** 드롭다운 라벨 */
    label?: string;
    /** * 표시 여부 — 기본값: false */
    required?: boolean;
    /** 빈 값 옵션/placeholder 텍스트 */
    emptyLabel?: string;
    /** true 시 라벨 렌더링 생략 — flex 행 인라인 배치 시 사용 */
    hideLabel?: boolean;
}

export function AutocompleteSelectField<T, V>({
    value,
    onChange,
    options,
    getOptionValue,
    getOptionKey,
    getDisplayText,
    filterOption,
    emptyValue,
    isEmpty,
    renderOption,
    label = '선택',
    required = false,
    emptyLabel = '선택 안 함',
    hideLabel = false,
}: AutocompleteSelectFieldProps<T, V>) {
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

    /* 값이 비었는지 판정 — isEmpty prop 우선, 없으면 emptyValue와 동일한지 비교 */
    const valueIsEmpty = isEmpty ? isEmpty(value) : value === emptyValue;

    /* 현재 값에 해당하는 옵션 조회 */
    const findSelected = useCallback(
        () => options.find(o => getOptionValue(o) === value),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [options, value],
    );

    /* value 외부 변경 시 입력창 텍스트 동기화 */
    useEffect(() => {
        const opt = findSelected();
        setSearch(opt ? getDisplayText(opt) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, options]);

    /* 외부 클릭 시 드롭다운 닫기 + 입력창 원상복구
       → containerRef(입력 영역)와 dropdownRef(Portal 드롭다운) 둘 다 아닐 때만 닫힘 */
    const closeAndRestore = useCallback(() => {
        setIsOpen(false);
        const opt = findSelected();
        setSearch(opt ? getDisplayText(opt) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value, options]);
    useOutsideClick([containerRef, dropdownRef], closeAndRestore, isOpen);

    /* 검색어 기반 필터링 — filterOption prop 위임 */
    const filtered = useMemo(() => {
        if (!search) return options;
        const q = search.toLowerCase();
        return options.filter(o => filterOption(o, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, options]);

    const handleSelect = (opt: T) => {
        onChange(getOptionValue(opt));
        setSearch(getDisplayText(opt));
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange(emptyValue);
        setSearch('');
        setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        setIsOpen(true);
        calcPos();
        /* 타이핑 시작 시 기존 선택 해제 */
        if (!valueIsEmpty) onChange(emptyValue);
    };

    const handleFocus = () => {
        setIsOpen(true);
        calcPos();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            const opt = findSelected();
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
                {!valueIsEmpty && (
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
                        filtered.map(opt => {
                            const selected = getOptionValue(opt) === value;
                            return (
                                <div
                                    key={getOptionKey(opt)}
                                    onClick={() => handleSelect(opt)}
                                    className={`px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 ${
                                        selected
                                            ? 'bg-slate-100 font-semibold text-slate-900'
                                            : 'text-slate-700'
                                    }`}
                                >
                                    {/* renderOption 우선, 없으면 기본 표시 텍스트 */}
                                    {renderOption ? renderOption(opt, selected) : getDisplayText(opt)}
                                </div>
                            );
                        })
                    )}
                </div>,
                document.body
            )}
        </div>
    );
}
