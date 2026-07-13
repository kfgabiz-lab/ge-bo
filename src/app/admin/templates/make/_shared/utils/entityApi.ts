/**
 * Slug Entity REST API(/api/v1/{slug}) 런타임 호출 공통 유틸
 *
 * entityBuild.ts가 "빌드타임(위젯 설정 화면에서 필드/컬럼을 자동 구성)"을 다루는 것과 달리,
 * 이 파일은 "런타임(실제 페이지에서 Table 위젯이 데이터를 조회할 때)"에 필요한
 * entity REST API 고유 특성(경로 규칙 · 응답 shape 차이)만 다룬다.
 *
 * - entity API는 page_data API와 응답 구조가 다르다(JSONB 감싸기 없는 flat 행, 페이징 필드명 상이)
 *   → 이 차이를 흡수해서 기존 page_data 흐름(flattenPageDataItem 등)에 그대로 태울 수 있게 만드는 것이 목적.
 *
 * 사용법:
 *   import { entityApiPath, normalizeEntityRow, normalizeEntityPageEnvelope } from '../../utils/entityApi';
 *   const res = await api.get(entityApiPath('hero-data'), { params: { page: 0, size: 20 } });
 *   const envelope = normalizeEntityPageEnvelope(res.data);
 *   const rows = (envelope.content as Record<string, unknown>[]).map(normalizeEntityRow);
 */

import { flattenPageDataItem } from '../utils';
import { getCasingAliases, toCamelCase } from './entityBuild';
import type { DateSubType } from '../types';
import type { FormFieldItem } from '../components/builder/FormBuilder';
import type { SubListColumn } from '../components/renderer/types';

/**
 * entity slug → api.get()에 넘길 상대경로 변환
 * - api.ts의 axios 인스턴스는 baseURL이 이미 '/api/v1'로 설정되어 있으므로
 *   여기서는 반드시 '/${slug}'만 반환해야 한다.
 * - '/api/v1/${slug}'를 반환하면 baseURL과 중복되어 최종 요청 경로가
 *   '/api/v1/api/v1/${slug}'가 되어 404가 발생하니 절대 금지.
 *
 * @example entityApiPath('hero-data') // '/hero-data'
 */
export function entityApiPath(slug: string): string {
    return `/${slug}`;
}

/**
 * entity API의 flat 응답 행(row) → page_data 흐름과 호환되는 형태로 정규화
 *
 * entity API 응답 행은 { id, ...필드들, createdBy, createdAt, updatedBy, updatedAt } 형태의
 * flat 구조다(JSONB dataJson 감싸기 없음). id/감사컬럼 4개를 분리하고 나머지 필드들을
 * dataJson으로 감싸 flattenPageDataItem에 그대로 통과시키면, TableRenderer가 기대하는
 * _id / _pathMap 등 공통 필드가 동일하게 채워진다.
 *
 * 또한 TableColumnConfig.accessor가 Slug Entity 필드 등록 시 입력한 원본 key(snake_case일 수 있음)
 * 기준으로 저장되어 있을 수 있는 반면, entity API 응답 필드명은 항상 Java 필드명(camelCase)이다.
 * 이 함수는 응답 row(camelCase)의 각 필드마다 getCasingAliases로 camelCase/snake_case 별칭을
 * 함께 얹어두므로, accessor가 어느 케이싱으로 저장돼 있어도 동일한 값에 매칭된다.
 *
 * @example
 * normalizeEntityRow({ id: 1, titleText: 'A', createdAt: '2026-01-01', createdBy: 'admin', updatedAt: null, updatedBy: null })
 * // → { _id: 1, titleText: 'A', title_text: 'A', createdAt: '2026-01-01', createdBy: 'admin', ... }
 */
