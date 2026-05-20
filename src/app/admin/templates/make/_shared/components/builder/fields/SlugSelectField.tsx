'use client';

/**
 * SlugSelectField — slug 레지스트리 연결 공통 드롭다운
 *
 * 사용법:
 *   <SlugSelectField
 *     value={widget.connectedSlug ?? ''}
 *     onChange={slug => onChange({ ...widget, connectedSlug: slug || undefined })}
 *     slugOptions={slugOptions}
 *   />
 *
 * label / required / emptyLabel은 선택 override 가능.
 * 옵션 표시 형식은 "name (slug)"으로 통일.
 */

import React from 'react';
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
}

export function SlugSelectField({
    value,
    onChange,
    slugOptions,
    label = '연결 Slug',
    required = false,
    emptyLabel = '선택 안 함',
}: SlugSelectFieldProps) {
    return (
        <div>
            <label className={LABEL_CLS}>
                {label}
                {required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <select
                value={value}
                onChange={e => onChange(e.target.value)}
                className={INPUT_CLS}
            >
                <option value="">{emptyLabel}</option>
                {slugOptions.map(s => (
                    /* name (slug) 형식 — name이 사람이 읽기 쉽고 slug는 식별자로 참조 */
                    <option key={s.id} value={s.slug}>{s.name} ({s.slug})</option>
                ))}
            </select>
        </div>
    );
}
