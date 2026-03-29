'use client';

import React, { useRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    createColumnHelper,
    SortingState,
    getSortedRowModel,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

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

/* ── 100,000건 Mock 데이터 생성 ── */
const DEPARTMENTS = ['개발팀', '기획팀', '디자인팀', '마케팅팀', '영업팀', '인사팀'];
const ROLES = ['SUPER_ADMIN', 'ADMIN', 'EDITOR', 'VIEWER'];
const STATUSES: User['status'][] = ['활성', '비활성', '대기'];

const ALL_DATA: User[] = Array.from({ length: 100_000 }, (_, i) => ({
    id: i + 1,
    name: `사용자${String(i + 1).padStart(6, '0')}`,
    email: `user${i + 1}@example.com`,
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: ROLES[i % ROLES.length],
    status: STATUSES[i % STATUSES.length],
    regDate: new Date(2020 + (i % 6), i % 12, (i % 28) + 1).toISOString().slice(0, 10),
}));

/* ── 컬럼 정의 ── */
const columnHelper = createColumnHelper<User>();

const columns = [
    columnHelper.accessor('id', {
        header: 'No.',
        size: 80,
        enableSorting: true,
    }),
    columnHelper.accessor('name', {
        header: '이름',
        size: 140,
        enableSorting: true,
    }),
    columnHelper.accessor('email', {
        header: '이메일',
        size: 220,
        enableSorting: true,
    }),
    columnHelper.accessor('department', {
        header: '부서',
        size: 100,
        enableSorting: true,
    }),
    columnHelper.accessor('role', {
        header: '역할',
        size: 120,
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
        size: 80,
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
        size: 120,
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

/* ── 행 높이 상수 ── */
const ROW_HEIGHT = 45;

/* ── 메인 컴포넌트 ── */
export default function VirtualScrollPage() {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const table = useReactTable({
        data: ALL_DATA,
        columns,
        state: { sorting },
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
    });

    const { rows } = table.getRowModel();

    const tableContainerRef = useRef<HTMLDivElement>(null);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => tableContainerRef.current,
        estimateSize: () => ROW_HEIGHT,
        overscan: 10,
    });

    const virtualItems = virtualizer.getVirtualItems();
    const totalHeight = virtualizer.getTotalSize();

    const paddingTop = useMemo(
        () => (virtualItems.length > 0 ? virtualItems[0].start : 0),
        [virtualItems]
    );
    const paddingBottom = useMemo(
        () => (virtualItems.length > 0 ? totalHeight - virtualItems[virtualItems.length - 1].end : 0),
        [virtualItems, totalHeight]
    );

    return (
        <div className="h-full flex flex-col">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">가상 스크롤링</h1>
                    <p className="text-sm text-slate-400 mt-0.5 font-medium">TanStack Table + @tanstack/react-virtual — 100,000건 렌더링</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-md">
                    <span className="text-xs text-amber-700 font-semibold">
                        DOM 렌더링: <span className="font-bold">{virtualItems.length}행</span>
                        <span className="text-amber-400 mx-1">/</span>
                        전체 <span className="font-bold">{rows.length.toLocaleString()}행</span>
                    </span>
                </div>
            </div>

            <div className="flex-1 space-y-2">
                <Section
                    title="핵심 설정"
                    description="useVirtualizer로 보이는 행만 DOM에 렌더링 — 스크롤해도 DOM 노드 수 고정"
                    code={`const virtualizer = useVirtualizer({
  count: rows.length,
  getScrollElement: () => tableContainerRef.current,
  estimateSize: () => 45,
  overscan: 10,
});`}
                >
                    <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                            <span className="text-sm text-slate-500 font-medium">
                                전체 <span className="font-extrabold text-slate-900">{rows.length.toLocaleString()}</span>건
                                <span className="ml-2 text-xs text-slate-400">— 스크롤하여 탐색</span>
                            </span>
                            <span className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-semibold">
                                실제 DOM: {virtualItems.length}행만 렌더링 중
                            </span>
                        </div>

                        <div ref={tableContainerRef} className="overflow-auto" style={{ height: '520px' }}>
                            <table className="w-full text-sm border-collapse">
                                <thead className="sticky top-0 z-10">
                                    {table.getHeaderGroups().map((headerGroup) => (
                                        <tr key={headerGroup.id} className="border-b border-slate-200 bg-slate-50">
                                            {headerGroup.headers.map((header) => (
                                                <th key={header.id}
                                                    className="px-4 py-3 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap"
                                                    style={{ width: header.getSize() }}>
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
                                    ))}
                                </thead>
                                <tbody>
                                    {paddingTop > 0 && (
                                        <tr style={{ height: paddingTop }}><td colSpan={columns.length} /></tr>
                                    )}
                                    {virtualItems.map((virtualRow) => {
                                        const row = rows[virtualRow.index];
                                        return (
                                            <tr key={row.id}
                                                className={`border-b border-slate-50 transition-colors hover:bg-slate-50 ${virtualRow.index % 2 === 0 ? '' : 'bg-slate-50/50'}`}
                                                style={{ height: ROW_HEIGHT }}>
                                                {row.getVisibleCells().map((cell) => (
                                                    <td key={cell.id} className="px-4 py-3 text-slate-700 whitespace-nowrap">
                                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                    </td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                    {paddingBottom > 0 && (
                                        <tr style={{ height: paddingBottom }}><td colSpan={columns.length} /></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Section>
            </div>
        </div>
    );
}
