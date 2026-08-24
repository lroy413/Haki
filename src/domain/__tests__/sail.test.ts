import { describe, expect, it } from 'vitest';
import {
  SAIL_EVERY_DAYS,
  daysSince,
  headingPrompt,
  isDue,
  offerLine,
  readWeek,
  sailedMessage,
  weekMessage,
  type WeekDay,
} from '../sail';
import { addDays, type DayKey } from '../date';
import { NO_ACTS } from '../hardening';

const TODAY = '2026-08-23' as DayKey;
const NONE = { reached: 0, passed: 0 };

const day = (d: DayKey, over: Partial<WeekDay> = {}): WeekDay => ({
  day: d,
  ...NO_ACTS,
  ...over,
});

/** `n` consecutive days ending today, each with one struck task. */
const run = (n: number, over: Partial<WeekDay> = { struck: 1 }) =>
  Array.from({ length: n }, (_, i) => day(addDays(TODAY, -i), over));

describe('reading the week', () => {
  it('counts days that had anything in them, not output', () => {
    const light = readWeek(run(4, { struck: 1 }), NONE, TODAY);
    const heavy = readWeek(run(4, { struck: 9, gearMinutes: 200 }), NONE, TODAY);
    expect(light.daysUsed).toBe(heavy.daysUsed);
    expect(light.daysUsed).toBe(4);
  });

  it('counts a day once however many acts it held', () => {
    const busy = [day(TODAY, { struck: 2, entries: 1, satMinutes: 10, trained: 1 })];
    expect(readWeek(busy, NONE, TODAY).daysUsed).toBe(1);
  });

  it('takes any act as having used the day', () => {
    for (const act of [
      { course: true },
      { read: true },
      { entries: 1 },
      { struck: 1 },
      { trained: 1 },
      { gearMinutes: 5 },
      { satMinutes: 5 },
    ]) {
      expect(readWeek([day(TODAY, act)], NONE, TODAY).daysUsed, JSON.stringify(act)).toBe(1);
    }
  });

  it('leaves an untouched day out', () => {
    expect(readWeek([day(TODAY)], NONE, TODAY).daysUsed).toBe(0);
  });

  it('ignores days outside the window and in the future', () => {
    const old = day(addDays(TODAY, -SAIL_EVERY_DAYS), { struck: 1 });
    const soon = day(addDays(TODAY, 1), { struck: 1 });
    const edge = day(addDays(TODAY, -(SAIL_EVERY_DAYS - 1)), { struck: 1 });
    expect(readWeek([old, soon], NONE, TODAY).daysUsed).toBe(0);
    expect(readWeek([edge], NONE, TODAY).daysUsed).toBe(1);
  });

  it('totals the output as well, since a week is a real denominator', () => {
    const week = readWeek(
      [
        day(TODAY, { struck: 3, entries: 1, satMinutes: 10, gearMinutes: 50, read: true }),
        day(addDays(TODAY, -1), { struck: 2, trained: 1, satMinutes: 15, read: true }),
      ],
      { reached: 1, passed: 1 },
      TODAY,
    );
    expect(week).toMatchObject({
      daysUsed: 2,
      daysSat: 2,
      struck: 5,
      entries: 1,
      trained: 1,
      gearMinutes: 50,
      reads: 2,
      reached: 1,
      passed: 1,
    });
  });

  it('names the window it read', () => {
    const week = readWeek([], NONE, TODAY);
    expect(week.to).toBe(TODAY);
    expect(week.from).toBe(addDays(TODAY, -6));
  });
});

describe('when it comes round', () => {
  it('is due immediately when it has never been done', () => {
    expect(isDue(null, TODAY)).toBe(true);
    expect(daysSince(null, TODAY)).toBeNull();
  });

  it('comes back a week after the last one', () => {
    expect(isDue(TODAY, TODAY)).toBe(false);
    expect(isDue(addDays(TODAY, -6), TODAY)).toBe(false);
    expect(isDue(addDays(TODAY, -7), TODAY)).toBe(true);
    expect(isDue(addDays(TODAY, -30), TODAY)).toBe(true);
  });

  it('counts the days since', () => {
    expect(daysSince(addDays(TODAY, -9), TODAY)).toBe(9);
  });
});

describe('what it says', () => {
  const ALL = () => {
    const lines: string[] = [];
    for (let n = 0; n <= SAIL_EVERY_DAYS; n++) {
      lines.push(weekMessage(readWeek(run(n), NONE, TODAY)));
    }
    for (const last of [
      null,
      TODAY,
      addDays(TODAY, -1),
      addDays(TODAY, -6),
      addDays(TODAY, -7),
      addDays(TODAY, -20),
    ]) {
      lines.push(offerLine(last, TODAY), offerLine(last, TODAY, true));
    }
    lines.push(headingPrompt(), headingPrompt(true), sailedMessage(), sailedMessage(true));
    return lines;
  };

  it('never shames, at any level of week', () => {
    for (const line of ALL()) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'behind',
        'finally',
        'missed',
        'only',
        'poor',
      ]) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('never congratulates a frictionless week', () => {
    // The app's oldest rule, and this is the screen most likely to break it.
    // A full week gets a question, not a trophy.
    const full = weekMessage(readWeek(run(SAIL_EVERY_DAYS), NONE, TODAY));
    expect(full).toContain('?');
    for (const word of ['great', 'amazing', 'well done', 'perfect', 'congrat', 'streak']) {
      expect(full.toLowerCase()).not.toContain(word);
    }
  });

  it('treats an empty week as a week and not a verdict', () => {
    const quiet = weekMessage(readWeek([], NONE, TODAY));
    expect(quiet.toLowerCase()).toContain('one week');
    expect(quiet).not.toContain('0');
  });

  it('offers rather than summons, however long it has been', () => {
    for (const last of [null, addDays(TODAY, -7), addDays(TODAY, -40)]) {
      const text = offerLine(last, TODAY).toLowerCase();
      for (const word of ['due', 'overdue', 'time to', 'you need', 'must']) {
        expect(text, text).not.toContain(word);
      }
    }
  });

  it('says when it comes back, when it is not yet time', () => {
    expect(offerLine(TODAY, TODAY)).toContain('7 days');
    expect(offerLine(addDays(TODAY, -6), TODAY)).toBe('Again tomorrow.');
  });

  it('speaks plainly in plain mode, giving nothing away', () => {
    const plain = [offerLine(null, TODAY, true), headingPrompt(true), sailedMessage(true)]
      .join(' ')
      .toLowerCase();
    for (const word of ['needle', 'heading', 'sail', 'island', 'under way']) {
      expect(plain, plain).not.toContain(word);
    }
  });
});
