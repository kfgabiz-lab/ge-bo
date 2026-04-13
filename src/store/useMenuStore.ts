'use client';

import { create } from 'zustand';
import { toast } from 'sonner';
import api from '@/lib/api';

/* ── 타입 정의 ── */
export interface MenuItem {
    id: number;
    name: string;
    url: string;
    icon: string;
    parentId: number | null;
    menuType: 'BO' | 'FO';
    sortOrder: number;
    visible: boolean;
    isCategory?: boolean;
    /** page-data API 식별 슬러그 (메뉴에 설정된 경우) */
    slug?: string;
    children?: MenuItem[];
}

export interface MenuRoleMapping {
    menuId: number;
    roleId: number;
    roleName: string;
    roleDisplayName: string;
    hasAccess: boolean;
}

interface MenuStore {
    /* 상태 */
    menus: MenuItem[];
    navMenus: MenuItem[]; // 사이드바/헤더 네비게이션용 BO 메뉴
    roles: { id: number; name: string; displayName: string }[];
    roleMenuMappings: MenuRoleMapping[];
    selectedMenu: MenuItem | null;
    activeTab: 'BO' | 'FO';
    isLoading: boolean;
    isDirty: boolean;
    isCreating: boolean;
    createParentId: number | null;
    createMaxDepth: number; // 선택된 부모의 depth (1~3)

    /* 액션 */
    setActiveTab: (tab: 'BO' | 'FO') => void;
    selectMenu: (menu: MenuItem | null) => void;
    setIsDirty: (dirty: boolean) => void;
    startCreate: (parentId: number | null, parentDepth: number) => void;
    cancelCreate: () => void;
    fetchNavMenus: () => Promise<void>; // 사이드바/헤더 전용 BO 메뉴 조회
    fetchMenus: () => Promise<void>;
    fetchRoles: () => Promise<void>;
    fetchRoleMenuMappings: (menuId: number) => Promise<void>;
    addMenu: (menu: Omit<MenuItem, 'id' | 'children'>) => Promise<void>;
    updateMenu: (id: number, updates: Partial<MenuItem>) => Promise<void>;
    deleteMenu: (id: number) => Promise<void>;
    moveMenu: (id: number, direction: 'up' | 'down') => void;
    updateRoleMenuMapping: (menuId: number, roleId: number, hasAccess: boolean) => Promise<void>;
    localUpdateMenuTree: (newMenus: MenuItem[]) => void;
    __syncQueryMenus: (serverMenus: MenuItem[], queryRoles: any[], isNav?: boolean) => void;
}

/* ── API 경로 ── */
const API_PATH = '/menus';
const ROLES_PATH = '/roles';

