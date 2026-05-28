// Governed by .rules v1.0
import { create } from 'zustand';
import type { User } from '@/types/user.types';

export interface AuthState { user: User | null; accessToken: string | null; setSession: (user: User, accessToken: string) => void; clearSession: () => void; }
export const useAuthStore = create<AuthState>((set) => ({ user: null, accessToken: null, setSession: (user, accessToken) => set({ user, accessToken }), clearSession: () => set({ user: null, accessToken: null }) }));
