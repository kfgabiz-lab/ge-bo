'use client';

/**
 * ApiInfoSelectField — API 정보(api_info) 연결 공통 Autocomplete 컴포넌트
 *
 * 사용법:
 *   <ApiInfoSelectField
 *     value={values.apiInfoId}
 *     onChange={id => onChange({ apiInfoId: id })}
 *     apiInfoOptions={apiInfoOptions}
 *   />
 *
 * SlugSelectField와 동일하게 공통 코어 AutocompleteSelectField<T, V>를 사용하되,
 * value/onChange 타입이 string이 아닌 number(api_info.id)이고 "빈 값"이 undefined라는 점만 다르다.
 * → API 도메인 전용 타입/포맷(값=id number, 필터=name/method/urlPattern, 표시="METHOD name")만
 *   지정하는 얇은 래퍼다. (동작은 기존과 동일 — 리팩토링이지 기능 변경 아님)
 */

import React from 'react';
import { AutocompleteSelectField } from './AutocompleteSelectField';

/** API 정보 옵션 — GET /api-infos/active 응답 축약형 */
export interface ApiInfoOption {
    id: number;
    name: string;
    method: string;
    urlPattern: string;
    /** 이 API가 slug entity와 연결된 저장 API인지 여부 — 값이 있으면 entity 저장 경로(flat 바디 필수) */
    connectedEntity?: string | null;
}

interface ApiInfoSelectFieldProps {
    /** 선택된 api_info.id — 값 없으면 undefined */
    value: number | undefined;
    onChange: (id: number | undefined) => void;
    apiInfoOptions: ApiInfoOption[];
    /** 드롭다운 라벨 — 기본값: "연결 API" */
    label?: string;
    /** * 표시 여부 — 기본값: false */
    required?: boolean;
    /** 빈 값 옵션 텍스트 — 기본값: "— API 선택 —" */
    emptyLabel?: string;
    /** true 시 라벨 렌더링 생략 — flex 행 인라인 배치 시 사용 */
    hideLabel?: boolean;
}

/** 옵션 표시 텍스트 포맷: "METHOD name" */
const formatOption = (opt: ApiInfoOption) => `${opt.method} ${opt.name}`;

export function ApiInfoSelectField({
    value,
    onChange,
    apiInfoOptions,
    label = '연결 API',
    required = false,
    emptyLabel = '— API 선택 —',
    hideLabel = false,
}: ApiInfoSelectFieldProps) {
    return (
        <AutocompleteSelectField<ApiInfoOption, number | undefined>
            value={value}
            onChange={onChange}
            options={apiInfoOptions}
            emptyValue={undefined}
            getOptionValue={opt => opt.id}
            getOptionKey={opt => opt.id}
            getDisplayText={formatOption}
            filterOption={(opt, q) =>
                opt.name.toLowerCase().includes(q)
                || opt.method.toLowerCase().includes(q)
                || opt.urlPattern.toLowerCase().includes(q)
            }
            /* 목록 표시 — "METHOD name (urlPattern)" */
            renderOption={opt => (
                <>
                    {opt.method} {opt.name}
                    <span className="text-slate-400 ml-1">({opt.urlPattern})</span>
                </>
            )}
            label={label}
            required={required}
            emptyLabel={emptyLabel}
            hideLabel={hideLabel}
        />
    );
}
