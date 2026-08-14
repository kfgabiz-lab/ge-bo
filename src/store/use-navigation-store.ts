"use client";

import { create } from "zustand";

interface NavigationStore {
  navigate: ((path: string) => void) | null;
  register: (fn: (path: string) => void) => void;
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  navigate: null,
  register: (fn) => set({ navigate: fn }),
}));
