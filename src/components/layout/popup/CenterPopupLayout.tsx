'use client';

/**
 * CenterPopupLayout — 중앙 팝업 레이아웃 컴포넌트
 * - 순수 레이아웃 래퍼: 비즈니스 로직 없음
 * - layerWidth에 따라 팝업 최대 너비 결정
 * @example
 * <CenterPopupLayout open={open} onClose={onClose} title="제목" layerWidth="md">
 *   <div className="px-6 py-5">내용</div>
 * </CenterPopupLayout>
 */

import React from 'react';
import { X } from 'lucide-react';

type LayerWidth = 'sm' | 'md' | 'lg' | 'xl';

/* 너비 옵션 → Tailwind max-w 클래스 매핑 */
const WIDTH_CLS: Record<LayerWidth, string> = {
    sm: 'max-w-sm',   // ~384px
    md: 'max-w-2xl',  // ~672px
    lg: 'max-w-3xl',  // ~768px
    xl: 'max-w-4xl',  // ~896px
};

interface CenterPopupLayoutProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    layerWidth?: LayerWidth;
    children: React.ReactNode;
    /** preview=true: 빌더 미리보기 모드 — fixed 오버레이 없이 인라인으로 표시 */
    preview?: boolean;
}

export default function CenterPopupLayout({
    open, onClose, title, layerWidth = 'md', children, preview = false,
}: CenterPopupLayoutProps) {
    if (!open) return null;

    /* ── 빌더 미리보기 모드: 오버레이 없이 팝업 박스만 표시 ── */
    if (preview) {
        return (
            <div className={`w-full ${WIDTH_CLS[layerWidth]} mx-auto bg-white rounded-xl shadow-2xl flex flex-col`}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
                    <h2 className="text-base font-bold text-slate-900">{title || '팝업 미리보기'}</h2>
                </div>
                <div className="overflow-y-auto">
                    {children}
                </div>
            </div>
        );
    }

    return (
        /* 전체 화면 오버레이 */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* 배경 클릭 시 닫기 */}
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            {/* 팝업 박스 */}
            <div className={`relative w-full ${WIDTH_CLS[layerWidth]} bg-white rounded-xl shadow-2xl flex flex-col max-h-[90vh]`}>
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
