// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/access-token';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { User } from '@/types/user.types';

interface AuthResult {
  user: User;
  accessToken: string;
}

interface OtpRequestResult {
  requestId: string;
  channel: 'whatsapp';
  cooldownSeconds: number;
  expiresAt: string;
  developmentCode?: string;
}

const useAuthSuccess = () => {
  const setSession = useAuthStore((state) => state.setSession);
  return (data: AuthResult): void => {
    setAccessToken(data.accessToken);
    setSession(data.user, data.accessToken);
  };
};

export const useLogin = () => { const onAuthSuccess = useAuthSuccess(); const openCart = useCartStore((state) => state.openCart); return useMutation({ mutationFn: async (input: { email: string; password: string }): Promise<AuthResult> => { const response = await api.post<ApiEnvelope<AuthResult>>('/auth/login', input); return response.data.data; }, onSuccess: async (data): Promise<void> => { onAuthSuccess(data); await api.post('/cart/merge').catch(() => undefined); openCart(); } }); };

export const useGoogleLogin = () => {
  const onAuthSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: async (credential: string): Promise<AuthResult> => {
      const response = await api.post<ApiEnvelope<AuthResult>>('/auth/google', { credential });
      return response.data.data;
    },
    onSuccess: onAuthSuccess
  });
};

export const useRequestOtp = () => useMutation({
  mutationFn: async (input: { phone: string; channel: 'whatsapp' }): Promise<OtpRequestResult> => {
    const response = await api.post<ApiEnvelope<OtpRequestResult>>('/auth/otp/request', { ...input, purpose: 'login' });
    return response.data.data;
  }
});

export const useVerifyOtp = () => {
  const onAuthSuccess = useAuthSuccess();
  return useMutation({
    mutationFn: async (input: { requestId: string; otp: string }): Promise<AuthResult> => {
      const response = await api.post<ApiEnvelope<AuthResult>>('/auth/otp/verify', input);
      return response.data.data;
    },
    onSuccess: onAuthSuccess
  });
};

export const useRegister = () => useMutation({ mutationFn: async (input: { name: string; email: string; password: string }): Promise<User> => { const response = await api.post<ApiEnvelope<User>>('/auth/register', input); return response.data.data; } });

export const useVerifyEmail = () => useMutation({ mutationFn: async (token: string): Promise<void> => { await api.post('/auth/verify-email', { token }); } });

export const useForgotPassword = () => useMutation({ mutationFn: async (input: { email: string }): Promise<void> => { await api.post('/auth/forgot-pw', input); } });

export const useResetPassword = () => useMutation({ mutationFn: async (input: { token: string; password: string }): Promise<void> => { await api.post('/auth/reset-pw', input); } });

export const useLogout = () => { const clearSession = useAuthStore((state) => state.clearSession); const router = useRouter(); return useMutation({ mutationFn: async (): Promise<void> => { await api.post('/auth/logout'); }, onSettled: (): void => { setAccessToken(null); clearSession(); router.push('/login'); } }); };
