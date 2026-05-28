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

export const useUploadSignature = () => useMutation({
  mutationFn: async (): Promise<void> => {
    await api.get('/admin/uploads/signature', { params: { folder: 'cruisin/products' } });
  }
});

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
