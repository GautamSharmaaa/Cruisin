// Governed by .rules v1.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { productPayloadFromInput } from '@/lib/product-payload';
import type { CmsMediaDto, CmsSectionDto, CmsSectionType, CmsStatus, ProductDto } from '@/types/dto.types';

export interface AdminProductInput {
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  richDescription: string;
  category: string;
  categoryIds?: string;
  collections?: string;
  tags?: string;
  gender?: 'men' | 'women' | 'unisex';
  status?: 'draft' | 'published' | 'archived';
  visibility?: 'visible' | 'hidden';
  isSale?: boolean;
  isFeatured?: boolean;
  isBestseller?: boolean;
  isNewArrival?: boolean;
  isLatestDrop?: boolean;
  materialCare?: string;
  fitDetails?: string;
  shippingReturns?: string;
  sizeGuide?: string;
  productHighlights?: string;
  pickupAddress?: string;
  lowStockThreshold?: number;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  basePrice: number;
  comparePrice?: number;
  costPrice?: number;
  gstPercent?: number;
  hsnCode?: string;
  productCode?: string;
  variants: AdminProductVariantInput[];
  image: string;
  hoverImage?: string;
  videoUrl?: string;
  mobileVideoUrl?: string;
  videoPosterImage?: string;
  imageAltText?: string;
}

export interface AdminProductVariantInput {
  _id?: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  priceOverride?: number;
  lowStockThreshold?: number;
  enabled: boolean;
  images: string[];
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  parent?: string;
  image: string;
  description?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  heroImage?: string;
  mobileHeroImage?: string;
  bannerImage?: string;
  mobileBannerImage?: string;
  thumbnailImage?: string;
  categoryCardImage?: string;
  categoryVideo?: string;
  mobileCategoryVideo?: string;
  backgroundVideo?: string;
  videoPosterImage?: string;
  imageAltText?: string;
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoLoop?: boolean;
  sortOrder: number;
  isActive: boolean;
  isVisible?: boolean;
  isPublished?: boolean;
  isFeatured?: boolean;
  showInHeader?: boolean;
  showInMenu?: boolean;
  showInFilters?: boolean;
  showOnHomepage?: boolean;
  showOnCollectionPages?: boolean;
  showInFooter?: boolean;
  bannerTitle?: string;
  bannerSubtitle?: string;
  defaultSort?: string;
  defaultGridView?: 1 | 2 | 4;
  areFiltersVisible?: boolean;
  isAdvancedFilterEnabled?: boolean;
  isFlashlightEnabled?: boolean;
  seoTitle?: string;
  seoDescription?: string;
  ogImage?: string;
  canonicalSlug?: string;
}

export interface AdminCouponInput {
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  userUsageLimit: number;
  applicableProducts?: string;
  applicableCategories?: string;
  validFrom: string;
  validUntil: string;
}

export interface AdminUserUpdateInput {
  id: string;
  role: 'customer' | 'admin' | 'superadmin' | 'manager' | 'viewer';
  isActive: boolean;
}

export interface AdminBannerInput {
  title: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  image: string;
  mobileImage: string;
  position: string;
  startDate: string;
  endDate: string;
  sortOrder: number;
  isActive: boolean;
}

export interface CmsSectionInput {
  pageTarget: string;
  type: CmsSectionType;
  title: string;
  subtitle?: string;
  description?: string;
  content: Record<string, unknown>;
  styles: Record<string, unknown>;
  products: string[];
  categories: string[];
  sortOrder: number;
  active: boolean;
  hideOnDesktop: boolean;
  hideOnMobile: boolean;
  status: CmsStatus;
  startDate?: string;
  endDate?: string;
}

export interface CmsMediaInput {
  url: string;
  type: 'image' | 'video';
  alt?: string;
  desktopUrl?: string;
  mobileUrl?: string;
  posterUrl?: string;
  cropFocus?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  lazy?: boolean;
}

const listFromCsv = (value?: string): string[] => (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);

export const productPayload = (input: AdminProductInput): Record<string, unknown> => productPayloadFromInput(input);

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminProductInput): Promise<void> => {
      await api.post('/products', productPayload(input));
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    }
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminProductInput & { id: string }): Promise<void> => {
      await api.put('/products/' + input.id, productPayload(input));
    },
    onSuccess: async (_data, input): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products', input.id] })
      ]);
    }
  });
};

export const usePatchProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; patch: Partial<ProductDto> }): Promise<ProductDto> => {
      const response = await api.put('/products/' + input.id, input.patch);
      return response.data.data;
    },
    onSuccess: async (_data, input): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'products', input.id] })
      ]);
    }
  });
};

export const useDuplicateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<ProductDto> => {
      const response = await api.post('/products/' + id + '/duplicate');
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    }
  });
};

export const useArchiveProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete('/products/' + id);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    }
  });
};

