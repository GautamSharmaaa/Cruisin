'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Home, MapPin, Navigation, Phone, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useCreateAddress, useUpdateAddress } from '@/hooks/useAccount';
import { lookupIndiaPincode } from '@/lib/india-pincode';
import type { Address } from '@/types/order.types';
import type { AddressBookEntry } from '@/types/user.types';

type AddressType = AddressBookEntry['type'];
interface AddressDraft extends Address { type: AddressType; area: string; }

export interface AddressBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addresses: AddressBookEntry[];
  selectedAddressId?: string;
  customerName?: string;
  customerPhone?: string;
  onAddressSelected: (address: AddressBookEntry) => void;
}

const emptyDraft = (name = '', phone = ''): AddressDraft => ({
  type: 'home', fullName: name, phone, line1: '', area: '', line2: '', city: '', state: '', postalCode: '', country: 'India'
});

const bookToDraft = (address: AddressBookEntry): AddressDraft => ({
  type: address.type,
  fullName: address.fullName,
  phone: address.phone,
  line1: address.street,
  area: '',
  line2: address.landmark ?? '',
  city: address.city,
  state: address.state,
  postalCode: address.pincode,
  country: address.country
});

const fieldClass = 'mt-2 h-12 w-full border border-border-subtle bg-background-input px-4 text-base text-text-primary outline-none transition focus:border-accent-gold disabled:cursor-not-allowed disabled:opacity-70';
const labelClass = 'block text-[10px] uppercase tracking-[0.16em] text-text-secondary';

