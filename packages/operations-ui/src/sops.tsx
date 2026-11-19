"use client";
import { DETAIL_COPY as D } from "./constants/detail-copy";
import { CRUISIN_PACKAGING_REQUIREMENTS, SOP_FLOW_COPY as F } from "./constants/packaging-sop";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import {
  Button,
  Card,
  Input,
  Textarea,
  Field,
  Alert,
  Status,
  Skeleton,
  Dialog,
  DataTable,
  Pagination,
  FileUpload,
  ConfirmationDialog,
  toast,
} from "@cruisin/ui";
import {
  employeeRoles,
  permissions,
  type Principal,
  type Employee,
  type Task,
  type TaskStatus,
  type Approval,
  type InventoryRow,
  type Sop,
  type PageResult,
} from "@cruisin/contracts";
import { OPS_COPY as C } from "./constants/copy";
import { Scanner } from "./scanner";
import type { OperationsTransport } from "./api";
import {
  useList,
  NativeSelect,
  AttachmentList,
  upload,
  displayTime,
  fail,
} from "./common";
export interface SopEditorProps {
  sop?: Sop;
  api: OperationsTransport;
  onSaved: () => void;
}
export function SopEditor({ sop, api, onSaved }: SopEditorProps): ReactNode {
  const [sections, setSections] = useState(sop?.sections ?? []);
  const [measurements, setMeasurements] = useState(sop?.measurements ?? []);
  const [kind, setKind] = useState(sop?.kind ?? "GENERAL");
  const [requirements, setRequirements] = useState(sop?.requirements ?? []);
  const [attachments, setAttachments] = useState(sop?.attachments ?? []);
  const [products, setProducts] = useState<string[]>(sop?.products ?? []);
  const [productOptions, setProductOptions] = useState<
    { _id: string; title: string }[]
  >([]);
  useEffect(() => {
    void api
      .get<typeof productOptions>("/product-options")
      .then(setProductOptions)
      .catch(fail);
  }, [api]);
  const [roles, setRoles] = useState<string[]>(sop?.roles ?? []);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="ui-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const body = {
          sections,
          measurements,
          kind,
          requirements,
          title: f.get("title"),
          category: f.get("category"),
          body: f.get("body"),
          steps: String(f.get("steps") ?? "")
            .split("\n")
            .filter(Boolean),
          attachments,
          roles,
          products,
        };
        setBusy(true);
        const promise = sop
          ? api.patch(`/sops/${sop._id}`, { ...body, version: sop.version })
          : api.post("/sops", body);
        void promise
          .then(() => {
            toast.success(C.saved);
            onSaved();
          })
          .catch(fail)
          .finally(() => setBusy(false));
      }}
    >
      <Field label={D.sopType}>
        <select
          className="ui-input"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="GENERAL">{D.generalSop}</option>
          <option value="PRODUCT">{D.productSop}</option>
          <option value="PACKAGING">{D.packagingSop}</option>
        </select>
      </Field>
      <Card title={C.specificationSections}>
        {sections.map((section, i) => (
          <div className="ui-stack" key={i}>
            <Field label={C.sectionTitle}>
              <Input
                required
                value={section.title}
                onChange={(e) =>
                  setSections((rows) =>
                    rows.map((row, index) =>
                      index === i ? { ...row, title: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            <Field label={C.sectionContent}>
              <Textarea
                value={section.body}
                onChange={(e) =>
                  setSections((rows) =>
                    rows.map((row, index) =>
                      index === i ? { ...row, body: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setSections((rows) => rows.filter((_, index) => index !== i))
              }
            >
              {C.removeSection}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setSections((rows) => [...rows, { title: "", body: "" }])
          }
        >
          {C.addSection}
        </Button>
      </Card>
      <Card title={D.measurementAcceptanceRules}>
        {measurements.map((r, i) => (
          <div className="ui-row" key={r.key}>
            {(["label", "unit", "min", "max"] as const).map((key) => (
              <Field key={key} label={key}>
                <Input
                  required
                  type={key === "min" || key === "max" ? "number" : "text"}
                  step="any"
                  value={r[key]}
                  onChange={(e) =>
                    setMeasurements((rows) =>
                      rows.map((row, index) =>
                        index === i
                          ? {
                              ...row,
                              [key]:
                                key === "min" || key === "max"
                                  ? Number(e.target.value)
                                  : e.target.value,
                            }
                          : row,
                      ),
                    )
                  }
                />
              </Field>
            ))}
            <Field label={D.requiredMeasurement}>
              <input
                type="checkbox"
                checked={r.required}
                onChange={(e) =>
                  setMeasurements((rows) =>
                    rows.map((row, index) =>
                      index === i
                        ? { ...row, required: e.target.checked }
                        : row,
                    ),
                  )
                }
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setMeasurements((rows) =>
                  rows.filter((_, index) => index !== i),
                )
              }
            >
              {D.removeMeasurement}
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setMeasurements((rows) => [
              ...rows,
              {
                key: crypto.randomUUID(),
                label: D.label,
                unit: "",
                min: 0,
                max: 0,
                required: true,
              },
            ])
          }
        >
          {D.addMeasurementRule}
        </Button>
        <p>{D.enterApprovedSpecificationsQcCannotPassOutsideThese}</p>
      </Card>
      <Card title={D.verifiedSopRequirements}>
        <ol className="ops-sop-flow ops-sop-editor-flow" aria-label={F.title}>
        {requirements.map((r, i) => (
          <li key={r.key}>
            <div className="ops-sop-node ui-stack">
            <p className="ops-eyebrow">{F.step} {i + 1}</p>
            <Field label={D.stepInstruction}>
              <Input
                required
                value={r.label}
                onChange={(e) =>
                  setRequirements((rows) =>
                    rows.map((row, index) =>
                      index === i ? { ...row, label: e.target.value } : row,
                    ),
                  )
                }
              />
            </Field>
            {(
              [
                ["mandatory", "Mandatory"],
                ["photo", "Requires photo"],
                ["scan", "Requires unit scan"],
              ] as const
            ).map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="checkbox"
                  checked={r[key]}
                  onChange={(e) =>
                    setRequirements((rows) =>
                      rows.map((row, index) =>
                        index === i ? { ...row, [key]: e.target.checked } : row,
                      ),
                    )
                  }
                />
              </Field>
            ))}
            <div className="ui-row">
              <Button
                type="button"
                variant="secondary"
                disabled={i === 0}
                onClick={() =>
                  setRequirements((rows) => {
                    const next = [...rows];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    return next;
                  })
                }
              >
                {C.moveStepUp}
              </Button>
              <Button
                type="button"
                variant="secondary"
                disabled={i === requirements.length - 1}
                onClick={() =>
                  setRequirements((rows) => {
                    const next = [...rows];
                    [next[i + 1], next[i]] = [next[i], next[i + 1]];
                    return next;
                  })
                }
              >
                {C.moveStepDown}
              </Button>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setRequirements((rows) =>
                  rows.filter((_, index) => index !== i),
                )
              }
            >
              {D.removeStep}
            </Button>
            </div>
          </li>
        ))}
        </ol>
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setRequirements((rows) => [
              ...rows,
              {
                key: crypto.randomUUID(),
                label: D.label,
                mandatory: true,
                photo: false,
                scan: false,
              },
            ])
          }
        >
          {D.addVerifiedStep}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setKind("PACKAGING");
            setRequirements(CRUISIN_PACKAGING_REQUIREMENTS);
          }}
        >
          {D.loadCruisinPackagingDefaults}
        </Button>
      </Card>
      <Field label={C.title}>
        <Input name="title" defaultValue={sop?.title} required minLength={3} />
      </Field>
      <Field label={C.category}>
        <Input
          name="category"
          defaultValue={sop?.category ?? "packaging"}
          required
          minLength={2}
        />
      </Field>
      <Field label={C.body}>
        <Textarea
          name="body"
          rows={12}
          defaultValue={sop?.body}
          required
          minLength={3}
        />
      </Field>
      <Field label={C.steps}>
        <Textarea name="steps" defaultValue={sop?.steps.join("\n")} />
      </Field>
      <NativeSelect
        multiple
        label={C.entity}
        value={products}
        onChange={setProducts}
        options={productOptions.map((p) => ({ value: p._id, label: p.title }))}
      />
      <NativeSelect
        multiple
        label={C.role}
        value={roles}
        onChange={setRoles}
        options={employeeRoles.map((r) => ({
          value: r,
          label: r.replaceAll("_", " "),
        }))}
      />
      <AttachmentList ids={attachments} api={api} />
      <FileUpload
        accept="image/*,application/pdf,video/mp4"
        onFile={(f) => {
          void upload(api, f)
            .then((id) => setAttachments((x) => [...x, id]))
            .catch(fail);
        }}
      />
      <Button type="submit" disabled={busy}>
        {C.save}
      </Button>
    </form>
  );
}
export interface SopPanelProps {
  sop: Sop;
  api: OperationsTransport;
  principal: Principal;
  onSaved: () => void;
}
export function SopPanel({
  sop,
  api,
  principal,
  onSaved,
}: SopPanelProps): ReactNode {
  const [reason, setReason] = useState("");
  const [body, setBody] = useState(sop.body);
  const [history, setHistory] = useState<unknown>(null);
  const action = (name: string): void => {
    void api
      .post(`/sops/${sop._id}/${name}`, { version: sop.version })
      .then(() => {
        toast.success(C.saved);
        onSaved();
      })
      .catch(fail);
  };
  return (
    <div className="ui-stack">
      <div className="ui-row">
        <Status>{sop.status}</Status>
        <span>
          {C.version} {sop.version}
        </span>
      </div>
      <article className="ops-prose">
        <ReactMarkdown skipHtml>{sop.body}</ReactMarkdown>
      </article>
      {sop.kind === "PACKAGING" && Boolean(sop.requirements?.length) ? (
        <SopFlow requirements={sop.requirements ?? []} labels={sop.flowLabels} />
      ) : (
        <ol>
          {sop.steps.map((step, i) => <li key={i}>{i + 1}. {step}</li>)}
        </ol>
      )}
      <AttachmentList ids={sop.attachments} api={api} />
      <div className="ui-row">
        {sop.status === "PUBLISHED" && (
          <Button onClick={() => action("acknowledge")}>{C.acknowledge}</Button>
        )}
        {principal.permissions.includes("sop.publish") && (
          <>
            <Button
              disabled={sop.status !== "DRAFT"}
              onClick={() =>
                action(
                  sop.kind && sop.kind !== "GENERAL"
                    ? "request-publication"
                    : "publish",
                )
              }
            >
              {sop.kind && sop.kind !== "GENERAL"
                ? "Request publication approval"
                : C.publish}
            </Button>
            <Button variant="danger" onClick={() => action("archive")}>
              {C.archive}
            </Button>
          </>
        )}
        {principal.permissions.includes("sop.create") && (
          <Dialog
            title={C.edit}
            trigger={<Button variant="secondary">{C.edit}</Button>}
          >
            <SopEditor sop={sop} api={api} onSaved={onSaved} />
          </Dialog>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            void api
              .get(`/sops/${sop._id}/history`)
              .then(setHistory)
              .catch(fail);
          }}
        >
          {C.revisionHistory}
        </Button>
      </div>
      {history !== null && (
        <pre className="ops-pre">{JSON.stringify(history, null, 2)}</pre>
      )}
      <Dialog
        title={C.suggest}
        trigger={<Button variant="secondary">{C.suggest}</Button>}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void api
              .post(`/sops/${sop._id}/suggestions`, {
                version: sop.version,
                body,
                reason,
              })
              .then(() => toast.success(C.suggested))
              .catch(fail);
          }}
        >
          <Field label={C.body}>
            <Textarea
              rows={10}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
            />
          </Field>
          <Field label={C.reason}>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={5}
            />
          </Field>
          <Button type="submit">{C.suggest}</Button>
        </form>
      </Dialog>
    </div>
  );
}


export interface SopFlowProps {
  requirements: NonNullable<Sop["requirements"]>;
  labels?: Sop["flowLabels"];
}

export function SopFlow({ requirements, labels }: SopFlowProps): ReactNode {
  return (
    <section className="ui-stack" aria-label={F.title}>
      <h3>{F.title}</h3>
      <div className="ops-sop-chart">
        <p className="ops-sop-terminal ops-sop-start">{labels?.start ?? F.start}</p>
        <ol className="ops-sop-diagram">
        {requirements.map(step => (
          <li key={step.key}>
            <div className="ops-sop-node">
              <p>{step.label}</p>
              <div className="ui-row">
                <Status>{step.mandatory ? F.required : F.optional}</Status>
                {step.scan && <Status>{F.scan}</Status>}
                {step.photo && <Status>{F.photo}</Status>}
              </div>
            </div>
          </li>
        ))}
        </ol>
        <p className="ops-sop-terminal ops-sop-end">{labels?.end ?? F.end}</p>
      </div>
    </section>
  );
}
