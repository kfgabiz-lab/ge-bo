/**
 * 빌더 필드 컴포넌트 공통 타입
 *
 * 사용법:
 *   import { FieldEditProps, FieldEditValues, ColSpanMode } from './_shared/components/builder/fields/types';
 */

import { CodeGroupDef } from '../../../types';

/** ColSpan 표시 방식 */
export type ColSpanMode =
    | { type: 'button'; options: number[]; minSpan?: number }  // 버튼 선택 방식 (Search: 1~5)
    | { type: 'input'; min: number; max: number };             // 숫자 입력 방식 (Form: 1~12)

/** 공통 필드 편집 값 */
export interface FieldEditValues {
    label: string;
    label2?: string;         // dateRange 전용 두 번째 라벨
    fieldKey?: string;
    colSpan: number;
    rowSpan?: number;        // form/layer 전용 행 높이
    placeholder?: string;   // input/select 전용
    required?: boolean;
    options?: string[];      // select/radio/checkbox/button 전용 ("텍스트:값" 형식)
    codeGroupCode?: string;  // 공통코드 그룹 코드
    multiSelect?: boolean;   // button 전용 다중선택 여부
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    /* ── textarea 전용 ── */
    content?: string;        // 표시할 텍스트 내용
    fontSize?: number;       // 글자 크기 (px)
    bold?: boolean;          // 굵게 여부
    textColor?: string;      // 텍스트 색상
    /* ── action-button 전용 ── */
    color?: string;          // 버튼 색상 프리셋
    bgColor?: string;        // 커스텀 배경색
    connType?: '' | 'form' | 'popup' | 'path' | 'close'; // 클릭 시 연결 방식
    popupSlug?: string;              // 관리자방식 팝업 slug
    fileLayerSlug?: string;          // 개발자방식 로컬 컴포넌트명
    connectedFormWidgetId?: string;  // 연결된 Form 위젯 ID
    apiId?: number;                  // Form slug 없을 때 직접 호출할 API ID
    formAction?: 'save' | 'delete';  // Form 연결 시 동작 (저장/삭제)
    /* ── Form 전용 ── */
    isPk?: boolean;          // PK(Primary Key) 여부
    readonly?: boolean;      // 읽기 전용 여부
    /* ── 파일 업로드 & 비디오 설정 (Layer 전용) ── */
    maxFileCount?: number;       // 최대 파일 수
    maxFileSizeMB?: number;      // 개당 최대 용량
    maxTotalSizeMB?: number;     // 전체 최대 용량
    fileTypeMode?: 'doc' | 'image' | 'video' | 'custom' | ''; // 허용 유형
    allowedExtensions?: string[]; // 커스텀 확장자
    videoMode?: 'url' | 'file';  // 비디오 입력 방식
    rows?: number;               // textarea 행 수
}

/**
 * 공통 필드 컴포넌트 props
 *
 * 사용법:
 *   function MyField({ values, onChange, colSpanMode, codeGroups, codeGroupsLoading }: FieldEditProps) { ... }
 */
export interface FieldEditProps {
    /** 현재 필드 값 */
    values: FieldEditValues;
    /** 값 변경 핸들러 (즉시 반영) */
    onChange: (updates: Partial<FieldEditValues>) => void;
    /** ColSpan 표시 방식 설정 */
    colSpanMode: ColSpanMode;
    /** RowSpan 설정 — 지정 시 RowSpan 입력 표시 */
    rowSpanConfig?: { min: number; max: number };
    /** 공통코드 그룹 목록 */
    codeGroups: CodeGroupDef[];
    /** 공통코드 로딩 여부 */
    codeGroupsLoading: boolean;
    /** 추가 모드: 라벨 input 자동 포커스 */
    autoFocus?: boolean;
    /** 한 줄 배치 모드 (공간영역 등에서 사용) */
    compact?: boolean;
    /** 추가 모드: 라벨 input 키 핸들러 (Enter/Escape) */
    onLabelKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export type { CodeGroupDef };
