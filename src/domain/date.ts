/**
 * Day keys are plain `YYYY-MM-DD` strings in the device's local timezone.
 *
 * Local, not UTC: a journal entry written at 11pm belongs to that day as the
 * person lived it. Storing UTC would silently move late-night entries — the
 * exact entries this app most wants to capture — onto the following day.
 *
 * A day does not have to end at midnight. Someone working production hours
 * finishes at three in the morning and that is still the same day to them —
 * rolling the app over underneath them would split one day's work across two
 * and reset the ground while they are still up. `dayStartHour` moves the
 * boundary: with it set to 4, anything before 4am belongs to the day before.
 *
 * Only "what day is it now" moves. Every row already written keeps the key it
 * was written with, so changing the setting never rewrites history.
 */

export type DayKey = string;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The hour the day rolls over, 0–23.
 *
 * Module-level because `todayKey()` is called from twenty places that have no
 * business knowing about settings, including default arguments in the repo.
 * The pure form is `dayKeyAt`, which takes the boundary explicitly and is what
 * the tests exercise.
 */
let dayStartHour = 0;

export function configureDayStart(hour: number): void {
  dayStartHour = clampHour(hour);
}

export function getDayStartHour(): number {
  return dayStartHour;
}

export function clampHour(hour: number): number {
  if (!Number.isFinite(hour)) return 0;
  return Math.min(23, Math.max(0, Math.trunc(hour)));
}

/**
 * The day a moment belongs to, given where the boundary sits.
 *
 * Pure, and the only place the rule lives.
 */
export function dayKeyAt(now: Date, startHour: number): DayKey {
  const shifted = new Date(now.getTime());
  if (now.getHours() < clampHour(startHour)) shifted.setDate(shifted.getDate() - 1);
  return toDayKey(shifted);
}

/** How the boundary reads in the one place the app says it out loud. */
export function describeDayStart(hour: number): string {
  const h = clampHour(hour);
  if (h === 0) return 'Midnight';
  const suffix = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return `${twelve}${suffix}`;
}

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
  return dayKeyAt(now, dayStartHour);
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
