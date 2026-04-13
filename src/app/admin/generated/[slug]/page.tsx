'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Calendar, ChevronUp, ChevronDown, ChevronsUpDown, Loader2, AlertCircle, Pencil, Trash2, Eye, Paperclip } from 'lucide-react';
import { SearchForm, SearchRow, SearchField } from '@/components/search';
import LayerPopupRenderer from '@/components/layer/LayerPopupRenderer';
import api from '@/lib/api';
import { toast } from 'sonner';
import { useCodeStore } from '@/store/useCodeStore';
import { useMenuStore, MenuItem } from '@/store/useMenuStore';
import { usePathname } from 'next/navigation';
import { useMenuPageSlug } from '@/hooks/useMenuPageSlug';
import { CellType, CellOption, TableColumnConfig, ButtonConfig, ButtonType, ButtonAction, ButtonPosition } from '@/app/admin/templates/make/_shared/types';

/** 메뉴 트리 재귀 탐색으로 현재 URL의 메뉴명 반환 */
function findMenuName(menus: MenuItem[], pathname: string): string | null {
    for (const item of menus) {
        if (item.url === pathname) return item.name;
        if (item.children?.length) {
            const found = findMenuName(item.children, pathname);
            if (found) return found;
        }
    }
    return null;
}

/* ══════════════════════════════════════════ */
/*  타입 (페이지 메이커와 동일)                  */
/* ══════════════════════════════════════════ */

type FieldType = 'input' | 'select' | 'date' | 'dateRange' | 'radio' | 'checkbox' | 'quickDate';
/* CellType, CellOption, TableColumnConfig, ButtonConfig, ButtonType, ButtonAction, ButtonPosition → _shared/types.ts import */

interface SearchFieldConfig {
    id: string;
    type: FieldType;
    label: string;
    label2?: string;
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
    required?: boolean;
    options?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    codeGroupCode?: string;
    /** data_json 실제 키 — 검색/폼 저장 시 사용 (레이어 팝업 fieldKey와 동일) */
    fieldKey?: string;
    /** 검색 API 파라미터 키 (fieldKey 없을 때 fallback) */
    accessor?: string;
}

interface SearchRowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;
    fields: SearchFieldConfig[];
}

/* CellOption, TableColumnConfig, ButtonConfig, ButtonType, ButtonAction, ButtonPosition → _shared/types.ts import */

interface ConfigJson {
    fieldRows: SearchRowConfig[];
    tableColumns: TableColumnConfig[];
    collapsible: boolean;
    buttons?: ButtonConfig[];
    buttonPosition?: ButtonPosition;
    /** 목록 표시 방식 — pagination(기본) / scroll(무한스크롤) */
    displayMode?: 'pagination' | 'scroll';
    /** 페이지당 표시 건수 (pagination 모드) */
    pageSize?: number;
}

/* ══════════════════════════════════════════ */
/*  공통 스타일                                */
/* ══════════════════════════════════════════ */

const inputCls = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";
const selectCls = "w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer";

/* 버튼 타입별 Tailwind 클래스 (동적 purge 방지) */
const BTN_TYPE_CLS: Record<string, string> = {
    primary:   'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-300 text-slate-700 bg-white hover:bg-slate-50',
    blue:      'bg-blue-500 text-white hover:bg-blue-600',
    success:   'bg-emerald-500 text-white hover:bg-emerald-600',
    danger:    'bg-red-500 text-white hover:bg-red-600',
};

/* 커스텀 액션 버튼 색상 → Tailwind 클래스 (동적 purge 방지) */
const CA_COLOR_CLS: Record<string, string> = {
    slate:  'bg-slate-500 hover:bg-slate-600 text-white',
    blue:   'bg-blue-500 hover:bg-blue-600 text-white',
    green:  'bg-emerald-500 hover:bg-emerald-600 text-white',
    red:    'bg-red-500 hover:bg-red-600 text-white',
    orange: 'bg-orange-500 hover:bg-orange-600 text-white',
};

