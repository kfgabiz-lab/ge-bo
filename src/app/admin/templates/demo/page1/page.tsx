'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    useReactTable, getCoreRowModel, flexRender,
    createColumnHelper, SortingState, PaginationState,
} from '@tanstack/react-table';
import {
    Search, Plus, SlidersHorizontal, Download,
    ChevronUp, ChevronDown, ChevronsUpDown,
    ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
    Loader2, Eye, Pencil, Trash2,
    CheckCircle2, Clock, AlertTriangle, XOctagon,
    TrendingUp, TrendingDown, Activity, Layers,
} from 'lucide-react';

/* ══════════════════════════════════════════ */
/*  타입 & 상수                                 */
/* ══════════════════════════════════════════ */
type StatusType = '승인완료' | '진행중' | '대기' | '반려';
type PriorityType = 'high' | 'mid' | 'low';

type Item = {
    id: number;
    title: string;
    description: string;
    category: string;
    author: string;
    status: StatusType;
    date: string;
    views: number;
    priority: PriorityType;
};

const CATEGORIES = ['경영', '기획', '계약', '투표', '설문', '보안', '인사', '개발', '마케팅', '감사'];
const STATUSES: StatusType[] = ['승인완료', '진행중', '대기', '반려'];
const PRIORITIES: PriorityType[] = ['high', 'mid', 'low'];
const AUTHORS = ['김관리', '이기획', '박법무', '최인사', '정총무', '한보안', '강개발', '윤마케팅', '오감사'];
const TITLES = [
    '경영 실적 보고서', '투자 제안서', '전자 서명 요청', '전자 투표 안건',
    '설문조사 결과', '보안 정책 변경', '채용 계획서', '해외 지사 제안서',
    '마이그레이션 보고', 'VOC 분석 리포트', '감사 결과 보고서', '협약서 검토',
    '예산 집행 내역', '성과 평가 보고', '시스템 점검 결과', '교육 이수 현황',
];

/* ── 237건 Mock 데이터 ── */
const ALL_DATA: Item[] = Array.from({ length: 237 }, (_, i) => ({
    id: i + 1,
    title: `${TITLES[i % TITLES.length]} #${i + 1}`,
    description: `${CATEGORIES[i % CATEGORIES.length]} 관련 안건 — 상세 설명`,
    category: CATEGORIES[i % CATEGORIES.length],
    author: AUTHORS[i % AUTHORS.length],
    status: STATUSES[i % STATUSES.length],
    date: new Date(2026, 2 - Math.floor(i / 30), 28 - (i % 28)).toISOString().slice(0, 10),
    views: Math.floor(Math.random() * 3000) + 100,
    priority: PRIORITIES[i % PRIORITIES.length],
}));

/* ── 통계 집계 ── */
const STATS = {
    total: ALL_DATA.length,
    approved: ALL_DATA.filter(d => d.status === '승인완료').length,
    inProgress: ALL_DATA.filter(d => d.status === '진행중').length,
    pending: ALL_DATA.filter(d => d.status === '대기' || d.status === '반려').length,
};

/* ══════════════════════════════════════════ */
/*  Mock API (서버 통신 시뮬레이션)               */
/* ══════════════════════════════════════════ */
const fetchItems = async ({
    page, pageSize, sorting, search, category,
}: {
    page: number;
    pageSize: number;
    sorting: SortingState;
    search: string;
    category: string;
}): Promise<{ data: Item[]; total: number }> => {
    await new Promise(r => setTimeout(r, 300));

    let filtered = [...ALL_DATA];

    /* 검색 필터 */
    if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(d =>
            d.title.toLowerCase().includes(q) || d.author.includes(q)
        );
    }

    /* 카테고리 필터 */
    if (category && category !== '전체') {
        filtered = filtered.filter(d => d.category === category);
    }

    /* 정렬 */
    if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        filtered.sort((a, b) => {
            const aVal = a[id as keyof Item];
            const bVal = b[id as keyof Item];
            if (aVal < bVal) return desc ? 1 : -1;
            if (aVal > bVal) return desc ? -1 : 1;
            return 0;
        });
    }

    const start = page * pageSize;
    return { data: filtered.slice(start, start + pageSize), total: filtered.length };
};

