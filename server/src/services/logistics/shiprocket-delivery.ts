// Governed by .rules v1.0
import type { TrackingResult } from '../../types/logistics.types.js';
import { parseShiprocketDate } from './shiprocket-date.js';

export const confirmedShiprocketDeliveryDate = (tracking: TrackingResult, now = Date.now()): Date | undefined => {
  if (tracking.status !== 'delivered') return undefined;
  const summaryDate = parseShiprocketDate(tracking.deliveredDate);
  if (summaryDate && summaryDate.getTime() <= now) return summaryDate;
  // A later tracking update is not necessarily the original delivery event.
  return tracking.scans.filter((scan) => scan.status === 'delivered')
    .map((scan) => parseShiprocketDate(scan.timestamp))
    .filter((date): date is Date => Boolean(date && date.getTime() <= now))
    .sort((left, right) => left.getTime() - right.getTime())[0];
};
