// Governed by .rules v1.0
import type { ReactNode } from 'react';

export interface LegalPageProps {
  title: string;
  eyebrow: string;
  intro: string;
  sections: Array<{ heading: string; body: string }>;
}

export function LegalPage({ title, eyebrow, intro, sections }: LegalPageProps): ReactNode {
  return <main className="px-6 py-28 lg:px-20">
    <div className="mx-auto max-w-4xl">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-accent-gold">{eyebrow}</p>
      <h1 className="mt-5 font-display text-5xl text-text-primary lg:text-7xl">{title}</h1>
      <p className="mt-6 max-w-2xl text-base leading-7 text-text-secondary">{intro}</p>
      <div className="mt-12 grid gap-5">
        {sections.map((section) => <section key={section.heading} className="border border-border bg-background-elevated p-6">
          <h2 className="font-display text-2xl text-text-primary">{section.heading}</h2>
          <p className="mt-3 text-sm leading-7 text-text-secondary">{section.body}</p>
        </section>)}
      </div>
    </div>
  </main>;
}
