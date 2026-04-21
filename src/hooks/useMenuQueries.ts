import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MenuItem } from '@/store/useMenuStore';

const API_PATH = '/menus';
const ROLES_PATH = '/roles';

export function useMenusQuery(type: 'BO' | 'FO') {
    return useQuery({
        queryKey: ['menus', type],
        queryFn: async () => {
            const res = await api.get(`${API_PATH}?type=${type}`);
            return res.data as MenuItem[];
        },
        staleTime: 1000 * 60 * 5, // 5분 동안은 신선한 캐시로 취급
    });
}

export function useNavMenusQuery() {
    return useQuery({
        queryKey: ['menus', 'nav'],
        queryFn: async () => {
            const res = await api.get(`${API_PATH}?type=BO`);
            return res.data as MenuItem[];
        },
        staleTime: 1000 * 60 * 30, // 네비게이션용 메뉴는 30분 캐시
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
