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
    let _id = 0;
    return () => `${prefix}${++_id}`;
};

/**
 * Validation 오류를 toast로 표시 (alert 대신 공통 사용 — list/layer 동일 방식 강제)
 * @example showValidationError(['[필수] 사용자명', '[최소 2자] 이메일'])
 */
export const showValidationError = (errors: string[]): void => {
    toast.error(`입력 오류 (${errors.length}건): ${errors.join(', ')}`);
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
