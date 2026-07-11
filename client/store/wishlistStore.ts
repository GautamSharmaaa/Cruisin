// Governed by .rules v1.0
import { create } from 'zustand';

export interface WishlistState {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
  setIds: (ids: string[]) => void;
}

export const useWishlistStore = create<WishlistState>()((set, get) => ({
  ids: [],
  toggle: (id) => set((state) => ({ ids: state.ids.includes(id) ? state.ids.filter((entry) => entry !== id) : [...state.ids, id] })),
  has: (id) => get().ids.includes(id),
  setIds: (ids) => set({ ids: Array.from(new Set(ids)) })
}));
