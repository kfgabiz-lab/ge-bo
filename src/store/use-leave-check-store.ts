'use client';

/**
 * 이탈체크 전역 스토어
 *
 * leaveCheck가 활성화된 페이지에서 isDirty 상태일 때 confirmLeave 함수를 등록.
 * 사이드바 메뉴, 헤더 브레드크럼 등 네비게이션 포인트에서 이 스토어를 구독하여
 * 페이지 이동 전 사용자 확인을 요청한다.
 *
 * 사용법:
 *   // useLeaveCheck 훅에서 자동 등록 (직접 호출 불필요)
 *
 *   // 메뉴/헤더 등 네비게이션 포인트에서 확인 후 이동
 *   const { confirmLeave } = useLeaveCheckStore();
 *   if (!confirmLeave()) return; // 사용자가 취소 → 이동 차단
 *   router.push(url);
 */

import { create } from 'zustand';

interface LeaveCheckStore {
    /** isDirty이면 confirm 함수, 아니면 null */
    confirmLeave: (() => boolean) | null;
    /** leaveCheck 훅이 isDirty 상태가 될 때 등록 */
    register: (fn: () => boolean) => void;
    /** isDirty 해소(저장·언마운트) 시 해제 */
    unregister: () => void;
}

export const useLeaveCheckStore = create<LeaveCheckStore>((set) => ({
    confirmLeave: null,
    register: (fn) => set({ confirmLeave: fn }),
    unregister: () => set({ confirmLeave: null }),
}));
