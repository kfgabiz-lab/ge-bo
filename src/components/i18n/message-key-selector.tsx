'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';
import api from '@/lib/api';
import { useLanguageStore } from '@/store/use-language-store';
import { useI18n } from '@/hooks/use-i18n';
import { inputCls } from '@/app/admin/templates/make/_shared/styles';

interface MessageOption {
    key: string;
    ko: string;
    en: string | null;
}

interface Props {
    value: string;
    onChange?: (key: string) => void;
    disabled?: boolean;
    /** 조회할 리소스 타입. 기본값 'WORD'. undefined 이면 WORD+SENTENCE 전체 조회 */
    resourceType?: 'WORD' | 'SENTENCE';
    /**
     * 버튼 크기
     * - 'md' (기본값): px-3 py-2 text-sm — 운영 페이지 폼용
     * - 'sm': px-2 py-1.5 text-xs — 빌더 설정 패널용
     */
    size?: 'sm' | 'md';
}

/**
 * 다국어 키 자동완성 셀렉터
 * message_resource 항목을 검색·선택한다.
 * 저장값: message_resource.key, 화면 표시: 현재 언어 텍스트
 *
 * 드롭다운은 Portal(body)로 렌더링 — overflow 컨테이너에 가리지 않음
 *
 * 사용법:
 *   <MessageKeySelector value={key} onChange={v => setKey(v)} />
 *   <MessageKeySelector value={key} onChange={v => setKey(v)} size="sm" resourceType={undefined} />
 */
export function MessageKeySelector({ value, onChange, disabled, resourceType = 'WORD', size = 'md' }: Props) {
    const { locale } = useLanguageStore();
    const { t } = useI18n();
    const [options, setOptions] = useState<MessageOption[]>([]);
    const [search, setSearch] = useState('');
    const [open, setOpen] = useState(false);
    const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    /* resourceType 기준 항목 조회 */
    useEffect(() => {
        const params: Record<string, string | number> = { active: 'true', size: 9999, page: 0 };
        if (resourceType) params.resourceType = resourceType;

        api.get('/message-resources', { params })
            .then(res => {
                setOptions(res.data.content.map((item: { key: string; ko: string; en: string | null }) => ({
                    key: item.key,
                    ko: item.ko,
                    en: item.en ?? null,
                })));
            })
            .catch(() => setOptions([]));
    }, [resourceType]);

    /* 드롭다운 위치 계산 — 버튼 기준 fixed 좌표 */
    const calcDropdownPos = useCallback(() => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: Math.max(rect.width, 300),
            zIndex: 9999,
        });
    }, []);

    /* 열릴 때 위치 계산, 스크롤·리사이즈 시 재계산 */
    useEffect(() => {
        if (!open) return;
        calcDropdownPos();
        window.addEventListener('scroll', calcDropdownPos, true);
        window.addEventListener('resize', calcDropdownPos);
        return () => {
            window.removeEventListener('scroll', calcDropdownPos, true);
            window.removeEventListener('resize', calcDropdownPos);
        };
    }, [open, calcDropdownPos]);

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

    /* 검색어 기준 필터링 (key, ko, en) */
    const filtered = options.filter(opt =>
        opt.key.toLowerCase().includes(search.toLowerCase()) ||
        opt.ko.toLowerCase().includes(search.toLowerCase()) ||
        (opt.en ?? '').toLowerCase().includes(search.toLowerCase())
    );

    /* 선택된 항목 표시 텍스트 */
    const selected = options.find(opt => opt.key === value);
    const displayText = selected
        ? (locale === 'en' && selected.en ? selected.en : selected.ko)
        : '';

    const handleSelect = useCallback((key: string) => {
        onChange?.(key);
        setOpen(false);
        setSearch('');
    }, [onChange]);

    const handleToggle = useCallback(() => {
        if (disabled) return;
        setOpen(prev => {
            if (!prev) calcDropdownPos();
            return !prev;
        });
        setSearch('');
    }, [disabled, calcDropdownPos]);

    return (
        <div className="relative">
            {/* 선택값 표시 / 드롭다운 토글 */}
            <button
                ref={triggerRef}
                type="button"
                disabled={disabled}
                onClick={handleToggle}
                className={`${size === 'sm'
                    ? 'w-full border border-slate-200 rounded px-2 py-1.5 text-xs bg-white focus:outline-none focus:border-slate-900'
                    : inputCls
                } flex items-center justify-between text-left`}
            >
                <span className={displayText ? 'text-slate-800' : 'text-slate-400'}>
                    {displayText || t('common.select.placeholder')}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 flex-shrink-0 ml-2 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {/* 드롭다운 패널 — Portal로 body에 렌더링 (overflow 컨테이너 회피) */}
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
                            placeholder={t('message.key.selector.search.placeholder')}
                            className="flex-1 text-xs outline-none text-slate-700 placeholder:text-slate-300"
                        />
                    </div>

                    {/* 항목 목록 */}
                    <div className="max-h-52 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="px-3 py-4 text-xs text-slate-400 text-center">
                                {t('message.key.selector.no_result')}
                            </div>
                        ) : (
                            filtered.map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => handleSelect(opt.key)}
                                    className={`w-full text-left px-3 py-2 text-xs transition-all hover:bg-slate-50 flex items-center justify-between gap-3 ${
                                        value === opt.key ? 'bg-slate-50 font-semibold' : ''
                                    }`}
                                >
                                    <span className="text-slate-900">
                                        {locale === 'en' && opt.en ? opt.en : opt.ko}
                                    </span>
                                    <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px]">
                                        {opt.key}
                                    </span>
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* 선택된 key 힌트 표시 */}
            {value && (
                <p className="mt-1 text-[10px] text-slate-400 font-mono leading-none">{value}</p>
            )}
        </div>
    );
}
