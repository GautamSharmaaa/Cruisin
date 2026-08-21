// Governed by .rules v1.0
'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Check, Clock3, Eye, Gift, Save } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { AdminCard, AdminFormSection, AdminSectionHeader, AdminTabs, ErrorState, LoadingSkeleton } from '@/components/dashboard/admin-ui';
import { StatusPill } from '@/components/dashboard/status-pill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField } from '@/components/ui/select-field';
import { useAdminMe, useAdminPromotionExperience } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import { formatPrice } from '@/lib/utils';
import type { AdminPromotionExperienceDto, CouponDto, PromotionExperienceConfigDto, PromotionExperienceStatus } from '@/types/dto.types';

interface ApiEnvelope<TData> { data: TData; message: string; }
type PreviewPlacement = 'popup' | 'marquee' | 'checkout';
type PreviewState = 'available' | 'applied';

const defaults: PromotionExperienceConfigDto = {
  enabled: false,
  promotionId: null,
  campaignName: '',
  campaignKey: 'promotion-campaign',
  popupEnabled: true,
  bagMarqueeEnabled: true,
  checkoutStripEnabled: true,
  popupEyebrow: 'PRIVATE OFFER',
  popupHeadline: '{{discount}} OFF YOUR ORDER',
  popupDescription: 'Apply {{code}} and save on your CRUISIN order.',
  popupPrimaryCta: 'APPLY {{discount}} OFF',
  popupSecondaryCta: 'CONTINUE SHOPPING',
  marqueeAvailableText: '{{code}} · {{discount}} OFF · TAP TO APPLY',
  marqueeAppliedText: '{{code}} APPLIED ✓ · YOU SAVE {{saving}}',
  checkoutAvailableText: '{{code}} AVAILABLE · TAP TO APPLY {{discount}} OFF',
  checkoutAppliedText: '✓ {{code}} APPLIED · YOU SAVE {{saving}}',
  popupDelayMs: 2500,
  popupFrequency: 'once_per_session',
  startsAt: null,
  endsAt: null
};

const couponId = (coupon: CouponDto): string => coupon.id ?? coupon._id ?? '';
const couponLabel = (coupon?: CouponDto): string => {
  if (!coupon) return 'OFFER';
  if (coupon.type === 'percentage') return `${coupon.value}%`;
  if (coupon.type === 'fixed') return formatPrice(coupon.value);
  return 'FREE SHIPPING';
};
const couponTechnicalStatus = (coupon: CouponDto): { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' } => {
  if (!coupon.isActive) return { label: 'Inactive', tone: 'danger' };
  const now = Date.now();
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now) return { label: 'Expired', tone: 'warning' };
  if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) return { label: 'Scheduled', tone: 'neutral' };
  if (coupon.usageLimit && (coupon.usedCount ?? 0) >= coupon.usageLimit) return { label: 'Exhausted', tone: 'danger' };
  return { label: 'Active', tone: 'success' };
};
const dateTimeLocal = (value?: string | null): string => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
};
const statusPresentation: Record<PromotionExperienceStatus, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'gold' }> = {
  live: { label: '● Live', tone: 'success' },
  scheduled: { label: '○ Scheduled', tone: 'gold' },
  disabled: { label: '○ Disabled', tone: 'neutral' },
  expired: { label: '○ Expired', tone: 'warning' },
  linked_offer_inactive: { label: 'Linked offer inactive', tone: 'danger' }
};
const interpolate = (template: string, values: { code: string; discount: string; saving: string }): string => template.replace(/{{\s*(code|discount|saving)\s*}}/g, (_, key: keyof typeof values) => values[key]);

