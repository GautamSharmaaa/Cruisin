"use client";
import { useEffect, useState, type ReactNode } from "react";
import { Button, Field, Textarea } from "@cruisin/ui";
import { OPS_COPY as C } from "./constants/copy";
import { NativeSelect, fail } from "./common";
import type { OperationsTransport } from "./api";
export interface ApprovalFormProps {
  api: OperationsTransport;
  onSaved: () => void;
}
export function ApprovalForm({ api, onSaved }: ApprovalFormProps): ReactNode {
  const [kind, setKind] = useState("inspection");
  const [entity, setEntity] = useState("");
  const [options, setOptions] = useState<
    { _id: string; title?: string; orderNumber?: string }[]
  >([]);
  useEffect(() => {
    setEntity("");
    void api
      .get<typeof options>(
        kind === "inspection" ? "/product-options" : "/order-options",
      )
      .then(setOptions)
      .catch(fail);
  }, [api, kind]);
  return (
    <form
      className="ui-stack"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        void api
          .post("/approvals", {
            kind,
            entity,
            reason: form.get("reason"),
            proposed: { note: form.get("note") },
          })
          .then(onSaved)
          .catch(fail);
      }}
    >
      <NativeSelect
        label={C.kind}
        value={kind}
        onChange={(v) => setKind(v[0] ?? "inspection")}
        options={[
          { value: "inspection", label: C.inspection },
          { value: "order_exception", label: C.orderException },
        ]}
      />
      <NativeSelect
        label={C.entity}
        value={entity}
        onChange={(v) => setEntity(v[0] ?? "")}
        options={options.map((o) => ({
          value: o._id,
          label: o.title ?? o.orderNumber ?? C.orders,
        }))}
      />
      <Field label={C.description}>
        <Textarea name="note" required minLength={3} />
      </Field>
      <Field label={C.reason}>
        <Textarea name="reason" required minLength={5} />
      </Field>
      <Button type="submit" disabled={!entity}>
        {C.requestApproval}
      </Button>
    </form>
  );
}
