import { describe, expect, it } from 'vitest';
import {
  CALM_DAYS,
  GAP_FOR_RETURN,
  calmLine,
  resisted,
  returnLine,
  returnsNote,
  used,
  voyage,
  type ActDay,
} from '../voyage';
import { NO_ACTS } from '../hardening';
import { addDays, type DayKey } from '../date';

const TODAY = '2026-08-29' as DayKey;

/** A day with something ordinary in it — used, but nothing hard. */
const easy = (day: DayKey): ActDay => ({ ...NO_ACTS, day, read: true, entries: 1 });
/** A day with resistance in it. */
const hard = (day: DayKey): ActDay => ({ ...NO_ACTS, day, read: true, gearMinutes: 25 });
/** A day with nothing at all. */
const empty = (day: DayKey): ActDay => ({ ...NO_ACTS, day });

/** A run of days ending today, newest last. */
function run(kinds: ((d: DayKey) => ActDay)[], today: DayKey = TODAY): ActDay[] {
  const n = kinds.length;
  return kinds.map((k, i) => k(addDays(today, -(n - 1 - i))));
}

describe('what a day had in it', () => {
  it('counts any act as used, and only real effort as resistance', () => {
    expect(used(easy(TODAY))).toBe(true);
    expect(used(empty(TODAY))).toBe(false);
    expect(resisted(easy(TODAY))).toBe(false);
    expect(resisted(hard(TODAY))).toBe(true);
    expect(resisted({ ...NO_ACTS, trained: 1 })).toBe(true);
    // A struck task is the day being used, not resistance — it is one tap.
    expect(resisted({ ...NO_ACTS, struck: 5 })).toBe(false);
  });
});

describe('the Return', () => {
  it('records the day a gap ended, carrying how long it was', () => {
    const days = [easy('2026-08-20' as DayKey), easy('2026-08-27' as DayKey), easy(TODAY)];
    const v = voyage(days, TODAY);
    expect(v.returns).toHaveLength(1);
    expect(v.returns[0]).toEqual({ day: '2026-08-27', after: 7 });
  });

  it('ignores gaps shorter than the threshold', () => {
    const days = [easy('2026-08-27' as DayKey), easy(TODAY)];
    expect(voyage(days, TODAY).returns).toHaveLength(0);
  });

  it('never calls the first day in the history a return', () => {
    // The window may simply start mid-voyage. A day with no predecessor here
    // is not evidence of a gap, and inventing one would be a finding from
    // missing data.
    const v = voyage([easy(TODAY)], TODAY);
    expect(v.returns).toHaveLength(0);
    expect(v.today).toBeNull();
  });

  it('says nothing at all while the gap is still open', () => {
    const days = [easy(addDays(TODAY, -9)), empty(addDays(TODAY, -1)), empty(TODAY)];
    const v = voyage(days, TODAY);
    expect(v.today).toBeNull();
    expect(v.returns).toHaveLength(0);
    // Nothing in the reading counts the days away.
    expect(Object.values(v).join(' ')).not.toContain('9');
  });

  it('marks today when today is the day the gap ended', () => {
    const days = [easy(addDays(TODAY, -6)), easy(TODAY)];
    const v = voyage(days, TODAY);
    expect(v.today).toEqual({ day: TODAY, after: 6 });
  });

  it('lists returns newest first, so the arc reads top-down', () => {
    const days = [
      easy('2026-07-01' as DayKey),
      easy('2026-07-10' as DayKey), // after 9
      easy('2026-08-01' as DayKey), // after 22
      easy('2026-08-05' as DayKey), // after 4
    ];
    const v = voyage(days, TODAY);
    expect(v.returns.map((r) => r.after)).toEqual([4, 22, 9]);
  });

  it('never claims a trend, and never totals the days away', () => {
    const two = returnsNote(2) ?? '';
    for (const word of ['quicker', 'faster', 'shorter', 'improving', 'better', 'worse']) {
      expect(two.toLowerCase()).not.toContain(word);
    }
    expect(returnsNote(0)).toBeNull();
  });

  it('never reproaches the absence', () => {
    const copy = [
      returnLine({ day: TODAY, after: 4 }),
      returnLine({ day: TODAY, after: 12 }),
      returnLine({ day: TODAY, after: 40 }),
      returnsNote(3) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['failed', 'should', 'lazy', 'finally', 'missed', 'again', 'at last']) {
      expect(copy).not.toContain(word);
    }
  });
});

describe('the Calm Belt', () => {
  it('counts a run of used days with nothing hard in them', () => {
    const v = voyage(run(Array(CALM_DAYS).fill(easy)), TODAY);
    expect(v.calmDays).toBe(CALM_DAYS);
    expect(v.becalmed).toBe(true);
  });

  it('stays quiet below the threshold', () => {
    const v = voyage(run(Array(CALM_DAYS - 1).fill(easy)), TODAY);
    expect(v.becalmed).toBe(false);
    expect(calmLine(v.calmDays)).toBeNull();
  });

  it('is broken by resistance, not by a bad day', () => {
    const kinds = Array(CALM_DAYS).fill(easy);
    kinds[kinds.length - 1] = hard; // today had a gear session
    const v = voyage(run(kinds), TODAY);
    expect(v.calmDays).toBe(0);
    expect(v.becalmed).toBe(false);
  });

  it('cannot fire during a gap, because an empty day is not calm water', () => {
    // This is the guard that keeps it from becoming a shame mechanic: the one
    // week it must never speak to is the week somebody stopped opening the app.
    const kinds = Array(CALM_DAYS + 2).fill(easy);
    kinds[kinds.length - 2] = empty;
    const v = voyage(run(kinds), TODAY);
    expect(v.calmDays).toBe(1);
    expect(v.becalmed).toBe(false);
  });

  it('asks rather than tells, and never grades the week', () => {
    const line = calmLine(CALM_DAYS) ?? '';
    expect(line).toContain('?');
    for (const word of ['failed', 'should', 'lazy', 'wasted', 'nothing to show', 'behind']) {
      expect(line.toLowerCase()).not.toContain(word);
    }
    // It describes the water, not the sailor.
    expect(line.toLowerCase()).toContain('calm');
  });

  it('does not congratulate the run it has just counted', () => {
    const line = (calmLine(CALM_DAYS) ?? '').toLowerCase();
    for (const word of ['great', 'well done', 'nice', 'streak', 'keep it up']) {
      expect(line).not.toContain(word);
    }
  });
});

describe('the two together', () => {
  it('a return day is never also becalmed', () => {
    const days = [easy(addDays(TODAY, -8)), easy(TODAY)];
    const v = voyage(days, TODAY);
    expect(v.today).not.toBeNull();
    expect(v.becalmed).toBe(false);
  });

  it('reads an empty history without inventing anything', () => {
    const v = voyage([], TODAY);
    expect(v).toEqual({ returns: [], today: null, calmDays: 0, becalmed: false });
  });

  it('holds the thresholds the concept document set', () => {
    expect(GAP_FOR_RETURN).toBe(3);
    expect(CALM_DAYS).toBe(6);
  });
});
