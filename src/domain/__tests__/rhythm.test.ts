import { describe, expect, it } from 'vitest';
import {
  DAY_NAMES,
  cadence,
  decodeWeekdays,
  encodeWeekdays,
  isPlayable,
  offerLine,
  offeredOn,
  offers,
  toggleWeekday,
  weekdayOf,
  type Rhythm,
} from '../rhythm';
import { addDays, type DayKey } from '../date';

/** 2026-08-23 is a Sunday. */
const SUNDAY = '2026-08-23' as DayKey;
const MONDAY = addDays(SUNDAY, 1);
const THURSDAY = addDays(SUNDAY, 4);

const weekly = (weekdays: number[], over: Partial<Rhythm> = {}): Rhythm => ({
  id: 1,
  key: 1000,
  title: 'Laundry',
  minutes: 30,
  kind: 'weekdays',
  weekdays,
  intervalDays: 1,
  retired: false,
  ...over,
});

const every = (intervalDays: number, over: Partial<Rhythm> = {}): Rhythm => ({
  ...weekly([]),
  kind: 'interval',
  intervalDays,
  ...over,
});

describe('the calendar', () => {
  it('agrees with the date module about what day it is', () => {
    expect(weekdayOf(SUNDAY)).toBe(0);
    expect(weekdayOf(MONDAY)).toBe(1);
    expect(weekdayOf(THURSDAY)).toBe(4);
    expect(DAY_NAMES[weekdayOf(THURSDAY)]).toBe('Thu');
  });
});

describe('a weekday rhythm', () => {
  it('is on offer on its days and absent on the others', () => {
    const monThu = weekly([1, 4]);
    expect(offeredOn(monThu, MONDAY, null)).toBe(true);
    expect(offeredOn(monThu, THURSDAY, null)).toBe(true);
    expect(offeredOn(monThu, SUNDAY, null)).toBe(false);
    expect(offeredOn(monThu, addDays(SUNDAY, 2), null)).toBe(false);
  });

  it('does not care when it was last done', () => {
    // The whole point: a missed Monday leaves nothing behind. Thursday offers
    // it again in the same voice, whether Monday happened or not.
    const monThu = weekly([1, 4]);
    expect(offeredOn(monThu, THURSDAY, null)).toBe(true);
    expect(offeredOn(monThu, THURSDAY, MONDAY)).toBe(true);
    expect(offeredOn(monThu, THURSDAY, addDays(SUNDAY, -30))).toBe(true);
  });

  it('is silent once retired', () => {
    expect(offeredOn(weekly([1, 4], { retired: true }), MONDAY, null)).toBe(false);
  });
});

describe('an interval rhythm', () => {
  it('is on offer immediately, before it has ever been done', () => {
    expect(offeredOn(every(3), SUNDAY, null)).toBe(true);
  });

  it('waits its interval after being done, then stays on offer', () => {
    const three = every(3);
    expect(offeredOn(three, addDays(SUNDAY, 1), SUNDAY)).toBe(false);
    expect(offeredOn(three, addDays(SUNDAY, 2), SUNDAY)).toBe(false);
    expect(offeredOn(three, addDays(SUNDAY, 3), SUNDAY)).toBe(true);
    // And keeps standing there. Late is not a state this app has.
    expect(offeredOn(three, addDays(SUNDAY, 9), SUNDAY)).toBe(true);
  });

  it('counts from the last time it was done, never from a fixed anchor', () => {
    // An anchored cycle passes you while you are not looking: miss day three
    // and you are not asked again until day six. Measured from the strike, a
    // missed day pushes nothing away.
    const three = every(3);
    const doneLate = addDays(SUNDAY, 5);
    expect(offeredOn(three, addDays(SUNDAY, 6), doneLate)).toBe(false);
    expect(offeredOn(three, addDays(SUNDAY, 8), doneLate)).toBe(true);
  });

  it('treats an interval under a day as every day', () => {
    expect(offeredOn(every(0), addDays(SUNDAY, 1), SUNDAY)).toBe(true);
  });
});

