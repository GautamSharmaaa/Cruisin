"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button, Field, Input, Alert } from "@cruisin/ui";
import { OPS_COPY as C } from "@cruisin/operations-ui";
import { PageHeader } from "@/components/dashboard/page-header";
import { AdminCard } from "@/components/dashboard/admin-ui";
import { EMPLOYEE_WEBSITE_COPY as E } from "@/constants/employee-website-copy";

export function OperationsSettings(): ReactNode {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [message, setMessage] = useState("");
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setTimezone(localStorage.getItem("cruisin-timezone") ?? "Asia/Kolkata"), []);

  return (
    <section className="admin-employee-workspace grid gap-6">
      <PageHeader eyebrow={E.label} title={C.settings} subtitle={E.descriptions.settings} />
      <AdminCard>
        <form className="ui-stack max-w-md" onSubmit={event => {
          event.preventDefault();
          const zone = timezone.trim();
          try {
            new Intl.DateTimeFormat("en", { timeZone: zone });
            localStorage.setItem("cruisin-timezone", zone);
            setTimezone(zone);
            setInvalid(false);
            setMessage(C.saved);
          } catch {
            setInvalid(true);
            setMessage(C.formInvalid);
          }
        }}>
          <Field label={C.timezone}>
            <Input value={timezone} onChange={event => { setTimezone(event.target.value); setMessage(""); }} required />
          </Field>
          <div><Button type="submit">{C.save}</Button></div>
          {message && <Alert tone={invalid ? "danger" : "success"}>{message}</Alert>}
        </form>
      </AdminCard>
    </section>
  );
}
