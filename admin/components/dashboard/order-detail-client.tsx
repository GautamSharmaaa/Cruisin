// Governed by .rules v1.0
"use client";

import {
  CreditCard,
  MapPin,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Truck,
} from "lucide-react";
import type { ReactNode } from "react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { COPY } from "@/constants/copy";
import {
  useOrderPaymentAction,
  useUpdateOrderStatus,
} from "@/hooks/useAdminMutations";
import { useAdminOrder } from "@/hooks/useAdminResources";
import { formatPrecisePrice, formatPrice } from "@/lib/utils";
import type { OrderDto } from "@/types/dto.types";
import { OrderShippingPanel } from "@/components/logistics/order-shipping-panel";

export interface OrderDetailClientProps {
  id: string;
}
type OrderStatus =
  | "pending"
  | "placed"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

const orderTransitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  placed: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};
const statusLabel = (value: string): string =>
  value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusOptionsFor = (current: OrderStatus) =>
  [current, ...orderTransitions[current]].map((value) => ({
    value,
    label:
      value === "placed"
        ? "Placed"
        : value === "returned"
          ? "Returned"
          : (COPY.orders.statuses[value as keyof typeof COPY.orders.statuses] ??
            statusLabel(value)),
  }));
const line = (parts: Array<string | undefined>): string =>
  parts.filter(Boolean).join(", ");
const formatDate = (value?: string): string => {
  if (!value) return "Not available";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-IN");
};
const committedRefundStatuses = new Set(["created", "pending", "processed"]);
const pendingRefundStatuses = new Set(["created", "pending"]);

