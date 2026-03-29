'use client';

import React, { useState } from 'react';
import {
    Save, X, User, Shield, FileText, Settings,
    ChevronDown, Eye, EyeOff, Upload, Info,
} from 'lucide-react';

/* ── 공통 스타일 ── */
const inputCls = "w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";
const selectCls = "w-full appearance-none border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer";
const labelCls = "block text-xs font-semibold text-slate-600 mb-1.5";

/* ── 섹션 네비게이션 ── */
const SECTIONS = [
    { id: 'basic', label: '기본 정보', icon: User, description: '이름, 이메일, 연락처 등 필수 정보를 입력합니다.' },
    { id: 'role', label: '권한 및 보안', icon: Shield, description: '역할, 비밀번호, 계정 활성화 설정을 관리합니다.' },
    { id: 'detail', label: '상세 정보', icon: FileText, description: '부서, 메모, 프로필 이미지 등 부가 정보를 입력합니다.' },
    { id: 'setting', label: '환경 설정', icon: Settings, description: '알림, 언어, 테마 등 개인 설정을 관리합니다.' },
];

/* ══════════════════════════════════════════ */
/*  메인 컴포넌트                                */
/* ══════════════════════════════════════════ */
export default function FormLayoutRightPage() {
    const [activeSection, setActiveSection] = useState('basic');
    const [showPassword, setShowPassword] = useState(false);
    const [isActive, setIsActive] = useState(true);
    const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });

    /* 폼 데이터 (데모용) */
    const [form, setForm] = useState({
        name: '', email: '', phone: '', employeeId: '',
        role: '', password: '', passwordConfirm: '',
        department: '', position: '', memo: '',
        language: 'ko', theme: 'light',
    });

    const updateForm = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

    return (
        <div className="h-full flex flex-col">
            {/* 페이지 헤더 */}
            <div className="flex items-end justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Layout (Right)</h1>
                    <p className="text-sm text-slate-500 mt-1">좌측 네비게이션 + 우측 폼 입력 레이아웃</p>
                </div>
                <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-white hover:border-slate-400 transition-all">
                        <X className="w-4 h-4" />취소
                    </button>
                    <button className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm">
                        <Save className="w-4 h-4" />저장
                    </button>
                </div>
            </div>

            {/* 본문: 좌측 네비 + 우측 폼 */}
            <div className="flex-1 flex gap-6 min-h-0">

                {/* ─── 좌측 섹션 네비게이션 ─── */}
                <div className="w-[240px] flex-shrink-0">
                    <div className="bg-white border border-slate-200 rounded-md shadow-sm sticky top-20">
                        <div className="px-4 py-3 border-b border-slate-100">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">섹션</p>
                        </div>
                        <nav className="p-2 space-y-0.5">
                            {SECTIONS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveSection(id)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium transition-all duration-150
                                        ${activeSection === id
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${activeSection === id ? 'text-white' : 'text-slate-400'}`} />
                                    {label}
                                </button>
                            ))}
                        </nav>

                        {/* 섹션 설명 */}
                        <div className="px-4 py-3 border-t border-slate-100">
                            <div className="flex items-start gap-2">
                                <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                    {SECTIONS.find(s => s.id === activeSection)?.description}
                                </p>
                            </div>
                        </div>

                        {/* 진행률 */}
                        <div className="px-4 py-3 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-[11px] font-semibold text-slate-500">작성 진행률</span>
                                <span className="text-[11px] font-bold text-slate-800">
                                    {Math.round(Object.values(form).filter(v => v !== '').length / Object.keys(form).length * 100)}%
                                </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-slate-900 rounded-full transition-all duration-300"
                                    style={{ width: `${Object.values(form).filter(v => v !== '').length / Object.keys(form).length * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* ─── 우측 폼 영역 ─── */}
                <div className="flex-1 overflow-y-auto space-y-6 pb-6">

                    {/* ═══ 기본 정보 ═══ */}
                    {activeSection === 'basic' && (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">기본 정보</h2>
                                <p className="text-xs text-slate-500 mt-0.5">관리자 계정의 기본 정보를 입력합니다.</p>
                            </div>
                            <div className="px-6 py-5 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>이름 <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="홍길동" value={form.name}
                                            onChange={e => updateForm('name', e.target.value)} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>사번 <span className="text-red-500">*</span></label>
                                        <input type="text" placeholder="BO-2026-00001" value={form.employeeId}
                                            onChange={e => updateForm('employeeId', e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                                <div>
                                    <label className={labelCls}>이메일 <span className="text-red-500">*</span></label>
                                    <input type="email" placeholder="admin@example.com" value={form.email}
                                        onChange={e => updateForm('email', e.target.value)} className={inputCls} />
                                    <p className="text-[11px] text-slate-400 mt-1">로그인 ID로 사용됩니다.</p>
                                </div>
                                <div>
                                    <label className={labelCls}>연락처</label>
                                    <input type="tel" placeholder="010-0000-0000" value={form.phone}
                                        onChange={e => updateForm('phone', e.target.value)} className={inputCls} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ 권한 및 보안 ═══ */}
                    {activeSection === 'role' && (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">권한 및 보안</h2>
                                <p className="text-xs text-slate-500 mt-0.5">역할과 보안 설정을 관리합니다.</p>
                            </div>
                            <div className="px-6 py-5 space-y-5">
                                <div>
                                    <label className={labelCls}>역할 <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <select value={form.role} onChange={e => updateForm('role', e.target.value)} className={selectCls}>
                                            <option value="">역할을 선택하세요</option>
                                            <option value="SUPER_ADMIN">최고 관리자 (SUPER_ADMIN)</option>
                                            <option value="ADMIN">관리자 (ADMIN)</option>
                                            <option value="EDITOR">편집자 (EDITOR)</option>
                                            <option value="VIEWER">뷰어 (VIEWER)</option>
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>비밀번호 <span className="text-red-500">*</span></label>
                                        <div className="relative">
                                            <input type={showPassword ? 'text' : 'password'} placeholder="8자 이상"
                                                value={form.password} onChange={e => updateForm('password', e.target.value)} className={inputCls} />
                                            <button type="button" onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>비밀번호 확인 <span className="text-red-500">*</span></label>
                                        <input type="password" placeholder="비밀번호 재입력"
                                            value={form.passwordConfirm} onChange={e => updateForm('passwordConfirm', e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                                {/* 계정 활성화 토글 */}
                                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-100">
                                    <div>
                                        <p className="text-sm font-semibold text-slate-800">계정 활성화</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5">비활성화 시 로그인이 차단됩니다.</p>
                                    </div>
                                    <button onClick={() => setIsActive(!isActive)}
                                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isActive ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${isActive ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ 상세 정보 ═══ */}
                    {activeSection === 'detail' && (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">상세 정보</h2>
                                <p className="text-xs text-slate-500 mt-0.5">부가 정보를 입력합니다.</p>
                            </div>
                            <div className="px-6 py-5 space-y-5">
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>부서</label>
                                        <div className="relative">
                                            <select value={form.department} onChange={e => updateForm('department', e.target.value)} className={selectCls}>
                                                <option value="">부서 선택</option>
                                                <option>개발팀</option><option>기획팀</option><option>디자인팀</option>
                                                <option>마케팅팀</option><option>영업팀</option><option>인사팀</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>직책</label>
                                        <input type="text" placeholder="팀장, 매니저 등" value={form.position}
                                            onChange={e => updateForm('position', e.target.value)} className={inputCls} />
                                    </div>
                                </div>
                                {/* 프로필 이미지 */}
                                <div>
                                    <label className={labelCls}>프로필 이미지</label>
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-md bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                                            <User className="w-6 h-6 text-slate-400" />
                                        </div>
                                        <div>
                                            <button className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-slate-50 transition-all">
                                                <Upload className="w-3.5 h-3.5" />이미지 업로드
                                            </button>
                                            <p className="text-[11px] text-slate-400 mt-1">JPG, PNG (최대 2MB)</p>
                                        </div>
                                    </div>
                                </div>
                                {/* 메모 */}
                                <div>
                                    <label className={labelCls}>메모</label>
                                    <textarea rows={4} placeholder="관리자에 대한 메모를 입력하세요..."
                                        value={form.memo} onChange={e => updateForm('memo', e.target.value)}
                                        className={`${inputCls} resize-none`} />
                                    <p className="text-[11px] text-slate-400 mt-1">{form.memo.length} / 500자</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ═══ 환경 설정 ═══ */}
                    {activeSection === 'setting' && (
                        <div className="bg-white border border-slate-200 rounded-md shadow-sm">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h2 className="text-base font-bold text-slate-900 tracking-tight">환경 설정</h2>
                                <p className="text-xs text-slate-500 mt-0.5">알림 및 개인 설정을 관리합니다.</p>
                            </div>
                            <div className="px-6 py-5 space-y-5">
                                {/* 알림 설정 */}
                                <div>
                                    <label className={labelCls}>알림 수신</label>
                                    <div className="space-y-3 mt-1">
                                        {[
                                            { key: 'email' as const, label: '이메일 알림', desc: '중요 공지 및 시스템 알림을 이메일로 수신합니다.' },
                                            { key: 'sms' as const, label: 'SMS 알림', desc: '긴급 알림을 SMS로 수신합니다.' },
                                            { key: 'push' as const, label: '푸시 알림', desc: '브라우저 푸시 알림을 수신합니다.' },
                                        ].map(({ key, label, desc }) => (
                                            <div key={key} className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-100">
                                                <div>
                                                    <p className="text-sm font-semibold text-slate-800">{label}</p>
                                                    <p className="text-[11px] text-slate-500 mt-0.5">{desc}</p>
                                                </div>
                                                <button onClick={() => setNotifications(prev => ({ ...prev, [key]: !prev[key] }))}
                                                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifications[key] ? 'bg-slate-900' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${notifications[key] ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* 언어/테마 */}
                                <div className="grid grid-cols-2 gap-5">
                                    <div>
                                        <label className={labelCls}>언어</label>
                                        <div className="relative">
                                            <select value={form.language} onChange={e => updateForm('language', e.target.value)} className={selectCls}>
                                                <option value="ko">한국어</option>
                                                <option value="en">English</option>
                                                <option value="ja">日本語</option>
                                            </select>
                                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelCls}>테마</label>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            {[
                                                { value: 'light', label: '라이트' },
                                                { value: 'dark', label: '다크' },
                                                { value: 'system', label: '시스템' },
                                            ].map(opt => (
                                                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                                                    <input type="radio" name="theme" value={opt.value}
                                                        checked={form.theme === opt.value}
                                                        onChange={() => updateForm('theme', opt.value)}
                                                        className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />
                                                    <span className="text-sm text-slate-700">{opt.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 하단 액션 (고정) */}
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button className="flex items-center gap-1.5 px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-semibold rounded-md hover:bg-white hover:border-slate-400 transition-all">
                            <X className="w-4 h-4" />취소
                        </button>
                        <button className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-md hover:bg-slate-800 active:scale-[0.98] transition-all shadow-sm">
                            <Save className="w-4 h-4" />저장
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
