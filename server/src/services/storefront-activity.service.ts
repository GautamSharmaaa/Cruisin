// Governed by .rules v1.0
import { SecurityEventModel } from '../models/security-event.model.js';
import { StorefrontActivityModel } from '../models/storefront-activity.model.js';
import { UserModel } from '../models/user.model.js';
import { addIstDays, endOfIstDay, startOfIstDay } from '../utils/analytics-simulation.js';
import type { AnalyticsSummaryRange } from './admin.service.js';

export interface StorefrontEvent {
  visitId: string;
  kind: 'visit' | 'bag';
  device: 'mobile' | 'desktop';
}

type ActivityRow = { bucket: string; mobileVisits: number; desktopVisits: number; bagVisitors: number };

export async function recordStorefrontActivity({ visitId, kind, device }: StorefrontEvent): Promise<void> {
  try {
    await StorefrontActivityModel.updateOne(
      { _id: `${visitId}:${kind}` },
      { $setOnInsert: { kind, device, createdAt: new Date() } },
      { upsert: true }
    );
  } catch (error) {
    const duplicateEvent = error instanceof Error && 'code' in error && error.code === 11000
      && 'keyPattern' in error && (error.keyPattern as { _id?: number } | undefined)?._id === 1;
    if (!duplicateEvent) throw error;
  }
}

export async function summarizeStorefrontActivity({ startDate, endDate, timezone, preset }: AnalyticsSummaryRange) {
  const start = startOfIstDay(startDate);
  const end = new Date(Math.min(endOfIstDay(endDate).getTime(), Date.now()));
  const dateMatch = { createdAt: { $gte: start, $lte: end } };
  const days = (endOfIstDay(endDate).getTime() + 1 - start.getTime()) / 86_400_000;
  const granularity = preset === 'thisYear' || days > 62 ? 'month' : preset === 'today' || days === 1 ? 'hour' : 'day';
  const bucketFormat = granularity === 'hour' ? '%H:00' : granularity === 'month' ? '%Y-%m' : '%Y-%m-%d';
  const [activity, signedIn] = await Promise.all([
    StorefrontActivityModel.aggregate<ActivityRow>([
      { $match: dateMatch },
      { $group: {
        _id: { $dateToString: { date: '$createdAt', format: bucketFormat, timezone } },
        mobileVisits: { $sum: { $cond: [{ $and: [{ $eq: ['$kind', 'visit'] }, { $eq: ['$device', 'mobile'] }] }, 1, 0] } },
        desktopVisits: { $sum: { $cond: [{ $and: [{ $eq: ['$kind', 'visit'] }, { $eq: ['$device', 'desktop'] }] }, 1, 0] } },
        bagVisitors: { $sum: { $cond: [{ $eq: ['$kind', 'bag'] }, 1, 0] } }
      } },
      { $project: { _id: 0, bucket: '$_id', mobileVisits: 1, desktopVisits: 1, bagVisitors: 1 } }
    ]),
    SecurityEventModel.aggregate<{ count: number }>([
      { $match: { ...dateMatch, type: { $in: ['email_login', 'google_login', 'sms_otp_login', 'whatsapp_otp_login'] } } },
      { $group: { _id: '$user' } },
      { $lookup: { from: UserModel.collection.name, localField: '_id', foreignField: '_id', as: 'account' } },
      { $match: { 'account.role': 'customer' } },
      { $count: 'count' }
    ])
  ]);

  const points = new Map(activity.map(row => [row.bucket, row]));
  const series: ActivityRow[] = [];
  const include = (bucket: string): void => {
    series.push(points.get(bucket) ?? { bucket, mobileVisits: 0, desktopVisits: 0, bagVisitors: 0 });
  };
  if (granularity === 'hour') {
    const lastHour = end < start ? -1 : Math.floor((end.getTime() - start.getTime()) / 3_600_000);
    for (let hour = 0; hour <= lastHour; hour += 1) include(String(hour).padStart(2, '0') + ':00');
  } else if (granularity === 'day') {
    for (let day = startDate; day <= endDate; day = addIstDays(day, 1)) include(day);
  } else {
    for (let month = startDate.slice(0, 7); month <= endDate.slice(0, 7);) {
      include(month);
      const [year, number] = month.split('-').map(Number);
      month = new Date(Date.UTC(year, number, 1)).toISOString().slice(0, 7);
    }
  }

  const totals = activity.reduce((sum, row) => ({
    mobileVisits: sum.mobileVisits + row.mobileVisits,
    desktopVisits: sum.desktopVisits + row.desktopVisits,
    bagVisitors: sum.bagVisitors + row.bagVisitors
  }), { mobileVisits: 0, desktopVisits: 0, bagVisitors: 0 });
  return { startDate, endDate, granularity, series, ...totals, visits: totals.mobileVisits + totals.desktopVisits, customersSignedIn: signedIn[0]?.count ?? 0 };
}
