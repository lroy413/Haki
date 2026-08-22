/**
 * Day keys are plain `YYYY-MM-DD` strings in the device's local timezone.
 *
 * Local, not UTC: a journal entry written at 11pm belongs to that day as the
 * person lived it. Storing UTC would silently move late-night entries — the
 * exact entries this app most wants to capture — onto the following day.
 */

export type DayKey = string;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function fromDayKey(day: DayKey): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: Date = new Date()): DayKey {
  return toDayKey(now);
}

export function addDays(day: DayKey, delta: number): DayKey {
  const d = fromDayKey(day);
  d.setDate(d.getDate() + delta);
  return toDayKey(d);
}

/** Whole days from `a` to `b`. Positive when `b` is later. DST-safe. */
export function daysBetween(a: DayKey, b: DayKey): number {
  const ms = fromDayKey(b).getTime() - fromDayKey(a).getTime();
  return Math.round(ms / DAY_MS);
}

/** Days at sea: day 1 is the day you set sail. */
export function daysAtSea(setSailDay: DayKey, now: DayKey): number {
  return daysBetween(setSailDay, now) + 1;
}
