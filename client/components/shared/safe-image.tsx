'use client';

import Image, { type ImageProps } from 'next/image';
import { useState, type ReactNode } from 'react';
import { adaptiveImageQuality } from '@/lib/adaptive-image-quality';

export interface SafeImageProps extends ImageProps { fallbackSrc?: string; }

export function SafeImage({ src, fallbackSrc = '/cruisin-image-fallback.svg', onError, quality, unoptimized, ...props }: SafeImageProps): ReactNode {
  const [failedSource, setFailedSource] = useState<ImageProps['src']>();
  const failed = failedSource === src;
  const source = typeof src === 'string' ? src : '';
  const bypassOptimizer = /^https:\/\/(placehold\.co|s3\.ap-south-1\.amazonaws\.com)\//.test(source);
  // Keep the same responsive image URLs from server render through hydration.
  return <Image {...props} src={failed ? fallbackSrc : src} quality={quality ?? adaptiveImageQuality()} unoptimized={unoptimized ?? bypassOptimizer} onError={(event) => { if (!failed) setFailedSource(src); onError?.(event); }} />;
}
