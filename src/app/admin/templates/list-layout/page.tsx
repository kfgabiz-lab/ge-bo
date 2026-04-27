'use client';

import React, { useState } from 'react';
import {
    Plus, Search, X, RotateCcw, ChevronDown, ChevronUp, ChevronsUpDown,
    Users, UserCheck, UserX, AlertCircle,
    ImageIcon, Link2, BarChart2, Tag, Clock, Layers,
} from 'lucide-react';
import { toast } from 'sonner';
import { TableCellRenderer } from '../make/_shared/components/renderer/TableCellRenderer';
import type { TableColumnConfig } from '../make/_shared/types';

/* ────────────────────────────────────────────────────────── */
/* 컬럼 정의 — TableColumnConfig 기반, 지원 타입 전부 포함   */
/* ────────────────────────────────────────────────────────── */
const COLUMNS: TableColumnConfig[] = [
    /* text — 기본 텍스트 */
    {
        id: 'c-name', header: '이름', accessor: 'name',
        align: 'left', sortable: true, cellType: 'text',
    },
    /* text — 기본 텍스트 */
    {
        id: 'c-email', header: '이메일', accessor: 'email',
        align: 'left', sortable: false, cellType: 'text',
    },
    /* text + isNumber — 숫자 포맷 (3자리 콤마) */
    {
        id: 'c-salary', header: '급여', accessor: 'salary',
        align: 'right', sortable: true, cellType: 'text', isNumber: true,
    },
    /* badge square — 사각형 모양, 도트 아이콘 없음 */
    {
        id: 'c-role', header: '권한', accessor: 'role',
        align: 'center', sortable: false, cellType: 'badge',
        badgeShape: 'square', showIcon: false,
        cellOptions: [
            { value: 'SUPER_ADMIN', text: 'SUPER', color: 'purple' },
            { value: 'ADMIN',       text: 'ADMIN', color: 'slate'  },
            { value: 'EDITOR',      text: 'EDITOR', color: 'blue'  },
            { value: 'VIEWER',      text: 'VIEWER', color: 'amber' },
        ],
    },
    /* badge round + showIcon — 원형 모양, 도트 아이콘 표시 */
    {
        id: 'c-status', header: '상태', accessor: 'status',
        align: 'center', sortable: false, cellType: 'badge',
        badgeShape: 'round', showIcon: true,
        cellOptions: [
            { value: 'active',   text: '활성',   color: 'emerald' },
            { value: 'inactive', text: '비활성', color: 'red'     },
        ],
    },
    /* boolean — 참/거짓 텍스트 표시 */
    {
        id: 'c-visible', header: '공개여부', accessor: 'visible',
        align: 'center', sortable: false, cellType: 'boolean',
        trueText: '공개', falseText: '비공개',
    },
    /* file — 첨부파일 수 표시 */
    {
        id: 'c-file', header: '첨부파일', accessor: 'fileIds',
        align: 'center', sortable: false, cellType: 'file',
    },
    /* actions — 프리셋(수정/상세/삭제) + 커스텀 버튼 */
    {
        id: 'c-actions', header: '관리', accessor: '_id',
        align: 'center', sortable: false, cellType: 'actions',
        actions: ['edit', 'detail', 'delete'],
        customActions: [{ id: 'ca-approve', label: '승인', color: 'green' }],
    },
];

/* ── 샘플 데이터 ── */
const SAMPLE_DATA: Record<string, unknown>[] = [
    { _id: 1, name: '홍길동', email: 'hong@example.com', salary: 4500000, role: 'ADMIN',       status: 'active',   visible: true,  fileIds: [1, 2]    },
    { _id: 2, name: '김철수', email: 'kim@example.com',  salary: 3800000, role: 'EDITOR',      status: 'inactive', visible: false, fileIds: [3]       },
    { _id: 3, name: '이영희', email: 'lee@example.com',  salary: 5200000, role: 'VIEWER',      status: 'active',   visible: true,  fileIds: []        },
    { _id: 4, name: '박민수', email: 'park@example.com', salary: 4100000, role: 'SUPER_ADMIN', status: 'inactive', visible: true,  fileIds: [4, 5, 6] },
    { _id: 5, name: '최지은', email: 'choi@example.com', salary: 3500000, role: 'EDITOR',      status: 'active',   visible: false, fileIds: []        },
];