/* ══════════════════════════════════════════ */
/*  UI 컴포넌트                                 */
/* ══════════════════════════════════════════ */
const STATUS_CFG: Record<StatusType, { bg: string; text: string; icon: React.ElementType }> = {
    '승인완료': { bg: 'bg-emerald-50 border-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    '진행중':   { bg: 'bg-blue-50 border-blue-100',       text: 'text-blue-700',    icon: Clock },
    '대기':     { bg: 'bg-amber-50 border-amber-100',     text: 'text-amber-700',   icon: AlertTriangle },
    '반려':     { bg: 'bg-red-50 border-red-100',         text: 'text-red-600',     icon: XOctagon },
};

const PRIORITY_COLOR: Record<PriorityType, string> = { high: 'bg-red-400', mid: 'bg-amber-400', low: 'bg-slate-300' };

const StatusBadge = ({ status }: { status: StatusType }) => {
    const c = STATUS_CFG[status];
    const Icon = c.icon;
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-[11px] font-semibold tracking-tight ${c.bg} ${c.text}`}>
            <Icon className="w-3 h-3" />{status}
        </span>
    );
};

const StatCard = ({ label, value, change, icon: Icon, accent }: {
    label: string; value: number; change: string; icon: React.ElementType; accent: string;
}) => (
    <div className="bg-white border border-gray-200 rounded-sm p-5 flex flex-col gap-3 hover:shadow-md hover:shadow-gray-100 transition-all duration-300">
        <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-gray-500 tracking-tight">{label}</span>
            <div className={`w-9 h-9 rounded-sm bg-gradient-to-br ${accent} flex items-center justify-center shadow-sm`}>
                <Icon className="w-4 h-4 text-white" />
            </div>
        </div>
        <div className="flex items-end gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none">{value}</span>
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 mb-1 ${change.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                {change.startsWith('+') ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {change}
            </span>
        </div>
    </div>
);

const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
    if (sorted === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-blue-500" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
};

/* ══════════════════════════════════════════ */
/*  컬럼 정의                                   */
/* ══════════════════════════════════════════ */
const columnHelper = createColumnHelper<Item>();

const columns = [
    /* 우선순위 바 */
    columnHelper.display({
        id: 'priority',
        header: '',
        size: 20,
        cell: ({ row }) => (
            <div className={`w-1 h-8 rounded-full ${PRIORITY_COLOR[row.original.priority]}`} />
        ),
    }),
    /* 안건 정보 */
    columnHelper.accessor('title', {
        header: '안건 정보',
        enableSorting: true,
        cell: (info) => (
            <div>
                <p className="text-[14px] font-bold text-slate-900 tracking-tight group-hover:text-blue-600 transition-colors leading-snug">
                    {info.getValue()}
                </p>
                <p className="text-[12px] text-gray-400 mt-0.5 font-medium">{info.row.original.description}</p>
            </div>
        ),
    }),
    /* 분류 */
    columnHelper.accessor('category', {
        header: '분류',
        size: 80,
        enableSorting: true,
        cell: (info) => (
            <span className="inline-flex px-2.5 py-1 bg-gray-100 text-gray-600 rounded-sm text-[11px] font-bold tracking-tight">
                {info.getValue()}
            </span>
        ),
    }),
    /* 작성자 */
    columnHelper.accessor('author', {
        header: '작성자',
        size: 100,
        enableSorting: true,
        cell: (info) => (
            <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-sm bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-[11px] font-bold text-slate-600">
                    {info.getValue().charAt(0)}
                </div>
                <span className="text-[13px] font-semibold text-gray-700 tracking-tight">{info.getValue()}</span>
            </div>
        ),
    }),
    /* 상태 */
    columnHelper.accessor('status', {
        header: '상태',
        size: 100,
        enableSorting: true,
        cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    /* 등록일 */
    columnHelper.accessor('date', {
        header: '등록일',
        size: 100,
        enableSorting: true,
        cell: (info) => <span className="text-[12px] text-gray-400 font-medium tabular-nums">{info.getValue()}</span>,
    }),
    /* 조회 */
    columnHelper.accessor('views', {
        header: '조회',
        size: 70,
        enableSorting: true,
        cell: (info) => <span className="text-[12px] text-gray-400 font-medium tabular-nums">{info.getValue().toLocaleString()}</span>,
    }),
    /* 액션 */
    columnHelper.display({
        id: 'actions',
        header: '',
        size: 100,
        cell: () => (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <button className="p-1.5 rounded-sm text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-150"><Eye className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-sm text-gray-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors duration-150"><Pencil className="w-4 h-4" /></button>
                <button className="p-1.5 rounded-sm text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors duration-150"><Trash2 className="w-4 h-4" /></button>
            </div>
        ),
    }),
];

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                                */
/* ══════════════════════════════════════════ */
export default function DemoPage1() {
    const [data, setData] = useState<Item[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('전체');

    const allCategories = ['전체', ...CATEGORIES];

    /* 데이터 로드 */
    const loadData = useCallback(async (pag: PaginationState, sort: SortingState, search: string, category: string) => {
        setIsLoading(true);
        const result = await fetchItems({ page: pag.pageIndex, pageSize: pag.pageSize, sorting: sort, search, category });
        setData(result.data);
        setTotal(result.total);
        setIsLoading(false);
    }, []);

    /* 상태 변경 시 데이터 재로드 */
    useEffect(() => {
        loadData(pagination, sorting, searchTerm, selectedCategory);
    }, [pagination, sorting, searchTerm, selectedCategory, loadData]);

    /* 검색/카테고리 변경 시 첫 페이지로 */
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    };
    const handleCategory = (cat: string) => {
        setSelectedCategory(cat);
        setPagination(p => ({ ...p, pageIndex: 0 }));
    };

    const pageCount = Math.ceil(total / pagination.pageSize);

    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { sorting, pagination },
        manualPagination: true,
        manualSorting: true,
        onSortingChange: (updater) => {
            const next = typeof updater === 'function' ? updater(sorting) : updater;
            setSorting(next);
            setPagination(p => ({ ...p, pageIndex: 0 }));
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="h-full flex flex-col">
            {/* 페이지 타이틀 */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">안건 관리</h1>
                    <p className="text-sm text-gray-400 mt-1 font-medium">서버사이드 페이징 + 검색/필터 종합 예시 (237건)</p>
                </div>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-sm hover:bg-slate-800 active:scale-[0.98] transition-all duration-200 shadow-md shadow-slate-900/15 tracking-tight">
                    <Plus className="w-4 h-4" strokeWidth={2.5} />
                    새 안건 등록
                </button>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-4 gap-4 mb-5">
                <StatCard label="전체 안건" value={STATS.total} change="+12%" icon={Layers} accent="from-slate-600 to-slate-700" />
                <StatCard label="승인 완료" value={STATS.approved} change="+8%" icon={CheckCircle2} accent="from-emerald-500 to-emerald-600" />
                <StatCard label="진행중" value={STATS.inProgress} change="+23%" icon={Activity} accent="from-blue-500 to-blue-600" />
                <StatCard label="대기 / 반려" value={STATS.pending} change="-5%" icon={AlertTriangle} accent="from-amber-500 to-amber-600" />
            </div>

            {/* 검색 + 필터 */}
            <div className="bg-white border border-gray-200 rounded-sm p-4 shadow-sm shadow-gray-100 mb-4">
                <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="제목, 작성자 검색..."
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-sm text-sm text-slate-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all duration-200 font-medium"
                        />
                    </div>
                    <select
                        value={pagination.pageSize}
                        onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                        className="px-3 py-2.5 border border-gray-200 rounded-sm text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer font-semibold"
                    >
                        {[10, 20, 50].map(size => (
                            <option key={size} value={size}>{size}건씩</option>
                        ))}
                    </select>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-sm text-sm text-gray-600 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                        <SlidersHorizontal className="w-4 h-4" />필터
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-sm text-sm text-gray-600 font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all duration-200">
                        <Download className="w-4 h-4" />내보내기
                    </button>
                </div>
                {/* 카테고리 칩 */}
                <div className="flex items-center gap-2 mt-3 overflow-x-auto">
                    {allCategories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => handleCategory(cat)}
                            className={`px-3.5 py-1.5 rounded-sm text-[12px] font-bold tracking-tight transition-all duration-200 flex-shrink-0
                                ${selectedCategory === cat
                                    ? 'bg-slate-900 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* 테이블 */}
            <div className="bg-white border border-gray-200 rounded-sm overflow-hidden flex-1 flex flex-col shadow-sm shadow-gray-100">
                {/* 테이블 메타 */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 flex-shrink-0">
                    <p className="text-[13px] text-gray-500 font-medium">
                        총 <span className="font-extrabold text-slate-900">{total.toLocaleString()}</span>건
                        {searchTerm && <span className="ml-2 text-xs text-blue-500 font-semibold">&quot;{searchTerm}&quot; 검색 결과</span>}
                    </p>
                    <p className="text-[11px] text-gray-400 font-medium">
                        {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)} 표시 중
                    </p>
                </div>

                {/* 테이블 본문 */}
                <div className="flex-1 overflow-auto relative">
                    {/* 로딩 오버레이 */}
                    {isLoading && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                                <span className="text-sm text-gray-500 font-medium">불러오는 중...</span>
                            </div>
                        </div>
                    )}

                    <table className="w-full">
                        <thead className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur-sm">
                            <tr className="border-b border-gray-200">
                                {table.getHeaderGroups()[0].headers.map(header => (
                                    <th key={header.id}
                                        className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                                        style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                                        {header.column.getCanSort() ? (
                                            <button onClick={header.column.getToggleSortingHandler()}
                                                className="flex items-center gap-1 hover:text-slate-900 transition-colors">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <SortIcon sorted={header.column.getIsSorted()} />
                                            </button>
                                        ) : (
                                            flexRender(header.column.columnDef.header, header.getContext())
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <tr key={row.id}
                                    className="border-b border-gray-50 hover:bg-blue-50/30 transition-colors duration-200 cursor-pointer group">
                                    {row.getVisibleCells().map(cell => (
                                        <td key={cell.id} className="px-5 py-4 whitespace-nowrap">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                            {!isLoading && data.length === 0 && (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-16 text-center text-gray-400 text-sm">
                                        검색 결과가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* 페이지네이션 */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 flex-shrink-0 bg-gray-50/50">
                    <p className="text-[12px] text-gray-400 font-medium">
                        <span className="font-bold text-slate-900">
                            {total > 0 ? `${pagination.pageIndex * pagination.pageSize + 1}–${Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)}` : '0'}
                        </span> / 전체 {total.toLocaleString()}건
                    </p>
                    <div className="flex items-center gap-1">
                        <button onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <ChevronsLeft className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                            className="p-1.5 rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                            const current = pagination.pageIndex;
                            let start = Math.max(0, current - 2);
                            const end = Math.min(pageCount, start + 5);
                            start = Math.max(0, end - 5);
                            return start + i;
                        }).filter(p => p < pageCount).map(p => (
                            <button key={p} onClick={() => table.setPageIndex(p)}
                                className={`min-w-[32px] h-8 px-2 rounded-sm text-[12px] font-bold transition-all duration-200 border
                                    ${p === pagination.pageIndex
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-slate-900'
                                    }`}>
                                {p + 1}
                            </button>
                        ))}
                        <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => table.setPageIndex(pageCount - 1)} disabled={!table.getCanNextPage()}
                            className="p-1.5 rounded-sm border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                            <ChevronsRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
