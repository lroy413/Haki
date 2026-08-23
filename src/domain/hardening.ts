import type { DayKey } from './date';
import { SITS } from './stillness';

/**
 * Hardening — how dark the app is, and why.
 *
 * Armament Haki is invisible until you use it. Nothing about it shows on an
 * unused arm; the black is what hardening looks like, not what it is. So the
 * app opens pale and goes dark as the day gets used, and the interface itself
 * becomes the readout: you can tell what kind of day it has been without a
 * number anywhere on screen.
 *
 * Four states rather than a smooth fade, for two reasons.
 *
 * The honest one is contrast. Sliding a light background continuously into a
 * dark one passes through a mid-grey where no ink colour is readable against
 * it — the text would have to flip somewhere regardless, so it may as well
 * flip somewhere chosen and tested.
 *
 * The better one is that a snap is the truer reading. Haki does not fade in.
 * It hardens, and the moment it hardens it is black. So the first act of any
 * day carries the whole flip, and everything after it is depth.
 *
 * **It is the day being used, not one lens's output.** Worth being precise
 * about, because the Armament metaphor made it easy to get wrong: sitting
 * still is 見聞色 and it darkens the app anyway, because a day with stillness
 * in it is a day that got used. The lenses are how acts are *attributed* —
 * `domain/armament.ts` reads the doing, `domain/observation.ts` reads the
 * sensing — and this reads the whole day regardless of which lens an act
 * belongs to. Withholding the palette from meditation would be a mental-health
 * app punishing somebody for meditating.
 *
 * Two rules this must never break:
 *
 * 1. **Pale is not a scolding.** A light screen at seven in the morning means
 *    *not yet hardened*, never "you have done nothing". Nothing in the app may
 *    show this as a score, a percentage, or an empty bar.
 * 2. **It never goes backwards inside a day.** Un-ticking a task by mistake
 *    must not visibly undo the morning, so what is recorded is the high-water
 *    mark, not the current tally.
 */

export type HardeningLevel = 0 | 1 | 2 | 3;

/** What the day has actually had in it. */
export type Acts = {
  /** A heading set for today. */
  course: boolean;
  /** The Daily Read, saved. */
  read: boolean;
  /** Journal entries written today. */
  entries: number;
  /** Tasks struck today. */
  struck: number;
  /** Training sessions logged today. */
  trained: number;
  /** Minutes spent in gear today. */
  gearMinutes: number;
  /** Minutes sat still today. */
  satMinutes: number;
};

export const NO_ACTS: Acts = {
  course: false,
  read: false,
  entries: 0,
  struck: 0,
  trained: 0,
  gearMinutes: 0,
  satMinutes: 0,
};

/**
 * What each act is worth.
 *
 * Weighted by how much of yourself it takes rather than how long it takes.
 * Training is the heaviest because it is the one this app was built around
 * missing; a struck task is the lightest because there can be many of them.
 */
const WEIGHT = {
  /** Cheap to do and worth doing, so: real, and small. */
  course: 1,
  read: 2,
  entry: 2,
  struck: 1,
  trained: 3,
  /** One per full Gear 2. */
  gearBlock: 1,
  gearBlockMinutes: 25,
  /**
   * Flat, and equal to a journal entry.
   *
   * Deliberately not per-minute. Fifteen minutes of sitting is not three times
   * the act that five minutes is — it is the same act, held longer, and paying
   * by the minute would turn a practice into a race against yesterday.
   */
  sat: 2,
} as const;

/**
 * The shortest sit on offer is what counts as having sat.
 *
 * Read from the shortest depth rather than written down again, so the two can
 * never drift apart.
 */
const SAT_COUNTS_FROM = SITS.presence.minutes;

/** Weight at which each level begins. Level 0 is "nothing yet today". */
export const THRESHOLDS: Record<Exclude<HardeningLevel, 0>, number> = {
  1: 1,
  2: 4,
  3: 8,
};

export function weightOf(acts: Acts): number {
  return (
    (acts.course ? WEIGHT.course : 0) +
    (acts.read ? WEIGHT.read : 0) +
    acts.entries * WEIGHT.entry +
    acts.struck * WEIGHT.struck +
    acts.trained * WEIGHT.trained +
    Math.floor(acts.gearMinutes / WEIGHT.gearBlockMinutes) * WEIGHT.gearBlock +
    (acts.satMinutes >= SAT_COUNTS_FROM ? WEIGHT.sat : 0)
  );
}

export function levelFor(acts: Acts): HardeningLevel {
  const weight = weightOf(acts);
  if (weight >= THRESHOLDS[3]) return 3;
  if (weight >= THRESHOLDS[2]) return 2;
  if (weight >= THRESHOLDS[1]) return 1;
  return 0;
}

/**
 * The level to actually show.
 *
 * `recorded` is the high-water mark for `day`. A level from an older day is
 * ignored rather than carried forward — the point of waking to a pale screen
 * is that the day has not been used yet, and inheriting yesterday's black
 * would throw that away.
 */
export function settleLevel(
  acts: Acts,
  today: DayKey,
  recorded: { day: DayKey; level: HardeningLevel } | null,
): HardeningLevel {
  const fresh = levelFor(acts);
  if (!recorded || recorded.day !== today) return fresh;
  return Math.max(fresh, recorded.level) as HardeningLevel;
}

/**
 * A name for the current state, for the one place that says it out loud.
 *
 * Deliberately not a score and deliberately not a target. "Unhardened" is a
 * description of an arm, not a verdict on a person.
 */
export function levelName(level: HardeningLevel): string {
  return (['Unhardened', 'Hardened', 'Set', 'Black'] as const)[level];
}
