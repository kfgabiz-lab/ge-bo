'use client';

import React, { useState, useEffect } from 'react';
import { ROW_HEIGHT } from './GridCell';

/**
 * PageLayout — 12칸 그리드 기반 공통 페이지 레이아웃
 *
 * 빌더 미리보기 + 실제 생성 페이지 모두에서 동일하게 사용한다.
 * 한 곳만 수정하면 모든 페이지에 동일하게 반영된다.
 *
 * - mode='preview' : 빌더 미리보기용. 격자 기본 표시, 테두리/배경 있음
 * - mode='live'    : 실제 서비스 페이지. 격자 기본 숨김, 테두리/배경 없음
 * - ctrl+g         : 격자 가이드라인 on/off 토글 (preview/live 모두 동작)
 *
 * @example
 * // 빌더 미리보기
 * <PageLayout mode="preview">
 *   <div style={{ gridColumn: 'span 12', gridRow: 'span 2' }}>
 *     <WidgetRenderer mode="preview" widget={searchWidget} />
 *   </div>
 * </PageLayout>
 *
 * // 실제 페이지
 * <PageLayout title="게시판 목록" mode="live">
 *   <div style={{ gridColumn: 'span 12', gridRow: 'span 2' }}>
 *     <WidgetRenderer mode="live" widget={searchWidget} />
 *   </div>
 * </PageLayout>
 */

interface PageLayoutProps {
    title?: string;
    /** 페이지 제목 아래 표시되는 설명 (메뉴 관리에서 입력) */
    description?: string;
    /** preview: 빌더 미리보기 (격자 기본 표시) / live: 실제 서비스 페이지 (격자 기본 숨김) */
    mode?: 'preview' | 'live';
    children: React.ReactNode;
}

export default function PageLayout({ title, description, mode = 'live', children }: PageLayoutProps) {
    /* 격자 표시 여부 — preview는 기본 true, live는 기본 false */
    const [showGrid, setShowGrid] = useState(mode === 'preview');

    /* g 키로 격자 가이드라인 토글 (input/textarea/select 포커스 중엔 무시) */
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement).tagName.toLowerCase();
            if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
            if (e.key === 'g' || e.key === 'G') setShowGrid(prev => !prev);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    /* 격자 가이드라인 배경 스타일 (showGrid=true일 때만 적용) */
    const gridStyle: React.CSSProperties = {
        /* GridCell 이 각 셀 height 를 rowSpan × ROW_HEIGHT 로 고정하므로 auto 사용 */
        gridAutoRows: `${ROW_HEIGHT}px`,
        ...(showGrid ? {
            backgroundImage: `
                linear-gradient(to right,  #e2e8f0 1px, transparent 1px),
                linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)
            `,
            backgroundSize: `calc(100% / 12) ${ROW_HEIGHT}px`,
        } : {}),
    };

    /* preview: 테두리 + 배경 표시 / live: 클린 그리드만 */
    const gridCls = [
        'grid grid-cols-12 gap-3 overflow-visible',
        mode === 'preview'
            ? 'border border-slate-200 rounded-lg bg-slate-50'
            : '',
    ].filter(Boolean).join(' ');

    return (
        <div className="space-y-3">
            {title && (
                <div>
                    <h1 className="text-lg font-bold text-slate-900">{title}</h1>
                    {description && (
                        <p className="text-sm text-slate-500 mt-0.5">{description}</p>
                    )}
                </div>
            )}
            <div className={gridCls} style={gridStyle}>
                {children}
            </div>
        </div>
    );
}
