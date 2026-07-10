'use client';

import { useEffect, RefObject } from 'react';

/**
 * 여러 ref(anchor + Portal 드롭다운 등) 바깥 클릭 감지 훅
 *
 * WHY: 드롭다운을 Portal로 body에 렌더링하면 DOM 트리 상 anchor 컨테이너의
 * 자식이 아니게 된다. ref 1개(containerRef)만으로 "바깥 클릭"을 판정하면
 * 드롭다운 내부 클릭도 "바깥"으로 오판정되어 선택이 완료되기 전에 닫혀버린다.
 * → anchor ref와 드롭다운 ref를 모두 받아, 그중 어느 하나에도 속하지 않을 때만
 *   바깥 클릭으로 처리한다.
 *
 * slug-selector.tsx, message-key-selector.tsx에 동일 로직이 이미 각자 인라인으로
 * 중복 구현되어 있어, 그 패턴을 참고해 이 공통 훅으로 추출했다.
 * 실제 사용처(import)는 현재 SlugSelectField.tsx 1곳뿐이며,
 * slug-selector.tsx / message-key-selector.tsx는 이번 범위 밖이라 아직 미통합 상태다.
 */
export function useOutsideClick(
    refs: RefObject<HTMLElement | null>[],
    onOutside: () => void,
    active = true,
) {
    useEffect(() => {
        if (!active) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            const insideAny = refs.some(ref => ref.current && ref.current.contains(target));
            if (!insideAny) onOutside();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active, onOutside]);
}
