// Governed by .rules v1.0
import { describe, expect, it } from "vitest";
import { taxInclusiveCheckoutTotals } from "./checkout-totals";

describe("taxInclusiveCheckoutTotals", () => {
  it("does not add tax to tax-inclusive product prices", () => {
    expect(taxInclusiveCheckoutTotals(1598, 0, 0)).toEqual({
      discountedSubtotal: 1598,
      tax: 76.1,
      total: 1598,
    });
  });

  it("only adds shipping after discounts", () => {
    expect(taxInclusiveCheckoutTotals(1598, 100, 900)).toEqual({
      discountedSubtotal: 1498,
      tax: 71.33,
      total: 2398,
    });
  });

  it("extracts 5% GST from INR 899 without increasing the payable total", () => {
    expect(taxInclusiveCheckoutTotals(899, 0, 90)).toEqual({
      discountedSubtotal: 899,
      tax: 42.81,
      total: 989,
    });
  });
});
