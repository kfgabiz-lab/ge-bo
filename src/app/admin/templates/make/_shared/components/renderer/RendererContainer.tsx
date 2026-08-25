"use client";

/**
 * RendererContainer — 모든 렌더러 공통 최상위 컨테이너
 *
 * 테두리·바탕색·grid 배치를 하나의 컴포넌트로 통일 처리한다.
 *
 * contentColSpan 지정 시 내부를 CSS Grid로 전환:
 *   - gridTemplateColumns: repeat(N, 1fr)
 *   - gridAutoRows: ROW_HEIGHT - GAP_SIZE — PageLayout과 동일한 track 높이(rowPitch 지정 시 커스텀)
 *   - rowGap: GAP_SIZE(8px) — PageLayout rowGap과 일치, 필드 하단 클리핑 방지
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

import { ROW_HEIGHT, GAP_SIZE } from "@/components/layout/grid-cell";

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
  /** 컨텐츠 상단 여백(px) — 첫 행이 테두리에 붙어 보이는 것을 방지 */
  contentPaddingTop?: number;
  /** GridCell 영역을 h-full로 채울지 여부 (기본 true) */
  fillHeight?: boolean;
  /** 내부 grid 행 피치(px) — 미지정 시 전역 ROW_HEIGHT 사용 (Form 등 필드 간격 커스텀용) */
  rowPitch?: number;
  /** 내부 grid 행/열 간격(px) — 미지정 시 전역 GAP_SIZE 사용 (Form 필드 간격 확대용) */
  gapSize?: number;
  /** 내부 grid 행별 auto/고정 지정 — PageGridRenderer의 동일 패턴 재사용 (필드 단위 자동 축소용) */
  rowIsAuto?: boolean[];
}

export function RendererContainer({
  children,
  showBorder = true,
  bgColor,
  className = "",
  contentColSpan,
  contentPaddingTop,
  fillHeight = true,
  rowPitch,
  gapSize,
  rowIsAuto,
}: RendererContainerProps) {
  /* overflow:clip — 시각 클리핑(rounded border 포함)은 유지, GPU 합성 레이어(video)는 clip 안 함
       overflow:hidden을 쓰면 Edge에서 video GPU 레이어가 clip돼 화면에 안 보이는 버그 발생 */
  const borderCls = showBorder ? "border border-slate-200" : "";
  const cls = [fillHeight ? "h-full w-full rounded" : "w-full rounded", borderCls, className].filter(Boolean).join(" ");

  const bgStyle =
    !bgColor || bgColor === "none"
      ? { overflow: "clip" as const }
      : { backgroundColor: bgColor, overflow: "clip" as const };

  /* contentColSpan 있으면 CSS Grid 활성화 — Form/Space 공통 격자 배치 */
  const gap = gapSize ?? GAP_SIZE;
  const gridStyle = contentColSpan
    ? {
        display: "grid" as const,
        gridTemplateColumns: `repeat(${contentColSpan}, 1fr)`,
        ...(rowIsAuto && rowIsAuto.length > 0
          ? {
              gridTemplateRows: rowIsAuto
                .map((auto) => (auto ? "auto" : `${(rowPitch ?? ROW_HEIGHT) - gap}px`))
                .join(" "),
            }
          : {}),
        gridAutoRows: `${(rowPitch ?? ROW_HEIGHT) - gap}px`,
        rowGap: `${gap}px`,
        columnGap: `${gap}px`,
      }
    : {};

  const padStyle = contentPaddingTop
    ? { paddingTop: `${contentPaddingTop}px`, paddingBottom: `${contentPaddingTop}px` }
    : {};

  const style = { ...bgStyle, ...gridStyle, ...padStyle };
  const finalStyle = Object.keys(style).length > 0 ? style : undefined;

  return (
    <div className={cls} style={finalStyle}>
      {children}
    </div>
  );
}
