/**
 * 페이지 메이커 공통 유틸 함수
 * - list/page.tsx, layer/page.tsx에서 공유
 */
import { toast } from 'sonner';
import api from '@/lib/api';

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
        const val       = (values[f.id] || '').trim();
        const fileCount = (existingFileMeta[f.id]?.length || 0) + (fileValues[f.id]?.length || 0);

        if (f.required) {
            const empty = (f.type === 'file' || f.type === 'image' || f.type === 'media') ? fileCount === 0 : !val;
            if (empty) { toast.warning(`'${label}' 항목은 필수 입력입니다.`); return false; }
        }
        if (val && f.type !== 'file' && f.type !== 'image' && f.type !== 'video' && f.type !== 'media') {
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
        if ((f.type === 'file' || f.type === 'image' || f.type === 'media') && f.maxFileCount && fileCount > f.maxFileCount) {
            toast.warning(`'${label}' 항목은 최대 ${f.maxFileCount}개까지 첨부 가능합니다.`); return false;
        }
        if ((f.type === 'file' || f.type === 'image' || f.type === 'media') && f.maxFileSizeMB) {
            const over = (fileValues[f.id] || []).find(file => file.size > f.maxFileSizeMB! * 1024 * 1024);
            if (over) { toast.warning(`'${label}' 파일은 개당 최대 ${f.maxFileSizeMB}MB까지 허용됩니다.`); return false; }
        }
        if ((f.type === 'file' || f.type === 'image' || f.type === 'media') && f.maxTotalSizeMB) {
            const total = (fileValues[f.id] || []).reduce((s, file) => s + file.size, 0);
            if (total > f.maxTotalSizeMB * 1024 * 1024) {
                toast.warning(`'${label}' 전체 파일 용량이 ${f.maxTotalSizeMB}MB를 초과합니다.`); return false;
            }
        }
        /* dateRange / yearMonthRange: 종료가 시작보다 이전이면 오류 */
        if (f.type === 'dateRange' || f.type === 'yearMonthRange') {
            const [from, to] = (values[f.id] || '~').split('~');
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
    const { id: _omit, ...restDataJson } = item.dataJson ?? {};

    /* 최상위 object 값(contentKey 섹션) 감지 */
    const sectionEntries = Object.entries(restDataJson).filter(
        ([, v]) => v !== null && typeof v === 'object' && !Array.isArray(v)
    );

    /* 중복 없는 fieldKey만 root에 flat 병합 */
    const flatExtra: Record<string, unknown> = {};
    if (sectionEntries.length > 0) {
        const keyCount: Record<string, number> = {};
        sectionEntries.forEach(([, section]) =>
            Object.keys(section as Record<string, unknown>).forEach(k => {
                keyCount[k] = (keyCount[k] ?? 0) + 1;
            })
        );
        sectionEntries.forEach(([, section]) =>
            Object.entries(section as Record<string, unknown>).forEach(([k, v]) => {
                if (keyCount[k] === 1) flatExtra[k] = v;
            })
        );
    }

    return {
        _id: item.id,
        _groupId: item.groupId ?? null,
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
 * Form/SubList/MultiSelect 위젯 목록으로 page_data.dataJson 구성
 * - page 모드(widgetSub/[slug]/page.tsx)와 popup 모드(WidgetRenderer.tsx) 공통 사용
 * - contentKey 있으면 해당 키로 중첩 저장, 없으면 root에 flat 저장
 *
 * @param widgets           저장 대상 위젯 목록 (type/widgetId/fields/contentKey)
 * @param formValuesMap     widgetId → { fieldId: 값 } 폼 필드 값 맵
 * @param formFileIdsMap    widgetId → { fieldId: number[] } 파일 ID 맵 (기존+신규 합산 완료)
 * @param subListRowsMap    widgetId → 행 배열 (_rowId 제거, 파일 컬럼 ID 배열 완성 상태)
 * @param multiSelectMap    widgetId → number[] 선택된 ID 배열
 * @returns { dataJson, pkKeys }
 *
 * @example
 * const { dataJson, pkKeys } = buildDataJson(widgets, formValuesMap, formFileIdsMap, subListRowsMap, multiSelectMap);
 */
export function buildDataJson(
    widgets: Array<{
        type: string;
        widgetId?: string;
        fields?: import('./components/builder/FormBuilder').FormFieldItem[];
        contentKey?: string;
    }>,
    formValuesMap: Record<string, Record<string, string>>,
    formFileIdsMap: Record<string, Record<string, number[]>>,
    subListRowsMap: Record<string, Record<string, unknown>[]>,
    multiSelectMap: Record<string, number[]>,
): { dataJson: Record<string, unknown>; pkKeys: string[] } {
    const dataJson: Record<string, unknown> = {};
    const pkKeys: string[] = [];

    for (const w of widgets) {
        if (w.type === 'form') {
            const rawValues = formValuesMap[w.widgetId ?? ''] ?? {};
            const fileIds   = formFileIdsMap[w.widgetId ?? ''] ?? {};
            const section: Record<string, unknown> = {};
            (w.fields ?? []).forEach(f => {
                const key = f.fieldKey || f.label;
                if (!key) return;
                if (f.type === 'file' || f.type === 'image' || f.type === 'media') {
                    section[key] = fileIds[f.id] ?? [];
                } else {
                    section[key] = rawValues[f.id] ?? '';
                }
                if (f.isPk) pkKeys.push(key);
            });
            if (w.contentKey) dataJson[w.contentKey] = section;
            else Object.assign(dataJson, section);

        } else if (w.type === 'multiselect') {
            if (w.contentKey) {
                dataJson[w.contentKey] = multiSelectMap[w.widgetId ?? ''] ?? [];
            }

        } else if (w.type === 'sublist') {
            const rows = subListRowsMap[w.widgetId ?? ''] ?? [];
            if (w.contentKey) dataJson[w.contentKey] = { rows };
            else dataJson.rows = rows;
        }
    }

    return { dataJson, pkKeys };
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
