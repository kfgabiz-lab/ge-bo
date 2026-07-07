/**
 * 페이지 메이커 공통 유틸 함수
 * - list/page.tsx, layer/page.tsx에서 공유
 */
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { FILE_FIELD_TYPES } from './constants';
import type { DateSubType, CodeGroupDef } from './types';

/**
 * 현재 시각을 date/dateRange 서브타입에 맞는 문자열로 변환
 * - date·dateRange 필드의 min 제약(오늘 이전 날짜 비활성화), dateRangeStatus 컬럼의 상태 판정(오늘과 비교) 등
 *   "지금"을 필드와 동일한 포맷으로 나타내야 하는 모든 곳에서 공용으로 사용
 * - 네이티브 input(date/month/time/datetime-local)의 value는 항상 "로컬" 시간 기준이므로,
 *   반드시 로컬 시간 getter(getFullYear/getHours 등)로 조립해야 함.
 *   ⚠️ new Date().toISOString()은 UTC 기준이라 사용 금지 — 시차만큼(KST는 9시간) 어긋난 값이 나와
 *   dateRangeStatus 등에서 실제 시각과 다른 판정 결과를 만든다.
 * @example formatNowBySubType('datetime') // "2026-07-03T16:41" (input[type=datetime-local] value와 동일 포맷, 로컬 기준)
 * @example formatNowBySubType('date')     // "2026-07-03"
 */
