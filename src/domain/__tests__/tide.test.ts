import { describe, expect, it } from 'vitest';
import {
  MOON_LIT,
  MOON_NAME,
  canGoBack,
  canGoOn,
  isThisMonth,
  monthGrid,
  monthLabel,
  monthLine,
  monthStart,
  moonMarkFor,
  shiftMonth,
} from '../tide';
import { litPath } from '../moon';
import { NO_ACTS, type Acts } from '../hardening';
import { SYNODIC_DAYS } from '../moon';
import { addDays, type DayKey } from '../date';

const TODAY = '2026-09-23' as DayKey;
const used = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });

describe('the grid', () => {
  it('is whole weeks starting on Monday', () => {
    const weeks = monthGrid('2026-09-01' as DayKey, TODAY, [], []);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    // September 2026 starts on a Tuesday, so the first row opens on Aug 31.
    expect(weeks[0][0].day).toBe('2026-08-31');
    expect(weeks[0][0].inMonth).toBe(false);
    expect(weeks[0][1].day).toBe('2026-09-01');
    expect(weeks[0][1].inMonth).toBe(true);
  });

  it('covers every day of the month exactly once', () => {
    for (const month of ['2026-01-01', '2026-02-01', '2026-09-01', '2027-03-01'] as DayKey[]) {
      const inMonth = monthGrid(month, TODAY, [], [])
        .flat()
        .filter((d) => d.inMonth)
        .map((d) => d.day);
      expect(new Set(inMonth).size).toBe(inMonth.length);
      expect(inMonth[0]).toBe(month);
    }
  });

  it('handles a February that fits in exactly four rows', () => {
    // 2027-02-01 is a Monday and February has 28 days: four clean weeks, and
    // a loop that always drew six would trail a whole blank row.
    const weeks = monthGrid('2027-02-01' as DayKey, TODAY, [], []);
    expect(weeks).toHaveLength(4);
    expect(weeks.flat().every((d) => d.inMonth)).toBe(true);
  });

  it('inks a day at the level it earned and leaves the rest empty', () => {
    const weeks = monthGrid(
      '2026-09-01' as DayKey,
      TODAY,
      [{ day: '2026-09-10' as DayKey, acts: used({ struck: 5, trained: 1, read: true }) }],
      [],
    );
    const day = weeks.flat().find((d) => d.day === '2026-09-10');
    expect(day?.level).toBeGreaterThan(0);
    expect(weeks.flat().filter((d) => d.level > 0)).toHaveLength(1);
  });

  it('marks a port without inking the day', () => {
    const weeks = monthGrid(
      '2026-09-01' as DayKey,
      TODAY,
      [],
      [{ day: '2026-09-30' as DayKey }],
    );
    const day = weeks.flat().find((d) => d.day === '2026-09-30');
    expect(day?.port).toBe(true);
    expect(day?.level).toBe(0);
  });
});

