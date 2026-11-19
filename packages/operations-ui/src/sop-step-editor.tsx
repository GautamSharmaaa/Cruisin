"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Alert, Button, Field, Input, Textarea, toast } from "@cruisin/ui";
import type { Sop } from "@cruisin/contracts";
import { z } from "zod";
import type { OperationsTransport } from "./api";
import { OPS_COPY as C } from "./constants/copy";
import { SOP_FLOW_COPY as F } from "./constants/packaging-sop";

type Step = NonNullable<Sop["requirements"]>[number];
const stepSchema = z.object({
  key: z.string(),
  label: z.string().trim().min(1).max(500),
  mandatory: z.boolean(),
  photo: z.boolean(),
  scan: z.boolean(),
});
const requirementsSchema = z.array(stepSchema).min(1).max(100);
const labelSchema = z.string().trim().min(1).max(60);
const flowLabelsSchema = z.object({ start: labelSchema, end: labelSchema });

export interface SopStepEditorProps {
  sop: Sop;
  api: OperationsTransport;
  onSaved: (sop: Sop) => void;
  onCancel: () => void;
}

export function SopStepEditor({ sop, api, onSaved, onCancel }: SopStepEditorProps): ReactNode {
  const originalLabels = sop.flowLabels ?? { start: F.start, end: F.end };
  const [labels, setLabels] = useState(originalLabels);
  const [steps, setSteps] = useState<Step[]>(sop.requirements ?? []);
  const [selectedKey, setSelectedKey] = useState(steps[0]?.key ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const selectedIndex = steps.findIndex(step => step.key === selectedKey);
  const selected = steps[selectedIndex];
  const changed = labels.start !== originalLabels.start || labels.end !== originalLabels.end ||
    JSON.stringify(steps) !== JSON.stringify(sop.requirements ?? []);

  useEffect(() => { heading.current?.focus(); }, []);

  function update(patch: Partial<Step>): void {
    setSteps(rows => rows.map(step => step.key === selectedKey ? { ...step, ...patch } : step));
    setError("");
  }

  function move(offset: -1 | 1): void {
    const target = selectedIndex + offset;
    if (selectedIndex < 0 || target < 0 || target >= steps.length) return;
    const next = [...steps];
    [next[selectedIndex], next[target]] = [next[target], next[selectedIndex]];
    setSteps(next);
  }

  function add(): void {
    const step = { key: crypto.randomUUID(), label: "", mandatory: true, photo: false, scan: false };
    setSteps(rows => [...rows, step]);
    setSelectedKey(step.key);
    setError("");
  }

  function remove(): void {
    const next = steps.filter(step => step.key !== selectedKey);
    setSteps(next);
    setSelectedKey(next[Math.min(selectedIndex, next.length - 1)]?.key ?? "");
    setError("");
  }

  async function save(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (busy || !changed) return;
    const parsed = requirementsSchema.safeParse(steps);
    if (!parsed.success) {
      setError(F.invalid);
      const invalid = steps.find(step => !step.label.trim() || step.label.trim().length > 500);
      if (invalid) setSelectedKey(invalid.key);
      return;
    }
    const terminals = flowLabelsSchema.safeParse(labels);
    if (!terminals.success) {
      setError(F.invalidTerminals);
      return;
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api.patch<Sop>(`/sops/${sop._id}`, { version: sop.version, requirements: parsed.data, flowLabels: terminals.data });
      toast.success(C.saved);
      onSaved(saved);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : C.error);
      setBusy(false);
    }
  }

  return (
    <form className="ops-step-editor ui-stack" aria-label={F.editor} onSubmit={event => void save(event)}>
      <div>
        <h3 ref={heading} tabIndex={-1}>{F.editor}</h3>
        <p className="ops-muted">{F.editorHelp}</p>
      </div>
      <fieldset className="ops-step-editor-terminals" disabled={busy}>
        <Field label={F.startLabel}><Input value={labels.start} maxLength={60} onChange={event => setLabels({ ...labels, start: event.target.value })} /></Field>
        <Field label={F.endLabel}><Input value={labels.end} maxLength={60} onChange={event => setLabels({ ...labels, end: event.target.value })} /></Field>
      </fieldset>
      <fieldset className="ops-step-editor-grid" disabled={busy}>
        <div className="ops-step-picker">
          <ol aria-label={F.sequence}>
            {steps.map((step, index) => (
              <li key={step.key}>
                <button type="button" aria-pressed={step.key === selectedKey} onClick={() => setSelectedKey(step.key)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>{step.label || `${F.step} ${index + 1}`}
                </button>
              </li>
            ))}
          </ol>
          <Button variant="secondary" type="button" disabled={steps.length >= 100} onClick={add}>{F.add}</Button>
        </div>
        {selected && <div className="ops-step-inspector ui-stack">
          <p className="ops-eyebrow">{F.step} {selectedIndex + 1} / {steps.length}</p>
          <Field label={F.instruction}>
            <Textarea value={selected.label} rows={3} maxLength={500} onChange={event => update({ label: event.target.value })} />
          </Field>
          <div className="ops-step-flags">
            <label><input type="checkbox" checked={selected.mandatory} onChange={event => update({ mandatory: event.target.checked })} />{F.required}</label>
            <label><input type="checkbox" checked={selected.scan} onChange={event => update({ scan: event.target.checked })} />{F.scan}</label>
            <label><input type="checkbox" checked={selected.photo} onChange={event => update({ photo: event.target.checked })} />{F.photo}</label>
          </div>
          <div className="ui-row">
            <Button variant="secondary" type="button" disabled={selectedIndex === 0} onClick={() => move(-1)}>{C.moveStepUp}</Button>
            <Button variant="secondary" type="button" disabled={selectedIndex === steps.length - 1} onClick={() => move(1)}>{C.moveStepDown}</Button>
            <Button variant="ghost" type="button" disabled={steps.length <= 1} onClick={remove}>{F.remove}</Button>
          </div>
        </div>}
      </fieldset>
      {error && <Alert tone="danger">{error}</Alert>}
      <footer className="ops-step-editor-footer">
        <p className="ops-muted">{F.draftHelp}</p>
        <div className="ui-row">
          <Button variant="secondary" type="button" disabled={busy} onClick={onCancel}>{F.cancel}</Button>
          <Button type="submit" disabled={busy || !changed}>{busy ? F.saving : F.saveDraft}</Button>
        </div>
      </footer>
    </form>
  );
}
