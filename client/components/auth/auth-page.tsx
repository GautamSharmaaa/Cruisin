// Governed by .rules v1.0
'use client';

import { useGoogleOAuth, type CredentialResponse, type GsiButtonConfiguration, type IdConfiguration } from '@react-oauth/google';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Controller, useForm } from 'react-hook-form';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IDENTITY_CONFIG } from '@/constants/config';
import { COPY } from '@/constants/copy';
import { ROUTES } from '@/constants/routes';
import { useGoogleLogin, useLogin, useRegister, useRequestOtp, useVerifyOtp } from '@/hooks/useAuth';
import { e164PhoneSchema, loginSchema, registerSchema, otpVerifySchema } from '@/lib/schemas';
import { acquireBodyScrollLock } from '@/lib/body-scroll-lock';
import type { User } from '@/types/user.types';

type AuthTab = 'signin' | 'signup';
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

interface OtpCodeInputProps {
  value: string;
  name: string;
  error?: string;
  isLoading: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onBlur: () => void;
  onValueChange: (value: string) => void;
}

const destinationFor = (user: User): string => user.profileIncomplete ? ROUTES.account + '?complete=1' : ROUTES.account;
const formatCountdown = (seconds: number): string => `00:${String(seconds).padStart(2, '0')}`;
const formatPhone = (countryCode: string, nationalNumber: string): string => `${countryCode} ${nationalNumber.replace(/(\d{5})(\d{1,5})/, '$1 $2').trim()}`;

export interface AuthPageProps {
  initialTab: AuthTab;
  presentation?: 'page' | 'sheet';
  initialMethod?: 'whatsapp' | 'alternative';
  redirectTo?: string;
  onDismiss?: () => void;
}