/* 배지 색상 → Tailwind 클래스 (동적 purge 방지) */
const BADGE_COLOR_CLS: Record<string, string> = {
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-emerald-100 text-emerald-700',
    red:    'bg-red-100 text-red-700',
    yellow: 'bg-yellow-100 text-yellow-700',
    gray:   'bg-slate-100 text-slate-600',
    purple: 'bg-purple-100 text-purple-700',
};

/** 표시 방식 미설정 시 기본 페이지 크기 */
const DEFAULT_PAGE_SIZE = 10;

const SelectArrow = () => (
    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
);

const parseOpt = (opt: string) => {
    const idx = opt.lastIndexOf(':');
    if (idx === -1) return { text: opt, value: opt };
    return { text: opt.slice(0, idx), value: opt.slice(idx + 1) };
};

/* ══════════════════════════════════════════ */
/*  검색 필드 렌더러                            */
/* ══════════════════════════════════════════ */

function FieldRenderer({ field, value, onChange, codeGroups }: {
    field: SearchFieldConfig;
    value: string;
    onChange: (v: string) => void;
    codeGroups: { groupCode: string; details: { code: string; name: string; active: boolean }[] }[];
}) {
    /* 공통코드 연동 옵션 해석 */
    const resolveOptions = (f: SearchFieldConfig): string[] => {
        if (f.codeGroupCode) {
            return codeGroups.find(g => g.groupCode === f.codeGroupCode)
                ?.details.filter(d => d.active).map(d => `${d.name}:${d.code}`) ?? [];
        }
        return f.options ?? [];
    };

    switch (field.type) {
        case 'input':
            return <input type="text" placeholder={field.placeholder || '입력하세요'} className={inputCls} value={value} onChange={e => onChange(e.target.value)} />;

        case 'select':
            return (
                <div className="relative">
                    <select className={selectCls} value={value} onChange={e => onChange(e.target.value)}>
                        <option value="">{field.placeholder || '선택하세요'}</option>
                        {resolveOptions(field).map(opt => {
                            const { text, value: val } = parseOpt(opt);
                            return <option key={opt} value={val}>{text}</option>;
                        })}
                    </select>
                    <SelectArrow />
                </div>
            );

        case 'date':
            return <input type="date" className={inputCls} value={value} onChange={e => onChange(e.target.value)} />;

        case 'dateRange': {
            const parts = (value || '~').split('~');
            const from = parts[0] || '';
            const to = parts[1] || '';
            return (
                <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" className={`${inputCls} pl-9`} value={from} onChange={e => onChange(`${e.target.value}~${to}`)} />
                    </div>
                    <span className="text-sm text-slate-400">~</span>
                    <div className="relative flex-1">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="date" className={`${inputCls} pl-9`} value={to} onChange={e => onChange(`${from}~${e.target.value}`)} />
                    </div>
                </div>
            );
        }

        case 'radio':
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {resolveOptions(field).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name={`field-${field.id}`} value={val} checked={value === val} onChange={() => onChange(val)} className="w-4 h-4 cursor-pointer" />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );

        case 'checkbox':
            return (
                <div className="flex items-center gap-4 pt-0.5">
                    {resolveOptions(field).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        const selected = (value || '').split(',').filter(Boolean);
                        const isChecked = selected.includes(val);
                        return (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" value={val} checked={isChecked} onChange={() => {
                                    const next = isChecked ? selected.filter(v => v !== val) : [...selected, val];
                                    onChange(next.join(','));
                                }} className="w-4 h-4 rounded cursor-pointer" />
                                <span className="text-sm text-slate-700">{text}</span>
                            </label>
                        );
                    })}
                </div>
            );

        case 'quickDate':
            return (
                <div className="flex items-center gap-1.5">
                    {(field.options || ['오늘:today', '1주:1week', '1개월:1month', '3개월:3month', '전체:all']).map(opt => {
                        const { text, value: val } = parseOpt(opt);
                        return (
                            <button key={opt} type="button" onClick={() => onChange(val)} className={`px-2.5 py-2 text-xs font-medium rounded-md border transition-all ${value === val ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-100'}`}>{text}</button>
                        );
                    })}
                </div>
            );

        default:
            return null;
    }
}

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */

