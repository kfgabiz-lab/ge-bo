'use client';

/**
 * SpaceRenderer — 공간영역 위젯 렌더러
 *
 * 'textarea' | 'action-button' 타입의 SearchFieldConfig 아이템을 순서대로 렌더링한다.
 * 각 아이템 렌더링은 FieldRenderer에 위임한다.
 *
 * - textarea:      content 값을 정적 텍스트로 표시
 * - action-button: 색상 지정 버튼 표시
 *   - connType='content' + contentAction → onContentAction 콜백 호출 (Form/SubList 다중 연결)
 *   - connType='popup' → 팝업 오픈
 *   - connType='path'  → 경로 이동 (향후 구현)
 *   - connType='close' → onClose 있으면 팝업 닫기, 없으면 router.back() 뒤로가기
 *
 * 사용법:
 *   <SpaceRenderer mode="preview" items={widget.items} />
 *   <SpaceRenderer mode="live" items={widget.items}
 *     onContentAction={(widgetIds, action) => handleContentAction(widgetIds, action)} />
 *   <SpaceRenderer mode="live" items={widget.items} onClose={() => setOpen(false)} />
 */

import { useRouter } from 'next/navigation';
import { FieldRenderer } from './FieldRenderer';
import { RendererContainer } from './RendererContainer';
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
    /** 컨텐츠 버튼 클릭 시 호출 — connectedContentWidgetIds + contentAction + goBackAfterAction 전달 */
    onContentAction?: (connectedContentWidgetIds: string[], action: 'save' | 'delete', goBackAfterAction?: boolean) => void;
    /** 닫기 버튼 클릭 시 호출 — LayerPopup에서 전달, 없으면 router.back() */
    onClose?: () => void;
    /** 페이지/팝업/경로 연결 요청 — connType='popup'·'path' 버튼 클릭 시 slug와 파라미터 문자열 전달 */
    onPopupOpen?: (slug: string, params?: string) => void;
    /** 엑셀 다운로드 요청 — connType='excel' 버튼 클릭 시 테이블 위젯 ID 전달 */
    onExcelDownload?: (tableWidgetId: string) => void;
    /** 데이터저장 요청 — connType='datasave' 버튼 클릭 시 선택 위젯 ID 배열 + slug + paramSave 전달 */
    onDataSave?: (connectedContentWidgetIds: string[], dataSaveSlug: string, goBackAfterAction?: boolean, paramSave?: string) => void;
}

export function SpaceRenderer({ mode, items, contentColSpan = 5, showBorder = true, bgColor, onContentAction, onClose, onPopupOpen, onExcelDownload, onDataSave }: SpaceRendererProps) {
    const router = useRouter();
    if (!items.length) {
        return (
            <RendererContainer showBorder={showBorder} bgColor={bgColor} className="flex items-center justify-center">
                <span className="text-[10px] text-slate-300 italic text-center p-4">
                    아이템을 추가하세요
                </span>
            </RendererContainer>
        );
    }

    /** action-button 클릭 핸들러 — connType에 따라 동작 분기 */
    const handleButtonClick = (field: SearchFieldConfig) => {
        if (mode === 'preview') return;
        /* 저장 컨펌 토글 활성화 시 — 사용자 확인 후 취소 시 중단 */
        if (field.saveConfirm && !window.confirm('저장 하시겠습니까?')) return;
        /* 컨텐츠 연결 — Form/SubList 위젯 다중 저장/삭제 */
        if (field.connType === 'content' && field.connectedContentWidgetIds?.length && field.contentAction) {
            onContentAction?.(field.connectedContentWidgetIds, field.contentAction, field.goBackAfterAction);
        } else if (field.connType === 'close') {
            /* LayerPopup이면 onClose(), 상세페이지면 router.back() */
            if (onClose) {
                onClose();
            } else {
                router.back();
            }
        } else if (field.connType === 'popup' && field.popupSlug) {
            onPopupOpen?.(field.popupSlug, field.params);
        } else if (field.connType === 'path' && field.fileLayerSlug) {
            onPopupOpen?.(field.fileLayerSlug, field.params);
        } else if (field.connType === 'excel' && field.excelTableWidgetId) {
            onExcelDownload?.(field.excelTableWidgetId);
        } else if (field.connType === 'datasave' && field.dataSaveSlug) {
            /* field.params = paramSave 문자열 (e.g. "board-data-table.depth=3,board-data-table.id") */
            onDataSave?.(field.connectedContentWidgetIds ?? [], field.dataSaveSlug, field.goBackAfterAction, field.params);
        }
    };

    return (
        /* RendererContainer — grid 배치 공통 처리 (FormRenderer와 동일한 방식) */
        <RendererContainer showBorder={showBorder} bgColor={bgColor} contentColSpan={contentColSpan}>
            {/* 각 아이템 — gridColumn/gridRow로 자리만 지정 */}
            {items.map(field => (
                <div
                    key={field.id}
                    className="flex items-center px-3 min-w-0"
                    style={{
                        gridColumn: `span ${Math.min(field.colSpan ?? 1, contentColSpan)}`,
                        gridRow: `span ${field.rowSpan ?? 1}`,
                    }}
                >
                    <FieldRenderer
                        mode={mode}
                        field={field}
                        value={field.type === 'textarea' ? (field.content ?? '') : undefined}
                        onButtonClick={field.type === 'action-button' ? () => handleButtonClick(field) : undefined}
                    />
                </div>
            ))}
        </RendererContainer>
    );
}
