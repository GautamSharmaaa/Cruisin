"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
import { BrowserMultiFormatReader, type IScannerControls } from "@zxing/browser";
import { Button, Input, Field, Alert } from "@cruisin/ui";
import { OPS_COPY as C } from "./constants/copy";

export interface ScannerProps {
  onScan: (code: string) => Promise<void>;
}

export function Scanner({ onScan }: ScannerProps): ReactNode {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const seen = useRef("");
  const scanInFlight = useRef(false);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  const stop = (): void => {
    generation.current++;
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject;
    if (stream instanceof MediaStream) stream.getTracks().forEach(track => track.stop());
    setActive(false);
  };

  useEffect(() => () => {
    generation.current++;
    controls.current?.stop();
  }, []);

  const submit = async (raw: string): Promise<void> => {
    const code = raw.trim();
    if (!code || scanInFlight.current) return;
    scanInFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await onScan(code);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : C.error);
    } finally {
      scanInFlight.current = false;
      setBusy(false);
    }
  };

  const start = async (): Promise<void> => {
    const element = video.current;
    if (!element) return;
    const request = ++generation.current;
    setError("");
    seen.current = "";
    setActive(true);
    try {
      const reader = new BrowserMultiFormatReader();
      const session = await reader.decodeFromVideoDevice(undefined, element, result => {
        if (!result || generation.current !== request || scanInFlight.current) return;
        const code = result.getText();
        if (code === seen.current) return;
        seen.current = code;
        setValue(code);
        void submit(code);
      });
      if (generation.current !== request) session.stop();
      else controls.current = session;
    } catch {
      if (generation.current === request) {
        setError(C.cameraError);
        setActive(false);
      }
    }
  };

  return (
    <div className="ops-scanner ui-stack">
      <div className="ops-scanner-controls">
        <Field label={C.scanInput}>
          <Input value={value} onChange={event => setValue(event.target.value)} maxLength={300}
            onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); void submit(value); } }} />
        </Field>
        <div className="ui-row">
          <Button type="button" disabled={busy || !value.trim()} onClick={() => void submit(value)}>{C.scan}</Button>
          <Button type="button" variant="secondary" onClick={active ? stop : () => void start()}>{active ? C.stopCamera : C.camera}</Button>
        </div>
      </div>
      <video ref={video} muted playsInline className="ops-video" hidden={!active} aria-label={C.scanner} />
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