export const formatNowBySubType = (subType: DateSubType): string => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const YYYY = now.getFullYear();
    const MM = pad(now.getMonth() + 1);
    const DD = pad(now.getDate());
    if (subType === 'yearMonth') return `${YYYY}-${MM}`;
    if (subType === 'datetime')  return `${YYYY}-${MM}-${DD}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (subType === 'time')      return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
    if (subType === 'timeSec')   return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    return `${YYYY}-${MM}-${DD}`;
};

/** 조건식 함수토큰 레지스트리 — subType은 상대 피연산자 값에서 추론되어 주입됨. 향후 now()/yesterday() 확장 */
const FUNCTION_TOKENS: Record<string, (subType: DateSubType) => string> = {
    'today()': (subType) => formatNowBySubType(subType),
};

/** 값 문자열 형태에서 dateSubType 추론 (구체적 패턴 먼저). 날짜류 아니면 null */
function inferDateSubType(val: string): DateSubType | null {
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) return 'datetime';
    if (/^\d{2}:\d{2}:\d{2}$/.test(val))            return 'timeSec';
    if (/^\d{2}:\d{2}$/.test(val))                  return 'time';
    if (/^\d{4}-\d{2}-\d{2}$/.test(val))            return 'date';
    if (/^\d{4}-\d{2}$/.test(val))                  return 'yearMonth';
    return null;
}

/**
 * "텍스트:값" 형식의 옵션 문자열 파싱
 * @example parseOpt("전체:all") // { text: "전체", value: "all" }
 */
export const parseOpt = (opt: string) => {
    const idx = opt.indexOf(':');
    if (idx === -1) return { text: opt, value: opt };
    return { text: opt.slice(0, idx), value: opt.slice(idx + 1) };
};

/**
 * 기본 옵션 목록이 필요한 필드 타입인지 확인 (select/radio/checkbox)
 * @example needsOptions("select") // true
 */
export const needsOptions = (type: string | null): boolean =>
    type === 'select' || type === 'radio' || type === 'checkbox';

/**
 * 라벨 문자열을 JS 변수명으로 변환
 * @example varName("사용자명") // "사용자명"
 * @example varName("123test") // "field_123test"
 */
export const varName = (label: string): string => {
    const cleaned = label.replace(/[^a-zA-Z0-9가-힣]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'field';
    return /^[0-9]/.test(cleaned) ? `field_${cleaned}` : cleaned;
};

/**
 * 페이지명을 URL slug로 변환 (영문/숫자/하이픈만)
 * @example toSlug("사용자 관리") // "page-{timestamp}"
 * @example toSlug("user list") // "user-list"
 */
export const toSlug = (name: string): string => {
    const result = name
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')  // 공백 → 하이픈
        .replace(/-+/g, '-')   // 연속 하이픈 정리
        .replace(/^-|-$/g, ''); // 앞뒤 하이픈 제거
    return result || `page-${Date.now()}`;
};

/**
 * prefix 기반 고유 ID 생성기 팩토리
 * @example const uid = createIdGenerator('f'); uid() // "f1", "f2"...
 */
export const createIdGenerator = (prefix: string) => {
    return () => {
        const randomStr = Math.random().toString(36).substring(2, 11);
        return `${prefix}_${randomStr}`;
    };
};

/**
 * Validation 오류를 toast로 표시 (alert 대신 공통 사용 — list/layer 동일 방식 강제)
 * @example showValidationError(['[필수] 사용자명', '[최소 2자] 이메일'])
 */
export const showValidationError = (errors: string[]): void => {
    toast.error(`입력 오류 (${errors.length}건): ${errors.join(', ')}`);
};

/**
 * 단일 조건 평가 공통 함수 — evalFieldCondition · evalRowCondition 에서 공유
 * 파싱 순서: != → <= → >= → < → > → = (2글자 연산자를 먼저 감지해 오파싱 방지)
 * 숫자 비교 (<, >, <=, >=): Number() 변환 후 비교, 어느 한쪽이 NaN이면 false 반환
 * @param lhsVal 좌변 실제 값 (row 또는 form values에서 꺼낸 값)
 * @param op     연산자 문자열 ('=', '!=', '<', '>', '<=', '>=')
 * @param rhsVal 우변 비교 값 (리터럴 문자열)
 */
function evalConditionOp(lhsVal: string, op: string, rhsVal: string): boolean {
    if (op === '!=') return lhsVal !== rhsVal;
    if (op === '=')  return lhsVal === rhsVal;

    /* 날짜/시간 형식 비교 — formatNowBySubType 출력·필드 저장값 모두 zero-padded ISO 포맷이라
       사전식(lexicographic) 문자열 비교로 날짜 순서가 정확히 맞음 (today() 지원 위해 숫자 변환보다 먼저 분기) */
    if (inferDateSubType(lhsVal) !== null && inferDateSubType(rhsVal) !== null) {
        if (op === '<')  return lhsVal <  rhsVal;
        if (op === '>')  return lhsVal >  rhsVal;
        if (op === '<=') return lhsVal <= rhsVal;
        if (op === '>=') return lhsVal >= rhsVal;
    }

    /* 숫자 비교 연산자 처리 */
    const lhsNum = Number(lhsVal);
    const rhsNum = Number(rhsVal);
    /* 어느 한쪽이 숫자로 변환 불가능하면 비교 불가 */
    if (isNaN(lhsNum) || isNaN(rhsNum)) return false;

    if (op === '<')  return lhsNum <  rhsNum;
    if (op === '>')  return lhsNum >  rhsNum;
    if (op === '<=') return lhsNum <= rhsNum;
    if (op === '>=') return lhsNum >= rhsNum;

    return false;
}

/** 연산자 파싱 순서 — 2글자 연산자를 먼저 감지해야 1글자 연산자와 충돌하지 않음 */
const CONDITION_OPS = ['!=', '<=', '>=', '<', '>', '='] as const;

/** 최상위 콤마로 조건 분리 — 따옴표 내부 콤마는 구분자로 보지 않음 */
function splitTopLevelComma(str: string): string[] {
    const out: string[] = [];
    let cur = '', inQuote = false;
    for (const ch of str) {
        if (ch === "'") { inQuote = !inQuote; cur += ch; }
        else if (ch === ',' && !inQuote) { out.push(cur.trim()); cur = ''; }
        else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
}

/** 함수토큰 아닌 피연산자의 원시값 — 함수토큰의 sibling 포맷 추론용 (함수토큰이면 '' 반환해 재귀 차단) */
function rawOperandValue(token: string, resolveField: (k: string) => string | undefined): string {
    if (token in FUNCTION_TOKENS) return '';
    if (token.startsWith("'") && token.endsWith("'")) return token.slice(1, -1);
    const fv = resolveField(token);
    return fv !== undefined ? fv : token;
}

/** 피연산자 최종값 — 함수토큰 → 리터럴 → 필드참조 → bare 리터럴 순 */
function resolveOperand(token: string, sibling: string, resolveField: (k: string) => string | undefined): string {
    if (token in FUNCTION_TOKENS) {
        const subType = inferDateSubType(rawOperandValue(sibling, resolveField)) ?? 'date';
        return FUNCTION_TOKENS[token](subType);
    }
    if (token.startsWith("'") && token.endsWith("'")) return token.slice(1, -1);
    const fv = resolveField(token);
    return fv !== undefined ? fv : token;
}

/** 단일 조건("lhs op rhs") 평가 — 대칭 리졸버 통과 후 evalConditionOp 위임 */
function evalSingleCondition(cond: string, resolveField: (k: string) => string | undefined): boolean {
    for (const op of CONDITION_OPS) {
        const idx = cond.indexOf(op);
        if (idx === -1) continue;
        const lhsToken = cond.slice(0, idx).trim();
        const rhsToken = cond.slice(idx + op.length).trim();
        return evalConditionOp(
            resolveOperand(lhsToken, rhsToken, resolveField),
            op,
            resolveOperand(rhsToken, lhsToken, resolveField),
        );
    }
    return false;
}

/**
 * 조건식(콤마 AND 다중조건) 평가 — 저수준 공용 함수
 * resolveField로 "키 → 현재값" 조회 방식을 주입받아, 호출부마다 다른 값 소스(Form 필드/행 데이터/URL 파라미터 등)에
 * 동일한 조건식 문법(=, !=, <, >, <=, >=, today() 함수토큰, 콤마 AND)을 적용할 수 있게 한다.
 * FormRenderer(폼필드→urlParams→crossTab 폴백), evalFieldCondition, evalRowCondition이 공유한다.
 * @param condition    "status=1,price>=1000" 형식의 조건 문자열
 * @param resolveField 키를 현재값 문자열로 변환하는 함수 (값이 없으면 undefined 반환 → 리터럴로 취급)
 * @example evalConditionExpr("status=1", (k) => k === 'status' ? '1' : undefined) // true
 */
export const evalConditionExpr = (
    condition: string,
    resolveField: (key: string) => string | undefined,
): boolean =>
    splitTopLevelComma(condition).every(cond => evalSingleCondition(cond, resolveField));

/**
 * hideCondition / disableCondition 평가
 * 지원 연산자: = (문자열 일치) / != (불일치) / < > <= >= (숫자 비교) / AND 복수 조건(쉼표)
 * FormRenderer.evalCondition과 동일 로직 — validateFormFields에서 HIDE 필드 건너뜀 판단에 사용
 * @param condition "status=1,price>=1000" 형식의 조건 문자열
 * @param keyToId   fieldKey → fieldId 역매핑
 * @param values    fieldId → 현재값 맵
 */
export const evalFieldCondition = (
    condition: string,
    keyToId: Record<string, string>,
    values: Record<string, string>,
): boolean =>
    evalConditionExpr(condition, (key) => {
        const fieldId = keyToId[key];
        return fieldId ? (values[fieldId] ?? '') : undefined;
    });

/**
 * Form 위젯 필드 유효성 검사 (required / minLength / maxLength / pattern / 파일 개수·용량 / 날짜 범위)
 * - hidden 타입 / hideCondition 충족 필드는 건너뜀
 * - dateRange / yearMonthRange: 종료가 시작보다 이전이면 오류
 * - 오류 발견 시 toast.warning 표시 후 false 반환
 * - 모든 항목 통과 시 true 반환
 * @param fields           Form 위젯의 fields 배열
 * @param values           fieldId → 값 맵
 * @param fileValues       fieldId → 신규 파일 배열 맵
 * @param existingFileMeta fieldId → 기존 파일 메타 배열 맵 (개수만 사용)
 * @param allValues        페이지 내 모든 Form 위젯 통합 값 — cross-form hideCondition 평가용 (선택)
 * @param allKeyToId       페이지 내 모든 fieldKey → fieldId 역매핑 — cross-form hideCondition 평가용 (선택)
 * @example if (!validateFormFields(fw.fields, vals, fVals, eMeta, allFormValues, allFieldKeyToId)) return;
 */
export const validateFormFields = (
    fields: import('./components/builder/FormBuilder').FormFieldItem[],
    values: Record<string, string>,
    fileValues: Record<string, File[]>,
    existingFileMeta: Record<string, unknown[]>,
    allValues?: Record<string, string>,
    allKeyToId?: Record<string, string>,
    t?: (key: string) => string,
): boolean => {
    /* fieldKey → fieldId 역매핑 (이 Form 내 필드) */
    const keyToId: Record<string, string> = {};
    fields.forEach(f => { if (f.fieldKey) keyToId[f.fieldKey] = f.id; });
    /* cross-form 참조 병합 — 이 Form 내부 맵이 우선 */
    const resolvedKeyToId = { ...(allKeyToId ?? {}), ...keyToId };
    const resolvedValues  = { ...(allValues  ?? {}), ...values  };

    for (const f of fields) {
        /* hidden 타입은 건너뜀 */
        if (f.type === 'hidden') continue;
        /* hideCondition 조건 충족 시 건너뜀 */
        if (f.hideCondition && evalFieldCondition(f.hideCondition, resolvedKeyToId, resolvedValues)) continue;

        const label       = (f.labelMsgKey && t ? t(f.labelMsgKey) : f.label) || f.fieldKey || f.id;
        const isRangeType = f.type === 'dateRange' || f.type === 'yearMonthRange';
        /* dateRange/yearMonthRange: _from/_to 분리 키 사용 */
        const val       = isRangeType
            ? (values[f.id + '_from'] || '').trim()
            : (values[f.id] || '').trim();
        const valTo     = isRangeType ? (values[f.id + '_to'] || '').trim() : '';
        const fileCount = (existingFileMeta[f.id]?.length || 0) + (fileValues[f.id]?.length || 0);

        if (f.required) {
            const empty = FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])
                ? fileCount === 0
                : (isRangeType ? (!val || !valTo) : !val);
            if (empty) { toast.warning(`'${label}' 항목은 필수 입력입니다.`); return false; }
        }
        if (val && !FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) {
            if (f.minLength && val.length < f.minLength) {
                toast.warning(`'${label}' 항목은 최소 ${f.minLength}자 이상 입력해야 합니다.`); return false;
            }
            if (f.maxLength && val.length > f.maxLength) {
                toast.warning(`'${label}' 항목은 최대 ${f.maxLength}자까지 입력 가능합니다.`); return false;
            }
        }
        if (val && f.pattern) {
            try {
                if (!new RegExp(f.pattern).test(val)) {
                    toast.warning(`'${label}' 형식이 올바르지 않습니다.${f.patternDesc ? ` (${f.patternDesc})` : ''}`);
                    return false;
                }
            } catch { /* 잘못된 패턴 무시 */ }
        }
        if (FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number]) && f.maxFileCount && fileCount > f.maxFileCount) {
            toast.warning(`'${label}' 항목은 최대 ${f.maxFileCount}개까지 첨부 가능합니다.`); return false;
        }
        if (FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number]) && f.maxFileSizeMB) {
            const over = (fileValues[f.id] || []).find(file => file.size > f.maxFileSizeMB! * 1024 * 1024);
            if (over) { toast.warning(`'${label}' 파일은 개당 최대 ${f.maxFileSizeMB}MB까지 허용됩니다.`); return false; }
        }
        if (FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number]) && f.maxTotalSizeMB) {
            const total = (fileValues[f.id] || []).reduce((s, file) => s + file.size, 0);
            if (total > f.maxTotalSizeMB * 1024 * 1024) {
                toast.warning(`'${label}' 전체 파일 용량이 ${f.maxTotalSizeMB}MB를 초과합니다.`); return false;
            }
        }
        /* dateRange: _from/_to 분리 키로 검증 */
        if (f.type === 'dateRange') {
            const from = values[f.id + '_from'] || '';
            const to = values[f.id + '_to'] || '';
            if (from && to && from > to) {
                toast.warning(`'${label}' 종료일이 시작일보다 이전일 수 없습니다.`);
                return false;
            }
        }
        /* yearMonthRange: _from/_to 분리 키로 검증 */
        if (f.type === 'yearMonthRange') {
            const from = values[f.id + '_from'] || '';
            const to   = values[f.id + '_to'] || '';
            if (from && to && from > to) {
                toast.warning(`'${label}' 종료일이 시작일보다 이전일 수 없습니다.`);
                return false;
            }
        }
    }
    return true;
};

/**
 * SubList 위젯 컬럼 유효성 검사 (required / minLength / maxLength / pattern / 파일 개수·용량)
 * - required 컬럼의 각 행 값을 검사 (file/image: 기존 ID + 신규 파일 합산이 0이면 오류, 그 외: 빈 문자열이면 오류)
 * - required 여부와 무관하게 값이 있으면 minLength/maxLength/pattern 검사 수행 (validateFormFields와 동일 컨벤션)
 * - file/image 타입은 maxFileCount/maxFileSizeMB/maxTotalSizeMB 검사 수행
 * - 오류 발견 시 toast.warning 표시 후 false 반환
 * @param widgets  SubList 위젯 배열 (type/widgetId/columns)
 * @param rowsMap  widgetId → 행 배열 맵
 * @param fileMap  widgetId → rowId → colId → 신규 File[] 맵
 * @example if (!validateSubListRows(subListWidgets, subListRowsMap, subListFileMap)) return;
 */
export const validateSubListRows = (
    widgets: Array<{
        type: string;
        widgetId?: string;
        required?: boolean;
        title?: string;
        columns?: import('./components/renderer/types').SubListColumn[];
    }>,
    rowsMap: Record<string, { _rowId: string; [key: string]: unknown }[]>,
    fileMap: Record<string, Record<string, Record<string, File[]>>>,
    t?: (key: string) => string,
): boolean => {
    for (const w of widgets) {
        if (w.type !== 'sublist') continue;
        const wid  = w.widgetId ?? '';
        const rows = rowsMap[wid] ?? [];
        const cols = w.columns ?? [];

        /* 위젯 레벨 required — 행이 1개도 없으면 차단 */
        if (w.required && rows.length === 0) {
            toast.warning(`'${w.title || '서브리스트'}' 항목은 최소 1개 이상 입력해야 합니다.`);
            return false;
        }
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            for (const col of cols) {
                const label = (col.labelMsgKey && t ? t(col.labelMsgKey) : col.label) || col.key;

                if (col.type === 'file' || col.type === 'image') {
                    const existingCount = Array.isArray(row[col.key]) ? (row[col.key] as number[]).length : 0;
                    const newFiles      = fileMap[wid]?.[row._rowId]?.[col.id] ?? [];
                    const newCount      = newFiles.length;

                    /* 필수 입력 검사 */
                    if (col.required && existingCount + newCount === 0) {
                        toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 필수 입력입니다.`);
                        return false;
                    }
                    /* 최대 첨부 개수 검사 (기존 + 신규 합산) */
                    if (col.maxFileCount && existingCount + newCount > col.maxFileCount) {
                        toast.warning(`'${label}' 항목은 ${i + 1}번째 행에서 최대 ${col.maxFileCount}개까지 첨부 가능합니다.`);
                        return false;
                    }
                    /* 파일 개당 최대 용량 검사 (신규 파일만) */
                    if (col.maxFileSizeMB) {
                        const over = newFiles.find(file => file.size > col.maxFileSizeMB! * 1024 * 1024);
                        if (over) {
                            toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 파일이 개당 최대 ${col.maxFileSizeMB}MB까지 허용됩니다.`);
                            return false;
                        }
                    }
                    /* 전체 파일 최대 용량 검사 (신규 파일 합산) */
                    if (col.maxTotalSizeMB) {
                        const total = newFiles.reduce((s, file) => s + file.size, 0);
                        if (total > col.maxTotalSizeMB * 1024 * 1024) {
                            toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 전체 파일 용량이 ${col.maxTotalSizeMB}MB를 초과합니다.`);
                            return false;
                        }
                    }
                } else {
                    const val = String(row[col.key] ?? '').trim();

                    /* 필수 입력 검사 */
                    if (col.required && !val) {
                        toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 필수 입력입니다.`);
                        return false;
                    }
                    /* 값이 있을 때만 길이·패턴 검사 (required 여부와 무관) */
                    if (val) {
                        if (col.minLength && val.length < col.minLength) {
                            toast.warning(`'${label}' 항목은 ${i + 1}번째 행에서 최소 ${col.minLength}자 이상 입력해야 합니다.`);
                            return false;
                        }
                        if (col.maxLength && val.length > col.maxLength) {
                            toast.warning(`'${label}' 항목은 ${i + 1}번째 행에서 최대 ${col.maxLength}자까지 입력 가능합니다.`);
                            return false;
                        }
                        if (col.pattern) {
                            try {
                                if (!new RegExp(col.pattern).test(val)) {
                                    toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 형식이 올바르지 않습니다.${col.patternDesc ? ` (${col.patternDesc})` : ''}`);
                                    return false;
                                }
                            } catch { /* 잘못된 패턴 무시 */ }
                        }
                    }
                }
            }
        }
    }
    return true;
};

