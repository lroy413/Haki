import { describe, expect, it } from 'vitest';
import {
  computeReserve,
  effectIntensity,
  readScore,
  sleepScore,
  type DailyRead,
} from '../willReserve';

const read = (energy: number, mood: number, clarity: number, tension: number): DailyRead => ({
  energy,
  mood,
  clarity,
  tension,
});

describe('readScore', () => {
  it('is 1 at the best possible reading', () => {
    // Tension is inverted, so its best value is the low end.
    expect(readScore(read(5, 5, 5, 1))).toBeCloseTo(1);
  });

  it('is 0 at the worst possible reading', () => {
    expect(readScore(read(1, 1, 1, 5))).toBeCloseTo(0);
  });

  it('sits mid-scale on a flat middling day', () => {
    expect(readScore(read(3, 3, 3, 3))).toBeCloseTo(0.5);
  });

  it('treats tension as a drain rather than a gain', () => {
    const calm = readScore(read(3, 3, 3, 1));
    const tense = readScore(read(3, 3, 3, 5));
    expect(calm).toBeGreaterThan(tense);
  });

  it('weights energy above the other dials', () => {
    const energyUp = readScore(read(5, 3, 3, 3));
    const moodUp = readScore(read(3, 5, 3, 3));
    expect(energyUp).toBeGreaterThan(moodUp);
  });

  it('clamps input outside the 1..5 dial range', () => {
    expect(readScore(read(99, 99, 99, -99))).toBeCloseTo(1);
    expect(readScore(read(-5, -5, -5, 99))).toBeCloseTo(0);
  });
});

describe('sleepScore', () => {
  it('is null with no nights recorded', () => {
    expect(sleepScore([], 7.5)).toBeNull();
  });

  it('is 1 when every night hits target', () => {
    expect(sleepScore([8, 8, 8], 7.5)).toBeCloseTo(1);
  });

  it('does not bank credit for oversleeping', () => {
    expect(sleepScore([14, 14, 14], 7.5)).toBeCloseTo(1);
  });

  it('weights last night more heavily than three nights ago', () => {
    const badLastNight = sleepScore([3, 8, 8], 8)!;
    const badThreeNightsAgo = sleepScore([8, 8, 3], 8)!;
    expect(badLastNight).toBeLessThan(badThreeNightsAgo);
  });

  it('renormalises when fewer than three nights exist', () => {
    // One perfect night on record should read as full, not as a third of full.
    expect(sleepScore([8], 8)).toBeCloseTo(1);
  });

  it('ignores nights beyond the most recent three', () => {
    expect(sleepScore([8, 8, 8, 0, 0, 0], 8)).toBeCloseTo(1);
  });

  it('is null for a nonsensical target', () => {
    expect(sleepScore([8], 0)).toBeNull();
  });
});

describe('computeReserve', () => {
  const target = 7.5;

  it('is unknown before the first Daily Read of the day', () => {
    const reserve = computeReserve({
      read: null,
      recentSleepHours: [8],
      sleepTargetHours: target,
    });
    expect(reserve.value).toBeNull();
    expect(reserve.state).toBe('unknown');
  });

  it('reports full on a good read after good sleep', () => {
    const reserve = computeReserve({
      read: read(5, 5, 5, 1),
      recentSleepHours: [8, 8, 8],
      sleepTargetHours: target,
    });
    expect(reserve.value).toBe(100);
    expect(reserve.state).toBe('full');
  });

  it('reports depleted on a bad read after bad sleep', () => {
    const reserve = computeReserve({
      read: read(1, 1, 1, 5),
      recentSleepHours: [3, 3, 3],
      sleepTargetHours: target,
    });
    expect(reserve.value).toBeLessThan(25);
    expect(reserve.state).toBe('depleted');
  });

  it('lets the read carry full weight when no sleep is on record', () => {
    const withoutSleep = computeReserve({
      read: read(5, 5, 5, 1),
      recentSleepHours: [],
      sleepTargetHours: target,
    });
    // A missing term must not silently drag the number down.
    expect(withoutSleep.value).toBe(100);
    expect(withoutSleep.sleepScore).toBeNull();
  });

  it('pulls the number down when sleep is poor despite a decent read', () => {
    const rested = computeReserve({
      read: read(4, 4, 4, 2),
      recentSleepHours: [8, 8, 8],
      sleepTargetHours: target,
    });
    const wrecked = computeReserve({
      read: read(4, 4, 4, 2),
      recentSleepHours: [3, 3, 3],
      sleepTargetHours: target,
    });
    expect(wrecked.value!).toBeLessThan(rested.value!);
  });

  it('always lands within 0..100', () => {
    for (const dials of [read(5, 5, 5, 1), read(1, 1, 1, 5), read(3, 3, 3, 3)]) {
      for (const sleep of [[], [0], [24, 24, 24], [7, 2, 9]]) {
        const { value } = computeReserve({
          read: dials,
          recentSleepHours: sleep,
          sleepTargetHours: target,
        });
        expect(value!).toBeGreaterThanOrEqual(0);
        expect(value!).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('effectIntensity', () => {
  const at = (value: number | null) =>
    effectIntensity({ value, state: 'steady', readScore: null, sleepScore: null });

  it('sits at a neutral middle before the first read, not at zero', () => {
    // An app that looks dead on first launch reads as broken, not as honest.
    expect(at(null)).toBeCloseTo(0.6);
  });

  it('runs at full power on a full reserve', () => {
    expect(at(100)).toBe(1);
  });

  it('goes inert when depleted', () => {
    expect(at(0)).toBe(0);
    expect(at(15)).toBe(0);
  });

  it('rises monotonically with the reserve', () => {
    const points = [20, 40, 60, 80, 100].map(at);
    for (let i = 1; i < points.length; i += 1) {
      expect(points[i]).toBeGreaterThanOrEqual(points[i - 1]);
    }
  });

  it('stays within 0..1', () => {
    for (const v of [-50, 0, 50, 100, 500]) {
      expect(at(v)).toBeGreaterThanOrEqual(0);
      expect(at(v)).toBeLessThanOrEqual(1);
    }
  });
});