export function AuthPage({ initialTab, presentation = 'page', initialMethod, redirectTo, onDismiss }: AuthPageProps): ReactNode {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<AuthTab>(initialTab);
  const [showAlternatives, setShowAlternatives] = useState(() => !IDENTITY_CONFIG.whatsappOtpEnabled || initialMethod === 'alternative' || searchParams.get('method') === 'alternative');
  const [countryCode, setCountryCode] = useState('+91');
  const [nationalNumber, setNationalNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(0);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [googleButtonWidth, setGoogleButtonWidth] = useState(360);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const lastSubmittedOtpRef = useRef('');
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
    if (presentation !== 'sheet') return;
    const releaseScrollLock = acquireBodyScrollLock();
    document.body.classList.add('mobile-auth-open');
    return () => {
      releaseScrollLock();
      document.body.classList.remove('mobile-auth-open');
    };
  }, [presentation]);

  useEffect(() => {
    if (presentation !== 'sheet' || showAlternatives || requestOtp.data) return;
    const focusTimer = window.setTimeout(() => document.getElementById('whatsapp-number')?.focus(), 80);
    return () => window.clearTimeout(focusTimer);
  }, [presentation, requestOtp.data, showAlternatives]);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timer = window.setInterval(() => setSecondsRemaining((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsRemaining]);

  useEffect(() => {
    if (!requestOtp.data || !window.matchMedia('(max-width: 639px)').matches) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('mobile-otp-open');
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.classList.remove('mobile-otp-open');
    };
  }, [requestOtp.data]);

  useEffect(() => {
    const element = googleButtonRef.current;
    if (!element || !IDENTITY_CONFIG.googleClientId) return;
    const updateWidth = (): void => setGoogleButtonWidth(Math.max(220, Math.min(400, Math.floor(element.clientWidth - 2))));
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);
    return () => observer.disconnect();
  }, [showAlternatives]);

  const resetOtp = (): void => {
    requestOtp.reset();
    verifyOtp.reset();
    verifyForm.reset();
    lastSubmittedOtpRef.current = '';
    setSecondsRemaining(0);
    setPhoneError('');
  };

  const resetAlternativeAuth = (): void => {
    login.reset();
    registerMutation.reset();
    googleLogin.reset();
    setRegistrationComplete(false);
  };

  const selectTab = (nextTab: AuthTab): void => {
    setTab(nextTab);
    resetAlternativeAuth();
    resetOtp();
  };

  const showWhatsApp = (): void => {
    setShowAlternatives(false);
    resetAlternativeAuth();
    resetOtp();
  };

  const showEmailOrGoogle = (): void => {
    setShowAlternatives(true);
    resetAlternativeAuth();
    resetOtp();
  };

  const finishAuth = (user: User): void => {
    const redirect = redirectTo ?? searchParams.get('redirect') ?? searchParams.get('next');
    const destination = redirect?.startsWith('/') && !redirect.startsWith('//') ? redirect : destinationFor(user);
    onDismiss?.();
    router.push(destination);
  };

  const verifyCode = (data: OtpVerifyForm): void => {
    if (verifyOtp.isPending) return;
    verifyOtp.mutate(data, { onSuccess: (result) => finishAuth(result.user) });
  };

  const handleOtpValueChange = (value: string): void => {
    const otp = value.replace(/\D/g, '').slice(0, 6);
    if (otp !== verifyForm.getValues('otp')) verifyOtp.reset();
    verifyForm.setValue('otp', otp, { shouldDirty: true, shouldTouch: true, shouldValidate: otp.length === 6 });
    if (otp.length < 6) {
      lastSubmittedOtpRef.current = '';
      return;
    }
    if (lastSubmittedOtpRef.current === otp || verifyOtp.isPending) return;
    const parsed = otpVerifySchema.safeParse({ requestId: verifyForm.getValues('requestId'), otp });
    if (!parsed.success) {
      void verifyForm.trigger();
      return;
    }
    lastSubmittedOtpRef.current = otp;
    verifyCode(parsed.data);
  };

  const sendOtp = (): void => {
    const parsed = e164PhoneSchema.safeParse(fullPhone);
    if (!parsed.success) {
      setPhoneError(parsed.error.issues[0]?.message ?? 'Enter a valid phone number');
      return;
    }
    setPhoneError('');
    verifyOtp.reset();
    lastSubmittedOtpRef.current = '';
    verifyForm.setValue('otp', '');
    requestOtp.mutate(
      { phone: parsed.data, channel: 'whatsapp' },
      {
        onSuccess: (result) => {
          verifyForm.setValue('requestId', result.requestId);
          setSecondsRemaining(result.cooldownSeconds);
          window.setTimeout(() => document.getElementById('whatsapp-otp')?.focus(), 50);
        }
      }
    );
  };

  const otpError = verifyForm.formState.errors.otp?.message ?? (verifyOtp.error ? (/invalid otp/i.test(verifyOtp.error.message) ? COPY.auth.whatsapp.incorrectCode : verifyOtp.error.message) : undefined);
  const authError = login.error ?? registerMutation.error ?? googleLogin.error ?? requestOtp.error;
  const whatsappPrimary = IDENTITY_CONFIG.whatsappOtpEnabled && !showAlternatives;
  const otpOverlay = requestOtp.data ? <div data-testid="otp-mobile-overlay" className={presentation === 'sheet' ? 'fixed inset-0 z-[200] flex items-end md:hidden' : 'fixed inset-0 z-[160] flex items-end sm:static sm:z-auto sm:block'}>
    <button type="button" data-testid="otp-mobile-backdrop" aria-label={COPY.common.close} onClick={resetOtp} className="mobile-otp-backdrop absolute inset-0 bg-black/50 backdrop-blur-sm sm:hidden" />
    <form noValidate role="dialog" aria-modal="true" aria-labelledby="mobile-otp-title" onKeyDown={(event) => { if (event.key === 'Escape') resetOtp(); }} onSubmit={verifyForm.handleSubmit(verifyCode)} data-testid="otp-bottom-sheet" className="mobile-otp-sheet relative z-10 grid h-[52dvh] min-h-[360px] max-h-[460px] w-full gap-2 overflow-y-auto rounded-t-[32px] border-x border-t border-accent-gold/70 bg-background-elevated px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-24px_80px_rgba(0,0,0,0.9)] sm:mt-8 sm:h-auto sm:min-h-0 sm:max-h-none sm:gap-4 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
      <div className="sm:hidden">
        <div className="grid grid-cols-[44px_1fr_44px] items-center">
          <button type="button" onClick={resetOtp} aria-label={COPY.auth.whatsapp.changeNumber} className="grid h-11 w-11 place-items-center text-accent-gold"><ArrowLeft size={24} strokeWidth={1.5} /></button>
          <Image src="/cruisin-logo.svg" alt={COPY.brand.name} width={271} height={163} priority className="mx-auto h-auto w-16 opacity-90" />
          <button type="button" onClick={resetOtp} aria-label={COPY.common.close} className="grid h-11 w-11 place-items-center text-accent-gold"><X size={24} strokeWidth={1.5} /></button>
        </div>
        <h2 id="mobile-otp-title" className="mt-2 text-center font-display text-2xl font-light text-text-primary">{COPY.auth.whatsapp.enterOtp}</h2>
        <p className="mt-1 text-center font-mono text-[10px] text-accent-gold">{COPY.auth.whatsapp.sentTo} {formatPhone(countryCode, nationalNumber)}</p>
      </div>
      <div className="hidden border border-success/30 bg-success/5 px-4 py-3 sm:block"><p className="text-sm text-success" aria-live="polite">{COPY.auth.whatsapp.codeSent}</p><button type="button" className="mt-2 text-xs uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary" onClick={resetOtp}>{COPY.auth.whatsapp.changeNumber}</button></div>
      <Controller control={verifyForm.control} name="otp" render={({ field }) => <OtpCodeInput value={field.value ?? ''} name={field.name} inputRef={field.ref} onBlur={field.onBlur} onValueChange={handleOtpValueChange} error={otpError} isLoading={verifyOtp.isPending} />} />
      <input type="hidden" {...verifyForm.register('requestId')} />
      {requestOtp.data.developmentCode ? <p className="font-mono text-xs text-accent-gold">{COPY.auth.developmentCode}: {requestOtp.data.developmentCode}</p> : null}
      <Button type="submit" className="hidden h-12 w-full sm:inline-flex" isLoading={verifyOtp.isPending}>{COPY.auth.submit}</Button>
      <Button type="button" variant="ghost" className="w-full normal-case tracking-normal sm:uppercase sm:tracking-[0.1em]" disabled={secondsRemaining > 0 || requestOtp.isPending} isLoading={requestOtp.isPending} onClick={sendOtp}><span className="sm:hidden">{secondsRemaining > 0 ? COPY.auth.whatsapp.resendCountdown.replace('{time}', formatCountdown(secondsRemaining)) : COPY.auth.whatsapp.resendCode}</span><span className="hidden sm:inline">{secondsRemaining > 0 ? COPY.auth.whatsapp.resendCodeIn.replace('{seconds}', String(secondsRemaining)) : COPY.auth.whatsapp.resendCode}</span></Button>
      <Button type="button" variant="secondary" className="w-full sm:hidden" onClick={() => { resetOtp(); showEmailOrGoogle(); }}>{COPY.auth.whatsapp.useAlternatives}</Button>
    </form>
  </div> : null;

  const authShell = (
      <div data-testid="auth-shell" className={presentation === 'sheet' ? 'relative z-10 grid h-[52dvh] min-h-[360px] max-h-[calc(100dvh-1rem)] w-full overflow-y-auto rounded-t-[32px] border-x border-t border-accent-gold/70 bg-background-elevated shadow-[0_-24px_80px_rgba(0,0,0,0.9)]' : 'mx-auto grid w-full max-w-[1100px] overflow-hidden rounded-t-[32px] border border-accent-gold/50 bg-background-elevated shadow-lg sm:rounded-none sm:border-border lg:grid-cols-[0.8fr_1.2fr]'}>
        {presentation === 'sheet' ? <div className="flex h-11 shrink-0 items-center justify-end px-3"><button type="button" onClick={onDismiss} aria-label={COPY.common.close} className="grid h-11 w-11 place-items-center text-accent-gold transition hover:text-text-primary"><X size={22} strokeWidth={1.5} /></button></div> : null}
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

        <section className={presentation === 'sheet' ? 'px-6 pb-4 pt-0' : 'p-6 pb-8 sm:p-10 lg:p-14'}>
          {whatsappPrimary ? <div className="mx-auto w-full max-w-[420px]" data-testid="whatsapp-primary-auth">
            <div className="hidden sm:block">
              <p className="font-accent text-[10px] uppercase tracking-[0.22em] text-accent-gold">{COPY.auth.whatsapp.eyebrow}</p>
              <h2 className="mt-4 font-display text-4xl font-light text-text-primary sm:text-5xl">{COPY.auth.whatsapp.continue}</h2>
              <p className="mt-4 text-sm leading-6 text-text-secondary">{COPY.auth.whatsapp.intro}</p>
            </div>

            <div className={requestOtp.data ? 'pointer-events-none select-none sm:hidden' : ''} aria-hidden={requestOtp.data ? true : undefined}>
              <div className="text-center sm:hidden">
                <Image src="/cruisin-logo.svg" alt={COPY.brand.name} width={271} height={163} priority className="mx-auto h-auto w-16 opacity-90" />
                <h2 className="mt-1 font-display text-xl font-light leading-tight text-text-primary">{COPY.auth.whatsapp.mobileTitle}</h2>
                <p className="mt-1 text-[11px] leading-4 text-text-secondary">{COPY.auth.whatsapp.mobileBody}</p>
              </div>
              <form noValidate onSubmit={(event) => { event.preventDefault(); sendOtp(); }} className="mt-4 grid gap-3 sm:mt-8 sm:gap-5">
                <div className="gap-3 sm:grid sm:grid-cols-[86px_minmax(0,1fr)]">
                  <div className="hidden sm:block">
                    <Input label={COPY.auth.whatsapp.countryCode} inputMode="tel" autoComplete="tel-country-code" value={countryCode} onChange={(event) => setCountryCode(event.target.value)} />
                  </div>
                  <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary transition focus-within:text-accent-gold" htmlFor="whatsapp-number">
                    <span className="hidden sm:block">{COPY.auth.whatsapp.phone}</span>
                    <span className={'flex h-14 items-center overflow-hidden rounded-2xl border bg-background-input transition sm:mt-2 sm:h-12 sm:rounded-none ' + (phoneError ? 'border-danger' : 'border-accent-gold/60 sm:border-border-subtle')}>
                      <span className="border-r border-border px-4 font-mono text-base font-normal tracking-[0.04em] text-text-secondary sm:hidden">{countryCode}</span>
                      <input id="whatsapp-number" type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="send" aria-label={COPY.auth.whatsapp.phone} aria-invalid={Boolean(phoneError)} aria-describedby={phoneError ? 'whatsapp-number-error' : undefined} autoFocus maxLength={10} value={nationalNumber} onChange={(event) => setNationalNumber(event.target.value.replace(/\D/g, '').slice(0, 10))} placeholder={COPY.auth.whatsapp.phonePlaceholder} className="mobile-phone-input h-full min-w-0 flex-1 bg-transparent px-4 font-mono text-base font-normal normal-case tracking-[0.04em] text-text-secondary outline-none placeholder:font-normal placeholder:tracking-[0.04em] placeholder:text-text-muted" />
                    </span>
                    {phoneError ? <span id="whatsapp-number-error" className="mt-2 block text-xs normal-case tracking-normal text-danger" aria-live="polite">{phoneError}</span> : null}
                  </label>
                </div>
                <Button type="submit" className="h-12 w-full rounded-2xl sm:rounded-none" isLoading={requestOtp.isPending}><span className="sm:hidden">{COPY.auth.whatsapp.getOtp}</span><span className="hidden sm:inline">{COPY.auth.whatsapp.sendCode}</span></Button>
              </form>
            </div>

            {presentation !== 'sheet' ? otpOverlay : null}

            {authError ? <p className="mt-5 text-sm text-danger" aria-live="polite">{authError.message}</p> : null}
            <div className={requestOtp.data ? 'hidden sm:block' : ''}>
              <div className="my-3 flex items-center gap-3 sm:my-7" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="font-accent text-[9px] uppercase tracking-[0.2em] text-text-muted">{COPY.common.or}</span><span className="h-px flex-1 bg-border" /></div>
              <Button type="button" variant="secondary" onClick={showEmailOrGoogle} className="h-11 w-full rounded-2xl sm:h-12 sm:rounded-none">{COPY.auth.whatsapp.useAlternatives}</Button>
              <p className="mt-3 text-center text-[10px] leading-4 text-text-muted sm:mt-5 sm:text-xs sm:leading-5">{COPY.auth.whatsapp.consentPrefix} <Link href={ROUTES.terms} className="text-accent-gold underline underline-offset-2 hover:text-text-primary">{COPY.auth.whatsapp.terms}</Link> {COPY.common.and} <Link href={ROUTES.privacy} className="text-accent-gold underline underline-offset-2 hover:text-text-primary">{COPY.auth.whatsapp.privacy}</Link>.</p>
            </div>
          </div> : <div className="mx-auto w-full max-w-[420px]" data-testid="alternative-auth">
            <div className="grid grid-cols-2 border border-border" role="tablist" aria-label={COPY.auth.whatsapp.alternativesLabel}>
              <button type="button" role="tab" aria-selected={tab === 'signin'} onClick={() => selectTab('signin')} className={'h-12 text-xs uppercase tracking-[0.1em] ' + (tab === 'signin' ? 'bg-accent-gold text-text-inverse' : 'text-text-secondary')}>Sign In</button>
              <button type="button" role="tab" aria-selected={tab === 'signup'} onClick={() => selectTab('signup')} className={'h-12 text-xs uppercase tracking-[0.1em] ' + (tab === 'signup' ? 'bg-accent-gold text-text-inverse' : 'text-text-secondary')}>Create Account</button>
            </div>
            <h2 className="sr-only">{tab === 'signin' ? COPY.auth.signIn : COPY.auth.createAccount}</h2>
            <p className="mt-7 text-center font-accent text-[10px] uppercase tracking-[0.22em] text-accent-gold">{COPY.auth.whatsapp.alternativesTitle}</p>
            <div data-testid="auth-method-stack" className="mt-4 grid gap-3">
              {IDENTITY_CONFIG.googleClientId ? <div ref={googleButtonRef} data-testid="google-auth-frame" className="flex min-h-12 w-full items-center justify-center overflow-hidden border border-accent-gold/30 bg-[#202124] p-px shadow-[0_10px_32px_rgba(0,0,0,0.28)] transition duration-300 hover:border-accent-gold/60"><GoogleAuthButton tab={tab} width={googleButtonWidth} onCredential={(credential) => googleLogin.mutate(credential, { onSuccess: (data) => finishAuth(data.user) })} /></div> : <Button type="button" variant="secondary" disabled className="w-full">{COPY.auth.googleMethod}</Button>}
              <div className="flex items-center gap-3 py-1" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="font-accent text-[9px] uppercase tracking-[0.2em] text-text-muted">Email</span><span className="h-px flex-1 bg-border" /></div>
            </div>

            {tab === 'signin' ? <form noValidate onSubmit={emailLoginForm.handleSubmit((data) => login.mutate(data, { onSuccess: (result) => finishAuth(result.user) }))} className="grid gap-4">
              <Input label={COPY.auth.email} type="email" autoComplete="email" error={emailLoginForm.formState.errors.email?.message} {...emailLoginForm.register('email')} />
              <Input label={COPY.auth.password} type="password" autoComplete="current-password" error={emailLoginForm.formState.errors.password?.message} {...emailLoginForm.register('password')} />
              <Button type="submit" className="h-12 w-full" isLoading={login.isPending}>{COPY.auth.signIn}</Button>
              <Link href={ROUTES.forgotPassword} className="text-center text-xs uppercase tracking-[0.1em] text-text-secondary hover:text-text-primary">{COPY.auth.forgot}</Link>
            </form> : <form noValidate onSubmit={emailRegisterForm.handleSubmit((data) => registerMutation.mutate({ name: data.name, email: data.email, password: data.password }, { onSuccess: () => setRegistrationComplete(true) }))} className="grid gap-4">
              <Input label={COPY.auth.name} autoComplete="name" error={emailRegisterForm.formState.errors.name?.message} {...emailRegisterForm.register('name')} />
              <Input label={COPY.auth.email} type="email" autoComplete="email" error={emailRegisterForm.formState.errors.email?.message} {...emailRegisterForm.register('email')} />
              <Input label={COPY.auth.password} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.password?.message} {...emailRegisterForm.register('password')} />
              <Input label={COPY.auth.confirmPassword} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.confirmPassword?.message} {...emailRegisterForm.register('confirmPassword')} />
              {registrationComplete ? <p className="text-sm text-success" aria-live="polite">Account created. Check your email to verify it, then sign in.</p> : null}
              <Button type="submit" className="h-12 w-full" isLoading={registerMutation.isPending} disabled={registrationComplete}>{registrationComplete ? 'Account created' : COPY.auth.createAccount}</Button>
            </form>}

            {authError ? <p className="mt-5 text-sm text-danger" aria-live="polite">{authError.message}</p> : null}
            {!IDENTITY_CONFIG.googleClientId ? <p className="mt-5 text-xs text-text-muted">{COPY.auth.providerUnavailable}</p> : null}
            {IDENTITY_CONFIG.whatsappOtpEnabled ? <Button type="button" variant="ghost" onClick={showWhatsApp} className="mt-6 w-full">{COPY.auth.whatsapp.useWhatsAppInstead}</Button> : null}
          </div>}
        </section>
      </div>
  );

  if (presentation === 'sheet') {
    return <><motion.div
      data-testid="mobile-auth-overlay"
      className="fixed inset-0 z-[150] flex items-end md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Log in or create your account"
      onKeyDown={(event) => { if (event.key === 'Escape') onDismiss?.(); }}
      initial="closed"
      animate="open"
      exit="closed"
    >
      <motion.button
        type="button"
        data-testid="mobile-auth-backdrop"
        aria-label={COPY.common.close}
        onClick={onDismiss}
        className="absolute inset-0 bg-black/55 backdrop-blur-md"
        variants={{ closed: { opacity: 0 }, open: { opacity: 1 } }}
        transition={{ duration: 0.24, ease: 'easeOut' }}
      />
      <motion.div
        className="relative z-10 w-full"
        variants={{ closed: { y: '100%' }, open: { y: 0 } }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      >
        {authShell}
      </motion.div>
    </motion.div>{otpOverlay && typeof document !== 'undefined' ? createPortal(otpOverlay, document.body) : null}</>;
  }

  return <main className="flex min-h-[calc(100dvh-4rem)] items-end px-0 pb-20 pt-24 sm:block sm:min-h-dvh sm:px-6 sm:pb-28 sm:pt-6 lg:px-20 lg:py-28">{authShell}</main>;
}

