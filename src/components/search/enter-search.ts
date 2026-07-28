"use client";

import type React from "react";

/**
 * 검색폼 컨테이너 Enter 검색 발화 판정 공통 함수
 * - IME 조합 중 Enter는 한글 확정용이므로 제외 (isComposing / keyCode 229 폴백)
 * - TEXTAREA·contenteditable(위지윅 에디터)는 줄바꿈 입력이므로 제외
 * - BUTTON·role="button"(업로드 드롭존 등)은 Enter가 이미 click을 발생시키므로 제외(중복 실행 방지)
 */
export function isEnterSearchTrigger(e: React.KeyboardEvent<HTMLElement>): boolean {
  if (e.key !== "Enter") return false;
  const ne = e.nativeEvent as KeyboardEvent;
  if (ne.isComposing || ne.keyCode === 229) return false;
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  if (el.tagName === "TEXTAREA" || el.tagName === "BUTTON") return false;
  if (el.getAttribute?.("role") === "button") return false;
  if (el.isContentEditable) return false;
  return true;
}