/**
 * 파일 배열을 page-files/upload 엔드포인트에 업로드하고 ID 배열 반환
 * - Form 필드 / SubList 컬럼 파일 업로드에 공통 사용
 * @param files        업로드할 파일 배열
 * @param templateSlug 저장 slug
 * @param fieldKey     필드/컬럼 키
 * @returns 업로드된 page_file id 배열
 * @example const ids = await uploadFiles(files, slug, col.key);
 */
export async function uploadFiles(
    files: File[],
    templateSlug: string,
    fieldKey: string,
): Promise<number[]> {
    const ids: number[] = [];
    for (const file of files) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('templateSlug', templateSlug);
        fd.append('fieldKey', fieldKey);
        const res = await api.post('/page-files/upload', fd, {
            transformRequest: (data: FormData, headers: { delete?: (k: string) => void }) => {
                if (headers?.delete) headers.delete('Content-Type');
                return data;
            },
        });
        ids.push(res.data.id as number);
    }
    return ids;
}

/** flattenPageDataItem 내부 — 중첩 객체의 dot notation 키를 재귀적으로 target에 추가 */
function addDotNotationKeys(
    target: Record<string, unknown>,
    obj: Record<string, unknown>,
    prefix: string,
): void {
    Object.entries(obj).forEach(([k, v]) => {
        const dotKey = `${prefix}.${k}`;
        target[dotKey] = v;
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
            addDotNotationKeys(target, v as Record<string, unknown>, dotKey);
        }
    });
}

/**
 * 컬럼 data 표현식 평가 (flattenPageDataItem row를 스코프로 사용)
 *
 * 지원 패턴:
 *   - 조건식: condition?trueExpr:falseExpr (중첩 가능, 재귀 평가)
 *   - 연결식: token1+token2+... (따옴표 없는 토큰은 row 필드, 따옴표 있는 토큰은 리터럴)
 *   - 조건 연산자: = (같음), != (다름) — 문자열 비교 / < > <= >= — 숫자 비교
 *
 * @example
 * evalColumnDataExpr("code=1?title:title2", { code: '1', title: '타이틀' }) // → '타이틀'
 * evalColumnDataExpr("title+'-'+code", { title: '타이틀', code: '1' }) // → '타이틀-1'
 * evalColumnDataExpr("code=1?title+'-'+code:title2", { code: '1', title: '타이틀', ... }) // → '타이틀-1'
 */
export function evalColumnDataExpr(expr: string, row: Record<string, unknown>): string {
    const trimmed = expr.trim();

    /* 조건식 감지: condition?trueExpr:falseExpr */
    const qIdx = trimmed.indexOf('?');
    if (qIdx !== -1) {
        const condition = trimmed.substring(0, qIdx).trim();
        const rest = trimmed.substring(qIdx + 1);
        /* 중첩 ?/: 고려 — depth=0인 첫 번째 : 위치 탐색 */
        const pipeIdx = findTopLevelColonIdx(rest);
        if (pipeIdx !== -1) {
            const trueExpr = rest.substring(0, pipeIdx).trim();
            const falseExpr = rest.substring(pipeIdx + 1).trim();
            return evalColumnDataExpr(
                evalRowCondition(condition, row) ? trueExpr : falseExpr,
                row,
            );
        }
    }

    /* 연결식: token1+token2+... */
    return parseConcatTokens(trimmed, row);
}

/** 최상위(depth=0)의 : 위치 반환 — 중첩 조건식 내 : 건너뜀 */
function findTopLevelColonIdx(str: string): number {
    let depth = 0;
    for (let i = 0; i < str.length; i++) {
        if (str[i] === '?') depth++;
        if (str[i] === ':') {
            if (depth === 0) return i;
            depth--;
        }
    }
    return -1;
}

/**
 * 조건 문자열 평가 — 공용 evalConditionExpr에 위임
 * 지원 연산자: = / != / < > <= >= (날짜·숫자 비교) / today() 함수토큰 / AND 복수 조건(콤마)
 */
function evalRowCondition(condition: string, row: Record<string, unknown>): boolean {
    return evalConditionExpr(condition, (key) => (key in row) ? String(row[key] ?? '') : undefined);
}

/** + 기준으로 토큰 분리 후 row 필드값 또는 리터럴로 변환해 합산 */
function parseConcatTokens(expr: string, row: Record<string, unknown>): string {
    const tokens: string[] = [];
    let current = '';
    let inQuote = false;
    for (let i = 0; i < expr.length; i++) {
        const ch = expr[i];
        if (ch === "'") {
            inQuote = !inQuote;
            current += ch;
        } else if (ch === '+' && !inQuote) {
            tokens.push(current.trim());
            current = '';
        } else {
            current += ch;
        }
    }
    if (current.trim()) tokens.push(current.trim());

    return tokens
        .map(token => {
            if (token.startsWith("'") && token.endsWith("'")) return token.slice(1, -1);
            return String(row[token] ?? '');
        })
        .join('');
}

/**
 * API 응답 단일 item → 테이블 표시용 row 변환 (공통)
 *
 * dataJson 중첩 구조를 3단계로 처리:
 *   1단계 (flat)          contentKey 없음 → fieldKey가 root에 존재, accessor: "title"
 *   2단계 (contentKey)    contentKey 섹션 → 중복 없는 fieldKey를 root에 자동 병합
 *                         accessor: "title"(중복 없음) 또는 "form1.title"(dot notation)
 *   3단계 (tab+contentKey) 탭 섹션 하위 → accessor: "tab1.form1.title" (dot notation)
 *
 * @example
 * flattenPageDataItem({ id: 1, dataJson: { form1: { title: 'A', use: '1' } }, ... })
 * // → { _id: 1, title: 'A', use: '1', form1: { title: 'A', use: '1' }, createdAt: ... }
 */