function CancellationReview({ order }: { order: OrderDto }): ReactNode {
  if (!order.cancellation) return null;
  return (
    <article className="border border-danger/50 bg-danger/10 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <RotateCcw className="h-5 w-5 text-danger" aria-hidden="true" />
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-text-muted">
              Cancellation request
            </p>
            <h2 className="mt-1 font-display text-xl">
              {order.cancellation.reason}
            </h2>
          </div>
        </div>
        <span className="w-fit border border-danger/50 px-3 py-1 text-xs uppercase tracking-[0.12em] text-text-primary">
          Refund {statusLabel(order.cancellation.refundStatus)}
        </span>
      </div>
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-text-muted">
            Requested by
          </dt>
          <dd className="mt-1 text-text-primary">
            {statusLabel(order.cancellation.requestedBy)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-text-muted">
            Cancelled at
          </dt>
          <dd className="mt-1 text-text-primary">
            {formatDate(order.cancellation.cancelledAt)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-[0.12em] text-text-muted">
            Refunded
          </dt>
          <dd className="mt-1 font-mono text-text-primary">
            {formatPrice(order.cancellation.refundAmount ?? 0)}
          </dd>
        </div>
        {order.cancellation.details ? (
          <div className="sm:col-span-3">
            <dt className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Customer explanation
            </dt>
            <dd className="mt-1 leading-6 text-text-secondary">
              {order.cancellation.details}
            </dd>
          </div>
        ) : null}
      </dl>
    </article>
  );
}

export function OrderDetailClient({ id }: OrderDetailClientProps): ReactNode {
  const order = useAdminOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const paymentAction = useOrderPaymentAction();
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [note, setNote] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [operationNotice, setOperationNotice] = useState("");
  const refundAttempt = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  if (order.isLoading)
    return <p className="text-sm text-text-secondary">{COPY.common.loading}</p>;
  if (!order.data)
    return <p className="text-sm text-danger">{COPY.common.error}</p>;

  const current = order.data;
  const displayId = current.id ?? current._id ?? id;
  const currentStatus = current.orderStatus as OrderStatus;
  const selectedStatus = (status || currentStatus) as OrderStatus;
  const canRecordCollection = currentStatus !== "cancelled";
  const committedRefundTotal = (current.refunds ?? [])
    .filter((refund) => committedRefundStatuses.has(refund.status))
    .reduce((sum, refund) => sum + refund.amount, 0);
  const pendingRefundTotal = (current.refunds ?? [])
    .filter((refund) => pendingRefundStatuses.has(refund.status))
    .reduce((sum, refund) => sum + refund.amount, 0);
  const availableRefund = Math.max(
    0,
    (current.amountPaid ?? 0) - committedRefundTotal,
  );
  const hasProviderRefund = (current.refunds ?? []).some((refund) =>
    Boolean(refund.providerRefundId),
  );
  const canRefund =
    current.paymentProvider === "razorpay" &&
    Boolean(current.razorpayPaymentId) &&
    availableRefund > 0;
  const effectiveRefundReason =
    refundReason.trim() ||
    (current.cancellation
      ? `Order cancellation: ${current.cancellation.reason}${current.cancellation.details ? ` — ${current.cancellation.details}` : ""}`
      : "");
  const requestedRefundAmount = Number(refundAmount);
  const validRefund =
    Number.isFinite(requestedRefundAmount) &&
    requestedRefundAmount > 0 &&
    requestedRefundAmount <= availableRefund &&
    effectiveRefundReason.length >= 3;
  const productCosts = (current.items ?? []).reduce(
    (totals, item) => {
      const quantity = item.quantity ?? 0;
      const breakdown = item.unitCostBreakdown ?? {};
      totals.manufacturing += (breakdown.manufacturing ?? 0) * quantity;
      totals.packaging += (breakdown.packaging ?? 0) * quantity;
      totals.marketing += (breakdown.marketing ?? 0) * quantity;
      totals.handling += (breakdown.handling ?? 0) * quantity;
      totals.other += (breakdown.other ?? 0) * quantity;
      totals.total +=
        (item.unitCostTotal ??
          Object.values(breakdown).reduce(
            (sum, value) => sum + (value ?? 0),
            0,
          )) * quantity;
      return totals;
    },
    {
      manufacturing: 0,
      packaging: 0,
      marketing: 0,
      handling: 0,
      other: 0,
      total: 0,
    },
  );
  const hasCompleteProductCostSnapshot =
    Boolean(current.items?.length) &&
    (current.items ?? []).every((item) => item.unitCostTotal !== undefined);

  const onUpdate = (): void => {
    if (selectedStatus === "cancelled" && note.trim().length < 3) {
      window.alert(
        "Add an admin note explaining why this order is being cancelled.",
      );
      return;
    }
    if (
      selectedStatus === "cancelled" &&
      !window.confirm(COPY.orders.confirmCancel)
    )
      return;
    updateStatus.mutate(
      {
        id: displayId,
        status: selectedStatus,
        note: note.trim() || undefined,
        trackingNumber: trackingNumber.trim() || current.trackingNumber,
      },
      {
        onSuccess: () => {
          setStatus("");
          setNote("");
          setOperationNotice("Order status updated.");
        },
      },
    );
  };

  const requestRefund = (): void => {
    if (!validRefund) return;
    if (
      !window.confirm(
        `Issue a ${formatPrice(requestedRefundAmount)} Razorpay refund for ${current.orderNumber ?? displayId}?`,
      )
    )
      return;
    const fingerprint = `${requestedRefundAmount}|${effectiveRefundReason}`;
    if (refundAttempt.current?.fingerprint !== fingerprint)
      refundAttempt.current = { fingerprint, key: crypto.randomUUID() };
    paymentAction.mutate(
      {
        id: displayId,
        action: "refund",
        amount: requestedRefundAmount,
        reason: effectiveRefundReason,
        idempotencyKey: refundAttempt.current.key,
      },
      {
        onSuccess: () => {
          setRefundAmount("");
          setRefundReason("");
          setOperationNotice(
            "Refund submitted to Razorpay. Use Sync refund status to reconcile the latest provider result.",
          );
        },
      },
    );
  };

  const syncRefund = (): void => {
    paymentAction.mutate(
      { id: displayId, action: "sync-refund" },
      {
        onSuccess: () =>
          setOperationNotice("Refund status synchronized with Razorpay."),
      },
    );
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.15em] text-accent-gold">
            {current.orderNumber ?? displayId}
          </p>
          <h1 className="mt-2 font-display text-3xl">{COPY.orders.detail}</h1>
          <p className="mt-2 text-xs text-text-muted">
            Placed {formatDate(current.createdAt)}
          </p>
        </div>
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[200px_240px_auto]">
          <SelectField
            label={COPY.fields.status}
            options={statusOptionsFor(currentStatus)}
            value={selectedStatus}
            onChange={(event) => setStatus(event.target.value as OrderStatus)}
          />
          <Input
            label={COPY.orders.tracking}
            value={trackingNumber || current.trackingNumber || ""}
            onChange={(event) => setTrackingNumber(event.target.value)}
          />
          <Button
            className="w-full self-end sm:col-span-2 xl:col-span-1"
            onClick={onUpdate}
            disabled={
              updateStatus.isPending ||
              (selectedStatus === currentStatus &&
                !note.trim() &&
                !trackingNumber.trim())
            }
          >
            {updateStatus.isPending ? COPY.common.loading : COPY.orders.update}
          </Button>
        </div>
      </div>
      <Input
        label={
          selectedStatus === "cancelled"
            ? `${COPY.orders.note} (required for cancellation)`
            : COPY.orders.note
        }
        value={note}
        maxLength={500}
        onChange={(event) => setNote(event.target.value)}
      />

      <CancellationReview order={current} />
      <OrderShippingPanel orderId={displayId} />

      <div className="grid gap-6 lg:grid-cols-3">
        <article className="border border-border bg-background-elevated p-6">
          <div className="flex items-center gap-3">
            <CreditCard
              className="h-5 w-5 text-accent-gold"
              aria-hidden="true"
            />
            <h2 className="font-display text-xl">Payment</h2>
          </div>
          <p className="mt-4 text-sm text-text-secondary">
            {statusLabel(current.paymentMode ?? "online")} ·{" "}
            {statusLabel(current.paymentStatus)}
          </p>
          <div className="mt-3 grid gap-2 font-mono text-sm">
            <p className="flex justify-between gap-3">
              <span className="text-text-muted">Paid</span>
              <span className="text-text-primary">
                {formatPrice(current.amountPaid ?? 0)}
              </span>
            </p>
            <p className="flex justify-between gap-3">
              <span className="text-text-muted">Refunded</span>
              <span className="text-text-primary">
                {formatPrice(current.refundAmount ?? 0)}
              </span>
            </p>
            {pendingRefundTotal > 0 ? (
              <p className="flex justify-between gap-3">
                <span className="text-text-muted">In refund processing</span>
                <span className="text-text-primary">
                  {formatPrice(pendingRefundTotal)}
                </span>
              </p>
            ) : null}
            <p className="flex justify-between gap-3">
              <span className="text-text-muted">Due</span>
              <span className="text-accent-gold">
                {formatPrice(
                  currentStatus === "cancelled"
                    ? 0
                    : (current.amountDue ?? current.total),
                )}
              </span>
            </p>
          </div>
          <p className="mt-4 break-all text-xs leading-5 text-text-muted">
            Razorpay order: {current.razorpayOrderId ?? "—"}
            <br />
            Payment: {current.razorpayPaymentId ?? "—"}
          </p>
        </article>

        <article className="border border-border bg-background-elevated p-6">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-accent-gold" aria-hidden="true" />
            <h2 className="font-display text-xl">{COPY.orders.shipping}</h2>
          </div>
          <p className="mt-4 text-sm font-medium text-text-primary">
            {current.shippingAddress?.fullName ?? COPY.common.none}
          </p>
          <p className="mt-2 text-sm leading-6 text-text-secondary">
            {line([
              current.shippingAddress?.line1,
              current.shippingAddress?.line2,
              current.shippingAddress?.city,
              current.shippingAddress?.state,
              current.shippingAddress?.postalCode,
              current.shippingAddress?.country,
            ]) || COPY.common.none}
          </p>
          <p className="mt-2 text-sm text-text-secondary">
            {current.shippingAddress?.phone ?? "No phone"}
          </p>
          <p className="mt-4 text-xs uppercase tracking-[0.12em] text-text-muted">
            {statusLabel(current.shippingMethod ?? "standard")} delivery
          </p>
        </article>

        <article className="border border-border bg-background-elevated p-6">
          <h2 className="font-display text-xl">Payment operations</h2>
          <p className="mt-2 text-xs leading-5 text-text-muted">
            Refunds are created and reconciled only through the backend Razorpay
            integration.
          </p>
          <div className="mt-4 grid gap-3">
            {canRecordCollection &&
            current.paymentMode === "cod" &&
            current.paymentStatus !== "paid" ? (
              <Button
                onClick={() =>
                  paymentAction.mutate(
                    { id: displayId, action: "mark-cod-paid" },
                    {
                      onSuccess: () =>
                        setOperationNotice("COD collection recorded."),
                    },
                  )
                }
                disabled={paymentAction.isPending}
              >
                Mark COD paid
              </Button>
            ) : null}
            {canRecordCollection &&
            current.paymentMode === "partial" &&
            current.amountDue ? (
              <Button
                onClick={() =>
                  paymentAction.mutate(
                    { id: displayId, action: "mark-partial-paid" },
                    {
                      onSuccess: () =>
                        setOperationNotice("Remaining collection recorded."),
                    },
                  )
                }
                disabled={paymentAction.isPending}
              >
                Mark remaining collected
              </Button>
            ) : null}
            {canRefund ? (
              <>
                <div className="grid items-end gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <div className="min-w-0 flex-1">
                    <Input
                      label={`Refund amount (max ${formatPrice(availableRefund)})`}
                      type="number"
                      min="1"
                      max={String(availableRefund)}
                      step="0.01"
                      value={refundAmount}
                      onChange={(event) => setRefundAmount(event.target.value)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-12 w-full px-4 sm:w-auto"
                    onClick={() => setRefundAmount(String(availableRefund))}
                  >
                    Max
                  </Button>
                </div>
                <Input
                  label={
                    current.cancellation
                      ? "Refund reason (cancellation reason used if blank)"
                      : "Refund reason (required)"
                  }
                  value={refundReason}
                  maxLength={500}
                  onChange={(event) => setRefundReason(event.target.value)}
                />
                <Button
                  variant="secondary"
                  onClick={requestRefund}
                  disabled={!validRefund || paymentAction.isPending}
                >
                  Issue Razorpay refund
                </Button>
              </>
            ) : (
              <p className="text-sm text-text-muted">
                {availableRefund <= 0 && (current.amountPaid ?? 0) > 0
                  ? "The entire paid amount is already refunded or reserved in an active refund."
                  : "No captured Razorpay amount is currently refundable."}
              </p>
            )}
            {hasProviderRefund ? (
              <Button
                variant="secondary"
                onClick={syncRefund}
                disabled={paymentAction.isPending}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${paymentAction.isPending ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Sync refund status
              </Button>
            ) : null}
          </div>
        </article>
      </div>

      {(current.refunds ?? []).length ? (
        <article className="border border-border bg-background-elevated p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-xl">Refund history</h2>
              <p className="mt-1 text-xs text-text-muted">
                Provider status is the source of truth.
              </p>
            </div>
            {hasProviderRefund ? (
              <Button
                variant="secondary"
                onClick={syncRefund}
                disabled={paymentAction.isPending}
              >
                <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                Sync latest
              </Button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-3">
            {current.refunds?.map((refund, index) => (
              <div
                key={
                  refund.providerRefundId ??
                  `${refund.amount}-${refund.createdAt}-${index}`
                }
                className="grid gap-1 border-l border-accent-gold pl-4 text-sm text-text-secondary"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-all font-mono text-text-primary">
                    {refund.providerRefundId ?? "Provider refund pending"}
                  </p>
                  <span className="border border-border px-2 py-1 text-xs uppercase tracking-[0.1em]">
                    {statusLabel(refund.status)}
                  </span>
                </div>
                <p>
                  {formatPrice(refund.amount)}
                  {refund.createdAt ? ` · ${formatDate(refund.createdAt)}` : ""}
                </p>
                {refund.reason ? (
                  <p className="leading-6">{refund.reason}</p>
                ) : null}
              </div>
            ))}
          </div>
        </article>
      ) : null}

      <div className="overflow-x-auto border border-border bg-background-elevated">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="text-xs uppercase tracking-[0.12em] text-text-secondary">
            <tr>
              <th className="border-b border-border p-4">Photo</th>
              <th className="border-b border-border p-4">Item</th>
              <th className="border-b border-border p-4">Variant</th>
              <th className="border-b border-border p-4">SKU</th>
              <th className="border-b border-border p-4">Quantity</th>
              <th className="border-b border-border p-4">Unit price</th>
              <th className="border-b border-border p-4">Internal unit cost</th>
              <th className="border-b border-border p-4">Line revenue</th>
              <th className="border-b border-border p-4">
                Product contribution
              </th>
            </tr>
          </thead>
          <tbody>
            {(current.items ?? []).map((item) => {
              const unitCost = item.unitCostTotal ?? 0;
              return (
                <tr
                  key={item.sku + item.title}
                  className="border-b border-border-subtle"
                >
                  <td className="p-4">
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={`${item.title}${item.color ? ` — ${item.color}` : ""}`}
                      className="h-20 w-16 bg-background-primary object-cover"
                    />
                  </td>
                  <td className="p-4 text-text-primary">{item.title}</td>
                  <td className="p-4 text-text-secondary">
                    {[item.color, item.size].filter(Boolean).join(" / ") ||
                      "Legacy order"}
                  </td>
                  <td className="p-4 font-mono text-text-secondary">
                    {item.sku}
                  </td>
                  <td className="p-4 text-text-secondary">{item.quantity}</td>
                  <td className="p-4 font-mono text-accent-gold">
                    {formatPrice(item.price)}
                  </td>
                  <td className="p-4 font-mono text-text-secondary">
                    {item.unitCostTotal === undefined
                      ? "Unavailable"
                      : formatPrecisePrice(unitCost)}
                  </td>
                  <td className="p-4 font-mono text-text-primary">
                    {formatPrice(item.price * item.quantity)}
                  </td>
                  <td className="p-4 font-mono text-text-primary">
                    {item.unitCostTotal === undefined
                      ? "Unavailable"
                      : formatPrecisePrice(
                          (item.price - unitCost) * item.quantity,
                        )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <article className="border border-border bg-background-elevated p-6">
          <div className="flex items-center gap-3">
            <Truck className="h-5 w-5 text-accent-gold" aria-hidden="true" />
            <h2 className="font-display text-xl">{COPY.orders.timeline}</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {[...(current.timeline ?? [])].reverse().map((event, index) => (
              <div
                key={`${event.status}-${event.timestamp}-${index}`}
                className="border-l border-accent-gold pl-4"
              >
                <p className="text-sm uppercase tracking-[0.12em] text-text-primary">
                  {statusLabel(event.status)}
                </p>
                <p className="mt-1 text-xs text-text-secondary">
                  {formatDate(event.timestamp)}
                </p>
                <p className="mt-1 text-sm leading-6 text-text-secondary">
                  {event.note ?? COPY.common.none}
                </p>
              </div>
            ))}
          </div>
        </article>
        <article className="border border-border bg-background-elevated p-6">
          <div className="flex items-center gap-3">
            <PackageCheck
              className="h-5 w-5 text-accent-gold"
              aria-hidden="true"
            />
            <h2 className="font-display text-xl">{COPY.orders.totals}</h2>
          </div>
          <div className="mt-4 grid gap-2 text-sm text-text-secondary">
            <p className="flex justify-between">
              <span>{COPY.orders.subtotal}</span>
              <span>{formatPrice(current.subtotal ?? 0)}</span>
            </p>
            <p className="flex justify-between">
              <span>{COPY.orders.tax}</span>
              <span>{formatPrice(current.tax ?? 0)}</span>
            </p>
            <p className="flex justify-between">
              <span>Customer delivery</span>
              <span>
                {(current.shipping ?? 0) === 0
                  ? "Free"
                  : formatPrice(current.shipping ?? 0)}
              </span>
            </p>
            <p className="flex justify-between">
              <span>COD fee collected</span>
              <span>{formatPrice(current.codFee ?? 0)}</span>
            </p>
            <p className="flex justify-between text-success">
              <span>{COPY.orders.discount}</span>
              <span>-{formatPrice(current.discount ?? 0)}</span>
            </p>
            <p className="mt-2 flex justify-between border-t border-border pt-3 font-mono text-lg text-accent-gold">
              <span>Total</span>
              <span>{formatPrice(current.total)}</span>
            </p>
          </div>
          <div className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-text-secondary">
            <p className="text-xs uppercase tracking-[0.12em] text-text-muted">
              Snapshotted product costs
            </p>
            {hasCompleteProductCostSnapshot ? (
              <>
                <p className="flex justify-between">
                  <span>Manufacturing</span>
                  <span>{formatPrecisePrice(productCosts.manufacturing)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Packaging</span>
                  <span>{formatPrecisePrice(productCosts.packaging)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Marketing</span>
                  <span>{formatPrecisePrice(productCosts.marketing)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Handling</span>
                  <span>{formatPrecisePrice(productCosts.handling)}</span>
                </p>
                <p className="flex justify-between">
                  <span>Other</span>
                  <span>{formatPrecisePrice(productCosts.other)}</span>
                </p>
                <p className="flex justify-between border-t border-border pt-2 font-mono text-text-primary">
                  <span>Total product cost</span>
                  <span>{formatPrecisePrice(productCosts.total)}</span>
                </p>
              </>
            ) : (
              <p className="font-mono text-text-muted">
                Unavailable for legacy orders
              </p>
            )}
            <p className="text-xs leading-5 text-text-muted">
              Courier, COD, RTO, return, and exchange costs appear in Shipping
              operations and are kept separate from product costs.
            </p>
          </div>
        </article>
      </div>

      {operationNotice ? (
        <p
          aria-live="polite"
          className="border border-success/40 bg-success/10 p-3 text-sm text-text-primary"
        >
          {operationNotice}
        </p>
      ) : null}
      {paymentAction.error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          {paymentAction.error.message}
        </p>
      ) : null}
      {updateStatus.error ? (
        <p
          role="alert"
          className="border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          {updateStatus.error.message}
        </p>
      ) : null}
    </section>
  );
}