export function normalizeEntityRow(raw: Record<string, unknown>): Record<string, unknown> {
    const { id, createdAt, createdBy, updatedAt, updatedBy, ...fields } = raw;

    /* id/감사컬럼 분리 후 나머지 필드만 dataJson으로 감싸 기존 공통 함수(flattenPageDataItem)에 통과 */
    const flat = flattenPageDataItem({
        id: Number(id ?? 0),
        dataJson: fields,
        createdAt: (createdAt as string | null | undefined) ?? null,
        createdBy: (createdBy as string | null | undefined) ?? null,
        updatedAt: (updatedAt as string | null | undefined) ?? null,
        updatedBy: (updatedBy as string | null | undefined) ?? null,
    });

    /* accessor 케이싱 불일치 방어 — 필드별 snake/camel 별칭을 추가로 얹는다(기존 키는 덮어쓰지 않음) */
    Object.entries(fields).forEach(([key, value]) => {
        getCasingAliases(key).forEach((alias) => {
            if (!(alias in flat)) flat[alias] = value;
        });
    });

    return flat;
}

/**
 * entity API의 페이징 envelope(Spring Data 표준 Page<T>) → page_data의 커스텀 envelope과
 * 호환되는 형태로 정규화
 *
 * - Spring Data Page<T> 필드명: number(현재 페이지, 0-base) / content / totalElements / totalPages / last
 * - page_data PageDataListResponse 필드명: page / content / totalElements / totalPages / last
 * - 핵심 차이는 'number' ↔ 'page' 하나뿐이라, 나머지는 그대로 옮기고 number만 page로 매핑한다.
 *
 * @example
 * normalizeEntityPageEnvelope({ number: 0, content: [...], totalElements: 3, totalPages: 1, last: true })
 * // → { page: 0, content: [...], totalElements: 3, totalPages: 1, last: true }
 */
export function normalizeEntityPageEnvelope(raw: {
    number: number;
    content: unknown[];
    totalElements: number;
    totalPages: number;
    last: boolean;
    [k: string]: unknown;
}): { page: number; content: unknown[]; totalElements: number; totalPages: number; last: boolean } {
    return {
        page: raw.number,
        content: raw.content,
        totalElements: raw.totalElements,
        totalPages: raw.totalPages,
        last: raw.last,
    };
}

/* ══════════════════════════════════════════════════════════════════ */
/*  여기서부터는 "날짜/일시" 값을 entity 컬럼 타입에 맞게 변환하는 공통 함수다.  */
/*                                                                      */
/*  왜 필요한가:                                                        */
/*  - entity DB 컬럼은 DATE(java.time.LocalDate) 또는 TIMESTAMPTZ         */
/*    (java.time.OffsetDateTime) 둘 중 하나로 강타입이다.                  */
/*  - FE의 date input(HTML)이 만드는 문자열은 오프셋이 없는 "로컬 벽시계"    */
/*    문자열(예: '2026-07-12', '2026-07-12T14:30')이고, LocalDate는 오프셋을 */
/*    붙이면 파싱을 거부하는 반면 OffsetDateTime은 오프셋이 반드시 필요하다.  */
/*  - 따라서 쓰기(toEntityDateString)/읽기(fromEntityDateString) 양방향     */
/*    변환이 모두 필요하며, 이 두 함수와 이를 위젯 필드 설정에서 조립하는     */
/*    buildEntityDateFieldMeta / restoreEntityDateFields를 이 구역에 모은다. */
/* ══════════════════════════════════════════════════════════════════ */

/**
 * entity 날짜 필드 1개에 대한 변환 메타 정보
 * - isRange: 원본 FormFieldItem.type이 dateRange/yearMonthRange인지 여부
 *   (entity DB 컬럼은 이제 `_from`/`_to`가 각각 독립된 컬럼(둘 다 NOT NULL)으로 존재한다 —
 *    range 필드는 대표값 하나로 병합하지 않고 `${fieldKey}_from`/`${fieldKey}_to` 두 항목을
 *    맵에 각각 등록해서, buildEntityRequestBody/restoreEntityDateFields가 range/단일 필드를
 *    구분 없이 동일한 "key로 맵 조회" 로직만으로 처리할 수 있게 한다)
 * - subType: 'date'|'yearMonth'|'datetime'|'time'|'timeSec' — FormFieldItem.dateSubType(단독)
 *   또는 rangeSubType(range) 값을 그대로 담는다
 */
