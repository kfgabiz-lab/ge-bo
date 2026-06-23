'use client';

/**
 * DataGenerationSection — 데이터생성 설정 섹션 컴포넌트
 *
 * Input / FormTextarea 빌더 필드 하단에 공통으로 사용.
 * 추가 버튼으로 세트를 늘릴 수 있으며, 세트별로 독립된 생성KEY + 4가지 변환옵션을 제공한다.
 *
 * 사용법:
 *   <DataGenerationSection values={values} onChange={onChange} />
 */

import React from 'react';
import type { FieldEditValues } from './types';
import type { DataGenerationEntry } from './types';

/* _FieldBase에서 공통 스타일 상수 가져오기 */
import { LABEL_CLS, INPUT_CLS } from './_FieldBase';

/** DataGenerationSection에서 사용하는 값 타입 */
export interface DataGenerationValues {
    generationKey?: string;
    dataReplacement?: 'none' | 'hyphen';
    caseChange?: 'none' | 'upper' | 'lower';
    appendText?: string;
    truncateLength?: number;
}

interface DataGenerationSectionProps {
    /** 현재 필드 편집 값 */
    values: Pick<FieldEditValues, 'generationKey' | 'dataReplacement' | 'caseChange' | 'appendText' | 'truncateLength' | 'dataGenerations'>;
    /** 변경 핸들러 */
    onChange: (updates: Partial<FieldEditValues>) => void;
}

/** select 공통 스타일 */
const SELECT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none appearance-none bg-white';

/** 빈 세트 초기값 */
const EMPTY_ENTRY: DataGenerationEntry = { generationKey: '' };

/** 세트 1개 UI — 생성KEY + 2열 그리드(데이터변경|문자변경) + 2열 그리드(텍스트추가|글자자르기) */
function GenerationEntryRow({
    entry,
    index,
    onChange,
    onRemove,
}: {
    entry: DataGenerationEntry;
    index: number;
    onChange: (updated: DataGenerationEntry) => void;
    onRemove: () => void;
}) {
    return (
        <div className="pl-2 border-l-2 border-slate-100 space-y-1.5">
            {/* 세트 헤더: 번호 + 삭제 버튼 */}
            <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">세트 {index + 1}</span>
                <button
                    type="button"
                    onClick={onRemove}
                    className="text-[10px] text-red-400 hover:text-red-600 transition-colors"
                >
                    삭제
                </button>
            </div>

            {/* 생성 KEY */}
            <div>
                <label className={LABEL_CLS}>생성 KEY</label>
                <input
                    type="text"
                    value={entry.generationKey}
                    placeholder="fieldKey / contentKey.fieldKey / tabKey.contentKey.fieldKey"
                    onChange={e => onChange({ ...entry, generationKey: e.target.value })}
                    className={INPUT_CLS}
                />
            </div>

            {/* 2열 그리드: 데이터변경 | 문자변경 */}
            <div className="grid grid-cols-2 gap-1.5">
                {/* 데이터변경 */}
                <div>
                    <label className={LABEL_CLS}>데이터변경</label>
                    <select
                        value={entry.dataReplacement ?? 'none'}
                        onChange={e => onChange({ ...entry, dataReplacement: e.target.value as 'none' | 'hyphen' })}
                        className={SELECT_CLS}
                    >
                        <option value="none">없음</option>
                        <option value="hyphen">데이터치환(-)</option>
                    </select>
                    {entry.dataReplacement === 'hyphen' && (
                        <p className="text-[9px] text-slate-400 mt-0.5">공백·특수문자 → '-' 치환</p>
                    )}
                </div>

                {/* 문자변경 */}
                <div>
                    <label className={LABEL_CLS}>문자변경</label>
                    <select
                        value={entry.caseChange ?? 'none'}
                        onChange={e => onChange({ ...entry, caseChange: e.target.value as 'none' | 'upper' | 'lower' })}
                        className={SELECT_CLS}
                    >
                        <option value="none">없음</option>
                        <option value="upper">대문자로</option>
                        <option value="lower">소문자로</option>
                    </select>
                </div>
            </div>

            {/* 2열 그리드: 텍스트추가(끝) | 글자자르기 */}
            <div className="grid grid-cols-2 gap-1.5">
                {/* 텍스트추가(끝) */}
                <div>
                    <label className={LABEL_CLS}>텍스트추가(끝)</label>
                    <input
                        type="text"
                        value={entry.appendText ?? ''}
                        placeholder="끝에 추가할 텍스트"
                        onChange={e => onChange({ ...entry, appendText: e.target.value || undefined })}
                        className={INPUT_CLS}
                    />
                </div>

                {/* 글자자르기 */}
                <div>
                    <label className={LABEL_CLS}>글자자르기(자 미만)</label>
                    <input
                        type="number"
                        min={1}
                        value={entry.truncateLength ?? ''}
                        placeholder="0"
                        onChange={e => onChange({ ...entry, truncateLength: e.target.value ? Number(e.target.value) : undefined })}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                    />
                </div>
            </div>
        </div>
    );
}

export function DataGenerationSection({ values, onChange }: DataGenerationSectionProps) {
    /* dataGenerations 배열 — 없으면 기존 단일값(generationKey)을 1번 세트로 마이그레이션 */
    const entries: DataGenerationEntry[] = values.dataGenerations?.length
        ? values.dataGenerations
        : values.generationKey
            ? [{ generationKey: values.generationKey, dataReplacement: values.dataReplacement, caseChange: values.caseChange, appendText: values.appendText, truncateLength: values.truncateLength }]
            : [];

    /* 세트 1개 수정 */
    const handleChange = (index: number, updated: DataGenerationEntry) => {
        const next = entries.map((e, i) => (i === index ? updated : e));
        onChange({ dataGenerations: next, generationKey: undefined, dataReplacement: undefined, caseChange: undefined, appendText: undefined, truncateLength: undefined });
    };

    /* 세트 삭제 */
    const handleRemove = (index: number) => {
        const next = entries.filter((_, i) => i !== index);
        onChange({ dataGenerations: next.length ? next : undefined, generationKey: undefined, dataReplacement: undefined, caseChange: undefined, appendText: undefined, truncateLength: undefined });
    };

    /* 세트 추가 */
    const handleAdd = () => {
        onChange({ dataGenerations: [...entries, { ...EMPTY_ENTRY }], generationKey: undefined, dataReplacement: undefined, caseChange: undefined, appendText: undefined, truncateLength: undefined });
    };

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {/* 섹션 헤더 + 추가 버튼 */}
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">데이터생성</p>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="text-[10px] text-blue-500 hover:text-blue-700 transition-colors"
                >
                    + 추가
                </button>
            </div>

            {/* 세트 목록 */}
            {entries.map((entry, index) => (
                <GenerationEntryRow
                    key={index}
                    entry={entry}
                    index={index}
                    onChange={updated => handleChange(index, updated)}
                    onRemove={() => handleRemove(index)}
                />
            ))}
        </div>
    );
}
