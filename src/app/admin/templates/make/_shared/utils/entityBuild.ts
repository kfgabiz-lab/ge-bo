/**
 * Slug Entity → 위젯 자동 빌드 공통 유틸
 *
 * Search / Table / Form 3개 위젯이 "Slug Entity 필드 목록"을 기반으로
 * 검색조건 / 테이블컬럼 / 폼필드를 자동 구성할 때 공통으로 사용하는 순수 함수 모음이다.
 *
 * - 필드 조회 · key 매칭 · 타입 변환 로직은 위젯 종류와 무관하게 완전히 동일하므로 이 파일 하나로 통합한다.
 * - 위젯별 오케스트레이터(buildFormFromEntity / buildSearchFromEntity / buildTableFromEntity)는
 *   위젯마다 데이터 구조(rows / columns / fields)가 달라 공통화하지 않고 각각 분리 유지한다.
 *
 * 사용법:
 *   import { buildSearchFromEntity } from '../../utils/entityBuild';
 *   onChange(buildSearchFromEntity(widget, slugEntityFields));
 */

import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';
import type { SearchFieldType, SearchFieldConfig, SearchRowConfig, TableColumnConfig, CellType } from '../types';
import type { SearchWidget } from '../components/renderer/types';
import type { FormWidget, FormFieldItem } from '../components/builder/FormBuilder';
import type { TableWidget } from '../components/builder/TableBuilder';
import { createIdGenerator } from '../utils';

/* 이 파일에서 새로 생성하는 모든 id(검색행/검색필드/테이블컬럼/폼필드) 공용 발급기 */
const uid = createIdGenerator('eb');

/* ══════════════════════════════════════════ */
/*  내부 헬퍼 — 외부에서 직접 사용하지 않음        */
/* ══════════════════════════════════════════ */

/**
 * snake_case → camelCase 변환 (예: user_name → userName)
 * - entityApi.ts의 쓰기 전용 함수(toEntityFieldName)가 codegen과 동일한 단일 결정키를 만들 때 재사용하므로 export한다.
 */
export function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
}

/** camelCase → snake_case 변환 (예: userName → user_name) */
function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * entity API row 케이싱 매칭 전용 — key의 camelCase/snake_case 양쪽 변형을 모두 반환한다.
 * getKeyVariants(빌드타임 entity-field key 매칭용, suffix 제거 포함)와는 목적이 달라 별도 함수로 둔다.
 */
export function getCasingAliases(key: string): string[] {
    return [...new Set([key, toCamelCase(key), toSnakeCase(key)])];
}

/** dateRange suffix 제거 — 빌더는 fieldKey만 저장하므로 entity key(_from/_to)와 비교 시 suffix 제거 */
function stripRangeSuffix(key: string): string | null {
    if (key.endsWith('_from')) return key.slice(0, -5);
    if (key.endsWith('_to')) return key.slice(0, -3);
    return null;
}

/**
 * entity key → 비교 가능한 모든 변형 반환 (원본·camelCase·suffix제거·suffix제거+camelCase)
 * @example getKeyVariants('start_date_from') // ['start_date_from', 'startDateFrom', 'start_date', 'startDate']
 */
export function getKeyVariants(key: string): string[] {
    const variants = new Set<string>();
    variants.add(key);
    variants.add(toCamelCase(key));
    const base = stripRangeSuffix(key);
    if (base) {
        variants.add(base);
        variants.add(toCamelCase(base));
    }
    return [...variants];
}

/**
 * entity field 목록 → key(모든 변형 포함) → entity field 맵 생성
 * — 기존 위젯 필드/컬럼과 key가 일치하는 entity field를 빠르게 조회할 때 사용
 */
export function buildEntityFieldMap(fields: SlugEntityFieldItem[]): Map<string, SlugEntityFieldItem> {
    const map = new Map<string, SlugEntityFieldItem>();
    fields.filter(f => f.key).forEach(f => {
        getKeyVariants(f.key!).forEach(v => map.set(v, f));
    });
    return map;
}

/**
 * entity field 목록 중 existingKeys(기존 위젯에 이미 존재하는 key 변형 집합)와 겹치지 않는
 * "신규 필드"만 골라 반환한다 — Form/Search/Table 3개 오케스트레이터의 append 대상 필터링에 공용 사용
 */
