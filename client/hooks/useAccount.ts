// Governed by .rules v1.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { ApiEnvelope } from '@/types/api.types';
import type { AccountDashboard, AddressBookEntry, AuthProvider, Notification, SavedAddress, SecurityEvent, User, UserPreferences, UserSession } from '@/types/user.types';

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
    mutationFn: async (input: { name?: string; email?: string; phone?: string; whatsappNumber?: string }): Promise<User> => {
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

export const useAccountDashboard = () => useQuery({
  queryKey: ['account', 'dashboard'],
  queryFn: async (): Promise<AccountDashboard> => {
    const response = await api.get<ApiEnvelope<AccountDashboard>>('/auth/account/dashboard');
    return response.data.data;
  }
});

export const useAuthProviders = () => useQuery({
  queryKey: ['account', 'providers'],
  queryFn: async (): Promise<AuthProvider[]> => {
    const response = await api.get<ApiEnvelope<AuthProvider[]>>('/auth/providers');
    return response.data.data;
  }
});

export const useSessions = () => useQuery({
  queryKey: ['account', 'sessions'],
  queryFn: async (): Promise<UserSession[]> => {
    const response = await api.get<ApiEnvelope<UserSession[]>>('/auth/sessions');
    return response.data.data;
  }
});

export const useSecurityEvents = () => useQuery({
  queryKey: ['account', 'security-events'],
  queryFn: async (): Promise<SecurityEvent[]> => {
    const response = await api.get<ApiEnvelope<SecurityEvent[]>>('/auth/security/events');
    return response.data.data;
  }
});

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (sessionId: string): Promise<void> => {
      await api.delete('/auth/sessions/' + sessionId);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] });
    }
  });
};

export const useRevokeOtherSessions = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.delete('/auth/sessions');
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'sessions'] });
    }
  });
};

export const useAddressBook = () => useQuery({
  queryKey: ['account', 'address-book'],
  queryFn: async (): Promise<AddressBookEntry[]> => {
    const response = await api.get<ApiEnvelope<AddressBookEntry[]>>('/auth/addresses');
    return response.data.data;
  }
});

export const useCreateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<AddressBookEntry, '_id'>): Promise<AddressBookEntry> => {
      const response = await api.post<ApiEnvelope<AddressBookEntry>>('/auth/addresses', input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'address-book'] });
    }
  });
};

export const useUpdateAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ addressId, input }: { addressId: string; input: Omit<AddressBookEntry, '_id'> }): Promise<AddressBookEntry> => {
      const response = await api.patch<ApiEnvelope<AddressBookEntry>>('/auth/addresses/' + addressId, input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'address-book'] });
    }
  });
};

export const useDeleteAddress = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (addressId: string): Promise<void> => {
      await api.delete('/auth/addresses/' + addressId);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'address-book'] });
    }
  });
};

export const usePreferences = () => useQuery({
  queryKey: ['account', 'preferences'],
  queryFn: async (): Promise<UserPreferences> => {
    const response = await api.get<ApiEnvelope<UserPreferences>>('/auth/preferences');
    return response.data.data;
  }
});

export const useUpdatePreferences = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<UserPreferences>): Promise<UserPreferences> => {
      const response = await api.patch<ApiEnvelope<UserPreferences>>('/auth/preferences', input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'preferences'] });
    }
  });
};

export const useNotifications = () => useQuery({
  queryKey: ['account', 'notifications'],
  queryFn: async (): Promise<Notification[]> => {
    const response = await api.get<ApiEnvelope<Notification[]>>('/notifications');
    return response.data.data;
  }
});

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (notificationId: string): Promise<void> => {
      await api.patch('/notifications/' + notificationId + '/read');
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['account', 'notifications'] });
    }
  });
};
