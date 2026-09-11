// Governed by .rules v1.0
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import PDFDocument from "pdfkit";

interface InvoiceAddress {
  fullName?: string;
  phone?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

interface PdfInvoice {
  invoiceNumber: string;
  invoiceDate: Date | string;
  orderNumber: string;
  orderDate: Date | string;
  seller: {
    legalName: string;
    tradeName: string;
    registeredAddress?: string;
    gstin?: string;
    state?: string;
    stateCode?: string;
    phone?: string;
    email?: string;
    footer?: string;
    authorizedSignatory?: string;
  };
  customer: { name: string; email?: string; phone?: string; gstin?: string };
  billingAddress: InvoiceAddress;
  shippingAddress: InvoiceAddress;
  placeOfSupply?: { state?: string; stateCode?: string };
  items: Array<{
    productName: string;
    variant?: string;
    sku: string;
    hsn?: string;
    quantity: number;
    unitPrice: number;
    discount: number;
    taxableValue: number;
    gstRate: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    lineTotal: number;
  }>;
  subtotal: number;
  productDiscount: number;
  couponDiscount: number;
  promotionDiscount: number;
  shippingCharge: number;
  codFee?: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  currentPaymentStatus?: string;
  currentOrderStatus?: string;
}

const ink = "#151515";
const muted = "#666666";
const rule = "#d8d4ce";
const paper = "#ffffff";
const formatMoney = (value: number): string =>
  `INR ${value.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (value: Date | string): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const clean = (value: unknown): string =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim()
    : "";
const publicEmail = (value: unknown): string => {
  const email = clean(value);
  return email.toLowerCase().endsWith("@phone.cruisin.local") ? "" : email;
};
const addressLines = (address: InvoiceAddress): string[] =>
  [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode]
      .filter(Boolean)
      .join(", "),
    address.country,
    address.phone ? `Phone: ${address.phone}` : "",
  ]
    .map(clean)
    .filter(Boolean);

const logoBuffer = (): Buffer | null => {
  for (const path of [
    resolve(process.cwd(), "../client/public/cruisin-logo.svg"),
    resolve(process.cwd(), "client/public/cruisin-logo.svg"),
  ]) {
    try {
      const source = readFileSync(path, "utf8");
      const match = source.match(/base64,([^"']+)/);
      if (match?.[1]) return Buffer.from(match[1], "base64");
    } catch {
      // The wordmark fallback keeps PDF generation deployment-safe.
    }
  }
  return null;
};

const drawBrand = (doc: PDFKit.PDFDocument, invoice: PdfInvoice): void => {
  const logo = logoBuffer();
  if (logo) doc.image(logo, 42, 34, { fit: [116, 54], valign: "center" });
  else
    doc
      .font("Helvetica-Bold")
      .fontSize(21)
      .fillColor(ink)
      .text("CRUISIN", 42, 48, { characterSpacing: 3 });
  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(ink)
    .text("TAX INVOICE", 360, 39, { width: 193, align: "right" });
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(clean(invoice.invoiceNumber), 360, 65, {
      width: 193,
      align: "right",
    });
  doc.moveTo(42, 98).lineTo(553, 98).lineWidth(0.7).strokeColor(rule).stroke();
};

const labelValue = (
  doc: PDFKit.PDFDocument,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
): void => {
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(muted)
    .text(label.toUpperCase(), x, y, { width, characterSpacing: 0.6 });
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(ink)
    .text(value || "—", x, y + 12, { width });
};

const drawHeader = (doc: PDFKit.PDFDocument, invoice: PdfInvoice): number => {
  drawBrand(doc, invoice);
  labelValue(
    doc,
    "Invoice date",
    formatDate(invoice.invoiceDate),
    42,
    116,
    120,
  );
  labelValue(doc, "Order number", clean(invoice.orderNumber), 180, 116, 150);
  labelValue(doc, "Order date", formatDate(invoice.orderDate), 350, 116, 100);
  labelValue(
    doc,
    "Place of supply",
    [invoice.placeOfSupply?.state, invoice.placeOfSupply?.stateCode]
      .filter(Boolean)
      .join(" / "),
    462,
    116,
    91,
  );
  doc
    .moveTo(42, 153)
    .lineTo(553, 153)
    .lineWidth(0.4)
    .strokeColor(rule)
    .stroke();
  doc.font("Helvetica-Bold").fontSize(8).fillColor(ink).text("SELLER", 42, 169);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(
      [
        invoice.seller.tradeName,
        invoice.seller.registeredAddress,
        [invoice.seller.state, invoice.seller.stateCode]
          .filter(Boolean)
          .join(" / "),
        invoice.seller.gstin ? `GSTIN: ${invoice.seller.gstin}` : "",
        invoice.seller.phone,
        invoice.seller.email,
      ]
        .map(clean)
        .filter(Boolean)
        .join("\n"),
      42,
      185,
      { width: 155, lineGap: 2 },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(ink)
    .text("BILL TO", 218, 169);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(
      [
        ...addressLines(invoice.billingAddress),
        publicEmail(invoice.customer.email),
        invoice.customer.gstin ? `GSTIN: ${invoice.customer.gstin}` : "",
      ]
        .map(clean)
        .filter(Boolean)
        .join("\n"),
      218,
      185,
      { width: 155, lineGap: 2 },
    );
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(ink)
    .text("SHIP TO", 394, 169);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(addressLines(invoice.shippingAddress).join("\n"), 394, 185, {
      width: 159,
      lineGap: 2,
    });
  return 275;
};

const columns: Array<{
  label: string;
  x: number;
  width: number;
  align?: "right" | "center";
}> = [
  { label: "ITEM / SKU", x: 42, width: 142 },
  { label: "HSN", x: 184, width: 45 },
  { label: "QTY", x: 229, width: 28, align: "right" as const },
  { label: "RATE INCL.", x: 257, width: 67, align: "right" as const },
  { label: "DISC.", x: 324, width: 54, align: "right" as const },
  { label: "TAXABLE", x: 378, width: 67, align: "right" as const },
  { label: "GST", x: 445, width: 40, align: "right" as const },
  { label: "TOTAL", x: 485, width: 68, align: "right" as const },
];

const drawTableHeader = (doc: PDFKit.PDFDocument, y: number): number => {
  doc.rect(42, y, 511, 24).fillColor(ink).fill();
  for (const column of columns)
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(paper)
      .text(column.label, column.x + 4, y + 9, {
        width: column.width - 8,
        align: column.align,
      });
  return y + 24;
};

const continuationPage = (
  doc: PDFKit.PDFDocument,
  invoice: PdfInvoice,
): number => {
  doc.addPage({ size: "A4", margin: 42 });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(ink)
    .text(`TAX INVOICE · ${clean(invoice.invoiceNumber)}`, 42, 40);
  doc.font("Helvetica").fontSize(8).fillColor(muted).text("Continued", 42, 60);
  return drawTableHeader(doc, 84);
};

const drawInvoice = (doc: PDFKit.PDFDocument, invoice: PdfInvoice): void => {
  doc.addPage({ size: "A4", margin: 42 });
  let y = drawTableHeader(doc, drawHeader(doc, invoice));
  for (const item of invoice.items) {
    if (y > 670) y = continuationPage(doc, invoice);
    const height = 38;
    doc
      .rect(42, y, 511, height)
      .fillColor(y % 2 === 0 ? "#faf9f7" : paper)
      .fill();
    const values = [
      `${clean(item.productName)}${item.variant ? `\n${clean(item.variant)}` : ""}\n${clean(item.sku)}`,
      clean(item.hsn),
      String(item.quantity),
      formatMoney(item.unitPrice),
      formatMoney(item.discount),
      formatMoney(item.taxableValue),
      `${item.gstRate}%`,
      formatMoney(item.lineTotal),
    ];
    columns.forEach((column, index) =>
      doc
        .font(index === 0 ? "Helvetica-Bold" : "Helvetica")
        .fontSize(index === 0 ? 7 : 6.5)
        .fillColor(index === 0 ? ink : muted)
        .text(values[index], column.x + 4, y + 7, {
          width: column.width - 8,
          align: column.align,
          lineGap: 1,
        }),
    );
    y += height;
  }
  if (y > 550) y = continuationPage(doc, invoice);
  y += 18;
  const currentPaymentLine =
    invoice.currentPaymentStatus &&
    invoice.currentPaymentStatus !== invoice.paymentStatus
      ? `\nCurrent payment status: ${clean(invoice.currentPaymentStatus).replaceAll("_", " ")}`
      : "";
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(muted)
    .text(
      `Payment method: ${clean(invoice.paymentMethod).toUpperCase()}\nPayment status at issue: ${clean(invoice.paymentStatus).replaceAll("_", " ")}${currentPaymentLine}\nProduct prices include 5% GST.`,
      42,
      y,
      { width: 245, lineGap: 4 },
    );
  const allTotalRows: Array<[string, number, boolean?]> = [
    ["Subtotal", invoice.subtotal],
    ["Product discount", -invoice.productDiscount],
    ["Coupon discount", -invoice.couponDiscount],
    ["Promotion discount", -invoice.promotionDiscount],
    ["Shipping", invoice.shippingCharge],
    ["COD fee", invoice.codFee ?? 0],
    ["Taxable value", invoice.taxableValue],
    ["CGST", invoice.cgst],
    ["SGST", invoice.sgst],
    ["IGST", invoice.igst],
    ["Total GST", invoice.totalTax],
    ["Grand total", invoice.grandTotal, true],
  ];
  const totalRows = allTotalRows.filter(
    ([label, value, emph]) =>
      value !== 0 ||
      emph ||
      ["Subtotal", "Taxable value", "Total GST"].includes(label),
  );
  let totalY = y;
  for (const [label, value, emph] of totalRows) {
    if (emph) {
      doc
        .moveTo(330, totalY - 4)
        .lineTo(553, totalY - 4)
        .lineWidth(0.8)
        .strokeColor(ink)
        .stroke();
      totalY += 4;
    }
    doc
      .font(emph ? "Helvetica-Bold" : "Helvetica")
      .fontSize(emph ? 10 : 8)
      .fillColor(emph ? ink : muted)
      .text(label, 330, totalY, { width: 105 });
    doc.text(formatMoney(value), 435, totalY, { width: 118, align: "right" });
    totalY += emph ? 22 : 16;
  }
  const footerY = Math.max(totalY + 18, 730);
  doc
    .moveTo(42, footerY)
    .lineTo(553, footerY)
    .lineWidth(0.4)
    .strokeColor(rule)
    .stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .fillColor(ink)
    .text(
      clean(invoice.seller.footer) || "Thank you for shopping with Cruisin.",
      42,
      footerY + 14,
      { width: 300 },
    );
  doc
    .font("Helvetica")
    .fontSize(7)
    .fillColor(muted)
    .text("This is a computer-generated invoice.", 42, footerY + 31, {
      width: 300,
    });
  if (invoice.seller.authorizedSignatory)
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(ink)
      .text("Authorized signatory", 390, footerY + 14, {
        width: 163,
        align: "right",
      });
};

export const renderInvoicePdf = async (
  invoices: Array<Record<string, unknown>>,
): Promise<Buffer> =>
  new Promise((resolvePromise, rejectPromise) => {
    const doc = new PDFDocument({
      autoFirstPage: false,
      compress: true,
      info: {
        Title:
          invoices.length === 1
            ? `Cruisin invoice ${String(invoices[0].invoiceNumber)}`
            : `Cruisin invoices (${invoices.length})`,
        Author: "Cruisin",
        Creator: "Cruisin Admin",
      },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolvePromise(Buffer.concat(chunks)));
    doc.on("error", rejectPromise);
    for (const invoice of invoices)
      drawInvoice(doc, invoice as unknown as PdfInvoice);
    doc.end();
  });
