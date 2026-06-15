// Governed by .rules v1.0
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { COPY } from '@/constants/copy';
import { newsletterSchema } from '@/lib/schemas';
import type { z } from 'zod';

type NewsletterForm = z.infer<typeof newsletterSchema>;
export interface NewsletterSectionProps { }
export function NewsletterSection(_props: NewsletterSectionProps): ReactNode {
  const { register, handleSubmit, formState, reset } = useForm<NewsletterForm>({ resolver: zodResolver(newsletterSchema) });
  const onSubmit = (data: NewsletterForm): void => {
    window.localStorage.setItem('cruisin-newsletter', data.email);
    reset();
  };
  return (
    <section className="px-6 py-20 lg:px-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl text-text-primary">{COPY.home.newsletter}</h2>
        <p className="mt-4 text-text-secondary">{COPY.home.newsletterBody}</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 text-left">
            <Input label={COPY.home.email} type="email" error={formState.errors.email?.message} {...register('email')} />
          </div>
          <Button type="submit" className="h-12">{COPY.home.subscribe}</Button>
        </form>
      </div>
    </section>
  );
}
