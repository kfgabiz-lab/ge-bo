'use client';

/**
 * DataGenerationSection — 데이터생성 설정 섹션 컴포넌트
 *
 * Input / FormTextarea 빌더 필드 하단에 공통으로 사용.
 * 생성KEY 입력 + 4가지 자동변환 옵션을 제공하며,
 * live 모드에서 소스 필드 값이 변경될 때 생성KEY 대상 필드에 변환값을 자동 입력한다.
 *
 * 사용법:
 *   <DataGenerationSection values={values} onChange={onChange} />
 */

import React from 'react';
import type { FieldEditValues } from './types';

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
    values: Pick<FieldEditValues, 'generationKey' | 'dataReplacement' | 'caseChange' | 'appendText' | 'truncateLength'>;
    /** 변경 핸들러 */
    onChange: (updates: Partial<FieldEditValues>) => void;
}

/** select 공통 스타일 */
const SELECT_CLS = 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none appearance-none bg-white';

export function DataGenerationSection({ values, onChange }: DataGenerationSectionProps) {
    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            {/* 섹션 헤더 */}
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">데이터생성</p>

            {/* 생성 KEY */}
            <div>
                <label className={LABEL_CLS}>생성 KEY</label>
                <input
                    type="text"
                    value={values.generationKey ?? ''}
                    placeholder="fieldKey / contentKey.fieldKey / tabKey.contentKey.fieldKey"
                    onChange={e => onChange({ generationKey: e.target.value || undefined })}
                    className={INPUT_CLS}
                />
            </div>

            {/* 생성KEY가 입력된 경우에만 자동변환 옵션 표시 */}
            {values.generationKey && (
                <div className="space-y-1.5 pl-2 border-l-2 border-slate-100">
                    <p className="text-[10px] text-slate-400">자동변환 (동시 적용 가능)</p>

                    {/* 1. 데이터변경 */}
                    <div>
                        <label className={LABEL_CLS}>데이터변경</label>
                        <div className="relative">
                            <select
                                value={values.dataReplacement ?? 'none'}
                                onChange={e => onChange({ dataReplacement: e.target.value as 'none' | 'hyphen' })}
                                className={SELECT_CLS}
                            >
                                <option value="none">없음</option>
                                <option value="hyphen">데이터치환(-)</option>
                            </select>
                        </div>
                        {values.dataReplacement === 'hyphen' && (
                            <p className="text-[9px] text-slate-400 mt-0.5">공백·특수문자 → '-' 치환, 마지막 특수문자 제거</p>
                        )}
                    </div>

                    {/* 2. 문자변경 */}
                    <div>
                        <label className={LABEL_CLS}>문자변경</label>
                        <div className="relative">
                            <select
                                value={values.caseChange ?? 'none'}
                                onChange={e => onChange({ caseChange: e.target.value as 'none' | 'upper' | 'lower' })}
                                className={SELECT_CLS}
                            >
                                <option value="none">없음</option>
                                <option value="upper">대문자로</option>
                                <option value="lower">소문자로</option>
                            </select>
                        </div>
                    </div>

                    {/* 3. 텍스트추가(끝) */}
                    <div>
                        <label className={LABEL_CLS}>텍스트추가(끝)</label>
                        <input
                            type="text"
                            value={values.appendText ?? ''}
                            placeholder="끝에 추가할 텍스트"
                            onChange={e => onChange({ appendText: e.target.value || undefined })}
                            className={INPUT_CLS}
                        />
                    </div>

                    {/* 4. 글자자르기 */}
                    <div>
                        <label className={LABEL_CLS}>글자자르기</label>
                        <div className="flex items-center gap-1">
                            <input
                                type="number"
                                min={1}
                                value={values.truncateLength ?? ''}
                                placeholder="0"
                                onChange={e => onChange({ truncateLength: e.target.value ? Number(e.target.value) : undefined })}
                                className="flex-1 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">자 미만</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
