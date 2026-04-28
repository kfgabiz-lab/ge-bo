'use client';

/**
 * RendererContainer — 모든 렌더러 공통 최상위 컨테이너
 *
 * GridCell이 선점한 영역을 h-full w-full로 채우고,
 * 테두리·바탕색·grid 배치를 하나의 컴포넌트로 통일 처리한다.
 *
 * contentColSpan 지정 시 내부를 CSS Grid로 전환:
 *   - gridTemplateColumns: repeat(N, 1fr)
 *   - gridAutoRows: ROW_HEIGHT(80px) — 외부 PageLayout 격자와 행 높이 일치
 *   - rowGap: 0 — 격자선과 정확히 일치 (gap 있으면 누적 오차 발생)
 *   - columnGap: 8px
 *
 * Form/Space 등 필드 배치가 필요한 렌더러는 contentColSpan을 전달하면
 * 동일한 grid 방식으로 자리를 잡으므로 오차가 없다.
 *
 * 사용법:
 *   // 기본 (테두리/배경만)
 *   <RendererContainer showBorder bgColor={bgColor}>
 *     {children}
 *   </RendererContainer>
 *
 *   // grid 배치 (Form/Space 공통)
 *   <RendererContainer contentColSpan={12} showBorder bgColor={bgColor}>
 *     <div style={{ gridColumn: 'span 6', gridRow: 'span 1' }}>...</div>
 *   </RendererContainer>
 */

import { ROW_HEIGHT } from '@/components/layout/GridCell';

interface RendererContainerProps {
    children: React.ReactNode;
    /** 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
    /** 바탕색 CSS 값 ('none' 또는 미설정 시 투명) */
    bgColor?: string;
    /** 렌더러별 추가 className */
    className?: string;
    /** grid 배치 열 수 — 설정 시 내부를 CSS Grid로 전환 (Form/Space 공통) */
    contentColSpan?: number;
}

export function RendererContainer({
    children,
    showBorder = true,
    bgColor,
    className = '',
    contentColSpan,
}: RendererContainerProps) {
    const cls = [
        'h-full w-full rounded overflow-auto',
        showBorder ? 'border border-slate-200' : '',
        className,
    ].filter(Boolean).join(' ');

    const bgStyle = (!bgColor || bgColor === 'none') ? {} : { backgroundColor: bgColor };

    /* contentColSpan 있으면 CSS Grid 활성화 — Form/Space 공통 격자 배치 */
    const gridStyle = contentColSpan ? {
        display: 'grid' as const,
        gridTemplateColumns: `repeat(${contentColSpan}, 1fr)`,
        gridAutoRows: `${ROW_HEIGHT}px`,
        rowGap: 0,
        columnGap: '8px',
    } : {};

    const style = { ...bgStyle, ...gridStyle };
    const finalStyle = Object.keys(style).length > 0 ? style : undefined;

    return (
        <div className={cls} style={finalStyle}>
            {children}
        </div>
    );
}
