import { describe, expect, it } from 'vitest';
import {
  WINDOW_DAYS,
  hardDays,
  hardness,
  hardnessMessage,
  hardnessName,
  hasArmament,
  type ArmamentDay,
} from '../armament';
import { addDays, type DayKey } from '../date';

const TODAY = '2026-08-23' as DayKey;
const day = (d: DayKey, over: Partial<ArmamentDay> = {}): ArmamentDay => ({
  day: d,
  struck: 0,
  sessions: 0,
  ...over,
});

/** `n` consecutive days ending today, each with one struck task. */
const run = (n: number, over: Partial<ArmamentDay> = { struck: 1 }) =>
  Array.from({ length: n }, (_, i) => day(addDays(TODAY, -i), over));

describe('hasArmament', () => {
  it('counts both halves of the tool, not just the gym', () => {
    // The owner's correction: training was the only input, and it should be
    // everything done under this tool. One workout a day cannot carry a
    // measure on its own; a struck task carries a day exactly as far.
    expect(hasArmament(day(TODAY, { struck: 1 }))).toBe(true);
    expect(hasArmament(day(TODAY, { sessions: 1 }))).toBe(true);
  });

  it('is false for a day with nothing in it', () => {
    expect(hasArmament(day(TODAY))).toBe(false);
  });

  it('reads only this tool', () => {
    // The correction ran the other way once too: a rewrite reached for every
    // act in the app, and that was wrong in the opposite direction — the Daily
    // Read and the sits are Observation's, and a lens that reads everything is
    // not a lens. The type itself is the guarantee now: an ArmamentDay cannot
    // even carry a sit or a read, so this test is here to say the boundary is
    // load-bearing, not to exercise it.
    const keys = Object.keys(day(TODAY)).sort();
    expect(keys).toEqual(['day', 'sessions', 'struck']);
  });
});

describe('hardDays', () => {
  it('counts days, never output', () => {
    // Three tasks is not a better day than one. This is the axis that only
    // asks whether you showed up; depth within a day is hardening's job.
    const one = [day(TODAY, { struck: 1 })];
    const many = [day(TODAY, { struck: 9, sessions: 2 })];
    expect(hardDays(one, TODAY)).toBe(hardDays(many, TODAY));
  });

  it('never counts the same day twice', () => {
    const twice = [day(TODAY, { struck: 1 }), day(TODAY, { sessions: 1 })];
    expect(hardDays(twice, TODAY)).toBe(1);
  });

  it('ignores days outside the window', () => {
    const old = [day(addDays(TODAY, -WINDOW_DAYS), { struck: 1 })];
    expect(hardDays(old, TODAY)).toBe(0);
    expect(hardDays([day(addDays(TODAY, -(WINDOW_DAYS - 1)), { struck: 1 })], TODAY)).toBe(1);
  });

  it('ignores days in the future', () => {
    expect(hardDays([day(addDays(TODAY, 1), { struck: 1 })], TODAY)).toBe(0);
  });
});

describe('hardness', () => {
  it('is null before anything has ever been done', () => {
    // An empty history is not a zero. Showing 0% on the first morning is the
    // exact shape of discouragement this app exists to avoid.
    expect(hardness([], TODAY)).toBeNull();
    expect(hardness([day(TODAY)], TODAY)).toBeNull();
  });

  it('is the share of the window that had something in it', () => {
    expect(hardness(run(28), TODAY)).toBe(100);
    expect(hardness(run(14), TODAY)).toBe(50);
    expect(hardness(run(7), TODAY)).toBe(25);
  });

  it('does not reward doing more on one day', () => {
    const light = run(10, { struck: 1 });
    const heavy = run(10, { struck: 8, sessions: 3 });
    expect(hardness(light, TODAY)).toBe(hardness(heavy, TODAY));
  });

  it('is not capped by how often anyone trains', () => {
    // One workout a day was the ceiling of the old figure. Striking tasks has
    // to be able to carry it on its own.
    const noGym = run(28, { struck: 2 });
    expect(hardness(noGym, TODAY)).toBe(100);
  });

  it('dips on a miss and cannot be zeroed by one', () => {
    const full = hardness(run(28), TODAY)!;
    const missedYesterday = run(28).filter((d) => d.day !== addDays(TODAY, -1));
    const after = hardness(missedYesterday, TODAY)!;
    expect(after).toBeLessThan(full);
    expect(after).toBeGreaterThan(80);
  });
});

describe('the week this app was built for', () => {
  it('keeps three good weeks on the board after a lost one', () => {
    // The founding scenario: sleep collapsed, the week went. A figure that
    // zeroed here is what turns one missed week into three — and this is the
    // property that used to live on the training consistency figure, now
    // measured over every act rather than over workouts.
    const good = Array.from({ length: 21 }, (_, i) =>
      day(addDays(TODAY, -(i + 7)), { struck: 1 }),
    );
    const value = hardness(good, TODAY)!;
    expect(value).toBeGreaterThan(0);
    expect(value).toBeLessThan(100);
  });

  it('climbs the day something happens again', () => {
    const good = Array.from({ length: 21 }, (_, i) =>
      day(addDays(TODAY, -(i + 7)), { struck: 1 }),
    );
    const before = hardness(good, TODAY)!;
    const after = hardness([...good, day(TODAY, { struck: 1 })], TODAY)!;
    expect(after).toBeGreaterThan(before);
  });

  it('is carried by a day with no workout in it', () => {
    // One workout a day was the ceiling of the old figure. A day of struck
    // tasks has to count exactly as much.
    const noGym = [day(TODAY, { struck: 1 })];
    const gymOnly = [day(TODAY, { sessions: 1 })];
    expect(hardness(noGym, TODAY)).toBe(hardness(gymOnly, TODAY));
  });
});

describe('what it says', () => {
  const VALUES = [null, 0, 10, 30, 55, 80, 100];

  it('names every value without grading anybody', () => {
    for (const v of VALUES) expect(hardnessName(v).length).toBeGreaterThan(0);
    expect(hardnessName(null)).toBe('Not yet');
  });

  it('never shames, at any value', () => {
    for (const v of VALUES) {
      const text = `${hardnessName(v)} ${hardnessMessage(v, 4)}`.toLowerCase();
      for (const word of ['failed', 'should', 'lazy', 'behind', 'finally', 'poor', 'bad']) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('tells a low window what moves it rather than what is missing', () => {
    expect(hardnessMessage(10, 3).toLowerCase()).toContain('one thing today');
    expect(hardnessMessage(null, 0).toLowerCase()).toContain('anything done in this tool');
  });
});
