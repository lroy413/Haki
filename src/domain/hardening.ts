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

/* ========================================================================== *
 * The charge — what happens once the ground has run out of dark.
 * ========================================================================== */

/**
 * Past level 3 the palette had nowhere left to go.
 *
 * Eight weight points is a morning: the read, a heading, a sit and two struck
 * tasks. Everything after that landed on a screen that had already finished
 * responding — a day with fifteen things in it looked exactly like a day with
 * eight, which is the app quietly saying that the second half of your day did
 * not count. The owner's words: *"Haki gets stronger and harder the stronger
 * the will and drive. The more things I do should continue to harden the
 * app."*
 *
 * The ground cannot answer that, and the reason is the one at the top of this
 * file: four palettes exist because a continuous fade passes through a mid-grey
 * no ink is readable on. A fifth palette darker than `Black` would be black on
 * black. So the ramp continues somewhere else — **into the surfaces**. The
 * plates take the charge: their edges light, and the discharge that advanced
 * Armament throws starts to cling to them.
 *
 * Four rules, and they are the same four the rest of the ramp lives under:
 *
 * 1. **It is never a score, and it is continuous so it cannot become one.**
 *    The level has four states because contrast forced it; the charge has none
 *    because nothing forces it, and a value with no rungs has nothing to count.
 *    You cannot tell 0.6 from 0.7 by looking, which is the point — the same
 *    licence `lit()` operates under, one size up.
 * 2. **It saturates.** At `CHARGE_FULL` it stops, so there is nothing to be
 *    gained from a sixteenth task. Decoration that kept growing would be a
 *    score wearing a costume, and this app does not have one of those.
 * 3. **It never goes backwards inside a day**, exactly like the level —
 *    un-ticking a task by mistake must not visibly undo an afternoon.
 * 4. **Paper catches nothing and plain mode gets none of it.** The first falls
 *    out of the arithmetic: the charge cannot exist below level 3, so an
 *    unhardened screen is structurally incapable of shining. The second has to
 *    be passed in, because plain mode pins the level to the settled dark —
 *    which is precisely the value that would burn brightest.
 */

/** Where the ground stops answering and the surfaces take over. */
export const CHARGE_FROM = THRESHOLDS[3];

/**
 * Where the charge saturates.
 *
 * Ten points past black, which is about a full day again: the morning that got
 * you there, plus a training session, an hour in gear and half a dozen struck
 * tasks. Reachable on a good day and not on an ordinary one, which is the
 * right frequency for the loudest thing the interface does — and it has to be
 * genuinely reachable, or the top half of the ramp is dead and the app has
 * simply moved the point at which it stops answering.
 */
export const CHARGE_FULL = 18;

/**
 * How charged the day is, 0..1.
 *
 * Linear on purpose. Every curve with a knee in it makes some region of the
 * day worth more than another — an ease-out would spend most of the effect on
 * the first act past black and leave the rest of the afternoon doing nothing,
 * which is the complaint this was built to answer. Flat is the only shape
 * under which no act is worth more than any other, and that is the same
 * fairness Hardness holds one size up when it counts days that had *any*
 * rather than how much.
 */
export function chargeFor(weight: number): number {
  if (weight <= CHARGE_FROM) return 0;
  return Math.min(1, (weight - CHARGE_FROM) / (CHARGE_FULL - CHARGE_FROM));
}

export function chargeOf(acts: Acts): number {
  return chargeFor(weightOf(acts));
}

/**
 * The charge to actually show.
 *
 * Same high-water rule as `settleLevel`, and for the same reason — but read
 * off the recorded *weight* rather than a recorded charge, so the two can
 * never disagree about what the day held. A mark from an older day is ignored:
 * waking to an uncharged screen is the whole point of waking to a pale one.
 */
export function settleCharge(
  acts: Acts,
  today: DayKey,
  recorded: { day: DayKey; weight: number } | null,
): number {
  const weight = weightOf(acts);
  if (!recorded || recorded.day !== today) return chargeFor(weight);
  return chargeFor(Math.max(weight, recorded.weight));
}
