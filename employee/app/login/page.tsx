"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Button,
  Field,
  Input,
  Alert,
  ThemeSelect,
  OTPInput,
} from "@cruisin/ui";
import { EMPLOYEE_COPY as E } from "../../constants/copy";
import { OPS_COPY as C } from "@cruisin/operations-ui";
import { employeeTransport as api, setEmployeeCsrf } from "../../lib/api";
const phoneSchema = z.string().transform(value => value.replace(/\s+/g, "")).pipe(z.string().regex(/^\+[1-9]\d{7,14}$/));
const codeSchema = z.string().regex(/^\d{6}$/);
export default function Login(): ReactNode {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [challenge, setChallenge] = useState<{
    challengeId: string;
    developmentCode?: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (!challenge) {
        const registeredPhone = phoneSchema.parse(phone);
        setChallenge(await api.post("/auth/request-otp", { phone: registeredPhone }));
      } else {
        codeSchema.parse(code);
        const result = await api.post<{ csrf: string }>("/auth/verify-otp", {
          challengeId: challenge.challengeId,
          code,
        });
        setEmployeeCsrf(result.csrf);
        router.replace("/");
      }
    } catch (err) {
      setError(
        err instanceof z.ZodError
          ? (challenge ? E.invalidCode : E.invalidPhone)
          : err instanceof Error
            ? err.message
            : C.error,
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="ops-login">
      <header className="employee-login-brand"><p className="ops-eyebrow">{E.eyebrow}</p><p className="employee-wordmark">{C.brand}</p></header>
      <section className="employee-login-panel" aria-labelledby="employee-login-title">
        <h1 id="employee-login-title">{C.otpTitle}</h1>
        <p>{C.otpDescription}</p>
        <form className="ui-stack" onSubmit={(e) => void submit(e)}>
          {!challenge ? (
            <Field label={C.phone}>
              <Input
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91"
                required
              />
            </Field>
          ) : (
            <>
              <Field label={C.code}>
                <OTPInput
                  autoFocus
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={C.code}
                  render={({ slots }) => (
                    <div className="ops-otp-row">
                      {slots.map((slot, index) => (
                        <span className="ui-input ops-otp-slot" key={index}>
                          {slot.char ?? "·"}
                        </span>
                      ))}
                    </div>
                  )}
                />
              </Field>
              {challenge.developmentCode && (
                <Alert>
                  {C.developmentCode}:{" "}
                  <strong>{challenge.developmentCode}</strong>
                </Alert>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  setChallenge(null);
                  setCode("");
                }}
              >
                {C.back}
              </Button>
            </>
          )}
          {error && <Alert tone="danger">{error}</Alert>}
          <Button type="submit" disabled={busy}>
            {busy ? E.loginPending : challenge ? C.verify : C.sendCode}
          </Button>
        </form>
      </section>
      <ThemeSelect />
    </main>
  );
}
