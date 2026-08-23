import { addDays, type DayKey } from './date';

/**
 * 見聞色 — Observation. Knowing your own state.
 *
 * Two things feed it, and the relationship between them is the whole design:
 *
 *   **Stillness builds it.** Sitting is the training. It accumulates slowly,
 *   over days, and nothing else in the app moves it.
 *
 *   **Clarity lets you use it.** The owner's rule, and canon's: Observation
 *   only works in times of mental clarity. A clouded head does not sense less
 *   because it has practised less — it senses less because it is clouded.
 *
 * So this is deliberately *not* one number made of two inputs stirred
 * together. The practice and the condition are reported separately and the
 * state names which of them is doing the limiting, because those are two
 * completely different things to be told:
 *
 *   "You have not been sitting."          — do the practice
 *   "You have the practice. Today is loud." — the practice is fine; today isn't
 *
 * The second sentence is one this app should be able to say. Most apps can
 * only tell you that you missed something.
 *
 * **What it is for, eventually.** Observation is the lens the concept doc puts
 * Foresight behind — warnings fired before the slip, patterns surfaced from
 * history. None of that is built. Until it is, this is a readout: a gauge in
 * the same spirit as Will Reserve, which nothing asks you to raise.
 */

/** What one day had in it, for this lens only. */
export type ObservationDay = {
  day: DayKey;
  /** Minutes sat still. */
  satMinutes: number;
};

/** The trailing window the practice is read over. Matches the other lenses. */
export const WINDOW_DAYS = 28;

/**
 * The shortest sit that counts as having sat.
 *
 * Five minutes, matching the shortest depth on offer. Deliberately not
 * per-minute: fifteen minutes is the same act as five, held longer, and paying
 * by the minute would turn a practice into a race against yesterday.
 */
export const SAT_COUNTS_FROM = 5;

export type ObservationState = 'unread' | 'clouded' | 'open' | 'clear' | 'sharp';

export type Observation = {
  state: ObservationState;
  /** 0..1 — how much of the window has had sitting in it. The practice. */
  depth: number;
  /** Days sat inside the window. */
  satDays: number;
  /** 0..1 from today's clarity dial, or null with no Daily Read yet. */
  clarity: number | null;
};

/**
 * How much clarity dims what the practice built.
 *
 * Never to nothing. A bad day does not undo a month of sitting — it makes it
 * harder to reach, which is the honest version of the rule and the kind this
 * app is allowed to state.
 */
const FLOOR = 0.35;

/** Reach below which a clear head is only open, and at which it is sharp. */
const CLEAR_AT = 0.2;
const SHARP_AT = 0.5;

/** Clarity below this is a clouded day, whatever the practice. */
const CLOUDED_BELOW = 0.3;

/** Map the 1..5 clarity dial onto 0..1. Out of range is clamped, never trusted. */
function dial(value: number): number {
  return Math.min(1, Math.max(0, (value - 1) / 4));
}

export function satDays(days: ObservationDay[], today: DayKey, window = WINDOW_DAYS): number {
  const from = addDays(today, -(window - 1));
  const seen = new Set<DayKey>();
  for (const day of days) {
    if (day.day < from || day.day > today) continue;
    if (day.satMinutes >= SAT_COUNTS_FROM) seen.add(day.day);
  }
  return seen.size;
}

export function observation(
  days: ObservationDay[],
  todayClarity: number | null,
  today: DayKey,
  window = WINDOW_DAYS,
): Observation {
  const sat = satDays(days, today, window);
  const depth = sat / window;
  const clarity = todayClarity === null ? null : dial(todayClarity);

  return { state: stateFor(depth, clarity), depth, satDays: sat, clarity };
}

function reachFor(depth: number, clarity: number): number {
  return depth * (FLOOR + (1 - FLOOR) * clarity);
}

function stateFor(depth: number, clarity: number | null): ObservationState {
  // Without a Daily Read there is no clarity reading, and Observation is a
  // thing you cannot report on without one. Silence rather than a guess.
  if (clarity === null) return 'unread';
  if (clarity < CLOUDED_BELOW) return 'clouded';
  const reach = reachFor(depth, clarity);
  if (reach >= SHARP_AT) return 'sharp';
  if (reach >= CLEAR_AT) return 'clear';
  return 'open';
}

/**
 * How far the eyes are open, 0..1 — the gauge's whole input.
 *
 * The owner's design: a pair of eyes that open as the tool is used, and a
 * glint once they are fully open. So this is reach, normalised so that
 * **fully open and sharp are the same moment** — the glint appears exactly
 * when the lids finish, never before, because dividing by `SHARP_AT` makes 1.0
 * and the sharp threshold the same line.
 *
 * Unread is closed. No reading has been taken, and eyes that have not looked
 * are not open — the Daily Read is literally what opens them each morning.
 *
 * A clouded day is heavy-lidded. Reach alone would let a long practice hold
 * the eyes half open through the fog, and the rule is older than the gauge:
 * Observation only works in clarity. The lids come down; the practice is
 * still there underneath, which is exactly what the state message says.
 */
export function openness(o: Observation): number {
  if (o.clarity === null) return 0;
  const open = Math.min(1, reachFor(o.depth, o.clarity) / SHARP_AT);
  return o.state === 'clouded' ? Math.min(open, 0.35) : open;
}

/** Fully open, and the glint is lit. The gauge's name for sharp. */
export function futureSight(o: Observation): boolean {
  return o.state === 'sharp';
}

export function stateName(state: ObservationState): string {
  return {
    unread: 'Unread',
    clouded: 'Clouded',
    open: 'Open',
    clear: 'Clear',
    sharp: 'Sharp',
  }[state];
}

/**
 * The one line, and the only place either half is named as the limit.
 *
 * Never phrased as a shortfall. "Today is loud" is a description of a day, not
 * a note about a person — and on the days it is true it is usually the most
 * useful thing the app could say.
 */
export function stateMessage(o: Observation): string {
  switch (o.state) {
    case 'unread':
      return 'The Daily Read is what takes the reading. Thirty seconds.';
    case 'clouded':
      return o.satDays > 0
        ? 'The practice is there. Today is loud — that is a day, not a verdict.'
        : 'Today is loud. Five minutes of sitting is the whole of the practice.';
    case 'open':
      return o.satDays === 0
        ? 'Clear enough to read. Sitting is what gives it something to read with.'
        : `${o.satDays} of the last 28 days sat. It deepens with the practice.`;
    case 'clear':
      return `${o.satDays} of the last 28 days sat, and the head is clear for it.`;
    case 'sharp':
      return `${o.satDays} of the last 28 days sat. Clear, and it reaches.`;
  }
}