describe('offers', () => {
  const list = [
    weekly([1, 4], { key: 1, title: 'Laundry' }),
    every(2, { key: 2, title: 'Water the plants' }),
    weekly([0], { key: 3, title: 'Call home' }),
  ];

  it('gathers everything standing on a given day', () => {
    const got = offers(list, MONDAY, new Map());
    expect(got.map((r) => r.title)).toEqual(['Laundry', 'Water the plants']);
  });

  it('drops what has already been struck today', () => {
    const got = offers(list, MONDAY, new Map(), new Set([1]));
    expect(got.map((r) => r.title)).toEqual(['Water the plants']);
  });

  it("respects each rhythm's own last-done day", () => {
    const lastDone = new Map<number, DayKey>([[2, MONDAY]]);
    expect(offers(list, MONDAY, lastDone).map((r) => r.title)).toEqual(['Laundry']);
  });

  it('is empty on a day nothing is set for', () => {
    expect(offers([weekly([1, 4])], addDays(SUNDAY, 2), new Map())).toHaveLength(0);
  });
});

describe('what it says', () => {
  it('names a cadence in the shortest true way', () => {
    expect(cadence(weekly([1, 2, 3, 4, 5]))).toBe('Weekdays');
    expect(cadence(weekly([0, 6]))).toBe('Weekends');
    expect(cadence(weekly([0, 1, 2, 3, 4, 5, 6]))).toBe('Every day');
    expect(cadence(weekly([1, 4]))).toBe('Mon · Thu');
    expect(cadence(every(1))).toBe('Every day');
    expect(cadence(every(3))).toBe('Every 3 days');
  });

  it('never says due, late, or missed — in any state', () => {
    const lines = [
      cadence(weekly([1, 4])),
      cadence(every(3)),
      cadence(weekly([])),
      offerLine(0),
      offerLine(1),
      offerLine(4),
      offerLine(0, true),
      offerLine(3, true),
    ];
    for (const line of lines) {
      const text = line.toLowerCase();
      for (const word of ['due', 'overdue', 'late', 'missed', 'failed', 'should', 'behind']) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('counts what is on offer and never what is left', () => {
    // "2 of 5 done" would turn the standing offer back into a checklist,
    // which is the exact thing this model exists to avoid.
    for (const n of [0, 1, 4]) {
      for (const plain of [false, true]) {
        expect(offerLine(n, plain)).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
      }
    }
  });

  it('says something for an empty day rather than nothing', () => {
    expect(offerLine(0).length).toBeGreaterThan(0);
    expect(offerLine(0, true)).not.toBe(offerLine(0));
  });
});

describe('editing', () => {
  it('refuses a rhythm that could never come back', () => {
    expect(isPlayable({ title: 'Laundry', kind: 'weekdays', weekdays: [] })).toBe(false);
    expect(isPlayable({ title: '  ', kind: 'weekdays', weekdays: [1] })).toBe(false);
    expect(isPlayable({ title: 'Laundry', kind: 'weekdays', weekdays: [1] })).toBe(true);
    // An interval always comes back, so it needs no days.
    expect(isPlayable({ title: 'Water', kind: 'interval', weekdays: [] })).toBe(true);
  });

  it('toggles a weekday in and out, keeping the set sorted', () => {
    expect(toggleWeekday([1, 4], 2)).toEqual([1, 2, 4]);
    expect(toggleWeekday([1, 2, 4], 2)).toEqual([1, 4]);
  });

  it('round-trips through storage, sorted and deduped', () => {
    expect(encodeWeekdays([4, 1, 1])).toBe('1,4');
    expect(decodeWeekdays('4,1,1')).toEqual([1, 4]);
    expect(decodeWeekdays(null)).toEqual([]);
    expect(decodeWeekdays('')).toEqual([]);
  });

  it('drops anything that is not a weekday rather than trusting it', () => {
    expect(encodeWeekdays([-1, 3, 9, 1.5])).toBe('3');
    expect(decodeWeekdays('9,x,3')).toEqual([3]);
  });
});
