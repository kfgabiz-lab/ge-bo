/**
 * 페이지 메이커 공통 타입 정의
 * - list/page.tsx, layer/page.tsx, renderer 컴포넌트에서 공유
 */

/* ── 검색/폼 필드 공유 타입 ── */

/** 검색·폼 필드 유형 */
export type SearchFieldType =
    | 'input' | 'select' | 'date' | 'dateRange'
    | 'radio' | 'checkbox' | 'button'
    | 'textarea'        // 여러 줄 텍스트 표시 (Space 텍스트 아이템 등)
    | 'action-button'   // 액션 버튼 (팝업·API·경로 연결)
    | 'file' | 'image' | 'video'; // 파일 업로드 및 미디어 타입

/**
 * 검색·폼 필드 설정 (SearchBuilder, FormBuilder, renderer 공유)
 * - fieldKey: data_json 저장 키
 * - accessor: 검색 API 파라미터 키 (fieldKey 없을 때 fallback)
 */
export interface SearchFieldConfig {
    id: string;
    type: SearchFieldType;
    label: string;
    label2?: string;        // dateRange 두 번째 라벨
    fieldKey?: string;
    accessor?: string;      // 검색 API 파라미터 키 (fieldKey 없을 때 fallback)
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
    rowSpan?: number;
    required?: boolean;
    options?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    codeGroupCode?: string;
    multiSelect?: boolean;      // button 전용: 다중선택 여부
    /* ── textarea 전용 ── */
    content?: string;           // 표시할 텍스트 내용
    fontSize?: number;          // 글자 크기 (px)
    bold?: boolean;             // 굵게 여부
    textColor?: string;         // 텍스트 색상
    /* ── action-button 전용 ── */
    color?: string;             // 버튼 색상 프리셋 (black/green/...)
    bgColor?: string;           // 커스텀 배경색 (hex)
    connType?: '' | 'form' | 'popup' | 'path' | 'close'; // 클릭 시 연결 방식
    popupSlug?: string;         // 연결 방식 popup: LAYER 템플릿 slug
    fileLayerSlug?: string;     // 연결 방식 path: 로컬 컴포넌트명
    connectedSlug?: string;     // 연결 방식 slug: DB slug (레거시)
    apiId?: number;             // Form slug 없을 때 직접 호출할 API ID
    connectedFormWidgetId?: string; // 연결된 Form 위젯 ID
    formAction?: 'save' | 'delete'; // Form 연결 시 동작 (저장/삭제)
    isPk?: boolean;                 // PK(Primary Key) 여부 (Form 전용)
    readonly?: boolean;             // 읽기 전용 여부 (Form 전용)
    // ── 파일/이미지/비디오 전용 ──
    maxFileCount?: number;
    maxFileSizeMB?: number;
    maxTotalSizeMB?: number;
    fileTypeMode?: 'doc' | 'image' | 'video' | 'custom' | '';
    allowedExtensions?: string[];
    videoMode?: 'url' | 'file';
}

/** 검색폼 행 설정 */
export interface SearchRowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;
    fields: SearchFieldConfig[];
}

/** 공통 필드 기본 인터페이스 */
export interface BaseFieldConfig {
    id: string;
    type: string;
    label: string;
    fieldKey?: string;
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
    rowSpan?: number;
    required?: boolean;
    options?: string[];
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    codeGroupCode?: string;
}

/** 행 설정 공통 인터페이스 */
export interface RowConfig {
    id: string;
    cols: 1 | 2 | 3 | 4 | 5;
    fields: BaseFieldConfig[];
}

/** 공통코드 그룹 타입 */
export interface CodeGroupDef {
    groupCode: string;
    groupName: string;
    details: { code: string; name: string; active: boolean }[];
}

/* ── 테이블 컬럼 관련 타입 ── */

/** 셀 렌더링 타입 */
export type CellType = 'text' | 'badge' | 'boolean' | 'actions' | 'file';