describe('the moon', () => {
  it('marks each principal phase on exactly one day a month', () => {
    const seen: Record<string, number> = {};
    for (let i = 0; i < 30; i += 1) {
      const mark = moonMarkFor(addDays('2026-09-01' as DayKey, i));
      if (mark) seen[mark] = (seen[mark] ?? 0) + 1;
    }
    for (const mark of ['new', 'first', 'full', 'last']) {
      expect(seen[mark], `${mark} in September`).toBe(1);
    }
  });

  it('marks four days and no more in a lunar month', () => {
    let marks = 0;
    for (let i = 0; i < Math.floor(SYNODIC_DAYS); i += 1) {
      if (moonMarkFor(addDays('2026-03-01' as DayKey, i))) marks += 1;
    }
    expect(marks).toBe(4);
  });

  it('names and draws every mark', () => {
    for (const mark of ['new', 'first', 'full', 'last'] as const) {
      expect(MOON_NAME[mark].length).toBeGreaterThan(0);
      expect(MOON_LIT[mark]).toBeDefined();
    }
  });

  // The mark is drawn from the same geometry the settings chart's moon uses,
  // so the two can never disagree about which way a crescent points — and a
  // half moon that came out as a full disc would be a mark that lied.
  it('lights each mark the way the sky does', () => {
    expect(litPath(9, MOON_LIT.new.fraction, MOON_LIT.new.waxing)).toBe('none');
    expect(litPath(9, MOON_LIT.full.fraction, MOON_LIT.full.waxing)).toBe('full');
    const first = litPath(9, MOON_LIT.first.fraction, MOON_LIT.first.waxing);
    const last = litPath(9, MOON_LIT.last.fraction, MOON_LIT.last.waxing);
    // A quarter is a half disc: the terminator is a straight edge, which the
    // arc form writes as a zero-width ellipse.
    expect(first).toContain('A 0.00 9');
    expect(last).toContain('A 0.00 9');
    // And the two quarters are lit on opposite limbs.
    expect(first).not.toBe(last);
  });
});

describe('moving between months', () => {
  it('steps by whole months, not by thirty days', () => {
    expect(shiftMonth('2026-03-31' as DayKey, -1)).toBe('2026-02-01');
    expect(shiftMonth('2026-01-15' as DayKey, -1)).toBe('2025-12-01');
    expect(shiftMonth('2026-12-05' as DayKey, 1)).toBe('2027-01-01');
  });

  it('never goes forward past the month today is in', () => {
    // A month ahead is a calendar, and this is not one — the week chart is
    // where the future lives.
    expect(canGoOn('2026-08-01' as DayKey, TODAY)).toBe(true);
    expect(canGoOn('2026-09-01' as DayKey, TODAY)).toBe(false);
    expect(canGoOn('2026-10-01' as DayKey, TODAY)).toBe(false);
  });

  it('stops going back at the day the voyage started', () => {
    const sail = '2026-08-15' as DayKey;
    expect(canGoBack('2026-09-01' as DayKey, sail)).toBe(true);
    expect(canGoBack('2026-08-01' as DayKey, sail)).toBe(false);
  });

  it('knows which month is this one', () => {
    expect(isThisMonth('2026-09-30' as DayKey, TODAY)).toBe(true);
    expect(isThisMonth('2026-08-30' as DayKey, TODAY)).toBe(false);
  });

  it('names the month, and the year only when it is not this one', () => {
    expect(monthLabel('2026-09-01' as DayKey, TODAY)).toBe('September');
    expect(monthLabel('2025-12-01' as DayKey, TODAY)).toBe('December 2025');
  });

  it('starts the month on the first, whatever day is handed in', () => {
    expect(monthStart('2026-09-23' as DayKey)).toBe('2026-09-01');
  });
});

describe('what it says', () => {
  const weeks = monthGrid(
    '2026-09-01' as DayKey,
    TODAY,
    [
      { day: '2026-09-10' as DayKey, acts: used({ struck: 5 }) },
      { day: '2026-09-11' as DayKey, acts: used({ struck: 2 }) },
    ],
    [],
  );

  it('counts days and never the month', () => {
    // A week is bounded and honest; a month is longer, more variable and
    // further from anything you can act on. "12 of 30" here is a score.
    const copy = [monthLine(weeks), monthLine(weeks, true)].join(' ');
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    expect(copy).not.toContain('%');
    expect(copy).toContain('2 days');
  });

  it('says nothing about a month with nothing in it', () => {
    expect(monthLine(monthGrid('2026-09-01' as DayKey, TODAY, [], []))).toBeNull();
  });

  it('never shames a quiet month', () => {
    const copy = [monthLine(weeks), monthLine(weeks, true)].join(' ').toLowerCase();
    for (const word of ['only', 'streak', 'missed', 'failed', 'behind', 'should']) {
      expect(copy).not.toContain(word);
    }
  });
});
