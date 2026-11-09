import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { StorefrontAppearance } from '@cruisin/contracts/storefront-appearance';
import { api } from '@/lib/api';
import type { SiteSettingsDto } from '@/types/dto.types';
export const useSaveStorefrontAppearance = () => {
  const cache = useQueryClient();
  return useMutation({
    mutationFn: async (colors: StorefrontAppearance): Promise<SiteSettingsDto> => {
      const response = await api.put<{ success: boolean; data: SiteSettingsDto; message: string }>('/admin/site-settings', colors);
      return response.data.data;
    },
    onSuccess: (settings: SiteSettingsDto): void => { cache.setQueryData(['admin', 'site-settings'], settings); },
  });
};
