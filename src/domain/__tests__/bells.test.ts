import { describe, expect, it } from 'vitest';
import {
  bellAt,
  bellLabel,
  bellsInWatch,
  clampClock,
  clockLabel,
  inOrder,
  nextBellLine,
  parseClock,
  watchOf,
  type Bell,
} from '../bells';

const bell = (id: number, title: string, at: number): Bell => ({
  id,
  title,
  day: '2026-09-15',
  at,
});

describe('the clock', () => {
  it('reads the ways a person actually types a time', () => {
    expect(parseClock('9')).toBe(9 * 60);
    expect(parseClock('9:30')).toBe(9 * 60 + 30);
    expect(parseClock('09:30')).toBe(9 * 60 + 30);
    expect(parseClock('0930')).toBe(9 * 60 + 30);
    expect(parseClock('9.30')).toBe(9 * 60 + 30);
    expect(parseClock(' 21:05 ')).toBe(21 * 60 + 5);
  });

  it('refuses what is not a time rather than guessing at one', () => {
    for (const bad of ['', 'soon', '25:00', '9:75', 'half nine', '9:5', '--']) {
      expect(parseClock(bad)).toBeNull();
    }
  });

  it('prints twenty-four hours, zero padded', () => {
    expect(clockLabel(0)).toBe('00:00');
    expect(clockLabel(9 * 60 + 5)).toBe('09:05');
    expect(clockLabel(15 * 60)).toBe('15:00');
    expect(clockLabel(23 * 60 + 59)).toBe('23:59');
  });

  it('puts a stray value back on the clock instead of trusting it', () => {
    expect(clampClock(-5)).toBe(0);
    expect(clampClock(99999)).toBe(1439);
    expect(clampClock(Number.NaN)).toBe(0);
  });
});

describe('where a bell hangs', () => {
  it('takes its watch from the clock, never from a choice', () => {
    expect(watchOf(bell(1, 'x', 8 * 60))).toBe('morning');
    expect(watchOf(bell(1, 'x', 15 * 60))).toBe('afternoon');
    expect(watchOf(bell(1, 'x', 20 * 60))).toBe('evening');
    expect(watchOf(bell(1, 'x', 2 * 60))).toBe('evening');
  });

  it('sits proportionally across the drawn day', () => {
    expect(bellAt(5 * 60)).toBe(0);
    const noon = bellAt(12 * 60) ?? 0;
    const six = bellAt(18 * 60) ?? 0;
    expect(noon).toBeGreaterThan(0);
    expect(six).toBeGreaterThan(noon);
    expect(six).toBeLessThan(1);
  });

  it('hangs nowhere when it falls outside the drawn day', () => {
    // A three in the morning bell is real and belongs in its list; clamping
    // it to the edge of the strip would draw it at a time it is not.
    expect(bellAt(3 * 60)).toBeNull();
    expect(bellAt(4 * 60 + 59)).toBeNull();
  });
});

describe('the day in order', () => {
  const day = [
    bell(3, 'Dentist', 15 * 60),
    bell(1, 'Standup', 9 * 60),
    bell(2, 'Call', 9 * 60),
  ];

  it('reads earliest first, and ties break by age', () => {
    expect(inOrder(day).map((b) => b.id)).toEqual([1, 2, 3]);
  });

  it('names the next one without a countdown or any urgency', () => {
    const line = nextBellLine(day, 8 * 60) ?? '';
    expect(line).toContain('09:00');
    expect(line).toContain('Standup');
    for (const word of ['in ', 'soon', 'hurry', 'minutes', 'now']) {
      expect(line.toLowerCase()).not.toContain(word);
    }
  });

  it('says nothing once the day has none left', () => {
    expect(nextBellLine(day, 23 * 60)).toBeNull();
  });

  it('never treats a passed bell as missed', () => {
    // It simply stops being ahead. Nothing marks it, counts it, or asks.
    const line = nextBellLine(day, 16 * 60);
    expect(line).toBeNull();
    const copy = [bellLabel(day[0]), nextBellLine(day, 8 * 60) ?? ''].join(' ').toLowerCase();
    for (const word of ['missed', 'late', 'overdue', 'failed', 'should']) {
      expect(copy).not.toContain(word);
    }
  });

  it('groups into the watch each one falls in', () => {
    expect(bellsInWatch(day, 'morning').map((b) => b.id)).toEqual([1, 2]);
    expect(bellsInWatch(day, 'afternoon').map((b) => b.id)).toEqual([3]);
    expect(bellsInWatch(day, 'evening')).toHaveLength(0);
  });

  it('has no notion of done, because an appointment is not a task', () => {
    const b = bell(1, 'Dentist', 15 * 60);
    expect(Object.keys(b)).not.toContain('doneAt');
    expect(Object.keys(b)).not.toContain('done');
  });

  it('drops the nautical vocabulary in plain mode', () => {
    expect(bellLabel(bell(1, 'Dentist', 15 * 60), true)).not.toContain('watch');
    expect(bellLabel(bell(1, 'Dentist', 15 * 60))).toContain('watch');
  });
});
