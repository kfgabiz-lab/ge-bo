/**
 * 빌더 필드 컴포넌트 공통 타입
 *
 * 사용법:
 *   import { FieldEditProps, FieldEditValues, ColSpanMode } from './_shared/components/builder/fields/types';
 */

import { CodeGroupDef, DateSubType } from '../../../types';
import type { SlugOption } from './SlugSelectField';
import type { SlugRelationOption } from '../../SearchBuilder';

/** ColSpan 표시 방식 */
export type ColSpanMode =
    | { type: 'button'; options: number[]; minSpan?: number }  // 버튼 선택 방식 (Search: 1~5)
    | { type: 'input'; min: number; max: number };             // 숫자 입력 방식 (Form: 1~12)

/** 데이터생성 세트 1개 — 생성KEY + 변환옵션 */
export interface DataGenerationEntry {
    /** 생성KEY — dot notation: fieldKey / contentKey.fieldKey / tabKey.contentKey.fieldKey */
    generationKey: string;
    /** 빈값일 때만 반영 — true 시 대상 필드가 빈값인 경우에만 생성값 적용 */
    onlyIfEmpty?: boolean;
    /** HTML제거 — true 이면 HTML 태그 제거 후 변환 (에디터 전용) */
    stripHtml?: boolean;
    /** 데이터변경: 없음(none) / 공백·특수문자→하이픈(hyphen) */
    dataReplacement?: 'none' | 'hyphen';
    /** 문자변경: 없음(none) / 대문자(upper) / 소문자(lower) */
    caseChange?: 'none' | 'upper' | 'lower';
    /** 텍스트추가(끝) — 변환 후 끝에 붙이는 문자열 */
    appendText?: string;
    /** 글자자르기 — N자 미만으로 자름 */
    truncateLength?: number;
}