export interface EntityDateFieldMeta {
    isRange: boolean;
    subType: DateSubType;
}

/**
 * Form 위젯 필드 목록(FormFieldItem[]) → fieldKey별 EntityDateFieldMeta 맵 생성
 * - type이 date/yearMonth인 필드는 fieldKey를 그대로 키로 등록한다(단일 컬럼)
 * - type이 dateRange/yearMonthRange인 필드는 `${fieldKey}_from`/`${fieldKey}_to` 두 키로
 *   각각 등록한다 — entity DB 컬럼이 이제 시작/종료 각각 독립 컬럼이기 때문이다
 * - time/timeSec 서브타입은 대응하는 entity 컬럼 타입이 없어 변환 없이 그대로 통과되지만,
 *   메타 자체는 담아둔다(toEntityDateString/fromEntityDateString이 내부적으로 통과 처리)
 *
 * 사용법 (buildEntityRequestBody 저장 시점, restoreEntityDateFields 조회 시점 공용):
 *   const dateFieldMeta = buildEntityDateFieldMeta(formWidget.fields);
 *
 * @example
 * // dateRange 필드 postDate(fieldKey='post_date') →
 * // Map { 'post_date_from' => {isRange:true, subType:'date'}, 'post_date_to' => {isRange:true, subType:'date'} }
 */
export function buildEntityDateFieldMeta(fields: FormFieldItem[]): Map<string, EntityDateFieldMeta> {
    const map = new Map<string, EntityDateFieldMeta>();
    fields.forEach((f) => {
        if (!f.fieldKey) return;
        if (f.type === 'date' || f.type === 'yearMonth') {
            map.set(f.fieldKey, {
                isRange: false,
                subType: f.dateSubType ?? (f.type === 'yearMonth' ? 'yearMonth' : 'date'),
            });
        } else if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
            const subType = f.rangeSubType ?? (f.type === 'yearMonthRange' ? 'yearMonth' : 'date');
            /* fieldKey2 지정 시 시작=fieldKey/종료=fieldKey2 키 그대로 등록(buildDataJson과 동일 규칙),
               미지정 시 기존처럼 `${fieldKey}_from`/`_to` 키로 등록 — entity 컬럼이 dispFrom/dispTo처럼
               완전히 독립된 이름일 때 `${fieldKey}_from` 같은 존재하지 않는 필드명을 만들지 않기 위함 */
            if (f.fieldKey2) {
                map.set(f.fieldKey, { isRange: true, subType });
                map.set(f.fieldKey2, { isRange: true, subType });
            } else {
                map.set(`${f.fieldKey}_from`, { isRange: true, subType });
                map.set(`${f.fieldKey}_to`, { isRange: true, subType });
            }
        }
    });
    return map;
}

/**
 * SubList 컬럼 목록(SubListColumn[]) → key(컬럼 key)별 EntityDateFieldMeta 맵 생성
 *
 * buildEntityDateFieldMeta(바로 위)는 FormFieldItem[] 전용이라 SubListColumn에는 그대로 쓸 수 없다
 * (필드 이름/타입 구조가 다름). 판단 로직(단일/range 분기, key 규칙)은 완전히 동일하게 맞춘
 * SubList 전용 버전이다 — 자식 SubList 행을 entity 요청 바디로 변환하기 전에 사용한다.
 *
 * - type이 'date'인 컬럼은 key를 그대로 키로 등록한다(단일 컬럼)
 * - type이 'dateRange'인 컬럼은 `${key}_from`/`${key}_to` 두 키로 각각 등록한다
 *   (SubListRenderer가 dateRange 컬럼 값을 row[`${key}_from`]/row[`${key}_to`]로 저장하는 것과 동일한 규칙)
 * - key2(종료일 Key)가 지정된 경우에는 `${key}_from`/`_to` 자동유도 대신 key(시작)/key2(종료)를
 *   그대로 필드명으로 등록한다(entity 컬럼명이 완전히 독립된 이름일 때 대응)
 *
 * 사용법:
 *   const dateFieldMeta = buildSubListEntityDateFieldMeta(subListWidget.columns);
 *   const rowBody = buildEntityRequestBody(row, dateFieldMeta);
 */
