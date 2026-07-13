'use client';

/**
 * PortalDropdown — 트리거 요소 기준 위치의 드롭다운을 Portal(body)로 렌더링하는 공통 컴포넌트
 *
 * 배경:
 *   기존 드롭다운들은 position:absolute로 자기 컨테이너 안에서만 렌더링되어,
 *   부모의 overflow-y-auto(빌더 좌측 패널 스크롤 영역 등)에 잘려 보이는 문제가 있었다.
 *   이 컴포넌트는 `message-key-selector.tsx`의 검증된 Portal 위치계산 패턴을 그대로 일반화한 것이다.
 *
 * 동작:
 *   - open이 true가 되는 순간 anchorRef 기준 getBoundingClientRect()로 fixed 좌표 계산
 *   - open인 동안 scroll(capture)/resize 이벤트로 위치 재계산
 *   - onOutsideClick이 있으면, anchor와 드롭다운(Portal) 둘 다 벗어난 클릭에서만 호출
 *     (Portal된 드롭다운은 DOM상 anchor 밖에 위치하므로 dropdownRef도 반드시 함께 검사해야
 *      드롭다운 내부 클릭이 "외부 클릭"으로 오판되지 않는다)
 *
 * 사용법:
 *   const anchorRef = useRef<HTMLInputElement>(null);
 *   <input ref={anchorRef} ... />
 *   <PortalDropdown
 *       open={isOpen}
 *       anchorRef={anchorRef}
 *       onOutsideClick={() => setIsOpen(false)}
 *       className="bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto"
 *   >
 *       {드롭다운 내부 콘텐츠}
 *   </PortalDropdown>
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface PortalDropdownProps {
    /** 드롭다운 표시 여부 */
    open: boolean;
    /** 위치 기준이 되는 트리거 요소 ref */
    anchorRef: React.RefObject<HTMLElement | null>;
    children: React.ReactNode;
    /** 트리거 너비에 맞출지 여부 — 기본 true */
    matchAnchorWidth?: boolean;
    /** 최소 너비(px) — matchAnchorWidth와 함께 사용 */
    minWidth?: number;
    /** 트리거와 드롭다운 사이 세로 간격(px) — 기본 4 */
    gap?: number;
    /** z-index — 기본 9999 */
    zIndex?: number;
    /** 각 사이트의 기존 bg/border/shadow 클래스를 그대로 전달 */
    className?: string;
    /** anchor·드롭다운 모두 벗어난 클릭 시 호출 */
    onOutsideClick?: () => void;
}

export function PortalDropdown({
    open,
    anchorRef,
    children,
    matchAnchorWidth = true,
    minWidth,
    gap = 4,
    zIndex = 9999,
    className,
    onOutsideClick,
}: PortalDropdownProps) {
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});

    /* 드롭다운 위치 계산 — 트리거 기준 fixed 좌표 */
    const calcPosition = useCallback(() => {
        if (!anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        setStyle({
            position: 'fixed',
            top: rect.bottom + gap,
            left: rect.left,
            width: matchAnchorWidth ? Math.max(rect.width, minWidth ?? 0) : undefined,
            zIndex,
        });
    }, [anchorRef, gap, matchAnchorWidth, minWidth, zIndex]);

    /* 열릴 때 위치 계산, 스크롤·리사이즈 시 재계산 */
    useEffect(() => {
        if (!open) return;
        calcPosition();
        window.addEventListener('scroll', calcPosition, true);
        window.addEventListener('resize', calcPosition);
        return () => {
            window.removeEventListener('scroll', calcPosition, true);
            window.removeEventListener('resize', calcPosition);
        };
    }, [open, calcPosition]);

    /* 바깥 클릭 시 닫기 — anchor·드롭다운 둘 다 벗어난 경우만 호출 */
    useEffect(() => {
        if (!open || !onOutsideClick) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (
                anchorRef.current && !anchorRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                onOutsideClick();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open, onOutsideClick, anchorRef]);

    if (!open || typeof document === 'undefined') return null;

    return createPortal(
        <div ref={dropdownRef} style={style} className={className}>
            {children}
        </div>,
        document.body
    );
}
