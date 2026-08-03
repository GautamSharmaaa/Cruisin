// Governed by .rules v1.0
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Clock3, Instagram, Mail, Phone } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export interface FooterProps { }

const usefulLinks = [
  { label: 'About Us', href: ROUTES.about },
  { label: 'Privacy Policy', href: ROUTES.privacy },
  { label: 'Return Policy', href: ROUTES.returns },
  { label: 'Shipping Policy', href: ROUTES.shipping },
  { label: 'Terms & Conditions', href: ROUTES.terms }
];

const searchedLinks = [
  { label: 'In The Spotlight', href: '/shop?sort=newest' },
  { label: 'Track Pants', href: '/shop?q=track%20pants' },
  { label: 'Top Products', href: '/shop?sort=best-selling' },
  { label: 'Shorts', href: '/shop?q=shorts' },
  { label: 'Amazing Deals', href: '/shop?sort=price-asc' },
  { label: 'Best Sellers', href: '/shop?sort=best-selling' }
];

const facebookUrl = 'https://www.facebook.com/profile.php?id=61586849806134';
const instagramUrl = 'https://www.instagram.com/cruisin.in?igsh=MTAxejVucm83Z3k0Yw%3D%3D&utm_source=qr';
const phone = '+91 - 8287846203';
const whatsappHref = 'https://wa.me/918287846203';
const email = 'support@cruisin.co.in';

export function Footer(_props: FooterProps): ReactNode {
  return <footer className="relative z-10 border-t border-border bg-background-primary px-6 py-10 lg:px-20">
    <div className="mx-auto grid max-w-[1440px] gap-10 lg:grid-cols-[1.15fr_0.65fr_1.05fr]">
      <section className="max-w-2xl">
        <h2 data-testid="footer-wordmark" className="brand-wordmark-script text-[34px] leading-none text-text-primary">Cruisin</h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-text-secondary">Minimal streetwear essentials cut for movement, restraint, and daily wear.</p>
        <div className="mt-6 flex items-center gap-3">
          <span className="text-sm text-text-secondary">Follow us on</span>
          <a href={facebookUrl} target="_blank" rel="noreferrer" aria-label="Cruisin on Facebook" className="grid h-9 w-9 place-items-center border border-border text-lg font-bold text-[#1877f2] transition hover:border-accent-gold">f</a>
          <a href={instagramUrl} target="_blank" rel="noreferrer" aria-label="Cruisin on Instagram" className="grid h-9 w-9 place-items-center border border-border text-[#e4405f] transition hover:border-accent-gold"><Instagram size={18} strokeWidth={2.2} /></a>
        </div>
      </section>

      <nav aria-label="Useful footer links">
        <h3 className="font-display text-xl text-text-primary">Useful Links</h3>
        <div className="mt-5 grid gap-4 text-sm text-text-secondary">
          {usefulLinks.map((link) => <Link key={link.href} href={link.href} className="transition hover:text-accent-gold">{link.label}</Link>)}
        </div>
      </nav>

      <section>
        <h3 className="font-display text-xl text-text-primary">Contact Us</h3>
        <div className="mt-5 grid gap-4 text-sm leading-6 text-text-secondary">
          <a href={whatsappHref} target="_blank" rel="noreferrer" className="flex gap-3 transition hover:text-accent-gold"><Phone size={16} className="mt-1 shrink-0 text-accent-gold" />WhatsApp: {phone}</a>
          <p className="flex gap-3"><Clock3 size={16} className="mt-1 shrink-0 text-accent-gold" /><span>Support: 24/7 on WhatsApp and email</span></p>
          <a href={'mailto:' + email} className="flex gap-3 transition hover:text-accent-gold"><Mail size={16} className="mt-1 shrink-0 text-accent-gold" />Email: {email}</a>
        </div>
      </section>
    </div>

    <div className="mx-auto mt-10 max-w-[1440px] border-t border-border pt-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-xs uppercase tracking-[0.12em] text-text-secondary">
        <span className="font-semibold text-text-primary">Most searched on store</span>
        {searchedLinks.map((link, index) => <span key={link.label + link.href} className="flex items-center gap-5">
          <Link href={link.href} className="transition hover:text-accent-gold">{link.label}</Link>
          {index < searchedLinks.length - 1 ? <span className="text-text-muted">|</span> : null}
        </span>)}
      </div>
      <p className="mt-6 text-xs text-text-muted">© {new Date().getFullYear()} Cruisin. All rights reserved.</p>
    </div>
  </footer>;
}
