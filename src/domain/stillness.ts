import type { DayKey } from './date';
import { BREATHS, isBreathKey, type BreathKey } from './breath';

/**
 * Stillness — 見聞色, sat down.
 *
 * The Gears are Armament: twenty-five, ninety, a hundred and twenty minutes of
 * doing. This is the other lens. Observation is not something you push out; it
 * is what is left when you stop pushing, which is why the whole feature is
 * three lengths of sitting and nothing else.
 *
 * Named for what Observation gives you as it deepens, because those stages are
 * the honest shape of it: first you notice a room has someone in it, then you
 * notice what they mean, and at the far end of it — Katakuri's end — you see a
 * moment before it arrives. Nobody gets the third one from fifteen minutes.
 * They are names for depths, not claims about outcomes.
 *
 * Three rules, and they are deliberately not the Gears' rules:
 *
 * 1. **Sitting costs nothing.** No cooldown, no lockout, no daily maximum.
 *    Gear 4 ends the day's gears because two hours at maximum genuinely is a
 *    day's deep work and an app that sold you a fourth would be lying. There
 *    is no equivalent lie available here: nobody has ever been harmed by
 *    sitting quietly a second time.
 * 2. **Ending early costs nothing either, and the minutes still count.** Same
 *    as the Gears, for the same reason — a thing that punishes stopping
 *    teaches you not to start. Two minutes of sitting is two minutes that
 *    happened.
 * 3. **Nothing is measured but time.** No score for stillness, no streak, no
 *    read on how the sit went. The app has no way of knowing and no business
 *    guessing.
 */

export type SitDepth = 'presence' | 'intent' | 'ahead';

/**
 * Everything that can occupy the cushion: a sit, or a breath pattern from
 * `breath.ts`. They share the one session table and the one runtime — a
 * breath session is a sit with a cadence — so everything downstream of
 * `startSit` speaks this union.
 */
export type PracticeDepth = SitDepth | BreathKey;

export type Sit = {
  depth: SitDepth;
  /**
   * The plain minute count in kanji. 五分 十分 十五分 — two or three
   * characters each, which is what the Gears' 二速 三速 四速 established as
   * the width of a label in this app, and it has the advantage of being
   * simply true rather than decorative.
   */
  kanji: string;
  label: string;
  minutes: number;
  /** What that length is for. */
  blurb: string;
};

export const SITS: Record<SitDepth, Sit> = {
  presence: {
    depth: 'presence',
    kanji: '五分',
    label: 'Presence',
    minutes: 5,
    blurb: 'Long enough to notice the room you are actually in.',
  },
  intent: {
    depth: 'intent',
    kanji: '十分',
    label: 'Intent',
    minutes: 10,
    blurb: 'Long enough for the noise to settle and leave what you meant.',
  },
  ahead: {
    depth: 'ahead',
    kanji: '十五分',
    label: 'A moment ahead',
    minutes: 15,
    blurb: 'The long one. Katakuri sat for years to see one second.',
  },
};

export const SIT_ORDER: SitDepth[] = ['presence', 'intent', 'ahead'];

/**
 * The breath the ring is drawn to.
 *
 * A longer out-breath than in-breath, which is the one piece of breathing
 * advice that is uncontroversial — the exhale is the half that settles you.
 * It is a pace to follow if you want one, never a thing that is checked.
 */
export const BREATH = { inMs: 4000, holdMs: 1000, outMs: 6000 } as const;

export const BREATH_CYCLE_MS = BREATH.inMs + BREATH.holdMs + BREATH.outMs;

export type SitSession = {
  depth: PracticeDepth;
  day: DayKey;
  startedAt: number;
  /** Null while it is still running. */
  endedAt: number | null;
  /** True only if it sat the full length. */
  completed: boolean;
};

const MINUTE = 60_000;

export function durationMs(depth: PracticeDepth): number {
  return (isBreathKey(depth) ? BREATHS[depth] : SITS[depth]).minutes * MINUTE;
}

/** When a sit would end if left alone. */
export function endsAt(session: SitSession): number {
  return session.startedAt + durationMs(session.depth);
}

/** Milliseconds left, floored at zero. */
export function remainingMs(session: SitSession, now: number): number {
  return Math.max(0, endsAt(session) - now);
}

/**
 * Running until it is ended or its time is up.
 *
 * Derived from the clock, never from a counter — the phone goes face-down and
 * the screen locks, which is rather the point, and the answer has to still be
 * right when it comes back.
 */
export function isRunning(session: SitSession, now: number): boolean {
  return session.endedAt === null && now < endsAt(session);
}

/** Time is up but nothing has closed it yet. */
export function isRipe(session: SitSession, now: number): boolean {
  return session.endedAt === null && now >= endsAt(session);
}

export function runningSession(sessions: SitSession[], now: number): SitSession | null {
  return sessions.find((s) => isRunning(s, now)) ?? null;
}

/** Minutes actually sat today, counting a running sit so far. */
export function minutesToday(sessions: SitSession[], now: number): number {
  let total = 0;
  for (const session of sessions) {
    const finish = session.endedAt ?? Math.min(now, endsAt(session));
    total += Math.max(0, finish - session.startedAt);
  }
  return Math.round(total / MINUTE);
}

/**
 * What the app says when a sit runs out.
 *
 * States the length and stops. Sitting still for fifteen minutes is not an
 * accomplishment, it is fifteen minutes — and being congratulated for it is
 * exactly the thing that makes a practice feel like a performance.
 */
export function completionMessage(depth: SitDepth): string {
  if (depth === 'ahead') return 'Fifteen minutes. That is the long one.';
  if (depth === 'intent') return 'Ten minutes.';
  return 'Five minutes.';
}

/**
 * What the app says when a sit is ended early.
 *
 * Flat, and the minutes are kept. Getting up after two is a legitimate outcome
 * of sitting down, and the app has no opinion about it.
 */
export function abandonMessage(minutes: number): string {
  if (minutes <= 0) return 'Up again. Nothing owed.';
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} sat. Kept, and nothing owed.`;
}

/** The cue that closes a sit. A Den Den Mushi is as good a bell as any. */
export const SIT_BELL = 'dendenRing' as const;
