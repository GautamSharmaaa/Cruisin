'use client';
import {useStorefrontReducedMotion} from '@/hooks/useStorefrontMotion';
import {usePathname} from 'next/navigation';
import {motion} from 'framer-motion';
import type {ReactNode} from 'react';
import {storefrontEase,storefrontMotion} from '@/lib/storefront-motion';
export interface StorefrontTemplateProps {children:ReactNode;}
export default function StorefrontTemplate({children}:StorefrontTemplateProps):ReactNode{
 const pathname=usePathname();
 const reduced=Boolean(useStorefrontReducedMotion());const preset=storefrontMotion(reduced);
 return <motion.div key={pathname} className="storefront-route-transition" data-motion={reduced?'reduced':'full'} initial={reduced?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:preset.pageDuration,ease:storefrontEase}}>{children}</motion.div>;
}
