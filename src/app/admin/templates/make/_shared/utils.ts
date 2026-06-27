/**
 * 페이지 메이커 공통 유틸 함수
 * - list/page.tsx, layer/page.tsx에서 공유
 */
import type { Dispatch, SetStateAction } from 'react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { FILE_FIELD_TYPES } from './constants';

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
 * hideCondition / disableCondition 평가 — "key=val" (일치) / "key!=val" (불일치) / AND 복수 조건 지원
 * FormRenderer.evalCondition과 동일 로직 — validateFormFields에서 HIDE 필드 건너뜀 판단에 사용
 * @param condition "status=1,type=Y" 형식의 조건 문자열
 * @param keyToId   fieldKey → fieldId 역매핑
 * @param values    fieldId → 현재값 맵
 */
export const evalFieldCondition = (
    condition: string,
    keyToId: Record<string, string>,
    values: Record<string, string>,
): boolean =>
    condition.split(',').every(cond => {
        /* != 연산자 우선 감지 */
        const neqIdx = cond.indexOf('!=');
        if (neqIdx !== -1) {
            const key     = cond.slice(0, neqIdx).trim();
            const val     = cond.slice(neqIdx + 2).trim();
            const fieldId = keyToId[key];
            if (!fieldId) return false;
            return (values[fieldId] ?? '') !== val;
        }
        const eqIdx = cond.indexOf('=');
        if (eqIdx === -1) return false;
        const key     = cond.slice(0, eqIdx).trim();
        const val     = cond.slice(eqIdx + 1).trim();
        const fieldId = keyToId[key];
        if (!fieldId) return false;
        return (values[fieldId] ?? '') === val;
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

        const label     = f.label || f.fieldKey || f.id;
        /* dateRange/yearMonthRange: _from/_to 분리 키 사용 — required 체크 시 시작일 기준 */
        const val       = (f.type === 'dateRange' || f.type === 'yearMonthRange')
            ? (values[f.id + '_from'] || '').trim()
            : (values[f.id] || '').trim();
        const fileCount = (existingFileMeta[f.id]?.length || 0) + (fileValues[f.id]?.length || 0);

        if (f.required) {
            const empty = FILE_FIELD_TYPES.includes(f.type as typeof FILE_FIELD_TYPES[number]) ? fileCount === 0 : !val;
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
 * SubList 위젯 필수 컬럼 유효성 검사
 * - required 컬럼의 각 행 값을 검사
 * - file/image: 기존 ID + 신규 파일 합산이 0이면 오류
 * - 그 외: 빈 문자열이면 오류
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
                if (!col.required) continue;
                const label = col.label || col.key;
                if (col.type === 'file' || col.type === 'image') {
                    const existingCount = Array.isArray(row[col.key]) ? (row[col.key] as number[]).length : 0;
                    const newCount      = fileMap[wid]?.[row._rowId]?.[col.id]?.length ?? 0;
                    if (existingCount + newCount === 0) {
                        toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 필수 입력입니다.`);
                        return false;
                    }
                } else {
                    const val = String(row[col.key] ?? '').trim();
                    if (!val) {
                        toast.warning(`'${label}' 항목은 ${i + 1}번째 행의 필수 입력입니다.`);
                        return false;
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
 * buildTableRow({ id: 1, dataJson: { form1: { title: 'A', use: '1' } }, ... })
 * // → { _id: 1, title: 'A', use: '1', form1: { title: 'A', use: '1' }, createdAt: ... }
 */
export function buildTableRow(item: {
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
        sectionEntries.forEach(([sectionKey, section]) =>
            Object.entries(section as Record<string, unknown>).forEach(([k, v]) => {
                if (keyCount[k] === 1) {
                    flatExtra[k] = v;
                    /* 단순 fieldKey → 실제 JSONB 경로 기록 */
                    _pathMap[k] = `${sectionKey}.${k}`;
                }
            })
        );
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
    const calcDate = (offset: number) => {
        const d = new Date();
        d.setDate(d.getDate() - offset);
        return d.toISOString().slice(0, 10);
    };

    const result: Record<string, Record<string, string>> = {};
    formWidgets.forEach(fw => {
        const vals: Record<string, string> = {};
        fw.fields.forEach(f => {
            if (f.type === 'date' && (f.defaultDateOffset !== undefined || f.defaultDate)) {
                let dateVal = '';
                if (f.defaultDateOffset !== undefined && f.defaultDateOffset !== 0) {
                    dateVal = calcDate(f.defaultDateOffset);
                } else if (f.defaultDate) {
                    dateVal = f.defaultDate;
                }
                if (dateVal) vals[f.id] = dateVal;
            } else if (f.type === 'dateRange') {
                const start = (f.defaultStartDateOffset !== undefined && f.defaultStartDateOffset !== 0)
                    ? calcDate(f.defaultStartDateOffset) : (f.defaultStartDate ?? '');
                const end = (f.defaultEndDateOffset !== undefined && f.defaultEndDateOffset !== 0)
                    ? calcDate(f.defaultEndDateOffset) : (f.defaultEndDate ?? '');
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
}): boolean {
    const { targetWidgets, formValuesMap, fileValuesMap, existingFileMetaMap, subListRowsMap, subListFileMap, multiSelectValuesMap, tableSelectedRowsMap } = opts;

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
        )) return false;
    }

    /* SubList 유효성 검사 */
    if (!validateSubListRows(
        targetWidgets.filter(w => w.type === 'sublist') as Array<{ type: string; widgetId?: string; required?: boolean; title?: string; columns?: import('./components/renderer/types').SubListColumn[] }>,
        subListRowsMap,
        subListFileMap,
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
