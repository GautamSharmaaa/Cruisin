// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

export const useLogin = () => { const setSession = useAuthStore((state) => state.setSession); return useMutation({ mutationFn: async (input: { email: string; password: string }): Promise<{ user: User; accessToken: string }> => { const response = await api.post<ApiEnvelope<{ user: User; accessToken: string }>>('/auth/login', input); return response.data.data; }, onSuccess: (data) => setSession(data.user, data.accessToken) }); };
