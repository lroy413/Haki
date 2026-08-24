import { addDays, daysBetween, type DayKey } from './date';
import type { Acts } from './hardening';

/**
 * Setting Sail — the weekly ritual.
 *
 * Six days of logging produce a pile of facts and no decisions. This is the
 * seventh: once a week the app reads the week back, you look at every pillar
 * once, and you name where the next one points. It is the thing that turns the
 * Log Pose from a record into an instrument, and it is the one moment in the
 * app that deliberately asks for ten minutes instead of thirty seconds.
 *
 * Three movements, and the order matters:
 *
 *   **The week behind** — what the days actually had in them. Facts, counted,
 *   never graded. This is the only place the app totals anything, and it gets
 *   away with it because a week *is* a bounded thing: seven days is a real
 *   denominator, unlike a journey.
 *
 *   **The needles** — every Road Poneglyph looked at once, deliberately, which
 *   is the whole treatment for the failure mode the Log Pose exists to treat.
 *   Drift survives on never being looked at.
 *
 *   **The heading** — one line for the week ahead. The course, one size up.
 *
 * **Never congratulate a frictionless week.** The app's oldest rule, and this
 * screen is where it would be easiest to break: a full week is exactly when a
 * lesser app would throw confetti. Coasting is the thing to notice, so a week
 * where everything came easily gets a question rather than a trophy.
 */

/** How often the ritual comes round. */
export const SAIL_EVERY_DAYS = 7;

/** One week, read back. Counts of days, never of output. */
export type WeekReading = {
  from: DayKey;
  to: DayKey;
  /** Days in the window that had any act at all. */
  daysUsed: number;
  /** Days that had a sit in them. */
  daysSat: number;
  entries: number;
  struck: number;
  trained: number;
  gearMinutes: number;
  /** Days the Daily Read was taken. */
  reads: number;
  /** Islands closed this week, either way. */
  reached: number;
  passed: number;
};

export type WeekDay = { day: DayKey } & Acts;

const usedAny = (a: Acts): boolean =>
  a.course ||
  a.read ||
  a.entries > 0 ||
  a.struck > 0 ||
  a.trained > 0 ||
  a.gearMinutes > 0 ||
  a.satMinutes > 0;

/**
 * Read the seven days ending today.
 *
 * Days outside the window are ignored rather than clamped — a caller handing
 * over a month of history gets the week, which is what every screen wants.
 */
export function readWeek(
  days: WeekDay[],
  closed: { reached: number; passed: number },
  today: DayKey,
  window = SAIL_EVERY_DAYS,
): WeekReading {
  const from = addDays(today, -(window - 1));
  const inWindow = days.filter((d) => d.day >= from && d.day <= today);
  const seen = new Set<DayKey>();
  const sat = new Set<DayKey>();

  let entries = 0;
  let struck = 0;
  let trained = 0;
  let gearMinutes = 0;
  const reads = new Set<DayKey>();

  for (const d of inWindow) {
    if (usedAny(d)) seen.add(d.day);
    if (d.satMinutes > 0) sat.add(d.day);
    if (d.read) reads.add(d.day);
    entries += d.entries;
    struck += d.struck;
    trained += d.trained;
    gearMinutes += d.gearMinutes;
  }

  return {
    from,
    to: today,
    daysUsed: seen.size,
    daysSat: sat.size,
    entries,
    struck,
    trained,
    gearMinutes,
    reads: reads.size,
    ...closed,
  };
}

/** Has it been a week since the last one? Never sailed is always due. */
export function isDue(lastSail: DayKey | null, today: DayKey): boolean {
  if (lastSail === null) return true;
  return daysBetween(lastSail, today) >= SAIL_EVERY_DAYS;
}

/** Days since the last one, for the line that offers it. */
export function daysSince(lastSail: DayKey | null, today: DayKey): number | null {
  return lastSail === null ? null : daysBetween(lastSail, today);
}

/**
 * The one line that offers the ritual, wherever it is offered from.
 *
 * An offer, never a summons. A ritual that nags is one you start avoiding,
 * and this one has to survive being skipped for a month.
 */
export function offerLine(lastSail: DayKey | null, today: DayKey, plain = false): string {
  if (lastSail === null) {
    return plain
      ? 'Read the week back, look at every goal once, and name the next one.'
      : 'Read the week back, look at every needle once, and set the heading.';
  }
  const since = daysBetween(lastSail, today);
  if (since >= SAIL_EVERY_DAYS) {
    return since === SAIL_EVERY_DAYS
      ? 'A week since the last one.'
      : `${since} days since the last one.`;
  }
  const left = SAIL_EVERY_DAYS - since;
  return left === 1 ? 'Again tomorrow.' : `Again in ${left} days.`;
}

/**
 * What the week had in it, said in one sentence.
 *
 * Descriptive at every level. The top of the range gets a question rather than
 * praise: seven out of seven is the week most worth being suspicious of, and
 * the app's job there is to ask what it cost, not to hand out a ribbon.
 */
export function weekMessage(week: WeekReading): string {
  const { daysUsed } = week;
  if (daysUsed === 0) return 'A quiet week. It is one week, and weeks go like that.';
  if (daysUsed === SAIL_EVERY_DAYS) {
    return 'Every day had something in it. Was any of it hard, or was it a week that went easy?';
  }
  if (daysUsed >= 5) return `${daysUsed} of the seven days had something in them.`;
  if (daysUsed >= 2)
    return `${daysUsed} days had something in them. That is what the week was.`;
  return 'One day had something in it. That is a week too.';
}

/**
 * The prompt above the heading field.
 *
 * Asks for the week's one thing, and takes silence for an answer — the ritual
 * is worth doing for the looking alone, so nothing here is required.
 */
export function headingPrompt(plain = false): string {
  return plain ? 'What the week is for.' : 'One line. Where the week points.';
}

/** What the screen says once the week is set. */
export function sailedMessage(plain = false): string {
  return plain
    ? 'Set. See you next week.'
    : 'Under way. The heading holds until you change it.';
}
