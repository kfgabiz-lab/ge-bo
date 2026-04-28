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
 * 카테고리 위젯
 * - 하나의 위젯 = 하나의 depth (대분류, 중분류, 소분류 각각 독립 위젯)
 * - dbSlug: page_data 테이블의 template_slug (카테고리 데이터 그룹 식별자)
 * - depth: 이 위젯이 표시할 depth 번호 (1=대분류, 2=중분류, ...)
 * - parentWidgetId: 상위 depth 위젯 ID (선택된 값으로 eq_parentId 필터 적용)
 */
export interface CategoryWidget {
    type: 'category';
    widgetId: string;
    contentKey: string;
    /** 연결할 카테고리 데이터 slug (page_data.template_slug) */
    dbSlug: string;
    /** 이 위젯의 depth 번호 (1=루트/대분류, 2=중분류, ...) */
    depth: number;
    /** 상위 카테고리 위젯 ID — 이 위젯의 선택값을 parentId 필터로 사용 */
    parentWidgetId?: string;
    /** 이 depth 레이블 (예: '대분류', '중분류') */
    label?: string;
    /** 항목 등록 허용 여부 (기본 true) */
    allowCreate?: boolean;
    /** 항목 수정 허용 여부 (기본 true) */
    allowEdit?: boolean;
    /** 항목 삭제 허용 여부 (기본 true) */
    allowDelete?: boolean;
    /** 테두리 표시 여부 (기본 true) */
    showBorder?: boolean;
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
    | SpaceWidget
    | CategoryWidget;

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
