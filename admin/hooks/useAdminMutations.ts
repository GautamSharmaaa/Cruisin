// Governed by .rules v1.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface AdminProductInput {
  title: string;
  slug: string;
  description: string;
  richDescription: string;
  category: string;
  basePrice: number;
  comparePrice?: number;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  stock: number;
  image: string;
}

export interface AdminCategoryInput {
  name: string;
  slug: string;
  image: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AdminCouponInput {
  code: string;
  type: 'percentage' | 'fixed' | 'freeShipping';
  value: number;
  minOrderValue: number;
  maxDiscount?: number;
  usageLimit?: number;
  userUsageLimit: number;
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

const productPayload = (input: AdminProductInput): Record<string, unknown> => ({
  title: input.title,
  slug: input.slug,
  description: input.description,
  richDescription: input.richDescription,
  brand: 'Cruisin',
  category: input.category,
  images: [{ url: input.image, alt: input.title, width: 1200, height: 1600 }],
  basePrice: input.basePrice,
  comparePrice: input.comparePrice,
  variants: [{ size: input.size, color: input.color, colorHex: input.colorHex, sku: input.sku, price: input.basePrice, stock: input.stock, images: [{ url: input.image, alt: input.title, width: 1200, height: 1600 }] }],
  tags: [],
  isFeatured: false,
  isActive: true,
  seo: { metaTitle: input.title, metaDesc: input.description, ogImage: input.image }
});

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
  mutationFn: async (): Promise<void> => {
    await api.get('/admin/uploads/signature', { params: { folder: 'cruisin/products' } });
  }
});

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: AdminCategoryInput): Promise<void> => {
      await api.post('/admin/categories', { ...input, breadcrumb: [{ name: input.name, slug: input.slug }] });
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'categories'] });
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
      await api.post('/admin/coupons', { ...input, applicableProducts: [], applicableCategories: [], isActive: true });
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
    mutationFn: async (input: { id: string; status: string; note?: string }): Promise<void> => {
      await api.patch('/orders/' + input.id + '/status', input);
    },
    onSuccess: async (): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['admin', 'orders'] });
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
