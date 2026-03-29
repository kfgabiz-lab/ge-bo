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
    popupSlug?: string;  // action이 'register'이고 팝업 연동 시
}
