// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { COPY } from '@/constants/copy';
export default function AccountPage(): ReactNode { return <main className="px-6 py-32 lg:px-20"><h1 className="font-display text-4xl">{COPY.account.wishlist}</h1><div className="mt-8 border border-border p-6 text-text-secondary">{COPY.account.save}</div></main>; }
