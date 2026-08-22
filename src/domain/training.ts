/**
 * Training.
 *
 * The downstream half of the cascade. Sleep was already declared as the
 * keystone that carries this — now there is something real on the other end
 * of that link.
 *
 * Two deliberate absences:
 *
 * No streak counter. Consistency is a rolling figure over a trailing window,
 * so it dips when you miss and climbs when you return. It cannot be zeroed,
 * because a number that resets to nothing is what turns one missed week into
 * three.
 *
 * No target you can fail. The weekly target is a line to read against, never a
 * verdict. Nothing in here returns a pass or a fail.
 */

import { addDays, daysBetween, fromDayKey, todayKey, type DayKey } from './date';

export type Session = {
  day: DayKey;
  /** Whatever you call it. "Push", "Legs", "Run", "Judo". */
  kind: string;
  minutes: number | null;
  /** 1..5. How hard it actually was, not how hard it was meant to be. */
  intensity: number | null;
  note: string | null;
};

export type TrainingConfig = {
  weeklyTarget: number;
  /** A gap of this many days or more makes coming back a Return. */
  gapDaysForReturn: number;
};

export const DEFAULT_TRAINING: TrainingConfig = {
  weeklyTarget: 4,
  gapDaysForReturn: 3,
};

/** Trailing window for the consistency figure. Four weeks. */
const CONSISTENCY_WINDOW_DAYS = 28;

export type TrainingStatus = {
  sessionsThisWeek: number;
  weeklyTarget: number;
  /** 0 when you trained today. Null when nothing has ever been logged. */
  daysSinceLast: number | null;
  lastSessionDay: DayKey | null;
  /** 0..100 over the trailing four weeks. Null before anything is logged. */
  consistency: number | null;
  /** True when a session logged now would land as a Return. */
  inGap: boolean;
};

/** Monday-start week — the way training weeks are actually counted. */
export function startOfWeek(day: DayKey): DayKey {
  const dow = fromDayKey(day).getDay(); // 0 = Sunday
  return addDays(day, dow === 0 ? -6 : 1 - dow);
}

function sessionsBetween(sessions: Session[], from: DayKey, to: DayKey): Session[] {
  return sessions.filter((s) => s.day >= from && s.day <= to);
}

export function sessionsThisWeek(sessions: Session[], today: DayKey): number {
  return sessionsBetween(sessions, startOfWeek(today), today).length;
}

export function lastSessionDay(sessions: Session[], onOrBefore: DayKey): DayKey | null {
  let latest: DayKey | null = null;
  for (const s of sessions) {
    if (s.day > onOrBefore) continue;
    if (latest === null || s.day > latest) latest = s.day;
  }
  return latest;
}

/**
 * Sessions logged over the trailing four weeks against what four weeks of the
 * target would be. Capped at 100 — training more than target does not bank
 * credit against a future gap.
 */
export function consistency(
  sessions: Session[],
  today: DayKey,
  weeklyTarget: number,
): number | null {
  if (weeklyTarget <= 0) return null;
  if (sessions.length === 0) return null;

  const since = addDays(today, -(CONSISTENCY_WINDOW_DAYS - 1));
  const actual = sessionsBetween(sessions, since, today).length;
  const expected = (weeklyTarget * CONSISTENCY_WINDOW_DAYS) / 7;

  return Math.min(100, Math.round((actual / expected) * 100));
}

export function trainingStatus(
  sessions: Session[],
  config: TrainingConfig = DEFAULT_TRAINING,
  today: DayKey = todayKey(),
): TrainingStatus {
  const last = lastSessionDay(sessions, today);
  const since = last === null ? null : daysBetween(last, today);

  return {
    sessionsThisWeek: sessionsThisWeek(sessions, today),
    weeklyTarget: config.weeklyTarget,
    daysSinceLast: since,
    lastSessionDay: last,
    consistency: consistency(sessions, today, config.weeklyTarget),
    inGap: since !== null && since >= config.gapDaysForReturn,
  };
}

/**
 * How long a gap a session on `day` would close.
 *
 * Zero means no gap worth naming. The very first session ever logged is not a
 * Return — there was nothing to return from.
 */
export function gapClosedBy(
  sessions: Session[],
  day: DayKey,
  config: TrainingConfig = DEFAULT_TRAINING,
): number {
  const previous = lastSessionDay(
    sessions.filter((s) => s.day < day),
    addDays(day, -1),
  );
  if (previous === null) return 0;

  const gap = daysBetween(previous, day);
  return gap >= config.gapDaysForReturn ? gap : 0;
}

/**
 * What the app says when you come back.
 *
 * The gap is stated plainly and then left alone. No praise for the absence, no
 * commentary on it, nothing that reads as relief that you finally showed up —
 * the return is the event, and it is the part that is actually trainable.
 */
export function returnMessage(gapDays: number): string | null {
  if (gapDays <= 0) return null;

  if (gapDays < 7) {
    return `Back after ${gapDays} days. Logged as a Return.`;
  }
  if (gapDays < 14) {
    return `Back after ${gapDays} days. The gap is the gap — the return is the part that counts.`;
  }
  return `Back after ${gapDays} days. Long gaps are the ones that decide things, and this one just ended.`;
}
