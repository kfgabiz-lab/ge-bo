'use client';

import React, { useState, useCallback } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    PaginationState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

/* ── 타입 정의 ── */
type User = {
    id: number;
    name: string;
    email: string;
    department: string;
    role: string;
    status: '활성' | '비활성' | '대기';
    regDate: string;
};

/* ── Mock 데이터 생성 (총 237건) ── */
const DEPARTMENTS = ['개발팀', '기획팀', '디자인팀', '마케팅팀', '영업팀', '인사팀'];
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'];
const STATUSES: User['status'][] = ['활성', '비활성', '대기'];

const ALL_DATA: User[] = Array.from({ length: 237 }, (_, i) => ({
    id: i + 1,
    name: `사용자${String(i + 1).padStart(3, '0')}`,
    email: `user${i + 1}@example.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    regDate: new Date(2025, i % 12, (i % 28) + 1).toISOString().slice(0, 10),
}));

/* ── Mock API (서버 통신 시뮬레이션) ── */
const fetchUsers = async ({
    page,
    pageSize,
    sorting,
}: {
    page: number;
    pageSize: number;
    sorting: SortingState;
}): Promise<{ data: User[]; total: number }> => {
    /* 300ms 딜레이로 실제 API 호출 시뮬레이션 */
    await new Promise((r) => setTimeout(r, 300));

    let sorted = [...ALL_DATA];

    /* 정렬 적용 */
    if (sorting.length > 0) {
        const { id, desc } = sorting[0];
        sorted.sort((a, b) => {
            const aVal = a[id as keyof User];
            const bVal = b[id as keyof User];
            if (aVal < bVal) return desc ? 1 : -1;
            if (aVal > bVal) return desc ? -1 : 1;
            return 0;
        });
    }

    /* 페이지 슬라이싱 */
    const start = page * pageSize;
    return {
        data: sorted.slice(start, start + pageSize),
        total: ALL_DATA.length,
    };
};

/* ── 컬럼 정의 ── */
const columnHelper = createColumnHelper<User>();

const columns = [
    columnHelper.accessor('id', {
        header: 'No.',
        size: 60,
        enableSorting: true,
    }),
    columnHelper.accessor('name', {
        header: '이름',
        enableSorting: true,
    }),
    columnHelper.accessor('email', {
        header: '이메일',
        enableSorting: true,
    }),
    columnHelper.accessor('department', {
        header: '부서',
        enableSorting: true,
    }),
    columnHelper.accessor('role', {
        header: '역할',
        enableSorting: true,
        cell: (info) => {
            const colorMap: Record<string, string> = {
                SUPER_ADMIN: 'bg-purple-100 text-purple-700',
                ADMIN: 'bg-blue-100 text-blue-700',
                EDITOR: 'bg-green-100 text-green-700',
                VIEWER: 'bg-gray-100 text-gray-600',
            };
            return (
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorMap[info.getValue()] ?? 'bg-gray-100 text-gray-600'}`}>
                    {info.getValue()}
                </span>
            );
        },
    }),
    columnHelper.accessor('status', {
        header: '상태',
        enableSorting: true,
        cell: (info) => {
            const colorMap: Record<string, string> = {
                활성: 'bg-emerald-100 text-emerald-700',
                비활성: 'bg-red-100 text-red-700',
                대기: 'bg-amber-100 text-amber-700',
            };
            return (
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${colorMap[info.getValue()] ?? ''}`}>
                    {info.getValue()}
                </span>
            );
        },
    }),
    columnHelper.accessor('regDate', {
        header: '등록일',
        enableSorting: true,
    }),
];

/* ── 섹션 래퍼 ── */
const Section = ({ title, description, code, children }: { title: string; description?: string; code?: string; children: React.ReactNode }) => (
    <section className="mb-8">
        <div className="mb-4 pb-2 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
        </div>
        {code && (
            <div className="mb-3 bg-[#161929] rounded-md p-4 overflow-x-auto">
                <pre className="text-xs text-slate-300 font-mono whitespace-pre">{code}</pre>
            </div>
        )}
        {children}
    </section>
);

/* ── 정렬 아이콘 ── */
const SortIcon = ({ sorted }: { sorted: false | 'asc' | 'desc' }) => {
    if (sorted === 'asc') return <ChevronUp className="w-3.5 h-3.5 text-slate-900" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-slate-900" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
};

/* ── 메인 컴포넌트 ── */
export default function ServerPaginationPage() {
    const [data, setData] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [sorting, setSorting] = useState<SortingState>([]);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });

    /* 데이터 로드 */
    const loadData = useCallback(async (pag: PaginationState, sort: SortingState) => {
        setIsLoading(true);
        const result = await fetchUsers({ page: pag.pageIndex, pageSize: pag.pageSize, sorting: sort });
        setData(result.data);
        setTotal(result.total);
        setIsLoading(false);
    }, []);

    /* 정렬/페이지 변경 시 데이터 재로드 */
    React.useEffect(() => {
        loadData(pagination, sorting);
    }, [pagination, sorting, loadData]);

    const pageCount = Math.ceil(total / pagination.pageSize);

    const table = useReactTable({
        data,
        columns,
        pageCount,
        state: { sorting, pagination },
        /* 서버사이드 모드 설정 */
        manualPagination: true,
        manualSorting: true,
        onSortingChange: (updater) => {
            /* 정렬 변경 시 첫 페이지로 이동 */
            const next = typeof updater === 'function' ? updater(sorting) : updater;
            setSorting(next);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        },
        onPaginationChange: setPagination,
        getCoreRowModel: getCoreRowModel(),
    });

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">서버사이드 페이징</h1>
                    <p className="text-sm text-slate-500 mt-0.5">TanStack Table + manualPagination + manualSorting</p>
                </div>
            </div>

            <div className="flex-1 space-y-2">

                {/* ════════════════════════════════════════ */}
                {/* 핵심 설정 코드 */}
                {/* ════════════════════════════════════════ */}
                <Section
                    title="핵심 설정"
                    description="서버사이드 페이징/정렬을 위한 useReactTable 설정"
                    code={`const table = useReactTable({
  data,                        // 현재 페이지 데이터만
  columns,
  pageCount,                   // 서버에서 받은 총 페이지 수
  state: { sorting, pagination },
  manualPagination: true,      // 서버사이드 페이징 활성화
  manualSorting: true,         // 서버사이드 정렬 활성화
  onSortingChange: setSorting,
  onPaginationChange: setPagination,
  getCoreRowModel: getCoreRowModel(),
});

// 상태 변경 감지 → API 재호출
useEffect(() => {
  fetchData({ page: pagination.pageIndex, pageSize: pagination.pageSize, sorting });
}, [pagination, sorting]);`}
                >
                    {/* ── 테이블 ── */}
                    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">

                        {/* 테이블 상단 툴바 */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                            <span className="text-sm text-slate-500">
                                전체 <span className="font-semibold text-slate-900">{total.toLocaleString()}</span>건
                            </span>
                            <select
                                value={pagination.pageSize}
                                onChange={(e) => setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })}
                                className="text-sm border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
                            >
                                {[10, 20, 50].map((size) => (
                                    <option key={size} value={size}>{size}건씩 보기</option>
                                ))}
                            </select>
                        </div>

                        {/* 테이블 본문 */}
                        <div className="relative overflow-x-auto">
                            {/* 로딩 오버레이 */}
                            {isLoading && (
                                <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                                    <Loader2 className="w-5 h-5 text-slate-900 animate-spin" />
                                </div>
                            )}
                            <table className="w-full text-sm">
                                <thead>
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50">
                                            {headerGroup.headers.map((header) => (
                                                <th
                                                    key={header.id}
                                                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
                                                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                                                >
                                                    {header.column.getCanSort() ? (
                                                        <button
                                                            onClick={header.column.getToggleSortingHandler()}
                                                            className="flex items-center gap-1 hover:text-slate-900 transition-colors"
                                                        >
                                                            {flexRender(header.column.columnDef.header, header.getContext())}
                                                            <SortIcon sorted={header.column.getIsSorted()} />
                                                        </button>
                                                    ) : (
                                                        flexRender(header.column.columnDef.header, header.getContext())
                                                    )}
                                                </th>
                                            ))}
                                        </tr>
                                    ))}
                                </thead>
                                <tbody>
                                    {table.getRowModel().rows.map((row, i) => (
                                        <tr
                                            key={row.id}
                                            className={`border-b border-slate-100 transition-colors hover:bg-slate-50 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                                        >
                                            {row.getVisibleCells().map((cell) => (
                                                <td key={cell.id} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* 페이지네이션 */}
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200">
                            <span className="text-xs text-slate-400">
                                {pagination.pageIndex * pagination.pageSize + 1}–{Math.min((pagination.pageIndex + 1) * pagination.pageSize, total)}
                                {' '}/ {total.toLocaleString()}건
                            </span>
                            <div className="flex items-center gap-1">
                                {/* 첫 페이지 */}
                                <button
                                    onClick={() => table.setPageIndex(0)}
                                    disabled={!table.getCanPreviousPage()}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronsLeft className="w-3.5 h-3.5" />
                                </button>
                                {/* 이전 페이지 */}
                                <button
                                    onClick={() => table.previousPage()}
                                    disabled={!table.getCanPreviousPage()}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5" />
                                </button>
                                {/* 페이지 번호 */}
                                {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                                    const current = pagination.pageIndex;
                                    let start = Math.max(0, current - 2);
                                    const end = Math.min(pageCount, start + 5);
                                    start = Math.max(0, end - 5);
                                    return start + i;
                                }).filter((p) => p < pageCount).map((p) => (
                                    <button
                                        key={p}
                                        onClick={() => table.setPageIndex(p)}
                                        className={`min-w-[32px] h-8 px-2 rounded-md text-xs font-medium transition-all border ${
                                            p === pagination.pageIndex
                                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm shadow-sm'
                                                : 'border-slate-200 text-slate-500 hover:bg-slate-100'
                                        }`}
                                    >
                                        {p + 1}
                                    </button>
                                ))}
                                {/* 다음 페이지 */}
                                <button
                                    onClick={() => table.nextPage()}
                                    disabled={!table.getCanNextPage()}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                                {/* 마지막 페이지 */}
                                <button
                                    onClick={() => table.setPageIndex(pageCount - 1)}
                                    disabled={!table.getCanNextPage()}
                                    className="p-1.5 rounded-md border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronsRight className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
}