/** 공통 필드 편집 값 */
export interface FieldEditValues {
    label: string;
    labelMsgKey?: string;    // 라벨 다국어 키 (있으면 t(key) 표시, 없으면 label 표시)
    label2?: string;         // dateRange 전용 두 번째 라벨
    label2MsgKey?: string;   // dateRange 두 번째 라벨 다국어 키
    fieldKey?: string;
    colSpan: number;
    rowSpan?: number;        // form/layer 전용 행 높이
    placeholder?: string;   // input/select 전용
    placeholderMsgKey?: string; // placeholder 다국어 키
    /** 라벨 하단 설명 텍스트 — 렌더러에서 라벨 바로 아래 회색 소형 텍스트로 표시 */
    description?: string;
    descriptionMsgKey?: string; // 설명 다국어 키
    required?: boolean;
    options?: string[];      // select/radio/checkbox/button 전용 ("텍스트:값" 형식)
    /** select 표시 방식 — 'selectbox'(기본) | 'autocomplete'(입력형 자동완성) */
    selectType?: 'selectbox' | 'autocomplete';
    codeGroupCode?: string;  // 공통코드 그룹 코드
    displayAs?: 'text' | 'value';  // 공통코드 표시 방식 (이름 표시 / 코드값 표시)
    multiSelect?: boolean;   // button 전용 다중선택 여부
    minLength?: number;
    maxLength?: number;
    showCharCount?: boolean;  // 글자수 표시 여부 (input/textarea 전용)
    pattern?: string;
    patternDesc?: string;
    minSelect?: number;
    maxSelect?: number;
    /* ── textarea 전용 ── */
    content?: string;        // 표시할 텍스트 내용
    contentMsgKey?: string;  // 다국어 내용 키 (textarea 전용)
    fontSize?: number;       // 글자 크기 (px)
    bold?: boolean;          // 굵게 여부
    textColor?: string;      // 텍스트 색상
    /* ── action-button 전용 ── */
    color?: string;          // 버튼 색상 프리셋
    bgColor?: string;        // 커스텀 배경색
    connType?: '' | 'content' | 'popup' | 'path' | 'close' | 'excel' | 'datasave'; // 클릭 시 연결 방식
    popupSlug?: string;              // 관리자방식 팝업 slug
    fileLayerSlug?: string;          // 개발자방식 로컬 컴포넌트명
    connectedContentWidgetIds?: string[];  // 연결된 컨텐츠 위젯 ID 배열 (Form+SubList 다중)
    contentAction?: 'save' | 'delete';    // 컨텐츠 연결 시 동작 (저장/삭제)
    goBackAfterAction?: boolean;          // 동작 완료 후 이전 페이지 이동 / 팝업 닫기
    excelTableWidgetId?: string;          // 엑셀 다운로드 연결 테이블 위젯 ID (connType='excel' 전용)
    excelPrivacyPopup?: boolean;          // 개인정보 다운로드 사유 입력 팝업 사용 여부 (connType='excel' 전용)
    params?: string;                      // popup·path 연결 시 전달 파라미터 (예: depth=1,type=create)
    dataSaveSlug?: string;                // 데이터저장 연결 slug (connType='datasave' 전용)
    saveConfirm?: boolean;                // 저장 컨펌 — true 시 live 모드 버튼 클릭 시 확인창 표시 (action-button 전용)
    /* ── Form 전용 ── */
    isPk?: boolean;          // PK(Primary Key) 여부
    readonly?: boolean;      // 읽기 전용 여부
    /** 동적 HIDE 조건 — live 모드에서 다른 필드 값 기준으로 이 필드를 숨김
     *  형식: "fieldKey=값" (단일) / "key1=v1,key2=v2" (AND 복수 조건) / "key!=값" (불일치) */
    hideCondition?: string;
    /** 동적 Disable 조건 — live 모드에서 다른 필드 값 기준으로 이 필드를 비활성화
     *  형식: "fieldKey=값" (단일) / "key1=v1,key2=v2" (AND 복수 조건) / "key!=값" (불일치) */
    disableCondition?: string;
    /** 검색제외 — true 시 검색 API 파라미터에 포함하지 않음 */
    excludeFromSearch?: boolean;
    /* ── 파일 업로드 & 비디오 설정 (Layer 전용) ── */
    maxFileCount?: number;       // 최대 파일 수
    maxFileSizeMB?: number;      // 개당 최대 용량
    maxTotalSizeMB?: number;     // 전체 최대 용량
    fileTypeMode?: 'doc' | 'image' | 'video' | 'custom' | ''; // 허용 유형
    allowedExtensions?: string[]; // 커스텀 확장자
    videoMode?: 'url' | 'file';  // 비디오 입력 방식
    rows?: number;               // textarea 행 수
    /* ── media 전용 ── */
    mediaImageMaxSizeMB?: number;    // 이미지 최대 크기 MB (기본: 5)
    mediaVideoMaxSizeMB?: number;    // 동영상 최대 크기 MB (기본: 20)
    /* ── 기본값 설정 ── */
    defaultValue?: string;           // 직접 텍스트 기본값
    defaultValueMsgKey?: string;     // 다국어 기본값 키
    defaultOptionValue?: string;     // 옵션 기본 선택값 (select·radio·checkbox)
    defaultDateOffset?: number;      // date: 오늘 기준 N일 전 기본값 (0=오늘)
    defaultDate?: string;            // date: 기본값 날짜 미리보기용 (YYYY-MM-DD)
    disablePast?: boolean;           // date: 오늘 이전 날짜 비활성화
    defaultToday?: boolean;          // date: 오늘 날짜를 기본값으로 자동 적용
    defaultStartDateOffset?: number; // dateRange: 시작일 오늘 기준 N일 전
    defaultStartDate?: string;       // dateRange: 시작일 기본값 미리보기용 (YYYY-MM-DD)
    disableStartPast?: boolean;      // dateRange: 시작일 이전 비활성화
    defaultStartToday?: boolean;     // dateRange: 시작일 오늘 날짜 자동 적용 (종료일과 독립)
    defaultEndDateOffset?: number;   // dateRange: 종료일 오늘 기준 N일 전
    defaultEndDate?: string;         // dateRange: 종료일 기본값 미리보기용 (YYYY-MM-DD)
    disableEndPast?: boolean;        // dateRange: 종료일 이전 비활성화
    defaultEndToday?: boolean;       // dateRange: 종료일 오늘 날짜 자동 적용 (시작일과 독립)
    maxRangeValue?: number;          // dateRange: 최대 조회 기간 숫자 (0 또는 미설정 시 제한 없음)
    maxRangeUnit?: 'day' | 'week' | 'month' | 'year'; // dateRange: 최대 조회 기간 단위
    /** dateRange 통합 서브타입 — 날짜/년월/일시분초/시분/시분초 (기본: 'date') */
    rangeSubType?: DateSubType;
    /** date 통합 서브타입 — 날짜/년월/일시분초/시분/시분초 (기본: 'date') */
    dateSubType?: DateSubType;
    /** 단일 date 컬럼 범위 검색 — true 시 _gte/_lte 파라미터로 전송 (단일 date 값 범위 필터) */
    singleDateRange?: boolean;
    /* ── category 전용 ── */
    dbSlug?: string;                 // 카테고리 연결 slug (PAGE_DATA 타입)
    relationSlugId?: number;         // 연동 slug-relation ID
    // 데이터 표현식 (ColumnBaseField와 동일, 예: code=1?title:title2)
    data?: string;
    /** 연결 Slug 다건 매칭 시 표시 방식 — 'ONE_LINE'=한줄로 합침(기본), 'MULTI_LINE'=줄바꿈으로 나열 (text 타입 전용) */
    fetchDisplayMode?: 'ONE_LINE' | 'MULTI_LINE';
    maxDepth?: 1 | 2 | 3 | 4;       // 표시할 최대 depth 수
    depthLabels?: string[];          // depth별 라벨 배열
    depthLabelMsgKeys?: string[];    // depth별 라벨 다국어 키 배열
    depthValueFields?: string[];     // depth별 value 경로 (예: 'id', 'dataJson.id')
    depthTextFields?: string[];      // depth별 표시 텍스트 경로 (예: 'name', 'dataJson.name')
    /** depth별 옵션 필터 조건식 — evalConditionExpr 문법 재사용, resolveAccessor(dataJson, key) 기준 raw item 단계에서 필터 */
    depthFilters?: string[];
    /* ── time 전용 ── */
    defaultTime?: string;   // 기본 시간값 (HH:MM 형식)
    timeStep?: number;      // 분 단위 간격 (1/5/10/30, 기본 1)
    /* ── dateRangeStatus 전용 ── */
    linkedDateRangeKey?: string;     // 연결할 dateRange 필드의 accessor (예: 'period')
    beforeText?: string;             // 날짜 이전 표시 텍스트 (예: '예정')
    beforeTextMsgKey?: string;       // 이전 텍스트 다국어 키
    inRangeText?: string;            // 날짜 포함 표시 텍스트 (예: '진행중')
    inRangeTextMsgKey?: string;      // 포함 텍스트 다국어 키
    afterText?: string;              // 날짜 이후 표시 텍스트 (예: '종료')
    afterTextMsgKey?: string;        // 이후 텍스트 다국어 키
    statusDisplayStyle?: 'select' | 'radio'; // 검색 UI 표시 방식 (기본: select)
    /* ── 데이터생성 전용 (Input/FormTextarea) ── */
    /** 생성KEY — dot notation: fieldKey / contentKey.fieldKey / tabKey.contentKey.fieldKey */
    generationKey?: string;
    /** 데이터변경: 없음(none) / 공백·특수문자→하이픈(hyphen) */
    dataReplacement?: 'none' | 'hyphen';
    /** 문자변경: 없음(none) / 대문자(upper) / 소문자(lower) */
    caseChange?: 'none' | 'upper' | 'lower';
    /** 텍스트추가(끝) — 변환 후 끝에 붙이는 문자열 */
    appendText?: string;
    /** 글자자르기 — N자 미만으로 자름 (해당 길이 이상이면 N-1자까지 보존) */
    truncateLength?: number;
    /** 다중 데이터생성 세트 — 세트별로 독립된 generationKey·변환옵션 적용 */
    dataGenerations?: DataGenerationEntry[];
    /* ── editor 전용 ── */
    /** 에디터 종류 선택 — tiptap(기본) 또는 toast (과도기 공존) */
    editorType?: 'tiptap' | 'toast';
    /* ── action 컬럼 전용 (SubList action 타입 컬럼에서 사용) ── */
    actions?: ('edit' | 'detail' | 'delete' | 'copy')[];
    /* ── select SLUG 옵션 소스 전용 ── */
    /** SLUG 옵션 소스 연결 SLUG — live 모드에서 해당 SLUG 데이터를 API fetch하여 옵션 생성 */
    optionSlug?: string;
    /** SLUG 데이터에서 select value로 쓸 필드 key (dot notation 지원, 예: id, form1.code) */
    optionValueKey?: string;
    /** SLUG 데이터에서 select text로 쓸 필드 key (dot notation 지원, 예: name, form1.title) */
    optionTextKey?: string;
    /** SLUG 데이터 정렬 기준 필드 key */
    optionOrderKey?: string;
    /** SLUG 데이터 정렬 방향 (ASC / DESC) */
    optionOrderDir?: 'ASC' | 'DESC';
    /** SLUG 옵션 필터 조건식 — evalConditionExpr 문법 재사용, flattenPageDataItem 기준 flat key로 평가 */
    optionFilter?: string;
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
    /** ColSpan/RowSpan 입력란 숨김 — SubList 컬럼처럼 colSpan 개념이 없는 경우 사용 */
    hideColSpan?: boolean;
    /** hideCondition/disableCondition 입력란 숨김 — SubList 등 동적 조건 미지원 컨텍스트 */
    hideConditionFields?: boolean;
    /** 추가 모드: 라벨 input 키 핸들러 (Enter/Escape) */
    onLabelKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    /** Slug Entity 필드 목록 — 있을 때 fieldKey 입력을 selectbox로 전환 (form 빌더 전용) */
    slugEntityFields?: { key: string | null; label: string }[];
    /** SLUG 옵션 소스 목록 — select 필드의 SLUG 탭에서 연결할 slug 목록 (SlugSelectField에 전달) */
    slugOptions?: SlugOption[];
    /** FETCH 슬러그 관계 목록 — input 필드의 "연결 Slug" 선택에 사용 */
    fetchRelations?: SlugRelationOption[];
}

export type { CodeGroupDef, SlugOption, SlugRelationOption };
