// Governed by .rules v1.0
export const PRODUCT_GST_RATE = 5;

const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

/** Extracts GST already contained in an inclusive merchandise amount. */
export const includedGstAmount = (
  inclusiveAmount: number,
  rate = PRODUCT_GST_RATE,
): number => {
  if (inclusiveAmount <= 0 || rate <= 0) return 0;
  return roundMoney((inclusiveAmount * rate) / (100 + rate));
};

export const taxableValueFromInclusive = (
  inclusiveAmount: number,
  rate = PRODUCT_GST_RATE,
): number =>
  roundMoney(
    Math.max(0, inclusiveAmount) - includedGstAmount(inclusiveAmount, rate),
  );