export function buildSubListEntityDateFieldMeta(columns: SubListColumn[]): Map<string, EntityDateFieldMeta> {
    const map = new Map<string, EntityDateFieldMeta>();
    columns.forEach((col) => {
        if (!col.key) return;
        if (col.type === 'date') {
            map.set(col.key, { isRange: false, subType: col.dateSubType ?? 'date' });
        } else if (col.type === 'dateRange') {
            const subType = col.rangeSubType ?? 'date';
            /* key2 지정 시 시작=col.key/종료=col.key2 키 그대로 등록(SubListRenderer의 rangeStartKey/rangeEndKey와
               동일 규칙), 미지정 시 기존처럼 `${col.key}_from`/`_to` 키로 등록 — entity 컬럼이 dispFrom/dispTo처럼
               완전히 독립된 이름일 때 `${col.key}_from` 같은 존재하지 않는 필드명을 만들지 않기 위함
               (실사례: SubList 컬럼 key='dispFrom'일 때 자동유도된 'dispFrom_from'이 camelCase 변환되어
               'dispFromFrom'이라는 존재하지 않는 entity 필드명이 되어 400 오류가 났던 문제) */
            if (col.key2) {
                map.set(col.key, { isRange: true, subType });
                map.set(col.key2, { isRange: true, subType });
            } else {
                map.set(`${col.key}_from`, { isRange: true, subType });
                map.set(`${col.key}_to`, { isRange: true, subType });
            }
        }
    });
    return map;
}

/**
 * 브라우저(=서버 접속 사용자) 로컬 시간대 오프셋을 '+09:00' 형태 문자열로 변환
 * - Date.getTimezoneOffset()은 "UTC보다 몇 분 느린가"를 반환(한국은 -540) → 부호를 반전해야 실제 오프셋(+540)이 된다
 * - d를 인자로 받는 이유: 변환하려는 날짜 시점 기준으로 오프셋을 계산해야 하기 때문(서머타임이 있는 지역 대비 — 프로젝트는 한국 고정이라 결과는 항상 +09:00)
 */
function getLocalIsoOffset(d: Date = new Date()): string {
    const offsetMinutes = -d.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const abs = Math.abs(offsetMinutes);
    const hh = String(Math.floor(abs / 60)).padStart(2, '0');
    const mm = String(abs % 60).padStart(2, '0');
    return `${sign}${hh}:${mm}`;
}

/**
 * 쓰기 전용 — FE date input이 만든 "로컬 벽시계" 문자열 → entity가 파싱 가능한 문자열
 *
 * - subType='date'    : 'YYYY-MM-DD' 그대로 (LocalDate는 오프셋을 붙이면 파싱 오류가 나므로 절대 붙이지 않는다)
 * - subType='yearMonth': 'YYYY-MM' → 'YYYY-MM-01'로 보정(day 없으면 LocalDate가 파싱 못 함)
 * - subType='datetime': 'YYYY-MM-DDTHH:mm'(초 없으면 ':00' 보정) + getLocalIsoOffset() → OffsetDateTime이 요구하는 오프셋 포함 ISO 문자열
 * - subType='time'|'timeSec': 대응하는 entity 컬럼 타입이 없어 변환 없이 그대로 통과
 * - 빈 문자열/undefined: null (nullable 컬럼에 빈 문자열을 보내면 entity가 파싱 오류를 낸다)
 *
 * @example toEntityDateString('2026-07-12', 'date')          // '2026-07-12'
 * @example toEntityDateString('2026-07', 'yearMonth')        // '2026-07-01'
 * @example toEntityDateString('2026-07-12T14:30', 'datetime') // '2026-07-12T14:30:00+09:00'
 * @example toEntityDateString('', 'date')                    // null
 */
