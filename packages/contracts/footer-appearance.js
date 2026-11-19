import { z } from 'zod';
import { storefrontColorSchema } from './storefront-appearance.js';

export const DEFAULT_FOOTER_APPEARANCE = {
  content: 'text', text: 'Cruisin', imageUrl: '', lightColor: '#e1e3e6', darkColor: '#f4f5f7',
  density: 1.7, softness: 0.13, dispersion: 0, distortion: 0.08, edgeBend: 0.66, angle: 68,
  speed: 0.35, scale: 1, rotation: 0, mouseTilt: 0, intro: false, metallic: true,
};

const defaults = DEFAULT_FOOTER_APPEARANCE;
export const FOOTER_PAINT_SLIDERS = {
  density: [0.5, 12, 0.1], softness: [0, 1, 0.01], dispersion: [0, 1, 0.01], distortion: [0, 1, 0.01],
  edgeBend: [0, 1, 0.01], angle: [0, 360, 1], speed: [0, 2, 0.05], scale: [0.35, 1, 0.01],
  rotation: [-25, 25, 1], mouseTilt: [0, 1, 0.05],
};

const range = key => {
  const [min, max] = FOOTER_PAINT_SLIDERS[key];
  return z.number().min(min).max(max).default(defaults[key]);
};
const imageUrl = z.string().trim().max(2048).refine(value => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return !url.username && !url.password && (url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)));
  } catch { return false; }
}, 'Use an HTTPS image URL or upload a PNG.');

export const footerAppearanceSchema = z.object({
  content: z.enum(['text', 'logo']).default(defaults.content),
  text: z.string().trim().min(1).max(36).default(defaults.text),
  imageUrl: imageUrl.default(''),
  lightColor: storefrontColorSchema.default(defaults.lightColor),
  darkColor: storefrontColorSchema.default(defaults.darkColor),
  density: range('density'), softness: range('softness'), dispersion: range('dispersion'), distortion: range('distortion'),
  edgeBend: range('edgeBend'), angle: range('angle'), speed: range('speed'), scale: range('scale'),
  rotation: range('rotation'), mouseTilt: range('mouseTilt'),
  intro: z.boolean().default(defaults.intro), metallic: z.boolean().default(defaults.metallic),
}).strict().refine(value => value.content !== 'logo' || value.imageUrl, { path: ['imageUrl'], message: 'Choose a logo image.' });
