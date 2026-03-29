'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { MENU_ICON_LIST } from './constants';

/* ── 아이콘 동적 렌더러 ── */
const renderIcon = (name: string, className = 'w-4 h-4') => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Icon = (LucideIcons as any)[name] as React.ComponentType<{ className?: string }> | undefined;
    if (!Icon) return <span className={className}>?</span>;
    return <Icon className={className} />;
};

interface IconPickerProps {
    value: string;
    onChange: (value: string) => void;
}

/**
 * 아이콘 선택 커스텀 드롭다운
 * — 각 옵션에 실제 아이콘 + 이름 표시
 */
export function IconPicker({ value, onChange }: IconPickerProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    /* 외부 클릭 시 닫기 */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    return (
        <div ref={ref} className="relative">
            {/* 선택된 값 표시 */}
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between gap-2 border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
            >
                <span className="flex items-center gap-2">
                    {renderIcon(value, 'w-4 h-4 text-slate-600')}
                    <span className="text-slate-700">{value}</span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* 드롭다운 목록 */}
            {open && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {MENU_ICON_LIST.map(iconName => (
                        <button
                            key={iconName}
                            type="button"
                            onClick={() => { onChange(iconName); setOpen(false); }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-all ${
                                value === iconName
                                    ? 'bg-slate-900 text-white'
                                    : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                            {renderIcon(iconName, `w-4 h-4 ${value === iconName ? 'text-white' : 'text-slate-500'}`)}
                            <span>{iconName}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/** 단독 아이콘 렌더링 (트리 등에서 사용) */
export { renderIcon };