export function toEntityDateString(local: string, subType: DateSubType): string | null {
    if (!local) return null;

    if (subType === 'yearMonth') return `${local}-01`;
    if (subType === 'date') return local;

    if (subType === 'datetime') {
        /* datetime-local input은 초 단위 step을 켜지 않는 한 'YYYY-MM-DDTHH:mm'까지만 준다 — 초 보정 */
        const withSeconds = local.length === 16 ? `${local}:00` : local;
        /* 오프셋은 변환 대상 날짜 자체를 기준으로 계산(서머타임 지역 대비 방어적 처리) */
        const m = withSeconds.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/);
        const refDate = m
            ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]), Number(m[6]))
            : new Date();
        return `${withSeconds}${getLocalIsoOffset(refDate)}`;
    }

    /* time/timeSec — 대응 entity 컬럼 타입이 없으므로 값 변환 없이 그대로 통과 */
    return local;
}

/**
 * 읽기 전용 — entity 응답 문자열(OffsetDateTime의 오프셋 포함 ISO, 또는 LocalDate의 날짜 전용 문자열)
 * → FE date input이 기대하는 "로컬 벽시계" 문자열로 변환
 *
 * ⚠️ 문자열을 앞에서부터 slice로 잘라내면 안 된다 — 서버가 UTC('Z')로 내려줄 경우 최대 9시간(한국 기준) 오차가 난다.
 * 반드시 new Date(iso)로 파싱해 정확한 시각(instant)을 얻은 뒤, 로컬 getter(getFullYear 등)로 문자열을 재조립한다.
 *
 * @example fromEntityDateString('2026-07-12', 'date')                    // '2026-07-12'
 * @example fromEntityDateString('2026-07-12T05:30:00Z', 'datetime')      // '2026-07-12T14:30' (UTC 05:30 → KST 14:30)
 * @example fromEntityDateString('', 'date')                              // ''
 */
