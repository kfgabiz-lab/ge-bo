import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MenuItem } from '@/store/useMenuStore';
import { useSiteStore } from '@/store/useSiteStore';

const API_PATH = '/menus';
const ROLES_PATH = '/roles';

/**
 * 메뉴 조회
 * - BO: 사이트 무관 공통 조회
 * - FO: 사이트별 분리 조회 (activeSiteId queryKey 포함)
 */
export function useMenusQuery(type: 'BO' | 'FO') {
    const activeSiteId = useSiteStore((state) => state.activeSiteId);
    const isBO = type === 'BO';
    return useQuery({
        queryKey: isBO ? ['menus', type] : ['menus', type, activeSiteId],
        queryFn: async () => {
            const res = await api.get(`${API_PATH}?type=${type}`);
            return res.data as MenuItem[];
        },
        staleTime: 1000 * 60 * 5,
        enabled: isBO || activeSiteId !== null,
    });
}

/** 사이드바 네비게이션용 BO 메뉴 — 사이트 무관 공통 */
export function useNavMenusQuery() {
    return useQuery({
        queryKey: ['menus', 'nav'],
        queryFn: async () => {
            const res = await api.get(`${API_PATH}?type=BO&forNav=true`);
            return res.data as MenuItem[];
        },
        staleTime: 1000 * 60 * 30,
    });
}

export function useRolesQuery() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: async () => {
            const res = await api.get(ROLES_PATH);
            return res.data.map((r: any) => ({
                id: r.id,
                name: r.code,
                displayName: r.displayName,
            }));
        },
        staleTime: 1000 * 60 * 30, // 권한 역할 목록도 드물게 변하므로 30분 캐시
    });
}
