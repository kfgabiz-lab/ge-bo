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
 * 구현: 검색 필터 + Portal 드롭다운 로직은 공통 코어 AutocompleteSelectField<T, V>로 추출되었고,
 * 이 컴포넌트는 slug 도메인 전용 타입/포맷(값=slug 문자열, 필터=name/slug, 표시="name (slug)")만
 * 지정하는 얇은 래퍼다. (동작은 기존과 동일 — 리팩토링이지 기능 변경 아님)
 */

import React from 'react';
import { AutocompleteSelectField } from './AutocompleteSelectField';

export interface SlugOption {
    id: number;
    slug: string;
    name: string;
    /** 연결된 Slug Entity ID — entity 연결 slug만 필터링할 때 사용 (예: OutputModePanel "연결 Entity" 선택) */
    entityId?: number;
    /** 연결된 Slug Entity 표시명 — formatDisplay에서 "slug (entityName)" 형태로 표시할 때 사용 */
    entityName?: string;
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
    /* 옵션 표시 텍스트 — formatDisplay prop 우선, 없으면 기본 "name (slug)" */
    const getDisplayText = (opt: SlugOption) => (formatDisplay ? formatDisplay(opt) : formatOption(opt));

    return (
        <AutocompleteSelectField<SlugOption, string>
            value={value}
            onChange={onChange}
            options={slugOptions}
            emptyValue=""
            getOptionValue={opt => opt.slug}
            getOptionKey={opt => opt.id}
            getDisplayText={getDisplayText}
            filterOption={(opt, q) =>
                opt.name.toLowerCase().includes(q) || opt.slug.toLowerCase().includes(q)
            }
            /* 목록 표시 — formatDisplay 있으면 그 텍스트, 없으면 "name (slug)" 강조 마크업 */
            renderOption={
                formatDisplay
                    ? undefined
                    : opt => (
                          <>
                              {opt.name}
                              <span className="text-slate-400 ml-1">({opt.slug})</span>
                          </>
                      )
            }
            label={label}
            required={required}
            emptyLabel={emptyLabel}
            hideLabel={hideLabel}
        />
    );
}
