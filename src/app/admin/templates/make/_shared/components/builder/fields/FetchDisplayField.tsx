'use client';

/**
 * FetchDisplayField — 연결 Slug 다건 매칭 결과 표시 설정 (출력방식 + Data)
 *
 * 연결 Slug(ARRAY_CONTAINS 등)로 slave 레코드가 여러 건 매칭될 때
 * "한줄"(구분자로 합침) / "여러줄"(줄바꿈으로 나열) 중 표시 방식을 고르고,
 * 기존 Data 표현식(evalColumnDataExpr 문법)을 매칭된 레코드마다 반복 평가한다.
 *
 * TableBuilder(ColumnBaseField)와 Form 필드 컴포넌트가 공통으로 재사용하는 컴포넌트.
 *
 * 사용법:
 *   <FetchDisplayField
 *     fetchDisplayMode={values.fetchDisplayMode}
 *     data={values.data}
 *     onChange={patch => onChange(patch)}
 *   />
 */

import React from 'react';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';

export type FetchDisplayMode = 'ONE_LINE' | 'MULTI_LINE';

interface FetchDisplayFieldProps {
    fetchDisplayMode?: FetchDisplayMode;
    data?: string;
    onChange: (patch: { fetchDisplayMode?: FetchDisplayMode; data?: string }) => void;
}

export function FetchDisplayField({ fetchDisplayMode, data, onChange }: FetchDisplayFieldProps) {
    return (
        <div className="grid grid-cols-10 gap-2">
            {/* 출력방식 — 3/10 */}
            <div className="col-span-3">
                <label className={LABEL_CLS}>출력방식</label>
                <select
                    value={fetchDisplayMode ?? 'ONE_LINE'}
                    onChange={e => onChange({ fetchDisplayMode: e.target.value as FetchDisplayMode })}
                    className={INPUT_CLS}
                >
                    <option value="ONE_LINE">한줄</option>
                    <option value="MULTI_LINE">여러줄</option>
                </select>
            </div>
            {/* Data — 7/10 */}
            <div className="col-span-7">
                <label className={LABEL_CLS}>Data</label>
                <input
                    type="text"
                    value={data ?? ''}
                    onChange={e => onChange({ data: e.target.value || undefined })}
                    className={`${INPUT_CLS} font-mono`}
                    placeholder="예: code=1?title:title2"
                />
            </div>
        </div>
    );
}
