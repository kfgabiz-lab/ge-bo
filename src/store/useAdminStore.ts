import { create } from 'zustand';
import api from '@/lib/api';

export interface Admin {
  id: number;
  email: string;
  name: string;
  employeeId: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  lastLoginIp?: string;
}

interface AdminState {
  admins: Admin[];
  isLoading: boolean;
  searchTerm: string;
  filterRole: string;
  isDrawerOpen: boolean;
  selectedAdmin: Admin | null;

  // Actions
  fetchAdmins: () => Promise<void>;
  setSearchTerm: (term: string) => void;
  setFilterRole: (role: string) => void;
  openDrawer: (admin?: Admin) => void;
  closeDrawer: () => void;
  addAdmin: (admin: Omit<Admin, 'id' | 'createdAt' | 'isActive'>) => Promise<{ admin: Admin; tempPassword: string }>;
  updateAdmin: (id: number, admin: Partial<Admin>) => Promise<Admin>;
  deleteAdmin: (id: number) => Promise<void>;
  toggleAdminStatus: (id: number) => Promise<void>;
  resetPassword: (id: number) => Promise<string>;
}

const API_PATH = '/admins';

export const useAdminStore = create<AdminState>((set, get) => ({
  admins: [],
  isLoading: false,
  searchTerm: '',
  filterRole: 'ALL',
  isDrawerOpen: false,
  selectedAdmin: null,

  fetchAdmins: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get(API_PATH);
      set({ admins: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch admins:', error);
      set({ isLoading: false });
    }
  },

  setSearchTerm: (term) => set({ searchTerm: term }),
  setFilterRole: (role) => set({ filterRole: role }),

  openDrawer: (admin) => set({ isDrawerOpen: true, selectedAdmin: admin || null }),
  closeDrawer: () => set({ isDrawerOpen: false, selectedAdmin: null }),

  addAdmin: async (adminData) => {
    set({ isLoading: true });
    try {
      const response = await api.post(API_PATH, adminData);
      const newAdmin = response.data;
      set((state) => ({
        admins: [newAdmin, ...state.admins],
        isLoading: false,
        isDrawerOpen: false,
      }));
      return { admin: newAdmin, tempPassword: newAdmin.tempPassword };
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  updateAdmin: async (id, adminData) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`${API_PATH}/${id}`, adminData);
      const updatedAdmin = response.data;
      set((state) => ({
        admins: state.admins.map((a) => (a.id === id ? updatedAdmin : a)),
        isLoading: false,
        isDrawerOpen: false,
        selectedAdmin: null,
      }));
      return updatedAdmin;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  deleteAdmin: async (id) => {
    set({ isLoading: true });
    try {
      await api.delete(`${API_PATH}/${id}`);
      set((state) => ({
        admins: state.admins.filter((a) => a.id !== id),
        isLoading: false,
      }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  toggleAdminStatus: async (id) => {
    const admin = get().admins.find((a) => a.id === id);
    if (!admin) return;

    try {
      const response = await api.patch(`${API_PATH}/${id}/status`, {
        isActive: !admin.isActive,
      });
      const updatedAdmin = response.data;
      set((state) => ({
        admins: state.admins.map((a) => (a.id === id ? updatedAdmin : a)),
      }));
    } catch (error) {
      console.error('Failed to toggle status:', error);
      throw error;
    }
  },

  resetPassword: async (id) => {
    set({ isLoading: true });
    try {
      const response = await api.post(`${API_PATH}/${id}/reset-password`);
      set({ isLoading: false });
      return response.data.tempPassword;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
}));