/* ── 미지원 패턴 목록 ── */
const UNSUPPORTED = [
    { icon: <Users className="w-4 h-4" />,    label: '아바타 + 이름 조합',      desc: '이니셜 원형 아이콘과 이름 텍스트를 한 셀에 함께 표시하는 패턴' },
    { icon: <ImageIcon className="w-4 h-4" />, label: '이미지 썸네일',           desc: '이미지 파일을 셀 안에서 작은 썸네일로 미리보기하는 패턴' },
    { icon: <BarChart2 className="w-4 h-4" />, label: '진행률 바 (Progress)',    desc: 'Progress bar로 백분율 수치를 시각적으로 표현하는 패턴' },
    { icon: <Layers className="w-4 h-4" />,    label: '멀티라인 (제목 + 부제목)', desc: '제목과 부제목을 2줄로 쌓아 표시하는 패턴' },
    { icon: <Tag className="w-4 h-4" />,       label: '태그 그룹',               desc: '복수의 태그/칩을 한 셀에 인라인으로 나열하는 패턴' },
    { icon: <Link2 className="w-4 h-4" />,     label: '외부 링크 셀',            desc: '클릭 시 새 탭으로 이동하는 URL 링크 패턴' },
    { icon: <Clock className="w-4 h-4" />,     label: '상대 시간 표시',          desc: '"3일 전", "방금 전" 형식의 상대적 날짜 표기 패턴' },
    { icon: <Tag className="w-4 h-4" />,       label: '동적 컬러 배지',          desc: '#hex 코드를 직접 지정하는 배지 — 현재 미리 정의된 8가지 색상명만 지원' },
];

/* 정렬 아이콘 — 외부 선언으로 리렌더 시 재생성 방지 */
function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
    if (sorted === 'asc')  return <ChevronUp   className="w-3.5 h-3.5 text-blue-500" />;
    if (sorted === 'desc') return <ChevronDown className="w-3.5 h-3.5 text-blue-500" />;
    return <ChevronsUpDown className="w-3.5 h-3.5 text-slate-300" />;
}

