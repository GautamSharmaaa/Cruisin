import type { z } from 'zod';
export interface FooterAppearance {
  content: 'text' | 'logo';
  text: string; imageUrl: string; lightColor: string; darkColor: string;
  density: number; softness: number; dispersion: number; distortion: number; edgeBend: number;
  angle: number; speed: number; scale: number; rotation: number; mouseTilt: number;
  intro: boolean; metallic: boolean;
}
export type FooterSlider = 'density' | 'softness' | 'dispersion' | 'distortion' | 'edgeBend' | 'angle' | 'speed' | 'scale' | 'rotation' | 'mouseTilt';
export const DEFAULT_FOOTER_APPEARANCE: FooterAppearance;
export const FOOTER_PAINT_SLIDERS: Record<FooterSlider, readonly [number, number, number]>;
export const footerAppearanceSchema: z.ZodType<FooterAppearance>;
