'use client';

import React, { useState } from 'react';
import {
    LayoutDashboard, Users, Settings, FileText, Bell, Trash2, Edit2,
    Plus, Search, ChevronDown, Eye, EyeOff, Mail, Lock, AlertCircle,
    Check, X, Shield, UserCheck, UserX, ArrowRight, Download, Upload
} from 'lucide-react';
import { toast } from 'sonner';

export default function UIComponentsPage() {
    const [inputValue, setInputValue] = useState('');
    const [selectValue, setSelectValue] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);

    /* ── 컬러 팔레트 데이터 ── */
    const colors = [
        { name: 'Primary', value: '#0f172a', text: 'white' },
        { name: 'Primary Hover', value: '#1e293b', text: 'white' },
        { name: 'Accent Blue', value: '#3b82f6', text: 'white' },
        { name: 'Accent Indigo', value: '#6366f1', text: 'white' },
        { name: 'Accent Emerald', value: '#10b981', text: 'white' },
        { name: 'Background', value: '#f8fafc', text: '#334155' },
        { name: 'Card White', value: '#ffffff', text: '#334155' },
        { name: 'Border', value: '#e2e8f0', text: '#334155' },
        { name: 'Sidebar Dark', value: '#161929', text: 'white' },
        { name: 'Text Primary', value: '#0f172a', text: 'white' },
        { name: 'Text Secondary', value: '#64748b', text: 'white' },
        { name: 'Text Muted', value: '#94a3b8', text: 'white' },
        { name: 'Success', value: '#059669', text: 'white' },
        { name: 'Success BG', value: '#ecfdf5', text: '#059669' },
        { name: 'Danger', value: '#dc2626', text: 'white' },
        { name: 'Danger BG', value: '#fef2f2', text: '#dc2626' },
    ];

    /* ── 아이콘 목록 ── */
    const icons = [
        { icon: <LayoutDashboard className="w-5 h-5" />, name: 'Dashboard' },
        { icon: <Users className="w-5 h-5" />, name: 'Users' },
        { icon: <Settings className="w-5 h-5" />, name: 'Settings' },
        { icon: <FileText className="w-5 h-5" />, name: 'FileText' },
        { icon: <Bell className="w-5 h-5" />, name: 'Bell' },
        { icon: <Trash2 className="w-5 h-5" />, name: 'Trash2' },
        { icon: <Edit2 className="w-5 h-5" />, name: 'Edit2' },
        { icon: <Plus className="w-5 h-5" />, name: 'Plus' },
        { icon: <Search className="w-5 h-5" />, name: 'Search' },
        { icon: <Mail className="w-5 h-5" />, name: 'Mail' },
        { icon: <Lock className="w-5 h-5" />, name: 'Lock' },
        { icon: <Shield className="w-5 h-5" />, name: 'Shield' },
        { icon: <Check className="w-5 h-5" />, name: 'Check' },
        { icon: <X className="w-5 h-5" />, name: 'X' },
        { icon: <Download className="w-5 h-5" />, name: 'Download' },
        { icon: <Upload className="w-5 h-5" />, name: 'Upload' },
        { icon: <Eye className="w-5 h-5" />, name: 'Eye' },
        { icon: <AlertCircle className="w-5 h-5" />, name: 'AlertCircle' },
        { icon: <ArrowRight className="w-5 h-5" />, name: 'ArrowRight' },
        { icon: <ChevronDown className="w-5 h-5" />, name: 'ChevronDown' },
    ];

    /* ── 섹션 래퍼 컴포넌트 ── */
    const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
        <section className="mb-10">
            <h2 className="text-lg font-bold text-slate-900 mb-4 pb-2 border-b border-slate-200">{title}</h2>
            {children}
        </section>
    );

    return (
        <div className="h-full flex flex-col">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">UI 컴포넌트</h1>
                    <p className="text-sm text-slate-500 mt-0.5">프로젝트에서 사용하는 공통 UI 요소 모음</p>
                </div>
            </div>

            <div className="flex-1 space-y-2">

                {/* ════════════════════════════════════════ */}
                {/* 1. 컬러 팔레트 */}
                {/* ════════════════════════════════════════ */}
                <Section title="컬러 팔레트">
                    <div className="grid grid-cols-4 gap-3">
                        {colors.map((c) => (
                            <div key={c.name} className="rounded-md overflow-hidden border border-slate-200">
                                <div
                                    className="h-16 flex items-end p-2"
                                    style={{ backgroundColor: c.value, color: c.text }}
                                >
                                    <span className="text-[11px] font-mono font-medium">{c.value}</span>
                                </div>
                                <div className="px-2 py-1.5 bg-white">
                                    <span className="text-xs font-medium text-slate-700">{c.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 2. 타이포그래피 */}
                {/* ════════════════════════════════════════ */}
                <Section title="타이포그래피">
                    <div className="bg-white rounded-md border border-slate-200 p-6 space-y-4">
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-2xl bold</span>
                            <h1 className="text-2xl font-bold text-slate-900">페이지 메인 타이틀</h1>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-xl bold</span>
                            <h2 className="text-xl font-bold text-slate-900">섹션 제목 (H2)</h2>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-lg semibold</span>
                            <h3 className="text-lg font-semibold text-slate-900">서브 제목 (H3)</h3>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-sm</span>
                            <p className="text-sm text-slate-700">본문 텍스트입니다. 일반적인 설명에 사용합니다.</p>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-xs medium</span>
                            <p className="text-xs font-medium text-slate-700">라벨 텍스트 (폼 필드 라벨)</p>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-xs muted</span>
                            <p className="text-xs text-slate-400">보조 텍스트 / 힌트 / 캡션</p>
                        </div>
                        <div className="flex items-baseline gap-4">
                            <span className="text-xs text-slate-400 w-24 shrink-0">text-[11px] mono</span>
                            <p className="text-[11px] font-mono text-slate-500">코드/기술 정보용 모노스페이스</p>
                        </div>
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 3. 버튼 */}
                {/* ════════════════════════════════════════ */}
                <Section title="버튼">
                    <div className="bg-white rounded-md border border-slate-200 p-6 space-y-6">
                        {/* 기본 버튼 */}
                        <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">기본 버튼</p>
                            <div className="flex items-center gap-3 flex-wrap">
                                <button className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all">
                                    <span className="flex items-center gap-1.5"><Plus className="w-4 h-4" /> Primary</span>
                                </button>
                                <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                    Secondary
                                </button>
                                <button className="px-4 py-2 bg-red-50 text-[#ef4444] text-sm font-medium border border-red-100 rounded-md hover:bg-red-100 transition-all">
                                    <span className="flex items-center gap-1.5"><Trash2 className="w-4 h-4" /> Danger</span>
                                </button>
                                <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md opacity-50 cursor-not-allowed">
                                    Disabled
                                </button>
                            </div>
                        </div>

                        {/* 아이콘 버튼 */}
                        <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">아이콘 버튼</p>
                            <div className="flex items-center gap-2">
                                <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-500 transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all relative">
                                    <Bell className="w-4 h-4" />
                                    <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
                                </button>
                                <button className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all">
                                    <Settings className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* 로딩 버튼 */}
                        <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">로딩 상태</p>
                            <button className="px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-md flex items-center gap-2 opacity-80 cursor-wait">
                                <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                                처리 중...
                            </button>
                        </div>
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 4. 입력 필드 */}
                {/* ════════════════════════════════════════ */}
                <Section title="입력 필드">
                    <div className="bg-white rounded-md border border-slate-200 p-6 space-y-5">
                        {/* 기본 텍스트 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">
                                기본 입력 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="텍스트를 입력하세요"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                        </div>

                        {/* 비밀번호 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="비밀번호를 입력하세요"
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 pr-10 text-sm text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        {/* 셀렉트 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">셀렉트 박스</label>
                            <div className="relative">
                                <select
                                    value={selectValue}
                                    onChange={(e) => setSelectValue(e.target.value)}
                                    className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
                                >
                                    <option value="">선택하세요</option>
                                    <option value="opt1">옵션 1</option>
                                    <option value="opt2">옵션 2</option>
                                    <option value="opt3">옵션 3</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 에러 상태 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">에러 상태</label>
                            <input
                                type="text"
                                value="잘못된 입력값"
                                readOnly
                                className="w-full border border-red-400 bg-red-50 rounded-md px-3 py-2 text-sm text-slate-900 focus:outline-none transition-all"
                            />
                            <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                                <AlertCircle className="w-3.5 h-3.5" /> 올바른 형식으로 입력해주세요.
                            </p>
                        </div>

                        {/* 비활성 상태 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">비활성 상태</label>
                            <input
                                type="text"
                                value="수정 불가"
                                disabled
                                className="w-full border border-slate-200 bg-slate-50 rounded-md px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 5. 배지 & 태그 */}
                {/* ════════════════════════════════════════ */}
                <Section title="배지 & 태그">
                    <div className="bg-white rounded-md border border-slate-200 p-6 space-y-5">
                        {/* 역할 배지 */}
                        <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">역할 배지</p>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: '#0f172a20', color: '#0f172a' }}>SUPER_ADMIN</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: '#10b98120', color: '#10b981' }}>ADMIN</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}>EDITOR</span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold" style={{ backgroundColor: '#6366f120', color: '#6366f1' }}>VIEWER</span>
                            </div>
                        </div>

                        {/* 상태 배지 */}
                        <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">상태 배지</p>
                            <div className="flex items-center gap-3">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#ecfdf5] text-[#059669]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" /> 활성
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#fef2f2] text-[#dc2626]">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#dc2626]" /> 잠금
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                                    <Lock className="w-3 h-3" /> 시스템
                                </span>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 6. 테이블 */}
                {/* ════════════════════════════════════════ */}
                <Section title="테이블">
                    <div className="bg-white rounded-md border border-slate-200 overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">이름</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">이메일</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">권한</th>
                                    <th className="px-5 py-3 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">상태</th>
                                    <th className="px-5 py-3 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">관리</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { name: '홍길동', email: 'hong@example.com', role: 'SUPER_ADMIN', roleColor: '#0f172a', active: true },
                                    { name: '김철수', email: 'kim@example.com', role: 'ADMIN', roleColor: '#10b981', active: true },
                                    { name: '이영희', email: 'lee@example.com', role: 'EDITOR', roleColor: '#f59e0b', active: false },
                                ].map((row) => (
                                    <tr key={row.email} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-full bg-slate-900/10 flex items-center justify-center text-[11px] font-bold text-slate-900">
                                                    {row.name.substring(0, 1)}
                                                </div>
                                                <span className="text-sm font-medium text-slate-900">{row.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-sm text-slate-500">{row.email}</td>
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
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 7. 모달 & 드로어 */}
                {/* ════════════════════════════════════════ */}
                <Section title="모달 & 드로어">
                    <div className="bg-white rounded-md border border-slate-200 p-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setShowModal(true)}
                                className="px-4 py-2 bg-red-50 text-[#ef4444] text-sm font-medium border border-red-100 rounded-md hover:bg-red-100 transition-all"
                            >
                                확인 모달 열기
                            </button>
                            <button
                                onClick={() => setShowDrawer(true)}
                                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all"
                            >
                                드로어 열기
                            </button>
                            <button
                                onClick={() => toast.success('저장되었습니다.')}
                                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all"
                            >
                                성공 토스트
                            </button>
                            <button
                                onClick={() => toast.error('처리 중 오류가 발생했습니다.')}
                                className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all"
                            >
                                에러 토스트
                            </button>
                        </div>
                    </div>

                    {/* 확인 모달 */}
                    {showModal && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowModal(false)}>
                            <div className="max-w-md w-full bg-white rounded-md shadow-2xl p-8 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                <div className="flex items-start gap-4 mb-6">
                                    <div className="w-12 h-12 rounded-md bg-rose-100 flex items-center justify-center flex-shrink-0">
                                        <AlertCircle className="w-6 h-6 text-rose-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-900">삭제 확인</h3>
                                        <p className="text-sm text-slate-500 mt-1">이 항목을 정말 삭제하시겠습니까? 삭제된 데이터는 복구할 수 없습니다.</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-end gap-3">
                                    <button onClick={() => setShowModal(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                        취소
                                    </button>
                                    <button onClick={() => setShowModal(false)} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-md transition-all">
                                        삭제
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 드로어 */}
                    {showDrawer && (
                        <div className="fixed inset-0 z-[100] flex justify-end">
                            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" onClick={() => setShowDrawer(false)} />
                            <div className="relative w-[420px] bg-white shadow-xl flex flex-col animate-in slide-in-from-right duration-250">
                                {/* 드로어 헤더 */}
                                <div className="flex items-center justify-between px-6 h-14 border-b border-slate-200">
                                    <h3 className="text-base font-bold text-slate-900">샘플 드로어</h3>
                                    <button onClick={() => setShowDrawer(false)} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                {/* 드로어 본문 */}
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
                                            <option>ADMIN</option>
                                            <option>EDITOR</option>
                                            <option>VIEWER</option>
                                        </select>
                                    </div>
                                </div>
                                {/* 드로어 푸터 */}
                                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
                                    <button onClick={() => setShowDrawer(false)} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                                        취소
                                    </button>
                                    <button onClick={() => { setShowDrawer(false); toast.success('저장되었습니다.'); }} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all">
                                        저장
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </Section>

                {/* ════════════════════════════════════════ */}
                {/* 8. 아이콘 */}
                {/* ════════════════════════════════════════ */}
                <Section title="아이콘 (Lucide React)">
                    <div className="bg-white rounded-md border border-slate-200 p-6">
                        <div className="grid grid-cols-10 gap-3">
                            {icons.map((item) => (
                                <div key={item.name} className="flex flex-col items-center gap-1.5 p-3 rounded-md hover:bg-slate-100 transition-colors cursor-default">
                                    <span className="text-slate-500">{item.icon}</span>
                                    <span className="text-[10px] text-slate-400">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Section>

            </div>
        </div>
    );
}