export default function ListLayoutPage() {
    const [searchTerm, setSearchTerm]   = useState('');
    const [filterRole, setFilterRole]   = useState('');
    const [showDrawer, setShowDrawer]   = useState(false);
    const [sortKey,    setSortKey]      = useState<string | null>(null);
    const [sortDir,    setSortDir]      = useState<'asc' | 'desc'>('asc');

    /* ── 정렬 핸들러 ── */
    const handleSort = (accessor: string) => {
        if (sortKey === accessor) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(accessor);
            setSortDir('asc');
        }
    };

    /* ── 통계 카드 ── */
    const stats = [
        { label: '전체 계정', value: SAMPLE_DATA.length,                                    icon: <Users     className="w-5 h-5" />, color: '#0f172a' },
        { label: '활성',      value: SAMPLE_DATA.filter(d => d.status === 'active').length,   icon: <UserCheck className="w-5 h-5" />, color: '#059669' },
        { label: '비활성',    value: SAMPLE_DATA.filter(d => d.status === 'inactive').length, icon: <UserX    className="w-5 h-5" />, color: '#dc2626' },
    ];

    /* ── 필터 + 정렬 ── */
    let filtered = SAMPLE_DATA.filter(item => {
        const matchSearch = !searchTerm
            || String(item.name).includes(searchTerm)
            || String(item.email).includes(searchTerm);
        const matchRole = !filterRole || item.role === filterRole;
        return matchSearch && matchRole;
    });

    if (sortKey) {
        filtered = [...filtered].sort((a, b) => {
            const av = a[sortKey], bv = b[sortKey];
            if (typeof av === 'number' && typeof bv === 'number') {
                return sortDir === 'asc' ? av - bv : bv - av;
            }
            return sortDir === 'asc'
                ? String(av).localeCompare(String(bv))
                : String(bv).localeCompare(String(av));
        });
    }

    const resetFilters = () => { setSearchTerm(''); setFilterRole(''); };

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">목록형 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">TableCellRenderer 공통 컴포넌트 기반 테이블 패턴</p>
                </div>
                <button
                    onClick={() => setShowDrawer(true)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all"
                >
                    <Plus className="w-4 h-4" /> 등록
                </button>
            </div>

            {/* ── 통계 카드 ── */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white rounded-md border border-slate-200 p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: `${stat.color}10`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-400">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── 테이블 카드 ── */}
            <div className="bg-white rounded-md border border-slate-200 flex flex-col">

                {/* 툴바 */}
                <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100">
                    {/* 검색 */}
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="이름 또는 이메일 검색"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* 권한 필터 */}
                    <div className="relative">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
                        >
                            <option value="">전체 권한</option>
                            <option value="SUPER_ADMIN">SUPER</option>
                            <option value="ADMIN">ADMIN</option>
                            <option value="EDITOR">EDITOR</option>
                            <option value="VIEWER">VIEWER</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>

                    {/* 초기화 */}
                    {(searchTerm || filterRole) && (
                        <button onClick={resetFilters} className="flex items-center gap-1 px-3 py-2 text-xs text-slate-500 hover:text-slate-900 transition-colors">
                            <RotateCcw className="w-3.5 h-3.5" /> 초기화
                        </button>
                    )}
                </div>

                {/* 테이블 */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/80">
                                {COLUMNS.map(col => (
                                    <th
                                        key={col.id}
                                        className="px-4 py-3 text-xs font-semibold text-slate-600 whitespace-nowrap"
                                        style={{ textAlign: col.align }}
                                    >
                                        {col.sortable ? (
                                            <button
                                                onClick={() => handleSort(col.accessor)}
                                                className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
                                            >
                                                {col.header}
                                                <SortIcon sorted={sortKey === col.accessor ? sortDir : false} />
                                            </button>
                                        ) : (
                                            <span>{col.header}</span>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={COLUMNS.length} className="px-5 py-16 text-center">
                                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row._id as number} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        {COLUMNS.map(col => (
                                            <td
                                                key={col.id}
                                                className="px-4 py-3 whitespace-nowrap"
                                                style={{ textAlign: col.align }}
                                            >
                                                <TableCellRenderer
                                                    mode="live"
                                                    col={col}
                                                    row={row}
                                                    handlers={{
                                                        onEdit:   (r) => toast.info(`수정: ${r.name}`),
                                                        onDetail: (r) => toast.info(`상세: ${r.name}`),
                                                        onDelete: (id) => toast.error(`삭제: ID ${id}`),
                                                    }}
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── 미지원 패턴 (참고용) ── */}
            <div className="mt-6 bg-white rounded-md border border-slate-200 p-6 pb-4">
                <div className="mb-4">
                    <h3 className="text-sm font-bold text-slate-900">미지원 패턴 (참고용)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">TableCellRenderer가 지원하지 않는 셀 패턴 — 필요 시 공통 컴포넌트 확장 필요</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    {UNSUPPORTED.map((item, i) => (
                        <div key={i} className="flex items-start gap-3 py-2.5 px-3 rounded-md bg-slate-50 border border-slate-100">
                            <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-400 flex-shrink-0">
                                {item.icon}
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-700">{item.label}</p>
                                <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── 등록 드로어 ── */}
            {showDrawer && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowDrawer(false)} />
                    <div className="relative w-[420px] bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-250">
                        <div className="flex items-center justify-between px-6 h-14 border-b border-slate-200">
                            <h3 className="text-base font-bold text-slate-900">신규 등록</h3>
                            <button onClick={() => setShowDrawer(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">이름 <span className="text-red-500">*</span></label>
                                <input type="text" placeholder="이름을 입력하세요" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">이메일 <span className="text-red-500">*</span></label>
                                <input type="email" placeholder="이메일을 입력하세요" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">권한</label>
                                <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                    <option value="ADMIN">ADMIN</option>
                                    <option value="EDITOR">EDITOR</option>
                                    <option value="VIEWER">VIEWER</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                            <button onClick={() => setShowDrawer(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                취소
                            </button>
                            <button onClick={() => { setShowDrawer(false); toast.success('등록되었습니다.'); }} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all">
                                등록
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