/** 정렬 방향 아이콘 — demo/page1 동일 디자인 */
const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
    if (sorted === 'asc')  return <ChevronUp className="w-3.5 h-3.5 text-blue-500" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
};

export default function GeneratedPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = React.use(params);
    const pathname = usePathname();
    const navMenus = useMenuStore((state) => state.navMenus);
    const menuName = findMenuName(navMenus, pathname || '');
    /* 메뉴에 SLUG가 설정된 경우 그것을 사용, 없으면 URL slug 사용 */
    const dataSlug = useMenuPageSlug(slug);

    /* 템플릿 로딩 상태 */
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [templateName, setTemplateName] = useState('');
    const [config, setConfig] = useState<ConfigJson | null>(null);

    /* 검색 필드 값 */
    const [searchValues, setSearchValues] = useState<Record<string, string>>({});

    /* 테이블 데이터 */
    const [tableData, setTableData] = useState<Record<string, unknown>[]>([]);
    const [dataLoading, setDataLoading] = useState(false);      // 초기/검색 로딩
    const [appendLoading, setAppendLoading] = useState(false);  // 스크롤 추가 로딩 (기존 데이터 유지)
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [currentPage, setCurrentPage] = useState(0);

    /* 무한 스크롤 — 스크롤 모드일 때만 사용 */
    const [hasMore, setHasMore] = useState(true);
    const observerRef = useRef<HTMLDivElement>(null);

    /**
     * Observer 콜백에서 항상 최신 값을 읽기 위한 refs
     * (Observer는 최초 1회만 등록 → deps 변경으로 재연결하지 않음)
     */
    const hasMoreRef = useRef(true);
    const isLoadingRef = useRef(false);   // dataLoading || appendLoading
    /** 다음에 불러올 페이지 번호 — currentPage+1로 계산하지 않고 직접 관리 */
    const nextPageRef = useRef(0);
    const searchValuesRef = useRef<Record<string, string>>({});
    const configRef = useRef<ConfigJson | null>(null);

    /* 정렬 상태 */
    const [sortKey, setSortKey] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    /* 팝업 상태 — 등록(editId=null) / 수정(editId=number) 공용 */
    const [popupOpen, setPopupOpen] = useState(false);
    const [popupSlug, setPopupSlug] = useState('');
    const [editId, setEditId] = useState<number | null>(null);
    const [editRowData, setEditRowData] = useState<Record<string, unknown>>({});


    /* 공통코드 */
    const { groups: codeGroups, fetchGroups } = useCodeStore();

    /**
     * 데이터 목록 조회 — GET /api/v1/page-data/{slug}
     * @param page       페이지 번호 (0-based)
     * @param sv         검색 값 Map (기본: 현재 searchValues)
     * @param cfg        configJson (기본: 현재 config)
     * @param append     true면 기존 데이터에 추가 (스크롤 모드 다음 페이지)
     */
    const fetchData = useCallback(async (
        page: number,
        sv?: Record<string, string>,
        cfg?: ConfigJson | null,
        append = false,
        sk?: string | null,
        sd?: 'asc' | 'desc',
    ) => {
        /* stale 클로저 방지 — 인자 미전달 시 refs에서 최신값 사용 */
        const resolvedSv  = sv  ?? searchValuesRef.current;
        const resolvedCfg = cfg !== undefined ? cfg : configRef.current;
        /* sort: 인자 미전달 시 현재 state 사용 */
        const resolvedSk = sk !== undefined ? sk : sortKey;
        const resolvedSd = sd ?? sortDir;

        /* ref 기반 중복 호출 방지 — state보다 즉각적으로 반영됨 */
        if (isLoadingRef.current) return;
        isLoadingRef.current = true;
        /* append=true면 기존 행 유지 + 하단 스피너, false면 전체 로딩 오버레이 */
        if (append) setAppendLoading(true);
        else setDataLoading(true);
        try {
            const size = resolvedCfg?.pageSize ?? DEFAULT_PAGE_SIZE;
            const params: Record<string, string> = {
                page: String(page),
                size: String(size),
            };
            /* 정렬 조건 */
            if (resolvedSk) {
                params.sort = `${resolvedSk},${resolvedSd}`;
            }
            /* 검색 조건: fieldKey → accessor → label 순으로 파라미터 키 결정 */
            if (resolvedCfg) {
                resolvedCfg.fieldRows.flatMap(r => r.fields).forEach(f => {
                    const paramKey = f.fieldKey || f.accessor || f.label;
                    const val = resolvedSv[f.id];
                    if (paramKey && val && val.trim()) params[paramKey] = val;
                });
            }
            const res = await api.get(`/page-data/${dataSlug}`, { params });
            /* 각 행: { _id: number, ...dataJson } 형태로 평탄화 */
            const rows = (res.data.content as { id: number; dataJson: Record<string, unknown> }[])
                .map(item => ({ _id: item.id, ...item.dataJson }));
            /* 스크롤 모드 append=true면 기존 데이터에 추가, 아니면 교체 */
            setTableData(prev => append ? [...prev, ...rows] : rows);
            setTotalElements(res.data.totalElements);
            setTotalPages(res.data.totalPages);
            /* refs 동기화 — Observer 콜백이 항상 최신값 참조 */
            const more = !res.data.last && rows.length > 0;
            setCurrentPage(page);
            setHasMore(more);
            hasMoreRef.current = more;
            /* 성공적으로 로드된 후에만 다음 페이지 번호 확정 — 재진입 시 같은 페이지 중복 호출 방지 */
            nextPageRef.current = more ? page + 1 : page;
            configRef.current = resolvedCfg;
            searchValuesRef.current = resolvedSv;
        } catch {
            toast.error('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            isLoadingRef.current = false;
            if (append) setAppendLoading(false);
            else setDataLoading(false);
        }
    }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

    /* 템플릿 및 공통코드 로딩 — 완료 후 초기 데이터 로드 */
    useEffect(() => {
        fetchGroups();
        api.get(`/page-templates/by-slug/${slug}`)
            .then(res => {
                setTemplateName(res.data.name);
                const cfg = JSON.parse(res.data.configJson) as ConfigJson;
                setConfig(cfg);
                /* 초기 refs 설정 */
                configRef.current = cfg;
                searchValuesRef.current = {};
                fetchData(0, {}, cfg);
            })
            .catch(() => setError('페이지를 불러오는 중 오류가 발생했습니다.'))
            .finally(() => setLoading(false));
    }, [slug, fetchGroups]); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 무한 스크롤 — Intersection Observer로 sentinel div 감지
     * - Observer는 scroll 모드 진입 시 최초 1회만 등록
     * - 콜백에서 state 대신 refs를 사용해 재등록 없이 최신값 참조
     */
    useEffect(() => {
        if (config?.displayMode !== 'scroll') return;
        const sentinel = observerRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (
                    entries[0].isIntersecting &&
                    hasMoreRef.current &&
                    !isLoadingRef.current
                ) {
                    /* nextPageRef: 로드 성공 후 확정된 다음 페이지 번호 */
                    fetchData(
                        nextPageRef.current,
                        searchValuesRef.current,
                        configRef.current,
                        true,
                    );
                }
            },
            { threshold: 0.1 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [config?.displayMode, fetchData]); // scroll 모드 전환 시에만 재등록

    const allFields = config?.fieldRows.flatMap(r => r.fields) ?? [];

    const updateValue = (id: string, val: string) =>
        setSearchValues(prev => ({ ...prev, [id]: val }));

    /* 초기화 — 검색값 비우고 전체 조회 (스크롤 모드는 목록 초기화 후 재조회) */
    const resetValues = () => {
        setSearchValues({});
        searchValuesRef.current = {};
        if (config?.displayMode === 'scroll') {
            setTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, {});
    };

    /* 검색 실행 — 스크롤 모드는 목록 초기화 후 재조회 */
    const handleSearch = () => {
        searchValuesRef.current = searchValues;
        if (config?.displayMode === 'scroll') {
            setTableData([]);
            setHasMore(true);
            hasMoreRef.current = true;
            nextPageRef.current = 0;
        }
        fetchData(0, searchValues);
    };

    /** 버튼 바 클릭 핸들러 */
    const handleButtonClick = (btn: ButtonConfig) => {
        if (btn.action === 'register' || btn.action === 'custom') {
            if (btn.popupSlug) {
                /* 신규 등록 모드로 팝업 오픈 */
                setEditId(null);
                setEditRowData({});
                setPopupSlug(btn.popupSlug);
                setPopupOpen(true);
            } else if (btn.action === 'register') {
                toast.info('등록 페이지 연동이 설정되지 않았습니다.');
            }
        } else if (btn.action === 'excel') {
            handleExcelDownload(btn.excelFormat ?? 'xlsx');
        }
    };

    /** 엑셀 다운로드 — BE /export API 호출 후 Blob 다운로드 */
    const handleExcelDownload = async (format: string) => {
        /* actions 컬럼 제외, accessor가 있는 컬럼만 포함 */
        const exportCols = config?.tableColumns.filter(c => c.cellType !== 'actions' && c.accessor) ?? [];
        const headers = encodeURIComponent(exportCols.map(c => c.header).join(','));
        const keys    = encodeURIComponent(exportCols.map(c => c.accessor).join(','));

        /* 현재 검색 조건을 쿼리 파라미터로 구성 */
        const params = new URLSearchParams({ format, headers, keys });
        Object.entries(searchValuesRef.current).forEach(([k, v]) => {
            if (v) params.set(k, v);
        });

        try {
            const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8002/api/v1';
            const res = await fetch(`${apiBase}/page-data/${dataSlug}/export?${params.toString()}`, {
                credentials: 'include',
            });
            if (!res.ok) throw new Error('다운로드 실패');

            const blob = await res.blob();
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            /* Content-Disposition 헤더에서 파일명 추출 */
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename\*?=(?:UTF-8'')?(.+)/i);
            a.download = match ? decodeURIComponent(match[1].replace(/"/g, '')) : `export.${format}`;
            a.href = url;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error('엑셀 다운로드 중 오류가 발생했습니다.');
        }
    };

    /** 수정 버튼 클릭 — editPopupSlug 사용 */
    const handleEditClick = (row: Record<string, unknown>) => {
        const actionsCol = config?.tableColumns.find(c => c.cellType === 'actions');
        const slugFromCol = actionsCol?.editPopupSlug;
        /* editPopupSlug 없으면 buttons 중 popupSlug가 있는 첫 번째로 fallback */
        const slugFromBtn = config?.buttons?.find(b => b.popupSlug)?.popupSlug;
        const targetSlug = slugFromCol || slugFromBtn;

        if (!targetSlug) {
            toast.info('수정 팝업이 설정되지 않았습니다.');
            return;
        }
        setEditId(row._id as number);
        setEditRowData(row);
        setPopupSlug(targetSlug);
        setPopupOpen(true);
    };

    /** 상세 버튼 클릭 — detailPopupSlug 사용 */
    const handleDetailClick = (row: Record<string, unknown>) => {
        const actionsCol = config?.tableColumns.find(c => c.cellType === 'actions');
        const targetSlug = actionsCol?.detailPopupSlug;

        if (!targetSlug) {
            toast.info('상세 팝업이 설정되지 않았습니다.');
            return;
        }
        setEditId(row._id as number);
        setEditRowData(row);
        setPopupSlug(targetSlug);
        setPopupOpen(true);
    };

    /** 파일 셀 클릭 — LayerPopupRenderer로 해당 행 데이터 표시 */
    const handleFileClick = (col: TableColumnConfig, row: Record<string, unknown>) => {
        if (!col.fileLayerSlug) {
            toast.info('파일 뷰어 팝업이 설정되지 않았습니다.');
            return;
        }
        setEditId(row._id as number);
        setEditRowData(row);
        setPopupSlug(col.fileLayerSlug);
        setPopupOpen(true);
    };

    /** 삭제 버튼 클릭 — DELETE /api/v1/page-data/{slug}/{id} */
    const handleDeleteClick = async (id: number) => {
        if (!confirm('삭제하시겠습니까?')) return;
        try {
            await api.delete(`/page-data/${dataSlug}/${id}`);
            toast.success('삭제되었습니다.');
            /* 현재 페이지 데이터 새로고침 */
            fetchData(currentPage);
        } catch {
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    /** 팝업 닫기 — editId/editRowData 초기화 */
    const handlePopupClose = () => {
        setPopupOpen(false);
        setEditId(null);
        setEditRowData({});
    };

    /** 테이블 셀 타입별 렌더링 */
    const renderCell = (col: TableColumnConfig, row: Record<string, unknown>) => {
        const value = row[col.accessor];

        switch (col.cellType) {
            case 'badge': {
                const opt = col.cellOptions?.find(o => o.value === String(value ?? ''));
                if (!opt) return <span className="text-sm text-slate-600">{String(value ?? '')}</span>;
                const shapeCls = col.badgeShape === 'square' ? 'rounded' : 'rounded-full';
                return (
                    <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${shapeCls} ${BADGE_COLOR_CLS[opt.color] || BADGE_COLOR_CLS.gray}`}>
                        {opt.text}
                    </span>
                );
            }
            case 'boolean':
                return (
                    <span className={`text-sm ${value ? 'text-emerald-600 font-medium' : 'text-slate-400'}`}>
                        {value ? (col.trueText || 'Y') : (col.falseText || 'N')}
                    </span>
                );
            case 'actions': {
                const justifyCls = col.align === 'center' ? 'justify-center' : col.align === 'right' ? 'justify-end' : 'justify-start';
                return (
                    <div className={`flex items-center gap-1 ${justifyCls}`}>
                        {/* 프리셋 버튼 — 항상 edit → detail → delete 순서로 렌더링 */}
                        {(col.actions || []).includes('edit') && (
                            <button key="edit" onClick={() => handleEditClick(row)} title="수정" className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all">
                                <Pencil className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {(col.actions || []).includes('detail') && (
                            <button key="detail" onClick={() => handleDetailClick(row)} title="상세" className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded transition-all">
                                <Eye className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {(col.actions || []).includes('delete') && (
                            <button key="delete" onClick={() => handleDeleteClick(row._id as number)} title="삭제" className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all">
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {/* 커스텀 액션 버튼 — label + color 기반으로 렌더링 */}
                        {(col.customActions || []).filter(ca => ca.label).map(ca => (
                            <button key={ca.id} className={`px-2 py-0.5 text-[11px] font-medium rounded transition-all ${CA_COLOR_CLS[ca.color] || CA_COLOR_CLS.slate}`}>
                                {ca.label}
                            </button>
                        ))}
                    </div>
                );
            }
            case 'file': {
                /* 파일 ID 배열 — 비어있으면 "-" 표시 */
                const ids = Array.isArray(value) ? value : [];
                const count = ids.length;
                if (count === 0) {
                    return <span className="text-sm text-slate-400">-</span>;
                }
                return (
                    <button
                        onClick={() => handleFileClick(col, row)}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        <Paperclip className="w-3.5 h-3.5" />
                        {count}
                    </button>
                );
            }
            default: /* text */ {
                const strVal = String(value ?? '');
                /* 공통코드 연동 — displayAs !== 'value' 이면 이름으로 변환 */
                if (col.codeGroupCode && col.displayAs !== 'value') {
                    const name = codeGroups
                        .find(g => g.groupCode === col.codeGroupCode)
                        ?.details.find(d => d.code === strVal)?.name ?? strVal;
                    return <span className="text-sm text-slate-700">{name}</span>;
                }
                /* isNumber: true이고 실제 숫자인 경우에만 3자리 콤마 적용 */
                const displayVal = col.isNumber && strVal !== '' && !isNaN(Number(strVal))
                    ? Number(strVal).toLocaleString()
                    : strVal;
                return <span className="text-sm text-slate-700">{displayVal}</span>;
            }
        }
    };

    /* ── 템플릿 로딩 중 ── */
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-slate-400">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">페이지 로딩 중...</span>
            </div>
        );
    }

    /* ── 오류 ── */
    if (error || !config) {
        return (
            <div className="flex items-center justify-center h-64 gap-2 text-red-400">
                <AlertCircle className="w-5 h-5" />
                <span className="text-sm">{error || '설정을 불러올 수 없습니다.'}</span>
            </div>
        );
    }

    /* 버튼 바 공통 렌더러 */
    const buttons = config.buttons ?? [];
    const buttonPosition = config.buttonPosition ?? 'between';
    const ButtonBar = () => buttons.length === 0 ? null : (
        <div className="flex items-center justify-end gap-2">
            {buttons.map(btn => (
                <button
                    key={btn.id}
                    onClick={() => handleButtonClick(btn)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${BTN_TYPE_CLS[btn.type] || BTN_TYPE_CLS.secondary}`}
                >
                    {btn.label}
                </button>
            ))}
        </div>
    );

    return (
        <div className="space-y-5">
            {/* 페이지 헤더 */}
            <div>
                <h1 className="text-lg font-bold text-slate-900">{menuName || templateName}</h1>
            </div>

            {/* 버튼 바 — above: 검색폼 위 */}
            {buttonPosition === 'above' && <ButtonBar />}

            {/* 검색폼 */}
            {allFields.length > 0 && (
                <SearchForm
                    collapsible={config.collapsible}
                    onSearch={handleSearch}
                    onReset={resetValues}
                >
                    {config.fieldRows.map(row => (
                        <SearchRow key={row.id} cols={row.cols}>
                            {row.fields.map(field => (
                                <SearchField
                                    key={`${row.id}-${field.id}`}
                                    label={field.type === 'dateRange' ? `${field.label} ~ ${field.label2 || ''}` : field.label}
                                    colSpan={field.colSpan}
                                    required={field.required}
                                >
                                    <FieldRenderer
                                        field={field}
                                        value={searchValues[field.id] || ''}
                                        onChange={v => updateValue(field.id, v)}
                                        codeGroups={codeGroups}
                                    />
                                </SearchField>
                            ))}
                        </SearchRow>
                    ))}
                </SearchForm>
            )}

            {/* 버튼 바 — between: 검색폼 아래, 테이블 위 */}
            {buttonPosition === 'between' && <ButtonBar />}

            {/* 테이블 */}
            {config.tableColumns.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">

                    {/* 상단 바 — 좌: 총 건수 / 우: 현재 표시 범위 */}
                    {(() => {
                        const size = config.pageSize ?? DEFAULT_PAGE_SIZE;
                        const start = totalElements === 0 ? 0 : currentPage * size + 1;
                        const end = Math.min((currentPage + 1) * size, totalElements);
                        return (
                            <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100">
                                <p className="text-xs text-slate-500">
                                    중 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건
                                </p>
                                {config.displayMode !== 'scroll' && totalElements > 0 && (
                                    <p className="text-xs text-slate-400">{start}-{end} 표시 중</p>
                                )}
                            </div>
                        );
                    })()}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 bg-slate-50/80">
                                    {config.tableColumns.map(col => (
                                        <th
                                            key={col.id}
                                            className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                                            style={{
                                                textAlign: 'center',
                                                width: col.width ? `${col.width}${col.widthUnit || 'px'}` : undefined,
                                            }}
                                        >
                                            {col.sortable ? (
                                                <button
                                                    onClick={() => {
                                                        /* 같은 컬럼 재클릭 시 방향 토글, 다른 컬럼 클릭 시 asc로 초기화 */
                                                        const nextDir = sortKey === col.accessor && sortDir === 'asc' ? 'desc' : 'asc';
                                                        setSortKey(col.accessor);
                                                        setSortDir(nextDir);
                                                        fetchData(0, undefined, undefined, false, col.accessor, nextDir);
                                                    }}
                                                    className="flex items-center justify-center gap-1 w-full hover:text-slate-900 transition-colors"
                                                >
                                                    {col.header}
                                                    <SortIcon sorted={sortKey === col.accessor ? sortDir : false} />
                                                </button>
                                            ) : (
                                                <span className="flex items-center justify-center gap-1">
                                                    {col.header}
                                                </span>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {dataLoading ? (
                                    /* 초기/검색 로딩 — 전체 오버레이 (기존 데이터 없음) */
                                    <tr>
                                        <td colSpan={config.tableColumns.length} className="py-16 text-center">
                                            <span className="inline-flex items-center gap-2 text-sm text-slate-400">
                                                <Loader2 className="w-4 h-4 animate-spin" />데이터 로딩 중...
                                            </span>
                                        </td>
                                    </tr>
                                ) : tableData.length === 0 ? (
                                    /* 데이터 없음 */
                                    <tr>
                                        <td colSpan={config.tableColumns.length} className="py-16 text-center text-sm text-slate-400">
                                            데이터가 없습니다.
                                        </td>
                                    </tr>
                                ) : (
                                    /* 데이터 행 */
                                    tableData.map((row, rowIdx) => (
                                        <tr
                                            key={(row._id as number) || rowIdx}
                                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-all"
                                        >
                                            {config.tableColumns.map(col => (
                                                <td
                                                    key={col.id}
                                                    className="px-4 py-3"
                                                    style={{ textAlign: col.align }}
                                                >
                                                    {renderCell(col, row)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* 하단 바 — pagination 모드일 때만 표시 */}
                    {config.displayMode !== 'scroll' && totalElements > 0 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            {/* 좌: 현재 범위 / 전체 건수 */}
                            {(() => {
                                const size = config.pageSize ?? DEFAULT_PAGE_SIZE;
                                const start = currentPage * size + 1;
                                const end = Math.min((currentPage + 1) * size, totalElements);
                                return (
                                    <p className="text-xs text-slate-500">
                                        {start}-{end} / 전체 <span className="font-semibold text-slate-700">{totalElements.toLocaleString()}</span>건
                                    </p>
                                );
                            })()}

                            {/* 우: 페이지 번호 — « 1 2 3 4 5 » */}
                            {totalPages > 1 && (
                                <div className="flex items-center gap-1">
                                    {/* « 첫 페이지 */}
                                    <button
                                        onClick={() => fetchData(0)}
                                        disabled={currentPage === 0}
                                        className="w-7 h-7 flex items-center justify-center text-xs rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        «
                                    </button>
                                    {/* 페이지 번호 — 현재 페이지 중심 최대 5개 */}
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        const startPage = Math.max(0, Math.min(currentPage - 2, totalPages - 5));
                                        const pageNum = startPage + i;
                                        if (pageNum >= totalPages) return null;
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => fetchData(pageNum)}
                                                className={`w-7 h-7 text-xs rounded transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white font-semibold border border-slate-900' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {pageNum + 1}
                                            </button>
                                        );
                                    })}
                                    {/* » 마지막 페이지 */}
                                    <button
                                        onClick={() => fetchData(totalPages - 1)}
                                        disabled={currentPage >= totalPages - 1}
                                        className="w-7 h-7 flex items-center justify-center text-xs rounded border border-slate-200 text-slate-400 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                    >
                                        »
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 무한 스크롤 sentinel — scroll 모드일 때만 렌더링 */}
                    {config.displayMode === 'scroll' && (
                        <div ref={observerRef} className="py-4 text-center border-t border-slate-100">
                            {appendLoading
                                /* 스크롤 추가 로딩 중 — 기존 행은 위에 유지된 상태 */
                                ? <span className="inline-flex items-center gap-2 text-xs text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />불러오는 중...</span>
                                : !hasMore
                                    ? <span className="text-xs text-slate-400">마지막 데이터입니다.</span>
                                    : null
                            }
                        </div>
                    )}
                </div>
            )}

            {/* 레이어 팝업 — 등록/수정 공용 (editId 있으면 수정, 없으면 신규) */}
            <LayerPopupRenderer
                open={popupOpen}
                onClose={handlePopupClose}
                slug={popupSlug}
                initialData={editRowData}
                listSlug={dataSlug}
                editId={editId}
                onSaved={() => fetchData(currentPage)}
            />

        </div>
    );
}