/** 셀 옵션 (badge용) */
export interface CellOption {
    text: string;
    value: string;
    color: string;
}

/**
 * 테이블 컬럼 설정
 * - list/page.tsx(빌더), [slug]/page.tsx(렌더러) 공통 사용
 */
export interface TableColumnConfig {
    id: string;
    header: string;
    accessor: string;
    width?: number;
    widthUnit?: 'px' | '%';
    align: 'left' | 'center' | 'right';
    sortable: boolean;
    cellType: CellType;
    cellOptions?: CellOption[];         // badge 옵션
    showIcon?: boolean;                 // badge 아이콘(●) 표시
    badgeShape?: 'round' | 'square';    // badge 모양
    isNumber?: boolean;                 // 숫자 포맷 여부
    trueText?: string;                  // boolean 타입 true 텍스트
    falseText?: string;                 // boolean 타입 false 텍스트
    actions?: ('edit' | 'detail' | 'delete')[]; // 프리셋 액션 버튼
    customActions?: { id: string; label: string; color: string }[]; // 커스텀 버튼
    editPopupSlug?: string;             // 수정 버튼 연결 LAYER slug (관리자방식)
    detailPopupSlug?: string;           // 상세 버튼 연결 LAYER slug (관리자방식)
    editFileLayerSlug?: string;         // 수정 버튼 연결 로컬 컴포넌트명 (개발자방식)
    detailFileLayerSlug?: string;       // 상세 버튼 연결 로컬 컴포넌트명 (개발자방식)
    fileLayerSlug?: string;             // file 타입 — 파일 뷰어 LAYER slug
    /** 공통코드 연동 — text 셀에서 코드값을 이름으로 변환 */
    codeGroupCode?: string;
    /** 공통코드 연동 시 표시 방식: 'text'=이름 표시(기본), 'value'=코드값 표시 */
    displayAs?: 'text' | 'value';
}

/** 불러오기 목록 아이템 */
export interface TemplateItem {
    id: number;
    name: string;
    slug: string;
    description?: string;
    configJson: string;
    templateType?: string;
}

/* ── 표시 방식 타입 ── */

/**
 * 목록 표시 방식
 * - pagination: 페이지네이션 (고전적인 페이지 번호)
 * - scroll: 무한 스크롤 (Intersection Observer 기반)
 */
export type DisplayMode = 'pagination' | 'scroll';

/* ── 버튼 영역 관련 타입 (페이지 메이커 List v2) ── */

/** 버튼 유형 */
export type ButtonType = 'primary' | 'secondary' | 'danger' | 'blue' | 'success';

/** 버튼 액션 */
export type ButtonAction = 'register' | 'excel' | 'custom';

/** 버튼 위치 */
export type ButtonPosition = 'above' | 'between';

/** 버튼 설정 */
export interface ButtonConfig {
    id: string;
    label: string;
    type: ButtonType;
    action: ButtonAction;
    popupSlug?: string;          // DB 저장 레이어 팝업 연동 slug
    fileLayerSlug?: string;      // 생성 파일용 직접 import slug (./LayerPopup)
    excelFormat?: 'xlsx' | 'csv';  // action이 'excel'일 때 파일 형식
}

/* ── Layer 팝업 관련 타입 (quick-detail/page.tsx, popup 컴포넌트 공유) ── */

/** 레이어 팝업 유형 */
export type LayerType = 'center' | 'right';

/** 중앙 팝업 너비 */
export type LayerWidth = 'sm' | 'md' | 'lg' | 'xl';

/** 하단 버튼 스타일 타입 */
export type LayerButtonType = 'primary' | 'secondary' | 'blue' | 'success' | 'danger';

/** 하단 버튼 액션 타입 */
export type LayerButtonAction = 'close' | 'save' | 'custom';

/** 하단 버튼 설정 */
export interface LayerButtonConfig {
    id: string;
    label: string;
    type: LayerButtonType;
    action: LayerButtonAction;
}
