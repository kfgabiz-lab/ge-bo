'use client';

import React, { useRef, useEffect, useState } from 'react';

// Toast UI Editor 코어 라이브러리를 직접 사용합니다. (React Wrapper 대신)
// 타입 정의를 위해 import type 사용
import type { Editor as EditorType, EditorOptions } from '@toast-ui/editor';

interface WysiwygEditorProps {
    initialValue?: string;
    onChange?: (value: string) => void;
    height?: string;
    previewStyle?: 'tab' | 'vertical';
    initialEditType?: 'wysiwyg' | 'markdown';
}

export default function WysiwygEditor({
    initialValue = '',
    onChange,
    height = '400px',
    previewStyle = 'vertical',
    initialEditType = 'wysiwyg',
}: WysiwygEditorProps) {
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<EditorType | null>(null);
    const [mounted, setMounted] = useState(false);

    // onChange는 매 렌더마다 새 참조가 생성되므로 ref로 관리 (stale closure 방지)
    const onChangeRef = useRef(onChange);
    useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !editorContainerRef.current || editorInstanceRef.current) return;

        // 팝업 닫히는 중 async 완료 시 null 참조 방지용 취소 플래그
        let cancelled = false;

        const initEditor = async () => {
            const { Editor } = await import('@toast-ui/editor');

            // 비동기 로딩 중 컴포넌트가 언마운트된 경우 중단
            if (cancelled || !editorContainerRef.current) return;

            const options: EditorOptions = {
                el: editorContainerRef.current,
                initialValue: initialValue,
                height: height,
                initialEditType: initialEditType,
                previewStyle: previewStyle,
                language: 'ko-KR',
                usageStatistics: false,
                toolbarItems: [
                    ['heading', 'bold', 'italic', 'strike'],
                    ['hr', 'quote'],
                    ['ul', 'ol', 'task', 'indent', 'outdent'],
                    ['table', 'image', 'link'],
                    ['code', 'codeblock'],
                ],
                events: {
                    change: () => {
                        const content = editorInstanceRef.current?.getHTML();
                        if (content !== undefined) {
                            // ref를 통해 항상 최신 onChange 호출
                            onChangeRef.current?.(content);
                        }
                    },
                },
            };

            editorInstanceRef.current = new Editor(options);
        };

        initEditor();

        return () => {
            // 취소 플래그 설정 — async initEditor가 아직 실행 중이면 중단
            cancelled = true;
            // 에디터 인스턴스 정리 — 팝업 닫기/재열기 시 DOM 중복 방지
            if (editorInstanceRef.current) {
                editorInstanceRef.current.destroy();
                editorInstanceRef.current = null;
            }
        };
    }, [mounted, height, initialEditType, previewStyle, initialValue]); // onChange는 ref로 분리하여 의존성 제거

    return (
        <div className="w-full editor-container">
            {!mounted && (
                <div className="w-full bg-slate-50 animate-pulse rounded-lg" style={{ height }} />
            )}
            <div ref={editorContainerRef} />
        </div>
    );
}
