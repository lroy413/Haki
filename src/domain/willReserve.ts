import type { Acts } from './hardening';

/**
 * Will Reserve — a level, a burn rate, and a recovery curve.
 *
 * A gauge, not a score. Nothing in the app should ever ask you to make this
 * number go up — it exists so you can read your own state, and so the app can
 * tell when you have been running on empty.
 *
 * The concept document calls this the one idea worth stealing: every other
 * app models willpower as unlimited and treats you as lazy when it is not.
 * For a long time only half of it was here. The read and last night's sleep
 * say how full the tank started; **what the day took out of it was never
 * counted**, so the gauge described a mood rather than a resource, and the
 * file's own header promised a spend term that never arrived.
 *
 * So there are three parts now, and they map onto the sentence the idea was
 * always for:
 *
 *   **The level** — the Daily Read and recent sleep. What you woke up with.
 *   **The burn** — what the day's acts have cost. Subtracted, not averaged
 *   in, because spend is a different kind of thing from the inputs: it is
 *   what has gone, not what was there.
 *   **The recovery** — sleep, already weighted toward recent nights, which
 *   is why a spent day reads full again after a good one and does not
 *   compound.
 *
 * Two rules keep this from becoming the thing it is describing:
 *
 * 1. **Nothing here may be farmed.** Sitting still costs nothing and returns
 *    nothing; a practice that raised the number would be a practice with a
 *    score attached. Only real output spends, and no act ever adds.
 * 2. **A spent evening is not a bad day.** The number falling because you
 *    worked is the gauge doing its job, and the line beside it says what took
 *    it — "you are at 40 and you have spent two hours in gear" is the whole
 *    point of having the thing. Nothing in the copy treats spending as a
 *    mistake.
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
  /** What the day has taken out, and what took it. */
  spend: Spend;
  /** What the reading would have been before the day spent any of it. */
  started: number | null;
};

export type ReserveInputs = {
  read: DailyRead | null;
  /** Most recent night first. Up to three are used; fewer is fine. */
  recentSleepHours: number[];
  sleepTargetHours: number;
  /** What today has had in it. Omitted is a day that has spent nothing. */
  acts?: Acts;
};

/**
 * What a day's worth of will buys, in the units below.
 *
 * Four hours of gear is a maximal day of deep work, so it is the whole tank
 * on its own. A training session costs about the same as fifty minutes of it,
 * which matches how the two actually feel. Struck tasks cost a little each and
 * are capped — a day of clearing twenty small things is a real day, but it is
 * not four hours of gear, and without the cap it would arithmetically become
 * one.
 */
const GEAR_MINUTES_FOR_A_DAY = 240;
const PER_SESSION = 0.18;
const PER_STRUCK = 0.02;
const STRUCK_CAP = 0.16;

/**
 * The most spend can take off the reading, as a fraction of the whole scale.
 *
 * Capped deliberately. A maximal day should read as visibly spent and never
 * as empty — the tank is what you woke with, and the day cannot take more out
 * of it than was in it. Twenty-eight points off a maximal day, nothing you
 * would notice off an ordinary one.
 */
const SPEND_MAX = 0.35;

/** What the day has taken out, and what took it. */
export type Spend = {
  /** 0..1 — how much of a day's capacity has gone into acts. */
  fraction: number;
  gearMinutes: number;
  sessions: number;
  struck: number;
};

export const NO_SPEND: Spend = { fraction: 0, gearMinutes: 0, sessions: 0, struck: 0 };

/**
 * What the day's acts have cost.
 *
 * Reading, writing and sitting are conspicuously absent. Noticing your own
 * state is not an expenditure of will, and stillness is the one act in the
 * app that is explicitly the opposite of pushing — `stillness.ts` measures
 * nothing but time for the same reason. They still darken the app, because
 * hardening reads the day being used; they simply do not empty the tank.
 */
export function spendOf(acts: Acts): Spend {
  const gearMinutes = Math.max(0, acts.gearMinutes);
  const sessions = Math.max(0, acts.trained);
  const struck = Math.max(0, acts.struck);

  const fraction = clamp01(
    gearMinutes / GEAR_MINUTES_FOR_A_DAY +
      sessions * PER_SESSION +
      Math.min(STRUCK_CAP, struck * PER_STRUCK),
  );

  return { fraction, gearMinutes, sessions, struck };
}

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
  const { read, recentSleepHours, sleepTargetHours, acts } = inputs;
  const sleep = sleepScore(recentSleepHours, sleepTargetHours);
  const spend = acts ? spendOf(acts) : NO_SPEND;

  // No read today means no reading. The app does not guess at your state, and
  // it does not show a stale number as though it were current. A day with
  // spend in it and no read is still unknown — what was spent is only half of
  // the question, and the app will not answer the other half for you.
  if (!read) {
    return {
      value: null,
      state: 'unknown',
      readScore: null,
      sleepScore: sleep,
      spend,
      started: null,
    };
  }

  const rs = readScore(read);

  // With no sleep data the read carries the whole weight rather than being
  // dragged down by a term we simply do not have.
  const combined = sleep === null ? rs : rs * READ_SHARE + sleep * SLEEP_SHARE;
  const started = Math.round(clamp01(combined) * 100);

  // Spend comes off the top rather than being averaged in: it is what has
  // gone, not another opinion about what was there.
  const value = Math.round(clamp01(combined - SPEND_MAX * spend.fraction) * 100);

  return { value, state: stateFor(value), readScore: rs, sleepScore: sleep, spend, started };
}

/**
 * What took it, said plainly, or null on a day that has spent nothing.
 *
 * This is the sentence the whole idea was for. A number that fell without
 * saying why is worse than no number: the point is not that you are at forty,
 * it is that you are at forty *and you have spent two hours in gear*, which
 * is a different thing from being at forty on a Tuesday morning having done
 * nothing. Descriptive only — it names the acts and stops, and there is no
 * version of this that says what to do about them.
 */
export function spendNote(spend: Spend, plain = false): string | null {
  if (spend.fraction <= 0) return null;

  const parts: string[] = [];
  if (spend.gearMinutes >= 60) {
    const hours = Math.round((spend.gearMinutes / 60) * 10) / 10;
    parts.push(`${hours === Math.floor(hours) ? hours : hours.toFixed(1)}h in gear`);
  } else if (spend.gearMinutes > 0) {
    parts.push(`${spend.gearMinutes}m in gear`);
  }
  if (spend.sessions > 0) {
    parts.push(
      spend.sessions === 1
        ? '1 session'
        : `${spend.sessions} ${plain ? 'workouts' : 'sessions'}`,
    );
  }
  if (spend.struck > 0) {
    parts.push(`${spend.struck} ${plain ? 'done' : 'struck'}`);
  }
  if (parts.length === 0) return null;

  const list =
    parts.length === 1
      ? parts[0]
      : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  return plain ? `Spent today: ${list}.` : `${list} today.`;
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
