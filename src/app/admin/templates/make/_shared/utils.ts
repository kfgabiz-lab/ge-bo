/**
 * 페이지 메이커 공통 유틸 함수
 * - list/page.tsx, layer/page.tsx에서 공유
 */
import { toast } from 'sonner';

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
 * Form 위젯 필드 유효성 검사 (required / minLength / maxLength / pattern / 파일 개수·용량)
 * - 오류 발견 시 toast.warning 표시 후 false 반환
 * - 모든 항목 통과 시 true 반환
 * @param fields        Form 위젯의 fields 배열
 * @param values        widgetId별 필드값 맵 (fieldId → 값)
 * @param fileValues    widgetId별 신규 파일 맵 (fieldId → File[])
 * @param existingFileMeta widgetId별 기존 파일 맵 (fieldId → any[] — 개수만 사용)
 * @example if (!validateFormFields(fw.fields, vals, fVals, eMeta)) return;
 */
export const validateFormFields = (
    fields: import('./components/builder/FormBuilder').FormFieldItem[],
    values: Record<string, string>,
    fileValues: Record<string, File[]>,
    existingFileMeta: Record<string, unknown[]>,
): boolean => {
    for (const f of fields) {
        /* hidden 필드는 유효성 검사 건너뜀 */
        if (f.type === 'hidden') continue;
        const label     = f.label || f.fieldKey || f.id;
        const val       = (values[f.id] || '').trim();
        const fileCount = (existingFileMeta[f.id]?.length || 0) + (fileValues[f.id]?.length || 0);

        if (f.required) {
            const empty = (f.type === 'file' || f.type === 'image') ? fileCount === 0 : !val;
            if (empty) { toast.warning(`'${label}' 항목은 필수 입력입니다.`); return false; }
        }
        if (val && f.type !== 'file' && f.type !== 'image' && f.type !== 'video') {
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
        if ((f.type === 'file' || f.type === 'image') && f.maxFileCount && fileCount > f.maxFileCount) {
            toast.warning(`'${label}' 항목은 최대 ${f.maxFileCount}개까지 첨부 가능합니다.`); return false;
        }
        if ((f.type === 'file' || f.type === 'image') && f.maxFileSizeMB) {
            const over = (fileValues[f.id] || []).find(file => file.size > f.maxFileSizeMB! * 1024 * 1024);
            if (over) { toast.warning(`'${label}' 파일은 개당 최대 ${f.maxFileSizeMB}MB까지 허용됩니다.`); return false; }
        }
        if ((f.type === 'file' || f.type === 'image') && f.maxTotalSizeMB) {
            const total = (fileValues[f.id] || []).reduce((s, file) => s + file.size, 0);
            if (total > f.maxTotalSizeMB * 1024 * 1024) {
                toast.warning(`'${label}' 전체 파일 용량이 ${f.maxTotalSizeMB}MB를 초과합니다.`); return false;
            }
        }
    }
    return true;
};

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
                if (f.type === 'file' || f.type === 'image') {
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
