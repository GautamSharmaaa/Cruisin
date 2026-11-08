'use client';
import {useState,type ReactNode} from 'react';
import Link from 'next/link';
import {ArrowUpRight,ArrowUp,Instagram,MessageCircle,Pause,Play} from 'lucide-react';
import {FOOTER_COPY as C} from '@/constants/footer-copy';
export interface FooterProps {}
export function Footer(_props:FooterProps):ReactNode{
 const [paused,setPaused]=useState(false);
 return <footer className="cruisin-glow-footer" data-paused={paused}><div className="cruisin-footer-panel"><div className="cruisin-footer-glow" aria-hidden="true"/><div className="cruisin-footer-top"><nav aria-label="Storefront footer navigation">{C.navigation.map(link=><Link href={link.href} key={link.href}>{link.label}<ArrowUpRight size={16}/></Link>)}</nav><section className="cruisin-footer-contact"><div className="cruisin-footer-social"><a href={C.whatsapp} aria-label="Cruisin on WhatsApp" target="_blank" rel="noreferrer"><MessageCircle size={24}/></a><a href={C.instagram} aria-label="Cruisin on Instagram" target="_blank" rel="noreferrer"><Instagram size={24}/></a><a href={C.facebook} aria-label="Cruisin on Facebook" target="_blank" rel="noreferrer">f</a></div><p>{C.contact}</p><a href={'mailto:'+C.email}>{C.email}</a><a href={C.phoneHref}>{C.phone}</a></section></div><div className="cruisin-footer-signature" aria-hidden="true">{C.brand}</div><div className="cruisin-footer-bottom"><p>© {new Date().getFullYear()} {C.copyright}</p><nav aria-label="Store policies">{C.policies.map(link=><Link href={link.href} key={link.href}>{link.label}</Link>)}</nav><div><button type="button" aria-label={paused?C.play:C.pause} aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?<Play size={14}/>:<Pause size={14}/>}</button><a href="#main" aria-label={C.back}><ArrowUp size={16}/></a></div></div></div></footer>;
}
