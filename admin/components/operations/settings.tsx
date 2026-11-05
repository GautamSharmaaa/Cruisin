"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Card, Field, Input, Alert } from "@cruisin/ui";
import { OPS_COPY as C } from "@cruisin/operations-ui";
export function OperationsSettings(): ReactNode {
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [message, setMessage] = useState("");
  useEffect(
    () =>
      setTimezone(localStorage.getItem("cruisin-timezone") ?? "Asia/Kolkata"),
    [],
  );
  return (
    <Card title={C.settings}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          try {
            new Intl.DateTimeFormat("en", { timeZone: timezone });
            localStorage.setItem("cruisin-timezone", timezone);
            setMessage(C.saved);
          } catch {
            setMessage(C.formInvalid);
          }
        }}
      >
        <Field label={C.timezone}>
          <Input
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
        </Field>
        <Button type="submit">{C.save}</Button>
        {message && <Alert>{message}</Alert>}
      </form>
    </Card>
  );
}
