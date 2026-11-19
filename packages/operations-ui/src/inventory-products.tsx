"use client";

import type { ReactNode } from "react";
import { Button, DataTable, Dialog, Status } from "@cruisin/ui";
import type { InventoryRow, PageResult, Principal } from "@cruisin/contracts";
import type { OperationsTransport } from "./api";
import { InventoryActions } from "./inventory";
import { PackagingReport } from "./packaging-report";
import { OPS_COPY as C } from "./constants/copy";
import { INVENTORY_COPY as I } from "./constants/inventory-copy";

export interface InventoryProductsProps {
  data: PageResult<InventoryRow>;
  api: OperationsTransport;
  principal: Principal;
  timezone: string;
  onSaved: () => void;
}

export function InventoryProducts({ data, api, principal, timezone, onSaved }: InventoryProductsProps): ReactNode {
  const products = new Map<string, InventoryRow[]>();
  for (const row of data.items) {
    const variants = products.get(row.product);
    if (variants) variants.push(row);
    else products.set(row.product, [row]);
  }
  const metrics = [
    [I.variants, data.total],
    [I.lowOnPage, data.items.filter(row => row.available > 0 && row.available <= row.threshold).length],
    [I.outOnPage, data.items.filter(row => row.available === 0).length],
  ];
  return (
    <section className="ui-stack" aria-label={I.productList}>
      <div className="ops-metrics">
        {metrics.map(([label, value]) => <dl className="ops-metric" key={label}><dt>{label}</dt><dd>{value}</dd></dl>)}
      </div>
      {[...products.entries()].map(([product, rows]) => {
        const first = rows[0];
        return (
          <article className="ops-inventory-product" key={product}>
            <header className="ops-inventory-product-heading">
              {first.image && /^https?:\/\//i.test(first.image) && <img src={first.image} width={80} height={80} alt="" loading="lazy" />}
              <div><p className="ops-eyebrow">{C.inventory}</p><h2>{first.title}</h2></div>
            </header>
            <DataTable<InventoryRow>
              caption={first.title}
              stackOnSmallScreens
              items={rows}
              keyOf={row => row.variant}
              columns={[
                { key: "sku", label: C.sku, render: row => <strong>{row.sku}</strong> },
                { key: "variant", label: C.size, render: row => `${row.size} / ${row.color}` },
                { key: "available", label: C.stock, render: row => <Status>{row.available}</Status> },
                { key: "reserved", label: C.reserved, render: row => row.reserved },
                { key: "damaged", label: C.damaged, render: row => row.damaged },
                { key: "threshold", label: C.threshold, render: row => row.threshold },
                { key: "alert", label: C.lowStock, render: row => row.available <= row.threshold ? <Status>{C.lowStock}</Status> : "—" },
                { key: "actions", label: C.details, render: row => (
                  <div className="ui-stack">
                    <InventoryActions row={row} api={api} principal={principal} onSaved={onSaved} />
                    {principal.permissions.includes("units.scan") && (
                      <Dialog title={I.report} trigger={<Button variant="secondary">{I.report}</Button>}>
                        <PackagingReport row={row} api={api} timezone={timezone} />
                      </Dialog>
                    )}
                  </div>
                ) },
              ]}
            />
          </article>
        );
      })}
    </section>
  );
}
