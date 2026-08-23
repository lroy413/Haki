import type { HardeningLevel } from './hardening';

/**
 * The weather — lightning in the background, as the day hardens.
 *
 * Armament leaks. The further into a day you are, the more the app's own Haki
 * shows at the edges of it: nothing at all on an unhardened morning, then an
 * occasional flicker, then something closer to a storm. It is the same
 * information the palette carries, given a second voice.
 *
 * **Silent at level 0.** That is the rule the owner set — it starts once
 * hardened — and it is also the right one: an app that flickers before you
 * have done anything is performing at you.
 *
 * Two hard limits, and neither is negotiable:
 *
 * 1. **Never a strobe.** `MIN_GAP_MS` floors the interval well above anything
 *    that could read as flashing. Photosensitive-seizure guidance draws its
 *    line at three flashes in any one second; the busiest this ever gets is
 *    one flicker every several seconds, and each flicker is thin bolts at a
 *    fraction of full opacity rather than a full-screen white flash.
 * 2. **It only ever scales decoration.** Nothing is gated on it, nothing is
 *    measured by it, and plain mode, reduced motion and a low Will Reserve
 *    each turn it off entirely.
 */

export type Weather = {
  /** The floor of the wait between flickers. */
  everyMs: number;
  /** How much randomness sits on top, so it never becomes a metronome. */
  jitterMs: number;
  /** How strongly it shows, before Will Reserve scales it further. */
  opacity: number;
  /** Bolt weight. */
  width: number;
};

/**
 * The shortest gap any level may ask for.
 *
 * Far above the flashing threshold, and deliberately a constant rather than a
 * comment: a future level that wanted to be exciting has to argue with a test.
 */
export const MIN_GAP_MS = 6000;

/** Null at level 0 — an unhardened day has no weather in it. */
export function weatherFor(level: HardeningLevel): Weather | null {
  if (level === 0) return null;
  return {
    // Thinner than the impact frame's, because these are thrown across the
    // whole screen rather than around a fist: the same weight stretched that
    // far stops reading as lightning and starts reading as pipework.
    1: { everyMs: 26_000, jitterMs: 16_000, opacity: 0.13, width: 0.32 },
    2: { everyMs: 15_000, jitterMs: 10_000, opacity: 0.19, width: 0.46 },
    3: { everyMs: 8_000, jitterMs: 7_000, opacity: 0.26, width: 0.62 },
  }[level];
}

/**
 * How long to wait for the next one.
 *
 * Takes the roll rather than making it, so the pacing can be tested without
 * reaching into randomness — and so a broken roll can never produce a gap
 * shorter than the floor.
 */
export function nextGapMs(weather: Weather, roll: number): number {
  const clamped = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0;
  return Math.max(MIN_GAP_MS, weather.everyMs + clamped * weather.jitterMs);
}
