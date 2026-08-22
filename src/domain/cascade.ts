/**
 * Keystone & Cascade.
 *
 * The reason v0 exists. A keystone habit slipping takes downstream habits with
 * it, and by the time the downstream habit has visibly failed the week is
 * already gone. The gym was never the lever — sleep was.
 *
 * This is Foresight's declared half. It needs no history and no correlation
 * engine, because the mechanism is already known and simply gets typed in.
 * The mined half — patterns nobody declared — waits for v3 and a year of data.
 */

import { addDays, todayKey, type DayKey } from './date';

/**
 * A night's sleep, keyed by **the morning you woke up**.
 *
 * So last night is recorded under today's key. Every consumer depends on this,
 * because the warning that matters fires the morning after a bad night.
 */
export type SleepNight = {
  day: DayKey;
  hours: number;
};

export type KeystoneConfig = {
  /** What a good night looks like. Feeds Will Reserve, not the cascade. */
  targetHours: number;
  /** Below this is a bad night. */
  thresholdHours: number;
  /** Consecutive bad nights before this escalates from watch to breach. */
  escalateAfterNights: number;
  /** What goes down when the keystone goes down, in your words. */
  downstreamNames: string[];
};

export type CascadeLevel = 'clear' | 'watch' | 'breach';

export type CascadeVerdict = {
  level: CascadeLevel;
  consecutiveBadNights: number;
  /** False when there is no sleep logged for the morning being assessed. */
  hasData: boolean;
  message: string | null;
};

export const DEFAULT_KEYSTONE: KeystoneConfig = {
  targetHours: 7.5,
  thresholdHours: 6,
  escalateAfterNights: 2,
  downstreamNames: ['Training'],
};

/**
 * Length of the unbroken run of bad nights ending at `from`.
 *
 * A missing day ends the run rather than being skipped over. Two bad nights
 * either side of an unlogged night are not a two-night run — we genuinely do
 * not know what happened in between, and inventing a streak across a gap would
 * fire the loudest warning in the app on made-up data.
 */
export function consecutiveBadNights(
  nights: SleepNight[],
  thresholdHours: number,
  from: DayKey,
): number {
  const byDay = new Map<DayKey, SleepNight>();
  for (const night of nights) byDay.set(night.day, night);

  let count = 0;
  let cursor = from;

  for (;;) {
    const night = byDay.get(cursor);
    if (!night) break;
    if (!Number.isFinite(night.hours)) break;
    if (night.hours >= thresholdHours) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }

  return count;
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many;
}

function hours(n: number): string {
  return Number.isInteger(n) ? `${n}h` : `${n}h`;
}

function describeDownstream(names: string[]): string {
  if (names.length === 0) return 'the rest of the week';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function cascadeMessage(
  level: CascadeLevel,
  badNights: number,
  config: KeystoneConfig,
): string | null {
  if (level === 'clear') return null;

  if (level === 'watch') {
    const remaining = config.escalateAfterNights - badNights;
    return (
      `One night under ${hours(config.thresholdHours)}. Not a problem yet — ` +
      `it becomes one ${remaining === 1 ? 'tomorrow' : `in ${remaining} nights`}.`
    );
  }

  return (
    `${badNights} ${plural(badNights, 'night', 'nights')} under ${hours(config.thresholdHours)}. ` +
    `This is the run that takes ${describeDownstream(config.downstreamNames)} with it. ` +
    `Today is the cheap day to stop it.`
  );
}

/**
 * Assess the keystone for a given morning. Defaults to this morning.
 */
export function assessCascade(
  nights: SleepNight[],
  config: KeystoneConfig = DEFAULT_KEYSTONE,
  from: DayKey = todayKey(),
): CascadeVerdict {
  const hasData = nights.some((n) => n.day === from && Number.isFinite(n.hours));

  if (!hasData) {
    return { level: 'clear', consecutiveBadNights: 0, hasData: false, message: null };
  }

  const badNights = consecutiveBadNights(nights, config.thresholdHours, from);

  const level: CascadeLevel =
    badNights === 0 ? 'clear' : badNights >= config.escalateAfterNights ? 'breach' : 'watch';

  return {
    level,
    consecutiveBadNights: badNights,
    hasData: true,
    message: cascadeMessage(level, badNights, config),
  };
}
