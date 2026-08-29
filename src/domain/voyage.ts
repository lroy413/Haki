import { addDays, daysBetween, type DayKey } from './date';
import type { Acts } from './hardening';

/**
 * The Return, and the Calm Belt — the two failure modes the app records but
 * has never said anything about.
 *
 * Both read the same history and nothing else: the days that had something in
 * them. Neither needs a table, for the reason Ryuo does not — a day counts
 * when rows that already exist say it counted, and a second copy of that fact
 * is a second thing to keep true.
 *
 * ---
 *
 * ### The Return  (failure mode 3)
 *
 * > "A week off is a week off. The thing that decides whether it costs a week
 * > or a year is how fast you come back — and no habit app on earth tracks
 * > returning, because they're all built around never having left."
 *
 * The gym has had this since training shipped: log a session after a gap and
 * the app says so. What it has never had is the *record* — the concept doc's
 * "your comeback time becomes a tracked number that gets shorter" — and it has
 * never had it for anything but the gym, though the failure mode was never
 * about the gym.
 *
 * So this reads the whole app. A gap is days with nothing in them at all; the
 * day it ends is a Return, and it carries how long the gap was.
 *
 * Three rules, and the first is the one that keeps this from becoming the
 * thing it is treating:
 *
 * 1. **Nothing is ever said during a gap.** No count of days away, no "you
 *    have not opened this in a while", nothing waiting on the home screen to
 *    be found on the way back. A gap is silent, and the app's first word after
 *    one is about the return.
 * 2. **The number is attached to the return, never to the absence.** It is
 *    how long it took to come back — a figure that only exists because you
 *    did — and it appears once, on the day it happens, and afterwards only in
 *    a list of returns. Nothing totals the days away, and there is no
 *    "longest gap".
 * 3. **No trend is claimed.** The returns are listed with their times and the
 *    arc is left to the reader. Two returns is not a trend, and an app that
 *    said "your comebacks are getting quicker" off three points would be
 *    inventing exactly the kind of rule `foresight.ts` exists to refuse.
 *
 * ### The Calm Belt  (failure mode 2)
 *
 * > "Six days. No resistance logged, nothing hard attempted. Not a storm — a
 * > dead calm. This is the water you drift in."
 *
 * The voyage log records that the Calm Belt "became Ryuo". It did not: Ryuo
 * counts the days the top of the list got struck and scales a corona with it.
 * It is silent, and a dimmer glow is not a sentence. Failure mode 2's fix was
 * a sentence, and this is it.
 *
 * **It fires on ease, not on failure**, which is the whole reason it is
 * allowed to exist in an app with no shame mechanics in it. The run it counts
 * is days that *were used* and had nothing hard in them — so a bad week, a
 * gap, or a day you did not open the app all break it. It can only ever speak
 * to somebody whose week is going fine, which is precisely the week the
 * concept doc says is worth being suspicious of.
 */

export type ActDay = { day: DayKey } & Acts;

/** A gap of this many days or more makes coming back a Return. */
export const GAP_FOR_RETURN = 3;

/** Days of unbroken ease before the water gets named. The doc's own figure. */
export const CALM_DAYS = 6;

export type Return = {
  /** The day you came back. */
  day: DayKey;
  /** How many days the gap was. Never below `GAP_FOR_RETURN`. */
  after: number;
};

export type Voyage = {
  /** Returns in the window, most recent first. */
  returns: Return[];
  /** Set when today is itself the day of a return. */
  today: Return | null;
  /** Days of used-but-easy water ending today. */
  calmDays: number;
  /** True once that run is long enough to have a name. */
  becalmed: boolean;
};

/** Did the day have anything in it at all? */
export function used(a: Acts): boolean {
  return (
    a.course ||
    a.read ||
    a.entries > 0 ||
    a.struck > 0 ||
    a.trained > 0 ||
    a.gearMinutes > 0 ||
    a.satMinutes > 0
  );
}

