'use client';

/**
 * ============================================================
 *  [템플릿] Layer > Right — Drawer 내부 컴포넌트 카탈로그
 * ============================================================
 *  개발자가 Drawer 안에 넣을 필드를 하나하나 확인하고
 *  복사해서 바로 사용할 수 있는 레퍼런스 페이지입니다.
 * ============================================================
 */

import React, { useState, useRef } from 'react';
import { PanelRight, Copy, Check, Eye, X, Upload, FileText, Image, Lock, AlertCircle } from 'lucide-react';
import SampleDrawer from './SampleDrawer';

/* ── 공통 스타일 ── */
const inputCls = "w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white";
const inputErrCls = "w-full border border-red-400 bg-red-50 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400 transition-all";
const selectCls = "w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer";
const fieldLabel = "text-xs font-medium text-slate-700";
const sectionTitle = "text-[11px] font-semibold text-slate-400 uppercase tracking-widest";

const SelectArrow = () => (
    <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
);

/* ══════════════════════════════════════════ */
/*  코드 스니펫 카드                            */
/* ══════════════════════════════════════════ */
const ComponentCard = ({ title, description, code, children }: {
    title: string;
    description: string;
    code: string;
    children: React.ReactNode;
}) => {
    const [copied, setCopied] = useState(false);
    const [showCode, setShowCode] = useState(false);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            {/* 카드 헤더 */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50/50">
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowCode(!showCode)}
                        className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all ${showCode ? 'bg-slate-900 text-white border-slate-900' : 'text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                    >
                        {showCode ? '미리보기' : '코드'}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-500 border border-slate-200 rounded-md hover:bg-slate-50 transition-all"
                    >
                        {copied ? <><Check className="w-3 h-3 text-emerald-500" />복사됨</> : <><Copy className="w-3 h-3" />복사</>}
                    </button>
                </div>
            </div>

            {/* 미리보기 or 코드 */}
            <div className="p-5">
                {showCode ? (
                    <div className="bg-slate-900 rounded-lg p-4 overflow-x-auto">
                        <pre className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap"><code>{code}</code></pre>
                    </div>
                ) : (
                    <div className="max-w-[380px]">{children}</div>
                )}
            </div>
        </div>
    );
};

