"use client";

import React, { useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import type { Editor as EditorInstance } from "@toast-ui/editor";

/* next/dynamic ssr:false — Turbopack이 직접 import()를 빈 객체로 변환하는 이슈 우회 */
/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const ToastEditor = dynamic(() => import("@toast-ui/react-editor").then((mod) => ({ default: mod.Editor })), { ssr: false }) as any;

interface WysiwygEditorProps {
  initialValue?: string;
  onChange?: (value: string) => void;
  height?: string;
  previewStyle?: "tab" | "vertical";
  initialEditType?: "wysiwyg" | "markdown";
}

export default function WysiwygEditor({
  initialValue = "",
  onChange,
  height = "400px",
  previewStyle = "vertical",
  initialEditType = "wysiwyg",
}: WysiwygEditorProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<{ getInstance: () => EditorInstance } | null>(null);
  /* 마운트 직후 초기 onChange 차단용 */
  const isReadyRef = useRef(false);
  /* 사용자가 실제 수정/모드전환한 이후 외부 props 덮어쓰기 차단용 */
  const hasUserEditedRef = useRef(false);
  /* setHTML 프로그래매틱 호출 중 change 이벤트 차단용 — DB 로드 시 오탐 방지 */
  const isProgrammaticSetRef = useRef(false);

  useEffect(() => {
    /* 다음 tick 이후부터 onChange 허용 */
    const id = setTimeout(() => {
      isReadyRef.current = true;
    }, 0);
    return () => clearTimeout(id);
  }, []);

  /* DB 데이터 로드 시 에디터에 반영 — 사용자가 직접 수정하기 전까지만 */
  useEffect(() => {
    if (!initialValue || hasUserEditedRef.current) return;
    /* setHTML이 동기적으로 change를 발화하므로 호출 전후로 차단 플래그 설정 */
    isProgrammaticSetRef.current = true;
    editorRef.current?.getInstance()?.setHTML(initialValue);
    setTimeout(() => { isProgrammaticSetRef.current = false; }, 0);
  }, [initialValue]);

  const handleChange = useCallback(() => {
    if (!isReadyRef.current || isProgrammaticSetRef.current) return;
    hasUserEditedRef.current = true;
    const html = editorRef.current?.getInstance().getHTML();
    if (html !== undefined) onChange?.(html);
  }, [onChange]);

  return (
    <div className="w-full editor-container">
      <ToastEditor
        ref={editorRef}
        initialValue={initialValue}
        height={height}
        initialEditType={initialEditType}
        previewStyle={previewStyle}
        language="ko-KR"
        usageStatistics={false}
        toolbarItems={[
          ["heading", "bold", "italic", "strike"],
          ["hr", "quote"],
          ["ul", "ol", "task", "indent", "outdent"],
          ["table", "image", "link"],
          ["code", "codeblock"],
        ]}
        onChange={handleChange}
      />
    </div>
  );
}
