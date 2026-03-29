'use client';

import React, { useState } from 'react';
import { Save, RotateCcw, ChevronDown, Eye, EyeOff, AlertCircle, Upload, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

export default function FormLayoutPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /* ── 저장 시뮬레이션 ── */
    const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
            setIsSubmitting(false);
            toast.success('저장되었습니다.');
        }, 1500);
    };

    /* ── 섹션 래퍼 ── */
    const FormSection = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
        <div className="bg-white rounded-md border border-slate-200 p-6">
            <div className="mb-5">
                <h3 className="text-sm font-bold text-slate-900">{title}</h3>
                {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
            </div>
            <div className="space-y-5">
                {children}
            </div>
        </div>
    );

    /* ── 필드 래퍼 (가로 배치) ── */
    const FieldRow = ({ children }: { children: React.ReactNode }) => (
        <div className="grid grid-cols-2 gap-4">{children}</div>
    );

    return (
        <div className="h-full flex flex-col">

            {/* ── 페이지 헤더 ── */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">폼형 레이아웃</h1>
                    <p className="text-sm text-slate-500 mt-0.5">섹션별 입력 폼 + 하단 액션 버튼 패턴</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-slate-100 transition-all">
                        <RotateCcw className="w-4 h-4" /> 초기화
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                                저장 중...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> 저장
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* ── 폼 본문 ── */}
            <div className="flex-1 space-y-6 pb-6">

                {/* 기본 정보 섹션 */}
                <FormSection title="기본 정보" description="필수 입력 항목은 * 로 표시됩니다.">
                    <FieldRow>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">이름 <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="이름을 입력하세요" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">사번 <span className="text-red-500">*</span></label>
                            <input type="text" placeholder="예: EMP-001" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                        </div>
                    </FieldRow>
                    <FieldRow>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">이메일 <span className="text-red-500">*</span></label>
                            <input type="email" placeholder="example@company.com" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">연락처</label>
                            <input type="tel" placeholder="010-0000-0000" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all" />
                        </div>
                    </FieldRow>
                </FormSection>

                {/* 권한 및 보안 섹션 */}
                <FormSection title="권한 및 보안">
                    <FieldRow>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">권한 <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                    <option value="">선택하세요</option>
                                    <option>SUPER_ADMIN</option>
                                    <option>ADMIN</option>
                                    <option>EDITOR</option>
                                    <option>VIEWER</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1.5">부서</label>
                            <div className="relative">
                                <select className="w-full appearance-none border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all bg-white">
                                    <option value="">선택하세요</option>
                                    <option>개발팀</option>
                                    <option>기획팀</option>
                                    <option>디자인팀</option>
                                    <option>마케팅팀</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </FieldRow>
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">비밀번호</label>
                        <div className="relative max-w-md">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="비밀번호를 입력하세요"
                                className="w-full border border-slate-200 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all"
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">최소 8자, 영문/숫자/특수문자 조합</p>
                    </div>
                    {/* 토글 스위치 */}
                    <div className="flex items-center justify-between max-w-md">
                        <div>
                            <p className="text-sm font-medium text-slate-700">계정 활성화</p>
                            <p className="text-xs text-slate-400">비활성화 시 로그인이 차단됩니다</p>
                        </div>
                        <button className="w-11 h-6 bg-slate-900 rounded-full relative transition-colors">
                            <span className="absolute top-0.5 left-[22px] w-5 h-5 bg-white rounded-full shadow-sm transition-all" />
                        </button>
                    </div>
                </FormSection>

                {/* 상세 정보 섹션 */}
                <FormSection title="상세 정보">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">소개</label>
                        <textarea
                            placeholder="간단한 소개를 입력하세요"
                            rows={4}
                            className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all resize-none"
                        />
                        <p className="text-[11px] text-slate-400 mt-1 text-right">0 / 200자</p>
                    </div>
                    {/* 파일 업로드 영역 */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">프로필 이미지</label>
                        <div className="border-2 border-dashed border-slate-200 rounded-md p-8 text-center hover:border-slate-300 transition-colors cursor-pointer">
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-12 h-12 rounded-md bg-slate-100 flex items-center justify-center">
                                    <Upload className="w-5 h-5 text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-sm text-slate-700">클릭하여 파일을 선택하거나 드래그하세요</p>
                                    <p className="text-xs text-slate-400 mt-0.5">PNG, JPG, GIF (최대 2MB)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 에러 메시지가 있는 필드 예시 */}
                    <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1.5">에러 예시 필드</label>
                        <input
                            type="text"
                            value="잘못된 형식"
                            readOnly
                            className="w-full max-w-md border border-red-400 bg-red-50 rounded-md px-3 py-2 text-sm focus:outline-none transition-all"
                        />
                        <p className="flex items-center gap-1 mt-1 text-xs text-red-500">
                            <AlertCircle className="w-3.5 h-3.5" /> 올바른 형식으로 입력해주세요.
                        </p>
                    </div>
                </FormSection>

            </div>

            {/* ── 하단 고정 액션 바 (대안 패턴) ── */}
            <div className="sticky bottom-0 bg-slate-100 border-t border-slate-200 -mx-6 px-6 py-4 flex items-center justify-end gap-3">
                <button className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-md hover:bg-white transition-all">
                    취소
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-all disabled:opacity-60 disabled:cursor-wait"
                >
                    {isSubmitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-transparent border-t-white rounded-full animate-spin" />
                            저장 중...
                        </>
                    ) : (
                        <>
                            <Save className="w-4 h-4" /> 저장
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
