/**
 * connFieldOptions — "연결 Slug" 필드의 옵션 목록·표시 포맷 계산 공통 헬퍼
 *
 * TableBuilder / FormBuilder / SubListBuilder / MultiSelectBuilder 4개 빌더가
 * 동일하게 사용하던 "연결 Entity" 옵션 분기 로직(entity/data/none)을 하나로 모았다.
 * OutputModePanel.tsx(218~277행)의 참조 구현과 반드시 동일한 규칙을 따른다.
 *
 * - none(미지정): slugOptions 그대로, 표시 포맷은 SlugSelectField 기본값("name (slug)") 사용
 * - entity(Slug Entity): slugOptions 중 entity가 연결된 것만 필터링, 표시 포맷 "slug (entityName)"
 * - data(Data Entity): dataEntityOptions 그대로, 표시 포맷 "slug (name)" ← entityName이 아닌 name
 *
 * 사용법:
 *   const { options, formatDisplay } = getConnFieldOptions(connMode, slugOptions, dataEntityOptions);
 *   <SlugSelectField slugOptions={options} formatDisplay={formatDisplay} ... />
 */

import type { SlugOption } from './fields';

/** "연결 Slug" 필드가 어떤 연결 모드를 따를지 구분하는 값 — 미지정이면 none으로 취급 */
export type ConnMode = 'entity' | 'data' | undefined;

/** getConnFieldOptions 반환 타입 — SlugSelectField에 그대로 전달 */
export interface ConnFieldOptions {
    options: SlugOption[];
    /** undefined면 SlugSelectField 기본 포맷("name (slug)")을 그대로 사용 */
    formatDisplay?: (opt: SlugOption) => string;
}

export function getConnFieldOptions(
    connMode: ConnMode,
    slugOptions: SlugOption[],
    dataEntityOptions: SlugOption[] = [],
): ConnFieldOptions {
    if (connMode === 'entity') {
        return {
            options: slugOptions.filter(o => o.entityId != null),
            formatDisplay: o => `${o.slug} (${o.entityName})`,
        };
    }
    if (connMode === 'data') {
        return {
            options: dataEntityOptions,
            formatDisplay: o => `${o.slug} (${o.name})`,
        };
    }
    return { options: slugOptions };
}

/**
 * resolveEntityId — 연결 Slug 값(slug)으로 실제 Slug Entity의 entityId를 찾는 공통 헬퍼
 *
 * widget/page.tsx의 selectedEntityId 계산 로직(239~241행)을 slug 파라미터화한 것으로,
 * 위젯 최상위뿐 아니라 컨텐츠컴포넌트별 "연결 Entity"(connectedSlug) 기준으로도
 * 동일하게 entityId를 구할 때 사용한다.
 *
 * - connMode === 'data'  : dataEntityOptions(SlugEntity 고유 slug 네임스페이스)에서 id를 직접 찾는다
 * - connMode === 'entity' 또는 미지정 : entity가 연결된 slug를 고르면 그 slug의 entityId를 사용한다
 */
export function resolveEntityId(
    slug: string | undefined,
    connMode: ConnMode,
    slugOptions: SlugOption[],
    dataEntityOptions: SlugOption[],
): number | undefined {
    if (!slug) return undefined;
    if (connMode === 'data') {
        return dataEntityOptions.find(e => e.slug === slug)?.id;
    }
    return slugOptions.find(s => s.slug === slug)?.entityId;
}
