'use client';

/**
 * GridCell — 그리드 셀 공통 컴포넌트
 *
 * ROW_HEIGHT 를 단일 출처로 관리하고,
 * gridColumn / gridRow / height / overflow 를 일괄 처리한다.
 *
 * PageLayout, PageGridRenderer, 빌더 미리보기 등 모든 곳에서 import 하여 사용.
 *
 * @example
 * // 기본 사용
 * <GridCell colSpan={12} rowSpan={4}>
 *   <WidgetRenderer ... />
 * </GridCell>
 *
 * // 클릭 이벤트 + 추가 클래스
 * <GridCell colSpan={6} rowSpan={2} onClick={handleClick} className="cursor-pointer">
 *   <MyWidget />
 * </GridCell>
 */

/** 그리드 행 단위 높이 (px) — 이 값 하나로 전체 그리드 높이 기준을 결정한다 */
export const ROW_HEIGHT = 80;

/** 위젯 사이 간격 (px) — gridAutoRows = ROW_HEIGHT - GAP_SIZE, rowGap = GAP_SIZE → 합계 ROW_HEIGHT 유지 */
export const GAP_SIZE = 8;

interface GridCellProps {
    /** 12칸 그리드 기준 가로 열 점유 수 (1~12) */
    colSpan: number;
    /** 행 점유 수 — height = rowSpan × ROW_HEIGHT */
    rowSpan: number;
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

/**
 * 그리드 셀 컴포넌트
 * - gridColumn / gridRow : colSpan / rowSpan 값으로 자동 설정
 * - height               : rowSpan × ROW_HEIGHT (고정) → 내부 스크롤 보장
 * - overflow             : hidden (내부 컴포넌트가 자체 스크롤 처리)
 * - minWidth             : 0 (flex/grid 내부 축소 허용)
 */
export function GridCell({ colSpan, rowSpan, children, className, onClick }: GridCellProps) {
    return (
        <div
            style={{
                gridColumn: `span ${colSpan}`,
                gridRow: `span ${rowSpan}`,
                /* rowGap이 GAP_SIZE이므로 height에서 GAP_SIZE만큼 빼야 track 크기와 일치 */
                height: `${rowSpan * ROW_HEIGHT - GAP_SIZE}px`,
                /* overflow:clip — 시각 클리핑은 유지하되 GPU 합성 레이어(video 등)는 clip 안 함
                   overflow:hidden은 GPU compositing layer도 clip해 Edge에서 video가 안 보이는 버그 유발 */
                overflow: 'clip',
                minWidth: 0,
            }}
            className={className}
            onClick={onClick}
        >
            {children}
        </div>
    );
}
