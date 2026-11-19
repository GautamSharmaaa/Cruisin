// Governed by .rules v1.0
import { create } from 'zustand';
import type { User } from '@/types/user.types';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  assistedUntil: number | null;
  setSession: (user: User, accessToken: string, assistedUntil?: number) => void;
  clearSession: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  assistedUntil: null,
  setSession: (user, accessToken, assistedUntil) => set({ user, accessToken, isInitialized: true, assistedUntil: assistedUntil ?? null }),
  clearSession: () => set({ user: null, accessToken: null, isInitialized: true, assistedUntil: null })
}));