function filterUnmatchedFields(fields: SlugEntityFieldItem[], existingKeys: Set<string>): SlugEntityFieldItem[] {
    return fields.filter(f => f.key && getKeyVariants(f.key!).every(v => !existingKeys.has(v)));
}

/* ══════════════════════════════════════════ */
/*  타입 변환 — columnType/fieldType → 위젯별 타입  */
/* ══════════════════════════════════════════ */

/** DB columnType → Form 필드 타입 매핑 (entity에 fieldType이 없을 때 fallback) */
export function mapColumnTypeToFormType(columnType: string): SearchFieldType {
    switch (columnType.toUpperCase()) {
        case 'VARCHAR': return 'input';
        case 'BIGINT': case 'INT': return 'input';
        case 'DATE': case 'TIMESTAMPTZ': return 'date';
        case 'BOOLEAN': return 'checkbox';
        default: return 'textarea';
    }
}

/** Search 위젯에서 제외(skip)하는 entity fieldType — 파일류/숨김필드는 검색조건으로 의미가 없음 */
const SEARCH_SKIP_FIELD_TYPES = ['file', 'image', 'video', 'media', 'hidden'];

/** entity fieldType → Search 필드 타입 강등표 (라디오/체크박스 등은 select로 강등) */
const SEARCH_FIELD_TYPE_MAP: Record<string, SearchFieldType> = {
    input: 'input',
    text: 'input',
    select: 'select',
    radio: 'select',
    checkbox: 'select',
    button: 'select',
    date: 'date',
    yearMonth: 'date',
    dateRange: 'dateRange',
    yearMonthRange: 'dateRange',
    time: 'input',
    textarea: 'input',
    editor: 'input',
    color: 'input',
    'message-key-select': 'input',
    category: 'category',
};

/**
 * entity field → Search 필드 타입 결정
 * 우선순위: codeGroupCode(select 고정) > fieldType 강등표 > fieldType 없을 때 columnType fallback
 * ⚠️ file/image/video/media/hidden 타입은 Search에서 제외 대상 — 호출 전 반드시 필터링할 것 (SEARCH_SKIP_FIELD_TYPES 참고)
 */
export function resolveSearchFieldType(f: SlugEntityFieldItem): SearchFieldType {
    if (f.codeGroupCode) return 'select';
    if (f.fieldType && SEARCH_FIELD_TYPE_MAP[f.fieldType]) return SEARCH_FIELD_TYPE_MAP[f.fieldType];
    if (!f.fieldType) {
        switch (f.columnType.toUpperCase()) {
            case 'VARCHAR': return 'input';
            case 'BIGINT': case 'INT': return 'input';
            case 'DATE': case 'TIMESTAMPTZ': return 'date';
            case 'BOOLEAN': return 'select';
            default: return 'input';
        }
    }
    /* fieldType은 있으나 매핑표에 없는 값(=skip 대상) — 호출부에서 걸러지므로 여기까지 오지 않는 것이 정상 */
    return 'input';
}

/** 숫자 컬럼 타입 여부 — Table isNumber 플래그 판정용 */
const isNumericColumnType = (columnType: string): boolean =>
    ['BIGINT', 'INT'].includes(columnType.toUpperCase());

/**
 * entity field → Table 셀 타입 결정
 * 우선순위: codeGroupCode(text 고정) > columnType 매핑표
 */
export function resolveCellType(f: SlugEntityFieldItem): CellType {
    if (f.codeGroupCode) return 'text';
    switch (f.columnType.toUpperCase()) {
        case 'VARCHAR': case 'BIGINT': case 'INT': return 'text';
        case 'DATE': case 'TIMESTAMPTZ': return 'date';
        case 'BOOLEAN': return 'boolean';
        default: return 'text';
    }
}

/* ══════════════════════════════════════════ */
/*  단일 필드/컬럼 빌더                          */
/* ══════════════════════════════════════════ */

/**
 * entity field → FormFieldItem 생성
 * 1순위: entity에 직접 지정된 fieldType 사용 (강등 없음 — radio는 radio 그대로)
 * 2순위: fieldType 없으면 DB 타입(columnType)으로 자동 매핑
 */
