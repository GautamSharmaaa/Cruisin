'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';

export interface SafeImageProps extends ImageProps { fallbackSrc?: string; }

export function SafeImage({ src, fallbackSrc = '/cruisin-image-fallback.svg', onError, unoptimized, ...props }: SafeImageProps): ReactNode {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const source = typeof src === 'string' ? src : '';
  const bypassOptimizer = /^https:\/\/(placehold\.co|s3\.ap-south-1\.amazonaws\.com)\//.test(source);
  return <Image {...props} src={failed ? fallbackSrc : src} unoptimized={unoptimized ?? bypassOptimizer} onError={(event) => { if (!failed) setFailed(true); onError?.(event); }} />;
}
