// Governed by .rules v1.0
"use client";

import { Download, Eye, RefreshCw, Search, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AdminCard,
  AdminDataTable,
  AdminStat,
  AdminStatsGrid,
} from "@/components/dashboard/admin-ui";
import { StatusPill } from "@/components/dashboard/status-pill";
import { Button } from "@/components/ui/button";
import { COPY } from "@/constants/copy";
import {
  useAdminMe,
  useAdminInvoices,
  type AdminInvoiceFilters,
} from "@/hooks/useAdminResources";
import { api } from "@/lib/api";
import { formatPrecisePrice } from "@/lib/utils";
import type { InvoiceDto } from "@/types/dto.types";

const filterKeys = [
  "startDate",
  "endDate",
  "orderStartDate",
  "orderEndDate",
  "paymentMethod",
  "paymentStatus",
  "orderStatus",
  "invoiceStatus",
  "state",
  "minAmount",
  "maxAmount",
  "sort",
] as const;
const paymentStatuses = [
  "paid",
  "partially_paid",
  "cod_pending",
  "cod_collected",
  "partially_refunded",
  "refunded",
];
const orderStatuses = [
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "returned",
  "cancelled",
];
const dateLabel = (value: string): string =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
const responseFilename = (header: unknown, fallback: string): string => {
  const match =
    typeof header === "string" ? header.match(/filename="?([^";]+)"?/i) : null;
  return match?.[1] ?? fallback;
};
const idOf = (invoice: InvoiceDto): string => invoice._id ?? invoice.id ?? "";
const tone = (value: string): "success" | "warning" | "danger" | "neutral" =>
  value === "paid" ||
  value === "cod_collected" ||
  value === "delivered" ||
  value === "generated"
    ? "success"
    : value === "cancelled" || value === "failed" || value === "void"
      ? "danger"
      : value === "refunded" || value === "partially_refunded"
        ? "neutral"
        : "warning";

interface SelectionCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}
function SelectionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  label,
  onChange,
}: SelectionCheckboxProps): ReactNode {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      aria-label={label}
      className="h-4 w-4 accent-accent-gold disabled:opacity-40"
    />
  );
}

interface FilterFieldProps {
  label: string;
  value: string;
  type?: string;
  options?: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}
function FilterField({
  label,
  value,
  type = "text",
  options,
  onChange,
}: FilterFieldProps): ReactNode {
  const controlClass =
    "h-11 border border-border bg-background-input px-3 text-sm text-text-primary outline-none focus:border-accent-gold";
  return (
    <label className="grid min-w-40 gap-2 text-[10px] uppercase tracking-[0.13em] text-text-muted">
      <span>{label}</span>
      {options ? (
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={controlClass}
        />
      )}
    </label>
  );
}