/**
 * Was anything hard attempted?
 *
 * Two acts, and they are the two you cannot do by accident: a training session
 * and time in gear. Striking a task is one tap and writing a line is one line
 * — both are the day being used, which is what `used()` is for, and neither is
 * resistance. Kept as one predicate so the definition can be retuned in a
 * single place rather than argued with at three call sites.
 */
export function resisted(a: Acts): boolean {
  return a.trained > 0 || a.gearMinutes > 0;
}

/**
 * Read the record for both.
 *
 * `days` may arrive in any order and may contain days with nothing in them;
 * both are normal, because the query that feeds this zero-fills a range.
 */
export function voyage(
  days: ActDay[],
  today: DayKey,
  gapFor: number = GAP_FOR_RETURN,
  calmFor: number = CALM_DAYS,
): Voyage {
  const byDay = new Map<DayKey, ActDay>();
  for (const d of days) if (d.day <= today) byDay.set(d.day, d);

  const usedDays = [...byDay.values()]
    .filter((d) => used(d))
    .map((d) => d.day)
    .sort();

  // A gap is only a gap when both of its ends are inside the history we were
  // handed. The earliest used day has no predecessor here — it may be the
  // first day ever, or the window may simply start mid-voyage — and calling it
  // a return either way would be inventing one from missing data. Same
  // caution `cascade.ts` takes with an unlogged night.
  const returns: Return[] = [];
  for (let i = 1; i < usedDays.length; i += 1) {
    const gap = daysBetween(usedDays[i - 1], usedDays[i]);
    if (gap >= gapFor) returns.push({ day: usedDays[i], after: gap });
  }
  returns.reverse();

  // The calm run walks back from today over days that were used and easy. A
  // day with nothing in it is not calm water — it is a gap, and the Return is
  // the thing that has something to say about those.
  let calmDays = 0;
  for (let back = 0; ; back += 1) {
    const day = addDays(today, -back);
    const acts = byDay.get(day);
    if (!acts || !used(acts) || resisted(acts)) break;
    calmDays += 1;
  }

  return {
    returns,
    today: returns.find((r) => r.day === today) ?? null,
    calmDays,
    becalmed: calmDays >= calmFor,
  };
}

/**
 * What the app says on the day of a return.
 *
 * States the gap once and then leaves it alone. No praise for the absence, no
 * relief that you finally showed up — the return is the event, and it is the
 * half that is actually trainable. Longer gaps get a plainer sentence rather
 * than a graver one.
 */
export function returnLine(r: Return, plain = false): string {
  if (plain) return `Back after ${r.after} days.`;
  if (r.after < 7) return `Back after ${r.after} days. That is the return.`;
  if (r.after < 21)
    return `Back after ${r.after} days. The gap is the gap — coming back is the part that counts.`;
  return `Back after ${r.after} days. Long gaps are the ones that decide things, and this one just ended.`;
}

/**
 * The line under a list of returns.
 *
 * Says what the list is and stops. It deliberately does not compare them: the
 * arc is visible in the numbers and does not need the app to assert it.
 */
export function returnsNote(count: number, plain = false): string | null {
  if (count === 0) return null;
  if (plain) return count === 1 ? 'One return recorded.' : `${count} returns recorded.`;
  return count === 1
    ? 'One return. The days away are not counted anywhere.'
    : `${count} returns. The days away are not counted anywhere.`;
}

/**
 * The Calm Belt's one sentence.
 *
 * Describes the water, never the sailor. It asks rather than tells, because
 * the app genuinely does not know whether an easy week was a rest that was
 * needed or a drift that was not — and guessing would be the same overreach
 * `foresight.ts` refuses.
 */
export function calmLine(days: number, plain = false): string | null {
  if (days < CALM_DAYS) return null;
  if (plain) {
    return `${days} days used, and nothing hard in any of them. Worth a look.`;
  }
  return `${days} days used, and nothing hard attempted in any of them. Not a storm — a dead calm. Is this the rest, or the drift?`;
}