export function PromotionExperienceManager({ coupons }: { coupons: CouponDto[] }): ReactNode {
  const queryClient = useQueryClient();
  const resource = useAdminPromotionExperience();
  const me = useAdminMe();
  const [form, setForm] = useState<PromotionExperienceConfigDto>(defaults);
  const [dirty, setDirty] = useState(false);
  const [previewPlacement, setPreviewPlacement] = useState<PreviewPlacement>('popup');
  const [previewState, setPreviewState] = useState<PreviewState>('available');
  const canSave = me.data ? ['manager', 'admin', 'superadmin'].includes(me.data.role) : false;

  useEffect(() => {
    if (!resource.data || dirty) return;
    setForm({ ...defaults, ...resource.data.config, startsAt: dateTimeLocal(resource.data.config.startsAt), endsAt: dateTimeLocal(resource.data.config.endsAt) });
  }, [dirty, resource.data]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent): void => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: async (): Promise<AdminPromotionExperienceDto> => {
      const payload = { ...form, promotionId: form.promotionId || null, startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null, endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null };
      const response = await api.put<ApiEnvelope<AdminPromotionExperienceDto>>('/admin/promotion-experience', payload);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['admin', 'promotion-experience'], data);
      setDirty(false);
    }
  });

  const patch = <TKey extends keyof PromotionExperienceConfigDto>(key: TKey, value: PromotionExperienceConfigDto[TKey]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setDirty(true);
    save.reset();
  };
  const selectedCoupon = useMemo(() => coupons.find((coupon) => couponId(coupon) === form.promotionId), [coupons, form.promotionId]);
  const selectedCouponStatus = selectedCoupon ? couponTechnicalStatus(selectedCoupon) : null;
  const previewValues = { code: selectedCoupon?.code ?? 'CRUISIN10', discount: couponLabel(selectedCoupon), saving: '₹300' };
  const serverStatus = resource.data ? statusPresentation[resource.data.status] : statusPresentation.disabled;

  if (resource.isLoading) return <LoadingSkeleton rows={4} />;
  if (resource.error) return <ErrorState message="Promotion experience settings could not be loaded. No storefront promotion will be activated." action={<Button variant="secondary" onClick={() => void resource.refetch()}>Retry</Button>} />;

  return <section className="grid min-w-0 gap-6" aria-labelledby="promotion-experience-heading">
    <AdminCard className="grid gap-6 border-accent-gold/50">
      <AdminSectionHeader eyebrow="Marketing control" title="Promotional Experience" description="Highlight one existing, server-validated coupon across discovery, Bag and Checkout. The feature remains separate from manual coupon availability." action={<StatusPill tone={dirty ? 'warning' : serverStatus.tone}>{dirty ? 'Unsaved' : serverStatus.label}</StatusPill>} />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Toggle label="Promotional Experience" description="Master display switch" checked={form.enabled} onChange={(value) => patch('enabled', value)} />
        <Toggle label="Promotion Popup" description="Browsing and product pages" checked={form.popupEnabled} onChange={(value) => patch('popupEnabled', value)} />
        <Toggle label="Bag Marquee Strip" description="Slim strip below the Bag header" checked={form.bagMarqueeEnabled} onChange={(value) => patch('bagMarqueeEnabled', value)} />
        <Toggle label="Checkout Strip" description="Calm checkout placement" checked={form.checkoutStripEnabled} onChange={(value) => patch('checkoutStripEnabled', value)} />
      </div>
      {!form.enabled ? <p className="flex items-start gap-2 border border-border bg-background-primary p-4 text-sm text-text-secondary"><Check className="mt-0.5 shrink-0 text-success" size={16} />All automatic promotion UI is currently off. Customers can still enter valid coupons manually.</p> : null}
    </AdminCard>

    <AdminFormSection title="Linked offer" description="Select an existing discount. Coupon status, schedule, usage and eligibility remain authoritative." columns={2}>
      <SelectField label="Promotion / coupon" value={form.promotionId ?? ''} onChange={(event) => patch('promotionId', event.target.value || null)} options={[{ label: 'Select a coupon', value: '' }, ...coupons.map((coupon) => ({ label: `${coupon.code} — ${couponLabel(coupon)}${coupon.isActive ? '' : ' — INACTIVE'}`, value: couponId(coupon) }))]} />
      <div className="border border-border bg-background-primary p-4 text-sm text-text-secondary">
        {selectedCoupon && selectedCouponStatus ? <><div className="flex flex-wrap items-center justify-between gap-3"><p className="font-mono text-base text-text-primary">{selectedCoupon.code}</p><StatusPill tone={selectedCouponStatus.tone}>{selectedCouponStatus.label}</StatusPill></div><p className="mt-3">{couponLabel(selectedCoupon)} · Used {selectedCoupon.usedCount ?? 0}{selectedCoupon.usageLimit ? ` of ${selectedCoupon.usageLimit}` : ''}</p><p className="mt-1 text-xs">{selectedCoupon.validFrom ? new Date(selectedCoupon.validFrom).toLocaleString('en-IN') : 'No start'} — {selectedCoupon.validUntil ? new Date(selectedCoupon.validUntil).toLocaleString('en-IN') : 'No end'}</p><p className="mt-1 text-xs">Minimum {formatPrice(selectedCoupon.minOrderValue ?? 0)} · {selectedCoupon.applicableProducts?.length || selectedCoupon.applicableCategories?.length ? 'Targeted eligibility' : 'All products'}</p></> : <p>Select a coupon to inspect its current rule.</p>}
      </div>
      <Input label="Campaign name (internal)" value={form.campaignName} maxLength={120} onChange={(event) => patch('campaignName', event.target.value)} placeholder="August CRUISIN10 Offer" />
      <Input label="Campaign key" value={form.campaignKey} maxLength={100} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" onChange={(event) => patch('campaignKey', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'))} placeholder="cruisin10-aug-2026" />
    </AdminFormSection>

    <AdminFormSection title="Popup" description="Mobile bottom sheet and responsive desktop modal. Approved placeholders: {{code}}, {{discount}}, {{saving}}." columns={2}>
      <Input label="Eyebrow" value={form.popupEyebrow} maxLength={80} onChange={(event) => patch('popupEyebrow', event.target.value)} />
      <Input label="Headline" value={form.popupHeadline} maxLength={140} onChange={(event) => patch('popupHeadline', event.target.value)} />
      <TextField label="Description" value={form.popupDescription} maxLength={320} onChange={(value) => patch('popupDescription', value)} />
      <div className="grid gap-4 sm:grid-cols-2"><Input label="Primary CTA" value={form.popupPrimaryCta} maxLength={80} onChange={(event) => patch('popupPrimaryCta', event.target.value)} /><Input label="Secondary CTA" value={form.popupSecondaryCta} maxLength={80} onChange={(event) => patch('popupSecondaryCta', event.target.value)} /></div>
      <Input label="Popup delay (milliseconds)" type="number" min={0} max={30000} step={100} value={form.popupDelayMs} onChange={(event) => patch('popupDelayMs', Math.min(30_000, Math.max(0, Number(event.target.value))))} />
      <SelectField label="Frequency" value={form.popupFrequency} onChange={(event) => patch('popupFrequency', event.target.value as PromotionExperienceConfigDto['popupFrequency'])} options={[{ label: 'Once per session', value: 'once_per_session' }, { label: 'Once every 24 hours', value: 'once_per_24_hours' }, { label: 'Always (eligible visits)', value: 'always' }]} />
    </AdminFormSection>

    <AdminFormSection title="Bag marquee strip" description="Manage the slim Bag-page and drawer strip. The storefront substitutes only approved placeholders." columns={2}>
      <TextField label="Before application" value={form.marqueeAvailableText} maxLength={220} onChange={(value) => patch('marqueeAvailableText', value)} />
      <TextField label="After application" value={form.marqueeAppliedText} maxLength={220} onChange={(value) => patch('marqueeAppliedText', value)} />
    </AdminFormSection>

    <AdminFormSection title="Checkout strip" description="Checkout stays static and restrained; it never auto-opens the promotion popup." columns={2}>
      <TextField label="Before application" value={form.checkoutAvailableText} maxLength={220} onChange={(value) => patch('checkoutAvailableText', value)} />
      <TextField label="After application" value={form.checkoutAppliedText} maxLength={220} onChange={(value) => patch('checkoutAppliedText', value)} />
    </AdminFormSection>

    <AdminFormSection title="Scheduling" description="Times are entered in your local timezone and stored as UTC instants." columns={2}>
      <Input label="Starts at" type="datetime-local" value={form.startsAt ?? ''} onChange={(event) => patch('startsAt', event.target.value || null)} />
      <Input label="Ends at" type="datetime-local" value={form.endsAt ?? ''} min={form.startsAt ?? undefined} onChange={(event) => patch('endsAt', event.target.value || null)} />
    </AdminFormSection>

    <AdminCard className="grid gap-5">
      <AdminSectionHeader eyebrow="Visual only" title="Live preview" description="Preview does not touch a customer cart or call the coupon API." action={<Eye size={18} className="text-accent-gold" />} />
      <AdminTabs value={previewPlacement} onChange={setPreviewPlacement} tabs={[{ value: 'popup', label: 'Popup' }, { value: 'marquee', label: 'Bag marquee' }, { value: 'checkout', label: 'Checkout strip' }]} />
      <AdminTabs value={previewState} onChange={setPreviewState} tabs={[{ value: 'available', label: 'Available' }, { value: 'applied', label: 'Applied' }]} />
      <PromotionPreview placement={previewPlacement} state={previewState} form={form} values={previewValues} />
    </AdminCard>

    <div className="sticky bottom-4 z-30 flex flex-wrap items-center justify-between gap-3 border border-accent-gold bg-background-primary/95 p-4 shadow-lg backdrop-blur">
      <div className="min-w-0 text-sm" aria-live="polite">{save.isPending ? <span className="text-text-secondary">Saving…</span> : save.isSuccess ? <span className="text-success">Saved ✓</span> : save.error ? <span className="text-danger">{save.error.message}</span> : dirty ? <span className="text-warning">Unsaved changes</span> : <span className="text-text-muted">Configuration is up to date.</span>}</div>
      <Button type="button" disabled={!dirty || !canSave || save.isPending} onClick={() => save.mutate()}><Save size={15} className="mr-2" />{save.isPending ? 'Saving…' : 'Save changes'}</Button>
      {!canSave && me.data ? <p className="basis-full text-right text-xs text-warning">Your {me.data.role} role is read-only for this setting.</p> : null}
    </div>
    {resource.data?.reason && !dirty ? <p className="flex items-center gap-2 text-sm text-danger"><AlertTriangle size={16} />{resource.data.reason}</p> : null}
  </section>;
}

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }): ReactNode {
  return <label className="flex min-h-24 cursor-pointer items-center justify-between gap-4 border border-border bg-background-primary p-4"><span className="min-w-0"><span className="block text-sm text-text-primary">{label}</span><span className="mt-1 block text-xs text-text-muted">{description}</span></span><span className={'relative h-7 w-12 shrink-0 border transition ' + (checked ? 'border-accent-gold bg-accent-gold' : 'border-border-strong bg-background-input')}><input type="checkbox" className="sr-only" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span className={'absolute top-1 h-5 w-5 bg-text-primary transition-transform ' + (checked ? 'translate-x-6 bg-text-inverse' : 'translate-x-1')} /></span></label>;
}

