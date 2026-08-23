import { addDays, type DayKey } from './date';

/**
 * 武装色 — Armament. What you actually did, on purpose.
 *
 * This used to be measured from training sessions alone, and that was wrong in
 * a way the owner caught immediately: he trains once a day at most, so a
 * figure built on workout *count* has about two useful values and spends most
 * of its life saying nothing. Worse, it quietly redefined Armament as "the
 * gym", when Armament is the lens for **everything you do on purpose** — the
 * concept doc's own word for it is _Act_.
 *
 * So it reads every act of doing: a task struck, a block of focus, a session
 * logged. A workout is one input among three rather than the whole measure.
 *
 * **Days, not output.** Hardness is the share of recent days that had *any*
 * Armament in them, never how much. Three tasks is not a better day than one,
 * and a system that said so would pay for busywork and punish a day that had
 * one hard thing in it. Depth within a day is what hardening measures; this is
 * the other axis, and it only ever asks whether you showed up.
 *
 * Two rules carried over from the training figure it replaces, and both are
 * the reason it is shaped this way:
 *
 * 1. **No streak.** It is a rolling share over a trailing window, so it dips
 *    when you miss and climbs when you come back. It cannot be zeroed, because
 *    a number that resets to nothing is what turns one missed week into three.
 * 2. **No target you can fail.** Nothing here returns a pass or a verdict.
 */

/** What one day had in it, for this lens only. */
export type ArmamentDay = {
  day: DayKey;
  /** Tasks struck. */
  struck: number;
  /** Minutes spent in gear. */
  gearMinutes: number;
  /** Training sessions logged. */
  sessions: number;
};

/** The trailing window. Matches Ryuo and the figure this replaced. */
export const WINDOW_DAYS = 28;

/**
 * Did this day have Armament in it at all?
 *
 * Any one of the three is enough, and a partial gear counts: minutes sat in
 * front of the work are the work, and rounding them away would make a day
 * spent starting look identical to a day spent avoiding.
 */
export function hasArmament(day: ArmamentDay): boolean {
  return day.struck > 0 || day.gearMinutes > 0 || day.sessions > 0;
}

/** How many days in the trailing window had any Armament in them. */
export function hardDays(days: ArmamentDay[], today: DayKey, window = WINDOW_DAYS): number {
  const from = addDays(today, -(window - 1));
  const seen = new Set<DayKey>();
  for (const day of days) {
    if (day.day < from || day.day > today) continue;
    if (hasArmament(day)) seen.add(day.day);
  }
  return seen.size;
}

/**
 * Hardness: the share of the trailing window that had something in it.
 *
 * Null before anything has ever been done — an empty history is not a zero,
 * and showing 0% to somebody on their first morning is the exact shape of
 * discouragement this app exists to avoid.
 */
export function hardness(
  days: ArmamentDay[],
  today: DayKey,
  window = WINDOW_DAYS,
): number | null {
  if (!days.some(hasArmament)) return null;
  return Math.round((hardDays(days, today, window) / window) * 100);
}

/**
 * What the app calls it, for the one place that says it out loud.
 *
 * Descriptions of a coating, never grades. There is no "poor" here and no
 * "excellent" either — the top of the scale is a statement about how the metal
 * looks, not about the person carrying it.
 */
export function hardnessName(value: number | null): string {
  if (value === null) return 'Not yet';
  if (value >= 80) return 'Set';
  if (value >= 55) return 'Holding';
  if (value >= 30) return 'Forming';
  return 'Bare';
}

/**
 * The one line under the figure.
 *
 * Says what the window has had in it and stops. Nothing here reads as a
 * verdict on a quiet month, because a quiet month is usually when somebody
 * most needs the app not to pile on.
 */
export function hardnessMessage(value: number | null, days: number): string {
  if (value === null) return 'Anything you do lands here — a task, a gear, a session.';
  if (value >= 80) return `${days} of the last 28 days had something in them.`;
  if (value >= 30) return `${days} of the last 28. It climbs the day you come back.`;
  return `${days} of the last 28. One thing today moves it.`;
}
