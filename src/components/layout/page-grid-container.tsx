import React from 'react';
import { ROW_HEIGHT, GAP_SIZE } from './grid-cell';

/**
 * PageGridContainer — 12col CSS 그리드 공통 컨테이너
 *
 * PageLayout과 팝업(LayerPopup) 내부에서 동일한 그리드 스펙을 재사용하기 위해 추출.
 * 그리드 설정(col 수, track 높이, gap)이 변경되면 이 파일 하나만 수정하면 된다.
 *
 * 사용처:
 *   - PageLayout: 페이지 전체 그리드
 *   - WidgetRenderer: LayerPopup 내부 그리드
 */
export function PageGridContainer({ children }: { children: React.ReactNode }) {
    return (
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(12, 1fr)',
                gridAutoRows: `${ROW_HEIGHT - GAP_SIZE}px`,
                rowGap: `${GAP_SIZE}px`,
                columnGap: 0,
            }}
        >
            {children}
        </div>
    );
}
