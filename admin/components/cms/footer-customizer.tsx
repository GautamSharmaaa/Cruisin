'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_FOOTER_APPEARANCE as defaults, FOOTER_PAINT_SLIDERS, footerAppearanceSchema, type FooterAppearance, type FooterSlider } from '@cruisin/contracts/footer-appearance';
import { storefrontColorSchema } from '@cruisin/contracts/storefront-appearance';
import { useAdminMe, useAdminSiteSettings } from '@/hooks/useAdminResources';
import { uploadPublicMedia } from '@/lib/media-upload';
import { api } from '@/lib/api';
import type { SiteSettingsDto } from '@/types/dto.types';

const MetallicPaint = dynamic(() => import('@cruisin/ui/metallic-paint'), { ssr: false });
const font = '"Snell Roundhand", "Apple Chancery", "Segoe Script", cursive';
const settingsKey = ['admin', 'site-settings'];
const sliderLabels: Record<FooterSlider, string> = {
  density: 'Density', softness: 'Softness', dispersion: 'Dispersion', distortion: 'Distortion',
  edgeBend: 'Edge bend', angle: 'Angle', speed: 'Speed', scale: 'Scale', rotation: 'Rotation', mouseTilt: 'Mouse tilt',
};
const presets = {
  Chrome: { lightColor: defaults.lightColor, darkColor: defaults.darkColor, density: 1.7, softness: 0.13, dispersion: 0, distortion: 0.08, edgeBend: 0.66, angle: 68, speed: 0.35, metallic: true },
  Gold: { lightColor: '#b67b30', darkColor: '#ffd58e', density: 2.2, softness: 0.19, dispersion: 0.03, distortion: 0.09, edgeBend: 0.66, angle: 76, speed: 0.38, metallic: true },
  Brushed: { lightColor: '#b1b8c2', darkColor: '#e0e6ed', density: 2.7, softness: 0.43, dispersion: 0, distortion: 0.04, edgeBend: 0.45, angle: 80, speed: 0.22, metallic: true },
} as const;

export function FooterCustomizer() {
  const site = useAdminSiteSettings();
  const me = useAdminMe();
  const editable = ['admin', 'superadmin', 'manager'].includes(me.data?.role ?? '');
  return <section className="mx-auto grid w-full max-w-6xl gap-5">
    <header><Link href="/cms" className="text-sm text-accent-gold">← CMS</Link><h1 className="mt-2 text-2xl font-semibold">Customize footer</h1>
      <p className="mt-2 text-sm text-text-secondary">Preview the footer wordmark in either theme. Saving applies it across the storefront.</p></header>
    {site.isError ? <p role="alert">Footer settings could not be loaded.</p> : site.data ?
      <FooterForm initial={footerAppearanceSchema.safeParse(site.data.footerAppearance ?? {}).data ?? defaults} editable={editable} /> :
      <p role="status">Loading footer settings…</p>}
  </section>;
}

interface FooterFormProps { initial: FooterAppearance; editable: boolean; }

