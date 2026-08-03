// Governed by .rules v1.0
'use client';

import { useGoogleOAuth, type CredentialResponse, type GsiButtonConfiguration, type IdConfiguration } from '@react-oauth/google';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IDENTITY_CONFIG } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useGoogleLogin, useLogin, useRegister, useRequestOtp, useVerifyOtp } from '@/hooks/useAuth';
import { e164PhoneSchema, loginSchema, registerSchema, otpVerifySchema } from '@/lib/schemas';
import type { User } from '@/types/user.types';

type AuthTab = 'signin' | 'signup';
type AuthMethod = 'email' | 'whatsapp';
type LoginForm = z.infer<typeof loginSchema>;
type RegisterForm = z.infer<typeof registerSchema>;
type OtpVerifyForm = z.infer<typeof otpVerifySchema>;

interface GoogleAuthButtonProps {
  tab: AuthTab;
  width: number;
  onCredential: (credential: string) => void;
}

interface GoogleIdentityApi {
  initialize: (configuration: IdConfiguration) => void;
  renderButton: (parent: HTMLElement, configuration: GsiButtonConfiguration & { locale?: string }) => void;
}

interface GoogleIdentityWindow extends Window {
  google?: { accounts: { id: GoogleIdentityApi } };
}

const destinationFor = (user: User): string => user.profileIncomplete ? ROUTES.account + '?complete=1' : ROUTES.account;

export interface AuthPageProps {
  initialTab: AuthTab;
}

