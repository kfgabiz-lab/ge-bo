'use client';

/**
 * MaskField — 텍스트 셀 마스킹 설정 (email/phone/name/custom)
 *
 * text 타입 컬럼에서 live 모드 표시값에 적용할 마스킹 규칙을 설정한다.
 * preview 모드는 항상 샘플 텍스트를 유지하며, live 모드에서만 실제 마스킹이 적용된다.
 *
 * 사용법:
 *   <MaskField values={col} onChange={patch => updateColumn(col.id, patch)} />
 */

import React from 'react';
import { ColEditProps } from './col-types';
import { INPUT_CLS, LABEL_CLS } from './_FieldBase';

const MASK_TYPES: { type: 'email' | 'phone' | 'name' | 'custom'; label: string }[] = [
    { type: 'email',  label: '이메일' },
    { type: 'phone',  label: '전화번호' },
    { type: 'name',   label: '이름' },
    { type: 'custom', label: '커스텀' },
];

const EMAIL_PATTERNS = [
    { value: 'idMid',   label: 'ID 중간 마스킹' },
    { value: 'idFull',  label: 'ID 전체 마스킹' },
    { value: 'prefix3', label: '앞 3글자 마스킹' },
    { value: 'suffix3', label: '뒤 3글자 제외 마스킹' },
];
const PHONE_PATTERNS = [
    { value: 'mid4',      label: '중간 4자리 마스킹' },
    { value: 'suffix4',   label: '뒤 4자리 마스킹' },
    { value: 'midSuffix', label: '중간+뒤 마스킹' },
];
const NAME_PATTERNS = [
    { value: 'mid',     label: '중간 마스킹' },
    { value: 'initial', label: '이름 마스킹' },
    { value: 'full',    label: '전체 마스킹' },
];

const DEFAULT_PATTERN: Record<'email' | 'phone' | 'name', string> = {
    email: 'idMid', phone: 'mid4', name: 'mid',
};

export function MaskField({ values, onChange }: ColEditProps) {
    const maskType = values.maskType;

    const patternOptions =
        maskType === 'email' ? EMAIL_PATTERNS :
        maskType === 'phone' ? PHONE_PATTERNS :
        maskType === 'name'  ? NAME_PATTERNS  : [];

    return (
        <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <span className="text-[10px] font-semibold text-slate-400 uppercase">마스킹 설정</span>

            {/* 마스킹 타입 선택 — 없음 / 이메일 / 전화번호 / 이름 / 커스텀 */}
            <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-md">
                <button type="button"
                    onClick={() => onChange({ maskType: undefined, maskPattern: undefined, maskCustomRegex: undefined, maskCustomReplacement: undefined })}
                    className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${!maskType ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    없음
                </button>
                {MASK_TYPES.map(({ type, label }) => (
                    <button key={type} type="button"
                        onClick={() => onChange({
                            maskType: type,
                            maskPattern: type !== 'custom' ? DEFAULT_PATTERN[type] : undefined,
                            maskCustomRegex: type === 'custom' ? values.maskCustomRegex : undefined,
                            maskCustomReplacement: type === 'custom' ? values.maskCustomReplacement : undefined,
                        })}
                        className={`flex-1 py-1 text-[10px] font-semibold rounded transition-all ${maskType === type ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                        {label}
                    </button>
                ))}
            </div>

            {/* 패턴 선택 — email/phone/name 전용 */}
            {maskType && maskType !== 'custom' && (
                <div>
                    <label className={LABEL_CLS}>마스킹 패턴</label>
                    <select
                        value={values.maskPattern ?? DEFAULT_PATTERN[maskType]}
                        onChange={e => onChange({ maskPattern: e.target.value })}
                        className={INPUT_CLS}
                    >
                        {patternOptions.map(p => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                    </select>
                </div>
            )}

            {/* 커스텀 정규식 — custom 전용 */}
            {maskType === 'custom' && (
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className={LABEL_CLS}>정규식 <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={values.maskCustomRegex ?? ''}
                            onChange={e => onChange({ maskCustomRegex: e.target.value || undefined })}
                            placeholder="예: \d{4}$"
                            className={`${INPUT_CLS} font-mono`}
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLS}>치환값 <span className="text-red-400">*</span></label>
                        <input
                            type="text"
                            value={values.maskCustomReplacement ?? ''}
                            onChange={e => onChange({ maskCustomReplacement: e.target.value || undefined })}
                            placeholder="예: ****"
                            className={INPUT_CLS}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
