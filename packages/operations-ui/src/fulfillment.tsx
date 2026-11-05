"use client";
import { OPS_COPY as C } from "./constants/copy";
import { DETAIL_COPY as D } from "./constants/detail-copy";
import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Input,
  Field,
  DataTable,
  Dialog,
  Alert,
  FileUpload,
  Pagination,
  toast,
  renderLogisticsPrintPreview,
} from "@cruisin/ui";
import type { Principal } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { NativeSelect, useList, fail, upload, AttachmentList } from "./common";
import { Scanner } from "./scanner";
import type { PhysicalUnit } from "./units";
interface Props {
  timezone?: string;
  api: OperationsTransport;
  principal: Principal;
}
interface OrderRow {
  _id: string;
  orderNumber: string;
  orderStatus: string;
  fulfillmentStatus: string;
  items: { sku: string; size: string; color: string; quantity: number }[];
}
interface Parcel {
  version: number;
  stage: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  evidence: string[];
}
interface Shipment {
  _id: string;
  awb?: string;
  shipmentStatus: string;
  label?: { status: string; verificationId: string };
}
interface Detail {
  order: OrderRow;
  record: Parcel;
  units: PhysicalUnit[];
  shipments: Shipment[];
}
interface PanelProps extends Props {
  id: string;
}
function FulfillmentPanel({ api, principal, id }: PanelProps): ReactNode {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [policies, setPolicies] = useState<
    { courier: string; divisor: number }[]
  >([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = (): void => {
    void api
      .get<Detail>(`/fulfillment/${id}`)
      .then((d) => {
        setDetail(d);
        setEvidence(d.record?.evidence ?? []);
      })
      .catch((e) => setError(e.message));
  };
  useEffect(() => {
    reload();
    void api
      .get<typeof policies>("/courier-policies")
      .then(setPolicies)
      .catch(fail);
  }, [api, id]);
  const act = async (path: string, body: unknown): Promise<void> => {
    setBusy(true);
    setError(D.label);
    try {
      await api.post(`/fulfillment/${id}/${path}`, body);
      reload();
      toast.success(D.fulfillmentSaved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fulfillment failed");
    } finally {
      setBusy(false);
    }
  };
  if (!detail) return <Alert>{error || "Loading order…"}</Alert>;
  const shipment = detail.shipments.find((s) => s.awb);
  const record = detail.record;
  return (
    <div className="ui-stack">
      {error && <Alert tone="danger">{error}</Alert>}
      <p>
        {detail.order.orderNumber} · {record?.stage ?? "Awaiting task"}
      </p>
      <DataTable
        caption={D.requiredProducts}
        items={detail.order.items}
        keyOf={(r) => r.sku}
        columns={[
          { key: "sku", label: D.sku, render: (r) => r.sku },
          {
            key: "variant",
            label: D.sizeColor,
            render: (r) => `${r.size ?? ""} / ${r.color ?? ""}`,
          },
          { key: "quantity", label: D.quantity, render: (r) => r.quantity },
        ]}
      />
      {record?.stage === "PICKING" && (
        <>
          <Scanner
            onScan={async (code) => {
              await api.post(`/units/${encodeURIComponent(code)}/pick`, {
                order: id,
              });
              reload();
              toast.success(D.reservedUnitPicked);
            }}
          />
          <p>
            {D.picked}
            {detail.units.filter((u) => u.state === "PICKED").length}
            {D.of} {detail.order.items.reduce((n, i) => n + i.quantity, 0)}
          </p>
          <form
            className="ui-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void act("measure", {
                version: record.version,
                courier: f.get("courier"),
                weightKg: Number(f.get("weight")),
                lengthCm: Number(f.get("length")),
                widthCm: Number(f.get("width")),
                heightCm: Number(f.get("height")),
                evidence,
              });
            }}
          >
            <Field label={D.courierMeasurementPolicy}>
              <select className="ui-input" name="courier" required>
                <option value="">{D.chooseConfiguredCourier}</option>
                {policies.map((p) => (
                  <option key={p.courier}>{p.courier}</option>
                ))}
              </select>
            </Field>
            {[
              ["weight", "Actual parcel weight (kg)"],
              ["length", "Length (cm)"],
              ["width", "Width (cm)"],
              ["height", "Height (cm)"],
            ].map(([name, label]) => (
              <Field key={name} label={label}>
                <Input
                  name={name}
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </Field>
            ))}
            <FileUpload
              accept="image/*"
              onFile={(file) => {
                void upload(api, file)
                  .then((id) => setEvidence((a) => [...a, id]))
                  .catch(fail);
              }}
            />
            <AttachmentList ids={evidence} api={api} />
            <Button type="submit" disabled={busy}>
              {D.verifyPackageMeasurementsAndEvidence}
            </Button>
          </form>
        </>
      )}
      {record?.stage === "PACKED" && (
        <>
          <p>{D.packedShippingDocumentsAndAwbMustBeVerified}</p>
          {principal.permissions.includes("shipping.prepare") && (
            <div className="ui-row">
              {(["prepare", "awb", "label", "pickup", "manifest"] as const).map(
                (action) => (
                  <Button
                    key={action}
                    disabled={busy}
                    onClick={() => void act("shipping", { action })}
                  >
                    {action}
                  </Button>
                ),
              )}
            </div>
          )}
          {shipment && (
            <>
              <p>
                {D.awb}
                {shipment.awb} · {shipment.shipmentStatus}
              </p>
              <Button
                disabled={busy || shipment.label?.status !== "ready"}
                onClick={() => {
                  const popup = window.open("about:blank", "_blank");
                  if (!popup) {
                    setError(C.allowPrintPopup);
                    return;
                  }
                  popup.opener = null;
                  void api
                    .get<{ kind: string; url: string }>(
                      `/fulfillment/${id}/label`,
                    )
                    .then((document) =>
                      renderLogisticsPrintPreview(popup, document),
                    )
                    .catch((error) => {
                      popup.close();
                      fail(error);
                    });
                }}
              >
                {D.openShippingLabelPrint}
              </Button>
              <Button
                disabled={busy || !shipment.label?.verificationId}
                onClick={() =>
                  void act("ready", {
                    version: record.version,
                    shipment: shipment._id,
                    awb: shipment.awb,
                    labelOperationId: shipment.label?.verificationId,
                  })
                }
              >
                {D.confirmAttachedShippingLabelMatchesThisAwb}
              </Button>
            </>
          )}
        </>
      )}
      {record?.stage === "READY_FOR_HANDOVER" &&
        principal.permissions.includes("shipping.prepare") && (
          <Button
            disabled={busy}
            onClick={() => void act("handover", { version: record.version })}
          >
            {D.recordCourierHandover}
          </Button>
        )}
      {record?.stage === "HANDED_OVER" && (
        <p>{D.handedOverWaitingForCarrierConfirmation}</p>
      )}
    </div>
  );
}
export function Fulfillment({
  api,
  principal,
  timezone = "Asia/Kolkata",
}: Props): ReactNode {
  const [exchangeOptions, setExchangeOptions] = useState<
    { _id: string; requestNumber: string }[]
  >([]);
  const [orderOptions, setOrderOptions] = useState<
    { _id: string; orderNumber: string }[]
  >([]);
  useEffect(() => {
    if (principal.kind === "admin") {
      void api
        .get<typeof exchangeOptions>("/exchange-options")
        .then(setExchangeOptions)
        .catch(fail);
      void api
        .get<typeof orderOptions>("/order-options")
        .then(setOrderOptions)
        .catch(fail);
    }
  }, [api, principal]);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<OrderRow>(
    api,
    `/fulfillment?timezone=${encodeURIComponent(timezone)}${from ? `&from=${encodeURIComponent(from + ":00Z")}` : ""}${to ? `&to=${encodeURIComponent(to + ":00Z")}` : ""}`,
    q,
    filter,
    page,
  );
  return (
    <Card title={D.assignedOrdersAndFulfillment}>
      <Field label={D.orderSearch}>
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
      </Field>
      <div className="ui-row">
        <Field label={C.fromUtc}>
          <Input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        <Field label={C.toUtc}>
          <Input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
          />
        </Field>
      </div>
      <Field label={D.orderPeriod}>
        <select
          className="ui-input"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            {C.today} ({timezone})
          </option>
          <option value="all">{D.allAuthorizedOrders}</option>
        </select>
      </Field>
      {list.error && <Alert tone="danger">{list.error}</Alert>}
      {list.data && (
        <>
          <DataTable
            caption={D.authorizedOrders}
            items={list.data.items}
            keyOf={(r) => r._id}
            columns={[
              { key: "order", label: D.order, render: (r) => r.orderNumber },
              {
                key: "status",
                label: D.status,
                render: (r) => r.fulfillmentStatus,
              },
              {
                key: "open",
                label: D.fulfillment,
                render: (r) => (
                  <Dialog
                    title={r.orderNumber}
                    trigger={
                      <Button variant="secondary">{D.openFulfillment}</Button>
                    }
                  >
                    <FulfillmentPanel
                      api={api}
                      principal={principal}
                      id={r._id}
                    />
                  </Dialog>
                ),
              },
            ]}
          />
          <Pagination page={page} pages={list.data.pages} onChange={setPage} />
        </>
      )}
      {principal.kind === "admin" && (
        <Dialog
          title={C.linkReplacement}
          trigger={<Button variant="secondary">{C.linkReplacement}</Button>}
        >
          <form
            className="ui-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void api
                .post(`/exchanges/${f.get("exchange")}/replacement`, {
                  order: f.get("order"),
                })
                .then(() => toast.success(C.replacementLinked))
                .catch(fail);
            }}
          >
            <Field label={C.exchangeRequest}>
              <select className="ui-input" name="exchange" required>
                <option value="">—</option>
                {exchangeOptions.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.requestNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={C.replacementOrder}>
              <select className="ui-input" name="order" required>
                <option value="">—</option>
                {orderOptions.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.orderNumber}
                  </option>
                ))}
              </select>
            </Field>
            <p>{C.replacementRequirements}</p>
            <Button type="submit">{C.linkReplacement}</Button>
          </form>
        </Dialog>
      )}
      {principal.kind === "admin" && (
        <Dialog
          title={D.configureCourierMeasurements}
          trigger={
            <Button variant="secondary">{D.courierMeasurementPolicy}</Button>
          }
        >
          <form
            className="ui-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void api
                .post("/courier-policies", {
                  courier: f.get("courier"),
                  divisor: Number(f.get("divisor")),
                  minWeightKg: Number(f.get("min")),
                  maxWeightKg: Number(f.get("max")),
                  requireEvidence: true,
                })
                .then(() => toast.success(D.courierPolicySaved))
                .catch(fail);
            }}
          >
            {[
              ["courier", "Courier / service"],
              ["divisor", "Configured volumetric divisor (cm³/kg)"],
              ["min", "Minimum weight (kg)"],
              ["max", "Maximum weight (kg)"],
            ].map(([name, label]) => (
              <Field key={name} label={label}>
                <Input
                  name={name}
                  type={name === "courier" ? "text" : "number"}
                  min="0.001"
                  step="any"
                  required
                />
              </Field>
            ))}
            <Button type="submit">{D.savePolicy}</Button>
          </form>
        </Dialog>
      )}
    </Card>
  );
}
