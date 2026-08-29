import { describe, expect, it } from 'vitest';
import {
  aheadLine,
  asternLine,
  cargoLine,
  chartWeek,
  hasCargo,
  isWholeWeek,
  sameWeek,
  standingOf,
  weekDays,
  weekLabel,
  weekStart,
} from '../week';
import { NO_ACTS, type Acts } from '../hardening';
import type { DayKey } from '../date';

// 2026-09-20 is a Sunday; 2026-09-23 a Wednesday.
const SUNDAY = '2026-09-20' as DayKey;
const WEDNESDAY = '2026-09-23' as DayKey;

const used = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });

describe('which seven days', () => {
  it('starts the week on Monday', () => {
    expect(weekStart(WEDNESDAY)).toBe('2026-09-21');
    expect(weekStart('2026-09-21' as DayKey)).toBe('2026-09-21');
  });

  it('puts a Sunday at the end of the week it belongs to, not the start', () => {
    // The classic off-by-one: Sunday is day 0 in JavaScript, and treating it
    // as the start puts the whole week a day out for one seventh of the time.
    expect(weekStart(SUNDAY)).toBe('2026-09-14');
    expect(weekDays(SUNDAY)[6]).toBe(SUNDAY);
  });

  it('is always exactly seven consecutive days', () => {
    for (const day of ['2026-01-01', '2026-02-28', '2026-12-31', '2027-03-01'] as DayKey[]) {
      const days = weekDays(day);
      expect(days).toHaveLength(7);
      expect(days).toContain(day);
      expect(isWholeWeek(chartWeek(day, [], [], [], []))).toBe(true);
    }
  });

  it('knows what is astern, today and ahead', () => {
    expect(standingOf('2026-09-22' as DayKey, WEDNESDAY)).toBe('astern');
    expect(standingOf(WEDNESDAY, WEDNESDAY)).toBe('today');
    expect(standingOf('2026-09-24' as DayKey, WEDNESDAY)).toBe('ahead');
  });

  it('groups days into the week they share', () => {
    expect(sameWeek('2026-09-21' as DayKey, SUNDAY)).toBe(false);
    expect(sameWeek('2026-09-21' as DayKey, '2026-09-27' as DayKey)).toBe(true);
  });
});

describe('ink behind, outlines ahead', () => {
  it('inks a day that happened at the darkness it earned', () => {
    const week = chartWeek(
      WEDNESDAY,
      [{ day: '2026-09-21' as DayKey, acts: used({ struck: 4, trained: 1, read: true }) }],
      [],
      [],
      [],
    );
    expect(week[0].level).toBeGreaterThan(0);
  });

  it('never inks a day that has not happened, whatever is placed on it', () => {
    // The one thing this chart must not do: count an intention as work.
    const week = chartWeek(
      WEDNESDAY,
      [{ day: '2026-09-25' as DayKey, acts: used({ struck: 9, trained: 3 }) }],
      [{ day: '2026-09-25' as DayKey, open: 5, minutes: 300 }],
      [],
      [],
    );
    const friday = week.find((d) => d.day === '2026-09-25');
    expect(friday?.standing).toBe('ahead');
    expect(friday?.level).toBe(0);
    expect(friday?.open).toBe(5);
  });

  it('reads a day with no acts row as an empty day rather than shifting', () => {
    const week = chartWeek(WEDNESDAY, [], [], [], []);
    expect(week).toHaveLength(7);
    expect(week.every((d) => d.level === 0)).toBe(true);
    expect(week[0].day).toBe('2026-09-21');
  });

  it('counts what is hung on each day', () => {
    const week = chartWeek(
      WEDNESDAY,
      [],
      [{ day: WEDNESDAY, open: 3, minutes: 45 }],
      [{ day: WEDNESDAY }, { day: WEDNESDAY }, { day: '2026-09-24' as DayKey }],
      [{ day: '2026-09-25' as DayKey }],
    );
    const wed = week.find((d) => d.day === WEDNESDAY);
    expect(wed?.open).toBe(3);
    expect(wed?.openMinutes).toBe(45);
    expect(wed?.bells).toBe(2);
    expect(week.find((d) => d.day === '2026-09-25')?.ports).toBe(1);
  });
});

describe('what it says', () => {
  const week = chartWeek(
    WEDNESDAY,
    [{ day: '2026-09-21' as DayKey, acts: used({ struck: 4 }) }],
    [{ day: '2026-09-25' as DayKey, open: 2, minutes: 30 }],
    [],
    [],
  );

  it('never puts a denominator on the week', () => {
    // Setting Sail is the one screen allowed to, and it earns that by saying
    // it once in the ritual rather than every day.
    const copy = [
      aheadLine(week),
      aheadLine(week, true),
      asternLine(week),
      asternLine(week, true),
      weekLabel(WEDNESDAY),
      weekLabel(WEDNESDAY, true),
    ].join(' ');
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    expect(copy).not.toContain('%');
    expect(copy).not.toContain('seven');
  });

  it('never shames a light week', () => {
    const empty = chartWeek(WEDNESDAY, [], [], [], []);
    const copy = [
      aheadLine(empty),
      aheadLine(empty, true),
      asternLine(empty) ?? '',
      weekLabel(WEDNESDAY),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['failed', 'should', 'lazy', 'wasted', 'behind', 'only', 'empty week']) {
      expect(copy).not.toContain(word);
    }
  });

  it('says nothing about a week with nothing astern rather than reporting a zero', () => {
    expect(asternLine(chartWeek(WEDNESDAY, [], [], [], []))).toBeNull();
  });

  it('offers open water rather than an absence when nothing is placed', () => {
    const empty = chartWeek(WEDNESDAY, [], [], [], []);
    expect(aheadLine(empty)).toContain('Open water');
    expect(aheadLine(empty, true)).not.toContain('Open water');
  });

  it('says a day’s cargo and nothing else', () => {
    const shape = chartWeek(
      WEDNESDAY,
      [],
      [{ day: WEDNESDAY, open: 2, minutes: 30 }],
      [{ day: WEDNESDAY }],
      [{ day: WEDNESDAY }],
    ).find((d) => d.day === WEDNESDAY)!;
    expect(cargoLine(shape)).toBe('2 tasks · 1 bell · 1 to port');
    expect(cargoLine(shape, true)).toBe('2 tasks · 1 time · 1 due');
    expect(hasCargo(shape)).toBe(true);
  });

  it('gets its plurals right in both modes', () => {
    const two = chartWeek(WEDNESDAY, [], [], [{ day: WEDNESDAY }, { day: WEDNESDAY }], []).find(
      (d) => d.day === WEDNESDAY,
    )!;
    expect(cargoLine(two)).toBe('2 bells');
    expect(cargoLine(two, true)).toBe('2 times');
  });

  it('is empty for a day carrying nothing', () => {
    const shape = chartWeek(WEDNESDAY, [], [], [], [])[0];
    expect(cargoLine(shape)).toBe('');
    expect(hasCargo(shape)).toBe(false);
  });
});
