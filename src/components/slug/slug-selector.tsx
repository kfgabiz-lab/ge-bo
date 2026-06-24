'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X } from 'lucide-react';

export interface SlugOption {
    id: number;
    slug: string;
    name: string;
}

interface Props {
    value: string;
    onChange: (slug: string) => void;
    slugOptions: SlugOption[];
    placeholder?: string;
    disabled?: boolean;
}

/**
 * Slug 자동완성 셀렉터
 * slug-registry 항목을 검색·선택한다.
 * 저장값: slug, 화면 표시: name (slug)
 *
 * 드롭다운은 Portal(body)로 렌더링 — overflow 컨테이너에 가리지 않음
 *
 * 사용법:
 *   <SlugSelector value={form.masterSlug} onChange={v => setField('masterSlug', v)} slugOptions={slugOptions} />
 */
export function SlugSelector({ value, onChange, slugOptions, placeholder = 'slug 선택', disabled }: Props) {
    const [search, setSearch]           = useState('');
    const [open, setOpen]               = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef  = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* 드롭다운 위치 계산 — 버튼 기준 fixed 좌표 */
    const calcPos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 320),
            zIndex: 9999,
        });
    }, []);

    /* 열릴 때 위치 계산, 스크롤·리사이즈 시 재계산 */
    useEffect(() => {
        if (!open) return;
        calcPos();
        window.addEventListener('scroll', calcPos, true);
        window.addEventListener('resize', calcPos);
        return () => {
            window.removeEventListener('scroll', calcPos, true);
            window.removeEventListener('resize', calcPos);
        };
    }, [open, calcPos]);

    /* 바깥 클릭 시 닫기 */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    /* 검색어 기준 필터링 (name, slug) */
    const filtered = slugOptions.filter(opt =>
        opt.name.toLowerCase().includes(search.toLowerCase()) ||
        opt.slug.toLowerCase().includes(search.toLowerCase())
    );

    /* 선택된 항목 표시 텍스트 */
    const selected = slugOptions.find(opt => opt.slug === value);

    const handleSelect = useCallback((slug: string) => {
        onChange(slug);
        setOpen(false);
        setSearch('');
    }, [onChange]);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setOpen(prev => {
            if (!prev) calcPos();
            return !prev;
        });
        setSearch('');
    }, [disabled, calcPos]);

    const triggerCls = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed';

    return (
        <div className="relative">
            {/* 선택값 표시 / 드롭다운 토글 */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleToggle}
                className={triggerCls}
            >
                <span className={selected ? 'text-slate-800 text-sm' : 'text-slate-400 text-sm'}>
                    {selected ? `${selected.name} (${selected.slug})` : placeholder}
                </span>
                <div className="flex items-center gap-0.5 flex-shrink-0 ml-2">
                    {/* 값 초기화 버튼 */}
                    {value && !disabled && (
                        <span
                            role="button"
                            onClick={e => { e.stopPropagation(); onChange(''); }}
                            className="p-0.5 text-slate-300 hover:text-slate-500 transition-colors rounded"
                        >
                            <X className="w-3 h-3" />
                        </span>
                    )}
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {/* 드롭다운 패널 — Portal로 body에 렌더링 */}
            {open && typeof document !== 'undefined' && createPortal(
                <div
                    ref={dropdownRef}
                    style={dropdownStyle}
                    className="bg-white border border-slate-200 rounded-lg shadow-lg"
                >
                    {/* 검색 입력 */}
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100">
                        <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <input
                            autoFocus
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="name 또는 slug 검색"
                            className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-300"
                        />
                    </div>

                    {/* 항목 목록 */}
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-slate-400 text-center">
                                검색 결과가 없습니다.
                            </div>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleSelect(opt.slug)}
                                    className={`w-full text-left px-3 py-2 text-xs transition-all hover:bg-slate-50 flex items-center justify-between gap-3 ${
                                        value === opt.slug ? 'bg-slate-50 font-semibold' : ''
                                    }`}
                                >
                                    <span className="text-slate-900">{opt.name}</span>
                                    <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px]">{opt.slug}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* 선택된 slug 힌트 */}
            {value && (
                <p className="mt-1 text-[10px] text-slate-400 font-mono leading-none">{value}</p>
            )}
        </div>
    );
}
