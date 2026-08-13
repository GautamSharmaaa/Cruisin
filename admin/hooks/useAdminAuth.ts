// Governed by .rules v1.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { setAccessToken } from '@/lib/access-token';
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { email: string; password: string }): Promise<LoginResponse> => {
      const response = await api.post<ApiEnvelope<LoginResponse>>('/auth/login', input);
      return response.data.data;
    },
    onSuccess: (data): void => {
      queryClient.clear();
      setAccessToken(data.accessToken);
      queryClient.setQueryData(['admin', 'me'], data.user);
      router.push('/');
    }
  });
};

export const useAdminGoogleLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (credential: string): Promise<LoginResponse> => {
      const response = await api.post<ApiEnvelope<LoginResponse>>('/auth/google/admin', { credential });
      return response.data.data;
    },
    onSuccess: (data): void => {
      queryClient.clear();
      setAccessToken(data.accessToken);
      queryClient.setQueryData(['admin', 'me'], data.user);
      router.push('/');
    }
  });
};

export const useAdminLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return (): void => {
    void api.post('/auth/logout').finally(() => {
      setAccessToken(null);
      queryClient.clear();
      router.push('/login');
    });
  };
};
