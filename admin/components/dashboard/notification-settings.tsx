'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, MessageCircle } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useAdminMe } from '@/hooks/useAdminResources';
import { api } from '@/lib/api';

type Settings = { recipients: string[]; delivery: 'local' | 'configured' | 'setup_required' };
const endpoint = '/admin/notification-settings';
const settingsKey = ['admin', 'notification-settings'] as const;
const modes = {
  local: 'Local mode · WhatsApp delivery is off',
  configured: 'WhatsApp provider configured',
  setup_required: 'WhatsApp provider setup required',
};

export function NotificationSettings() {
  const me = useAdminMe();
  const allowed = ['admin', 'superadmin'].includes(me.data?.role ?? '');
  const settings = useQuery({
    queryKey: settingsKey,
    queryFn: async () => (await api.get<{ data: Settings }>(endpoint)).data.data,
    enabled: allowed,
  });
  if (me.isPending || (allowed && settings.isPending)) return <p role="status">Loading notification settings…</p>;
  if (me.isError || settings.isError) return <p role="alert">Notification settings could not be loaded.</p>;
  if (!allowed) return <p>Only administrators can manage WhatsApp recipients.</p>;
  if (!settings.data) return null;
  return <RecipientForm settings={settings.data} />;
}

function RecipientForm({ settings }: { settings: Settings }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState(settings.recipients.join('\n'));
  const [error, setError] = useState('');
  const save = useMutation({
    mutationFn: async (recipients: string[]) => (await api.put<{ data: Settings }>(endpoint, { recipients })).data.data,
    onSuccess: data => {
      queryClient.setQueryData(settingsKey, data);
      setInput(data.recipients.join('\n'));
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.reset();
    const recipients = [...new Set(input.split(/[\n,]+/).map(value => value.trim().replace(/[ ()-]/g, '')).filter(Boolean))];
    if (recipients.length > 10 || recipients.some(value => !/^\+[1-9]\d{6,14}$/.test(value))) {
      setError('Enter up to 10 numbers in international format, such as +919876543210.');
      return;
    }
    setError('');
    save.mutate(recipients);
  }

  return <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,.65fr)]">
    <form onSubmit={submit} className="workspace-widget gap-4">
      <div className="workspace-widget-title"><h2 className="flex items-center gap-2"><MessageCircle size={18} className="text-accent-gold" />WhatsApp recipients</h2></div>
      <p className="text-sm text-text-secondary">{modes[settings.delivery]}</p>
      <label htmlFor="whatsapp-recipients" className="text-sm font-semibold">Phone numbers</label>
      <textarea id="whatsapp-recipients" rows={5} value={input} disabled={save.isPending} onChange={event => { setInput(event.target.value); setError(''); save.reset(); }}
        aria-describedby="whatsapp-recipient-help" className="resize-y border border-border bg-background-primary p-3 font-mono text-sm" />
      <p id="whatsapp-recipient-help" className="text-xs text-text-secondary">Use one international number per line, including the country code. Save an empty list to stop new alerts.</p>
      {(error || save.isError) && <p role="alert" className="text-sm text-danger">{error || 'Recipients could not be saved. Try again.'}</p>}
      {save.isSuccess && <p role="status" className="text-sm text-success">WhatsApp recipients saved.</p>}
      <button className="workspace-widget-action workspace-widget-primary self-start" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save recipients'}</button>
    </form>
    <section className="workspace-widget gap-4">
      <div className="workspace-widget-title"><h2 className="flex items-center gap-2"><Bell size={18} className="text-accent-gold" />Alert sources</h2></div>
      <ul className="grid gap-2 text-sm text-text-secondary">
        {['Employee website activity', 'New orders', 'Return requests', 'Exchange requests'].map(source => <li className="border-b border-border pb-2" key={source}>{source}</li>)}
      </ul>
    </section>
  </div>;
}
