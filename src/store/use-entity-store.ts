/**
 * JPA 엔티티 조회 스토어
 * - 엔티티 목록 / 선택 엔티티 / 필드 정보 상태 관리
 * - API: GET /api/v1/database/entities
 *        GET /api/v1/database/entities/{entityName}/fields
 *
 * 사용법:
 *   const { entities, selectedEntity, selectEntity, fetchEntities } = useEntityStore();
 */

import { create } from 'zustand';
import api from '@/lib/api';

/* ── 필드 정보 타입 (BE FieldInfoResponse 와 1:1 대응) ── */
export interface FieldInfo {
    fieldName: string;
    columnName: string;
    javaType: string;
    isId: boolean;
    isNullable: boolean;
}

/* ── 엔티티 정보 타입 (BE EntityInfoResponse 와 1:1 대응) ── */
export interface EntityInfo {
    entityName: string;
    tableName: string;
    fieldCount: number;
    fields: FieldInfo[];   /* 선택 후 fetchFields 호출 시 채워짐 */
}

/* ── 스토어 인터페이스 ── */
interface EntityStore {
    entities: EntityInfo[];
    selectedEntity: EntityInfo | null;
    isLoading: boolean;
    isFieldsLoading: boolean;

    /** 엔티티 선택: 선택 시 필드 정보 자동 로드 */
    selectEntity: (entity: EntityInfo | null) => void;
    /** 엔티티 목록 API 호출 */
    fetchEntities: () => Promise<void>;
    /** 필드 정보 API 호출 (selectEntity 내부에서 자동 호출) */
    fetchFields: (entityName: string) => Promise<void>;
}

export const useEntityStore = create<EntityStore>((set, get) => ({
    entities: [],
    selectedEntity: null,
    isLoading: false,
    isFieldsLoading: false,

    /* 엔티티 선택 → 필드 정보 자동 로드 */
    selectEntity: (entity) => {
        if (!entity) {
            set({ selectedEntity: null });
            return;
        }
        /* 이미 필드 정보가 있으면 API 재호출 생략 */
        if (entity.fields.length > 0) {
            set({ selectedEntity: entity });
            return;
        }
        set({ selectedEntity: entity });
        get().fetchFields(entity.entityName);
    },

    /* 엔티티 목록 조회 */
    fetchEntities: async () => {
        set({ isLoading: true });
        try {
            const res = await api.get<EntityInfo[]>('/database/entities');
            /* fields는 선택 시 로드하므로 빈 배열로 초기화 */
            const entities = res.data.map(e => ({ ...e, fields: [] }));
            set({ entities });
        } finally {
            set({ isLoading: false });
        }
    },

    /* 특정 엔티티의 필드 정보 조회 */
    fetchFields: async (entityName: string) => {
        set({ isFieldsLoading: true });
        try {
            const res = await api.get<FieldInfo[]>(`/database/entities/${entityName}/fields`);
            /* 선택된 엔티티와 목록 양쪽 모두 fields 업데이트 */
            set(state => ({
                entities: state.entities.map(e =>
                    e.entityName === entityName ? { ...e, fields: res.data } : e
                ),
                selectedEntity: state.selectedEntity?.entityName === entityName
                    ? { ...state.selectedEntity, fields: res.data }
                    : state.selectedEntity,
            }));
        } finally {
            set({ isFieldsLoading: false });
        }
    },
}));