export function AuthPage({ initialTab }: AuthPageProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [method, setMethod] = useState<AuthMethod>('email');
  const [countryCode, setCountryCode] = useState('+91');
  const [nationalNumber, setNationalNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(360);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const login = useLogin();
  const registerMutation = useRegister();
  const googleLogin = useGoogleLogin();
  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const emailLoginForm = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });
  const emailRegisterForm = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) });
  const verifyForm = useForm<OtpVerifyForm>({ resolver: zodResolver(otpVerifySchema) });
  const fullPhone = useMemo(() => {
    const country = countryCode.trim().replace(/[^\d+]/g, '');
    const normalizedCountry = country.startsWith('+') ? country : '+' + country;
    return normalizedCountry + nationalNumber.replace(/\D/g, '');
  }, [countryCode, nationalNumber]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => setSecondsRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  useEffect(() => {
    const element = googleButtonRef.current;
    if (!element || !IDENTITY_CONFIG.googleClientId) return;
    const updateWidth = (): void => setGoogleButtonWidth(Math.max(220, Math.min(400, Math.floor(element.clientWidth - 2))));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const resetOtp = (): void => {
    requestOtp.reset();
    verifyOtp.reset();
    verifyForm.reset();
    setSecondsRemaining(0);
    setPhoneError('');
  };

  const selectTab = (nextTab: AuthTab): void => {
    setTab(nextTab);
    setRegistrationComplete(false);
    resetOtp();
  };

  const selectMethod = (nextMethod: AuthMethod): void => {
    setMethod(nextMethod);
    resetOtp();
  };

  const finishAuth = (user: User): void => {
    const redirect = searchParams.get('redirect') ?? searchParams.get('next');
    const destination = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : destinationFor(user);
    router.push(destination);
  };

  const sendOtp = (): void => {
    const parsed = e164PhoneSchema.safeParse(fullPhone);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number');
      return;
    }
    setPhoneError('');
    requestOtp.mutate(
      { phone: parsed.data, channel: 'whatsapp' },
      {
        onSuccess: (result) => {
          verifyForm.setValue('requestId', result.requestId);
          setSecondsRemaining(result.cooldownSeconds);
        }
      }
    );
  };

  const authError = login.error ?? registerMutation.error ?? googleLogin.error ?? requestOtp.error ?? verifyOtp.error;
  const channelLabel = 'WhatsApp';

  return (
    <main className="min-h-dvh px-6 pb-28 pt-4 sm:pt-6 lg:px-20 lg:py-28">
      <div data-testid="auth-shell" className="mx-auto grid max-w-[1100px] overflow-hidden border border-border bg-background-elevated lg:grid-cols-[0.8fr_1.2fr]">
        <section data-testid="auth-brand-panel" className="relative hidden min-h-[720px] flex-col justify-between overflow-hidden bg-background-overlay p-10 lg:flex">
          <div data-testid="auth-brand-artwork" className="absolute inset-0" aria-hidden="true">
            <div data-testid="auth-brand-image-stage" className="absolute inset-x-0 top-0 h-[960px]">
              <Image src="/cruisin-auth-monogram.webp" alt="" fill priority sizes="(min-width: 1024px) 440px, 0px" className="object-cover object-[50%_48%] opacity-95" />
            </div>
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,15,15,0.96)_0%,rgba(15,15,15,0.42)_24%,rgba(15,15,15,0.06)_58%,rgba(15,15,15,0.88)_100%)]" />
            <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(8,8,8,0.16),transparent_30%,transparent_70%,rgba(8,8,8,0.2))]" />
          </div>
          <div className="relative z-10 shrink-0">
            <h1 data-testid="auth-brand-wordmark" className="brand-wordmark-script auth-wordmark-motion -ml-4 text-[5.5rem] leading-none">{COPY.brand.name}</h1>
            <p data-testid="auth-brand-label" className="mt-5 font-accent text-xs uppercase tracking-[0.18em] text-accent-gold">{COPY.brand.label}</p>
          </div>
          <p className="relative z-10 max-w-sm shrink-0 text-base leading-7 text-text-secondary">{COPY.brand.tagline}</p>
        </section>

        <section className="p-6 sm:p-10 lg:p-14">
          <div className="grid grid-cols-2 border border-border" role="tablist" aria-label="Authentication">
            <button type="button" role="tab" aria-selected={tab === 'signin'} onClick={() => selectTab('signin')} className={'h-12 text-xs uppercase tracking-[0.1em] ' + (tab === 'signin' ? 'bg-accent-gold text-text-inverse' : 'text-text-secondary')}>Sign In</button>
            <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => selectTab('signup')} className={'h-12 text-xs uppercase tracking-[0.1em] ' + (tab === 'signup' ? 'bg-accent-gold text-text-inverse' : 'text-text-secondary')}>Create Account</button>
          </div>

          <h2 className="sr-only">{tab === 'signin' ? COPY.auth.signIn : COPY.auth.createAccount}</h2>
          <p className="mt-8 text-sm text-text-secondary">Choose how you would like to continue.</p>

          <div className="mt-7">
            <p className="text-center font-accent text-[10px] uppercase tracking-[0.22em] text-accent-gold">Secure account access</p>
            <div data-testid="auth-method-stack" className="mx-auto mt-4 grid w-full max-w-[400px] gap-3">
              {IDENTITY_CONFIG.googleClientId ? (
                <div ref={googleButtonRef} data-testid="google-auth-frame" className="flex min-h-12 w-full items-center justify-center overflow-hidden border border-accent-gold/30 bg-[#202124] p-px shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition duration-300 hover:border-accent-gold/60">
                  <GoogleAuthButton
                    tab={tab}
                    width={googleButtonWidth}
                    onCredential={(credential) => googleLogin.mutate(credential, { onSuccess: (data) => finishAuth(data.user) })}
                  />
                </div>
              ) : (
                <Button type="button" variant="secondary" disabled className="w-full">{COPY.auth.googleMethod}</Button>
              )}
              {IDENTITY_CONFIG.whatsappOtpEnabled ? <>
                <div className="flex items-center gap-3 py-1" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="font-accent text-[9px] uppercase tracking-[0.2em] text-text-muted">Other secure methods</span><span className="h-px flex-1 bg-border" /></div>
                <Button type="button" variant={method === 'whatsapp' ? 'primary' : 'secondary'} onClick={() => selectMethod('whatsapp')} className="w-full">Continue with WhatsApp OTP</Button>
              </> : null}
              <Button type="button" variant={method === 'email' ? 'primary' : 'secondary'} onClick={() => selectMethod('email')} className="w-full">Continue with Email</Button>
            </div>
          </div>

          {method === 'email' && tab === 'signin' ? (
            <form noValidate onSubmit={emailLoginForm.handleSubmit((data) => login.mutate(data, { onSuccess: (result) => finishAuth(result.user) }))} className="mt-8 grid gap-4 border-t border-border pt-7">
              <Input label={COPY.auth.email} type="email" autoComplete="email" error={emailLoginForm.formState.errors.email?.message} {...emailLoginForm.register('email')} />
              <Input label={COPY.auth.password} type="password" autoComplete="current-password" error={emailLoginForm.formState.errors.password?.message} {...emailLoginForm.register('password')} />
              <Button type="submit" className="w-full" isLoading={login.isPending}>{COPY.auth.signIn}</Button>
            </form>
          ) : null}

          {method === 'email' && tab === 'signup' ? (
            <form noValidate onSubmit={emailRegisterForm.handleSubmit((data) => registerMutation.mutate({ name: data.name, email: data.email, password: data.password }, { onSuccess: () => setRegistrationComplete(true) }))} className="mt-8 grid gap-4 border-t border-border pt-7">
              <Input label={COPY.auth.name} autoComplete="name" error={emailRegisterForm.formState.errors.name?.message} {...emailRegisterForm.register('name')} />
              <Input label={COPY.auth.email} type="email" autoComplete="email" error={emailRegisterForm.formState.errors.email?.message} {...emailRegisterForm.register('email')} />
              <Input label={COPY.auth.password} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.password?.message} {...emailRegisterForm.register('password')} />
              <Input label={COPY.auth.confirmPassword} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.confirmPassword?.message} {...emailRegisterForm.register('confirmPassword')} />
              {registrationComplete ? <p className="text-sm text-success" aria-live="polite">Account created. Check your email to verify it, then sign in.</p> : null}
              <Button type="submit" className="w-full" isLoading={registerMutation.isPending} disabled={registrationComplete}>{registrationComplete ? 'Account created' : COPY.auth.createAccount}</Button>
            </form>
          ) : null}

          {method !== 'email' ? (
            <div className="mt-8 grid gap-5 border-t border-border pt-7">
              <div className="grid grid-cols-[110px_1fr] gap-3">
                <Input label="Country code" inputMode="tel" autoComplete="tel-country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
                <Input label="WhatsApp number" inputMode="numeric" autoComplete="tel-national" value={nationalNumber} onChange={(event) => setNationalNumber(event.target.value)} error={phoneError || undefined} />
              </div>
              <Button type="button" className="w-full" isLoading={requestOtp.isPending} disabled={Boolean(requestOtp.data) && secondsRemaining > 0} onClick={sendOtp}>
                {requestOtp.data ? (secondsRemaining > 0 ? `Resend in ${secondsRemaining}s` : 'Resend OTP') : `Send OTP on ${channelLabel}`}
              </Button>

              {requestOtp.data ? (
                <form noValidate onSubmit={verifyForm.handleSubmit((data) => verifyOtp.mutate(data, { onSuccess: (result) => finishAuth(result.user) }))} className="grid gap-4 border-t border-border pt-5">
                  <p className="text-sm text-success" aria-live="polite">OTP sent on {channelLabel}. It expires in 5 minutes.</p>
                  <Input label={COPY.auth.otp} inputMode="numeric" autoComplete="one-time-code" maxLength={6} error={verifyForm.formState.errors.otp?.message} {...verifyForm.register('otp')} />
                  <input type="hidden" {...verifyForm.register('requestId')} />
                  {requestOtp.data.developmentCode ? <p className="font-mono text-xs text-accent-gold">{COPY.auth.developmentCode}: {requestOtp.data.developmentCode}</p> : null}
                  <Button type="submit" className="w-full" isLoading={verifyOtp.isPending}>{COPY.auth.verifyOtp}</Button>
                </form>
              ) : null}
            </div>
          ) : null}

          {authError ? <p className="mt-5 text-sm text-danger" aria-live="polite">{authError.message}</p> : null}
          {!IDENTITY_CONFIG.googleClientId ? <p className="mt-5 text-xs text-text-muted">{COPY.auth.providerUnavailable}</p> : null}
        </section>
      </div>
    </main>
  );
}

function GoogleAuthButton({ tab, width, onCredential }: GoogleAuthButtonProps): ReactNode {
  const buttonRef = useRef<HTMLDivElement | null>(null);
  const onCredentialRef = useRef(onCredential);
  const { clientId, locale, scriptLoadedSuccessfully } = useGoogleOAuth();
  onCredentialRef.current = onCredential;

  useEffect(() => {
    if (!scriptLoadedSuccessfully) return;
    const identity = (window as GoogleIdentityWindow).google?.accounts.id;
    identity?.initialize({
      client_id: clientId,
      callback: (response: CredentialResponse) => {
        if (response.credential) onCredentialRef.current(response.credential);
      }
    });
  }, [clientId, scriptLoadedSuccessfully]);

  useEffect(() => {
    const element = buttonRef.current;
    if (!element || !scriptLoadedSuccessfully) return;
    const identity = (window as GoogleIdentityWindow).google?.accounts.id;
    if (!identity) return;
    element.replaceChildren();
    identity.renderButton(element, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: tab === 'signup' ? 'signup_with' : 'continue_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width,
      locale
    });
  }, [locale, scriptLoadedSuccessfully, tab, width]);

  return <div ref={buttonRef} className="h-10" />;
}
