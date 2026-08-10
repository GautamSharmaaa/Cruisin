// Governed by .rules v1.0
"use client";
import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLogisticsAction, useShipments } from "@/hooks/useLogistics";
import { formatPrice } from "@/lib/utils";
export function OrderShippingPanel({
  orderId,
}: {
  orderId: string;
}): ReactNode {
  const shipments = useShipments({ orderId, limit: 10 });
  const action = useLogisticsAction();
  const [notice, setNotice] = useState("");
  const providerOrderCreated = Boolean(
    shipments.data?.items.some(
      (shipment) => shipment.providerOrderId && shipment.providerShipmentId,
    ),
  );

  const prepareShipment = (): void => {
    setNotice("");
    action.mutate(
      { path: `/admin/logistics/orders/${orderId}/create` },
      {
        onSuccess: async () => {
          setNotice(
            "Shiprocket provider order created successfully. Review the provider reference below before assigning an AWB.",
          );
          await shipments.refetch();
        },
      },
    );
  };

  return (
    <article className="border border-border bg-background-elevated p-6">
      <h2 className="font-display text-xl">Shipping operations</h2>
      <p className="mt-2 text-sm text-text-secondary">
        Payment and fulfilment stay separate. Create a provider order only after
        package measurements are ready.
      </p>
      {!shipments.isLoading && providerOrderCreated ? (
        <div
          role="status"
          className="mt-5 border border-success/40 bg-success/10 p-4"
        >
          <p className="text-sm font-medium text-text-primary">
            Shipment prepared successfully
          </p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            The Shiprocket provider order has been created. Review the provider
            references below before assigning an AWB or scheduling pickup.
          </p>
        </div>
      ) : null}
      {!shipments.isLoading && shipments.data?.items.length && !providerOrderCreated ? (
        <div role="status" className="mt-5 border border-accent-gold/40 bg-accent-gold/10 p-4">
          <p className="text-sm font-medium text-text-primary">Local shipment draft ready</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            No Shiprocket provider order exists yet. Create it manually when live mutations are enabled and the package details are confirmed.
          </p>
        </div>
      ) : null}
      <div className="mt-4 grid gap-3">
        {shipments.data?.items.map((shipment) => (
          <div
            key={shipment._id}
            className="border-l border-accent-gold pl-4 text-sm"
          >
            <p className="text-text-primary">
              {shipment.shipmentStatus.replaceAll("_", " ")}
            </p>
            <div className="mt-1 grid gap-1 font-mono text-xs text-text-muted sm:grid-cols-2">
              <p>Order: {shipment.providerOrderId ?? "Pending"}</p>
              <p>Shipment: {shipment.providerShipmentId ?? "Draft"}</p>
              {shipment.awb ? <p className="sm:col-span-2">AWB: {shipment.awb}</p> : null}
            </div>
            <dl className="mt-3 grid gap-x-8 gap-y-2 text-xs text-text-secondary md:grid-cols-2">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <dt>Customer delivery</dt>
                <dd className="text-right font-mono">
                  {shipment.shippingChargeCollected === undefined
                    ? "Unavailable"
                    : formatPrice(shipment.shippingChargeCollected)}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <dt>Courier freight</dt>
                <dd className="text-right font-mono">
                  {shipment.providerShippingCost === undefined
                    ? "Unavailable"
                    : formatPrice(shipment.providerShippingCost)}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <dt>Shiprocket COD</dt>
                <dd className="text-right font-mono">
                  {shipment.codCharge === undefined
                    ? "Unavailable"
                    : formatPrice(shipment.codCharge)}
                </dd>
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                <dt>Known shipping margin</dt>
                <dd className="text-right font-mono">
                  {shipment.shippingChargeCollected === undefined ||
                  shipment.providerShippingCost === undefined ||
                  shipment.codCharge === undefined
                    ? "Unavailable"
                    : formatPrice(
                        shipment.shippingChargeCollected -
                          shipment.providerShippingCost -
                          shipment.codCharge,
                      )}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
      {notice ? (
        <p
          aria-live="polite"
          className="mt-5 border border-success/40 bg-success/10 p-3 text-sm text-text-primary"
        >
          {notice}
        </p>
      ) : null}
      {action.error ? (
        <p
          role="alert"
          className="mt-5 border border-danger/40 bg-danger/10 p-3 text-sm text-danger"
        >
          Shipment preparation failed: {action.error.message}
        </p>
      ) : null}
      {!shipments.isLoading && !providerOrderCreated ? (
        <Button
          className="mt-5"
          onClick={prepareShipment}
          disabled={action.isPending}
        >
          {action.isPending ? "Creating Shiprocket order…" : "Create Shiprocket order"}
        </Button>
      ) : null}
    </article>
  );
}
