/**
 * The breath patterns — 呼吸.
 *
 * The sits are lengths of not doing anything; these are two minutes of doing
 * one thing. Same ring, different cadence. Three patterns, each with a job,
 * none with a score:
 *
 *   **The long exhale** settles. The one piece of breathing advice nobody
 *   argues with is that the out-breath is the half that calms you, so this is
 *   simply more of it — the ring's own idle cadence, followed on purpose.
 *
 *   **Box** steadies. Four beats a side. The pattern people are given before
 *   they walk into things they are afraid of.
 *
 *   **4-7-8** winds down. The long hold and the longer exhale are for the end
 *   of the day, not the middle of it.
 *
 * Three rules, inherited from the sits and held here too:
 *
 * 1. **Two minutes counts as two minutes.** A breath session writes the same
 *    row a sit does and its minutes land in the day the same way. It does
 *    *not* claim a day of sitting practice — `SAT_COUNTS_FROM` in
 *    `observation.ts` already draws that line at five minutes, and a settling
 *    breath is deliberately under it. The measure never inflates.
 * 2. **Ending early costs nothing**, same as everything else here.
 * 3. **Nothing is measured but time.** The ring is a pace to follow, never a
 *    thing that is checked.
 */

export type BreathKey = 'settle' | 'box' | 'winddown';

/** One cadence, in milliseconds. `holdOutMs` is the pause at the bottom. */
export type BreathPhases = {
  inMs: number;
  holdInMs: number;
  outMs: number;
  holdOutMs: number;
};

export type Breath = {
  key: BreathKey;
  /**
   * The counts, spelled out — '4 · 6', '4 · 4 · 4 · 4'. The sits put their
   * length in this slot; a pattern's honest equivalent is its cadence, which
   * also happens to be the whole instruction.
   */
  cadence: string;
  label: string;
  minutes: number;
  /** What this one is for. */
  blurb: string;
  phases: BreathPhases;
};

export const BREATHS: Record<BreathKey, Breath> = {
  settle: {
    key: 'settle',
    cadence: '4 · 6',
    label: 'The long exhale',
    minutes: 2,
    blurb: 'In for four, out for six. The half that settles you, done on purpose.',
    phases: { inMs: 4000, holdInMs: 1000, outMs: 6000, holdOutMs: 0 },
  },
  box: {
    key: 'box',
    cadence: '4 · 4 · 4 · 4',
    label: 'Box',
    minutes: 2,
    blurb: 'Four beats a side: in, hold, out, hold. For steadying, not for sleep.',
    phases: { inMs: 4000, holdInMs: 4000, outMs: 4000, holdOutMs: 4000 },
  },
  winddown: {
    key: 'winddown',
    cadence: '4 · 7 · 8',
    label: '4-7-8',
    minutes: 2,
    blurb: 'The long hold and the longer exhale. For the end of the day.',
    phases: { inMs: 4000, holdInMs: 7000, outMs: 8000, holdOutMs: 0 },
  },
};

export const BREATH_ORDER: BreathKey[] = ['settle', 'box', 'winddown'];

export function isBreathKey(value: string): value is BreathKey {
  return value in BREATHS;
}

/**
 * What the app says when a pattern runs its two minutes out.
 *
 * States what happened and stops, exactly as the sits do. Two minutes of
 * breathing is two minutes of breathing.
 */
export function breathCompletionMessage(key: BreathKey): string {
  if (key === 'box') return 'Two minutes, four beats a side.';
  if (key === 'winddown') return 'Two minutes. The day can end from here.';
  return 'Two minutes of long exhales.';
}
