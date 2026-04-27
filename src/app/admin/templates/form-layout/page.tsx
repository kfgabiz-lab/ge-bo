'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { FieldRenderer } from '../make/_shared/components/renderer/FieldRenderer';

/** 섹션 래퍼 — 기존 FormSection 구조 유지 */
function FormSection({ title, description, children }: {
    title: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-white rounded-md border border-slate-200 p-6">
            <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <div className="space-y-5">{children}</div>
        </div>
    );
}

/**
 * 필드 레이블 + FieldRenderer 래퍼
 * full=true 시 grid col-span-2 (전체 너비)
 */
function FieldWrap({ label, required, full, children }: {
    label?: string;
    required?: boolean;
    full?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className={full ? 'col-span-2' : ''}>
            {label && (
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    {label}{required && <span className="text-red-500 ml-0.5">*</span>}
                </label>
            )}
            {children}
        </div>
    );
}

export default function FormLayoutPage() {
    /* ── 필드 값 상태 ── */
    const [values, setValues] = useState<Record<string, string>>({});
    const setValue = (id: string, v: string) => setValues(prev => ({ ...prev, [id]: v }));

    /* ── 파일/이미지 상태 ── */
    const [fileList, setFileList] = useState<File[]>([]);
    const [imageList, setImageList] = useState<File[]>([]);

    /* ── 미지원 패턴 상태 ── */
    const [showPassword, setShowPassword] = useState(false);
    const [isActive, setIsActive] = useState(true);

    /* ── 저장 시뮬레이션 ── */
    const [isSubmitting, setIsSubmitting] = useState(false);
    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => { setIsSubmitting(false); toast.success('저장되었습니다.'); }, 1500);
    };
    const handleReset = () => { setValues({}); setFileList([]); setImageList([]); };

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">폼형 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">FieldRenderer 공통 컴포넌트 기반 입력 폼 패턴</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={handleReset} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                        <RotateCcw className="w-4 h-4" /> 초기화
                    </button>
                    <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait">
                        {isSubmitting
                            ? <><div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />저장 중...</>
                            : <><Save className="w-4 h-4" /> 저장</>}
                    </button>
                </div>
            </div>

            {/* ── 폼 본문 ── */}
            <div className="flex-1 space-y-6 pb-6">

                {/* ════════════════════════════════════ */}
                {/* 1. 기본 입력 — input / select / date / dateRange */}
                {/* ════════════════════════════════════ */}
                <FormSection title="기본 입력" description="필수 입력 항목은 * 로 표시됩니다.">
                    <div className="grid grid-cols-2 gap-4">
                        <FieldWrap label="이름" required>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-name', type: 'input', label: '이름', colSpan: 6, required: true, placeholder: '이름을 입력하세요' }}
                                value={values['f-name']} onChange={v => setValue('f-name', v)} />
                        </FieldWrap>
                        <FieldWrap label="사번" required>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-empno', type: 'input', label: '사번', colSpan: 6, required: true, placeholder: '예: EMP-001' }}
                                value={values['f-empno']} onChange={v => setValue('f-empno', v)} />
                        </FieldWrap>
                        <FieldWrap label="이메일" required>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-email', type: 'input', label: '이메일', colSpan: 6, required: true, placeholder: 'example@company.com' }}
                                value={values['f-email']} onChange={v => setValue('f-email', v)} />
                        </FieldWrap>
                        <FieldWrap label="연락처">
                            <FieldRenderer mode="live"
                                field={{ id: 'f-phone', type: 'input', label: '연락처', colSpan: 6, placeholder: '010-0000-0000' }}
                                value={values['f-phone']} onChange={v => setValue('f-phone', v)} />
                        </FieldWrap>
                        <FieldWrap label="권한" required>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-role', type: 'select', label: '권한', colSpan: 6, required: true, placeholder: '선택하세요', options: ['SUPER_ADMIN:SUPER_ADMIN', 'ADMIN:ADMIN', 'EDITOR:EDITOR', 'VIEWER:VIEWER'] }}
                                value={values['f-role']} onChange={v => setValue('f-role', v)} />
                        </FieldWrap>
                        <FieldWrap label="부서">
                            <FieldRenderer mode="live"
                                field={{ id: 'f-dept', type: 'select', label: '부서', colSpan: 6, placeholder: '선택하세요', options: ['개발팀:dev', '기획팀:plan', '디자인팀:design', '마케팅팀:mkt'] }}
                                value={values['f-dept']} onChange={v => setValue('f-dept', v)} />
                        </FieldWrap>
                        <FieldWrap label="입사일">
                            <FieldRenderer mode="live"
                                field={{ id: 'f-joindate', type: 'date', label: '입사일', colSpan: 6 }}
                                value={values['f-joindate']} onChange={v => setValue('f-joindate', v)} />
                        </FieldWrap>
                        <FieldWrap label="계약 기간 ~ 종료일" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-contract', type: 'dateRange', label: '계약 기간', colSpan: 12 }}
                                value={values['f-contract']} onChange={v => setValue('f-contract', v)} />
                        </FieldWrap>
                    </div>
                </FormSection>

                {/* ════════════════════════════════════ */}
                {/* 2. 선택형 — radio / checkbox / button */}
                {/* ════════════════════════════════════ */}
                <FormSection title="선택형 입력">
                    <div className="grid grid-cols-2 gap-4">
                        <FieldWrap label="고용형태" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-emptype', type: 'radio', label: '고용형태', colSpan: 12, options: ['정규직:full', '계약직:contract', '파견직:dispatch', '인턴:intern'] }}
                                value={values['f-emptype']} onChange={v => setValue('f-emptype', v)} />
                        </FieldWrap>
                        <FieldWrap label="담당 업무" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-task', type: 'checkbox', label: '담당 업무', colSpan: 12, options: ['개발:dev', '기획:plan', '디자인:design', '마케팅:mkt', '영업:sales'] }}
                                value={values['f-task']} onChange={v => setValue('f-task', v)} />
                        </FieldWrap>
                        <FieldWrap label="조회 기간" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-period', type: 'button', label: '조회 기간', colSpan: 12, options: ['오늘:today', '1주:1w', '1개월:1m', '3개월:3m', '전체:all'] }}
                                value={values['f-period']} onChange={v => setValue('f-period', v)} />
                        </FieldWrap>
                    </div>
                </FormSection>

                {/* ════════════════════════════════════ */}
                {/* 3. 파일/미디어 — textarea / file / image / video */}
                {/* ════════════════════════════════════ */}
                <FormSection title="파일 및 미디어">
                    <div className="grid grid-cols-2 gap-4">
                        <FieldWrap label="소개" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-intro', type: 'textarea', label: '소개', colSpan: 12, placeholder: '간단한 소개를 입력하세요' }}
                                value={values['f-intro']} onChange={v => setValue('f-intro', v)} />
                        </FieldWrap>
                        <FieldWrap label="첨부파일">
                            <FieldRenderer mode="live"
                                field={{ id: 'f-file', type: 'file', label: '첨부파일', colSpan: 6, maxFileCount: 3, fileTypeMode: 'doc' }}
                                fileList={fileList} onFileChange={setFileList} />
                        </FieldWrap>
                        <FieldWrap label="프로필 이미지">
                            <FieldRenderer mode="live"
                                field={{ id: 'f-image', type: 'image', label: '프로필 이미지', colSpan: 6, maxFileCount: 1 }}
                                fileList={imageList} onFileChange={setImageList} />
                        </FieldWrap>
                        <FieldWrap label="동영상 URL" full>
                            <FieldRenderer mode="live"
                                field={{ id: 'f-video', type: 'video', label: '동영상', colSpan: 12, videoMode: 'url' }}
                                value={values['f-video']} onChange={v => setValue('f-video', v)} />
                        </FieldWrap>
                    </div>
                </FormSection>

                {/* ════════════════════════════════════ */}
                {/* 4. 미지원 패턴 (참고용) */}
                {/* ════════════════════════════════════ */}
                <FormSection title="미지원 패턴 (참고용)" description="FieldRenderer가 지원하지 않는 UI — 필요 시 공통 컴포넌트 확장 필요">
                    <div className="grid grid-cols-2 gap-4">
                        {/* 비밀번호 eye 토글 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">비밀번호</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="비밀번호를 입력하세요"
                                    className="w-full border border-slate-200 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                                />
                                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-1">최소 8자, 영문/숫자/특수문자 조합</p>
                        </div>
                        {/* 에러 상태 예시 */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">에러 상태 예시</label>
                            <input
                                type="text"
                                defaultValue="잘못된 형식"
                                readOnly
                                className="w-full border border-red-400 bg-red-50 rounded-md px-3 py-2 text-sm focus:outline-none transition-all"
                            />
                            <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                                <AlertCircle className="w-3.5 h-3.5" /> 올바른 형식으로 입력해주세요.
                            </p>
                        </div>
                        {/* Toggle switch */}
                        <div className="col-span-2 flex items-center justify-between max-w-md">
                            <div>
                                <p className="text-sm font-medium text-slate-700">계정 활성화</p>
                                <p className="text-xs text-slate-400">비활성화 시 로그인이 차단됩니다</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsActive(v => !v)}
                                className={`w-11 h-6 rounded-full relative transition-colors ${isActive ? 'bg-slate-900' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-all ${isActive ? 'left-[22px]' : 'left-0.5'}`} />
                            </button>
                        </div>
                    </div>
                </FormSection>

            </div>

            {/* ── 하단 고정 액션 바 ── */}
            <div className="sticky bottom-0 bg-slate-100 border-t border-slate-200 -mx-6 px-6 py-4 flex items-center justify-end gap-3">
                <button onClick={handleReset} className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-white transition-all">취소</button>
                <button onClick={handleSubmit} disabled={isSubmitting} className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait">
                    {isSubmitting
                        ? <><div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />저장 중...</>
                        : <><Save className="w-4 h-4" /> 저장</>}
                </button>
            </div>
        </div>
    );
}
