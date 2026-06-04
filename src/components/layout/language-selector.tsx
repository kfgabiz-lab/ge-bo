'use client';

import { Languages, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useLanguageStore, SUPPORTED_LOCALES, STORAGE_KEY } from '@/store/use-language-store';

/** 다국어 선택 드롭다운 — Header / LoginForm 공용 */
export function LanguageSelector() {
    const { locale } = useLanguageStore();
    const [open, setOpen] = useState(false);
    /* SSR 하이드레이션 미스매치 방지 — 마운트 전에는 기본값 표시 */
    const [mounted, setMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    /* 마운트 확인 — SSR 하이드레이션 미스매치 방지용 */
    useEffect(() => {
        setMounted(true);
    }, []);

    /* 바깥 클릭 시 닫기 */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const activeLabel = mounted
        ? (SUPPORTED_LOCALES.find(l => l.code === locale)?.label ?? '한국어')
        : '한국어';

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen(prev => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-all"
            >
                <Languages className="w-3.5 h-3.5 text-slate-400" />
                <span>{activeLabel}</span>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
                    {SUPPORTED_LOCALES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => {
                                /* 상태 업데이트 없이 localStorage만 저장 후 즉시 새로고침 — 리렌더 플래시 방지 */
                                localStorage.setItem(STORAGE_KEY, lang.code);
                                window.location.reload();
                            }}
                            className={`w-full text-left px-3 py-2 text-xs font-medium transition-all hover:bg-slate-50 ${
                                locale === lang.code ? 'text-slate-900 bg-slate-50 font-semibold' : 'text-slate-600'
                            }`}
                        >
                            {lang.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
