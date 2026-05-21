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
    /** 카드에 표시할 필드 키 매핑 — 미설정 시 기본값 사용 */
    /** 고유 ID 필드 키 (카드 미노출, 기본: 'id') */
    fieldId?: string;
    /** 코드 배지 필드 키 (기본: 'code') */
    fieldCode?: string;
    /** 제목 필드 키 (기본: 'name') */
    fieldTitle?: string;
    /** 설명 필드 키 (기본: 'description') */
    fieldDesc?: string;
    /** 항목 등록 허용 여부 (기본 true) */
    allowCreate?: boolean;
    /** 등록 버튼 연결 타입 ('popup'=페이지, 'path'=경로) — 미설정 시 inline 입력 */
    createConnType?: 'popup' | 'path';
    /** 등록 연결 페이지 slug (createConnType='popup'일 때) */
    createPopupSlug?: string;
    /** 등록 연결 경로 (createConnType='path'일 때) */
    createPath?: string;
    /** 등록 연결 추가 파라미터 — 연결된 화면 필드 key에 매핑 (예: depth=1&parentId=5) */
    createParams?: string;
    /** 항목 수정 허용 여부 (기본 true) */
    allowEdit?: boolean;
    /** 수정 버튼 연결 타입 ('popup'=페이지, 'path'=경로) — 미설정 시 inline 입력 */
    editConnType?: 'popup' | 'path';
    /** 수정 연결 페이지 slug (editConnType='popup'일 때) */
    editPopupSlug?: string;
    /** 수정 연결 경로 (editConnType='path'일 때) */
    editPath?: string;
    /** 수정 연결 추가 파라미터 — 연결된 화면 필드 key에 매핑 (예: depth=1&parentId=5) */
    editParams?: string;
    /** 상세 버튼 표시 여부 — 토글 ON 시 카드 hover에 상세 버튼 표시 */
    allowDetail?: boolean;
    /** 상세 버튼 연결 타입 ('popup'=페이지, 'path'=경로) */
    detailConnType?: 'popup' | 'path';
    /** 상세 연결 페이지 slug (detailConnType='popup'일 때) */
    detailPopupSlug?: string;
    /** 상세 연결 경로 (detailConnType='path'일 때) */
    detailPath?: string;
    /** 상세 연결 파라미터 (param1=1&param2=2 형식) */
    detailParams?: string;
    /** 항목 삭제 허용 여부 (기본 true) */
    allowDelete?: boolean;
}

/* ── SubList 위젯 타입 ── */

/** 서브 목록 컬럼 셀 입력 타입 — 기존 FieldRenderer 필드 컴포넌트와 1:1 대응 */
export type SubListColumnType =
    | 'input'      // 텍스트 입력 (InputField)
    | 'select'     // 셀렉트 박스 (SelectField)
    | 'date'       // 날짜 단독 (DateField)
    | 'dateRange'  // 날짜 범위 from~to (DateRangeField)
    | 'textarea'   // 여러 줄 텍스트 (FormTextareaField)
    | 'file'       // 파일 첨부 (FileField)
    | 'image';     // 이미지 업로드 (ImageField)

/**
 * 서브 목록 컬럼 설정
 * 빌더에서 구성하고, 렌더러에서 테이블 컬럼으로 표시된다.
 */
export interface SubListColumn {
    id: string;                    // 컬럼 고유 ID (자동 생성)
    key: string;                   // 데이터 키 (영문 필수)
    label: string;                 // 헤더 표시명
    type: SubListColumnType;       // 셀 입력 타입
    required?: boolean;            // 필수 여부
    placeholder?: string;          // 입력 placeholder
    options?: string[];            // select 타입 전용 옵션 목록
    codeGroup?: string;            // 공통코드 그룹 연결 (select 타입)
    maxFileCount?: number;         // file/image 타입 최대 파일 수 (기본 1)
    maxFileSizeMB?: number;        // file 타입 개당 최대 용량 (MB)
    fileTypeMode?: string;         // file 타입 허용 파일 종류 ('doc'|'image'|'video'|'custom')
}

/**
 * 서브 목록 위젯
 * Form과 독립된 다건 행 입력 컨텐츠 컴포넌트.
 * Button 위젯과 연결(connectedSlug)하여 저장한다.
 */
export interface SubListWidget {
    type: 'sublist';
    widgetId: string;
    connectedSlug?: string;       // 저장 시 호출할 API slug (Button 위젯과 연결)
    contentKey: string;           // 이 SubList 데이터의 식별 키 (영문 필수)
    title?: string;               // 헤더 타이틀 (예: '코드 상세')
    addButtonLabel?: string;      // 추가 버튼 텍스트 (기본 '추가')
    maxRows?: number;             // 최대 행 수 (0 = 제한 없음)
    showBorder?: boolean;         // 테두리 표시 여부 (기본 true)
    columns: SubListColumn[];     // 컬럼 설정 목록
}

/**
 * 다중선택 위젯
 * 연결된 slug에서 옵션 목록을 가져와 체크박스 드롭다운으로 다중 선택하고,
 * 선택된 항목의 ID 배열을 contentKey로 저장한다.
 */
export interface MultiSelectWidget {
    type: 'multiselect';
    widgetId: string;
    /** dataJson 저장 키 (예: "relatedUsers") */
    contentKey: string;
    /** 옵션 목록을 가져올 slug */
    connectedSlug: string;
    /** 표시 텍스트 필드 키 — 쉼표 구분, 순서대로 ' > '로 연결 (예: "name,dept") */
    labelFields: string;
    placeholder?: string;
    title?: string;
    description?: string;
    showBorder?: boolean;
    bgColor?: string;
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
    | CategoryWidget
    | SubListWidget
    | MultiSelectWidget;

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
