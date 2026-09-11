// Governed by .rules v1.0
import { describe, expect, it } from "vitest";
import {
  includedGstAmount,
  PRODUCT_GST_RATE,
  taxableValueFromInclusive,
} from "./tax-rules.js";

describe("5% GST-inclusive product pricing", () => {
  it("keeps an INR 899 MRP unchanged while extracting its included GST", () => {
    expect(PRODUCT_GST_RATE).toBe(5);
    expect(includedGstAmount(899)).toBe(42.81);
    expect(taxableValueFromInclusive(899)).toBe(856.19);
    expect(taxableValueFromInclusive(899) + includedGstAmount(899)).toBe(899);
  });
});
