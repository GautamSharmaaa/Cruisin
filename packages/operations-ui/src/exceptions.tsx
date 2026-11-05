"use client";
import { DETAIL_COPY as D } from "./constants/detail-copy";
import { OPS_COPY as C } from "./constants/copy";
import { useEffect, useState, type ReactNode } from "react";
import {
  Card,
  Button,
  Dialog,
  DataTable,
  Input,
  Textarea,
  Field,
  Alert,
  Pagination,
  toast,
} from "@cruisin/ui";
import type { Principal } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { useList, fail, AttachmentList } from "./common";
interface Props {
  api: OperationsTransport;
  principal: Principal;
}
interface Exception {
  _id: string;
  type: string;
  reason: string;
  entity: string;
  status: string;
  version: number;
  evidence: string[];
  resolution?: string;
}
export function Exceptions({ api, principal }: Props): ReactNode {
  const [staff, setStaff] = useState<{ _id: string; name: string }[]>([]);
  useEffect(() => {
    if (principal.permissions.includes("tasks.assign"))
      void api.get<typeof staff>("/staff-options").then(setStaff).catch(fail);
  }, [api, principal]);
  const [page, setPage] = useState(1);
  const list = useList<Exception>(api, "/exceptions", "", "", page);
  return (
    <Card title={D.operationalExceptions}>
      {list.error && <Alert tone="danger">{list.error}</Alert>}
      <Dialog
        title={D.reportException}
        trigger={<Button>{D.reportIssue}</Button>}
      >
        <form
          className="ui-stack"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void api
              .post("/exceptions", {
                type: f.get("type"),
                entity: f.get("entity"),
                reason: f.get("reason"),
                severity: "medium",
                evidence: [],
              })
              .then(() => {
                list.reload();
                toast.success(D.exceptionReported);
              })
              .catch(fail);
          }}
        >
          <Field label={D.issueType}>
            <select name="type" className="ui-input">
              {[
                "Wrong product scan",
                "Missing unit",
                "Damaged item",
                "QC failure",
                "SOP mismatch",
                "Packaging failure",
                "Inventory discrepancy",
                "AWB failure",
                "Label failure",
                "Weight discrepancy",
                "Return mismatch",
                "Shipment problem",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </Field>
          <Field label={D.unitOrOrderReference}>
            <Input name="entity" required />
          </Field>
          <Field label={D.issueDetails}>
            <Textarea name="reason" required minLength={5} />
          </Field>
          <Button type="submit">{D.report}</Button>
        </form>
      </Dialog>
      {list.data && (
        <>
          <DataTable
            caption={D.exceptionsQueue}
            items={list.data.items}
            keyOf={(r) => r._id}
            columns={[
              { key: "type", label: D.issue, render: (r) => r.type },
              { key: "reason", label: D.details, render: (r) => r.reason },
              { key: "status", label: D.status, render: (r) => r.status },
              {
                key: "review",
                label: D.review,
                render: (r) => (
                  <Dialog
                    title={r.type}
                    trigger={<Button variant="secondary">{D.details}</Button>}
                  >
                    <p>{r.reason}</p>
                    <AttachmentList ids={r.evidence} api={api} />
                    {r.resolution && <p>{r.resolution}</p>}
                    {principal.permissions.includes("tasks.assign") &&
                      r.status !== "RESOLVED" && (
                        <form
                          className="ui-stack"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void api
                              .post(`/exceptions/${r._id}/assign`, {
                                version: r.version,
                                owner: f.get("owner"),
                              })
                              .then(() => {
                                list.reload();
                                toast.success(C.exceptionAssigned);
                              })
                              .catch(fail);
                          }}
                        >
                          <Field label={C.exceptionOwner}>
                            <select name="owner" className="ui-input" required>
                              <option value="">—</option>
                              {staff.map((e) => (
                                <option key={e._id} value={e._id}>
                                  {e.name}
                                </option>
                              ))}
                            </select>
                          </Field>
                          <Button type="submit">{C.assignException}</Button>
                        </form>
                      )}
                    {principal.permissions.includes("tasks.approve") &&
                      r.status !== "RESOLVED" && (
                        <form
                          className="ui-stack"
                          onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            void api
                              .post(`/exceptions/${r._id}/resolve`, {
                                version: r.version,
                                resolution: f.get("resolution"),
                              })
                              .then(() => {
                                list.reload();
                                toast.success(
                                  D.resolutionRecordedInventorySafeguardsRemainEnforced,
                                );
                              })
                              .catch(fail);
                          }}
                        >
                          <Field label={D.resolution}>
                            <Textarea
                              name="resolution"
                              required
                              minLength={5}
                            />
                          </Field>
                          <Button type="submit">{D.resolve}</Button>
                        </form>
                      )}
                  </Dialog>
                ),
              },
            ]}
          />
          <Pagination page={page} pages={list.data.pages} onChange={setPage} />
        </>
      )}
    </Card>
  );
}
