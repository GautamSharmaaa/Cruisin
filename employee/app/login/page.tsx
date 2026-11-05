"use client";
import { useState, type ReactNode, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import {
  Button,
  Card,
  Field,
  Input,
  Alert,
  ThemeSelect,
  OTPInput,
} from "@cruisin/ui";
import { OPS_COPY as C } from "@cruisin/operations-ui";
import { employeeTransport as api, setEmployeeCsrf } from "../../lib/api";
const phoneSchema = z.string().regex(/^\+[1-9]\d{7,14}$/);
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
        phoneSchema.parse(phone);
        setChallenge(await api.post("/auth/request-otp", { phone }));
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
          ? C.formInvalid
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
      <p className="ops-eyebrow">{C.brand}</p>
      <Card title={C.otpTitle}>
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
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  aria-label={C.code}
                  render={({ slots }) => (
                    <div className="ui-row">
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
            {challenge ? C.verify : C.sendCode}
          </Button>
        </form>
      </Card>
      <ThemeSelect />
    </main>
  );
}
