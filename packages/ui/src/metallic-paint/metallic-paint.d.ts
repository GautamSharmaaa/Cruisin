import type { ReactElement } from 'react';

export interface MetallicPaintProps {
  text?: string;
  imageSrc?: string;
  fontFamily?: string;
  fontWeight?: number;
  textRasterSize?: number;
  color?: string;
  density?: number;
  softness?: number;
  dispersion?: number;
  distortion?: number;
  edgeBend?: number;
  angle?: number;
  speed?: number;
  scale?: number;
  mouseTilt?: number;
  lightMode?: boolean;
  intro?: boolean;
  dpr?: number;
  stretch?: boolean;
}

export default function MetallicPaint(props: MetallicPaintProps): ReactElement;
