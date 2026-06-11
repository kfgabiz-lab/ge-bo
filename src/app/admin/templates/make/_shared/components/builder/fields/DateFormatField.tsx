'use client';

/**
 * DateFormatField — 날짜 컬럼 포맷 선택 컴포넌트
 *
 * 테이블 컬럼 타입 'date' 전용 설정 패널.
 * 포맷 선택 드롭다운 + 현재 시각 기반 미리보기 표시.
 *
 * 사용법:
 *   <DateFormatField values={col} onChange={patch} />
 */

import React from 'react';
import { LABEL_CLS } from './_FieldBase';

/** 지원 날짜 포맷 목록 */
export const DATE_FORMATS: { value: string; label: string }[] = [
    { value: 'YYYY-MM-DD',              label: 'YYYY-MM-DD' },
    { value: 'YYYY-MM-DD HH:mm',        label: 'YYYY-MM-DD HH:mm' },
    { value: 'YYYY-MM-DD HH:mm:ss',     label: 'YYYY-MM-DD HH:mm:ss' },
    { value: 'YYYY.MM.DD',              label: 'YYYY.MM.DD' },
    { value: 'YYYY.MM.DD HH:mm',        label: 'YYYY.MM.DD HH:mm' },
    { value: 'YYYY년 MM월 DD일',         label: 'YYYY년 MM월 DD일' },
    { value: 'YYYY년 MM월 DD일 HH:mm',   label: 'YYYY년 MM월 DD일 HH:mm' },
];

/**
 * ISO 날짜 문자열을 포맷 문자열에 따라 변환
 * 파싱 실패 시 원본값 반환
 */
export function applyDateFormat(value: string, format: string): string {
    if (!value || !format) return value;
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;

    const YYYY = String(d.getFullYear());
    const MM   = String(d.getMonth() + 1).padStart(2, '0');
    const DD   = String(d.getDate()).padStart(2, '0');
    const HH   = String(d.getHours()).padStart(2, '0');
    const mm   = String(d.getMinutes()).padStart(2, '0');
    const ss   = String(d.getSeconds()).padStart(2, '0');

    return format
        .replace('YYYY', YYYY)
        .replace('MM', MM)
        .replace('DD', DD)
        .replace('HH', HH)
        .replace('mm', mm)
        .replace('ss', ss);
}

interface DateFormatFieldProps {
    values: { dateFormat?: string };
    onChange: (patch: { dateFormat?: string }) => void;
}

export function DateFormatField({ values, onChange }: DateFormatFieldProps) {
    /* 미리보기: 현재 시각을 선택한 포맷으로 표시 */
    const previewValue = values.dateFormat
        ? applyDateFormat(new Date().toISOString(), values.dateFormat)
        : '';

    return (
        <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">날짜 포맷</p>

            {/* 포맷 선택 드롭다운 */}
            <div>
                <label className={LABEL_CLS}>표시 포맷</label>
                <select
                    value={values.dateFormat ?? ''}
                    onChange={e => onChange({ dateFormat: e.target.value || undefined })}
                    className="w-full border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:border-slate-900 bg-white"
                >
                    <option value="">포맷 선택</option>
                    {DATE_FORMATS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                    ))}
                </select>
            </div>

            {/* 미리보기 */}
            {previewValue && (
                <p className="text-[10px] text-slate-500 bg-slate-50 rounded px-2 py-1">
                    미리보기: <span className="font-mono text-slate-800">{previewValue}</span>
                </p>
            )}
        </div>
    );
}
