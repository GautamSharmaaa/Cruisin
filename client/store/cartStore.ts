// Governed by .rules v1.0
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { availableVariantStock, stockBoundQuantity } from '@/lib/cart-quantity';
import { enqueueCartMutation, toAuthoritativeCartState, type ServerCart } from '@/lib/server-cart';
import type { Product } from '@/types/product.types';

export interface CartItem { product: Product; variantId: string; size: string; color: string; quantity: number; price: number; }
export interface CartState { items: CartItem[]; isOpen: boolean; coupon?: string; couponDiscount: number; freeShipping: boolean; version: number; syncStatus: 'idle' | 'syncing' | 'error'; syncError?: string; addItem: (item: CartItem) => boolean; removeItem: (productId: string, variantId: string) => void; updateQuantity: (productId: string, variantId: string, quantity: number) => void; clearCart: () => void; openCart: () => void; closeCart: () => void; setCoupon: (coupon: string, discount?: number, freeShipping?: boolean, version?: number) => void; clearCoupon: () => void; replaceFromServer: (cart: ServerCart) => void; subtotal: () => number; }

export const useCartStore = create<CartState>()(persist((set, get) => ({
  items: [],
  isOpen: false,
  couponDiscount: 0,
  freeShipping: false,
  version: 0,
  syncStatus: 'idle',
  addItem: (item) => {
    let added = false;
    let mutation: { kind: 'add' | 'update'; quantity: number } | undefined;
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
      mutation = { kind: existing ? 'update' : 'add', quantity: existing ? quantity : item.quantity };
      return { items, isOpen: true, coupon: undefined, couponDiscount: 0, freeShipping: false };
    });
    if (added && mutation) scheduleMutation({ kind: mutation.kind, product: item.product.id, variant: item.variantId, quantity: mutation.quantity });
    return added;
  },
  removeItem: (productId, variantId) => {
    const exists = get().items.some((item) => item.product.id === productId && item.variantId === variantId);
    set((state) => ({
      items: state.items.filter((item) => !(item.product.id === productId && item.variantId === variantId)),
      coupon: undefined,
      couponDiscount: 0,
      freeShipping: false
    }));
    if (exists) scheduleMutation({ kind: 'remove', product: productId, variant: variantId });
  },
  updateQuantity: (productId, variantId, quantity) => {
    let nextQuantity: number | undefined;
    let removed = false;
    set((state) => ({
      items: state.items.flatMap((item) => {
        if (item.product.id !== productId || item.variantId !== variantId) return [item];
        const bounded = stockBoundQuantity(quantity, availableVariantStock(item.product, item.variantId));
        if (bounded <= 0) { removed = true; return []; }
        nextQuantity = bounded;
        return [{ ...item, quantity: bounded }];
      }),
      coupon: undefined,
      couponDiscount: 0,
      freeShipping: false
    }));
    if (removed) scheduleMutation({ kind: 'remove', product: productId, variant: variantId });
    else if (nextQuantity !== undefined) scheduleMutation({ kind: 'update', product: productId, variant: variantId, quantity: nextQuantity });
  },
  clearCart: () => set({ items: [], isOpen: false, coupon: undefined, couponDiscount: 0, freeShipping: false, version: 0, syncStatus: 'idle', syncError: undefined }),
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  setCoupon: (coupon, discount = 0, freeShipping = false, version) => set((state) => ({ coupon, couponDiscount: discount, freeShipping, version: version ?? state.version })),
  clearCoupon: () => set({ coupon: undefined, couponDiscount: 0, freeShipping: false }),
  replaceFromServer: (cart) => set((state) => ({ ...toAuthoritativeCartState(cart, state.items), syncStatus: 'idle', syncError: undefined })),
  subtotal: () => get().items.reduce((sum, item) => sum + item.price * item.quantity, 0)
}), { name: 'cruisin-cart' }));

function scheduleMutation(mutation: Parameters<typeof enqueueCartMutation>[0]): void {
  enqueueCartMutation(
    mutation,
    () => useCartStore.getState().version,
    (cart) => useCartStore.getState().replaceFromServer(cart),
    (syncStatus, syncError) => useCartStore.setState({ syncStatus, syncError })
  );
}