export function flattenPageDataItem(item: {
    id: number;
    groupId?: string | null;
    dataJson: Record<string, unknown>;
    createdAt?: string | null;
    createdBy?: string | null;
    updatedAt?: string | null;
    updatedBy?: string | null;
}): Record<string, unknown> {
    /* dataJson.id를 제거하지 않고 유지 — params에서 id로 접근 가능하도록 */
    const restDataJson = item.dataJson ?? {};

    /* 최상위 object 값(contentKey 섹션) 감지 */
    const sectionEntries = Object.entries(restDataJson).filter(
        ([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v)
    );

    /* 중복 없는 fieldKey만 root에 flat 병합 + 경로 맵 생성 */
    const flatExtra: Record<string, unknown> = {};
    /* fieldKey → "sectionKey.fieldKey" 경로 맵 (정렬 파라미터 변환에 사용) */
    const _pathMap: Record<string, string> = {};
    if (sectionEntries.length > 0) {
        const keyCount: Record<string, number> = {};
        sectionEntries.forEach(([, section]) =>
            Object.keys(section as Record<string, unknown>).forEach(k => {
                keyCount[k] = (keyCount[k] ?? 0) + 1;
            })
        );
        sectionEntries.forEach(([sectionKey, section]) => {
            /* dot notation accessor 키를 재귀적으로 root에 추가 — row['form1.title'], row['tab1.form1.title'] 직접 접근 */
            addDotNotationKeys(flatExtra, section as Record<string, unknown>, sectionKey);

            Object.entries(section as Record<string, unknown>).forEach(([k, v]) => {
                if (keyCount[k] === 1) {
                    flatExtra[k] = v;
                    /* 단순 fieldKey → 실제 JSONB 경로 기록 */
                    _pathMap[k] = `${sectionKey}.${k}`;
                }
            });
        });

        /* _fetchedRel{id} 섹션 전용 — 접두사(_fetchedRel8)는 유지하고 내부 contentKey만 생략한 단축키 추가
           예: _fetchedRel8.currMgmtForm.currMgmtTitle → _fetchedRel8.currMgmtTitle
           _fetchedRel8 접두사는 "이 값이 연동 slug에서 온 것"임을 나타내는 필수 식별자라 생략 대상이 아니다.
           같은 섹션 안에 동일 필드명이 여러 경로에 있으면 모호하므로 생성하지 않는다 */
        sectionEntries
            .filter(([sectionKey]) => sectionKey.startsWith('_fetchedRel'))
            .forEach(([sectionKey]) => {
                const leafCount: Record<string, number> = {};
                const leafFullKey: Record<string, string> = {};
                Object.keys(flatExtra)
                    .filter(k => k.startsWith(`${sectionKey}.`))
                    .forEach(fullKey => {
                        const segs = fullKey.split('.');
                        const leaf = segs[segs.length - 1];
                        leafCount[leaf] = (leafCount[leaf] ?? 0) + 1;
                        leafFullKey[leaf] = fullKey;
                    });
                Object.entries(leafCount).forEach(([leaf, count]) => {
                    const shortKey = `${sectionKey}.${leaf}`;
                    if (count === 1 && !(shortKey in flatExtra)) {
                        flatExtra[shortKey] = flatExtra[leafFullKey[leaf]];
                    }
                });
            });
    }

    return {
        _id: item.id,
        _groupId: item.groupId ?? null,
        _pathMap,           /* fieldKey → sectionKey.fieldKey 경로 맵 (정렬용) */
        ...flatExtra,       /* 중복 없는 fieldKey flat (단순 accessor용) */
        ...restDataJson,    /* 원본 중첩 구조 보존 (dot notation accessor용) */
        createdAt: item.createdAt ?? null,
        createdBy: item.createdBy ?? null,
        updatedAt: item.updatedAt ?? null,
        updatedBy: item.updatedBy ?? null,
    };
}

/**
 * 연결 Slug(FETCH) 다건 매칭 시 서버가 함께 내려주는 구분자(sep) 조회
 * - TABLE/CATEGORY(EQ) relation에서 매칭이 2건 이상이면 서버가 `_fetchedRel{id}` 값 배열과 함께
 *   형제 키 `_fetchedRel{id}_sep`(관리자가 설정한 fetchSeparator, 없으면 기본값 ',')를 내려준다.
 * - relationSlugId가 없으면(=일반 필드) 기본 구분자 ','를 그대로 반환한다.
 * - FieldRenderer(input/text)·TableCellRenderer가 공통으로 사용한다.
 *
 * @example resolveFetchSeparator(rowData, 8) // rowData._fetchedRel8_sep 값이 '|'면 '|' 반환
 * @example resolveFetchSeparator(rowData, undefined) // ','
 */
export function resolveFetchSeparator(
    rowData: Record<string, unknown>,
    relationSlugId: number | undefined,
): string {
    const DEFAULT_SEP = ',';
    if (!relationSlugId) return DEFAULT_SEP;
    const sep = rowData[`_fetchedRel${relationSlugId}_sep`];
    return typeof sep === 'string' && sep !== '' ? sep : DEFAULT_SEP;
}

/**
 * ARRAY_CONTAINS 연결 Slug 다건 매칭 결과 배열 → 표시용 문자열 변환
 * 매칭된 slave 레코드마다 flattenPageDataItem으로 평탄화 후 data 표현식(evalColumnDataExpr)을 반복 평가.
 * data 표현식이 없으면 레코드의 id를 기본값으로 사용.
 * TableCellRenderer(Table Text 셀)와 FieldRenderer(Form Text 필드)가 공통으로 사용.
 *
 * @example
 * formatFetchedRelArray([{id:1,form1:{title:'A'}},{id:2,form1:{title:'B'}}], 'form1.title', 'ONE_LINE')
 * // → "A, B"
 * formatFetchedRelArray([...], 'form1.title', 'MULTI_LINE') // → "A\nB"
 */
export function formatFetchedRelArray(
    records: Record<string, unknown>[],
    dataExpr: string | undefined,
    mode: 'ONE_LINE' | 'MULTI_LINE' = 'ONE_LINE',
    separator = ',',
): string {
    if (!Array.isArray(records) || records.length === 0) return '';
    const expr = dataExpr && dataExpr.trim() ? dataExpr : 'id';
    const values = records
        .map(record => {
            const flat = flattenPageDataItem({ id: Number((record as Record<string, unknown>).id ?? 0), dataJson: record });
            return evalColumnDataExpr(expr, flat);
        })
        .filter(v => v !== '');
    if (values.length === 0) return '';
    return mode === 'MULTI_LINE' ? values.join('\n') : values.join(`${separator} `);
}

/**
 * 연결 Slug(FETCH) 다건 매칭 배열 → 표시용 문자열 변환 (공통 헬퍼)
 * - 원소가 string이면 TABLE/CATEGORY(EQ) 다건 매칭 — resolveFetchSeparator로 구한 구분자로 join
 *   (mode가 MULTI_LINE이면 개행으로 join)
 * - 원소가 record(object)이면 ARRAY_CONTAINS 다건 매칭 — 기존 formatFetchedRelArray로 위임
 * - FieldRenderer(input/text 케이스)·TableCellRenderer(default 텍스트 케이스)가 공통으로 사용
 *
 * @param fetched        다건 매칭 배열 (string[] 또는 Record<string, unknown>[])
 * @param rowData        구분자(_fetchedRel{id}_sep) 조회용 원본 row 데이터
 * @param relationSlugId 연동 slug-relation ID (구분자 조회 키) — 없으면 기본 구분자 ',' 사용
 * @param dataExpr       record 배열용 Data 표현식 (formatFetchedRelArray에 그대로 전달)
 * @param mode           'ONE_LINE' | 'MULTI_LINE' — input 케이스는 한 줄만 표시 가능하므로 항상 'ONE_LINE' 고정 호출
 *
 * @example formatFetchedRelValue(['A', 'B'], rowData, 8, undefined, 'ONE_LINE') // "A,B" (구분자 ',' 기준)
 * @example formatFetchedRelValue([{id:1,form1:{title:'A'}}], rowData, 8, 'form1.title', 'MULTI_LINE') // "A"
 */
export function formatFetchedRelValue(
    fetched: unknown[],
    rowData: Record<string, unknown>,
    relationSlugId: number | undefined,
    dataExpr: string | undefined,
    mode: 'ONE_LINE' | 'MULTI_LINE' = 'ONE_LINE',
): string {
    if (!Array.isArray(fetched) || fetched.length === 0) return '';
    if (typeof fetched[0] === 'string') {
        const sep = resolveFetchSeparator(rowData, relationSlugId);
        return mode === 'MULTI_LINE' ? (fetched as string[]).join('\n') : (fetched as string[]).join(sep);
    }
    return formatFetchedRelArray(fetched as Record<string, unknown>[], dataExpr, mode);
}

/**
 * 공통코드 상세 1건 → 화면 표시 라벨 변환
 * - nameMsgKey가 있으면 다국어 번역(t) 결과, 없으면 name(한글 고정값) 그대로 반환
 * - resolveCodeLabel(단건 변환)과 엑셀 export 코드→라벨 딕셔너리(WidgetRenderer) 양쪽에서 공통으로 사용
 */
export function codeDetailToLabel(
    detail: { name: string; nameMsgKey?: string },
    t: (key: string) => string,
): string {
    return detail.nameMsgKey ? t(detail.nameMsgKey) : detail.name;
}

/**
 * 공통코드 값(들) → 화면 표시 라벨로 변환 (쉼표 구분 다중값 + nameMsgKey 다국어 지원)
 * - TableCellRenderer(테이블 셀 텍스트)·FieldRenderer(Form 읽기전용 표시)가 공통으로 사용
 * - strVal을 쉼표로 나눠 각각 code→label 변환 후 다시 쉼표로 합친다 (값이 1개뿐이면 그 값 그대로 처리됨)
 * - 매칭되는 공통코드가 없으면 원본 코드값을 그대로 폴백 표시한다
 *
 * @param strVal        원본 값 (쉼표 구분 다중값 가능, 예: "Y,N")
 * @param codeGroupCode 연결된 공통코드 그룹 코드
 * @param displayAs     'value'면 변환 없이 원본 값 그대로 반환 (코드값 표시 모드)
 * @param codeGroups    로드된 전체 공통코드 그룹 목록
 * @param t             다국어 변환 함수 — nameMsgKey 해석용
 * @param requireActive true면 active=true인 공통코드만 매칭 (기본 false — FieldRenderer는 true로 호출해 기존 동작 유지)
 *
 * @example resolveCodeLabel('Y,N', 'YN_TYPE', undefined, codeGroups, t) // → "예,아니오"
 * @example resolveCodeLabel('Y', 'YN_TYPE', 'value', codeGroups, t)     // → "Y" (원본 그대로)
 */
export function resolveCodeLabel(
    strVal: string,
    codeGroupCode: string | undefined,
    displayAs: string | undefined,
    codeGroups: CodeGroupDef[],
    t: (key: string) => string,
    requireActive = false,
): string {
    if (!codeGroupCode || displayAs === 'value') return strVal;
    const details = codeGroups.find(g => g.groupCode === codeGroupCode)?.details ?? [];
    const names = strVal.split(',').filter(Boolean)
        .map(code => {
            const trimmed = code.trim();
            const detail = details.find(d => d.code === trimmed && (!requireActive || d.active));
            return detail ? codeDetailToLabel(detail, t) : trimmed;
        })
        .join(',');
    return names || strVal;
}

/* ── 마스킹 관련 내부 헬퍼 (applyMask 전용) ── */

/**
 * 이메일 마스킹 — '@' 앞 아이디 부분만 패턴에 따라 마스킹, 도메인은 그대로 유지
 * @example maskEmail('abcdefg@gmail.com', 'idMid') // → 'a*****g@gmail.com'
 */
function maskEmail(value: string, pattern: string | undefined): string {
    const atIdx = value.indexOf('@');
    if (atIdx === -1) return value; // '@'가 없으면 이메일 형식이 아니므로 원본 그대로 반환

    const local = value.slice(0, atIdx);
    const domain = value.slice(atIdx); // '@'부터 끝까지(도메인 포함)

    switch (pattern) {
        case 'idMid':
            /* 첫 글자 + 가운데 마스킹 + 마지막 글자 (2글자 이하면 전체 마스킹) */
            return local.length <= 2
                ? '*'.repeat(local.length) + domain
                : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1] + domain;
        case 'idFull':
            /* 아이디 전체 마스킹 */
            return '*'.repeat(local.length) + domain;
        case 'prefix3': {
            /* 앞 3글자(또는 전체 길이가 더 짧으면 전체) 마스킹 */
            const n = Math.min(3, local.length);
            return '*'.repeat(n) + local.slice(n) + domain;
        }
        case 'suffix3': {
            /* 뒤 3글자를 제외한 나머지(앞부분) 전체 마스킹, 뒤 3글자만 그대로 노출 (전체 길이가 3자 이하면 전체 마스킹) */
            const n = Math.min(3, local.length);
            return '*'.repeat(local.length - n) + local.slice(local.length - n) + domain;
        }
        default:
            return value;
    }
}

/**
 * 전화번호 마스킹 — '010-1234-5678' 형식은 구분자(-) 기준, 구분자가 없으면 뒤에서부터 자리수 기준으로 처리
 * @example maskPhone('010-1234-5678', 'mid4') // → '010-****-5678'
 */
