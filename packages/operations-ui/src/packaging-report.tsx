"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Pagination, Skeleton, Status } from "@cruisin/ui";
import type { InventoryRow } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { AttachmentList, displayTime, useList } from "./common";
import { OPS_COPY as C } from "./constants/copy";
import { INVENTORY_COPY as I } from "./constants/inventory-copy";
import type { PhysicalUnit } from "./units";

export interface PackagingReportProps {
  row: InventoryRow;
  api: OperationsTransport;
  timezone: string;
}

export function PackagingReport({ row, api, timezone }: PackagingReportProps): ReactNode {
  const [page, setPage] = useState(1);
  const [unitId, setUnitId] = useState("");
  const [record, setRecord] = useState<PhysicalUnit>();
  const [error, setError] = useState("");
  const units = useList<PhysicalUnit>(api, `/units?variant=${encodeURIComponent(row.variant)}`, "", "", page);

  useEffect(() => {
    if (!unitId) return;
    let active = true;
    setRecord(undefined);
    setError("");
    void api.get<PhysicalUnit>(`/units/${encodeURIComponent(unitId)}`).then(unit => {
      if (active) setRecord(unit);
    }).catch((failure: unknown) => {
      if (active) setError(failure instanceof Error ? failure.message : C.error);
    });
    return () => { active = false; };
  }, [api, unitId]);

  const reports = record?.inspectionHistory?.filter(inspection => inspection.kind === "PACKAGING") ?? [];

  return (
    <div className="ui-stack">
      <p className="ops-muted">{row.title} · {row.sku}</p>
      {units.error ? <Alert tone="danger">{units.error}</Alert> : !units.data ? <Skeleton /> : (
        <>
          {units.data.items.length === 0 && <Alert>{I.noUnits}</Alert>}
          {units.data.items.map(unit => (
            <Button key={unit.unitId} variant="secondary" aria-pressed={unitId === unit.unitId} onClick={() => setUnitId(unit.unitId)}>
              {unit.unitId} · {unit.state.replaceAll("_", " ")}
            </Button>
          ))}
          {units.data.pages > 1 && <Pagination page={page} pages={units.data.pages} onChange={next => { setUnitId(""); setPage(next); }} />}
        </>
      )}
      {unitId && (error ? <Alert tone="danger">{error}</Alert> : record?.unitId !== unitId ? <Skeleton /> : (
        <section className="ui-stack" aria-label={I.report}>
          <h3>{unitId}</h3>
          {reports.length === 0 && <Alert>{I.noReport}</Alert>}
          {reports.map(report => (
            <article className="ops-report-entry ui-stack" key={report._id}>
              <div className="ui-row"><Status>{report.snapshot.result}</Status><span>{C.sopVersionUsed} {report.sopVersion}</span></div>
              <p className="ops-muted">{displayTime(report.createdAt, timezone)}</p>
              <AttachmentList ids={report.snapshot.evidence ?? []} api={api} />
            </article>
          ))}
        </section>
      ))}
    </div>
  );
}
