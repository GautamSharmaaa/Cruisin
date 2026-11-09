import {useMutation,useQueryClient} from '@tanstack/react-query';
import type {StorefrontExperience} from '@cruisin/contracts/storefront-experience';
import type {SiteSettingsDto} from '@/types/dto.types';
import {api} from '@/lib/api';
export function useSaveStorefrontExperience(){const cache=useQueryClient();return useMutation({mutationFn:async(storefrontExperience:StorefrontExperience):Promise<SiteSettingsDto>=>{const response=await api.put<{data:SiteSettingsDto}>('/admin/site-settings',{storefrontExperience});return response.data.data;},onSuccess:(settings:SiteSettingsDto)=>{cache.setQueryData(['admin','site-settings'],settings);}});}