function maskPhone(value: string, pattern: string | undefined): string {
    const parts = value.split('-');

    if (parts.length === 3) {
        /* 010-1234-5678 형식 — 구분자 기준으로 각 구간을 통째로 마스킹 */
        const [p1, p2, p3] = parts;
        switch (pattern) {
            case 'mid4':      return `${p1}-${'*'.repeat(p2.length)}-${p3}`;
            case 'suffix4':   return `${p1}-${p2}-${'*'.repeat(p3.length)}`;
            case 'midSuffix': return `${p1}-${'*'.repeat(p2.length)}-${'*'.repeat(p3.length)}`;
            default:          return value;
        }
    }

    /* 구분자가 없는 번호 — 뒤에서부터 자리수 기준으로 마스킹 (길이가 부족하면 원본 유지) */
    const len = value.length;
    switch (pattern) {
        case 'mid4':
            return len >= 8 ? value.slice(0, len - 8) + '*'.repeat(4) + value.slice(len - 4) : value;
        case 'suffix4':
            return len >= 4 ? value.slice(0, len - 4) + '*'.repeat(4) : value;
        case 'midSuffix':
            return len >= 8 ? value.slice(0, len - 8) + '*'.repeat(8) : value;
        default:
            return value;
    }
}

/**
 * 이름 마스킹 — 글자 수와 무관하게 동작하는 일반화 로직
 * @example maskName('홍길동', 'mid') // → '홍*동'
 */
function maskName(value: string, pattern: string | undefined): string {
    const len = value.length;
    if (len === 0) return value;

    switch (pattern) {
        case 'mid':
            /* 첫 글자 + 가운데 마스킹 + 마지막 글자 (2글자 이하면 첫 글자만 노출) */
            return len <= 2 ? value[0] + '*'.repeat(len - 1) : value[0] + '*'.repeat(len - 2) + value[len - 1];
        case 'initial':
            /* 첫 글자만 노출, 나머지 마스킹 */
            return value[0] + '*'.repeat(len - 1);
        case 'full':
            /* 전체 마스킹 */
            return '*'.repeat(len);
        default:
            return value;
    }
}

/**
 * 커스텀 정규식 마스킹 — 매칭부를 치환값으로 대체
 * - 정규식 파싱 실패 시 원본 값 그대로 반환 (validateFormFields의 new RegExp try/catch 컨벤션과 동일)
 */
function maskCustom(value: string, regexStr: string | undefined, replacement: string | undefined): string {
    if (!regexStr) return value; // 정규식 미입력 시 마스킹하지 않음
    try {
        const re = new RegExp(regexStr, 'g');
        return value.replace(re, replacement ?? '');
    } catch {
        /* 잘못된 정규식(오탈자 등) — 원본 그대로 반환 */
        return value;
    }
}

/**
 * 텍스트 값에 마스킹 규칙을 적용한다 (email/phone/name/custom)
 * - TableCellRenderer(테이블 셀 텍스트 live 모드)에서 사용
 * - maskType이 없으면 원본 값을 그대로 반환한다
 *
 * @param value                  원본 표시 값
 * @param maskType               마스킹 타입 — 미지정 시 마스킹 없음
 * @param maskPattern            email/phone/name 타입의 패턴 키
 * @param maskCustomRegex        maskType='custom' 전용 — 매칭할 정규식 문자열
 * @param maskCustomReplacement  maskType='custom' 전용 — 매칭부 치환 문자열
 *
 * @example applyMask('abcdefg@gmail.com', 'email', 'idMid', undefined, undefined) // → 'a*****g@gmail.com'
 * @example applyMask('010-1234-5678', 'phone', 'mid4', undefined, undefined)      // → '010-****-5678'
 */
export function applyMask(
    value: string,
    maskType: 'email' | 'phone' | 'name' | 'custom' | undefined,
    maskPattern: string | undefined,
    maskCustomRegex: string | undefined,
    maskCustomReplacement: string | undefined,
): string {
    if (!maskType) return value;
    switch (maskType) {
        case 'email':  return maskEmail(value, maskPattern);
        case 'phone':  return maskPhone(value, maskPattern);
        case 'name':   return maskName(value, maskPattern);
        case 'custom': return maskCustom(value, maskCustomRegex, maskCustomReplacement);
        default:       return value;
    }
}

/**
 * key 목록에서 중복된 key를 찾아 반환합니다.
 * @param keys 검사할 key 목록
 * @returns 중복된 key 목록 (중복 제거된 상태)
 * @example
 * findDuplicateKeys(['a', 'b', 'a', 'c', 'b']) // → ['a', 'b']
 */
export const findDuplicateKeys = (keys: string[]): string[] => {
    // 앞뒤 공백 제거 후 빈 값 제외
    const cleanKeys = keys.map(k => k.trim()).filter(k => k !== '');

    // 같은 값이 두 번 이상 나오는 key만 추출
    const duplicated = cleanKeys.filter((key, index) => cleanKeys.indexOf(key) !== index);

    // 중복 제거 후 반환 (예: ['a', 'a'] → ['a'])
    return [...new Set(duplicated)];
};

/**
 * SpaceWidget의 align 설정에 따라 외부 그리드 컬럼 위치(gridColumn) 계산
 * - left  : span N (자동 배치, 기본)
 * - center: 중앙 시작 위치 / span N
 * - right : 오른쪽 끝 시작 위치 / span N
 *
 * @param align  SpaceWidget.align 값 ('left' | 'center' | 'right')
 * @param colSpan 위젯이 차지하는 칸 수
 * @param maxCols 외부 그리드 전체 칸 수 (기본 12)
 * @example getSpaceGridColumn('center', 5, 12) // "4 / span 5"
 */
export const getSpaceGridColumn = (
    align: 'left' | 'center' | 'right' | undefined,
    colSpan: number,
    maxCols: number = 12,
): string => {
    if (!align || align === 'left') return `span ${colSpan}`;
    if (align === 'right') {
        const start = maxCols - colSpan + 1;
        return `${start} / span ${colSpan}`;
    }
    /* center */
    const start = Math.floor((maxCols - colSpan) / 2) + 1;
    return `${start} / span ${colSpan}`;
};

/**
 * 템플릿 타입/outputMode → 목록 표시용 접두어 라벨 반환
 * ActionButtonField(공간 버튼), ActionsField(테이블 액션) 등 템플릿 선택 드롭다운 공통 사용
 *
 * @param t templateType / configJson / name 을 가진 템플릿 객체
 * @returns "팝업 - name" | "상세 - name" | "페이지 - name" | "name"
 *
 * @example
 * getTemplateLabel({ templateType: 'PAGE', configJson: '{}', name: '게시판' }) // "페이지 - 게시판"
 * getTemplateLabel({ templateType: 'QUICK_DETAIL', configJson: '{"outputMode":"layerpopup"}', name: '등록' }) // "팝업 - 등록"
 */
export const getTemplateLabel = (t: {
    templateType?: string;
    configJson?: string;
    name: string;
}): string => {
    /* PAGE 타입 (Widget 빌더로 생성된 페이지) */
    if (t.templateType === 'PAGE') return `페이지 - ${t.name}`;
    /* QUICK_DETAIL: configJson의 outputMode로 팝업/상세 구분 */
    try {
        const cfg = JSON.parse(t.configJson || '{}');
        if (cfg.outputMode === 'layerpopup') return `팝업 - ${t.name}`;
        if (cfg.outputMode === 'page') return `상세 - ${t.name}`;
    } catch { /* 파싱 실패 시 이름만 표시 */ }
    return t.name;
};

/**
 * Form/SubList/MultiSelect/Table 위젯 목록으로 page_data.dataJson 구성
 * - page 모드(widgetSub/[slug]/page.tsx)와 popup 모드(WidgetRenderer.tsx) 공통 사용
 * - contentKey 있으면 해당 키로 중첩 저장, 없으면 root에 flat 저장
 *
 * @param widgets             저장 대상 위젯 목록 (type/widgetId/fields/contentKey)
 * @param formValuesMap       widgetId → { fieldId: 값 } 폼 필드 값 맵
 * @param formFileIdsMap      widgetId → { fieldId: number[] } 파일 ID 맵 (기존+신규 합산 완료)
 * @param subListRowsMap      widgetId → 행 배열 (_rowId 제거, 파일 컬럼 ID 배열 완성 상태)
 * @param multiSelectMap             widgetId → number[] 선택된 ID 배열
 * @param multiSelectExtraFieldMap   widgetId → itemId → fieldKey → value (extraFields 있을 때만)
 * @returns { dataJson, pkKeys }
 *
 * @example
 * const { dataJson, pkKeys } = buildDataJson(widgets, formValuesMap, formFileIdsMap, subListRowsMap, multiSelectMap, multiSelectExtraFieldMap);
 */