export const useUploadSignature = () => useMutation({
  mutationFn: async (): Promise<{ timestamp: number; signature: string; folder: string }> => {
    const response = await api.get('/admin/uploads/signature', { params: { folder: 'cruisin/products' } });
    return response.data.data;
  }
});

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminCategoryInput): Promise<void> => {
      await api.post('/admin/categories', { ...input, parent: input.parent || null, breadcrumb: [{ name: input.name, slug: input.slug }] });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    }
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminCategoryInput & { id: string }): Promise<void> => {
      const { id, ...category } = input;
      await api.put('/admin/categories/' + id, { ...category, parent: category.parent || null, breadcrumb: [{ name: category.name, slug: category.slug }] });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms'] });
    }
  });
};

export const useArchiveCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete('/admin/categories/' + id);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
    }
  });
};

export const useCreateCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminCouponInput): Promise<void> => {
      await api.post('/admin/coupons', { ...input, applicableProducts: listFromCsv(input.applicableProducts), applicableCategories: listFromCsv(input.applicableCategories), isActive: true });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    }
  });
};

export const useArchiveCoupon = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete('/admin/coupons/' + id);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'coupons'] });
    }
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: string; note?: string; trackingNumber?: string }): Promise<void> => {
      await api.patch('/admin/orders/' + input.id + '/status', input);
    },
    onSuccess: async (_data, input): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders', input.id] });
    }
  });
};

export const useOrderPaymentAction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; action: 'mark-cod-paid' | 'mark-partial-paid' | 'refund' | 'sync-refund'; amount?: number; reason?: string; idempotencyKey?: string }): Promise<void> => {
      if (input.action === 'refund') await api.post('/admin/orders/' + input.id + '/refund', { amount: input.amount, reason: input.reason, idempotencyKey: input.idempotencyKey });
      else await api.post('/admin/orders/' + input.id + '/' + input.action);
    },
    onSuccess: async (_data, input): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders', input.id] });
    }
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminUserUpdateInput): Promise<void> => {
      await api.patch('/admin/users/' + input.id, { role: input.role, isActive: input.isActive });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    }
  });
};

export const useCreateBanner = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminBannerInput): Promise<void> => {
      await api.post('/cms/banners', { title: input.title, subtitle: input.subtitle, cta: { text: input.ctaText, link: input.ctaLink }, image: input.image, mobileImage: input.mobileImage, position: input.position, isActive: input.isActive, startDate: input.startDate, endDate: input.endDate, sortOrder: input.sortOrder });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    }
  });
};

export const useReorderBanners = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      await api.post('/cms/reorder', { ids });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'banners'] });
    }
  });
};

export const useCreateCmsSection = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CmsSectionInput): Promise<CmsSectionDto> => {
      const response = await api.post('/cms/pages/' + pageId + '/sections', input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] });
    }
  });
};

export const useUpdateCmsSection = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CmsSectionInput & { id: string }): Promise<CmsSectionDto> => {
      const { id, ...payload } = input;
      const response = await api.patch('/cms/sections/' + id, payload);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] });
    }
  });
};

export const useArchiveCmsSection = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete('/cms/sections/' + id);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] });
    }
  });
};

export const useReorderCmsSections = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]): Promise<void> => {
      await api.post('/cms/pages/' + pageId + '/reorder', { ids });
    },
    onMutate: async (ids: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'cms', 'sections', pageId] });
      const previous = queryClient.getQueryData<CmsSectionDto[]>(['admin', 'cms', 'sections', pageId]);
      if (previous) {
        const byId = new Map(previous.map((section) => [section.id ?? section._id ?? section.title, section]));
        queryClient.setQueryData<CmsSectionDto[]>(['admin', 'cms', 'sections', pageId], ids.flatMap((id, index) => {
          const section = byId.get(id);
          return section ? [{ ...section, sortOrder: index }] : [];
        }));
      }
      return { previous };
    },
    onError: (_error, _ids, context): void => {
      if (context?.previous) queryClient.setQueryData(['admin', 'cms', 'sections', pageId], context.previous);
    },
    onSettled: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] });
    }
  });
};

export const usePublishCmsPage = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      await api.post('/cms/pages/' + pageId + '/publish');
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'pages'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'versions', pageId] })
      ]);
    }
  });
};

export const useRestoreCmsVersion = (pageId?: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (versionId: string): Promise<void> => {
      await api.post('/cms/pages/' + pageId + '/restore', { versionId });
    },
    onSuccess: async (): Promise<void> => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'sections', pageId] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'versions', pageId] })
      ]);
    }
  });
};

export const useCreateCmsMedia = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CmsMediaInput): Promise<CmsMediaDto> => {
      const response = await api.post('/cms/media', input);
      return response.data.data;
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'cms', 'media'] });
    }
  });
};