export function InvoiceManager(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const me = useAdminMe();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allResults, setAllResults] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [notice, setNotice] = useState("");
  const filters = useMemo<AdminInvoiceFilters>(() => {
    const value: AdminInvoiceFilters = {
      page: 1,
      limit: 1000,
    };
    const searchValue = searchParams.get("search");
    if (searchValue) value.search = searchValue;
    for (const key of filterKeys) {
      const current = searchParams.get(key);
      if (current)
        Object.assign(
          value,
          key === "minAmount" || key === "maxAmount"
            ? { [key]: Number(current) }
            : { [key]: current },
        );
    }
    return value;
  }, [searchParams]);
  const invoices = useAdminInvoices(filters);
  const data = invoices.data;
  const pageIds = data?.items.map(idOf) ?? [];
  const pageChecked =
    pageIds.length > 0 &&
    (allResults || pageIds.every((id) => selected.has(id)));
  const pageIndeterminate =
    !allResults && pageIds.some((id) => selected.has(id)) && !pageChecked;
  const selectedCount = allResults ? (data?.total ?? 0) : selected.size;
  const canSyncInvoices = ["admin", "superadmin"].includes(
    String(me.data?.role),
  );

  const updateUrl = (changes: Record<string, string | undefined>): void => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(changes))
      value ? next.set(key, value) : next.delete(key);
    if (!("page" in changes)) next.delete("page");
    router.replace(`/invoices${next.size ? `?${next.toString()}` : ""}`, {
      scroll: false,
    });
    setSelected(new Set());
    setAllResults(false);
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      if (search.trim() !== current)
        updateUrl({ search: search.trim() || undefined });
    }, 350);
    return () => window.clearTimeout(timeout);
    // updateUrl intentionally reads the latest search params after the debounce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const clearFilters = (): void => {
    setSearch("");
    router.replace("/invoices", { scroll: false });
    setSelected(new Set());
    setAllResults(false);
  };
  const togglePage = (checked: boolean): void => {
    if (allResults || !checked) {
      setAllResults(false);
      setSelected((current) => {
        const next = new Set(current);
        pageIds.forEach((id) => next.delete(id));
        return next;
      });
    } else setSelected((current) => new Set([...current, ...pageIds]));
  };
  const toggleInvoice = (id: string, checked: boolean): void => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const downloadSingle = async (invoice: InvoiceDto): Promise<void> => {
    setPreparing(true);
    setNotice(`Preparing ${invoice.invoiceNumber}…`);
    try {
      const response = await api.get<Blob>(
        `/admin/invoices/${idOf(invoice)}/pdf`,
        { responseType: "blob" },
      );
      downloadBlob(
        response.data,
        `${invoice.invoiceNumber.replaceAll("/", "-")}.pdf`,
      );
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

  const downloadSelected = async (): Promise<void> => {
    if (selectedCount === 0) return;
    setPreparing(true);
    setNotice(`Preparing ${selectedCount} invoices…`);
    const exportFilters = { ...filters };
    delete exportFilters.page;
    delete exportFilters.limit;
    try {
      const response = await api.post<Blob>(
        "/admin/invoices/bulk-pdf",
        allResults
          ? { selectAll: true, filters: exportFilters }
          : { invoiceIds: [...selected] },
        { responseType: "blob" },
      );
      downloadBlob(
        response.data,
        responseFilename(
          response.headers["content-disposition"],
          "Cruisin-Invoices.pdf",
        ),
      );
      await queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      setNotice(
        response.headers["x-invoice-download-recorded"] === "false"
          ? "PDF downloaded, but its download status could not be recorded."
          : `${selectedCount} invoices downloaded in one PDF.`,
      );
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Bulk invoice download failed.",
      );
    } finally {
      setPreparing(false);
    }
  };

  const syncInvoices = async (): Promise<void> => {
    if (
      !window.confirm(
        "Generate invoices for eligible delivered orders that do not already have one? Existing invoices will not be changed.",
      )
    )
      return;
    setSyncing(true);
    setNotice("Checking delivered orders and generating missing invoices…");
    try {
      type SyncResult = {
        eligibleOrders: number;
        alreadyGenerated: number;
        inspected: number;
        created: number;
        issues: Array<{ orderNumber: string; message: string }>;
        remainingEligible: number;
      };
      let totalCreated = 0;
      let totalIssues = 0;
      let result: SyncResult | undefined;
      for (let batch = 0; batch < 200; batch += 1) {
        const response = await api.post<{ data: SyncResult }>(
          "/admin/invoices/sync",
          { limit: 3 },
        );
        result = response.data.data;
        totalCreated += result.created;
        totalIssues += result.issues.length;
        setNotice(
          `${totalCreated} invoice${totalCreated === 1 ? "" : "s"} generated · ${result.remainingEligible} remaining…`,
        );
        if (
          result.remainingEligible === 0 ||
          result.inspected === 0 ||
          result.created === 0
        )
          break;
      }
      await queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      if (!result) throw new Error("Invoice sync did not start.");
      const parts = [
        `${totalCreated} invoice${totalCreated === 1 ? "" : "s"} generated`,
        `${Math.max(0, result.eligibleOrders - totalCreated - result.remainingEligible)} already existed`,
      ];
      if (totalIssues > 0) parts.push(`${totalIssues} need attention`);
      if (result.remainingEligible > 0)
        parts.push(`${result.remainingEligible} remaining—run sync again`);
      setNotice(`${parts.join(" · ")}.`);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Invoice sync failed.",
      );
    } finally {
      setSyncing(false);
    }
  };

  return (
    <section className="grid min-w-0 gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border border-border bg-background-elevated p-4">
        <div>
          <p className="text-sm font-medium text-text-primary">
            Missing invoices
          </p>
          <p className="mt-1 text-xs text-text-secondary">
            Generate invoices for eligible old or new delivered orders. Existing
            invoice snapshots stay unchanged.
          </p>
        </div>
        <Button
          onClick={() => void syncInvoices()}
          disabled={syncing || preparing || !canSyncInvoices}
          title={
            canSyncInvoices
              ? "Generate invoices missing from eligible delivered orders"
              : "Admin or superadmin access required"
          }
        >
          <RefreshCw
            size={17}
            className={`mr-2 ${syncing ? "animate-spin" : ""}`}
          />
          {syncing ? "Syncing invoices…" : "Generate / sync invoices"}
        </Button>
      </div>

      <AdminStatsGrid>
        <AdminStat
          label="Total invoices"
          value={data?.summary.totalInvoices ?? "—"}
        />
        <AdminStat
          label="Invoices this month"
          value={data?.summary.invoicesThisMonth ?? "—"}
        />
        <AdminStat
          label="Total invoiced value"
          value={
            data ? formatPrecisePrice(data.summary.totalInvoicedValue) : "—"
          }
          tone="gold"
        />
        <AdminStat
          label="GST collected"
          value={data ? formatPrecisePrice(data.summary.gstCollected) : "—"}
          tone="success"
        />
      </AdminStatsGrid>

      <AdminCard>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid min-w-[260px] flex-1 gap-2 text-[10px] uppercase tracking-[0.13em] text-text-muted">
            <span>Search invoice, order, customer, email, phone</span>
            <span className="flex h-11 items-center border border-border bg-background-input px-3">
              <Search size={15} className="mr-2" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm normal-case text-text-primary outline-none"
              />
            </span>
          </label>
          <FilterField
            label="Invoice from"
            type="date"
            value={searchParams.get("startDate") ?? ""}
            onChange={(value) => updateUrl({ startDate: value || undefined })}
          />
          <FilterField
            label="Invoice to"
            type="date"
            value={searchParams.get("endDate") ?? ""}
            onChange={(value) => updateUrl({ endDate: value || undefined })}
          />
          <FilterField
            label="Order from"
            type="date"
            value={searchParams.get("orderStartDate") ?? ""}
            onChange={(value) =>
              updateUrl({ orderStartDate: value || undefined })
            }
          />
          <FilterField
            label="Order to"
            type="date"
            value={searchParams.get("orderEndDate") ?? ""}
            onChange={(value) =>
              updateUrl({ orderEndDate: value || undefined })
            }
          />
          <FilterField
            label="Payment method"
            value={searchParams.get("paymentMethod") ?? ""}
            options={[
              { value: "", label: "All methods" },
              ...["razorpay", "stripe", "cod"].map((value) => ({
                value,
                label: value.toUpperCase(),
              })),
            ]}
            onChange={(value) =>
              updateUrl({ paymentMethod: value || undefined })
            }
          />
          <FilterField
            label="Payment status"
            value={searchParams.get("paymentStatus") ?? ""}
            options={[
              { value: "", label: "All payments" },
              ...paymentStatuses.map((value) => ({
                value,
                label: value.replaceAll("_", " "),
              })),
            ]}
            onChange={(value) =>
              updateUrl({ paymentStatus: value || undefined })
            }
          />
          <FilterField
            label="Order status"
            value={searchParams.get("orderStatus") ?? ""}
            options={[
              { value: "", label: "All orders" },
              ...orderStatuses.map((value) => ({ value, label: value })),
            ]}
            onChange={(value) => updateUrl({ orderStatus: value || undefined })}
          />
          <FilterField
            label="Invoice status"
            value={searchParams.get("invoiceStatus") ?? ""}
            options={[
              { value: "", label: "All invoices" },
              { value: "generated", label: "Generated" },
              { value: "void", label: "Void" },
            ]}
            onChange={(value) =>
              updateUrl({ invoiceStatus: value || undefined })
            }
          />
          <FilterField
            label="Customer state"
            value={searchParams.get("state") ?? ""}
            onChange={(value) => updateUrl({ state: value || undefined })}
          />
          <FilterField
            label="Minimum value"
            type="number"
            value={searchParams.get("minAmount") ?? ""}
            onChange={(value) => updateUrl({ minAmount: value || undefined })}
          />
          <FilterField
            label="Maximum value"
            type="number"
            value={searchParams.get("maxAmount") ?? ""}
            onChange={(value) => updateUrl({ maxAmount: value || undefined })}
          />
          <FilterField
            label="Sort"
            value={searchParams.get("sort") ?? "newest"}
            options={[
              { value: "newest", label: "Newest" },
              { value: "oldest", label: "Oldest" },
              { value: "total-desc", label: "Value high–low" },
              { value: "total-asc", label: "Value low–high" },
            ]}
            onChange={(value) =>
              updateUrl({ sort: value === "newest" ? undefined : value })
            }
          />
          <Button variant="secondary" onClick={clearFilters}>
            <X size={15} className="mr-2" />
            {COPY.invoices.clearFilters}
          </Button>
        </div>
      </AdminCard>

      {selectedCount > 0 ? (
        <div className="sticky top-3 z-20 flex flex-wrap items-center justify-between gap-3 border border-accent-gold bg-background-elevated p-4 shadow-gold">
          <div>
            <p className="font-mono text-sm text-accent-gold">
              {selectedCount} selected
            </p>
            {!allResults &&
            selected.size === pageIds.length &&
            (data?.total ?? 0) > pageIds.length ? (
              <button
                type="button"
                onClick={() => {
                  setAllResults(true);
                  setSelected(new Set());
                }}
                className="mt-2 text-xs text-text-secondary underline hover:text-text-primary"
              >
                Select all {data?.total} results matching these filters
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => void downloadSelected()}
              disabled={preparing}
            >
              <Download size={15} className="mr-2" />
              {preparing
                ? `Preparing ${selectedCount} invoices…`
                : COPY.invoices.downloadSelected}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setSelected(new Set());
                setAllResults(false);
              }}
            >
              {COPY.invoices.clearSelection}
            </Button>
          </div>
        </div>
      ) : null}
      {notice ? (
        <p
          role="status"
          className="border-l-2 border-accent-gold px-4 text-sm text-text-secondary"
        >
          {notice}
        </p>
      ) : null}

      {invoices.isLoading ? (
        <AdminCard>
          <div className="h-40 animate-pulse bg-background-overlay" />
        </AdminCard>
      ) : invoices.isError ? (
        <AdminCard>
          <p className="text-danger">{invoices.error.message}</p>
          <Button className="mt-4" onClick={() => void invoices.refetch()}>
            Retry
          </Button>
        </AdminCard>
      ) : data?.items.length === 0 ? (
        <AdminCard>
          <p className="font-display text-2xl text-text-primary">
            {Object.keys(filters).length > 2
              ? COPY.invoices.noMatches
              : COPY.invoices.empty}
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            {Object.keys(filters).length > 2
              ? "Adjust or clear the current filters."
              : COPY.invoices.emptyBody}
          </p>
          {Object.keys(filters).length > 2 ? (
            <Button className="mt-5" variant="secondary" onClick={clearFilters}>
              {COPY.invoices.clearFilters}
            </Button>
          ) : null}
        </AdminCard>
      ) : (
        <>
          <div className="hidden min-w-0 max-w-full md:block">
            <p className="mb-2 text-xs text-text-muted">
              Scroll horizontally to view every invoice column.
            </p>
            <AdminDataTable minWidth={1620}>
              <thead className="text-[10px] uppercase tracking-[0.1em] text-text-secondary">
                <tr>
                  <th className="border-b border-border p-4">
                    <SelectionCheckbox
                      checked={pageChecked}
                      indeterminate={pageIndeterminate}
                      label="Select invoices on this page"
                      onChange={(event) => togglePage(event.target.checked)}
                    />
                  </th>
                  {[
                    "Invoice number",
                    "Order number",
                    "Invoice date",
                    "Customer",
                    "Payment method",
                    "Payment status",
                    "Order status",
                    "GST (included)",
                    "Invoice total",
                    "Invoice status",
                    "Download status",
                    "Actions",
                  ].map((label) => (
                    <th key={label} className="border-b border-border p-4">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.items.map((invoice) => (
                  <tr
                    key={idOf(invoice)}
                    className="border-b border-border-subtle align-top hover:bg-background-overlay/60"
                  >
                    <td className="p-4">
                      <SelectionCheckbox
                        checked={allResults || selected.has(idOf(invoice))}
                        disabled={allResults}
                        label={`Select ${invoice.invoiceNumber}`}
                        onChange={(event) =>
                          toggleInvoice(idOf(invoice), event.target.checked)
                        }
                      />
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/invoices/${idOf(invoice)}`}
                        className="font-mono text-accent-gold hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="p-4 font-mono text-text-secondary">
                      {invoice.orderNumber}
                    </td>
                    <td className="p-4 text-text-secondary">
                      {dateLabel(invoice.invoiceDate)}
                    </td>
                    <td className="p-4">
                      <p>{invoice.customer.name}</p>
                      <p className="mt-1 text-xs text-text-muted">
                        {invoice.customer.email ||
                          invoice.customer.phone ||
                          "—"}
                      </p>
                    </td>
                    <td className="p-4 uppercase text-text-secondary">
                      {invoice.paymentMethod}
                    </td>
                    <td className="p-4">
                      <StatusPill tone={tone(invoice.currentPaymentStatus)}>
                        {invoice.currentPaymentStatus.replaceAll("_", " ")}
                      </StatusPill>
                    </td>
                    <td className="p-4">
                      <StatusPill tone={tone(invoice.currentOrderStatus)}>
                        {invoice.currentOrderStatus}
                      </StatusPill>
                    </td>
                    <td className="p-4 font-mono">
                      {formatPrecisePrice(invoice.totalTax)}
                    </td>
                    <td className="p-4 font-mono text-accent-gold">
                      {formatPrecisePrice(invoice.grandTotal)}
                    </td>
                    <td className="p-4">
                      <StatusPill tone={tone(invoice.invoiceStatus)}>
                        {invoice.invoiceStatus}
                      </StatusPill>
                    </td>
                    <td className="p-4">
                      <StatusPill
                        tone={
                          invoice.downloadStatus === "downloaded"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {invoice.downloadStatus === "downloaded"
                          ? "Downloaded"
                          : "Not downloaded"}
                      </StatusPill>
                      {invoice.lastDownloadedAt ? (
                        <p className="mt-2 whitespace-nowrap text-xs text-text-muted">
                          {dateLabel(invoice.lastDownloadedAt)}
                        </p>
                      ) : null}
                    </td>
                    <td className="p-4">
                      <div className="grid gap-2">
                        <Link
                          href={`/invoices/${idOf(invoice)}`}
                          className="inline-flex h-10 items-center justify-center border border-border px-3 text-xs uppercase tracking-[0.1em] hover:border-accent-gold"
                        >
                          <Eye size={14} className="mr-2" />
                          View
                        </Link>
                        <Button
                          variant="secondary"
                          onClick={() => void downloadSingle(invoice)}
                          disabled={preparing}
                        >
                          <Download
                            size={18}
                            strokeWidth={2.25}
                            className="mr-2 h-[18px] w-[18px] shrink-0"
                          />
                          PDF
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </AdminDataTable>
          </div>
          <div className="grid gap-3 md:hidden">
            {data?.items.map((invoice) => (
              <AdminCard key={idOf(invoice)} compact>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-3">
                    <SelectionCheckbox
                      checked={allResults || selected.has(idOf(invoice))}
                      disabled={allResults}
                      label={`Select ${invoice.invoiceNumber}`}
                      onChange={(event) =>
                        toggleInvoice(idOf(invoice), event.target.checked)
                      }
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/invoices/${idOf(invoice)}`}
                        className="break-all font-mono text-accent-gold"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="mt-1 text-xs text-text-muted">
                        {dateLabel(invoice.invoiceDate)} · {invoice.orderNumber}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-text-primary">
                    {formatPrecisePrice(invoice.grandTotal)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs uppercase text-text-muted">
                      Customer
                    </p>
                    <p className="mt-1">{invoice.customer.name}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-text-muted">GST</p>
                    <p className="mt-1 font-mono">
                      {formatPrecisePrice(invoice.totalTax)}
                    </p>
                  </div>
                  <StatusPill tone={tone(invoice.currentPaymentStatus)}>
                    {invoice.currentPaymentStatus.replaceAll("_", " ")}
                  </StatusPill>
                  <StatusPill tone={tone(invoice.currentOrderStatus)}>
                    {invoice.currentOrderStatus}
                  </StatusPill>
                  <div className="col-span-2">
                    <p className="mb-2 text-xs uppercase text-text-muted">
                      Download status
                    </p>
                    <StatusPill
                      tone={
                        invoice.downloadStatus === "downloaded"
                          ? "success"
                          : "neutral"
                      }
                    >
                      {invoice.downloadStatus === "downloaded"
                        ? "Downloaded"
                        : "Not downloaded"}
                    </StatusPill>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/invoices/${idOf(invoice)}`}
                    className="inline-flex h-10 flex-1 items-center justify-center border border-border text-xs uppercase tracking-[0.1em]"
                  >
                    <Eye size={14} className="mr-2" />
                    View
                  </Link>
                  <Button
                    className="flex-1"
                    variant="secondary"
                    onClick={() => void downloadSingle(invoice)}
                    disabled={preparing}
                  >
                    <Download
                      size={18}
                      strokeWidth={2.25}
                      className="mr-2 h-[18px] w-[18px] shrink-0"
                    />
                    PDF
                  </Button>
                </div>
              </AdminCard>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-text-secondary">
              Showing all {data?.total} invoices
            </p>
          </div>
        </>
      )}
    </section>
  );
}
