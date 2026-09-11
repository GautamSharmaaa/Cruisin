// Governed by .rules v1.0
export interface InvoiceEligibilityOrder {
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
}
export interface InvoiceLineSource {
  price: number;
  quantity: number;
  gstRate: number;
}
export interface InvoiceLineAllocation {
  discount: number;
  taxableValue: number;
  totalTax: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

export const roundInvoiceMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

export const financialYearFor = (date: Date): string => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const start = month >= 4 ? year : year - 1;
  return `${String(start).slice(-2)}-${String(start + 1).slice(-2)}`;
};

export const isInvoiceEligible = (order: InvoiceEligibilityOrder): boolean => {
  if (order.orderStatus !== "delivered") return false;
  if (order.paymentMethod === "cod")
    return [
        "cod_pending",
        "cod_collected",
        "paid",
        "partially_refunded",
        "refunded",
      ].includes(order.paymentStatus);
  return ["paid", "partially_refunded", "refunded"].includes(
    order.paymentStatus,
  );
};

const distribute = (total: number, weights: number[]): number[] => {
  if (weights.length === 0) return [];
  const weightTotal = weights.reduce((sum, value) => sum + value, 0);
  if (weightTotal <= 0) return weights.map(() => 0);
  let remaining = roundInvoiceMoney(total);
  return weights.map((weight, index) => {
    const allocation =
      index === weights.length - 1
        ? remaining
        : roundInvoiceMoney((total * weight) / weightTotal);
    remaining = roundInvoiceMoney(remaining - allocation);
    return allocation;
  });
};

export const allocateInvoiceLines = (
  items: InvoiceLineSource[],
  discount: number,
  totalTax: number,
  intraState: boolean,
): InvoiceLineAllocation[] => {
  const gross = items.map((item) =>
    roundInvoiceMoney(item.price * item.quantity),
  );
  const discounts = distribute(discount, gross);
  const inclusiveTotals = gross.map((value, index) =>
    roundInvoiceMoney(Math.max(0, value - discounts[index])),
  );
  const taxes = distribute(totalTax, inclusiveTotals);
  return items.map((_item, index) => {
    const tax = taxes[index] ?? 0;
    const cgstAmount = intraState ? roundInvoiceMoney(tax / 2) : 0;
    const taxableValue = roundInvoiceMoney((inclusiveTotals[index] ?? 0) - tax);
    return {
      discount: discounts[index] ?? 0,
      taxableValue,
      totalTax: tax,
      cgstAmount,
      sgstAmount: intraState ? roundInvoiceMoney(tax - cgstAmount) : 0,
      igstAmount: intraState ? 0 : tax,
    };
  });
};
