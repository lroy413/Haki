import { describe, expect, it } from 'vitest';
import {
  NO_SPEND,
  computeReserve,
  effectIntensity,
  readScore,
  sleepScore,
  spendNote,
  spendOf,
  type DailyRead,
} from '../willReserve';
import { NO_ACTS } from '../hardening';

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
    effectIntensity({
      value,
      state: 'steady',
      readScore: null,
      sleepScore: null,
      spend: NO_SPEND,
      started: value,
    });

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

describe('the spend term', () => {
  const target = 7.5;
  const good = {
    read: read(4, 4, 4, 2),
    recentSleepHours: [8, 8, 8],
    sleepTargetHours: target,
  };

  it('costs nothing for noticing — reading, writing and sitting are not output', () => {
    const spend = spendOf({ ...NO_ACTS, read: true, course: true, entries: 3, satMinutes: 15 });
    expect(spend.fraction).toBe(0);
    expect(spendNote(spend)).toBeNull();
  });

  it('cannot be farmed: no act ever raises the reading', () => {
    const base = computeReserve(good).value ?? 0;
    for (const acts of [
      { ...NO_ACTS, satMinutes: 60 },
      { ...NO_ACTS, entries: 10 },
      { ...NO_ACTS, gearMinutes: 90 },
      { ...NO_ACTS, trained: 2 },
      { ...NO_ACTS, struck: 12 },
    ]) {
      expect(computeReserve({ ...good, acts }).value ?? 0).toBeLessThanOrEqual(base);
    }
  });

  it('barely moves on an ordinary day', () => {
    const plain = computeReserve({ ...good, acts: { ...NO_ACTS, read: true, struck: 3 } });
    const none = computeReserve(good);
    expect((none.value ?? 0) - (plain.value ?? 0)).toBeLessThanOrEqual(3);
  });

  it('reads as visibly spent after a maximal day, and never as empty', () => {
    const big = computeReserve({
      ...good,
      acts: { ...NO_ACTS, gearMinutes: 120, trained: 1, struck: 6 },
    });
    const none = computeReserve(good);
    expect((none.value ?? 0) - (big.value ?? 0)).toBeGreaterThan(15);
    // The day cannot take more out of the tank than the morning put in it.
    expect(big.value ?? 0).toBeGreaterThan(0);
  });

  it('caps the tail on struck tasks, so clearing twenty small things is not deep work', () => {
    const many = spendOf({ ...NO_ACTS, struck: 40 });
    const gear = spendOf({ ...NO_ACTS, gearMinutes: 240 });
    expect(many.fraction).toBeLessThan(gear.fraction / 2);
  });

  it('keeps what the morning started with, beside what is left', () => {
    const r = computeReserve({ ...good, acts: { ...NO_ACTS, gearMinutes: 120 } });
    expect(r.started).toBeGreaterThan(r.value ?? 0);
  });

  it('recovers: the same acts on a rested morning read higher than on a wrecked one', () => {
    const acts = { ...NO_ACTS, gearMinutes: 90 };
    const rested = computeReserve({ ...good, acts });
    const wrecked = computeReserve({
      read: read(2, 2, 2, 4),
      recentSleepHours: [4, 5, 4],
      sleepTargetHours: target,
      acts,
    });
    expect(rested.value ?? 0).toBeGreaterThan(wrecked.value ?? 0);
  });

  it('stays unknown without a read, however much the day spent', () => {
    const r = computeReserve({
      read: null,
      recentSleepHours: [8],
      sleepTargetHours: target,
      acts: { ...NO_ACTS, gearMinutes: 120 },
    });
    expect(r.value).toBeNull();
    expect(r.state).toBe('unknown');
    // The spend is still reported — it happened, whether or not it was read.
    expect(r.spend.gearMinutes).toBe(120);
  });
});

describe('what the spend line says', () => {
  it('names the acts and stops', () => {
    const line =
      spendNote(spendOf({ ...NO_ACTS, gearMinutes: 120, trained: 1, struck: 4 })) ?? '';
    expect(line).toContain('2h in gear');
    expect(line).toContain('1 session');
    expect(line).toContain('4 struck');
  });

  it('reads under an hour in minutes', () => {
    expect(spendNote(spendOf({ ...NO_ACTS, gearMinutes: 25 })) ?? '').toContain('25m in gear');
  });

  it('never treats spending as a mistake, and never advises', () => {
    const copy = [
      spendNote(spendOf({ ...NO_ACTS, gearMinutes: 240, trained: 2, struck: 9 })) ?? '',
      spendNote(spendOf({ ...NO_ACTS, struck: 2 })) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    for (const word of [
      'should',
      'too much',
      'rest',
      'careful',
      'slow down',
      'overdid',
      'failed',
      'lazy',
    ]) {
      expect(copy).not.toContain(word);
    }
    expect(copy).not.toContain('?');
  });

  it('swaps its vocabulary in plain mode', () => {
    const line = spendNote(spendOf({ ...NO_ACTS, struck: 3, trained: 2 }), true) ?? '';
    expect(line).not.toContain('struck');
    expect(line).toContain('done');
    expect(line).toContain('workouts');
  });
});
