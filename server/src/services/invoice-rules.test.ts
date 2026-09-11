// Governed by .rules v1.0
import { describe, expect, it } from "vitest";
import {
  allocateInvoiceLines,
  financialYearFor,
  isInvoiceEligible,
} from "./invoice-rules.js";

describe("invoice lifecycle rules", () => {
  it("uses the Indian April-to-March financial year", () => {
    expect(financialYearFor(new Date("2026-03-31T18:29:59.000Z"))).toBe(
      "25-26",
    );
    expect(financialYearFor(new Date("2026-03-31T18:30:00.000Z"))).toBe(
      "26-27",
    );
    expect(financialYearFor(new Date("2027-03-31T18:29:59.000Z"))).toBe(
      "26-27",
    );
  });

  it("waits for successful delivery before allowing prepaid invoices", () => {
    expect(
      isInvoiceEligible({
        paymentMethod: "razorpay",
        paymentStatus: "paid",
        orderStatus: "delivered",
      }),
    ).toBe(true);
    expect(
      isInvoiceEligible({
        paymentMethod: "stripe",
        paymentStatus: "paid",
        orderStatus: "confirmed",
      }),
    ).toBe(false);
    expect(
      isInvoiceEligible({
        paymentMethod: "razorpay",
        paymentStatus: "failed",
        orderStatus: "pending",
      }),
    ).toBe(false);
    expect(
      isInvoiceEligible({
        paymentMethod: "razorpay",
        paymentStatus: "paid",
        orderStatus: "cancelled",
      }),
    ).toBe(false);
  });

  it("allows delivered COD orders, including legacy delivered COD pending records", () => {
    expect(
      isInvoiceEligible({
        paymentMethod: "cod",
        paymentStatus: "cod_pending",
        orderStatus: "placed",
      }),
    ).toBe(false);
    expect(
      isInvoiceEligible({
        paymentMethod: "cod",
        paymentStatus: "cod_pending",
        orderStatus: "confirmed",
      }),
    ).toBe(false);
    expect(
      isInvoiceEligible({
        paymentMethod: "cod",
        paymentStatus: "cod_pending",
        orderStatus: "delivered",
      }),
    ).toBe(true);
    expect(
      isInvoiceEligible({
        paymentMethod: "cod",
        paymentStatus: "cod_collected",
        orderStatus: "delivered",
      }),
    ).toBe(true);
    expect(
      isInvoiceEligible({
        paymentMethod: "cod",
        paymentStatus: "refunded",
        orderStatus: "delivered",
      }),
    ).toBe(true);
  });
});

describe("authoritative order tax allocation", () => {
  const items = [
    { price: 1_000, quantity: 1, gstRate: 18 },
    { price: 500, quantity: 2, gstRate: 18 },
  ];

  it("keeps coupon discount, taxable value, shipping-independent item allocation, and totals exact", () => {
    const rows = allocateInvoiceLines(items, 200, 324, true);
    expect(rows.reduce((sum, row) => sum + row.discount, 0)).toBe(200);
    expect(rows.reduce((sum, row) => sum + row.taxableValue, 0)).toBe(1_476);
    expect(rows.reduce((sum, row) => sum + row.totalTax, 0)).toBe(324);
    expect(
      rows.reduce((sum, row) => sum + row.taxableValue + row.totalTax, 0),
    ).toBe(1_800);
  });

  it("splits intrastate GST into exact CGST/SGST and interstate GST into IGST", () => {
    const intra = allocateInvoiceLines(items, 0, 360, true);
    expect(intra.reduce((sum, row) => sum + row.cgstAmount, 0)).toBe(180);
    expect(intra.reduce((sum, row) => sum + row.sgstAmount, 0)).toBe(180);
    expect(intra.reduce((sum, row) => sum + row.igstAmount, 0)).toBe(0);
    const inter = allocateInvoiceLines(items, 0, 360, false);
    expect(inter.reduce((sum, row) => sum + row.igstAmount, 0)).toBe(360);
    expect(
      inter.reduce((sum, row) => sum + row.cgstAmount + row.sgstAmount, 0),
    ).toBe(0);
  });

  it("assigns rounding residue deterministically without floating-point drift", () => {
    const rows = allocateInvoiceLines(
      [
        { price: 333.33, quantity: 1, gstRate: 18 },
        { price: 333.33, quantity: 1, gstRate: 18 },
        { price: 333.34, quantity: 1, gstRate: 18 },
      ],
      100,
      162,
      true,
    );
    expect(rows.reduce((sum, row) => sum + row.discount, 0)).toBe(100);
    expect(rows.reduce((sum, row) => sum + row.totalTax, 0)).toBe(162);
  });

  it("keeps INR 899 payable while splitting out 5% included GST", () => {
    const [row] = allocateInvoiceLines(
      [{ price: 899, quantity: 1, gstRate: 5 }],
      0,
      42.81,
      true,
    );
    expect(row).toMatchObject({
      taxableValue: 856.19,
      totalTax: 42.81,
      cgstAmount: 21.41,
      sgstAmount: 21.4,
    });
    expect(row.taxableValue + row.totalTax).toBe(899);
  });
});
