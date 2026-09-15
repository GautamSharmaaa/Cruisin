// Governed by .rules v1.0

export const SHIPROCKET_TIME_ZONE_OFFSET_MS = 330 * 60_000;

// Shiprocket's unzoned SQL/ISO timestamps are India local time, not the
// host's timezone. Keep explicit offsets intact and reject ambiguous formats.
export const parseShiprocketDate = (value: string | Date | undefined): Date | undefined => {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : undefined;
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/i.exec(value.trim());
  if (!match) return undefined;
  const [, year, month, day, hour = '00', minute = '00', second = '00', fraction = '', zone = '+05:30'] = match;
  const calendar = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}Z`);
  if (!Number.isFinite(calendar.getTime()) || calendar.getUTCFullYear() !== Number(year)
    || calendar.getUTCMonth() + 1 !== Number(month) || calendar.getUTCDate() !== Number(day)
    || calendar.getUTCHours() !== Number(hour) || calendar.getUTCMinutes() !== Number(minute)
    || calendar.getUTCSeconds() !== Number(second)) return undefined;
  const date = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}${fraction}${zone}`);
  return Number.isFinite(date.getTime()) ? date : undefined;
};