function OtpCodeInput({ value, name, error, isLoading, inputRef, onBlur, onValueChange }: OtpCodeInputProps): ReactNode {
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '');
  return <div>
    <label htmlFor="whatsapp-otp" className="hidden text-xs uppercase tracking-[0.15em] text-text-secondary sm:block">{COPY.auth.otp}</label>
    <div className="relative mt-3 sm:mt-2" data-testid="otp-code-input">
      <div className="grid grid-cols-6 gap-2 sm:hidden" aria-hidden="true">
        {digits.map((digit, index) => {
          const active = !error && !isLoading && value.length < 6 && index === value.length;
          const emphasized = active || (isLoading && Boolean(digit));
          return <span key={index} className={'grid aspect-square min-w-0 place-items-center rounded-xl border bg-background-input font-mono text-2xl text-text-primary transition ' + (error ? 'border-danger' : emphasized ? 'border-accent-gold shadow-gold' : 'border-border-strong')}>{digit}</span>;
        })}
      </div>
      <input ref={inputRef} id="whatsapp-otp" name={name} type="text" value={value} onChange={(event) => onValueChange(event.target.value)} onBlur={onBlur} inputMode="numeric" enterKeyHint="done" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} aria-label={COPY.auth.otp} aria-invalid={Boolean(error)} aria-describedby={error ? 'whatsapp-otp-error' : undefined} className={'absolute inset-0 z-10 h-full w-full appearance-none bg-transparent text-transparent caret-transparent outline-none sm:static sm:block sm:h-12 sm:border sm:bg-background-input sm:px-4 sm:font-body sm:text-base sm:text-text-primary sm:caret-text-primary ' + (error ? 'sm:border-danger' : 'sm:border-border-subtle sm:focus:border-border-strong')} />
    </div>
    {isLoading ? <p className="mt-4 text-center text-sm text-text-secondary sm:hidden" aria-live="polite">{COPY.auth.whatsapp.verifyingCode}</p> : null}
    {error ? <p id="whatsapp-otp-error" className="mt-4 text-center text-sm text-danger sm:text-left" role="alert">{error}</p> : null}
  </div>;
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