export function buildDataJson(
    widgets: Array<{
        type: string;
        widgetId?: string;
        fields?: import('./components/builder/FormBuilder').FormFieldItem[];
        contentKey?: string;
        connectedSlug?: string;
        extraFields?: import('./components/renderer/types').MultiSelectExtraField[];
    }>,
    formValuesMap: Record<string, Record<string, string>>,
    formFileIdsMap: Record<string, Record<string, number[]>>,
    subListRowsMap: Record<string, Record<string, unknown>[]>,
    multiSelectMap: Record<string, number[]>,
    multiSelectExtraFieldMap?: Record<string, Record<number, Record<string, string>>>,
    mainConnectedSlug?: string,
    /** hideCondition 평가용 전체 폼 값 — 미전달 시 위젯 자체 rawValues로 평가 */
    allFormValues?: Record<string, string>,
): { dataJson: Record<string, unknown>; pkKeys: string[] } {
    const dataJson: Record<string, unknown> = {};
    const pkKeys: string[] = [];

    /* 현재 저장 대상 위젯들의 contentKey 집합 — cross-tab generationKey 판별용
     * 첫 세그먼트가 이 집합에 없으면 다른 탭 참조(cross-tab) → 저장 단계에서 skip */
    const currentContentKeys = new Set(
        widgets.map(w => w.contentKey).filter((k): k is string => !!k)
    );
    /* generationKey의 첫 세그먼트가 현재 저장 대상 contentKey가 아니면 cross-tab으로 판별 */
    const isCrossTabKey = (generationKey: string): boolean => {
        if (!generationKey.includes('.')) return false;
        if (currentContentKeys.size === 0) return false;
        return !currentContentKeys.has(generationKey.split('.')[0]);
    };

    for (const w of widgets) {
        if (w.type === 'form') {
            const rawValues = formValuesMap[w.widgetId ?? ''] ?? {};
            const fileIds   = formFileIdsMap[w.widgetId ?? ''] ?? {};
            const section: Record<string, unknown> = {};
            /* hideCondition 평가용 fieldKey → fieldId 역매핑 */
            const keyToId: Record<string, string> = {};
            (w.fields ?? []).forEach(f => { if (f.fieldKey) keyToId[f.fieldKey] = f.id; });
            /* 전체 폼 값 우선, 없으면 위젯 자체 값으로 평가 */
            const evalValues = allFormValues ?? rawValues;
            (w.fields ?? []).forEach(f => {
                const key = f.fieldKey || f.label;
                if (!key) return;
                /* hideCondition 충족 필드는 저장에서 제외 */
                if (f.hideCondition && evalFieldCondition(f.hideCondition, keyToId, evalValues)) return;
                if (FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) {
                    section[key] = fileIds[f.id] ?? [];
                } else if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
                    /* dateRange/yearMonthRange: _from/_to 분리 키로 저장 */
                    section[key + '_from'] = rawValues[f.id + '_from'] ?? '';
                    section[key + '_to'] = rawValues[f.id + '_to'] ?? '';
                } else {
                    section[key] = rawValues[f.id] ?? '';
                }
                if (f.isPk) pkKeys.push(key);
            });
            /* mainConnectedSlug와 다른 connectedSlug → _rel에 저장 */
            if (mainConnectedSlug && w.connectedSlug && w.connectedSlug !== mainConnectedSlug) {
                if (!dataJson['_rel']) dataJson['_rel'] = {};
                (dataJson['_rel'] as Record<string, unknown>)[w.connectedSlug] = section;
            } else {
                if (w.contentKey) dataJson[w.contentKey] = section;
                else Object.assign(dataJson, section);
            }

            /* 데이터생성 — generationKey가 있는 필드의 변환값을 지정 경로에 저장
             * 1단계: "fieldKey"         → dataJson.fieldKey
             * 2단계: "ck.fieldKey"      → dataJson.ck.fieldKey
             * 3단계: "tk.ck.fieldKey"   → dataJson.tk.ck.fieldKey */
            (w.fields ?? []).forEach(f => {
                if (FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) return;
                const sourceValue = rawValues[f.id] ?? '';

                /* 단일 generationKey 처리 (기존 호환)
                 * cross-tab 참조(다른 탭 contentKey)는 UI에서 이미 반영되므로 저장 단계에서 skip */
                if (f.generationKey && !isCrossTabKey(f.generationKey)) {
                    const transformed = applyDataGeneration(sourceValue, f.dataReplacement, f.caseChange, f.appendText, f.truncateLength);
                    writeToGenerationPath(dataJson, f.generationKey, transformed);
                }

                /* 다중 dataGenerations 배열 처리 */
                (f.dataGenerations ?? []).forEach(dg => {
                    if (!dg.generationKey) return;
                    /* cross-tab 참조는 저장 단계에서 skip — UI(crossTabFormValues 경로)에서 이미 반영됨 */
                    if (isCrossTabKey(dg.generationKey)) return;
                    /* onlyIfEmpty=true이고 같은 폼 내 대상 필드가 이미 값 있으면 저장도 건너뜀 */
                    if (dg.onlyIfEmpty) {
                        const targetField = (w.fields ?? []).find(f2 => f2.fieldKey === dg.generationKey);
                        if (targetField) {
                            const currentVal = rawValues[targetField.id] ?? '';
                            if (currentVal !== '') return;
                        }
                    }
                    const transformed = applyDataGeneration(sourceValue, dg.dataReplacement, dg.caseChange, dg.appendText, dg.truncateLength, dg.stripHtml);
                    writeToGenerationPath(dataJson, dg.generationKey, transformed);
                });
            });

        } else if (w.type === 'multiselect') {
            if (w.contentKey) {
                const selectedIds = multiSelectMap[w.widgetId ?? ''] ?? [];
                const extraFields = w.extraFields ?? [];
                /* mainConnectedSlug와 다른 connectedSlug → _rel.{connectedSlug}에 저장 */
                const isRel = mainConnectedSlug && w.connectedSlug && w.connectedSlug !== mainConnectedSlug;
                if (isRel) {
                    if (!dataJson['_rel']) dataJson['_rel'] = {};
                    const rel = dataJson['_rel'] as Record<string, unknown>;
                    const extraVals = multiSelectExtraFieldMap?.[w.widgetId ?? ''] ?? {};
                    rel[w.connectedSlug!] = extraFields.length > 0
                        ? selectedIds.map(id => ({
                            id,
                            ...Object.fromEntries(extraFields.map(ef => [ef.key, extraVals[id]?.[ef.key] ?? ''])),
                        }))
                        : selectedIds.map(id => ({ id }));
                } else if (extraFields.length > 0) {
                    /* extraFields 있으면 객체 배열로 저장: [{ id, fieldKey: value, ... }] */
                    const extraVals = multiSelectExtraFieldMap?.[w.widgetId ?? ''] ?? {};
                    dataJson[w.contentKey] = selectedIds.map(id => ({
                        id,
                        ...Object.fromEntries(extraFields.map(ef => [ef.key, extraVals[id]?.[ef.key] ?? ''])),
                    }));
                } else {
                    /* extraFields 없으면 기존 number[] 방식 유지 */
                    dataJson[w.contentKey] = selectedIds;
                }
            }

        } else if (w.type === 'sublist') {
            const rows = subListRowsMap[w.widgetId ?? ''] ?? [];
            if (w.contentKey) dataJson[w.contentKey] = rows;
            else dataJson.rows = rows;
        }
    }

    return { dataJson, pkKeys };
}

/**
 * 생성KEY dot notation 경로에 값을 기록 — buildDataJson / FormRenderer 공용
 * 1단계: "fieldKey"       → dataJson.fieldKey
 * 2단계: "ck.fieldKey"    → dataJson.ck.fieldKey
 * 3단계: "tk.ck.fieldKey" → dataJson.tk.ck.fieldKey
 */
function writeToGenerationPath(dataJson: Record<string, unknown>, generationKey: string, value: string) {
    const parts = generationKey.split('.');
    if (parts.length === 1) {
        dataJson[parts[0]] = value;
    } else if (parts.length === 2) {
        const [ck, fk] = parts;
        if (!dataJson[ck] || typeof dataJson[ck] !== 'object' || Array.isArray(dataJson[ck])) dataJson[ck] = {};
        (dataJson[ck] as Record<string, unknown>)[fk] = value;
    } else if (parts.length === 3) {
        const [tk, ck, fk] = parts;
        if (!dataJson[tk] || typeof dataJson[tk] !== 'object' || Array.isArray(dataJson[tk])) dataJson[tk] = {};
        const tabSection = dataJson[tk] as Record<string, unknown>;
        if (!tabSection[ck] || typeof tabSection[ck] !== 'object' || Array.isArray(tabSection[ck])) tabSection[ck] = {};
        (tabSection[ck] as Record<string, unknown>)[fk] = value;
    }
}

/**
 * 데이터생성 자동변환 — Input/FormTextarea 필드의 generationKey 기능에 사용
 *
 * 적용 순서: 데이터변경 → 문자변경 → 텍스트추가(끝) → 글자자르기
 *
 * @param value           원본 값 (소스 필드 입력값)
 * @param dataReplacement 데이터변경: 'hyphen' 이면 공백·특수문자 → '-' 치환, 마지막 '-' 제거
 * @param caseChange      문자변경: 'upper'=대문자 / 'lower'=소문자
 * @param appendText      텍스트추가(끝): 변환 후 끝에 붙이는 고정 문자열
 * @param truncateLength  글자자르기: N자 미만으로 자름 (length >= N 이면 slice(0, N-1))
 * @returns 변환된 문자열
 *
 * @example
 * applyDataGeneration('Hello World!', 'hyphen', 'lower', '-doc', 20)
 * // → 'hello-world-doc'
 */
export function applyDataGeneration(
    value: string,
    dataReplacement?: 'none' | 'hyphen',
    caseChange?: 'none' | 'upper' | 'lower',
    appendText?: string,
    truncateLength?: number,
    stripHtml?: boolean,
): string {
    let result = value;

    /* 0단계: HTML제거 — 에디터 값의 HTML 태그 및 엔티티 제거 */
    if (stripHtml) {
        if (typeof window !== 'undefined') {
            result = new DOMParser().parseFromString(result, 'text/html').body.textContent || '';
        } else {
            result = result.replace(/<[^>]*>/g, '');
        }
    }

    /* 1단계: 데이터변경 — 공백·특수문자 → '-', 연속 '-' 정리, 마지막 '-' 제거 */
    if (dataReplacement === 'hyphen') {
        result = result
            .replace(/[\s\W]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/-$/g, '');
    }

    /* 2단계: 문자변경 */
    if (caseChange === 'upper') result = result.toUpperCase();
    else if (caseChange === 'lower') result = result.toLowerCase();

    /* 3단계: 텍스트추가(끝) */
    if (appendText) result = result + appendText;

    /* 4단계: 글자자르기 — truncateLength 미만으로 자름 */
    if (truncateLength && result.length >= truncateLength) {
        result = result.slice(0, truncateLength - 1);
    }

    return result;
}

/**
 * 유튜브/Vimeo URL → embed URL 변환
 * @example toEmbedUrl("https://youtube.com/watch?v=...") // "https://www.youtube.com/embed/..."
 */
export const toEmbedUrl = (url: string): string | null => {
    if (!url) return null;
    const ytWatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (ytWatch) return `https://www.youtube.com/embed/${ytWatch[1]}`;
    const ytShorts = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (ytShorts) return `https://www.youtube.com/embed/${ytShorts[1]}`;
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    return null;
};

/**
 * 모드 및 확장자 목록 기반 accept 문자열 생성
 * @example getAcceptString('image', []) // ".jpg,.jpeg,.png,.gif,.webp,.svg,.bmp"
 */
export const getAcceptString = (mode: string, customExts: string[] = []): string => {
    if (mode === 'doc') return '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.hwp';
    if (mode === 'image') return '.jpg,.jpeg,.png,.gif,.webp,.svg,.bmp';
    if (mode === 'video') return '.mp4,.mov,.avi,.mkv,.webm,.wmv,.flv,.m4v';
    if (mode === 'custom' && customExts.length > 0) return customExts.join(',');
    return '';
};

