// Governed by .rules v1.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { SavedAddress, User } from '@/types/user.types';

export const useMe = () => useQuery({
  queryKey: ['me'],
  queryFn: async (): Promise<User> => {
    const response = await api.get<ApiEnvelope<User>>('/auth/me');
    return response.data.data;
  }
});

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const setSession = useAuthStore((state) => state.setSession);
  const accessToken = useAuthStore((state) => state.accessToken);
  return useMutation({
    mutationFn: async (input: { name: string; email: string; phone?: string }): Promise<User> => {
      const response = await api.patch<ApiEnvelope<User>>('/auth/me', input);
      return response.data.data;
    },
    onSuccess: async (user): Promise<void> => {
      if (accessToken) setSession(user, accessToken);
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });
};

export const useChangePassword = () => useMutation({
  mutationFn: async (input: { currentPassword: string; password: string }): Promise<void> => {
    await api.patch('/auth/me/password', input);
  }
});

export const useAddAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<SavedAddress, 'id'>): Promise<SavedAddress[]> => {
      const response = await api.post<ApiEnvelope<SavedAddress[]>>('/auth/me/addresses', input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['me'] });
    }
  });
};

export const useDeleteAccount = () => {
  const clearSession = useAuthStore((state) => state.clearSession);
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete('/auth/me');
    },
    onSuccess: (): void => clearSession()
  });
};
