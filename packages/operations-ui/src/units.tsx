"use client";
import { OPS_COPY as C } from "./constants/copy";
import ReactMarkdown from "react-markdown";
import { DETAIL_COPY as D } from "./constants/detail-copy";
import { useEffect, useState, type ReactNode } from "react";
import {
  Button,
  Card,
  Field,
  Input,
  DataTable,
  Dialog,
  Alert,
  Status,
  FileUpload,
  Pagination,
  Skeleton,
  toast,
} from "@cruisin/ui";
import type { Principal, InventoryRow, Sop } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { useList, NativeSelect, upload, fail, AttachmentList } from "./common";
import { Scanner } from "./scanner";
interface Requirement {
  key: string;
  label: string;
  mandatory: boolean;
  photo: boolean;
  scan: boolean;
}
export interface PhysicalUnit {
  inspectionHistory?:{_id:string;kind:string;sopVersion:number;createdAt:string;snapshot:{result:string;evidence?:string[];measurements?:Record<string,number>;reason?:string;defectCategory?:string}}[];
  _id: string;
  unitId: string;
  code: string;
  sku: string;
  product: string;
  variant: string;
  state: string;
  location: string;
  version: number;
  order?: string;
  qc?: { sop: string; sopVersion: number };
  packaging?: { sop: string; sopVersion: number };
  history: { action: string; from: string; to: string; at: string }[];
}
interface Props {
  api: OperationsTransport;
  principal: Principal;
}
interface UnitPanelProps extends Props {
  unit: PhysicalUnit;
  onSaved: () => void;
}
export function UnitPanel({
  api,
  principal,
  unit: initial,
  onSaved,
}: UnitPanelProps): ReactNode {
  const [returns, setReturns] = useState<
    { _id: string; requestNumber: string }[]
  >([]);
  useEffect(() => {
    if (
      principal.permissions.includes("inventory.adjust.approve") &&
      ["SHIPPED", "HANDED_OVER", "RETURN_INSPECTION"].includes(initial.state)
    )
      void api
        .get<typeof returns>(`/inventory/${initial.variant}/returns`)
        .then(setReturns)
        .catch(fail);
  }, [api, initial.variant, initial.state, principal]);
  const [unit, setUnit] = useState(initial);
  const [sops, setSops] = useState<
    (Sop & { kind: string; requirements: Requirement[] })[]
  >([]);
  const [sop, setSop] = useState("");
  const [completed, setCompleted] = useState<string[]>([]);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [scan, setScan] = useState("");
  const [defectCategory, setDefectCategory] = useState("");
  const [defectReason, setDefectReason] = useState("");
  const [result, setResult] = useState("PASSED");
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [label, setLabel] = useState<{ svg: string; code: string } | null>(
    null,
  );
  const [printConfig, setPrintConfig] = useState({
    widthMm: 60,
    heightMm: 80,
    marginMm: 3,
    dpi: 203,
    orientation: "portrait",
    copies: 1,
  });
  const [calibration, setCalibration] = useState(false);
  useEffect(() => {
    void api
      .get<typeof printConfig | null>("/unit-label-config")
      .then((c) => {
        if (c) setPrintConfig(c);
      })
      .catch(fail);
  }, [api]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const kind = [
    "QC_PENDING",
    "QC_FAILED",
    "QUARANTINED",
    "RETURN_INSPECTION",
  ].includes(unit.state)
    ? "PRODUCT"
    : "PACKAGING";
  useEffect(() => {
    void api
      .get<{ items: typeof sops }>("/sops?limit=100")
      .then((r) =>
        setSops(
          r.items.filter(
            (s) =>
              s.kind === kind &&
              s.products?.includes(unit.product) &&
              s.publishedVersion,
          ),
        ),
      )
      .catch(fail);
  }, [api, kind, unit.product]);
  const selected = sops.find((s) => s._id === sop);
  const execute = async (path: string, body: unknown): Promise<void> => {
    setBusy(true);
    setError(D.label);
    try {
      const next = await api.post<PhysicalUnit>(
        `/units/${unit.unitId}/${path}`,
        body,
      );
      setUnit(await api.get<PhysicalUnit>(`/units/${next.unitId}`));
      setSop("");
      setCompleted([]);
      setEvidence([]);
      onSaved();
      toast.success(D.unitRecordSaved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to save unit");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="ui-stack">
      <Status>{unit.state}</Status>
      <p>
        {unit.sku} · {unit.unitId} · {unit.location}
      </p>
      {error && <Alert tone="danger">{error}</Alert>}
      {principal.permissions.includes("units.generate") && (
        <Button
          onClick={() =>
            void api
              .get<{ svg: string; code: string }>(`/units/${unit.unitId}/label`)
              .then(setLabel)
              .catch(fail)
          }
        >
          {D.labelPreviewReprint}
        </Button>
      )}
      {label && (
        <>
          <div className="ui-stack no-print">
            {principal.kind === "admin" && (
              <form
                className="ui-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  void api
                    .post("/unit-label-config", printConfig)
                    .then(() => toast.success(D.labelLayoutSaved))
                    .catch(fail);
                }}
              >
                {(
                  ["widthMm", "heightMm", "marginMm", "dpi", "copies"] as const
                ).map((key) => (
                  <Field label={key} key={key}>
                    <Input
                      type="number"
                      value={printConfig[key]}
                      onChange={(e) =>
                        setPrintConfig((c) => ({
                          ...c,
                          [key]: Number(e.target.value),
                        }))
                      }
                    />
                  </Field>
                ))}
                <Field label={D.orientation}>
                  <select
                    value={printConfig.orientation}
                    onChange={(e) =>
                      setPrintConfig((c) => ({
                        ...c,
                        orientation: e.target.value,
                      }))
                    }
                  >
                    <option>{D.portrait}</option>
                    <option>{D.landscape}</option>
                  </select>
                </Field>
                <Button type="submit">{D.saveLabelLayout}</Button>
              </form>
            )}
            <Button
              variant="secondary"
              onClick={() => setCalibration((c) => !c)}
            >
              {D.toggle10MmCalibrationSquare}
            </Button>
            <Button onClick={() => window.print()}>
              {D.printSystemPreview}
            </Button>
            <p>
              {D.configured}
              {printConfig.dpi}
              {D.dpiVerifyPhysicalDimensionsAndScanQualityWith}
            </p>
          </div>
          <style>{`@media print{@page{size:${printConfig.orientation === "landscape" ? printConfig.heightMm : printConfig.widthMm}mm ${printConfig.orientation === "landscape" ? printConfig.widthMm : printConfig.heightMm}mm;margin:${printConfig.marginMm}mm;}body *{visibility:hidden!important}.unit-print,.unit-print *{visibility:visible!important}.unit-print{position:absolute;inset:0;color:#000;background:#fff;}.no-print{display:none!important}}`}</style>
          <div className="unit-print">
            {calibration && (
              <div
                style={{
                  width: "10mm",
                  height: "10mm",
                  border: "1px solid currentColor",
                }}
              >
                {D.label10mm}
              </div>
            )}
            {Array.from({ length: printConfig.copies }, (_, copy) => (
              <div
                key={copy}
                className="unit-label"
                style={{ breakAfter: "page" }}
              >
                <strong>{D.cruisin}</strong>
                <p>{unit.sku}</p>
                <img
                  src={`data:image/svg+xml,${encodeURIComponent(label.svg)}`}
                  width={180}
                  height={180}
                  alt={`QR for ${unit.unitId}`}
                />
                <p>{unit.unitId}</p>
              </div>
            ))}
          </div>
        </>
      )}
      {["QC_FAILED", "QUARANTINED"].includes(unit.state) && (
        <form
          className="ui-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void api
              .post(`/units/${unit.unitId}/request-rework`, {
                version: unit.version,
                reason: f.get("reason"),
              })
              .then(() => toast.success(D.independentReworkApprovalRequested))
              .catch(fail);
          }}
        >
          <Field label={D.reworkReason}>
            <Input name="reason" required minLength={5} />
          </Field>
          <Button type="submit">{D.requestQcRework}</Button>
        </form>
      )}
      {["QC_PENDING", "RETURN_INSPECTION", "PACKAGING_PENDING"].includes(
        unit.state,
      ) && (
        <form
          className="ui-stack"
          onSubmit={(e) => {
            e.preventDefault();
            void execute(kind === "PRODUCT" ? "qc" : "package", {
              sop,
              completed,
              evidence,
              version: unit.version,
              ...(kind === "PRODUCT"
                ? {
                    result,
                    measurements,
                    scannedCode: scan || undefined,
                    ...(result !== "PASSED"
                      ? { defectCategory, reason: defectReason }
                      : {}),
                  }
                : { scannedCode: scan }),
            });
          }}
        >
          <Field
            label={
              kind === "PRODUCT"
                ? "Published Product SOP"
                : "Published Packaging SOP"
            }
          >
            <select
              className="ui-input"
              required
              value={sop}
              onChange={(e) => {
                setSop(e.target.value);
                setCompleted([]);
              }}
            >
              <option value="">{D.selectAProductSpecificPublication}</option>
              {sops.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.title}
                  {D.v}
                  {s.publishedVersion}
                </option>
              ))}
            </select>
          </Field>
          {selected && (
            <>
              <article className="ui-card">
                <h3>{selected.title}</h3>
                <ReactMarkdown>{selected.body}</ReactMarkdown>
                {selected.sections?.map((section, i) => (
                  <section key={i}>
                    <h4>{section.title}</h4>
                    <ReactMarkdown>{section.body}</ReactMarkdown>
                  </section>
                ))}
                <AttachmentList ids={selected.attachments} api={api} />
              </article>
              {selected.requirements.map((r) => (
                <Field
                  key={r.key}
                  label={`${r.label}${r.mandatory ? " (required)" : ""}${r.photo ? " · photo required" : ""}${r.scan ? " · scan required" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={completed.includes(r.key)}
                    onChange={(e) =>
                      setCompleted(
                        e.target.checked
                          ? [...completed, r.key]
                          : completed.filter((x) => x !== r.key),
                      )
                    }
                  />
                </Field>
              ))}
            </>
          )}
          {kind === "PRODUCT" && selected?.requirements.some((r) => r.scan) && (
            <Scanner
              onScan={async (code) => {
                if (code !== unit.code) throw new Error(D.wrongUnitQr);
                setScan(code);
              }}
            />
          )}
          {kind === "PRODUCT" ? (
            <>
              <Field label={D.qcDecision}>
                <select
                  className="ui-input"
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                >
                  <option>{D.passed}</option>
                  <option>{D.failed}</option>
                  <option>{D.reviewRequired}</option>
                </select>
              </Field>
              {result !== "PASSED" && (
                <>
                  <Field label={C.defectCategory}>
                    <Input
                      required
                      minLength={2}
                      value={defectCategory}
                      onChange={(e) => setDefectCategory(e.target.value)}
                    />
                  </Field>
                  <Field label={C.inspectionReason}>
                    <Input
                      required
                      minLength={5}
                      value={defectReason}
                      onChange={(e) => setDefectReason(e.target.value)}
                    />
                  </Field>
                </>
              )}
              {selected?.measurements?.map((rule) => (
                <Field
                  key={rule.key}
                  label={`${rule.label} (${rule.unit}) · ${rule.min}–${rule.max}`}
                >
                  <Input
                    type="number"
                    step="any"
                    required={rule.required}
                    value={measurements[rule.key] ?? ""}
                    onChange={(e) =>
                      setMeasurements((m) => ({
                        ...m,
                        [rule.key]: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
              ))}
              <Field
                label={D.measurementsNameValueOnePerLineAdministratorUnits}
              >
                <textarea
                  onChange={(e) => {
                    const entries = e.target.value
                      .split("\n")
                      .filter(Boolean)
                      .map((line) => line.split("="));
                    setMeasurements(
                      Object.fromEntries(
                        entries.map(([k, v]) => [k, Number(v)]),
                      ),
                    );
                  }}
                />
              </Field>
            </>
          ) : (
            <Scanner
              onScan={async (code) => {
                if (code !== unit.code)
                  throw new Error(D.wrongIndividualUnitQr);
                setScan(code);
                toast.success(D.unitLabelVerified);
              }}
            />
          )}
          <FileUpload
            accept="image/*"
            onFile={(file) => {
              void upload(api, file)
                .then((id) => setEvidence((a) => [...a, id]))
                .catch(fail);
            }}
          />
          <AttachmentList ids={evidence} api={api} />
          <Button
            type="submit"
            disabled={busy || !sop || (kind === "PACKAGING" && !scan)}
          >
            {kind === "PRODUCT"
              ? "Save QC inspection"
              : "Verify packaging and make available"}
          </Button>
        </form>
      )}
      {principal.permissions.includes("inventory.adjust.request") &&
        [
          "QC_PENDING",
          "QC_FAILED",
          "PACKAGING_PENDING",
          "PACKED_AVAILABLE",
          "QUARANTINED",
          "DAMAGED",
        ].includes(unit.state) && (
          <Dialog
            title={C.requestDisposition}
            trigger={
              <Button variant="secondary">{C.requestDisposition}</Button>
            }
          >
            <form
              className="ui-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void api
                  .post(`/units/${unit.unitId}/request-disposition`, {
                    version: unit.version,
                    state: f.get("state"),
                    reason: f.get("reason"),
                    evidence,
                  })
                  .then(() => toast.success(C.dispositionRequested))
                  .catch(fail);
              }}
            >
              <Field label={C.disposition}>
                <select name="state" className="ui-input">
                  <option value="QUARANTINED">{C.quarantine}</option>
                  <option value="DAMAGED">{C.damagedDisposition}</option>
                  <option value="RETURNED_TO_VENDOR">{C.returnVendor}</option>
                </select>
              </Field>
              <Field label={C.dispositionReason}>
                <Input name="reason" required minLength={5} />
              </Field>
              <FileUpload
                accept="image/*"
                onFile={(file) =>
                  void upload(api, file)
                    .then((id) => setEvidence((a) => [...a, id]))
                    .catch(fail)
                }
              />
              <AttachmentList ids={evidence} api={api} />
              <Button type="submit" disabled={!evidence.length}>
                {C.requestDisposition}
              </Button>
            </form>
          </Dialog>
        )}
      {principal.permissions.includes("inventory.adjust.approve") &&
        ["SHIPPED", "HANDED_OVER", "RETURN_INSPECTION"].includes(
          unit.state,
        ) && (
          <form
            className="ui-stack"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void execute("return", {
                returnRequest: f.get("return"),
                disposition: f.get("disposition"),
                reason: f.get("reason"),
                version: unit.version,
              });
            }}
          >
            <Field label={C.inspectedReturn}>
              <select className="ui-input" name="return" required>
                <option value="">—</option>
                {returns.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.requestNumber}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={C.disposition}>
              <select className="ui-input" name="disposition">
                <option value="REPACKAGE">{C.repackage}</option>
                <option value="QUARANTINE">{C.quarantine}</option>
                <option value="DAMAGED">{C.damagedDisposition}</option>
                <option value="RETURN_TO_VENDOR">{C.returnVendor}</option>
              </select>
            </Field>
            <Field label={C.dispositionReason}>
              <Input name="reason" required minLength={5} />
            </Field>
            <Button type="submit" disabled={busy}>
              {C.recordDisposition}
            </Button>
          </form>
        )}
      {unit.inspectionHistory&&<DataTable caption={C.inspectionHistory} items={unit.inspectionHistory} keyOf={r=>r._id} columns={[{key:'kind',label:C.inspectionType,render:r=>r.kind},{key:'version',label:C.sopVersionUsed,render:r=>r.sopVersion},{key:'result',label:C.status,render:r=>r.snapshot.result},{key:'details',label:C.details,render:r=><Dialog title={C.inspectionHistory} trigger={<Button variant="secondary">{C.details}</Button>}><p>{r.snapshot.reason??r.snapshot.defectCategory}</p><dl>{Object.entries(r.snapshot.measurements??{}).map(([k,v])=><div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl><AttachmentList ids={r.snapshot.evidence??[]} api={api}/></Dialog>}]}/>}
      <DataTable
        caption={D.unitHistory}
        items={unit.history}
        keyOf={(r) => r.at + r.action}
        columns={[
          { key: "action", label: D.action, render: (r) => r.action },
          { key: "to", label: D.state, render: (r) => r.to },
          { key: "at", label: D.timeUtc, render: (r) => r.at },
        ]}
      />
    </div>
  );
}
interface UnitDetailsProps extends Props {
  unitId: string;
  onSaved: () => void;
}
function UnitDetails({
  api,
  principal,
  unitId,
  onSaved,
}: UnitDetailsProps): ReactNode {
  const [unit, setUnit] = useState<PhysicalUnit | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void api
      .get<PhysicalUnit>(`/units/${unitId}`)
      .then(setUnit)
      .catch((e) => setError(e instanceof Error ? e.message : C.error));
  }, [api, unitId]);
  return error ? (
    <Alert tone="danger">{error}</Alert>
  ) : unit ? (
    <UnitPanel unit={unit} api={api} principal={principal} onSaved={onSaved} />
  ) : (
    <Skeleton />
  );
}
export function Units({ api, principal }: Props): ReactNode {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<PhysicalUnit>(api, "/units", q, "", page);
  const [variants, setVariants] = useState<InventoryRow[]>([]);
  const [reconciliation, setReconciliation] = useState<
    { sku: string; stock: number; reconciled: boolean }[] | null
  >(null);
  useEffect(() => {
    void api
      .get<{ items: InventoryRow[] }>("/inventory?limit=100")
      .then((r) => setVariants(r.items))
      .catch(fail);
  }, [api]);
  return (
    <div className="ui-stack">
      <Card title={D.physicalUnits}>
        <p>{D.receivingCreatesTraceableUnitsOnlyApprovedQcAnd}</p>
        <Field label={D.searchUnitSku}>
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </Field>
        {principal.permissions.includes("inventory.receive") && (
          <Dialog
            title={D.receivePhysicalUnits}
            trigger={<Button>{D.receiveUnits}</Button>}
          >
            <form
              className="ui-stack"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void api
                  .post("/units/receive", {
                    variant: f.get("variant"),
                    quantity: Number(f.get("quantity")),
                    location: f.get("location"),
                    idempotencyKey: crypto.randomUUID(),
                  })
                  .then(() => {
                    list.reload();
                    toast.success(D.receivedQcPending);
                  })
                  .catch(fail);
              }}
            >
              <Field label={D.variant}>
                <select className="ui-input" required name="variant">
                  <option value="">{D.chooseVariant}</option>
                  {variants.map((v) => (
                    <option key={v.variant} value={v.variant}>
                      {v.sku}
                      {D.available}
                      {v.available}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={D.quantity}>
                <Input
                  name="quantity"
                  type="number"
                  min={1}
                  max={500}
                  required
                />
              </Field>
              <Field label={D.rackBin}>
                <Input name="location" required />
              </Field>
              <Button type="submit">{D.receive}</Button>
            </form>
          </Dialog>
        )}
        <Button
          variant="secondary"
          onClick={() =>
            void api
              .get<typeof reconciliation>("/units/reconciliation")
              .then(setReconciliation)
              .catch(fail)
          }
        >
          {D.reconcileTrackedStock}
        </Button>
        {reconciliation && (
          <DataTable
            caption={D.commerceAvailabilityReconciliation}
            items={reconciliation}
            keyOf={(r) => r.sku}
            columns={[
              { key: "sku", label: D.sku, render: (r) => r.sku },
              { key: "stock", label: D.available46, render: (r) => r.stock },
              {
                key: "valid",
                label: D.reconciled,
                render: (r) => (r.reconciled ? "Yes" : "REVIEW REQUIRED"),
              },
            ]}
          />
        )}
        {list.error && <Alert tone="danger">{list.error}</Alert>}
        {list.data && (
          <>
            <DataTable
              caption={D.individualInventory}
              items={list.data.items}
              keyOf={(u) => u.unitId}
              columns={[
                { key: "sku", label: D.sku, render: (u) => u.sku },
                {
                  key: "state",
                  label: D.state,
                  render: (u) => <Status>{u.state}</Status>,
                },
                {
                  key: "location",
                  label: D.location,
                  render: (u) => u.location,
                },
                {
                  key: "unit",
                  label: D.unit,
                  render: (u) => (
                    <Dialog
                      title={u.unitId}
                      trigger={
                        <Button variant="secondary">{D.inspectUnit}</Button>
                      }
                    >
                      <UnitDetails
                        unitId={u.unitId}
                        api={api}
                        principal={principal}
                        onSaved={list.reload}
                      />
                    </Dialog>
                  ),
                },
              ]}
            />
            <Pagination
              page={page}
              pages={list.data.pages}
              onChange={setPage}
            />
          </>
        )}
      </Card>
    </div>
  );
}
