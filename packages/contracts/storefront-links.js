import { z } from 'zod';

const path = z.string().trim().max(512).refine(value => /^\/(?!\/)[^\\\s|]*$/.test(value), 'Use an internal path, such as /shop.');
const link = z.object({ label: z.string().trim().min(1).max(60), href: path }).strict();
const departments = (labels, paths, gender) => labels.map((label, i) => ({ label, href: '/category/' + gender + '/' + paths[i] }));
const labels = ['Tops', 'Bottoms', 'Outerwear', 'Accessories'];
const pairs = values => values.map(([label, href]) => ({ label, href }));
export const DEFAULT_STOREFRONT_LINKS = {
  brandHref: '/',
  headerDepartmentLinksVisibility: 'home',
  landing: pairs([['Men','/men?view=all'],['Women','/women?view=all']]),
  men: departments(labels,['t-shirts','pants','jackets','accessories'],'men'),
  women: departments(labels,['t-shirts','pants-leggings','jackets','accessories'],'women'),
  menuUtilities: pairs([['Account','/account'],['Our story','/about-us'],['Shipping','/shipping-policy'],['Returns & exchanges','/return-policy']]),
  footer: pairs([['Home','/'],['Shop the edit','/shop'],['Collections','/collections'],['Our story','/about-us']]),
  policies: pairs([['Shipping','/shipping-policy'],['Returns & exchanges','/return-policy'],['Privacy','/privacy-policy'],['Terms','/terms-and-condition']]),
};
const defaults = DEFAULT_STOREFRONT_LINKS;
export const storefrontLinksSchema = z.object({
  brandHref: path.default(defaults.brandHref),
  headerDepartmentLinksVisibility: z.enum(['home','all','hidden']).default(defaults.headerDepartmentLinksVisibility),
  landing: z.array(link).length(2).default(defaults.landing),
  men: z.array(link).max(12).default(defaults.men),
  women: z.array(link).max(12).default(defaults.women),
  menuUtilities: z.array(link).max(12).default(defaults.menuUtilities),
  footer: z.array(link).max(12).default(defaults.footer),
  policies: z.array(link).max(12).default(defaults.policies),
}).strict();
