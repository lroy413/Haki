import { describe, expect, it } from 'vitest';
import { foresight, type DayRecord } from '../foresight';
import { addDays, type DayKey } from '../date';

/**
 * The property that decides whether this feature should exist at all.
 *
 * Foresight asks two dozen questions of the same history. If pure noise
 * produces confident sentences at any real rate, the app is inventing rules
 * about somebody's mind and handing them over with the authority of
 * arithmetic — which is worse than saying nothing, and worse in a
 * mental-health app than almost anywhere else.
 *
 * So this runs the engine over hundreds of simulated lives in which nothing
 * whatsoever is related to anything, and asserts it keeps its mouth shut
 * nearly all of the time. It is a slow, blunt, unglamorous test and it is the
 * most important one in the file.
 */

/** Deterministic, so a red run is reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

const START = '2026-01-01' as DayKey;

/** A life in which no act has any bearing on any dial. */
function noiseDays(rand: () => number, n: number): DayRecord[] {
  const dial = () => 1 + Math.floor(rand() * 5);
  return Array.from({ length: n }, (_, i) => ({
    day: addDays(START, i),
    read: { energy: dial(), mood: dial(), clarity: dial(), tension: dial() },
    sleepHours: 4 + rand() * 6,
    sat: rand() < 0.5,
    trained: rand() < 0.4,
    struck: rand() < 0.6 ? 2 : 0,
    gearMinutes: rand() < 0.4 ? 30 : 0,
    wrote: rand() < 0.5,
  }));
}

describe('noise', () => {
  it('stays quiet on lives where nothing is related to anything', () => {
    const RUNS = 300;
    // Measured, so the number lives in the file rather than only in a passing
    // run: the first version of this engine spoke on 254 of these 300 lives.
    // With the Welch gate at MIN_T it speaks on 1.
    let spoke = 0;
    for (let run = 0; run < RUNS; run += 1) {
      const reading = foresight(noiseDays(seeded(run * 7919 + 13), 90), 7.5);
      if (reading.state === 'reading') spoke += 1;
    }
    const rate = spoke / RUNS;
    // Tuned to miss real things rather than invent them. This is the number
    // that justifies the effect and median gates; if a change pushes it up,
    // the change is wrong, not the test.
    expect(rate, `spoke on ${spoke}/${RUNS} noise runs`).toBeLessThan(0.05);
  });

  it('still finds a planted signal in an otherwise noisy life', () => {
    // The other half of the bargain: gates conservative enough to be quiet on
    // noise must not be so conservative that nothing real ever survives them.
    const rand = seeded(4242);
    const days = noiseDays(rand, 90).map((d) => ({
      ...d,
      // A night at or above target lifts the next morning by about a point
      // and a half, on top of all the noise already there.
      read: d.read && {
        ...d.read,
        energy: Math.min(5, d.read.energy + (d.sleepHours! >= 7.5 ? 1.5 : 0)),
      },
    }));
    const reading = foresight(days, 7.5);
    expect(reading.state).toBe('reading');
    if (reading.state !== 'reading') return;
    expect(reading.findings.some((f) => f.source === 'sleep' && f.dial === 'energy')).toBe(
      true,
    );
  });
});
