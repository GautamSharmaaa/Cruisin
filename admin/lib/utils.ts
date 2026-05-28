// Governed by .rules v1.0
export const cn = (...classes: Array<string | false | null | undefined>): string => classes.filter(Boolean).join(' ');
export const formatPrice = (value: number): string => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
export const slugify = (value: string): string => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
