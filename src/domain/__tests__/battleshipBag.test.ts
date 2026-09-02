import { describe, expect, it } from 'vitest';
import { MAX_HITS, hitsThisWeek, pastDay, startOfWeek, type Session } from '../training';

/**
 * The Battleship Bag: one hull a week, one hit a day, fresh on Monday.
 *
 * Garp punches warships until their armoured hulls cave in. The owner's
 * ask was the picture — _"everytime I log a training session the bottom of
 * the battleship looks more and more punched in and destroyed, max of 7
 * hits because of only train once per day and every Monday it should
 * refresh to new."_ Everything below is one of those clauses, read back.
 */

const s = (day: string, kind = 'Push'): Session => ({
  day,
  kind,
  minutes: null,
  intensity: null,
  note: null,
});

describe('hits this week', () => {
  // 2026-09-02 is a Wednesday; the week began on Monday the 31st.
  const wed = '2026-09-02';

  it('counts the days that landed one, not the sessions', () => {
    // Two sessions on a Tuesday is a Tuesday. Counting them twice would draw
    // a hull twice as broken for the same day's work.
    const twice = [s('2026-09-01', 'Push'), s('2026-09-01', 'Run')];
    expect(hitsThisWeek(twice, wed)).toBe(1);
  });

  it('is nothing on a fresh hull', () => {
    expect(hitsThisWeek([], wed)).toBe(0);
  });

  it('starts again on Monday', () => {
    // Sunday the 30th belongs to last week's hull. A hit on it is a real hit,
    // on a hull that has already been replaced.
    const lastWeek = [s('2026-08-30'), s('2026-08-29')];
    expect(hitsThisWeek(lastWeek, wed)).toBe(0);
    expect(startOfWeek(wed)).toBe('2026-08-31');
    expect(hitsThisWeek([s('2026-08-31')], wed)).toBe(1);
  });

  it('never runs past seven', () => {
    // Monday the 31st through Sunday the 6th: one whole hull's worth.
    const week = ['2026-08-31', ...Array.from({ length: 6 }, (_, i) => `2026-09-0${i + 1}`)];
    const everyDay = week.map((d) => s(d));
    expect(hitsThisWeek(everyDay, '2026-09-06')).toBe(MAX_HITS);
    // And a backdated eighth session on one of those days changes nothing.
    expect(hitsThisWeek([...everyDay, s('2026-09-03', 'Extra')], '2026-09-06')).toBe(MAX_HITS);
  });

  it('does not count a day that has not happened', () => {
    // A session logged for later in the week — a slip of the date field — is
    // not a hit yet. The hull only caves for days that are astern.
    expect(hitsThisWeek([s('2026-09-04')], wed)).toBe(0);
  });
});

describe('the day a session was logged for', () => {
  const today = '2026-09-02';

  it('is today when nothing is typed', () => {
    expect(pastDay('', today)).toBe(today);
    expect(pastDay('   ', today)).toBe(today);
  });

  it('reads a bare day as the most recent one with that number', () => {
    // `parseDay` would roll "30" forward to the 30th of September, which is a
    // workout that has not happened. For a log, "30" on the 2nd is the 30th
    // just gone.
    expect(pastDay('30', today)).toBe('2026-08-30');
    expect(pastDay('1', today)).toBe('2026-09-01');
    expect(pastDay('2', today)).toBe(today);
  });

  it('skips a day a short month does not have', () => {
    // "31" on the 2nd of March: February has no 31st, so it is January's.
    expect(pastDay('31', '2026-03-02')).toBe('2026-01-31');
  });

  it('takes a month and a day at face value when they are behind', () => {
    expect(pastDay('aug 28', today)).toBe('2026-08-28');
    expect(pastDay('8/28', today)).toBe('2026-08-28');
    expect(pastDay('2026-08-28', today)).toBe('2026-08-28');
  });

  it('refuses a day in the future', () => {
    // You cannot have trained on Friday when it is Wednesday.
    expect(pastDay('2026-09-04', today)).toBeNull();
    expect(pastDay('sep 4', today)).toBeNull();
  });

  it('refuses rather than guessing at nonsense', () => {
    expect(pastDay('0', today)).toBeNull();
    expect(pastDay('32', today)).toBeNull();
    expect(pastDay('yesterday-ish', today)).toBeNull();
  });
});
