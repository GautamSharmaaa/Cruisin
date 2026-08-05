// Governed by .rules v1.0
import { trackProductCartAdded, trackProductWishlistAdded } from '@/lib/meta-ecommerce';
import type { CartItem } from '@/store/cartStore';
import type { Product, ProductVariant } from '@/types/product.types';

export type WishlistActionResult = 'login-required' | 'added' | 'removed' | 'failed';

export interface WishlistActionInput {
  authenticated: boolean;
  product: Product;
  variant?: ProductVariant;
  isWishlisted: boolean;
  toggle: () => void;
  request: () => Promise<unknown>;
}

export const performWishlistToggle = async (input: WishlistActionInput): Promise<WishlistActionResult> => {
  if (!input.authenticated) return 'login-required';
  input.toggle();
  try {
    await input.request();
    if (!input.isWishlisted) trackProductWishlistAdded(input.product, input.variant);
    return input.isWishlisted ? 'removed' : 'added';
  } catch {
    input.toggle();
    return 'failed';
  }
};

export interface AddProductToCartInput {
  product: Product;
  variant: ProductVariant;
  quantity: number;
  addItem: (item: CartItem) => boolean;
}

export const addProductToCart = ({ product, variant, quantity, addItem }: AddProductToCartInput): boolean => {
  const added = addItem({ product, variantId: variant.id, size: variant.size, color: variant.color, quantity, price: variant.price });
  if (added) trackProductCartAdded(product, variant, quantity);
  return added;
};
