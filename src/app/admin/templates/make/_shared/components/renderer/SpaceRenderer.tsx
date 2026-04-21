'use client';

/**
 * SpaceRenderer — 공간영역 위젯 렌더러
 *
 * 'textarea' | 'action-button' 타입의 SearchFieldConfig 아이템을 순서대로 렌더링한다.
 * 각 아이템 렌더링은 FieldRenderer에 위임한다.
 *
 * - textarea:      content 값을 정적 텍스트로 표시
 * - action-button: 색상 지정 버튼 표시
 *   - connType='form' + formAction → onFormAction 콜백 호출
 *   - connType='popup' → 팝업 오픈 (향후 구현)
 *   - connType='path'  → 경로 이동 (향후 구현)
 *   - connType='close' → onClose 있으면 팝업 닫기, 없으면 router.back() 뒤로가기
 *
 * 사용법:
 *   <SpaceRenderer mode="preview" items={widget.items} />
 *   <SpaceRenderer mode="live" items={widget.items} onFormAction={(widgetId, action) => handleFormAction(widgetId, action)} />
 *   <SpaceRenderer mode="live" items={widget.items} onClose={() => setOpen(false)} />
 */

import React from 'react';
import { useRouter } from 'next/navigation';
import { FieldRenderer } from './FieldRenderer';
import type { SearchFieldConfig } from '../../types';
import type { RendererMode } from './types';

interface SpaceRendererProps {
    mode: RendererMode;
    items: SearchFieldConfig[];
    align?: 'left' | 'center' | 'right';
    /** 전체 그리드 열 수 — 각 아이템의 colSpan 비율 계산에 사용 (기본 5) */
    contentColSpan?: number;
    /** Form 버튼 클릭 시 호출 — connectedFormWidgetId + formAction 전달 */
    onFormAction?: (connectedFormWidgetId: string, action: 'save' | 'delete') => void;
    /** 닫기 버튼 클릭 시 호출 — LayerPopup에서 전달, 없으면 router.back() */
    onClose?: () => void;
    /** 팝업 오픈 요청 — connType='popup' 버튼 클릭 시 slug 전달 */
    onPopupOpen?: (slug: string) => void;
}

export function SpaceRenderer({ mode, items, align = 'left', contentColSpan = 5, onFormAction, onClose, onPopupOpen }: SpaceRendererProps) {
    const router = useRouter();
    const alignMap = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    };
    const justifyCls = alignMap[align] ?? 'justify-start';

    const base = `h-full w-full rounded border bg-white border-slate-300 shadow-sm overflow-hidden p-4 flex flex-wrap items-center content-start gap-4 overflow-auto ${justifyCls}`;

    if (!items.length) {
        return (
            <div className={base}>
                <span className="text-[10px] text-slate-300 italic m-auto">아이템을 추가하세요</span>
            </div>
        );
    }

    /** action-button 클릭 핸들러 — connType에 따라 동작 분기 */
    const handleButtonClick = (field: SearchFieldConfig) => {
        if (mode === 'preview') return;
        if (field.connType === 'form' && field.connectedFormWidgetId && field.formAction) {
            onFormAction?.(field.connectedFormWidgetId, field.formAction);
        } else if (field.connType === 'close') {
            /* LayerPopup이면 onClose(), 상세페이지면 router.back() */
            if (onClose) {
                onClose();
            } else {
                router.back();
            }
        } else if (field.connType === 'popup' && field.popupSlug) {
            onPopupOpen?.(field.popupSlug);
        }
        /* 향후: path 등 추가 */
    };

    return (
        <div className={base}>
            {items.map(field => {
                /* colSpan 비율로 너비 계산: colSpan/contentColSpan * 100% — 최소 auto */
                const itemSpan = Math.min(field.colSpan ?? 1, contentColSpan);
                const widthPct = `${(itemSpan / contentColSpan) * 100}%`;
                return (
                    <div key={field.id} style={{ width: widthPct }}>
                        <FieldRenderer
                            mode={mode}
                            field={field}
                            value={field.type === 'textarea' ? (field.content ?? '') : undefined}
                            onButtonClick={field.type === 'action-button' ? () => handleButtonClick(field) : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
}
