"use client";

/**
 * useLeaveCheck — 이탈 감지 공통 훅
 *
 * 폼 변경 후 저장 없이 페이지를 벗어나려 할 때 경고를 표시한다.
 * - 브라우저 새로고침·탭 닫기: beforeunload 이벤트로 기본 경고 다이얼로그 표시
 * - 사이드바 메뉴·헤더 네비게이션: useLeaveCheckStore에 confirmLeave 등록 → 클릭 전 확인
 * - 탭 전환: confirmLeaveMap(TabRenderer)에 별도 등록
 * - 프로그래밍 방식 이탈: confirmLeave() 직접 호출
 *
 * 사용법:
 *   const { markDirty, markClean, confirmLeave } = useLeaveCheck(leaveCheck);
 *   markDirty()       — 폼 값 변경 시 호출 (isDirty = true)
 *   markClean()       — 저장 성공 시 호출 (isDirty = false)
 *   confirmLeave()    — 프로그래밍 방식 이탈 전 확인 (true: 이탈 허용, false: 취소)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useLeaveCheckStore } from "@/store/use-leave-check-store";

const LEAVE_MESSAGE = "저장되지 않은 변경사항이 있습니다. 페이지를 나가시겠습니까?";

export function useLeaveCheck(enabled: boolean) {
    const [isDirty, setIsDirty] = useState(false);
    /* ref: markClean() 직후 confirmLeave() 를 동기적으로 호출할 때 정확한 값 보장 */
    const isDirtyRef = useRef(false);

    const { register, unregister } = useLeaveCheckStore();

    /* 브라우저 새로고침·탭 닫기 감지 */
    useEffect(() => {
        if (!enabled || !isDirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [enabled, isDirty]);

    /**
     * 프로그래밍 방식 이탈 전 확인
     * @returns true — 이탈 허용 / false — 이탈 취소
     */
    const confirmLeave = useCallback((): boolean => {
        if (!enabled || !isDirtyRef.current) return true;
        return window.confirm(LEAVE_MESSAGE);
    }, [enabled]);

    /* 사이드바·헤더 네비게이션 가드용 — 전역 스토어에 등록/해제 */
    useEffect(() => {
        if (enabled && isDirty) {
            register(confirmLeave);
        } else {
            unregister();
        }
        return () => unregister();
    }, [enabled, isDirty, confirmLeave, register, unregister]);

    const markDirty = useCallback(() => {
        isDirtyRef.current = true;
        setIsDirty(true);
    }, []);

    const markClean = useCallback(() => {
        isDirtyRef.current = false;
        setIsDirty(false);
    }, []);

    return { isDirty, markDirty, markClean, confirmLeave };
}
