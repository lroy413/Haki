import { addDays, type DayKey } from './date';

/**
 * 武装色 — Armament. What you actually did, on purpose.
 *
 * This used to be measured from training sessions alone, and that was wrong in
 * a way the owner caught immediately: the owner trains once a day at most, so a
 * figure built on workout *count* has about two useful values and spends most
 * of its life saying nothing. Worse, it quietly redefined Armament as "the
 * gym", when Armament is the lens for **everything you do on purpose** — the
 * concept doc's own word for it is _Act_.
 *
 * So it reads the whole of its own tool: a task struck counts exactly as a
 * session logged does. The owner's word for this tab is the productivity one —
 * to-do lists, a record of the workouts, the schedule, the day to day — and
 * everything done under it contributes. A workout is one input rather than the
 * whole measure.
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

/**
 * What one day had in it, **inside this tool only**.
 *
 * The scope is the owner's own correction, made twice and in both directions.
 * First the figure read workouts alone, and that was too narrow: the owner
 * trains once a day, so a session count had about two useful values.
 * Then a rewrite reached for every act in the app — the Daily Read, the
 * journal, the sits — and that was too wide: those belong to Observation, and
 * a lens that reads everything is not a lens.
 *
 * The rule that survives both: **whatever is done under this tool hardens this
 * Haki.** The Armament tab is the productivity tool — the to-do list, the
 * record of the workouts, the schedule — so its hardness reads exactly that.
 * Not just the workouts logged, and not the rest of the app either.
 *
 * Gears are deliberately absent. They were on this page once, and they are
 * leaving it: Haki is will and a Devil Fruit is ability, and the gears belong
 * to the ability page when it forms. Hardening still counts them toward the
 * day — a day with a gear in it got used — but this lens no longer does.
 */
export type ArmamentDay = {
  day: DayKey;
  /** Tasks struck. */
  struck: number;
  /** Training sessions logged. */
  sessions: number;
};

/** The trailing window. Matches Ryuo and the figure this replaced. */
export const WINDOW_DAYS = 28;

/**
 * Did this day have Armament in it at all?
 *
 * Either half of the tool is enough. One struck task carries a day exactly as
 * far as a workout does.
 */
export function hasArmament(day: ArmamentDay): boolean {
  return day.struck > 0 || day.sessions > 0;
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
 *
 * `todayIn` matters more than it looks: the owner struck five tasks and this
 * line still said "one thing today moves it" — an ask he had already
 * answered, which made the whole gauge read as dead. A day already banked has
 * to be acknowledged as banked, or acting looks indistinguishable from not
 * acting.
 */
export function hardnessMessage(value: number | null, days: number, todayIn = false): string {
  if (value === null)
    return 'Anything done in this tool lands here — a task struck, a session logged.';
  if (value >= 80) return `${days} of the last 28 days had something in them.`;
  if (todayIn) {
    return days === 1
      ? 'Today is in — the first of the 28. Each new day carries it further.'
      : `Today is in — ${days} of the last 28. Each new day carries it further.`;
  }
  if (value >= 30) return `${days} of the last 28. It climbs the day you come back.`;
  return `${days} of the last 28. One thing today moves it.`;
}
