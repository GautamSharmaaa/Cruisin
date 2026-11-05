"use client";
import { useRef, useState, useEffect, type ReactNode } from "react";
import {
  BrowserMultiFormatReader,
  type IScannerControls,
} from "@zxing/browser";
import { Button, Input, Field, Alert } from "@cruisin/ui";
import { OPS_COPY as C } from "./constants/copy";
export interface ScannerProps {
  onScan: (code: string) => Promise<void>;
}
export function Scanner({ onScan }: ScannerProps): ReactNode {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const seen = useRef("");
  const mounted = useRef(true);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [active, setActive] = useState(false);
  const stop = (): void => {
    controls.current?.stop();
    controls.current = null;
    video.current?.srcObject &&
      (video.current.srcObject as MediaStream)
        .getTracks()
        .forEach((t) => t.stop());
    setActive(false);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      controls.current?.stop();
    };
  }, []);
  const start = async (): Promise<void> => {
    setError("");
    seen.current = "";
    setActive(true);
    try {
      const reader = new BrowserMultiFormatReader();
      const c = await reader.decodeFromVideoDevice(
        undefined,
        video.current!,
        (result) => {
          if (result && result.getText() !== seen.current) {
            seen.current = result.getText();
            setValue(result.getText());
            void onScan(result.getText()).catch((e) =>
              setError(e instanceof Error ? e.message : C.error),
            );
          }
        },
      );
      if (!mounted.current) {
        c.stop();
        return;
      }
      controls.current = c;
    } catch {
      setError(C.cameraError);
      setActive(false);
    }
  };
  return (
    <div className="ui-stack">
      <video
        ref={video}
        muted
        playsInline
        className="ops-video"
        aria-label={C.scanner}
      />
      <div className="ui-row">
        <Button onClick={() => void start()} disabled={active}>
          {C.camera}
        </Button>
        <Button variant="secondary" onClick={stop} disabled={!active}>
          {C.stopCamera}
        </Button>
      </div>
      <div className="ui-stack">
        <Field label={C.scanInput}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={300}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                setError("");
                void onScan(value).catch((err) =>
                  setError(err instanceof Error ? err.message : C.error),
                );
              }
            }}
          />
        </Field>
        <Button
          type="button"
          onClick={() => {
            setError("");
            void onScan(value).catch((err) =>
              setError(err instanceof Error ? err.message : C.error),
            );
          }}
        >
          {C.scan}
        </Button>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
    </div>
  );
}
