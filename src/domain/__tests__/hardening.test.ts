import { describe, expect, it } from 'vitest';
import {
  NO_ACTS,
  THRESHOLDS,
  levelFor,
  levelName,
  settleLevel,
  weightOf,
  type Acts,
  type HardeningLevel,
} from '../hardening';

const acts = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });

describe('weight', () => {
  it('is nothing on an untouched day', () => {
    expect(weightOf(NO_ACTS)).toBe(0);
  });

  it('counts gear in whole blocks, never in fractions', () => {
    // Nine minutes of a twenty-five minute sprint is not a third of one.
    expect(weightOf(acts({ gearMinutes: 9 }))).toBe(0);
    expect(weightOf(acts({ gearMinutes: 25 }))).toBe(1);
    expect(weightOf(acts({ gearMinutes: 49 }))).toBe(1);
    expect(weightOf(acts({ gearMinutes: 50 }))).toBe(2);
  });

  it('weighs training heaviest', () => {
    expect(weightOf(acts({ trained: 1 }))).toBeGreaterThan(weightOf(acts({ struck: 1 })));
    expect(weightOf(acts({ trained: 1 }))).toBeGreaterThan(weightOf(acts({ read: true })));
  });

  it('adds acts together', () => {
    expect(weightOf(acts({ read: true, struck: 2, trained: 1 }))).toBe(2 + 2 + 3);
  });

  it('pays for sitting flat, never by the minute', () => {
    // Fifteen minutes of sitting is the same act as five, held longer. Paying
    // per minute would turn a practice into a race against yesterday.
    expect(weightOf(acts({ satMinutes: 5 }))).toBe(weightOf(acts({ satMinutes: 15 })));
    expect(weightOf(acts({ satMinutes: 60 }))).toBe(weightOf(acts({ satMinutes: 5 })));
  });

  it('starts paying for a sit at the shortest one on offer', () => {
    expect(weightOf(acts({ satMinutes: 4 }))).toBe(0);
    expect(weightOf(acts({ satMinutes: 5 }))).toBeGreaterThan(0);
  });

  it('counts a heading, and counts it small', () => {
    expect(weightOf(acts({ course: true }))).toBe(1);
    expect(weightOf(acts({ course: true }))).toBeLessThan(weightOf(acts({ read: true })));
  });

  it('reaches the settled dark on the daily practice alone', () => {
    // Course, read, a sit, an entry and one struck task — no training, no
    // gears. A day made entirely of the small things is a full day, and the
    // palette has to agree or the card is telling a lie.
    const day = acts({ course: true, read: true, satMinutes: 5, entries: 1, struck: 1 });
    expect(levelFor(day)).toBe(3);
  });
});

describe('levelFor', () => {
  it('opens the day unhardened', () => {
    expect(levelFor(NO_ACTS)).toBe(0);
  });

  it('hardens on the very first act, whatever it is', () => {
    // The flip is the point. One thing done must not leave the app on paper.
    for (const one of [
      acts({ read: true }),
      acts({ struck: 1 }),
      acts({ entries: 1 }),
      acts({ trained: 1 }),
      acts({ gearMinutes: 25 }),
    ]) {
      expect(levelFor(one)).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not harden on a gear too short to count', () => {
    expect(levelFor(acts({ gearMinutes: 4 }))).toBe(0);
  });

  it('climbs with the day', () => {
    expect(levelFor(acts({ read: true }))).toBe(1);
    expect(levelFor(acts({ read: true, struck: 2 }))).toBe(2);
    expect(levelFor(acts({ read: true, trained: 1, gearMinutes: 90, struck: 2 }))).toBe(3);
  });

  it('tops out rather than overflowing', () => {
    expect(levelFor(acts({ read: true, entries: 9, struck: 40, trained: 4 }))).toBe(3);
  });

  it('matches its own thresholds', () => {
    for (const [level, weight] of Object.entries(THRESHOLDS)) {
      expect(levelFor(acts({ struck: weight }))).toBe(Number(level));
      if (weight > 0)
        expect(levelFor(acts({ struck: weight - 1 }))).toBeLessThan(Number(level));
    }
  });
});

describe('settleLevel', () => {
  const today = '2026-08-23';

  it('is just the fresh level with nothing recorded', () => {
    expect(settleLevel(acts({ read: true }), today, null)).toBe(1);
  });

  it('never goes backwards inside a day', () => {
    // Un-ticking a task by mistake must not visibly undo the morning.
    const recorded = { day: today, level: 2 as HardeningLevel };
    expect(settleLevel(NO_ACTS, today, recorded)).toBe(2);
    expect(settleLevel(acts({ read: true }), today, recorded)).toBe(2);
  });

  it('still rises above the mark', () => {
    const recorded = { day: today, level: 1 as HardeningLevel };
    expect(settleLevel(acts({ read: true, trained: 1, struck: 3 }), today, recorded)).toBe(3);
  });

  it('drops yesterday, so the morning starts on paper again', () => {
    // Inheriting last night's black is the one thing that would break the
    // whole idea: waking to an unused day has to look unused.
    const recorded = { day: '2026-08-22', level: 3 as HardeningLevel };
    expect(settleLevel(NO_ACTS, today, recorded)).toBe(0);
  });
});

describe('levelName', () => {
  it('names every level', () => {
    for (const level of [0, 1, 2, 3] as HardeningLevel[]) {
      expect(levelName(level).length).toBeGreaterThan(0);
    }
  });

  it('describes an arm, never a verdict on a person', () => {
    const names = ([0, 1, 2, 3] as HardeningLevel[]).map((l) => levelName(l).toLowerCase());
    for (const name of names) {
      for (const word in { empty: 1, none: 1, low: 1, poor: 1, incomplete: 1, behind: 1 }) {
        expect(name).not.toContain(word);
      }
    }
  });
});
