// Governed by .rules v1.0
import crypto from 'node:crypto';
import type { TrackingResult, TrackingScan } from '../../types/logistics.types.js';
import { SHIPROCKET_TIME_ZONE_OFFSET_MS } from './shiprocket-date.js';
import { confirmedShiprocketDeliveryDate } from './shiprocket-delivery.js';

export interface StoredShiprocketScan extends Omit<TrackingScan, 'timestamp'> {
  timestamp: Date;
  fingerprint: string;
}

export interface ShiprocketTimestampState {
  deliveredDate?: Date;
  lastTrackingUpdate?: Date;
  trackingScans: StoredShiprocketScan[];
}

export interface ShiprocketTimestampRepair {
  deliveredDate: Date;
  lastTrackingUpdate?: Date;
  trackingScans: StoredShiprocketScan[];
  scansCorrected: number;
}

export const planShiprocketTimestampRepair = (stored: ShiprocketTimestampState, tracking: TrackingResult, now = Date.now()): ShiprocketTimestampRepair | undefined => {
  const deliveredDate = confirmedShiprocketDeliveryDate(tracking, now);
  if (!deliveredDate) return undefined;
  const originalDelivery = stored.deliveredDate?.getTime();
  // Repair only a missing confirmation or the proven UTC/IST shift. Do not
  // reinterpret arbitrary dates or extend an expired window from sync time.
  if (originalDelivery !== undefined && originalDelivery !== deliveredDate.getTime()
    && originalDelivery !== deliveredDate.getTime() + SHIPROCKET_TIME_ZONE_OFFSET_MS) return undefined;
  let scansCorrected = 0;
  const trackingScans = stored.trackingScans.map((scan) => {
    const corrected = tracking.scans.find((incoming) => incoming.rawStatus === scan.rawStatus
      && (incoming.location ?? '') === (scan.location ?? '') && incoming.message === scan.message
      && Date.parse(incoming.timestamp) + SHIPROCKET_TIME_ZONE_OFFSET_MS === scan.timestamp.getTime());
    if (!corrected) return scan;
    const timestamp = new Date(corrected.timestamp);
    const fingerprint = crypto.createHash('sha256').update(`${timestamp.toISOString()}|${corrected.rawStatus}|${corrected.location ?? ''}|${corrected.message}`).digest('hex');
    scansCorrected += 1;
    return { ...scan, timestamp, fingerprint };
  });
  if (!scansCorrected && originalDelivery === deliveredDate.getTime()) return undefined;
  const uniqueScans = [...new Map(trackingScans.map((scan) => [scan.fingerprint, scan])).values()]
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  return { deliveredDate, trackingScans: uniqueScans, lastTrackingUpdate: uniqueScans.at(-1)?.timestamp ?? stored.lastTrackingUpdate, scansCorrected };
};
