'use client';

/**
 * RightDrawerLayout — 우측 드로어 레이아웃 컴포넌트
 * - 순수 레이아웃 래퍼: 비즈니스 로직 없음
 * - 화면 우측에 고정 패널로 표시
 * @example
 * <RightDrawerLayout open={open} onClose={onClose} title="제목">
 *   <div className="px-6 py-5">내용</div>
 * </RightDrawerLayout>
 */

import React from 'react';
import { X } from 'lucide-react';

interface RightDrawerLayoutProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    /** preview=true: 빌더 미리보기 모드 — fixed 오버레이 없이 인라인으로 표시 */
    preview?: boolean;
}

export default function RightDrawerLayout({
    open, onClose, title, children, preview = false,
}: RightDrawerLayoutProps) {
    if (!open) return null;

    /* ── 빌더 미리보기 모드: 실제 드로어와 동일한 구조를 인라인으로 재현 ── */
    if (preview) {
        return (
            <div className="relative w-full flex min-h-[500px]">
                {/* 좌측 반투명 오버레이 시뮬레이션 */}
                <div className="flex-1 bg-black/30 rounded-l-lg" />
                {/* 우측 드로어 패널 — 컨테이너 너비의 35% */}
                <div className="w-[35%] bg-white shadow-2xl flex flex-col">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                        <h2 className="text-base font-bold text-slate-900">{title || '드로어 미리보기'}</h2>
                        <div className="p-1.5 rounded-md bg-slate-100">
                            <X className="w-4 h-4 text-slate-500" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        );
    }

    return (
        /* 전체 화면 오버레이 */
        <div className="fixed inset-0 z-50 flex">
            {/* 좌측 배경 클릭 시 닫기 */}
            <div className="flex-1 bg-black/40" onClick={onClose} />

            {/* 드로어 패널 (우측 고정) */}
            <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col h-full">
                {/* 헤더 */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-base font-bold text-slate-900">{title || ''}</h2>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md hover:bg-slate-100 transition-all"
                    >
                        <X className="w-4 h-4 text-slate-500" />
                    </button>
                </div>

                {/* 본문 — 내부 스크롤 */}
                <div className="flex-1 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}