export function buildFormFieldItem(f: SlugEntityFieldItem): FormFieldItem {
    const type = (f.fieldType as SearchFieldType | undefined) ?? mapColumnTypeToFormType(f.columnType);
    const wideTypes = ['textarea', 'dateRange', 'yearMonthRange'];
    /* DATE 컬럼은 날짜만(dateSubType='date'), TIMESTAMPTZ 컬럼은 날짜+시간(dateSubType='datetime') —
     * columnType 기준으로 구분해야 entity 저장/조회 시 값 변환(entityApi.ts)이 컬럼 타입과 어긋나지 않는다 */
    const dateSubType = f.columnType.toUpperCase() === 'TIMESTAMPTZ' ? 'datetime' as const : 'date' as const;
    return {
        id: uid(),
        type,
        label: f.label,
        fieldKey: f.key!,
        colSpan: wideTypes.includes(type) ? 2 : 1,
        rowSpan: 1,
        required: f.isNullable === false,
        ...(type === 'date' && { dateSubType }),
        ...(f.codeGroupCode ? { codeGroupCode: f.codeGroupCode } : {}),
    } as FormFieldItem;
}

/** Search에서 넓은 폭(2칸)을 차지하는 필드 타입 */
const WIDE_SEARCH_TYPES: readonly SearchFieldType[] = ['dateRange', 'dateRangeStatus'];

/** entity field → SearchFieldConfig 생성 (Search는 required 미적용 — 검색조건은 항상 선택 입력) */
export function buildSearchFieldItem(f: SlugEntityFieldItem): SearchFieldConfig {
    const type = resolveSearchFieldType(f);
    return {
        id: uid(),
        type,
        label: f.label,
        fieldKey: f.key!,
        colSpan: WIDE_SEARCH_TYPES.includes(type) ? 2 : 1,
        required: false,
        ...(f.codeGroupCode ? { codeGroupCode: f.codeGroupCode, displayAs: 'text' as const } : {}),
    };
}

/** entity field → TableColumnConfig 생성 */
export function buildTableColumn(f: SlugEntityFieldItem): TableColumnConfig {
    const cellType = resolveCellType(f);
    return {
        id: uid(),
        header: f.label,
        accessor: f.key!,
        align: (cellType === 'boolean' || cellType === 'date') ? 'center' : 'left',
        sortable: false,
        cellType,
        ...(f.codeGroupCode ? { codeGroupCode: f.codeGroupCode, displayAs: 'text' as const } : {}),
        ...(isNumericColumnType(f.columnType) ? { isNumber: true } : {}),
    };
}

/* ══════════════════════════════════════════ */
/*  위젯별 오케스트레이터                        */
/*  — 위젯마다 데이터 구조가 달라 공통화하지 않고 분리 유지 */
/* ══════════════════════════════════════════ */

/**
 * Form 위젯 — entity 필드 기준 자동 빌드
 * - 기존 필드는 key가 일치하면 라벨(비어있을 때만)·required(entity not null 반영)만 갱신
 * - 기존 필드에 없는 entity 필드는 하단에 신규 추가
 * - fields가 비어있으면(신규 Form) 전체 entity 필드가 그대로 추가됨
 * - connectedSlug stamp는 페이지 레벨 정보(선택된 연결 Entity slug)가 필요해 이 함수 밖(호출부)에서 처리한다
 */
export function buildFormFromEntity(w: FormWidget, fields: SlugEntityFieldItem[]): FormWidget {
    const entityFieldMap = buildEntityFieldMap(fields);

    /* 1) 기존 필드 — key 일치하는 entity field 기준 라벨/required만 보정 */
    const updatedFields = w.fields.map(f => {
        const entityField = f.fieldKey ? entityFieldMap.get(f.fieldKey) : undefined;
        if (!entityField) return f;
        return {
            ...f,
            label: f.label || entityField.label,
            required: entityField.isNullable === false ? true : f.required,
        };
    });

    /* 2) 기존 필드에 없는 entity field만 하단에 추가 */
    const existingKeys = new Set(w.fields.map(f => f.fieldKey).filter(Boolean) as string[]);
    const appendFields = filterUnmatchedFields(fields, existingKeys).map(buildFormFieldItem);

    return { ...w, fields: [...updatedFields, ...appendFields] };
}

