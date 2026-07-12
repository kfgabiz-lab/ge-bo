/**
 * useEntityFields — 특정 Slug Entity(entityId)의 필드 목록 조회 공통 훅
 *
 * widget/page.tsx의 위젯 최상위 slugEntityFields 조회 로직(GET /slug-entity/{entityId})을
 * 그대로 추출한 것으로, 컨텐츠컴포넌트(Form/SubList/MultiSelect)별로
 * 자신의 "연결 Entity"(connectedSlug) 기준 필드 목록을 각각 조회할 때 재사용한다.
 *
 * 사용법:
 *   const contentEntityFields = useEntityFields(entityId);
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { SlugEntityFieldItem } from '@/components/slug-entity/EntityList';

export function useEntityFields(entityId: number | undefined): SlugEntityFieldItem[] {
    const [fields, setFields] = useState<SlugEntityFieldItem[]>([]);

    useEffect(() => {
        /* cancelled — 언마운트되거나 entityId가 바뀌어 effect가 재실행된 후에는
           이전 요청의 결과로 state를 갱신하지 않기 위한 취소 플래그 (react-hooks/set-state-in-effect 규칙 준수) */
        let cancelled = false;

        (async () => {
            /* entityId가 없으면 조회하지 않고 빈 배열로 초기화 */
            if (!entityId) {
                if (!cancelled) setFields([]);
                return;
            }
            try {
                const res = await api.get(`/slug-entity/${entityId}`);
                if (!cancelled) setFields(res.data.fields ?? []);
            } catch {
                if (!cancelled) setFields([]);
            }
        })();

        return () => { cancelled = true; };
    }, [entityId]);

    return fields;
}
