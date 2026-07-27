// Governed by .rules v1.0
export interface CheckoutTotals {
  discountedSubtotal: number;
  tax: number;
  total: number;
}

export const taxInclusiveCheckoutTotals = (subtotal: number, discount: number, shipping: number): CheckoutTotals => {
  const discountedSubtotal = Math.max(0, subtotal - discount);
  return {
    discountedSubtotal,
    tax: 0,
    total: discountedSubtotal + shipping
  };
};