/**
 * dot notation accessor로 중첩 객체에서 값 읽기 — 1/2/3단계 공통
 * 1단계: "title"         → obj['title']
 * 2단계: "form1.title"   → obj['form1']['title']
 * 3단계: "tab1.form1.title" → obj['tab1']['form1']['title']
 *
 * 사용법: resolveAccessor(row, 'tab1.form1.title')
 */
export function resolveAccessor(obj: unknown, accessor: string): unknown {
    return accessor.split('.').reduce((acc: unknown, key) => {
        if (acc != null && typeof acc === 'object' && !Array.isArray(acc))
            return (acc as Record<string, unknown>)[key];
        return undefined;
    }, obj);
}

/**
 * 테이블 정렬 상태 공통 처리 — sortKeyMap/sortDirMap 업데이트 + fetch 파라미터 반환
 * - dir=null : 정렬 해제 (sortKeyMap=null, sk=undefined)
 * - dir='desc'|'asc' : 해당 컬럼 정렬 적용
 *
 * 사용법:
 *   const { sk, sd } = applySortChange(tableWidgetId, accessor, dir, setSortKeyMap, setSortDirMap);
 *   fetchTableData({ ..., sk, sd });
 */
export function applySortChange(
    tableWidgetId: string,
    accessor: string,
    dir: 'asc' | 'desc' | null,
    setSortKeyMap: Dispatch<SetStateAction<Record<string, string | null>>>,
    setSortDirMap: Dispatch<SetStateAction<Record<string, 'asc' | 'desc'>>>,
): { sk: string | undefined; sd: 'asc' | 'desc' } {
    setSortKeyMap(prev => ({ ...prev, [tableWidgetId]: dir === null ? null : accessor }));
    if (dir !== null) {
        setSortDirMap(prev => ({ ...prev, [tableWidgetId]: dir }));
    }
    return {
        sk: dir === null ? undefined : accessor,
        sd: dir ?? 'asc',
    };
}

/**
 * Form 위젯 필드 기본값 초기화 — widgetSub(신규 모드)·useWidgetPageState 공통 사용
 * - date              : defaultDateOffset(오늘 기준) 또는 defaultDate(고정일)
 * - dateRange         : defaultStart/EndDateOffset 또는 defaultStart/EndDate
 * - select/radio/checkbox : defaultOptionValue
 * - 그 외             : defaultValueMsgKey(다국어) 또는 defaultValue(고정 텍스트)
 *
 * @param formWidgets 기본값을 초기화할 Form 위젯 배열
 * @param t           다국어 번역 함수 — defaultValueMsgKey 처리용 (선택)
 * @returns widgetId → { fieldId: 초기값 } 맵
 *
 * 사용법:
 *   const initMap = initFormDefaultValues(formWidgets, t);
 *   setFormValuesMap(initMap);
 */
export function initFormDefaultValues(
    formWidgets: import('./components/builder/FormBuilder').FormWidget[],
    t?: (key: string) => string,
): Record<string, Record<string, string>> {
    /* subType에 따라 날짜 포맷 분기 (date/yearMonth/datetime/time/timeSec) */
    const calcDate = (offset: number, subType: string = 'date') => {
        /* 시간 계열은 날짜 offset 계산 불가 */
        if (subType === 'time' || subType === 'timeSec') return '';
        const d = new Date();
        d.setDate(d.getDate() - offset);
        const iso = d.toISOString();
        if (subType === 'yearMonth') return iso.slice(0, 7);
        if (subType === 'datetime') return iso.slice(0, 16);
        return iso.slice(0, 10);
    };

    const result: Record<string, Record<string, string>> = {};
    formWidgets.forEach(fw => {
        const vals: Record<string, string> = {};
        fw.fields.forEach(f => {
            if (f.type === 'date' && (f.defaultToday || f.defaultDateOffset !== undefined || f.defaultDate)) {
                let dateVal = '';
                const dateSubType = f.dateSubType ?? 'date';
                const isDateTimeBased = dateSubType === 'time' || dateSubType === 'timeSec';
                if (f.defaultToday) {
                    /* 오늘날짜 ON: dateSubType에 맞는 포맷으로 오늘 날짜/시간 반환 */
                    const iso = new Date().toISOString();
                    const d = new Date();
                    if (dateSubType === 'yearMonth') dateVal = iso.slice(0, 7);
                    else if (dateSubType === 'datetime') dateVal = iso.slice(0, 16);
                    else if (dateSubType === 'time') dateVal = d.toTimeString().slice(0, 5);
                    else if (dateSubType === 'timeSec') dateVal = d.toTimeString().slice(0, 8);
                    else dateVal = iso.slice(0, 10);
                } else if (isDateTimeBased) {
                    /* 시간 계열: offset 무의미 — defaultDate 직접 사용 */
                    dateVal = f.defaultDate ?? '';
                } else if (f.defaultDateOffset !== undefined && f.defaultDateOffset !== 0) {
                    dateVal = calcDate(f.defaultDateOffset, dateSubType);
                } else if (f.defaultDate) {
                    dateVal = f.defaultDate;
                }
                if (dateVal) vals[f.id] = dateVal;
            } else if (f.type === 'dateRange') {
                const subType = f.rangeSubType ?? 'date';
                const isRangeTimeBased = subType === 'time' || subType === 'timeSec';
                /* 오늘날짜는 시작·종료 각각 독립 토글 — formatNowBySubType 공통함수로 오늘 값 계산 */
                const start = f.defaultStartToday
                    ? formatNowBySubType(subType)
                    : isRangeTimeBased
                        ? (f.defaultStartDate ?? '')
                        : (f.defaultStartDateOffset !== undefined && f.defaultStartDateOffset !== 0)
                            ? calcDate(f.defaultStartDateOffset, subType) : (f.defaultStartDate ?? '');
                const end = f.defaultEndToday
                    ? formatNowBySubType(subType)
                    : isRangeTimeBased
                        ? (f.defaultEndDate ?? '')
                        : (f.defaultEndDateOffset !== undefined && f.defaultEndDateOffset !== 0)
                            ? calcDate(f.defaultEndDateOffset, subType) : (f.defaultEndDate ?? '');
                /* dateRange: _from/_to 분리 키로 초기값 저장 */
                if (start) vals[f.id + '_from'] = start;
                if (end) vals[f.id + '_to'] = end;
            } else if (f.defaultOptionValue && (f.type === 'select' || f.type === 'radio' || f.type === 'checkbox')) {
                vals[f.id] = f.defaultOptionValue;
            } else if (f.defaultValueMsgKey && t) {
                vals[f.id] = t(f.defaultValueMsgKey);
            } else if (f.defaultValue) {
                vals[f.id] = f.defaultValue;
            }
        });
        result[fw.widgetId] = vals;
    });
    return result;
}

/**
 * 파라미터 문자열 파싱 — 쉼표 구분 + row 동적 주입
 *
 * 규칙:
 *   - "key=value"  → 고정값
 *   - "key"        → row[key] 조회 → 없으면 skip
 *   - dot notation "content1.field2" → dot 이후 fieldKey(field2)로 row 조회 → 없으면 skip
 *
 * 사용법:
 *   parseActionParams('depth=4,name', { name: '홍길동' })
 *   // → { depth: '4', name: '홍길동' }
 *
 *   parseActionParams('content1.field1=aaa,content1.field2', { field2: '테스트' })
 *   // → { 'content1.field1': 'aaa', 'content1.field2': '테스트' }
 */
export function parseActionParams(
    paramStr: string | undefined,
    row: Record<string, unknown> = {},
): Record<string, string> {
    if (!paramStr) return {};
    const result: Record<string, string> = {};
    paramStr.split(',').map(p => p.trim()).filter(Boolean).forEach(part => {
        if (part.includes('=')) {
            /* key=value 형태 — val이 row 필드명이면 row 값으로 치환, 없으면 고정값 */
            const eqIdx      = part.indexOf('=');
            const key        = part.slice(0, eqIdx).trim();
            const val        = part.slice(eqIdx + 1).trim();
            const resolvedVal = val in row ? String(row[val] ?? '') : val;
            if (key) result[key] = resolvedVal;
        } else {
            /* 동적 주입 — dot notation이면 마지막 세그먼트로 row 조회 */
            const fieldKey = part.includes('.') ? part.slice(part.lastIndexOf('.') + 1) : part;
            if (fieldKey in row) result[part] = String(row[fieldKey] ?? '');
            /* row에 없으면 skip */
        }
    });
    return result;
}

/**
 * datasave 대상 위젯 유효성 검사 공통 함수 (Form / SubList / MultiSelect / Table)
 * handleDataSave, handlePopupDataSave 양쪽에서 공통 사용
 *
 * 사용법:
 *   if (!validateDataSaveWidgets({ targetWidgets, formValuesMap, fileValuesMap, ... })) return;
 */
