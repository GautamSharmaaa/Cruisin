// Governed by .rules v1.0
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { API_CONFIG } from '@/constants/config';
import { api } from '@/lib/api';
import type { UserDto } from '@/types/dto.types';

interface LoginResponse {
  user: UserDto;
  accessToken: string;
}

interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
  message: string;
  error?: string[];
}

export const useAdminLogin = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }): Promise<LoginResponse> => {
      const response = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', input);
      return response.data.data;
    },
    onSuccess: (data): void => {
      window.localStorage.setItem(API_CONFIG.accessTokenKey, data.accessToken);
      router.push('/');
    }
  });
};

export const useAdminLogout = () => {
  const router = useRouter();
  return (): void => {
    window.localStorage.removeItem(API_CONFIG.accessTokenKey);
    router.push('/login');
  };
};
