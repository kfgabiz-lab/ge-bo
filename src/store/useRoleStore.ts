import { create } from 'zustand';
import api from '@/lib/api';

export interface Role {
  id: number;
  code: string;
  displayName: string;
  description: string;
  color: string;
  isSystem: boolean;
  memberCount: number;
}

interface RoleState {
  roles: Role[];
  isLoading: boolean;
  isError: boolean;
  isDrawerOpen: boolean;
  selectedRole: Role | null;

  fetchRoles: () => Promise<void>;
  openDrawer: (role?: Role) => void;
  closeDrawer: () => void;
  addRole: (data: Omit<Role, 'id' | 'memberCount'>) => Promise<void>;
  updateRole: (id: number, data: Partial<Pick<Role, 'displayName' | 'description' | 'color'>>) => Promise<void>;
  deleteRole: (id: number) => Promise<void>;
}

const API_PATH = '/roles';

export const useRoleStore = create<RoleState>((set) => ({
  roles: [],
  isLoading: false,
  isError: false,
  isDrawerOpen: false,
  selectedRole: null,

  fetchRoles: async () => {
    set({ isLoading: true, isError: false });
    try {
      const response = await api.get(API_PATH);
      set({ roles: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      set({ isLoading: false, isError: true });
    }
  },

  openDrawer: (role) => set({ isDrawerOpen: true, selectedRole: role || null }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedRole: null }),

  addRole: async (data) => {
    set({ isLoading: true });
    try {
      const response = await api.post(API_PATH, data);
      set((state) => ({
        roles: [...state.roles, response.data],
        isLoading: false,
        isDrawerOpen: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateRole: async (id, data) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`${API_PATH}/${id}`, data);
      set((state) => ({
        roles: state.roles.map((r) => (r.id === id ? response.data : r)),
        isLoading: false,
        isDrawerOpen: false,
        selectedRole: null,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteRole: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`${API_PATH}/${id}`);
      set((state) => ({
        roles: state.roles.filter((r) => r.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