export function validateDataSaveWidgets(opts: {
    targetWidgets: Array<{
        type?: string;
        widgetId?: string;
        fields?: import('./components/builder/FormBuilder').FormFieldItem[];
        contentKey?: string;
        required?: boolean;
        title?: string;
        enableRowSelection?: boolean;
        columns?: import('./components/renderer/types').SubListColumn[];
    }>;
    formValuesMap: Record<string, Record<string, string>>;
    fileValuesMap: Record<string, Record<string, File[]>>;
    existingFileMetaMap: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>;
    subListRowsMap: Record<string, { _rowId: string; [key: string]: unknown }[]>;
    subListFileMap: Record<string, Record<string, Record<string, File[]>>>;
    multiSelectValuesMap: Record<string, number[]>;
    tableSelectedRowsMap?: Record<string, number[]>;
    t?: (key: string) => string;
}): boolean {
    const { targetWidgets, formValuesMap, fileValuesMap, existingFileMetaMap, subListRowsMap, subListFileMap, multiSelectValuesMap, tableSelectedRowsMap, t } = opts;

    /* Form 유효성 검사 */
    const allFormValues = Object.assign({}, ...Object.values(formValuesMap)) as Record<string, string>;
    const allKeyToId: Record<string, string> = {};
    for (const w of targetWidgets) {
        if (w.type !== 'form') continue;
        (w.fields ?? []).forEach(f => {
            if (!f.fieldKey) return;
            allKeyToId[f.fieldKey] = f.id;
            if (w.contentKey) allKeyToId[`${w.contentKey}.${f.fieldKey}`] = f.id;
        });
    }
    for (const w of targetWidgets) {
        if (w.type !== 'form') continue;
        const wid = w.widgetId ?? '';
        if (!validateFormFields(
            w.fields ?? [],
            formValuesMap[wid] ?? {},
            fileValuesMap[wid] ?? {},
            existingFileMetaMap[wid] ?? {},
            allFormValues,
            allKeyToId,
            t,
        )) return false;
    }

    /* SubList 유효성 검사 */
    if (!validateSubListRows(
        targetWidgets.filter(w => w.type === 'sublist') as Array<{ type: string; widgetId?: string; required?: boolean; title?: string; columns?: import('./components/renderer/types').SubListColumn[] }>,
        subListRowsMap,
        subListFileMap,
        t,
    )) return false;

    /* MultiSelect 유효성 검사 */
    for (const w of targetWidgets) {
        if (w.type !== 'multiselect') continue;
        if (!w.required) continue;
        if ((multiSelectValuesMap[w.widgetId ?? ''] ?? []).length === 0) {
            toast.warning(`'${w.title || '다중선택'}' 항목은 필수 선택입니다.`);
            return false;
        }
    }

    /* Table 유효성 검사 — enableRowSelection=true 인 경우만 */
    if (tableSelectedRowsMap) {
        for (const w of targetWidgets) {
            if (w.type !== 'table') continue;
            if (!w.enableRowSelection) continue;
            if ((tableSelectedRowsMap[w.widgetId ?? ''] ?? []).length === 0) {
                toast.warning('선택된 항목이 없습니다.');
                return false;
            }
        }
    }

    return true;
}

/**
 * Form 파일 업로드 + SubList rows 처리 공통 함수
 * handleDataSave, handlePopupDataSave 양쪽에서 공통 사용
 *
 * 사용법:
 *   const { formFileIdsMap, processedSubListRowsMap, allNewIds } =
 *     await processFormFilesAndSubList({ targetWidgets, fileValuesMap, ... });
 */
export async function processFormFilesAndSubList(opts: {
    targetWidgets: Array<{
        type?: string;
        widgetId?: string;
        fields?: import('./components/builder/FormBuilder').FormFieldItem[];
        columns?: import('./components/renderer/types').SubListColumn[];
    }>;
    fileValuesMap: Record<string, Record<string, File[]>>;
    existingFileMetaMap: Record<string, Record<string, { id: number; origName: string; fileSize: number }[]>>;
    subListRowsMap: Record<string, { _rowId: string; [key: string]: unknown }[]>;
    subListFileMap: Record<string, Record<string, Record<string, File[]>>>;
    dataSaveSlug: string;
}): Promise<{
    formFileIdsMap: Record<string, Record<string, number[]>>;
    processedSubListRowsMap: Record<string, Record<string, unknown>[]>;
    allNewIds: number[];
}> {
    const { targetWidgets, fileValuesMap, existingFileMetaMap, subListRowsMap, subListFileMap, dataSaveSlug } = opts;
    const allNewIds: number[] = [];
    const newFileIdsByFieldId: Record<string, number[]> = {};

    /* 1. Form 파일 업로드 */
    for (const w of targetWidgets) {
        if (w.type !== 'form') continue;
        const fwId = w.widgetId ?? '';
        for (const f of (w.fields ?? [])) {
            if (!FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) continue;
            const newFiles = fileValuesMap[fwId]?.[f.id] ?? [];
            if (!newFiles.length) continue;
            const uploadedIds = await uploadFiles(newFiles, dataSaveSlug, f.fieldKey || f.label || '');
            allNewIds.push(...uploadedIds);
            newFileIdsByFieldId[f.id] = uploadedIds;
        }
    }

    /* 2. formFileIdsMap 구성 (기존 파일 ID + 신규 업로드 ID) */
    const formFileIdsMap: Record<string, Record<string, number[]>> = {};
    for (const w of targetWidgets) {
        if (w.type !== 'form') continue;
        const fwId = w.widgetId ?? '';
        formFileIdsMap[fwId] = {};
        for (const f of (w.fields ?? [])) {
            if (!FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number])) continue;
            const existingIds = (existingFileMetaMap[fwId]?.[f.id] ?? []).map(m => m.id);
            formFileIdsMap[fwId][f.id] = [...existingIds, ...(newFileIdsByFieldId[f.id] ?? [])];
        }
    }

    /* 3. SubList rows 처리 — 파일 컬럼 업로드 + rowData 구성 */
    const processedSubListRowsMap: Record<string, Record<string, unknown>[]> = {};
    for (const w of targetWidgets) {
        if (w.type !== 'sublist') continue;
        const wid = w.widgetId ?? '';
        const processedRows: Record<string, unknown>[] = [];
        for (const row of (subListRowsMap[wid] ?? [])) {
            const { _rowId, ...rest } = row;
            const processedRow: Record<string, unknown> = { ...rest };
            for (const col of (w.columns ?? [])) {
                if (!['file', 'image'].includes(col.type)) continue;
                const existingIds = Array.isArray(processedRow[col.key]) ? (processedRow[col.key] as number[]) : [];
                const newFiles = subListFileMap[wid]?.[_rowId]?.[col.id] ?? [];
                const uploadedIds = newFiles.length ? await uploadFiles(newFiles, dataSaveSlug, col.key) : [];
                allNewIds.push(...uploadedIds);
                processedRow[col.key] = [...existingIds, ...uploadedIds];
            }
            processedRows.push(processedRow);
        }
        processedSubListRowsMap[wid] = processedRows;
    }

    return { formFileIdsMap, processedSubListRowsMap, allNewIds };
}

/**
 * 데이터테이블 컨텐츠 행별 datasave 공통 실행
 * paramSave 있으면 parseActionParams로 row별 값 추출, 없으면 column accessor 방식
 * @returns 저장된 행 수
 *
 * 사용법:
 *   const count = await saveTableRows({
 *     contentKey: 'board-data-table',
 *     paramSave: 'board-data-table.depth=3,board-data-table.id,board-data-table.title',
 *     rows: rowsToSave,
 *     extras: {},
 *     dataSaveSlug: 'save-slug',
 *     templateSlug: slug,
 *   });
 */
export async function saveTableRows(opts: {
    contentKey?: string;
    columns?: { accessor?: string }[];
    rows: Record<string, unknown>[];
    extras: Record<string, unknown>;
    dataSaveSlug: string;
    templateSlug?: string;
    paramSave?: string;
}): Promise<number> {
    const { contentKey, columns, rows, extras, dataSaveSlug, templateSlug, paramSave } = opts;
    let savedCount = 0;
    for (const row of rows) {
        let rowData: Record<string, unknown>;

        if (paramSave) {
            /* paramSave 있으면 → parseActionParams로 per-row 값 추출 */
            /* row._id를 id로 매핑 (board-data-table.id 같은 동적 파라미터 대응) */
            const rowWithId = { ...row, id: row['_id'] } as Record<string, string>;
            const parsed = parseActionParams(paramSave, rowWithId);
            /* contentKey 접두사 제거 후 rowData 구성 */
            rowData = {};
            const prefix = contentKey ? `${contentKey}.` : '';
            for (const [key, val] of Object.entries(parsed)) {
                const fieldKey = prefix && key.startsWith(prefix) ? key.slice(prefix.length) : key;
                rowData[fieldKey] = val;
            }
            /* popupParamSaveExtras(extras)도 함께 merge — paramSave만으로는 depth=3 같은 고정값 누락 방지 */
            Object.assign(rowData, extras);
        } else {
            /* paramSave 없으면 → column accessor + extras 방식 (fallback) */
            rowData = {};
            for (const col of (columns ?? [])) {
                if (col.accessor && row[col.accessor] !== undefined) {
                    rowData[col.accessor] = row[col.accessor];
                }
            }
            Object.assign(rowData, extras);
        }

        await api.post(`/page-data/${dataSaveSlug}`, {
            dataJson: contentKey ? { [contentKey]: rowData } : rowData,
            ...(templateSlug && { templateSlug }),
        });
        savedCount++;
    }
    return savedCount;
}

/**
 * dateRange 최대 조회 기간 검증 — 검색 실행 전 호출
 * maxRangeValue 미설정 필드는 건너뜀 (기존 동작 유지)
 * yearMonth 타입(YYYY-MM)은 1일로 보정 후 비교
 *
 * @example if (!validateSearchDateRange(searchFields, searchValues)) return;
 */
export function validateSearchDateRange(
    fields: import('./types').SearchFieldConfig[],
    searchValues: Record<string, string>,
): boolean {
    for (const f of fields) {
        if ((f.type !== 'dateRange' && f.type !== 'yearMonthRange') || !f.maxRangeValue) continue;
        const from = searchValues[f.id + '_from'];
        const to   = searchValues[f.id + '_to'];
        if (!from || !to) continue;

        /* yearMonth(YYYY-MM)은 해당 월 1일로 보정 */
        const fromDate = new Date(from.length === 7 ? from + '-01' : from);
        const toDate   = new Date(to.length   === 7 ? to   + '-01' : to);
        const unit  = f.maxRangeUnit ?? 'day';
        const label = f.label || '날짜 범위';

        /* month/year: toDate 기준 N개월/년 전 날짜와 fromDate 비교 */
        if (unit === 'month' || unit === 'year') {
            const limit = new Date(toDate);
            if (unit === 'month') limit.setMonth(limit.getMonth() - f.maxRangeValue);
            else limit.setFullYear(limit.getFullYear() - f.maxRangeValue);
            if (fromDate < limit) {
                toast.warning(`'${label}' 최대 ${f.maxRangeValue}${unit === 'month' ? '개월' : '년'} 이내로 조회하세요.`);
                return false;
            }
        } else {
            /* day/week: ms 차이 비교 */
            const maxMs = f.maxRangeValue * (unit === 'week' ? 7 : 1) * 86400000;
            if (toDate.getTime() - fromDate.getTime() > maxMs) {
                toast.warning(`'${label}' 최대 ${f.maxRangeValue}${unit === 'week' ? '주' : '일'} 이내로 조회하세요.`);
                return false;
            }
        }
    }
    return true;
}