/** SearchFieldConfig 배열을 cols 기준 그리디 패킹으로 row(들)에 나눠 담는다 (colSpan 합이 cols 초과 시 새 row) */
function packSearchFieldsIntoRows(fields: SearchFieldConfig[], cols: 1 | 2 | 3 | 4 | 5): SearchRowConfig[] {
    if (fields.length === 0) return [];
    const rows: SearchRowConfig[] = [];
    let current: SearchFieldConfig[] = [];
    let colSum = 0;
    fields.forEach(f => {
        if (current.length > 0 && colSum + f.colSpan > cols) {
            rows.push({ id: uid(), cols, fields: current });
            current = [];
            colSum = 0;
        }
        current.push(f);
        colSum += f.colSpan;
    });
    if (current.length > 0) rows.push({ id: uid(), cols, fields: current });
    return rows;
}

/**
 * Search 위젯 — entity 필드 기준 자동 빌드
 * - displayStyle='simple'이면 단일 row(cols=5)에 전체 entity 필드로 재구성
 * - rows가 비어있으면 전체 entity 필드로 rows 신규 생성 (cols=4 그리디 패킹)
 * - rows가 있으면 기존 필드는 라벨(비어있을 때만) 보정, 매칭 안 된 신규 필드만 새 row(들)로 append
 * - file/image/video/media/hidden 타입 entity 필드는 검색조건 의미가 없어 제외한다
 */
export function buildSearchFromEntity(w: SearchWidget, fields: SlugEntityFieldItem[]): SearchWidget {
    const eligible = fields.filter(f => f.key && !SEARCH_SKIP_FIELD_TYPES.includes(f.fieldType ?? ''));

    /* 심플버전 — 단일 row(cols=5)에 전체 재구성 */
    if (w.displayStyle === 'simple') {
        const firstRowId = w.rows[0]?.id ?? uid();
        return { ...w, rows: [{ id: firstRowId, cols: 5, fields: eligible.map(buildSearchFieldItem) }] };
    }

    /* rows가 비어있으면 전체 entity 필드로 신규 생성 */
    if (w.rows.length === 0) {
        return { ...w, rows: packSearchFieldsIntoRows(eligible.map(buildSearchFieldItem), 4) };
    }

    /* 기존 row 유지 — key 일치하는 필드는 라벨만 보정 */
    const entityFieldMap = buildEntityFieldMap(eligible);
    const updatedRows = w.rows.map(row => ({
        ...row,
        fields: row.fields.map(f => {
            const entityField = f.fieldKey ? entityFieldMap.get(f.fieldKey) : undefined;
            if (!entityField) return f;
            return { ...f, label: f.label || entityField.label };
        }),
    }));

    /* 기존 rows에 없는 entity field만 새 row(들)로 append */
    const existingKeys = new Set(w.rows.flatMap(r => r.fields.map(f => f.fieldKey)).filter(Boolean) as string[]);
    const appendFields = filterUnmatchedFields(eligible, existingKeys).map(buildSearchFieldItem);

    return { ...w, rows: [...updatedRows, ...packSearchFieldsIntoRows(appendFields, 4)] };
}

/**
 * Table 위젯 — entity 필드 기준 자동 빌드
 * - 기존 컬럼은 accessor가 일치하면 헤더(비어있을 때만)만 보정
 * - 기존 컬럼에 없는 entity 필드만 하단에 신규 컬럼으로 추가
 * - cellType='actions' 컬럼은 accessor가 entity 필드와 매칭될 일이 없어 항상 그대로 보존되고, 자동으로 새로 추가되지도 않는다
 */
export function buildTableFromEntity(w: TableWidget, fields: SlugEntityFieldItem[]): TableWidget {
    const eligible = fields.filter(f => f.key);
    const entityFieldMap = buildEntityFieldMap(eligible);

    /* 1) 기존 컬럼 — accessor 일치하는 entity field 기준 헤더만 보정 */
    const updatedColumns = w.columns.map(c => {
        const entityField = entityFieldMap.get(c.accessor);
        if (!entityField) return c;
        return { ...c, header: c.header || entityField.label };
    });

    /* 2) 기존 컬럼에 없는 entity field만 하단에 추가 */
    const existingKeys = new Set(w.columns.map(c => c.accessor).filter(Boolean));
    const appendColumns = filterUnmatchedFields(eligible, existingKeys).map(buildTableColumn);

    return { ...w, columns: [...updatedColumns, ...appendColumns] };
}
