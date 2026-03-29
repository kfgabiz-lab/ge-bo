'use client';

import React, { useState } from 'react';
import {
    Plus, Search, X, RotateCcw, Edit2, Trash2, ChevronDown,
    Users, UserCheck, UserX, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

/* ── 샘플 데이터 ── */
const SAMPLE_DATA = [
    { id: 1, name: '홍길동', email: 'hong@example.com', department: '개발팀', role: 'ADMIN', roleColor: '#0f172a', active: true, regDate: '2026-01-15' },
    { id: 2, name: '김철수', email: 'kim@example.com', department: '기획팀', role: 'EDITOR', roleColor: '#10b981', active: true, regDate: '2026-02-20' },
    { id: 3, name: '이영희', email: 'lee@example.com', department: '디자인팀', role: 'VIEWER', roleColor: '#f59e0b', active: false, regDate: '2026-03-05' },
    { id: 4, name: '박민수', email: 'park@example.com', department: '개발팀', role: 'ADMIN', roleColor: '#0f172a', active: true, regDate: '2026-03-10' },
    { id: 5, name: '최지은', email: 'choi@example.com', department: '마케팅팀', role: 'EDITOR', roleColor: '#10b981', active: true, regDate: '2026-03-12' },
];

export default function ListLayoutPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('');
    const [showDrawer, setShowDrawer] = useState(false);

    /* ── 통계 카드 데이터 ── */
    const stats = [
        { label: '전체 계정', value: SAMPLE_DATA.length, icon: <Users className="w-5 h-5" />, color: '#0f172a' },
        { label: '활성', value: SAMPLE_DATA.filter(d => d.active).length, icon: <UserCheck className="w-5 h-5" />, color: '#059669' },
        { label: '잠금', value: SAMPLE_DATA.filter(d => !d.active).length, icon: <UserX className="w-5 h-5" />, color: '#dc2626' },
    ];

    /* ── 필터 적용 ── */
    const filtered = SAMPLE_DATA.filter(item => {
        const matchSearch = !searchTerm || item.name.includes(searchTerm) || item.email.includes(searchTerm);
        const matchRole = !filterRole || item.role === filterRole;
        return matchSearch && matchRole;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setFilterRole('');
    };

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">목록형 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">통계 카드 + 검색/필터 툴바 + 테이블 + Drawer 패턴</p>
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
            <div className="flex-1 bg-white rounded-md border border-slate-200 flex flex-col">

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

                    {/* 필터 */}
                    <div className="relative">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
                        >
                            <option value="">전체 권한</option>
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
                <div className="flex-1 overflow-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-slate-100">
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">이름</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">이메일</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">부서</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">권한</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">상태</th>
                                <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">등록일</th>
                                <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">관리</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-5 py-16 text-center">
                                        <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400">검색 결과가 없습니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((row) => (
                                    <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-slate-900/10 flex items-center justify-center text-[11px] font-bold text-slate-900">
                                                    {row.name.substring(0, 1)}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-500">{row.email}</td>
                                        <td className="px-5 py-3.5 text-sm text-slate-500">{row.department}</td>
                                        <td className="px-5 py-3.5">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: `${row.roleColor}20`, color: row.roleColor }}>
                                                {row.role}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${row.active ? 'bg-[#ecfdf5] text-[#059669]' : 'bg-[#fef2f2] text-[#dc2626]'}`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${row.active ? 'bg-[#059669]' : 'bg-[#dc2626]'}`} />
                                                {row.active ? '활성' : '잠금'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-500">{row.regDate}</td>
                                        <td className="px-5 py-3.5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                <button className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
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
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">부서</label>
                                <input type="text" placeholder="부서를 입력하세요" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1.5">권한</label>
                                <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                    <option>ADMIN</option>
                                    <option>EDITOR</option>
                                    <option>VIEWER</option>
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
