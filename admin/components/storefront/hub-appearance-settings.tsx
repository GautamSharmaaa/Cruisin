'use client';
import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react';
import { DEFAULT_STOREFRONT_APPEARANCE as defaults, storefrontAppearanceSchema, storefrontColorSchema, type StorefrontAppearance } from '@cruisin/contracts/storefront-appearance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { STOREFRONT_APPEARANCE_COPY as C } from '@/constants/storefront-appearance-copy';
import { useSaveStorefrontAppearance } from '@/hooks/useStorefrontAppearance';
import type { SiteSettingsDto } from '@/types/dto.types';

const appearance = (site: SiteSettingsDto): StorefrontAppearance => ({ cruisinRingFinish: site.cruisinRingFinish ?? defaults.cruisinRingFinish, cruisinRingColorLight: site.cruisinRingColorLight ?? defaults.cruisinRingColorLight, cruisinRingColorDark: site.cruisinRingColorDark ?? defaults.cruisinRingColorDark });
export interface HubAppearanceSettingsProps { site: SiteSettingsDto; }
export function HubAppearanceSettings({ site }: HubAppearanceSettingsProps): ReactNode {
  const [colors, setColors] = useState<StorefrontAppearance>(() => appearance(site));
  const [dirty, setDirty] = useState(false), [invalid, setInvalid] = useState(false);
  const save = useSaveStorefrontAppearance();
  useEffect(() => { if (!dirty) setColors(appearance(site)); }, [site, dirty]);
  const change = (key: Exclude<keyof StorefrontAppearance, 'cruisinRingFinish'>, value: string): void => { setColors(current => ({ ...current, [key]: value })); setDirty(true); setInvalid(false); save.reset(); };
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault(); const result = storefrontAppearanceSchema.safeParse(colors);
    setInvalid(!result.success);
    if (result.success) save.mutate(result.data, { onSuccess: () => setDirty(false) });
  };
  return <form onSubmit={submit} className="mt-8 grid gap-4 border-t border-border pt-6" aria-label={C.title}>
    <div><h3 className="text-lg text-text-primary">{C.title}</h3><p className="mt-2 text-sm text-text-secondary">{C.description}</p></div>
    <label className="grid max-w-xs gap-2 text-sm">Ring finish
      <select className="border border-border bg-background-primary px-3 py-2" value={colors.cruisinRingFinish} onChange={event => {
        const value = event.target.value === 'color' ? 'color' : 'chrome';
        setColors(current => ({ ...current, cruisinRingFinish: value })); setDirty(true); save.reset();
      }}><option value="chrome">Chrome</option><option value="color">Colored glow</option></select>
    </label>
    <fieldset disabled={colors.cruisinRingFinish === 'chrome'} className="grid gap-4 disabled:opacity-50 md:grid-cols-2">{(['cruisinRingColorLight', 'cruisinRingColorDark'] as const).map(key => {
      const label = key === 'cruisinRingColorLight' ? C.light : C.dark;
      const parsed = storefrontColorSchema.safeParse(colors[key]);
      const color = parsed.success ? parsed.data : defaults[key];
      return <div key={key} className="grid grid-cols-[64px_1fr] items-center gap-4 border border-border p-4">
        <label className="block text-xs text-text-secondary"><span className="sr-only">{label + ' ' + C.picker}</span><input type="color" value={color} aria-label={label + ' ' + C.picker} onChange={event => change(key, event.target.value)} className="mt-2 h-12 w-12 cursor-pointer rounded-full border-4 border-transparent [border-color:var(--hub-preview-color)]" style={{ '--hub-preview-color': color } as CSSProperties} /></label>
        <Input label={label + ' ' + C.hex} aria-label={label + ' ' + C.hex} value={colors[key]} onChange={event => change(key, event.target.value)} error={invalid && !parsed.success ? C.invalid : undefined} maxLength={7} spellCheck={false} autoComplete="off" />
      </div>;
    })}</fieldset>
    <div className="flex flex-wrap gap-3"><Button type="submit" disabled={!dirty || save.isPending}>{save.isPending ? C.saving : C.save}</Button><Button type="button" variant="secondary" disabled={save.isPending} onClick={() => { setColors({ ...defaults }); setDirty(true); setInvalid(false); save.reset(); }}>{C.reset}</Button></div>
    {invalid && <p role="alert" className="text-sm text-danger">{C.invalid}</p>}{save.isError && <p role="alert" className="text-sm text-danger">{C.error}</p>}{save.isSuccess && <p role="status" className="text-sm text-text-primary">{C.saved}</p>}
  </form>;
}
