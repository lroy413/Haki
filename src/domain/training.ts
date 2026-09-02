/**
 * Training.
 *
 * The downstream half of the cascade. Sleep was already declared as the
 * keystone that carries this — now there is something real on the other end
 * of that link.
 *
 * **This is the gym, and only the gym.** It used to carry a rolling
 * "Hardness" figure that the app displayed as the Armament measure — which
 * quietly redefined the lens for *everything you do on purpose* as a workout
 * tracker, and gave a figure with about two useful values to somebody who
 * trains once a day. Hardness moved to `domain/armament.ts`, where it reads
 * every act. What is left here is sessions, gaps and Returns: real, useful,
 * and one input among several rather than the whole of a lens.
 *
 * Two deliberate absences, and they are why the figure that replaced it is
 * shaped the way it is:
 *
 * No streak counter. A number that resets to nothing is what turns one missed
 * week into three.
 *
 * No target you can fail. The weekly target is a line to read against, never a
 * verdict. Nothing in here returns a pass or a fail.
 */

import { addDays, daysBetween, fromDayKey, toDayKey, todayKey, type DayKey } from './date';
import { parseDay } from './pressing';

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

export type TrainingStatus = {
  sessionsThisWeek: number;
  weeklyTarget: number;
  /** 0 when you trained today. Null when nothing has ever been logged. */
  daysSinceLast: number | null;
  lastSessionDay: DayKey | null;
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

/**
 * The Battleship Bag's week: how many days of it have landed a hit.
 *
 * Garp's "battleship bags" — the owner's own picture for this — are warships
 * he punches until their armoured hulls cave in, and the bag here is one hull
 * a week. **A day is one hit, however many sessions it held**: the owner
 * trains once a day, so two sessions on a Tuesday is a Tuesday, and counting
 * them twice would draw a hull twice as broken for the same day's work.
 *
 * Seven is the most a week can hold, which is also the reason the picture is
 * allowed at all — it cannot run away from you, and it starts again on
 * Monday. A fresh hull every week is what makes a caved-in one a record of a
 * week rather than a debt.
 */
export const MAX_HITS = 7;

export function hitsThisWeek(sessions: Session[], today: DayKey): number {
  const days = new Set(sessionsBetween(sessions, startOfWeek(today), today).map((s) => s.day));
  return Math.min(MAX_HITS, days.size);
}

/**
 * Read the day a session was logged for, when it was not today.
 *
 * `parseDay` reads a date the way somebody types one, but it rolls a bare
 * day *forward* — right for a deadline, wrong for a workout, where "30" typed
 * on the 2nd means the 30th just gone. So a bare day is the most recent one
 * with that number, and anything that lands in the future is refused: you
 * cannot have trained on a day that has not happened.
 */
export function pastDay(text: string, today: DayKey): DayKey | null {
  const raw = text.trim();
  if (raw.length === 0) return today;

  const bare = /^(\d{1,2})$/.exec(raw);
  if (bare) {
    const dom = Number(bare[1]);
    if (dom < 1 || dom > 31) return null;
    const now = fromDayKey(today);
    // This month if that day has come, otherwise last month.
    for (const back of [0, 1, 2]) {
      const d = new Date(now.getFullYear(), now.getMonth() - back, dom);
      if (d.getDate() !== dom) continue; // the 31st of a short month
      const key = toDayKey(d);
      if (key <= today) return key;
    }
    return null;
  }

  const read = parseDay(raw, today);
  if (read === null) return null;
  if (read > today) {
    // A named month that came out ahead is last year's, if that is close
    // enough to be what was meant; otherwise it is simply not a past day.
    const lastYear = addDays(read, -365);
    return daysBetween(lastYear, today) <= 60 ? lastYear : null;
  }
  return read;
}

export function lastSessionDay(sessions: Session[], onOrBefore: DayKey): DayKey | null {
  let latest: DayKey | null = null;
  for (const s of sessions) {
    if (s.day > onOrBefore) continue;
    if (latest === null || s.day > latest) latest = s.day;
  }
  return latest;
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