export function AddressBottomSheet({ open, onOpenChange, addresses, selectedAddressId, customerName, customerPhone, onAddressSelected }: AddressBottomSheetProps): ReactNode {
  const reduceMotion = useReducedMotion();
  const createAddress = useCreateAddress();
  const updateAddress = useUpdateAddress();
  const selected = addresses.find((address) => address._id === selectedAddressId);
  const [showForm, setShowForm] = useState(addresses.length === 0);
  const [editingId, setEditingId] = useState<string>();
  const [draft, setDraft] = useState<AddressDraft>(() => selected ? bookToDraft(selected) : emptyDraft(customerName, customerPhone));
  const [draftTouched, setDraftTouched] = useState(false);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing' | 'invalid'>('idle');
  const [message, setMessage] = useState('');
  const previouslyOpen = useRef(false);

  useEffect(() => {
    if (open && !previouslyOpen.current && !draftTouched) {
      setShowForm(addresses.length === 0);
      setEditingId(undefined);
      setDraft(selected ? bookToDraft(selected) : emptyDraft(customerName, customerPhone));
      setLookupState(selected ? 'found' : 'idle');
      setMessage('');
    }
    previouslyOpen.current = open;
  }, [addresses.length, customerName, customerPhone, draftTouched, open, selected]);

  useEffect(() => {
    if (!showForm || !/^[1-9]\d{5}$/.test(draft.postalCode)) {
      setLookupState(draft.postalCode.length === 6 ? 'invalid' : 'idle');
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLookupState('loading');
      lookupIndiaPincode(draft.postalCode, controller.signal)
        .then((result) => {
          if (!result) { setLookupState('missing'); return; }
          setDraft((current) => ({ ...current, city: result.city, state: result.state }));
          setLookupState('found');
        })
        .catch((error: unknown) => {
          if ((error as { name?: string }).name !== 'AbortError') setLookupState('missing');
        });
    }, 350);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [draft.postalCode, showForm]);

  const mandatoryValid = useMemo(() => /^[1-9]\d{5}$/.test(draft.postalCode)
    && draft.line1.trim().length >= 2
    && draft.area.trim().length >= 2
    && draft.city.trim().length >= 2
    && draft.state.trim().length >= 2
    && draft.fullName.trim().length >= 2
    && draft.phone.replace(/\D/g, '').length >= 10, [draft]);
  const pending = createAddress.isPending || updateAddress.isPending;
  const update = (key: keyof AddressDraft, value: string): void => { setDraftTouched(true); setDraft((current) => ({ ...current, [key]: value })); };
  const choose = (address: AddressBookEntry): void => { setDraftTouched(false); onAddressSelected(address); onOpenChange(false); };
  const edit = (address: AddressBookEntry): void => { setDraftTouched(false); setEditingId(address._id); setDraft(bookToDraft(address)); setLookupState('found'); setShowForm(true); };
  const save = async (): Promise<void> => {
    if (!mandatoryValid || pending) return;
    setMessage('');
    const input: Omit<AddressBookEntry, '_id'> = {
      type: draft.type,
      fullName: draft.fullName.trim(),
      phone: draft.phone.trim(),
      country: 'India',
      state: draft.state.trim(),
      city: draft.city.trim(),
      pincode: draft.postalCode,
      street: `${draft.line1.trim()}, ${draft.area.trim()}`,
      landmark: draft.line2?.trim() || undefined,
      isDefault: addresses.length === 0
    };
    try {
      const saved = editingId
        ? await updateAddress.mutateAsync({ addressId: editingId, input })
        : await createAddress.mutateAsync(input);
      onAddressSelected(saved);
      setDraftTouched(false);
      setMessage('✓ Delivery address added');
      window.setTimeout(() => onOpenChange(false), reduceMotion ? 0 : 450);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Address could not be saved. Please try again.');
    }
  };

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <AnimatePresence>
      {open ? <Dialog.Portal forceMount>
        <Dialog.Overlay className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm" />
        <Dialog.Content asChild>
          <motion.section
            role="dialog"
            aria-describedby="address-sheet-description"
            initial={reduceMotion ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduceMotion ? undefined : { y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 310 }}
            drag={reduceMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.22 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 700) onOpenChange(false); }}
            className="fixed inset-x-0 bottom-0 z-[131] mx-auto flex h-[min(94dvh,820px)] max-w-2xl flex-col overflow-hidden rounded-t-[22px] border border-b-0 border-border bg-background-primary shadow-2xl outline-none md:bottom-6 md:rounded-[22px] md:border"
          >
            <div className="flex h-7 shrink-0 cursor-grab items-center justify-center active:cursor-grabbing"><span className="h-1 w-11 rounded-full bg-border-strong" /></div>
            <header className="relative shrink-0 border-b border-border-subtle px-5 pb-5 pt-2 sm:px-7">
              <Dialog.Title className="pr-14 text-sm font-semibold uppercase tracking-[0.14em] text-text-primary">{showForm ? (editingId ? 'Edit delivery address' : 'Add delivery address') : 'Saved addresses'}</Dialog.Title>
              <Dialog.Description id="address-sheet-description" className="mt-2 text-sm text-text-secondary">Where should we send your order?</Dialog.Description>
              <Dialog.Close className="absolute right-3 top-0 grid h-11 w-11 place-items-center text-accent-gold transition hover:text-text-primary" aria-label="Close address sheet"><X size={21} strokeWidth={1.5} /></Dialog.Close>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-6 sm:px-7">
              {!showForm ? <div>
                <p className="mb-4 text-[10px] uppercase tracking-[0.18em] text-text-muted">Saved addresses</p>
                <div className="grid gap-3">{addresses.map((address) => <article key={address._id} className={'border p-5 transition ' + (address._id === selectedAddressId ? 'border-accent-gold bg-background-elevated' : 'border-border-subtle')}>
                  <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] uppercase tracking-[0.16em] text-accent-gold">{address.type}</p><p className="mt-3 font-medium text-text-primary">{address.fullName}</p><p className="mt-2 text-sm leading-6 text-text-secondary">{address.street}{address.landmark ? `, ${address.landmark}` : ''}<br />{address.city}, {address.state} · {address.pincode}</p></div>{address._id === selectedAddressId ? <Check className="mt-1 h-5 w-5 shrink-0 text-success" /> : null}</div>
                  <div className="mt-5 flex items-center gap-5"><button type="button" onClick={() => choose(address)} className="min-h-11 text-xs font-semibold uppercase tracking-[0.13em] text-accent-gold">Deliver here →</button><button type="button" onClick={() => edit(address)} className="min-h-11 text-[10px] uppercase tracking-[0.13em] text-text-secondary">Edit</button></div>
                </article>)}</div>
                <button type="button" onClick={() => { setDraftTouched(false); setEditingId(undefined); setDraft(emptyDraft(customerName, customerPhone)); setShowForm(true); }} className="mt-5 min-h-12 w-full border border-border px-5 text-xs uppercase tracking-[0.14em] text-text-primary">+ Add new address</button>
              </div> : <div className="space-y-5">
                {addresses.length ? <button type="button" onClick={() => setShowForm(false)} className="min-h-11 text-[10px] uppercase tracking-[0.15em] text-accent-gold">← Saved addresses</button> : null}
                <div className="border-b border-border-subtle pb-5">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-text-muted"><MapPin className="h-4 w-4 text-accent-gold" /> Pincode first</div>
                  <label className={labelClass} htmlFor="checkout-pincode"><span className="sr-only">Pincode</span><span className="relative block"><input id="checkout-pincode" value={draft.postalCode} onChange={(event) => update('postalCode', event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="postal-code" placeholder="201301" className={fieldClass + ' pr-12'} />{lookupState === 'found' ? <Check className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-success" /> : null}</span></label>
                  {lookupState === 'loading' ? <p className="mt-3 text-xs text-text-muted" aria-live="polite">Checking delivery area…</p> : null}
                  {lookupState === 'found' ? <p className="mt-3 text-xs font-medium uppercase tracking-[0.1em] text-success">✓ {draft.city} · {draft.state}</p> : null}
                  {lookupState === 'invalid' ? <p className="mt-3 text-xs text-danger" role="alert">Enter a valid six-digit Indian pincode.</p> : null}
                  {lookupState === 'missing' ? <p className="mt-3 text-xs leading-5 text-text-secondary">We could not auto-fill this pincode. You can enter city and state below.</p> : null}
                </div>

                <label className={labelClass} htmlFor="checkout-line1"><span className="flex items-center gap-2"><Home className="h-4 w-4 text-accent-gold" /> House / flat / building *</span><input id="checkout-line1" value={draft.line1} onChange={(event) => update('line1', event.target.value)} autoComplete="address-line1" className={fieldClass} /></label>
                <label className={labelClass} htmlFor="checkout-area"><span className="flex items-center gap-2"><Navigation className="h-4 w-4 text-accent-gold" /> Area / sector / village *</span><input id="checkout-area" value={draft.area} onChange={(event) => update('area', event.target.value)} autoComplete="address-line2" className={fieldClass} /></label>
                <label className={labelClass} htmlFor="checkout-landmark">Landmark <span className="normal-case tracking-normal text-text-muted">— optional</span><input id="checkout-landmark" value={draft.line2 ?? ''} onChange={(event) => update('line2', event.target.value)} placeholder="Near a familiar place" className={fieldClass} /></label>
                {(lookupState === 'missing' || (draft.postalCode.length === 6 && lookupState === 'idle')) ? <div className="grid grid-cols-2 gap-3"><label className={labelClass} htmlFor="checkout-city">City<input id="checkout-city" value={draft.city} onChange={(event) => update('city', event.target.value)} autoComplete="address-level2" className={fieldClass} /></label><label className={labelClass} htmlFor="checkout-state">State<input id="checkout-state" value={draft.state} onChange={(event) => update('state', event.target.value)} autoComplete="address-level1" className={fieldClass} /></label></div> : null}
                <label className={labelClass} htmlFor="checkout-name"><span className="flex items-center gap-2"><UserRound className="h-4 w-4 text-accent-gold" /> Full name *</span><input id="checkout-name" value={draft.fullName} onChange={(event) => update('fullName', event.target.value)} autoComplete="name" className={fieldClass} /></label>
                <label className={labelClass} htmlFor="checkout-phone"><span className="flex items-center gap-2"><Phone className="h-4 w-4 text-accent-gold" /> Phone number *</span><input id="checkout-phone" value={draft.phone} onChange={(event) => update('phone', event.target.value)} inputMode="tel" autoComplete="tel" className={fieldClass} /></label>
                <fieldset><legend className="text-[10px] uppercase tracking-[0.16em] text-text-secondary">Save address as</legend><div className="mt-3 grid grid-cols-3 gap-2">{(['home', 'office', 'other'] as const).map((type) => <button key={type} type="button" onClick={() => setDraft((current) => ({ ...current, type }))} className={'min-h-11 border px-2 text-[10px] uppercase tracking-[0.13em] ' + (draft.type === type ? 'border-accent-gold bg-accent-gold text-text-inverse' : 'border-border text-text-secondary')}>{type === 'office' ? 'Work' : type}</button>)}</div></fieldset>
              </div>}
            </div>
            {showForm ? <footer className="shrink-0 border-t border-border-subtle bg-background-primary px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-7">
              {message ? <p className={'mb-3 text-center text-xs ' + (message.startsWith('✓') ? 'text-success' : 'text-danger')} role="status">{message}</p> : null}
              <button type="button" onClick={() => void save()} disabled={!mandatoryValid || pending} className="h-14 w-full bg-accent-gold px-5 text-xs font-semibold uppercase tracking-[0.15em] text-text-inverse transition disabled:cursor-not-allowed disabled:bg-background-elevated disabled:text-text-muted">{pending ? 'Saving…' : 'Save & deliver here →'}</button>
            </footer> : null}
          </motion.section>
        </Dialog.Content>
      </Dialog.Portal> : null}
    </AnimatePresence>
  </Dialog.Root>;
}
