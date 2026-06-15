// Governed by .rules v1.0
'use client';

import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { type ReactNode, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { COPY } from '@/constants/copy';
import { heroTextReveal } from '@/lib/animations';

export interface HeroSectionProps { }
export function HeroSection(_props: HeroSectionProps): ReactNode {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <section className="relative min-h-dvh overflow-hidden">
      {mounted ? (
        <video
          src="/hero.mp4"
          poster="https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?auto=format&fit=crop&w=1800&q=85"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover opacity-60 z-0"
        />
      ) : (
        <div className="absolute inset-0 bg-[#080808] z-0" />
      )}
      <div className="absolute inset-0 bg-hero z-10 pointer-events-none" />
      <div className="relative z-20 flex min-h-dvh flex-col justify-end px-6 pb-24 lg:px-20">
        <p className="mb-6 font-accent text-xs uppercase tracking-[0.15em] text-accent-gold">{COPY.hero.eyebrow}</p>
        <div className="overflow-hidden">
          <motion.h1 variants={heroTextReveal} initial="initial" animate="animate" className="font-display text-hero font-light text-text-primary">
            <span className="block">{COPY.hero.lineOne}</span>
            <span className="block">{COPY.hero.lineTwo}</span>
          </motion.h1>
        </div>
        <motion.div initial="initial" animate="animate" variants={heroTextReveal} className="mt-8 flex flex-wrap gap-3">
          <Button><Link href="/shop">{COPY.hero.cta}</Link></Button>
          <Button variant="secondary"><Link href="/shop?category=outerwear">{COPY.hero.secondary}</Link></Button>
        </motion.div>
      </div>
      <div className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-text-secondary">
        <ChevronDown className="animate-pulse-line" aria-label={COPY.hero.scroll} />
      </div>
    </section>
  );
}