/* ── Store ── */
export const useMenuStore = create<MenuStore>((set, get) => ({
    menus: [],
    navMenus: [],
    roles: [],
    roleMenuMappings: [],
    selectedMenu: null,
    activeTab: 'BO',
    isLoading: false,
    isDirty: false,
    isCreating: false,
    createParentId: null,
    createMaxDepth: 0,

    setActiveTab: (tab) => {
        if (get().isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return;
        set({ activeTab: tab, selectedMenu: null, isDirty: false, isCreating: false });
        get().fetchMenus();
    },
    selectMenu: (menu) => {
        if (get().isDirty && !confirm('저장하지 않은 변경사항이 있습니다. 이동하시겠습니까?')) return;
        set({ selectedMenu: menu, isDirty: false, isCreating: false });
        if (menu) get().fetchRoleMenuMappings(menu.id);
    },
    setIsDirty: (dirty) => set({ isDirty: dirty }),
    startCreate: (parentId, parentDepth) => set({ isCreating: true, createParentId: parentId, createMaxDepth: parentDepth, selectedMenu: null }),
    cancelCreate: () => set({ isCreating: false, createParentId: null, createMaxDepth: 0 }),

    /* ══════════════════════════════════════ */
    /*  조회 (React Query로 위임됨)              */
    /* ══════════════════════════════════════ */

    // 기존 직접 페칭 로직들은 React Query로 책임을 넘겼으므로 빈 함수로 남겨둡니다.
    // 기존 코드와의 의존성 하위 호환을 위해 함수명만 유지합니다. (향후 완전 제거 권장)
    fetchNavMenus: async () => { },
    fetchMenus: async () => { },
    fetchRoles: async () => { },

    fetchRoleMenuMappings: async (menuId) => {
        try {
            const res = await api.get(`${API_PATH}/${menuId}/roles`);
            set({ roleMenuMappings: res.data });
        } catch {
            toast.error('역할 매핑을 불러오는 중 오류가 발생했습니다.');
        }
    },

    /* ══════════════════════════════════════ */
    /*  생성                                  */
    /* ══════════════════════════════════════ */

    addMenu: async (menu) => {
        try {
            await api.post(API_PATH, {
                name: menu.name,
                url: menu.url || '',
                icon: menu.icon,
                parentId: menu.parentId,
                menuType: menu.menuType,
                sortOrder: menu.sortOrder,
                visible: menu.visible,
                isCategory: menu.isCategory || false,
                slug: menu.slug || null,
            });
            get().fetchMenus();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '메뉴 추가 중 오류가 발생했습니다.');
            throw err;
        }
    },

    /* ══════════════════════════════════════ */
    /*  수정                                  */
    /* ══════════════════════════════════════ */

    updateMenu: async (id, updates) => {
        try {
            const menu = get().selectedMenu;
            if (!menu) return;
            await api.put(`${API_PATH}/${id}`, {
                name: updates.name ?? menu.name,
                url: updates.url ?? menu.url ?? '',
                icon: updates.icon ?? menu.icon,
                parentId: menu.parentId,
                menuType: menu.menuType,
                sortOrder: updates.sortOrder ?? menu.sortOrder,
                visible: updates.visible ?? menu.visible,
                isCategory: updates.isCategory ?? menu.isCategory ?? false,
                slug: updates.slug !== undefined ? (updates.slug || null) : (menu.slug || null),
            });
            get().fetchMenus();
            /* 선택된 메뉴 갱신 */
            const sel = get().selectedMenu;
            if (sel?.id === id) set({ selectedMenu: { ...sel, ...updates } });
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '메뉴 수정 중 오류가 발생했습니다.');
            throw err;
        }
    },

    /* ══════════════════════════════════════ */
    /*  삭제                                  */
    /* ══════════════════════════════════════ */

    deleteMenu: async (id) => {
        try {
            await api.delete(`${API_PATH}/${id}`);
            set({ selectedMenu: null });
            get().fetchMenus();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            toast.error(msg || '메뉴 삭제 중 오류가 발생했습니다.');
            throw err;
        }
    },

    /* ══════════════════════════════════════ */
    /*  순서 변경                              */
    /* ══════════════════════════════════════ */

    moveMenu: async (id, direction) => {
        /* 현재 트리에서 형제 찾기 */
        const findInTree = (items: MenuItem[]): MenuItem | undefined => {
            for (const item of items) {
                if (item.id === id) return item;
                if (item.children) {
                    const found = findInTree(item.children);
                    if (found) return found;
                }
            }
            return undefined;
        };
        const findSiblings = (items: MenuItem[], parentId: number | null): MenuItem[] => {
            if (parentId === null) return items;
            for (const item of items) {
                if (item.id === parentId) return item.children || [];
                if (item.children) {
                    const found = findSiblings(item.children, parentId);
                    if (found.length > 0) return found;
                }
            }
            return [];
        };

        const menu = findInTree(get().menus);
        if (!menu) return;
        const siblings = findSiblings(get().menus, menu.parentId);
        const idx = siblings.findIndex(s => s.id === id);
        const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= siblings.length) return;

        const target = siblings[targetIdx];

        try {
            /* 두 메뉴의 sortOrder 교환 */
            await api.patch(`${API_PATH}/${id}/sort`, { sortOrder: target.sortOrder });
            await api.patch(`${API_PATH}/${target.id}/sort`, { sortOrder: menu.sortOrder });
            get().fetchMenus();
            toast.success('순서가 변경되었습니다.');
        } catch {
            toast.error('순서 변경 중 오류가 발생했습니다.');
        }
    },

    /* ══════════════════════════════════════ */
    /*  역할 매핑                              */
    /* ══════════════════════════════════════ */

    updateRoleMenuMapping: async (menuId, roleId, hasAccess) => {
        /* 낙관적 업데이트 */
        set(state => ({
            roleMenuMappings: state.roleMenuMappings.map(m =>
                m.menuId === menuId && m.roleId === roleId ? { ...m, hasAccess } : m
            ),
        }));
        try {
            await api.put(`${API_PATH}/${menuId}/roles/${roleId}`, { hasAccess });
        } catch {
            /* 실패 시 롤백 */
            set(state => ({
                roleMenuMappings: state.roleMenuMappings.map(m =>
                    m.menuId === menuId && m.roleId === roleId ? { ...m, hasAccess: !hasAccess } : m
                ),
            }));
            throw new Error('매핑 변경 실패');
        }
    },

    /* ══════════════════════════════════════ */
    /*  디버그 / 로컬 트리 조작용 / 동기화 브릿지 */
    /* ══════════════════════════════════════ */
    localUpdateMenuTree: (newMenus) => set({ menus: newMenus }),

    // React Query에서 받은 데이터를 스토어의 로컬 상태(메뉴 구동용)로 주입하는 브릿지 메서드
    __syncQueryMenus: (serverMenus: MenuItem[], queryRoles: any[], isNav = false) => {
        if (isNav) {
            set({ navMenus: serverMenus || [] });
        } else {
            set({ menus: serverMenus || [], roles: queryRoles || [] });
        }
    }
}));
