// Governed by .rules v1.0
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availableVariantStock, stockBoundQuantity } from '@/lib/cart-quantity';
import type { Product } from '@/types/product.types';

export interface CartItem { product: Product; variantId: string; size: string; color: string; quantity: number; price: number; }
export interface CartState { items: CartItem[]; isOpen: boolean; coupon?: string; couponDiscount: number; freeShipping: boolean; addItem: (item: CartItem) => boolean; removeItem: (productId: string, variantId: string) => void; updateQuantity: (productId: string, variantId: string, quantity: number) => void; clearCart: () => void; openCart: () => void; closeCart: () => void; setCoupon: (coupon: string, discount?: number, freeShipping?: boolean) => void; clearCoupon: () => void; subtotal: () => number; }

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [],
  isOpen: false,
  couponDiscount: 0,
  freeShipping: false,
  addItem: (item) => {
    let added = false;
    set((state) => {
      const stock = availableVariantStock(item.product, item.variantId);
      if (stock <= 0 || !Number.isFinite(item.quantity) || item.quantity <= 0) return { isOpen: true };
      const existing = state.items.find((entry) => entry.product.id === item.product.id && entry.variantId === item.variantId);
      const quantity = stockBoundQuantity((existing?.quantity ?? 0) + item.quantity, stock);
      if (existing && quantity <= existing.quantity) return { isOpen: true };
      added = true;
      const items = existing
        ? state.items.map((entry) => entry.product.id === item.product.id && entry.variantId === item.variantId ? { ...entry, product: item.product, price: item.price, quantity } : entry)
        : [...state.items, { ...item, quantity }];
      return { items, isOpen: true, coupon: undefined, couponDiscount: 0, freeShipping: false };
    });
    return added;
  },
  removeItem: (productId, variantId) => set((state) => ({
    items: state.items.filter((item) => !(item.product.id === productId && item.variantId === variantId)),
    coupon: undefined,
    couponDiscount: 0,
    freeShipping: false
  })),
  updateQuantity: (productId, variantId, quantity) => set((state) => ({
    items: state.items.flatMap((item) => {
      if (item.product.id !== productId || item.variantId !== variantId) return [item];
      const bounded = stockBoundQuantity(quantity, availableVariantStock(item.product, item.variantId));
      return bounded > 0 ? [{ ...item, quantity: bounded }] : [];
    }),
    coupon: undefined,
    couponDiscount: 0,
    freeShipping: false
  })),
  clearCart: () => set({ items: [], isOpen: false, coupon: undefined, couponDiscount: 0, freeShipping: false }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  setCoupon: (coupon, discount = 0, freeShipping = false) => set({ coupon, couponDiscount: discount, freeShipping }),
  clearCoupon: () => set({ coupon: undefined, couponDiscount: 0, freeShipping: false }),
  subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}), { name: 'cruisin-cart' }));
