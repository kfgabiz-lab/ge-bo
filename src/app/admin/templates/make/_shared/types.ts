/**
 * 페이지 메이커 공통 타입 정의
 * - list/page.tsx, layer/page.tsx에서 공유
 */

/** 공통 필드 기본 인터페이스 */
export interface BaseFieldConfig {
    id: string;
    type: string;
    label: string;
    fieldKey?: string;
    placeholder?: string;
    colSpan: 1 | 2 | 3 | 4 | 5;
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
