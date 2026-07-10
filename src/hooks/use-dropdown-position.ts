'use client';

import { useState, useCallback, useEffect, RefObject } from 'react';

/**
 * 포탈(Portal) 드롭다운 위치 계산 훅
 *
 * WHY: input/button 같은 anchor 엘리먼트를 기준으로 드롭다운을 document.body에
 * Portal 렌더링할 때, `position:absolute`(부모 기준)로는 overflow:auto 컨테이너나
 * 모달 안에서 드롭다운이 잘리거나 가려지는 문제가 생긴다.
 * → anchor의 getBoundingClientRect() 좌표를 읽어 `position:fixed`로 body에 붙이면
 *   어떤 컨테이너 안에 있어도 항상 anchor 바로 아래에 정상적으로 표시된다.
 *
 * 열려있는 동안 스크롤/리사이즈가 발생하면 위치가 어긋나므로 재계산한다.
 *
 * slug-selector.tsx, message-key-selector.tsx에 동일 로직이 이미 각자 인라인으로
 * 중복 구현되어 있어, 그 패턴을 참고해 이 공통 훅으로 추출했다.
 * 실제 사용처(import)는 현재 SlugSelectField.tsx 1곳뿐이며,
 * slug-selector.tsx / message-key-selector.tsx는 이번 범위 밖이라 아직 미통합 상태다.
 */
export function useDropdownPosition(
    anchorRef: RefObject<HTMLElement | null>,
    open: boolean,
    /** 드롭다운 최소 너비(px). 지정하지 않으면 anchor 너비를 그대로 사용 */
    minWidth = 0,
) {
    const [style, setStyle] = useState<React.CSSProperties>({});

    /* anchor 기준 fixed 좌표 계산 */
    const calcPos = useCallback(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setStyle({
            position: 'fixed',
            top: rect.bottom + 4,
            left: rect.left,
            width: minWidth ? Math.max(rect.width, minWidth) : rect.width,
            zIndex: 9999,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorRef, minWidth]);

    /* 열려있는 동안 스크롤·리사이즈 시 위치 재계산 */
    useEffect(() => {
        if (!open) return;
        calcPos();
        window.addEventListener('scroll', calcPos, true);
        window.addEventListener('resize', calcPos);
        return () => {
            window.removeEventListener('scroll', calcPos, true);
            window.removeEventListener('resize', calcPos);
        };
    }, [open, calcPos]);

    return { style, calcPos };
}
