// Governed by .rules v1.0
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
export default function AdminLoginPage(): ReactNode { return <main className="mx-auto max-w-md px-6 py-32"><h1 className="font-display text-4xl">{COPY.auth.login}</h1><form className="mt-8 space-y-4"><Input label={COPY.auth.email} /><Input label={COPY.auth.password} type="password" /><Button className="w-full">{COPY.auth.submit}</Button></form></main>; }
