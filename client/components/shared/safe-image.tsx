'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import { adaptiveImageQuality, type NetworkQualitySnapshot } from '@/lib/adaptive-image-quality';

export interface SafeImageProps extends ImageProps { fallbackSrc?: string; }

interface BrowserNetworkInformation extends NetworkQualitySnapshot {
  addEventListener?: (type: 'change', listener: () => void) => void;
  removeEventListener?: (type: 'change', listener: () => void) => void;
}

export function SafeImage({ src, fallbackSrc = '/cruisin-image-fallback.svg', onError, quality, unoptimized, ...props }: SafeImageProps): ReactNode {
  const [failed, setFailed] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(85);
  useEffect(() => setFailed(false), [src]);
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: BrowserNetworkInformation }).connection;
    const updateQuality = (): void => setNetworkQuality(adaptiveImageQuality(connection));
    updateQuality();
    connection?.addEventListener?.('change', updateQuality);
    return () => connection?.removeEventListener?.('change', updateQuality);
  }, []);
  const source = typeof src === 'string' ? src : '';
  const bypassOptimizer = /^https:\/\/(placehold\.co|s3\.ap-south-1\.amazonaws\.com)\//.test(source);
  return <Image {...props} src={failed ? fallbackSrc : src} quality={quality ?? networkQuality} unoptimized={unoptimized ?? bypassOptimizer} onError={(event) => { if (!failed) setFailed(true); onError?.(event); }} />;
}
