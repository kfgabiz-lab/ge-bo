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
    /** 영역 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
    /** 영역 바탕색 (기본 white) */
    bgColor?: string;
    /** Form 버튼 클릭 시 호출 — connectedFormWidgetId + formAction 전달 */
    onFormAction?: (connectedFormWidgetId: string, action: 'save' | 'delete') => void;
    /** 닫기 버튼 클릭 시 호출 — LayerPopup에서 전달, 없으면 router.back() */
    onClose?: () => void;
    /** 팝업 오픈 요청 — connType='popup' 버튼 클릭 시 slug 전달 */
    onPopupOpen?: (slug: string) => void;
}

export function SpaceRenderer({ mode, items, contentColSpan = 5, showBorder = true, bgColor, onFormAction, onClose, onPopupOpen }: SpaceRendererProps) {
    const router = useRouter();
    /* 바탕색 + CSS Grid 스타일
       - gridTemplateColumns: contentColSpan 칸으로 정확히 분할 (격자 스냅)
       - 'none' 또는 미설정 시 배경 투명 */
    const areaStyle: React.CSSProperties = {
        backgroundColor: (!bgColor || bgColor === 'none') ? 'transparent' : bgColor,
        gridTemplateColumns: `repeat(${contentColSpan}, 1fr)`,
    };

    /* 테두리 유무에 따라 border/shadow 클래스 분기 — CSS Grid 레이아웃 */
    const base = `h-full w-full rounded overflow-auto grid ${showBorder ? 'border border-slate-300 shadow-sm' : ''}`;

    if (!items.length) {
        return (
            <div className={base} style={areaStyle}>
                <span
                    className="text-[10px] text-slate-300 italic text-center p-4"
                    style={{ gridColumn: `span ${contentColSpan}` }}
                >
                    아이템을 추가하세요
                </span>
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
        <div className={base} style={areaStyle}>
            {items.map(field => {
                const itemSpan = Math.min(field.colSpan ?? 1, contentColSpan);
                const isButton = field.type === 'action-button';
                /* 버튼: 셀 가운데 배치 / 텍스트: 셀 전체 너비를 채워 자연스럽게 표시 */
                const wrapperCls = isButton ? 'flex items-center justify-center py-1' : 'flex items-center py-1';
                return (
                    <div key={field.id} style={{ gridColumn: `span ${itemSpan}` }} className={wrapperCls}>
                        <FieldRenderer
                            mode={mode}
                            field={field}
                            value={field.type === 'textarea' ? (field.content ?? '') : undefined}
                            onButtonClick={isButton ? () => handleButtonClick(field) : undefined}
                        />
                    </div>
                );
            })}
        </div>
    );
}
