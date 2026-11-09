'use client';
import {type ReactNode} from 'react';
import Link from 'next/link';
import {FooterWave} from './footer-wave';
import {FooterSignature} from './footer-signature';
import {ArrowUpRight,ArrowUp,Instagram} from 'lucide-react';
import {FOOTER_COPY as C} from '@/constants/footer-copy';
export interface FooterProps {}
export function Footer(_props:FooterProps):ReactNode{

 return <footer className="cruisin-glow-footer" ><div className="cruisin-footer-art" aria-hidden="true"><div className="cruisin-footer-glow" aria-hidden="true"/><FooterWave paused={false}/><div className="cruisin-footer-haze" aria-hidden="true"/></div><div className="cruisin-footer-panel"><div className="cruisin-footer-top"><nav aria-label="Storefront footer navigation">{C.navigation.map(link=><Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={16}/></Link>)}</nav><section className="cruisin-footer-contact"><div className="cruisin-footer-social"><a href={C.instagram} aria-label="Cruisin on Instagram" target="_blank" rel="noreferrer"><Instagram size={24}/></a><a href={C.facebook} aria-label="Cruisin on Facebook" target="_blank" rel="noreferrer">f</a></div><p>{C.contact}</p><a href={'mailto:'+C.email}>{C.email}</a></section></div></div><div className="cruisin-footer-bottom"><p>© {new Date().getFullYear()} {C.copyright}</p><nav aria-label="Store policies">{C.policies.map(link=><Link href={link.href} key={link.href}>{link.label}</Link>)}</nav><div><a href="#main" aria-label={C.back}><ArrowUp size={16}/></a></div></div><FooterSignature/></footer>;
}