/* ══════════════════════════════════════════ */
/*  메인 페이지                                */
/* ══════════════════════════════════════════ */
export default function LayerRightPage() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('create');

    /* 데모용 상태 */
    const [demoToggle, setDemoToggle] = useState(true);
    const [demoRadio, setDemoRadio] = useState('옵션1');
    const [demoChecks, setDemoChecks] = useState<string[]>(['이메일']);
    const [demoColor, setDemoColor] = useState('#4361ee');
    const [demoTags, setDemoTags] = useState<string[]>(['긴급', '검토필요']);
    const [demoTagInput, setDemoTagInput] = useState('');
    const [demoFiles, setDemoFiles] = useState<File[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleCheck = (item: string) => {
        setDemoChecks(prev => prev.includes(item) ? prev.filter(v => v !== item) : [...prev, item]);
    };
    const addTag = () => {
        const tag = demoTagInput.trim();
        if (tag && !demoTags.includes(tag)) setDemoTags(prev => [...prev, tag]);
        setDemoTagInput('');
    };

    const COLORS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

    const openDrawer = (mode: 'create' | 'edit') => {
        setDrawerMode(mode);
        setIsDrawerOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* 페이지 헤더 */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                        <PanelRight className="w-5 h-5 text-slate-400" />
                        우측 레이어 팝업 — 컴포넌트 카탈로그
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Drawer 내부에 넣을 수 있는 필드 유형별 샘플입니다. 각 항목을 복사해서 사용하세요.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => openDrawer('create')} className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-all shadow-sm">
                        <Eye className="w-4 h-4" />전체 미리보기 (등록)
                    </button>
                    <button onClick={() => openDrawer('edit')} className="inline-flex items-center gap-2 px-4 py-2 bg-white text-slate-700 text-sm font-semibold border border-slate-300 rounded-lg hover:bg-slate-50 transition-all">
                        <Eye className="w-4 h-4" />전체 미리보기 (수정)
                    </button>
                </div>
            </div>

            {/* ═══════════════════════════════════════ */}
            {/*  Drawer 골격                            */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Drawer 골격"
                description="Header + Body + Footer 기본 구조"
                code={`{/* Drawer 전체 구조 */}
<div className="fixed inset-0 z-[100] flex justify-end">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={onClose} />

    {/* Panel — 너비: w-[420px] 조절 가능 */}
    <div className="relative w-[420px] bg-white h-full shadow-xl flex flex-col animate-in slide-in-from-right duration-250 border-l border-slate-200">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
                <h2 className="text-sm font-bold text-slate-900">제목</h2>
                <p className="text-xs text-slate-400 mt-0.5">설명 텍스트</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 transition-all">
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* Body — 스크롤 가능 */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
            {/* 여기에 섹션/필드 배치 */}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex gap-2.5">
            <button className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all">취소</button>
            <button className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all shadow-sm">저장</button>
        </div>
    </div>
</div>`}
            >
                <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
                        <div><p className="font-bold text-slate-800">Header</p><p className="text-slate-400 text-[10px]">제목 + 닫기</p></div>
                        <div className="w-5 h-5 rounded border border-slate-300 flex items-center justify-center"><X className="w-3 h-3 text-slate-400" /></div>
                    </div>
                    <div className="px-4 py-6 text-center text-slate-400 border-b border-dashed border-slate-200">Body (스크롤 영역)<br /><span className="text-[10px]">섹션 / 필드 배치</span></div>
                    <div className="flex gap-2 px-4 py-3 bg-slate-50">
                        <span className="flex-1 text-center py-1.5 border border-slate-300 rounded text-slate-600">취소</span>
                        <span className="flex-1 text-center py-1.5 bg-slate-900 text-white rounded">저장</span>
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  섹션 타이틀                             */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="섹션 타이틀"
                description="각 섹션의 구분 제목"
                code={`{/* 섹션 타이틀 */}
<section className="space-y-4">
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
        섹션 제목
    </p>
    {/* 필드들 배치 */}
</section>`}
            >
                <div className="space-y-3">
                    <p className={sectionTitle}>기본 정보</p>
                    <p className={sectionTitle}>담당자</p>
                    <p className={sectionTitle}>일정</p>
                    <p className={sectionTitle}>옵션</p>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Input 1×1                              */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Input 1×1"
                description="텍스트 입력 — 1줄 전체 너비"
                code={`{/* Input 1×1 (전체 너비) */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">
        필드명 <span className="text-red-500">*</span>
    </label>
    <input
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="입력하세요"
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
    />
    {/* 에러 시 */}
    {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />{error}
        </p>
    )}
</div>`}
            >
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>제목 <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="제목을 입력하세요" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>제목 (에러 상태) <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="제목을 입력하세요" className={inputErrCls} />
                        <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />제목을 입력해주세요.</p>
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Input 1×2                              */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Input 1×2"
                description="텍스트 입력 — 2개 한 줄 (grid-cols-2)"
                code={`{/* Input 1×2 (2개 한 줄) */}
<div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">이메일</label>
        <input type="email" placeholder="email@example.com"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm ..." />
    </div>
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">연락처</label>
        <input type="tel" placeholder="010-0000-0000"
            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm ..." />
    </div>
</div>`}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>이메일</label>
                        <input type="email" placeholder="email@example.com" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>연락처</label>
                        <input type="tel" placeholder="010-0000-0000" className={inputCls} />
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Select 1×1                             */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Select 1×1"
                description="셀렉트 박스 — 1줄 전체 너비"
                code={`{/* Select 1×1 (전체 너비) */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">
        카테고리 <span className="text-red-500">*</span>
    </label>
    <div className="relative">
        <select
            value={value}
            onChange={e => setValue(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white cursor-pointer"
        >
            <option value="">선택하세요</option>
            <option value="notice">공지사항</option>
            <option value="event">이벤트</option>
        </select>
        <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
    </div>
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>카테고리 <span className="text-red-500">*</span></label>
                    <div className="relative">
                        <select className={selectCls}>
                            <option value="">선택하세요</option>
                            <option>공지사항</option>
                            <option>이벤트</option>
                            <option>FAQ</option>
                        </select>
                        <SelectArrow />
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Select 1×2                             */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Select 1×2"
                description="셀렉트 박스 — 2개 한 줄"
                code={`{/* Select 1×2 (2개 한 줄) */}
<div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">우선순위</label>
        <div className="relative">
            <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 pr-8 text-sm ...">
                <option value="high">긴급</option>
                <option value="mid">보통</option>
                <option value="low">낮음</option>
            </select>
            {/* SelectArrow SVG */}
        </div>
    </div>
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">상태</label>
        <div className="relative">
            <select className="...">
                <option value="">선택</option>
                <option>승인완료</option>
                <option>진행중</option>
            </select>
        </div>
    </div>
</div>`}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>우선순위</label>
                        <div className="relative">
                            <select className={selectCls}><option>긴급</option><option>보통</option><option>낮음</option></select>
                            <SelectArrow />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>상태</label>
                        <div className="relative">
                            <select className={selectCls}><option value="">선택</option><option>승인완료</option><option>진행중</option><option>대기</option></select>
                            <SelectArrow />
                        </div>
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Input + Select 1×2                     */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Input + Select 1×2"
                description="텍스트 + 셀렉트 혼합 한 줄"
                code={`{/* Input + Select 1×2 (혼합 한 줄) */}
<div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">작성자</label>
        <input type="text" placeholder="이름" className="..." />
    </div>
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">부서</label>
        <div className="relative">
            <select className="...">
                <option value="">선택</option>
                <option>개발팀</option>
                <option>기획팀</option>
            </select>
        </div>
    </div>
</div>`}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>작성자 <span className="text-red-500">*</span></label>
                        <input type="text" placeholder="이름" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>부서</label>
                        <div className="relative">
                            <select className={selectCls}><option value="">선택</option><option>개발팀</option><option>기획팀</option><option>디자인팀</option></select>
                            <SelectArrow />
                        </div>
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Textarea                               */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Textarea"
                description="여러 줄 텍스트 입력"
                code={`{/* Textarea */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">설명</label>
    <textarea
        rows={3}
        value={value}
        onChange={e => setValue(e.target.value)}
        placeholder="상세 설명을 입력하세요"
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white resize-none"
    />
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>설명</label>
                    <textarea rows={3} placeholder="상세 설명을 입력하세요" className={`${inputCls} resize-none`} />
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Date 1×1                               */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Date 1×1"
                description="날짜 선택 — 1줄 전체 너비"
                code={`{/* Date 1×1 (전체 너비) */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">마감일</label>
    <input
        type="date"
        value={value}
        onChange={e => setValue(e.target.value)}
        className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white"
    />
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>마감일</label>
                    <input type="date" className={inputCls} />
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Date Range                             */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Date Range"
                description="날짜 범위 — from ~ to"
                code={`{/* Date Range (from ~ to) */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">진행 기간</label>
    <div className="flex items-center gap-2">
        <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm ..." />
        <span className="text-sm text-slate-400 font-medium">~</span>
        <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="flex-1 border border-slate-200 rounded-md px-3 py-2 text-sm ..." />
    </div>
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>진행 기간</label>
                    <div className="flex items-center gap-2">
                        <input type="date" className={`flex-1 ${inputCls}`} />
                        <span className="text-sm text-slate-400 font-medium">~</span>
                        <input type="date" className={`flex-1 ${inputCls}`} />
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Date + Select 1×2                      */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Date + Select 1×2"
                description="날짜 + 셀렉트 혼합 한 줄"
                code={`{/* Date + Select 1×2 */}
<div className="grid grid-cols-2 gap-4">
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">시작일</label>
        <input type="date" className="..." />
    </div>
    <div className="space-y-1.5">
        <label className="text-xs font-medium text-slate-700">반복 주기</label>
        <div className="relative">
            <select className="...">
                <option>없음</option>
                <option>매일</option>
                <option>매주</option>
                <option>매월</option>
            </select>
        </div>
    </div>
</div>`}
            >
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>시작일</label>
                        <input type="date" className={inputCls} />
                    </div>
                    <div className="space-y-1.5">
                        <label className={fieldLabel}>반복 주기</label>
                        <div className="relative">
                            <select className={selectCls}><option>없음</option><option>매일</option><option>매주</option><option>매월</option></select>
                            <SelectArrow />
                        </div>
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Radio Group                            */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Radio Group"
                description="단일 선택 — 라디오 버튼"
                code={`{/* Radio Group */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">승인 방식</label>
    <div className="flex items-center gap-5 pt-0.5">
        {['자동 승인', '1차 승인', '2차 승인'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                    type="radio"
                    name="approval"
                    checked={selected === opt}
                    onChange={() => setSelected(opt)}
                    className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                />
                <span className="text-sm text-slate-700">{opt}</span>
            </label>
        ))}
    </div>
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>승인 방식</label>
                    <div className="flex items-center gap-5 pt-0.5">
                        {['옵션1', '옵션2', '옵션3'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="demo-radio" checked={demoRadio === opt} onChange={() => setDemoRadio(opt)} className="w-4 h-4 border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />
                                <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Checkbox Group                         */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Checkbox Group"
                description="복수 선택 — 체크박스"
                code={`{/* Checkbox Group */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">알림 수신</label>
    <div className="flex items-center gap-5 pt-0.5">
        {['이메일', 'SMS', '푸시', '슬랙'].map(opt => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                    type="checkbox"
                    checked={selected.includes(opt)}
                    onChange={() => toggleItem(opt)}
                    className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer"
                />
                <span className="text-sm text-slate-700">{opt}</span>
            </label>
        ))}
    </div>
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>알림 수신</label>
                    <div className="flex items-center gap-5 pt-0.5">
                        {['이메일', 'SMS', '푸시', '슬랙'].map(opt => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={demoChecks.includes(opt)} onChange={() => toggleCheck(opt)} className="w-4 h-4 rounded border-slate-400 text-slate-900 focus:ring-slate-900/20 cursor-pointer" />
                                <span className="text-sm text-slate-700">{opt}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Toggle Switch                          */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Toggle Switch"
                description="켜기/끄기 토글"
                code={`{/* Toggle Switch */}
<div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-200">
    <div>
        <p className="text-xs font-semibold text-slate-700">외부 공개</p>
        <p className="text-[11px] text-slate-400 mt-0.5">비공개 시 내부 직원만 열람 가능</p>
    </div>
    <button
        type="button"
        onClick={() => setValue(!value)}
        className={\`relative w-11 h-6 rounded-full transition-colors duration-200 \${value ? 'bg-slate-900' : 'bg-slate-300'}\`}
    >
        <div className={\`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 \${value ? 'translate-x-[22px]' : 'translate-x-0.5'}\`} />
    </button>
</div>`}
            >
                <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-md border border-slate-200">
                    <div>
                        <p className="text-xs font-semibold text-slate-700">외부 공개</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">비공개 시 내부 직원만 열람 가능</p>
                    </div>
                    <button type="button" onClick={() => setDemoToggle(!demoToggle)} className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${demoToggle ? 'bg-slate-900' : 'bg-slate-300'}`}>
                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${demoToggle ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
                    </button>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Color Picker                           */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Color Picker (프리셋)"
                description="미리 정의된 색상 선택"
                code={`{/* Color Picker */}
const PRESET_COLORS = ['#4361ee', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#6b7280'];

<div className="flex items-center gap-2 flex-wrap">
    {PRESET_COLORS.map(color => (
        <button
            key={color}
            type="button"
            onClick={() => setColor(color)}
            className="w-7 h-7 rounded-full transition-all hover:scale-110"
            style={{
                backgroundColor: color,
                outline: selected === color ? \`2px solid \${color}\` : 'none',
                outlineOffset: selected === color ? '2px' : '0',
            }}
        />
    ))}
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>색상</label>
                    <div className="flex items-center gap-2 flex-wrap">
                        {COLORS.map(color => (
                            <button key={color} type="button" onClick={() => setDemoColor(color)} className="w-7 h-7 rounded-full transition-all hover:scale-110"
                                style={{ backgroundColor: color, outline: demoColor === color ? `2px solid ${color}` : 'none', outlineOffset: demoColor === color ? '2px' : '0' }} />
                        ))}
                    </div>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Tag Input                              */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Tag Input"
                description="태그 입력 + Enter/추가 + 삭제"
                code={`{/* Tag Input */}
<div className="space-y-3">
    <div className="flex items-center gap-2">
        <input
            type="text"
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            placeholder="태그 입력 후 Enter"
            className="flex-1 ..."
        />
        <button type="button" onClick={addTag}
            className="px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50">
            추가
        </button>
    </div>
    {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                    {tag}
                    <button onClick={() => removeTag(tag)} className="text-slate-400 hover:text-red-500">
                        <X className="w-3 h-3" />
                    </button>
                </span>
            ))}
        </div>
    )}
</div>`}
            >
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <input type="text" value={demoTagInput} onChange={e => setDemoTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="태그 입력 후 Enter" className={`flex-1 ${inputCls}`} />
                        <button type="button" onClick={addTag} className="px-3 py-2 text-sm font-semibold text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-all">추가</button>
                    </div>
                    {demoTags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {demoTags.map(tag => (
                                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded-md">
                                    {tag}
                                    <button type="button" onClick={() => setDemoTags(prev => prev.filter(t => t !== tag))} className="text-slate-400 hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  File Upload                            */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="File Upload"
                description="드래그앤드롭 파일 업로드 + 파일 목록"
                code={`{/* File Upload (Drag & Drop) */}
const [files, setFiles] = useState<File[]>([]);
const [isDragOver, setIsDragOver] = useState(false);
const fileInputRef = useRef<HTMLInputElement>(null);

const addFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    setFiles(prev => [...prev, ...Array.from(newFiles)]);
};
const removeFile = (index: number) => setFiles(prev => prev.filter((_, i) => i !== index));

{/* 드래그앤드롭 영역 */}
<div
    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
    onDragLeave={() => setIsDragOver(false)}
    onDrop={e => { e.preventDefault(); setIsDragOver(false); addFiles(e.dataTransfer.files); }}
    onClick={() => fileInputRef.current?.click()}
    className={\`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all
        \${isDragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400'}\`}
>
    <input ref={fileInputRef} type="file" multiple className="hidden"
        onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />
    <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
    <p className="text-sm font-semibold text-slate-700">클릭하거나 파일을 드래그하세요</p>
    <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG (최대 10MB)</p>
</div>

{/* 파일 목록 */}
{files.map((file, i) => (
    <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
        <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-slate-400" />
            <div>
                <p className="text-sm font-medium text-slate-700">{file.name}</p>
                <p className="text-[11px] text-slate-400">{formatFileSize(file.size)}</p>
            </div>
        </div>
        <button onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-500">
            <X className="w-3.5 h-3.5" />
        </button>
    </div>
))}`}
            >
                <div className="space-y-3">
                    <div
                        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={e => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files) setDemoFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-all ${isDragOver ? 'border-slate-900 bg-slate-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/50'}`}
                    >
                        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => { if (e.target.files) setDemoFiles(prev => [...prev, ...Array.from(e.target.files!)]); e.target.value = ''; }} />
                        <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragOver ? 'text-slate-900' : 'text-slate-400'}`} />
                        <p className="text-sm font-semibold text-slate-700">{isDragOver ? '여기에 놓으세요' : '클릭하거나 파일을 드래그하세요'}</p>
                        <p className="text-[11px] text-slate-400 mt-1">PDF, JPG, PNG, XLSX, DOCX (최대 10MB)</p>
                    </div>
                    {demoFiles.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-xs font-semibold text-slate-600">{demoFiles.length}개 파일 선택됨</p>
                            {demoFiles.map((file, i) => (
                                <div key={`${file.name}-${i}`} className="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-md">
                                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                                            <p className="text-[11px] text-slate-400">{file.size < 1024 ? `${file.size}B` : `${(file.size / 1024).toFixed(0)}KB`}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setDemoFiles(prev => prev.filter((_, idx) => idx !== i))} className="p-1 rounded-md text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Readonly Field                         */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Readonly Field"
                description="읽기전용 필드 (수정 불가)"
                code={`{/* Readonly Field */}
<div className="space-y-1.5">
    <label className="text-xs font-medium text-slate-700">등록번호</label>
    <div className="relative">
        <input
            value="NO-20260321-001"
            readOnly
            className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-slate-50 text-slate-400 font-mono cursor-not-allowed pr-9"
        />
        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
    </div>
    <p className="text-[11px] text-slate-400">등록번호는 변경할 수 없습니다.</p>
</div>`}
            >
                <div className="space-y-1.5">
                    <label className={fieldLabel}>등록번호</label>
                    <div className="relative">
                        <input value="NO-20260321-001" readOnly className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-slate-50 text-slate-400 font-mono cursor-not-allowed pr-9" />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                    </div>
                    <p className="text-[11px] text-slate-400">등록번호는 변경할 수 없습니다.</p>
                </div>
            </ComponentCard>

            {/* ═══════════════════════════════════════ */}
            {/*  Footer Buttons                         */}
            {/* ═══════════════════════════════════════ */}
            <ComponentCard
                title="Footer Buttons"
                description="하단 고정 버튼 (취소 + 저장)"
                code={`{/* Footer — Drawer 하단 고정 */}
<div className="px-5 py-4 border-t border-slate-200 flex gap-2.5">
    {/* 취소 버튼 */}
    <button
        type="button"
        onClick={onClose}
        className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all"
    >
        취소
    </button>
    {/* 저장 버튼 (로딩 스피너 포함) */}
    <button
        type="button"
        onClick={handleSubmit}
        disabled={isLoading}
        className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
    >
        {isLoading
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : '저장'
        }
    </button>
</div>`}
            >
                <div className="border-t border-slate-200 pt-4 flex gap-2.5">
                    <button className="flex-1 py-2.5 text-sm font-semibold text-slate-700 border border-slate-300 rounded-md hover:bg-slate-100 transition-all">취소</button>
                    <button className="flex-1 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-all shadow-sm">저장</button>
                </div>
            </ComponentCard>

            {/* Drawer 전체 미리보기 */}
            <SampleDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                mode={drawerMode}
            />
        </div>
    );
}
