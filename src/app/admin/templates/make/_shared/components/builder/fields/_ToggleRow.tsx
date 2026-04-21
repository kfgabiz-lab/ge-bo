'use client';

/**
 * _ToggleRow — 토글 버튼 행 (필수항목, 다중선택 등)
 * 필드 컴포넌트 내부에서만 사용하는 내부 컴포넌트.
 */

import React from 'react';

interface ToggleRowProps {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
}

/** 라벨 + 슬라이드 토글 버튼 한 줄 */
export function ToggleRow({ label, value, onChange }: ToggleRowProps) {
    return (
        <div className="flex items-center justify-between px-1 py-1">
            <span className="text-[10px] font-medium text-slate-500">{label}</span>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`relative w-9 h-5 rounded-full transition-colors ${value ? 'bg-slate-900' : 'bg-slate-300'}`}
            >
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
        </div>
    );
}
