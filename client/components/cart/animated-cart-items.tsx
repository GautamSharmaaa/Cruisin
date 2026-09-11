// Governed by .rules v1.0
'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { CartItem } from '@/components/cart/cart-item';
import type { CartItem as CartItemType } from '@/store/cartStore';

export interface AnimatedCartItemsProps {
  items: CartItemType[];
  prioritizeFirst?: boolean;
}

export function AnimatedCartItems({ items, prioritizeFirst = false }: AnimatedCartItemsProps): ReactNode {
  const reducedMotion = useReducedMotion();
  return <AnimatePresence initial={false} mode="popLayout">
    {items.map((item, index) => <motion.div
      key={`${item.product.id}-${item.variantId}`}
      layout="position"
      initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reducedMotion ? { opacity: 0 } : { opacity: 0, x: 28, scale: 0.97, height: 0 }}
      transition={reducedMotion ? { duration: 0.01 } : { opacity: { duration: 0.24 }, scale: { duration: 0.28 }, y: { duration: 0.32, ease: [0.22, 1, 0.36, 1] }, x: { duration: 0.24 }, height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }, layout: { type: 'spring', stiffness: 360, damping: 34 } }}
      className="overflow-hidden"
    >
      <CartItem item={item} priority={prioritizeFirst && index === 0} />
    </motion.div>)}
  </AnimatePresence>;
}
