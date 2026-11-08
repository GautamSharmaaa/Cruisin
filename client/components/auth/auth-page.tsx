// Governed by .rules v1.0
'use client';

import { useGoogleOAuth, type CredentialResponse, type GsiButtonConfiguration, type IdConfiguration } from '@react-oauth/google';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
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
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {authSurfaceMotion} from '@/lib/animations';
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
  id:string;
  value: string;
  name: string;
  error?: string;
  isLoading: boolean;
  inputRef: (element: HTMLInputElement | null) => void;
  onBlur: () => void;
  onValueChange: (value: string) => void;
}

const destinationFor = (user: User): string => user.profileIncomplete ? ROUTES.account + '?complete=1' : ROUTES.account;
const formatCountdown = (seconds:number):string => `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
const formatPhone = (countryCode: string, nationalNumber: string): string => `${countryCode} ${nationalNumber.replace(/(\d{5})(\d{1,5})/, '$1 $2').trim()}`;

export interface AuthPageProps {
  initialTab: AuthTab;
  presentation?: 'page' | 'sheet';
  initialMethod?: 'whatsapp' | 'alternative';
  redirectTo?: string;
  onDismiss?: () => void;
}

export function AuthPage({ initialTab, presentation = 'page', initialMethod, redirectTo, onDismiss }: AuthPageProps): ReactNode {
  const instance=useId();
  const phoneId=`whatsapp-number-${instance}`;
  const otpId=`whatsapp-otp-${instance}`;
  const titleId=`auth-title-${instance}`;
  const reduced=useStorefrontReducedMotion();
  const dialogRef=useRef<HTMLDivElement>(null);
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
    const opener=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const releaseScrollLock = acquireBodyScrollLock();
    document.body.classList.add('mobile-auth-open');
    return () => {
      releaseScrollLock();
      document.body.classList.remove('mobile-auth-open');
      if(opener?.isConnected)opener.focus({preventScroll:true});
    };
  }, [presentation]);

  useEffect(() => {
    if(presentation!=='sheet')return;
    const focusId=requestOtp.data?otpId:showAlternatives?`auth-${tab==='signup'?'name':'email'}-${instance}`:phoneId;
    const focusTimer=window.setTimeout(()=>document.getElementById(focusId)?.focus(),80);
    return () => window.clearTimeout(focusTimer);
  }, [instance,otpId,phoneId,presentation,requestOtp.data,showAlternatives,tab]);

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
          window.setTimeout(() => document.getElementById(otpId)?.focus(), 50);
        }
      }
    );
  };

  const otpError = verifyForm.formState.errors.otp?.message ?? (verifyOtp.error ? (/invalid otp/i.test(verifyOtp.error.message) ? COPY.auth.whatsapp.incorrectCode : verifyOtp.error.message) : undefined);
  const authError = login.error ?? registerMutation.error ?? googleLogin.error ?? requestOtp.error;
  const whatsappPrimary = IDENTITY_CONFIG.whatsappOtpEnabled && !showAlternatives;
  const isOtp=Boolean(requestOtp.data);
  const title=isOtp?COPY.auth.minimal.codeTitle:tab==='signup'?COPY.auth.createAccount:COPY.auth.minimal.welcome;
  const consent=<p className="auth-consent">{COPY.auth.whatsapp.consentPrefix} <Link href={ROUTES.terms}>{COPY.auth.whatsapp.terms}</Link> {COPY.common.and} <Link href={ROUTES.privacy}>{COPY.auth.whatsapp.privacy}</Link>.</p>;
  const authShell=<div data-testid="auth-shell" className="minimal-auth" data-presentation={presentation}>
    {presentation==='sheet'?<button className="auth-dismiss" type="button" onClick={onDismiss} aria-label={COPY.common.close}><X size={20} strokeWidth={1.4}/></button>:null}
    <Link href={ROUTES.home} onClick={onDismiss} className="auth-identity brand-wordmark-script">{COPY.brand.name}</Link>
    <div className="auth-heading"><h1 id={titleId}>{title}</h1><p>{isOtp?`${COPY.auth.whatsapp.sentTo} ${formatPhone(countryCode,nationalNumber)}`:COPY.auth.minimal.intro}</p></div>
    {isOtp?<form noValidate onSubmit={verifyForm.handleSubmit(verifyCode)} data-testid="otp-bottom-sheet" className="auth-form auth-otp-form">
      <button type="button" onClick={resetOtp} className="auth-text-action auth-change-number"><ArrowLeft size={14}/>{COPY.auth.whatsapp.changeNumber}</button>
      <Controller control={verifyForm.control} name="otp" render={({field})=><OtpCodeInput id={otpId} value={field.value??''} name={field.name} inputRef={field.ref} onBlur={field.onBlur} onValueChange={handleOtpValueChange} error={otpError} isLoading={verifyOtp.isPending}/>}/>
      <input type="hidden" {...verifyForm.register('requestId')}/>
      {requestOtp.data?.developmentCode?<p className="auth-development-code">{COPY.auth.developmentCode}: {requestOtp.data.developmentCode}</p>:null}
      <Button type="submit" className="auth-primary" isLoading={verifyOtp.isPending}>{COPY.auth.submit}<ArrowRight size={16}/></Button>
      <button type="button" className="auth-text-action auth-resend" disabled={secondsRemaining>0||requestOtp.isPending} onClick={sendOtp}>{secondsRemaining>0?COPY.auth.whatsapp.resendCountdown.replace('{time}',formatCountdown(secondsRemaining)):COPY.auth.whatsapp.resendCode}</button>
      {requestOtp.error?<p className="auth-error" role="alert">{requestOtp.error.message}</p>:null}
    </form>:whatsappPrimary?<div data-testid="whatsapp-primary-auth">
      <form noValidate onSubmit={event=>{event.preventDefault();sendOtp();}} className="auth-form">
        <div className="auth-phone-row"><Input id={`whatsapp-country-${instance}`} label={COPY.auth.whatsapp.countryCode} inputMode="tel" autoComplete="tel-country-code" value={countryCode} onChange={event=>setCountryCode(event.target.value)}/><Input id={phoneId} label={COPY.auth.whatsapp.phone} type="tel" inputMode="numeric" autoComplete="tel-national" enterKeyHint="send" autoFocus maxLength={10} value={nationalNumber} onChange={event=>setNationalNumber(event.target.value.replace(/\D/g,'').slice(0,10))} placeholder={COPY.auth.whatsapp.phonePlaceholder} error={phoneError}/></div>
        <Button type="submit" className="auth-primary" isLoading={requestOtp.isPending}>{COPY.auth.whatsapp.getOtp}<ArrowRight size={16}/></Button>
      </form>
      {authError?<p className="auth-error" role="alert">{authError.message}</p>:null}
      <button type="button" className="auth-text-action auth-switch" onClick={showEmailOrGoogle}>{COPY.auth.whatsapp.useAlternatives}</button>
    </div>:<div data-testid="alternative-auth">
      <div className="auth-tabs" role="tablist" aria-label={COPY.auth.whatsapp.alternativesLabel}>
        <button type="button" role="tab" aria-selected={tab==='signin'} onClick={()=>selectTab('signin')}>{COPY.auth.signIn}</button>
        <button type="button" role="tab" aria-selected={tab==='signup'} onClick={()=>selectTab('signup')}>{COPY.auth.createAccount}</button>
      </div>
      {IDENTITY_CONFIG.googleClientId?<div className="auth-google" ref={googleButtonRef} data-testid="google-auth-frame"><GoogleAuthButton tab={tab} width={googleButtonWidth} onCredential={credential=>googleLogin.mutate(credential,{onSuccess:data=>finishAuth(data.user)})}/></div>:null}
      {tab==='signin'?<form noValidate onSubmit={emailLoginForm.handleSubmit(data=>login.mutate(data,{onSuccess:result=>finishAuth(result.user)}))} className="auth-form">
        <Input id={`auth-email-${instance}`} label={COPY.auth.email} type="email" autoComplete="email" error={emailLoginForm.formState.errors.email?.message} {...emailLoginForm.register('email')}/>
        <Input id={`auth-password-${instance}`} label={COPY.auth.password} type="password" autoComplete="current-password" error={emailLoginForm.formState.errors.password?.message} {...emailLoginForm.register('password')}/>
        <Link href={ROUTES.forgotPassword} onClick={onDismiss} className="auth-forgot">{COPY.auth.forgot}</Link>
        <Button type="submit" className="auth-primary" isLoading={login.isPending}>{COPY.auth.signIn}<ArrowRight size={16}/></Button>
      </form>:<form noValidate onSubmit={emailRegisterForm.handleSubmit(data=>registerMutation.mutate({name:data.name,email:data.email,password:data.password},{onSuccess:()=>setRegistrationComplete(true)}))} className="auth-form">
        <Input id={`auth-name-${instance}`} label={COPY.auth.name} autoComplete="name" error={emailRegisterForm.formState.errors.name?.message} {...emailRegisterForm.register('name')}/>
        <Input id={`auth-email-${instance}`} label={COPY.auth.email} type="email" autoComplete="email" error={emailRegisterForm.formState.errors.email?.message} {...emailRegisterForm.register('email')}/>
        <Input id={`auth-password-${instance}`} label={COPY.auth.password} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.password?.message} {...emailRegisterForm.register('password')}/>
        <Input id={`auth-confirm-${instance}`} label={COPY.auth.confirmPassword} type="password" autoComplete="new-password" error={emailRegisterForm.formState.errors.confirmPassword?.message} {...emailRegisterForm.register('confirmPassword')}/>
        {registrationComplete?<p className="auth-status" aria-live="polite">{COPY.auth.minimal.created}</p>:null}
        <Button type="submit" className="auth-primary" isLoading={registerMutation.isPending} disabled={registrationComplete}>{registrationComplete?COPY.auth.minimal.createdLabel:COPY.auth.createAccount}<ArrowRight size={16}/></Button>
      </form>}
      {authError?<p className="auth-error" role="alert">{authError.message}</p>:null}
      {IDENTITY_CONFIG.whatsappOtpEnabled?<button type="button" className="auth-text-action auth-switch" onClick={showWhatsApp}>{COPY.auth.whatsapp.useWhatsAppInstead}</button>:null}
    </div>}
    {consent}
  </div>;

  if(presentation==='sheet')return <motion.div ref={dialogRef} data-testid="mobile-auth-overlay" className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} initial="closed" animate="open" exit="closed" onKeyDown={event=>{
    if(event.key==='Escape'){event.stopPropagation();if(isOtp)resetOtp();else onDismiss?.();}
    if(event.key!=='Tab'||!dialogRef.current)return;
    const controls=Array.from(dialogRef.current.querySelectorAll<HTMLElement>('.minimal-auth a[href],.minimal-auth button:not([disabled]),.minimal-auth input:not([type="hidden"]):not([disabled])'));
    const first=controls[0],last=controls[controls.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
  }}>
    <motion.button type="button" data-testid="mobile-auth-backdrop" aria-label={COPY.common.close} onClick={onDismiss} className="auth-backdrop" variants={authSurfaceMotion.backdrop} transition={{duration:reduced?0:authSurfaceMotion.fade}}/>
    <motion.div className="auth-sheet" variants={reduced?authSurfaceMotion.static:authSurfaceMotion.sheet} transition={{duration:reduced?0:authSurfaceMotion.duration,ease:authSurfaceMotion.ease}}>{authShell}</motion.div>
  </motion.div>;
  return <main className="auth-page">{authShell}</main>;
}

function OtpCodeInput({id,value,name,error,isLoading,inputRef,onBlur,onValueChange}:OtpCodeInputProps):ReactNode {
 const digits=Array.from({length:6},(_,index)=>value[index]??'');
 return <div className="auth-otp-control">
  <label htmlFor={id} className="sr-only">{COPY.auth.otp}</label>
  <div className="auth-otp-digits" data-testid="otp-code-input" data-error={Boolean(error)}>
    <div aria-hidden="true" className="auth-otp-slots">{digits.map((digit,index)=><span key={index} data-active={!error&&!isLoading&&index===Math.min(value.length,5)}>{digit}</span>)}</div>
    <input ref={inputRef} id={id} name={name} type="text" value={value} onChange={event=>onValueChange(event.target.value)} onBlur={onBlur} inputMode="numeric" enterKeyHint="done" autoComplete="one-time-code" pattern="[0-9]*" maxLength={6} aria-label={COPY.auth.otp} aria-invalid={Boolean(error)} aria-describedby={error?`${id}-error`:undefined} readOnly={isLoading}/>
  </div>
  {isLoading?<p className="auth-status" aria-live="polite">{COPY.auth.whatsapp.verifyingCode}</p>:null}
  {error?<p id={`${id}-error`} className="auth-error" role="alert">{error}</p>:null}
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
