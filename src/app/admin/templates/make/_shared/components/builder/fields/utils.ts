/**
 * 빌더 필드 공통 유틸 함수
 *
 * 사용법:
 *   import { buildFetchKey } from './utils';
 *   buildFetchKey(2) // → "_fetchedRel2"
 */

/** relationId → FETCH 결과 키 변환: 2 → "_fetchedRel2" */
export function buildFetchKey(relationId: number): string {
    return `_fetchedRel${relationId}`;
}