function FooterForm({ initial, editable }: FooterFormProps) {
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(initial);
  const [preset, setPreset] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [error, setError] = useState('');
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: async (footerAppearance: FooterAppearance) =>
      (await api.put<{ data: SiteSettingsDto }>('/admin/site-settings', { footerAppearance })).data.data,
    onSuccess: settings => {
      const saved = settings.footerAppearance ?? defaults;
      cache.setQueryData(settingsKey, settings);
      setDraft(saved);
      setBaseline(saved);
    },
  });
  const upload = useMutation({
    mutationFn: uploadPublicMedia,
    onSuccess: imageUrl => { setDraft(current => ({ ...current, imageUrl, content: 'logo' })); save.reset(); },
  });
  const locked = !editable || save.isPending || upload.isPending;
  const patch = (values: Partial<FooterAppearance>) => {
    setDraft(current => ({ ...current, ...values }));
    setError('');
    save.reset();
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (locked) return;
    const parsed = footerAppearanceSchema.safeParse(draft);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Check the footer settings.'); return; }
    save.mutate(parsed.data);
  };
  const colorKey = theme === 'light' ? 'lightColor' : 'darkColor';
  const color = storefrontColorSchema.safeParse(draft[colorKey]).data ?? defaults[colorKey];
  const safe = footerAppearanceSchema.safeParse(draft);
  const image = safe.success && draft.content === 'logo' ? safe.data.imageUrl : '';
  const showPaint = draft.metallic && Boolean(draft.content === 'text' ? draft.text.trim() : image);
  const original = JSON.stringify(draft) === JSON.stringify(baseline);

  return <form onSubmit={submit} className="grid gap-5">
    <section className="border border-border bg-background-elevated" aria-label="Footer wordmark preview">
      <div className="flex items-center justify-between gap-4 border-b border-border p-3">
        <h2 className="font-semibold">Preview</h2>
        <div className="flex gap-2">{(['dark','light'] as const).map(value => <button type="button" key={value} className="workspace-widget-action capitalize" aria-pressed={theme===value} onClick={() => setTheme(value)}>{value}</button>)}</div>
      </div>
      <div className="cms-footer-preview" data-theme={theme}>
        <div className="cms-footer-preview-mark" style={{ transform: `rotate(${draft.rotation}deg) scale(${draft.scale})` }}>
          {image ? <img src={image} alt="" className="cms-footer-preview-fallback" /> : <span className="cms-footer-preview-fallback">{draft.text}</span>}
          {showPaint && <div className="absolute inset-0"><MetallicPaint key={String(draft.intro)} {...draft} text={image ? undefined : draft.text}
            imageSrc={image || undefined} fontFamily={font} fontWeight={400} color={color} scale={1} lightMode={theme==='light'} stretch={!image} /></div>}
        </div>
      </div>
    </section>
    <fieldset disabled={locked} className="grid gap-4 border border-border bg-background-elevated p-4">
      <legend className="px-2 font-semibold">Customize</legend>
      <div className="cms-footer-controls">
        <label>Preset<select value={preset} onChange={event => { const name=event.target.value as keyof typeof presets; setPreset(name); if (presets[name]) patch(presets[name]); }}>
          <option value="">Custom</option>{Object.keys(presets).map(name => <option key={name}>{name}</option>)}
        </select></label>
        <label>Content<select value={draft.content} onChange={event => patch({content:event.target.value==='logo'?'logo':'text'})}><option value="text">Text</option><option value="logo">Logo</option></select></label>
        {draft.content==='text' ? <label>Text<input value={draft.text} maxLength={36} onChange={event=>patch({text:event.target.value})} /></label> : <>
          <label>Logo URL<input type="url" value={draft.imageUrl} onChange={event=>patch({imageUrl:event.target.value})} placeholder="https://" /></label>
          <label>Upload PNG<input type="file" accept="image/png" onChange={event=>{const file=event.target.files?.[0];if(file)upload.mutate(file);}} /></label>
        </>}
        {(['lightColor','darkColor'] as const).map(key => <div className="cms-footer-color" key={key}>
          <label><span>{key==='lightColor'?'Light color':'Dark color'}</span><input type="color" value={storefrontColorSchema.safeParse(draft[key]).data ?? defaults[key]} onChange={event=>{setPreset('');patch({[key]:event.target.value});}} /></label>
          <input aria-label={key==='lightColor'?'Light color hex':'Dark color hex'} maxLength={7} value={draft[key]} onChange={event=>{setPreset('');patch({[key]:event.target.value});}} />
        </div>)}
        {(Object.keys(sliderLabels) as FooterSlider[]).map(key => {
          const [min,max,step]=FOOTER_PAINT_SLIDERS[key];
          return <label key={key}><span>{sliderLabels[key]} <output>{draft[key]}{key==='angle'||key==='rotation'?'°':''}</output></span>
            <input type="range" min={min} max={max} step={step} value={draft[key]} onChange={event=>{setPreset('');patch({[key]:event.target.valueAsNumber});}} />
          </label>;
        })}
        <label className="cms-footer-check">Intro animation<input type="checkbox" checked={draft.intro} onChange={event=>patch({intro:event.target.checked})} /></label>
        <label className="cms-footer-check">Metallic finish<input type="checkbox" checked={draft.metallic} onChange={event=>patch({metallic:event.target.checked})} /></label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="workspace-widget-action workspace-widget-primary" disabled={original}>{save.isPending?'Saving…':'Save footer'}</button>
        <button type="button" className="workspace-widget-action" onClick={()=>{setPreset('');patch(defaults);}}>Reset to default</button>
      </div>
    </fieldset>
    {!editable&&<p className="text-sm text-text-secondary">Your role has read-only access.</p>}
    {(error||save.isError||upload.isError)&&<p role="alert" className="text-sm text-danger">{error||(upload.isError?'The PNG could not be uploaded.':'Footer settings could not be saved.')}</p>}
    {upload.isPending&&<p role="status">Uploading logo…</p>}
    {save.isSuccess&&<p role="status">Footer settings saved.</p>}
  </form>;
}