export function fromEntityDateString(iso: string, subType: DateSubType): string {
    if (!iso) return '';
    if (subType === 'time' || subType === 'timeSec') return iso; // 대응 entity 컬럼 타입이 없어 그대로 통과

    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return ''; // 파싱 실패 시 빈 값(잘못된 값을 input에 억지로 채우지 않는다)

    const yyyy = String(d.getFullYear()).padStart(4, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    if (subType === 'yearMonth') return `${yyyy}-${mm}`;
    if (subType === 'date') return `${yyyy}-${mm}-${dd}`;

    /* datetime */
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

/**
 * 읽기 전용 — normalizeEntityRow가 만든 row(케이싱 별칭 포함)를 받아
 * dateFieldMeta에 등록된 날짜 필드들을 FE date input이 기대하는 로컬 문자열로 변환해 되돌려준다
 *
 * dateFieldMeta의 key는 buildEntityDateFieldMeta가 이미 결정해둔 최종 결과 키다
 * (단일 date/yearMonth는 fieldKey 그대로, dateRange/yearMonthRange는 `${fieldKey}_from`/`_to`).
 * 이 함수는 range 여부를 별도로 분기하지 않고, 그 key로 row에서 실값을 찾아 그대로 같은 key에
 * 채워 넣기만 하면 된다 — entity DB 컬럼이 `_from`/`_to` 각각 독립 컬럼이 되어 두 값 모두
 * 실제로 응답에 존재하기 때문이다(과거처럼 `_to`를 빈 문자열로 고정하지 않는다).
 *
 * ⚠️ restoreFormDataFromJson(useWidgetPageState.ts)은 손대지 않는다 — 이 함수가 restoreFormDataFromJson 호출 "이전" 단계에서
 * row를 미리 변환해두면, restoreFormDataFromJson 입장에서는 이미 올바른 _from/_to/단일 키가 준비된 것처럼 보인다.
 *
 * @example
 * restoreEntityDateFields(
 *   { postDateFrom: '2026-01-01T00:00:00+09:00', postDateTo: '2026-01-31T00:00:00+09:00' },
 *   new Map([['post_date_from', { isRange: true, subType: 'date' }], ['post_date_to', { isRange: true, subType: 'date' }]]),
 * )
 * // → { postDateFrom: '...', postDateTo: '...', post_date_from: '2026-01-01', post_date_to: '2026-01-31' }
 */
export function restoreEntityDateFields(
    row: Record<string, unknown>,
    dateFieldMeta: Map<string, EntityDateFieldMeta>,
): Record<string, unknown> {
    const result: Record<string, unknown> = { ...row };

    dateFieldMeta.forEach((meta, fieldKey) => {
        /* normalizeEntityRow가 이미 얹어둔 camelCase/snake_case 별칭 중 값이 있는 것을 찾는다 */
        const rawValue = getCasingAliases(fieldKey)
            .map((alias) => row[alias])
            .find((v): v is string => typeof v === 'string' && v !== '');

        result[fieldKey] = rawValue ? fromEntityDateString(rawValue, meta.subType) : '';
    });

    return result;
}

/* ══════════════════════════════════════════════════════════════════ */
/*  여기서부터는 "쓰기(CREATE/UPDATE)" 전용 함수다.                       */
/*                                                                      */
/*  ⚠️ 읽기(normalizeEntityRow)와 쓰기(아래 함수들)는 반대 방향이라 */
/*  절대 같은 방식을 재사용하면 안 된다.                                  */
/*  - 읽기: 응답 한 필드에 camelCase/snake_case 별칭을 여러 개 "얹어서"     */
/*          accessor 케이싱이 뭐든 값을 찾게 해준다 (getCasingAliases).    */
/*  - 쓰기: entity Request DTO는 필드명이 고정된 강타입 record라서          */
/*          정확히 하나의 결정된 키만 보내야 한다. 여러 키를 동시에 보내면   */
/*          Jackson이 알 수 없는 필드로 요청을 거부하거나 예측할 수 없는     */
/*          결과가 나므로, 쓰기에는 getCasingAliases를 쓰면 안 된다.        */
/* ══════════════════════════════════════════════════════════════════ */

/**
 * 쓰기 전용 — fieldKey → entity 요청 DTO가 기대하는 "정확히 하나의" 필드명
 *
 * SlugEntityCodeGenerator가 DTO/Entity 필드명을 항상 toCamelCase(field.key())로
 * 만들기 때문에(entityBuild.ts의 toCamelCase와 동일 규칙), 쓰기 방향도 같은 규칙을
 * 그대로 재사용해야 codegen이 만든 DTO 필드명과 정확히 일치한다.
 *
 * @example toEntityFieldName('title_text') // 'titleText'
 * @example toEntityFieldName('image')      // 'image' (이미 camelCase면 변화 없음)
 */
export function toEntityFieldName(fieldKey: string): string {
    return toCamelCase(fieldKey);
}

/**
 * Form section(dataJson에 감싸지기 전, buildDataJson이 만드는 fieldKey→값 flat map)을
 * entity 요청 DTO 바디(flat, 강타입)로 변환한다.
 *
 * 처리 규칙 3가지 — 각각 buildDataJson(utils.ts) 코드를 근거로 결정했다:
 *
 * 1) dateRange / yearMonthRange (`fieldKey_from` + `fieldKey_to`)
 *    entity DB 컬럼이 이제 `_from`/`_to` 각각 독립 컬럼(둘 다 NOT NULL)으로 존재하므로,
 *    더 이상 대표값 하나로 병합하지 않는다. `post_date_from`/`post_date_to` 키를 각각
 *    독립된 entity 필드로 취급해 그대로 변환·전송한다(아래 4번 규칙과 동일한 경로).
 *
 * 2) hideCondition으로 숨겨진 required(NOT NULL) 필드
 *    buildDataJson(utils.ts:1096)이 hideCondition 충족 필드를 이미 section에서 제외하므로
 *    이 함수에는 애초에 해당 키가 들어오지 않는다 — 이 함수 레벨에서 별도 처리가 필요 없다.
 *    entity 필드가 NOT NULL인데 hideCondition으로 항상 빠지는 경우는 "필드 설정 자체"의
 *    문제(운영자가 hideCondition과 NOT NULL을 동시에 건 설정 실수)이지, FE가 기본값을
 *    임의로 채워 넣어 조용히 통과시킬 문제가 아니다. 이 경우 저장 시 entity 서버가
 *    @Valid 검증 오류를 반환하고, 그 메시지는 기존 getApiErrorMessage로 그대로 노출된다
 *    (image_file_id/image 케이스와 동일하게 "결함을 별칭으로 덮지 않는다" 원칙 유지).
 *
 * 3) contentKey 하위 섹션 / `_rel`(mainConnectedSlug 관련)
 *    entity flat DTO는 최상위 스칼라 필드만 가진다 — 중첩 객체 값(plain object)은
 *    이런 page_data 전용 개념이므로 결과 바디에서 제외한다. 배열(FILE 필드의 number[])은
 *    스칼라 취급으로 그대로 통과시킨다 — FILE 필드 변환은 이번 라운드 범위 밖이다.
 *
 * 4) 날짜/일시 필드(dateFieldMeta) — buildEntityDateFieldMeta로 만든 맵을 전달하면,
 *    해당 key(단일 필드는 fieldKey, range 필드는 `${fieldKey}_from`/`_to`)의 값을
 *    toEntityDateString으로 변환해서 담는다. dateFieldMeta를 넘기지 않거나 그 필드가
 *    맵에 없으면 기존처럼 원시값을 그대로 넣는다(하위호환 유지).
 *
 * @example
 * buildEntityRequestBody(
 *   { titleText: '제목', post_date_from: '2026-01-01', post_date_to: '2026-01-31' },
 *   new Map([['post_date_from', { isRange: true, subType: 'date' }], ['post_date_to', { isRange: true, subType: 'date' }]]),
 * )
 * // → { titleText: '제목', postDateFrom: '2026-01-01', postDateTo: '2026-01-31' }
 */
export function buildEntityRequestBody(
    section: Record<string, unknown>,
    dateFieldMeta?: Map<string, EntityDateFieldMeta>,
): Record<string, unknown> {
    const body: Record<string, unknown> = {};

    /** section 값이 문자열이 아니면(숫자 등 실수 유입 방어) 문자열로 변환 — toEntityDateString은 문자열만 받는다 */
    const toStr = (v: unknown): string => (typeof v === 'string' ? v : v == null ? '' : String(v));

    Object.entries(section).forEach(([key, value]) => {
        /* contentKey 하위 섹션 / _rel 같은 중첩 객체(plain object)는 entity flat DTO에 대응 필드가
         * 없으므로 제외한다. 배열은 스칼라 값 취급으로 통과시킨다(FILE 필드 number[] 포함 — 미처리). */
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) return;

        /* dateRange/yearMonthRange는 병합하지 않고 _from/_to 각각 독립 entity 필드로 변환해서 보낸다.
         * 날짜/일시 필드는 entity가 요구하는 오프셋/day 보정 문자열로 변환(빈 값은 null) */
        const meta = dateFieldMeta?.get(key);
        body[toEntityFieldName(key)] = meta ? toEntityDateString(toStr(value), meta.subType) : value;
    });

    return body;
}

/**
 * entity 단건 경로: `/{slug}/{id}` — 단건 GET(PUT 대상 확인)/PUT/DELETE 공통 사용
 * entityApiPath와 동일하게 baseURL('/api/v1')이 이미 axios 인스턴스에 설정되어 있으므로
 * 여기서도 '/api/v1'을 절대 포함하지 않는다.
 *
 * @example entityItemPath('hero-data', 3) // '/hero-data/3'
 */
export function entityItemPath(slug: string, id: number | string): string {
    return `${entityApiPath(slug)}/${id}`;
}
