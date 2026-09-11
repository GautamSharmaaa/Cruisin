// Governed by .rules v1.0
"use client";

import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { AdminCard } from "@/components/dashboard/admin-ui";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Button } from "@/components/ui/button";
import { useAdminInvoice } from "@/hooks/useAdminResources";
import { api } from "@/lib/api";
import { formatPrecisePrice } from "@/lib/utils";
import type { InvoiceAddressDto } from "@/types/dto.types";

export interface InvoiceDetailProps {
  id: string;
}
const lines = (address?: InvoiceAddressDto): string =>
  address
    ? [
        address.fullName,
        address.line1,
        address.line2,
        address.city,
        address.state,
        address.postalCode,
        address.country,
        address.phone,
      ]
        .filter(Boolean)
        .join(", ")
    : "—";
const date = (value: string): string =>
  new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(
    new Date(value),
  );

export function InvoiceDetail({ id }: InvoiceDetailProps): ReactNode {
  const invoice = useAdminInvoice(id);
  const queryClient = useQueryClient();
  const [preparing, setPreparing] = useState(false);
  const [notice, setNotice] = useState("");
  if (invoice.isLoading)
    return (
      <AdminCard>
        <div className="h-96 animate-pulse bg-background-overlay" />
      </AdminCard>
    );
  if (invoice.isError || !invoice.data)
    return (
      <AdminCard>
        <p className="text-danger">
          {invoice.error?.message ?? "Invoice not found."}
        </p>
        <Link href="/invoices" className="mt-4 inline-flex text-accent-gold">
          Back to invoices
        </Link>
      </AdminCard>
    );
  const value = invoice.data;
  const download = async (): Promise<void> => {
    setPreparing(true);
    setNotice(`Preparing ${value.invoiceNumber}…`);
    try {
      const response = await api.get<Blob>(`/admin/invoices/${id}/pdf`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${value.invoiceNumber.replaceAll("/", "-")}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      await queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setNotice(
        response.headers["x-invoice-download-recorded"] === "false"
          ? "PDF downloaded, but its download status could not be recorded."
          : "Invoice downloaded.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Invoice download failed.",
      );
    } finally {
      setPreparing(false);
    }
  };
  const totalRows = [
    ["Subtotal", value.subtotal],
    ["Product discount", -value.productDiscount],
    ["Coupon discount", -value.couponDiscount],
    ["Promotion discount", -value.promotionDiscount],
    ["Shipping", value.shippingCharge],
    ["COD fee", value.codFee ?? 0],
    ["Taxable value", value.taxableValue],
    ["CGST", value.cgst],
    ["SGST", value.sgst],
    ["IGST", value.igst],
    ["Total GST", value.totalTax],
  ] as const;
  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/invoices"
          className="inline-flex h-11 items-center text-sm text-text-secondary hover:text-accent-gold"
        >
          <ArrowLeft size={16} className="mr-2" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/orders/${value.orderId}`}
            className="inline-flex h-11 items-center border border-border px-4 text-xs uppercase tracking-[0.1em] hover:border-accent-gold"
          >
            <ExternalLink size={15} className="mr-2" />
            View order
          </Link>
          <Button onClick={() => void download()} disabled={preparing}>
            <Download
              size={18}
              strokeWidth={2.25}
              className="mr-2 h-[18px] w-[18px] shrink-0"
            />
            {preparing ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>
      {notice ? (
        <p
          role="status"
          className="border-l-2 border-accent-gold px-4 text-sm text-text-secondary"
        >
          {notice}
        </p>
      ) : null}
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="mx-auto min-w-0 w-full max-w-[860px] overflow-hidden bg-white p-5 text-neutral-900 shadow-lg sm:p-10">
          <header className="grid min-w-0 gap-5 border-b border-neutral-300 pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div className="min-w-0">
              <p className="break-words text-2xl font-bold tracking-[0.18em] sm:tracking-[0.22em]">
                CRUISIN
              </p>
            </div>
            <div className="min-w-0 text-left sm:text-right">
              <h1 className="text-2xl font-semibold">TAX INVOICE</h1>
              <p className="mt-2 break-all font-mono text-sm">
                {value.invoiceNumber}
              </p>
            </div>
          </header>
          <div className="grid gap-5 border-b border-neutral-200 py-5 text-sm sm:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-neutral-500">Invoice date</p>
              <p className="mt-1 font-medium">{date(value.invoiceDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Order number</p>
              <p className="mt-1 font-medium">{value.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">Order date</p>
              <p className="mt-1 font-medium">{date(value.orderDate)}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-neutral-500">
                Place of supply
              </p>
              <p className="mt-1 font-medium">
                {value.placeOfSupply?.state || "—"}
              </p>
            </div>
          </div>
          <div className="grid min-w-0 gap-6 py-6 text-sm sm:grid-cols-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Seller
              </p>
              <p className="mt-3 break-words leading-6 text-neutral-600">
                {[
                  value.seller?.tradeName,
                  value.seller?.registeredAddress,
                  value.seller?.state,
                  value.seller?.gstin ? `GSTIN: ${value.seller.gstin}` : "",
                  value.seller?.phone,
                  value.seller?.email,
                ]
                  .filter(Boolean)
                  .join(", ") || "—"}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Bill to
              </p>
              <p className="mt-3 break-words leading-6 text-neutral-600">
                {lines(value.billingAddress)}
              </p>
              <p className="mt-1 break-all text-neutral-600">
                {value.customer.email}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                Ship to
              </p>
              <p className="mt-3 break-words leading-6 text-neutral-600">
                {lines(value.shippingAddress)}
              </p>
            </div>
          </div>
          <p className="mb-2 text-xs text-neutral-500">
            Swipe or scroll horizontally to view the complete tax breakdown.
          </p>
          <div
            className="max-w-full min-w-0 touch-pan-x overflow-x-auto overscroll-x-contain pb-2 [scrollbar-gutter:stable]"
            tabIndex={0}
            aria-label="Invoice line items; scroll horizontally"
          >
            <table className="w-max min-w-[760px] border-collapse text-left text-xs">
              <thead className="bg-neutral-900 text-white">
                <tr>
                  {[
                    "Item / SKU",
                    "HSN",
                    "Qty",
                    "Rate incl. GST",
                    "Discount",
                    "Taxable",
                    "GST",
                    "Total",
                  ].map((label) => (
                    <th
                      key={label}
                      className="p-3 font-medium uppercase tracking-[0.08em]"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.items?.map((item) => (
                  <tr
                    key={item.sku + item.variant}
                    className="border-b border-neutral-200"
                  >
                    <td className="p-3">
                      <p className="font-semibold">{item.productName}</p>
                      <p className="mt-1 text-neutral-500">{item.variant}</p>
                      <p className="font-mono text-neutral-500">{item.sku}</p>
                    </td>
                    <td className="p-3">{item.hsn || "—"}</td>
                    <td className="p-3">{item.quantity}</td>
                    <td className="p-3">{formatPrecisePrice(item.unitPrice)}</td>
                    <td className="p-3">{formatPrecisePrice(item.discount)}</td>
                    <td className="p-3">{formatPrecisePrice(item.taxableValue)}</td>
                    <td className="p-3">{item.gstRate}% included</td>
                    <td className="p-3 font-semibold">
                      {formatPrecisePrice(item.lineTotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="ml-auto mt-6 w-full max-w-sm text-sm">
            {totalRows
              .filter(
                ([label, amount]) =>
                  amount !== 0 ||
                  ["Subtotal", "Taxable value", "Total GST"].includes(label),
              )
              .map(([label, amount]) => (
                <div
                  key={label}
                  className="flex justify-between gap-4 py-1.5 text-neutral-600"
                >
                  <span>{label}</span>
                  <span className="font-mono">{formatPrecisePrice(amount)}</span>
                </div>
              ))}
            <div className="mt-2 flex justify-between border-t border-neutral-900 pt-3 text-base font-bold">
              <span>Grand total</span>
              <span className="font-mono">{formatPrecisePrice(value.grandTotal)}</span>
            </div>
          </div>
          <footer className="mt-10 border-t border-neutral-200 pt-5">
            <p className="font-semibold">
              {value.seller?.footer || "Thank you for shopping with Cruisin."}
            </p>
            <p className="mt-2 text-xs text-neutral-500">
              This is a computer-generated invoice.
            </p>
          </footer>
        </article>
        <aside className="grid min-w-0 content-start gap-4">
          <AdminCard compact>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Download status
            </p>
            <div className="mt-3">
              <StatusPill
                tone={
                  value.downloadStatus === "downloaded" ? "success" : "neutral"
                }
              >
                {value.downloadStatus === "downloaded"
                  ? "Downloaded"
                  : "Not downloaded"}
              </StatusPill>
            </div>
            {value.lastDownloadedAt ? (
              <p className="mt-4 text-xs leading-5 text-text-muted">
                Last downloaded {date(value.lastDownloadedAt)} ·{" "}
                {value.downloadCount ?? 1} total
              </p>
            ) : (
              <p className="mt-4 text-xs leading-5 text-text-muted">
                No PDF export has been recorded.
              </p>
            )}
          </AdminCard>
          <AdminCard compact>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Invoice status
            </p>
            <div className="mt-3">
              <StatusPill tone="success">{value.invoiceStatus}</StatusPill>
            </div>
            <p className="mt-4 text-xs text-text-muted">
              Issued {date(value.invoiceDate)} · FY {value.financialYear}
            </p>
          </AdminCard>
          <AdminCard compact>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Current order state
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill
                tone={
                  value.currentPaymentStatus === "paid" ||
                  value.currentPaymentStatus === "cod_collected"
                    ? "success"
                    : "warning"
                }
              >
                {value.currentPaymentStatus.replaceAll("_", " ")}
              </StatusPill>
              <StatusPill
                tone={
                  value.currentOrderStatus === "cancelled"
                    ? "danger"
                    : value.currentOrderStatus === "delivered"
                      ? "success"
                      : "warning"
                }
              >
                {value.currentOrderStatus}
              </StatusPill>
            </div>
            <p className="mt-4 text-xs leading-5 text-text-muted">
              Refunds and cancellations remain visible without changing the
              issued invoice snapshot.
            </p>
          </AdminCard>
          <AdminCard compact>
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Payment at issue
            </p>
            <p className="mt-3 uppercase text-text-primary">
              {value.paymentMethod}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              {value.paymentStatus.replaceAll("_", " ")}
            </p>
          </AdminCard>
        </aside>
      </div>
    </section>
  );
}
