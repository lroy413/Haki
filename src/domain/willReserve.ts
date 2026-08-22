/**
 * Will Reserve.
 *
 * A gauge, not a score. Nothing in the app should ever ask you to make this
 * number go up — it exists so you can read your own state, and so the app can
 * tell when you have been running on empty.
 *
 * v0 inputs are the Daily Read and recent sleep. Once habits and Gears land in
 * v1 a spend term joins the formula; the weights below are deliberately kept in
 * one place so that change is a one-line edit.
 */

export type DailyRead = {
  /** 1..5, higher is better */
  energy: number;
  /** 1..5, higher is better */
  mood: number;
  /** 1..5, higher is better */
  clarity: number;
  /** 1..5, higher means MORE tense — inverted before it reaches the score */
  tension: number;
};

export type ReserveState = 'unknown' | 'depleted' | 'low' | 'steady' | 'full';

export type Reserve = {
  /** 0..100, or null when there is no Daily Read yet today */
  value: number | null;
  state: ReserveState;
  readScore: number | null;
  sleepScore: number | null;
};

export type ReserveInputs = {
  read: DailyRead | null;
  /** Most recent night first. Up to three are used; fewer is fine. */
  recentSleepHours: number[];
  sleepTargetHours: number;
};

/** Weights within the Daily Read. Must sum to 1. */
const READ_WEIGHTS = { energy: 0.4, mood: 0.25, clarity: 0.2, tension: 0.15 };

/** How much the read and sleep each contribute when both are present. */
const READ_SHARE = 0.6;
const SLEEP_SHARE = 0.4;

/** Recent nights count for more. Trimmed and renormalised to however many exist. */
const NIGHT_WEIGHTS = [0.5, 0.3, 0.2];

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Map a 1..5 dial onto 0..1. Out-of-range input is clamped, never trusted. */
function dial(value: number): number {
  return clamp01((value - 1) / 4);
}

export function readScore(read: DailyRead): number {
  return clamp01(
    dial(read.energy) * READ_WEIGHTS.energy +
      dial(read.mood) * READ_WEIGHTS.mood +
      dial(read.clarity) * READ_WEIGHTS.clarity +
      (1 - dial(read.tension)) * READ_WEIGHTS.tension,
  );
}

/**
 * Sleep as a fraction of target, weighted toward recent nights.
 * Sleeping past target does not bank credit — it caps at 1.
 */
export function sleepScore(recentHours: number[], targetHours: number): number | null {
  const nights = recentHours.slice(0, NIGHT_WEIGHTS.length).filter((h) => Number.isFinite(h));
  if (nights.length === 0 || targetHours <= 0) return null;

  const weights = NIGHT_WEIGHTS.slice(0, nights.length);
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  const weighted = nights.reduce(
    (acc, hours, i) => acc + clamp01(hours / targetHours) * weights[i],
    0,
  );
  return clamp01(weighted / totalWeight);
}

function stateFor(value: number): ReserveState {
  if (value < 25) return 'depleted';
  if (value < 45) return 'low';
  if (value < 70) return 'steady';
  return 'full';
}

export function computeReserve(inputs: ReserveInputs): Reserve {
  const { read, recentSleepHours, sleepTargetHours } = inputs;
  const sleep = sleepScore(recentSleepHours, sleepTargetHours);

  // No read today means no reading. The app does not guess at your state, and
  // it does not show a stale number as though it were current.
  if (!read) {
    return { value: null, state: 'unknown', readScore: null, sleepScore: sleep };
  }

  const rs = readScore(read);

  // With no sleep data the read carries the whole weight rather than being
  // dragged down by a term we simply do not have.
  const combined = sleep === null ? rs : rs * READ_SHARE + sleep * SLEEP_SHARE;
  const value = Math.round(clamp01(combined) * 100);

  return { value, state: stateFor(value), readScore: rs, sleepScore: sleep };
}

/**
 * How strongly the app renders its own Haki: 0 is inert, 1 is full power.
 *
 * This is the mechanic where the interface runs out of Haki alongside you —
 * the lightning stops firing, the armour goes dull. It never disables
 * anything and it never scolds; it only stops performing.
 *
 * Before the first Daily Read it sits at a neutral middle, because an app that
 * looks dead on first launch reads as broken rather than as honest.
 */
export function effectIntensity(reserve: Reserve): number {
  if (reserve.value === null) return 0.6;
  return clamp01((reserve.value - 15) / 55);
}
