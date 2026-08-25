/**
 * Astern in the log — what you wrote on this date, in an earlier year.
 *
 * The concept doc's oldest law is that memory is a source and never a stick,
 * and this is the feature that law was written for. It surfaces one entry,
 * above the Logbook, on the days an earlier year happens to have one.
 *
 * Everything about it is shaped by that law:
 *
 * - **Only years.** A month ago is recent enough to remember; the whole
 *   value of this is the distance. It also means the feature is invisible
 *   for the first year, which is correct — it is not a thing to fake with a
 *   shorter horizon so it has something to say today.
 * - **Silence is the ordinary case.** No entry for the date means no card,
 *   not an empty one. The app has nothing to say about a date you did not
 *   write on, in this year or any other.
 * - **It never counts.** Not how many anniversaries there have been, not how
 *   many years you have kept it up, not a streak of any kind. It hands back
 *   one thing you wrote and stops.
 */

import { daysBetween, type DayKey } from './date';

export type PastEntry = {
  id: number;
  day: DayKey;
  body: string;
};

export type Astern = {
  entry: PastEntry;
  /** Whole years between then and now — always at least one. */
  years: number;
};

/** The month and day of a key, ignoring the year. */
function monthDay(day: DayKey): string {
  return day.slice(5);
}

function yearOf(day: DayKey): number {
  return Number(day.slice(0, 4));
}

/**
 * The entry from this date in an earlier year, or nothing.
 *
 * The *most recent* qualifying year is chosen rather than the oldest: last
 * year is a comparison you can still feel, and five years ago is a different
 * person. If a year holds several entries for the date, the longest one is
 * taken — it is the one most likely to be worth re-reading.
 */
export function asternOn(entries: PastEntry[], today: DayKey): Astern | null {
  const md = monthDay(today);
  const thisYear = yearOf(today);

  const candidates = entries.filter(
    (e) => monthDay(e.day) === md && yearOf(e.day) < thisYear && e.body.trim().length > 0,
  );
  if (candidates.length === 0) return null;

  const newestYear = Math.max(...candidates.map((e) => yearOf(e.day)));
  const sameYear = candidates.filter((e) => yearOf(e.day) === newestYear);
  const entry = sameYear.reduce((a, b) =>
    b.body.trim().length > a.body.trim().length ? b : a,
  );

  return { entry, years: thisYear - newestYear };
}

/**
 * How long ago, said plainly.
 *
 * No exclamation, no "already", no "can you believe it" — the distance is
 * the whole content of the sentence and it does not need help.
 */
export function asternLine(years: number, plain = false): string {
  const when = years === 1 ? 'A year ago today' : `${years} years ago today`;
  return plain ? `${when}, you wrote:` : `${when}, you wrote:`;
}

/** Days between then and now, for the screen that wants the exact figure. */
export function daysSince(then: DayKey, today: DayKey): number {
  return daysBetween(then, today);
}
