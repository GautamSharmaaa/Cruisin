// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { API_CONFIG } from '@/constants/config';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

export const useLogin = () => { const setSession = useAuthStore((state) => state.setSession); const openCart = useCartStore((state) => state.openCart); return useMutation({ mutationFn: async (input: { email: string; password: string }): Promise<{ user: User; accessToken: string }> => { const response = await api.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/login', input); return response.data.data; }, onSuccess: async (data): Promise<void> => { window.localStorage.setItem(API_CONFIG.accessTokenKey, data.accessToken); setSession(data.user, data.accessToken); await api.post('/cart/merge').catch(() => undefined); openCart(); } }); };

export const useRegister = () => useMutation({ mutationFn: async (input: { name: string; email: string; password: string }): Promise<User> => { const response = await api.post<ApiEnvelope<User>>('/auth/register', input); return response.data.data; } });

export const useForgotPassword = () => useMutation({ mutationFn: async (input: { email: string }): Promise<void> => { await api.post('/auth/forgot-pw', input); } });

export const useResetPassword = () => useMutation({ mutationFn: async (input: { token: string; password: string }): Promise<void> => { await api.post('/auth/reset-pw', input); } });

export const useLogout = () => { const clearSession = useAuthStore((state) => state.clearSession); const router = useRouter(); return useMutation({ mutationFn: async (): Promise<void> => { await api.post('/auth/logout'); }, onSettled: (): void => { window.localStorage.removeItem(API_CONFIG.accessTokenKey); clearSession(); router.push('/login'); } }); };
