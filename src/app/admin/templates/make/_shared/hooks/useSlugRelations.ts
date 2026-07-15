/**
 * useSlugRelations — slug-relation 목록 공통 훅
 *
 * SearchBuilder·TableBuilder·FormBuilder 등에서 중복 사용하던
 * /slug-relations API fetch 로직을 단일 훅으로 추출.
 *
 * 사용법:
 *   const slugRelations = useSlugRelations();
 *   // 필요할 때만 조회 (예: 렌더러에서 특정 조건일 때만 API 호출)
 *   const slugRelations = useSlugRelations(enabled);
 */

import { useState, useEffect } from "react";
import api from "@/lib/api";
import type { SlugRelationOption } from "../components/SearchBuilder";

export function useSlugRelations(enabled: boolean = true): SlugRelationOption[] {
  const [relations, setRelations] = useState<SlugRelationOption[]>([]);

  useEffect(() => {
    if (!enabled) return;
    api
      .get("/slug-relations", { params: { size: 200 } })
      .then((res) => setRelations(res.data?.content || []))
      .catch(() => {});
  }, [enabled]);

  return relations;
}