function TextField({ label, value, maxLength, onChange }: { label: string; value: string; maxLength: number; onChange: (value: string) => void }): ReactNode {
  return <label className="block text-xs uppercase tracking-[0.15em] text-text-secondary"><span>{label}</span><textarea value={value} maxLength={maxLength} rows={3} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full resize-y border border-border-subtle bg-background-input p-4 normal-case tracking-normal text-text-primary focus:border-border-strong" /><span className="mt-1 block text-right font-mono text-[10px] text-text-muted">{value.length}/{maxLength}</span></label>;
}

function PromotionPreview({ placement, state, form, values }: { placement: PreviewPlacement; state: PreviewState; form: PromotionExperienceConfigDto; values: { code: string; discount: string; saving: string } }): ReactNode {
  if (placement === 'popup') return <div className="mx-auto w-full max-w-sm border border-border bg-background-primary p-6 text-center shadow-lg"><p className="text-[10px] uppercase tracking-[0.22em] text-accent-gold">{interpolate(form.popupEyebrow, values)}</p><h3 className="mt-5 font-display text-4xl">{state === 'applied' ? `${values.code} APPLIED ✓` : interpolate(form.popupHeadline, values)}</h3><p className="mt-4 text-sm leading-6 text-text-secondary">{state === 'applied' ? `You save ${values.saving}` : interpolate(form.popupDescription, values)}</p><div className="mt-5 border border-border p-3 text-left font-mono text-sm">{values.code}<span className="float-right text-accent-gold">COPY</span></div><div className="mt-4 bg-accent-gold p-3 text-xs uppercase tracking-[0.1em] text-text-inverse">{state === 'applied' ? 'Applied ✓' : interpolate(form.popupPrimaryCta, values)}</div></div>;
  const text = placement === 'marquee' ? (state === 'applied' ? form.marqueeAppliedText : form.marqueeAvailableText) : (state === 'applied' ? form.checkoutAppliedText : form.checkoutAvailableText);
  return <div className={'w-full border px-5 py-4 text-center text-xs uppercase tracking-[0.13em] ' + (placement === 'marquee' ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border bg-background-primary text-text-primary')}><span className="mr-2 inline-block align-middle">{placement === 'marquee' ? <Gift size={15} /> : <Clock3 size={15} />}</span>{interpolate(text, values)}</div>;
}
