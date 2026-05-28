// Governed by .rules v1.0
import type { Variants } from 'framer-motion';
export const pageVariants: Variants = { initial: { opacity: 0, y: 24, filter: 'blur(8px)' }, animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }, exit: { opacity: 0, y: -12, transition: { duration: 0.3 } } };
export const staggerContainer: Variants = { animate: { transition: { staggerChildren: 0.06 } } };
export const staggerItem: Variants = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
export const heroTextReveal: Variants = { initial: { opacity: 0, y: 40, skewY: 2 }, animate: { opacity: 1, y: 0, skewY: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } } };
export const drawerVariants: Variants = { initial: { x: '100%' }, animate: { x: 0, transition: { type: 'spring', stiffness: 300, damping: 35 } }, exit: { x: '100%', transition: { duration: 0.25, ease: 'easeIn' } } };
