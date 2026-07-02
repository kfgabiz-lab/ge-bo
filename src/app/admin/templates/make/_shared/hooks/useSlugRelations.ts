/**
 * useSlugRelations — slug-relation 목록 공통 훅
 *
 * SearchBuilder·TableBuilder·FormBuilder 등에서 중복 사용하던
 * /slug-relations API fetch 로직을 단일 훅으로 추출.
 *
 * 사용법:
 *   const slugRelations = useSlugRelations();
 */

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import type { SlugRelationOption } from '../components/SearchBuilder';

export function useSlugRelations(): SlugRelationOption[] {
    const [relations, setRelations] = useState<SlugRelationOption[]>([]);

    useEffect(() => {
        api.get('/slug-relations', { params: { size: 200 } })
            .then(res => setRelations(res.data?.content || []))
            .catch(() => {});
    }, []);

    return relations;
}
