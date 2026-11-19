'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { CUSTOMER_ACCESS as copy } from '@/constants/customer-access';
import { api } from '@/lib/api';

interface CustomerAccessProps { customerId: string }
interface Grant { phone: string; code: string; expiresAt: string }
interface Session { accessToken: string; expiresAt: number }

const storefront = new URL(process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://127.0.0.1:3192');

export function CustomerAccess({ customerId }: CustomerAccessProps): ReactNode {
  const popup = useRef<Window | null>(null);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const generate = useMutation({
    mutationFn: async () => (await api.post<{ data: Grant }>(`/admin/users/${customerId}/customer-access`)).data.data
  });

  useEffect(() => {
    const receive = async (event: MessageEvent): Promise<void> => {
      const target = popup.current;
      if (!target || event.source !== target || event.origin !== storefront.origin) return;
      const input = event.data;
      if (input?.type !== 'cruisin.assisted.redeem' || typeof input.id !== 'string' ||
          typeof input.phone !== 'string' || typeof input.code !== 'string') return;
      try {
        const response = await api.post<{ data: Session }>('/admin/customer-access/redeem', { phone: input.phone, code: input.code });
        target.postMessage({ type: 'cruisin.assisted.result', id: input.id, session: response.data.data }, storefront.origin);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start assisted access.';
        target.postMessage({ type: 'cruisin.assisted.result', id: input.id, error: message }, storefront.origin);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, []);

  return <section className="mt-5 border border-border p-5">
    <h3 className="font-display text-xl text-text-primary">{copy.title}</h3>
    <p className="mt-2 text-sm text-text-secondary">{copy.help}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Button disabled={generate.isPending} onClick={() => generate.mutate()}>{copy.generate}</Button>
      {generate.data && <Button variant="secondary" onClick={() => {
        popup.current = window.open(new URL('/assisted-sign-in', storefront).href, '_blank');
        setPopupBlocked(!popup.current);
      }}>{copy.open}</Button>}
    </div>
    {generate.data && <div className="mt-4 grid gap-2 text-sm">
      <span>{generate.data.phone}</span>
      <code className="select-all break-all border border-border p-3 text-base text-accent-gold">{generate.data.code}</code>
      <span>{copy.expires} {new Date(generate.data.expiresAt).toLocaleTimeString()}</span>
    </div>}
    {(generate.error || popupBlocked) && <p role="alert" className="mt-3 text-sm">{generate.error?.message ?? copy.popupBlocked}</p>}
  </section>;
}
