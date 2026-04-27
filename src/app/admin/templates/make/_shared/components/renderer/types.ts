/**
 * Renderer 공유 타입
 *
 * - RendererMode: 렌더링 맥락 (preview = 빌더 미리보기 / live = 실제 페이지)
 * - Widget 타입들: WidgetRenderer에서 dispatch하는 위젯 데이터 구조
 * - 핸들러 타입: live 모드에서 테이블·검색폼에 전달하는 이벤트 콜백
 */

import type { SearchRowConfig, TableColumnConfig, SearchFieldConfig } from '../../types';
import type { FormWidget } from '../builder/FormBuilder';
import type { TableWidget } from '../builder/TableBuilder';

/* ── 렌더링 맥락 ── */

/**
 * 렌더링 모드
 * - preview: 빌더 우측 미리보기 패널 (disabled, 샘플 데이터)
 * - live: 실제 생성된 페이지 (인터랙티브, API 실데이터)
 */
export type RendererMode = 'preview' | 'live';

/* ── 위젯 데이터 타입 ── */

/** 텍스트 위젯 */
export interface TextWidget {
    type: 'text';
    content: string;
}

/**
 * 공간영역 아이템
 * SearchFieldConfig를 기반으로 'textarea' | 'action-button' 타입을 사용한다.
 * - textarea: 텍스트 표시 (content 필드에 내용 저장)
 * - action-button: 액션 버튼 (label·color·connType 등으로 구성)
 */
export type SpaceItem = SearchFieldConfig;

export interface SpaceWidget {
    type: 'space';
    widgetId: string;
    items: SearchFieldConfig[];
    align?: 'left' | 'center' | 'right';
    /** 영역 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
    /** 영역 바탕색 (기본 'white') */
    bgColor?: string;
}

/** 검색 위젯 */
export interface SearchWidget {
    type: 'search';
    widgetId: string;
    contentKey: string;
    rows: SearchRowConfig[];
    /** 검색 레이아웃 스타일 — standard: 그리드(기본), simple: 한 줄 인라인 */
    displayStyle?: 'standard' | 'simple';
}

/**
 * WidgetRenderer가 처리하는 모든 위젯 타입 union
 * FormWidget, TableWidget은 각 builder 파일에서 import
 */
export type AnyWidget =
    | TextWidget
    | SearchWidget
    | TableWidget
    | FormWidget
    | SpaceWidget;

/* ── 핸들러 타입 ── */

/** 테이블 행 액션 핸들러 (live 모드 전용) */
export interface TableActionHandlers {
    onEdit?: (row: Record<string, unknown>) => void;
    onDetail?: (row: Record<string, unknown>) => void;
    onDelete?: (id: number) => void;
    onFileClick?: (col: TableColumnConfig, row: Record<string, unknown>) => void;
}

/** 검색폼 핸들러 (live 모드 전용) */
export interface SearchHandlers {
    onSearch: () => void;
    onReset: () => void;
}
