'use client';

import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_STOREFRONT_LINKS as defaults, storefrontLinksSchema, type StorefrontLinks } from '@cruisin/contracts/storefront-links';
import { useAdminMe, useAdminSiteSettings } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';
import type { SiteSettingsDto } from '@/types/dto.types';

const groups = {
  landing: 'Header department links', men: 'Men’s category links', women: 'Women’s category links',
  menuUtilities: 'Menu utility links',
  footer: 'Footer navigation', policies: 'Footer policies',
} as const;
type Group = keyof typeof groups;
const keys = Object.keys(groups) as Group[];

export function NavigationSettings() {
  const site = useAdminSiteSettings();
  const me = useAdminMe();
  const canEdit = ['admin', 'superadmin', 'manager'].includes(me.data?.role ?? '');
  return <section className="mx-auto grid w-full max-w-5xl gap-5">
    <header>
      <Link href="/cms" className="text-sm text-accent-gold">← CMS</Link>
      <h1 className="mt-2 text-2xl font-semibold">Storefront navigation</h1>
      <p className="mt-2 text-sm text-text-secondary">Edit the labels and destinations for links across the storefront.</p>
    </header>
    <nav aria-label="More storefront controls" className="flex flex-wrap gap-2">
      <Link className="workspace-widget-action" href="/storefront?panel=navigation">Header menu links</Link>
      <Link className="workspace-widget-action" href="/storefront?panel=mega-menu">Mega menu links</Link>
      <Link className="workspace-widget-action" href="/storefront?panel=pages">Page settings and links</Link>
      <Link className="workspace-widget-action" href="/cms/experience">Loading and collection controls</Link>
    </nav>
    {site.isError ? <p role="alert">Navigation settings could not be loaded.</p> : site.data ?
      <LinkEditor initial={storefrontLinksSchema.safeParse(site.data.storefrontLinks ?? {}).data ?? defaults} canEdit={canEdit} /> :
      <p role="status">Loading navigation settings…</p>}
  </section>;
}

interface LinkEditorProps { initial: StorefrontLinks; canEdit: boolean; }

function LinkEditor({ initial, canEdit }: LinkEditorProps) {
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState('');
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: async (storefrontLinks: StorefrontLinks) =>
      (await api.put<{ data: SiteSettingsDto }>('/admin/site-settings', { storefrontLinks })).data.data,
    onSuccess: settings => {
      cache.setQueryData(['admin', 'site-settings'], settings);
      setDraft(settings.storefrontLinks ?? defaults);
    },
  });
  const patch = (values: Partial<StorefrontLinks>) => {
    setDraft(current => ({ ...current, ...values }));
    setError('');
    save.reset();
  };
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit || save.isPending) return;
    const parsed = storefrontLinksSchema.safeParse(draft);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue.path[0];
      setError((typeof field === 'string' && field in groups ? groups[field as Group] : 'Logo link') + ' · ' + issue.message);
      return;
    }
    save.mutate(parsed.data);
  }
  const input = 'w-full min-w-0 border border-border bg-background-primary px-2 py-2 text-sm';
  return <form onSubmit={submit} className="grid gap-4">
    <fieldset disabled={!canEdit || save.isPending} className="grid gap-4">
      <label className="grid gap-2 border border-border bg-background-elevated p-4 text-sm font-semibold">Logo link
        <input className={input} value={draft.brandHref} onChange={event => patch({ brandHref: event.target.value })} />
      </label>
      <label className="grid gap-2 border border-border bg-background-elevated p-4 text-sm font-semibold">Show Men / Women beneath the header
        <select className={input} value={draft.headerDepartmentLinksVisibility} onChange={event => {
          const parsed=storefrontLinksSchema.safeParse({...draft,headerDepartmentLinksVisibility:event.target.value});
          if(parsed.success)patch({headerDepartmentLinksVisibility:parsed.data.headerDepartmentLinksVisibility});
        }}><option value="home">Landing page only</option><option value="all">All pages</option><option value="hidden">Hidden</option></select>
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        {keys.map(group => <fieldset key={group} className="grid content-start gap-2 border border-border bg-background-elevated p-4">
          <legend className="px-2 text-sm font-semibold">{groups[group]}</legend>
          {draft[group].map((link,index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-center gap-2">
            <input className={input} value={link.label} placeholder="Label" aria-label={groups[group] + ' label ' + (index + 1)}
              onChange={event => patch({ [group]: draft[group].map((row,i) => i === index ? { ...row, label: event.target.value } : row) })} />
            <input className={input} value={link.href} placeholder="/page" aria-label={groups[group] + ' destination ' + (index + 1)}
              onChange={event => patch({ [group]: draft[group].map((row,i) => i === index ? { ...row, href: event.target.value } : row) })} />
            {group !== 'landing' && <button className="px-2 text-sm text-danger" type="button" aria-label={'Remove ' + groups[group] + ' link ' + (index + 1)}
              onClick={() => patch({ [group]: draft[group].filter((_,i) => i !== index) })}>×</button>}
          </div>)}
          {group !== 'landing' && draft[group].length < 12 && <button type="button" className="workspace-widget-action justify-self-start"
            onClick={() => patch({ [group]: [...draft[group], { label: '', href: '/' }] })}>Add link</button>}
        </fieldset>)}
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className="workspace-widget-action workspace-widget-primary">{save.isPending ? 'Saving…' : 'Save links'}</button>
        <button type="button" className="workspace-widget-action" onClick={() => patch(defaults)}>Reset defaults</button>
      </div>
    </fieldset>
    {(error || save.isError) && <p role="alert" className="text-sm text-danger">{error || 'Links could not be saved.'}</p>}
    {save.isSuccess && <p role="status" className="text-sm">Storefront links saved.</p>}
  </form>;
}
