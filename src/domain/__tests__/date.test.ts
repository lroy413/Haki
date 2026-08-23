import { afterEach, describe, expect, it } from 'vitest';
import {
  clampHour,
  configureDayStart,
  dayKeyAt,
  describeDayStart,
  getDayStartHour,
  todayKey,
} from '../date';

/** Local time, because that is the only time this app cares about. */
const at = (y: number, m: number, d: number, h: number, min = 0) =>
  new Date(y, m - 1, d, h, min);

afterEach(() => configureDayStart(0));

describe('dayKeyAt', () => {
  it('is the calendar day when the boundary is midnight', () => {
    expect(dayKeyAt(at(2026, 8, 23, 0, 1), 0)).toBe('2026-08-23');
    expect(dayKeyAt(at(2026, 8, 23, 23, 59), 0)).toBe('2026-08-23');
  });

  it('keeps the small hours on the day before when the boundary is later', () => {
    // Finishing at three in the morning is still the same working day.
    expect(dayKeyAt(at(2026, 8, 24, 3, 0), 4)).toBe('2026-08-23');
    expect(dayKeyAt(at(2026, 8, 24, 3, 59), 4)).toBe('2026-08-23');
  });

  it('rolls over exactly on the boundary, not a minute either side', () => {
    expect(dayKeyAt(at(2026, 8, 24, 3, 59), 4)).toBe('2026-08-23');
    expect(dayKeyAt(at(2026, 8, 24, 4, 0), 4)).toBe('2026-08-24');
  });

  it('carries the day back across a month end', () => {
    expect(dayKeyAt(at(2026, 9, 1, 2, 0), 5)).toBe('2026-08-31');
  });

  it('carries the day back across a year end', () => {
    expect(dayKeyAt(at(2027, 1, 1, 1, 0), 6)).toBe('2026-12-31');
  });

  it('handles a leap day', () => {
    expect(dayKeyAt(at(2028, 3, 1, 2, 0), 4)).toBe('2028-02-29');
  });

  it('leaves an evening alone for any boundary earlier than it', () => {
    for (const hour of [0, 4, 9, 12]) {
      expect(dayKeyAt(at(2026, 8, 23, 22, 0), hour)).toBe('2026-08-23');
    }
  });

  it('will move an evening if the boundary is set past it', () => {
    // A boundary of 11pm makes 10pm the tail of the previous day. Strange, but
    // it is what the rule says, and the rule should not special-case itself.
    expect(dayKeyAt(at(2026, 8, 23, 22, 0), 23)).toBe('2026-08-22');
  });
});

describe('clampHour', () => {
  it('holds the range', () => {
    expect(clampHour(-4)).toBe(0);
    expect(clampHour(99)).toBe(23);
    expect(clampHour(6)).toBe(6);
  });

  it('refuses to let a bad value silently shift the whole app', () => {
    // Nothing that is not a real hour becomes one. Infinity is not "very late",
    // it is a broken value, and midnight is the safe thing to fall back to.
    expect(clampHour(Number.NaN)).toBe(0);
    expect(clampHour(Number.POSITIVE_INFINITY)).toBe(0);
    expect(clampHour(Number.NEGATIVE_INFINITY)).toBe(0);
    expect(clampHour(6.7)).toBe(6);
  });
});

describe('the configured boundary', () => {
  it('defaults to midnight', () => {
    expect(getDayStartHour()).toBe(0);
  });

  it('moves todayKey once configured', () => {
    const smallHours = at(2026, 8, 24, 2, 0);
    expect(todayKey(smallHours)).toBe('2026-08-24');
    configureDayStart(5);
    expect(todayKey(smallHours)).toBe('2026-08-23');
  });

  it('clamps whatever it is handed', () => {
    configureDayStart(40);
    expect(getDayStartHour()).toBe(23);
  });
});

describe('describeDayStart', () => {
  it('names the hour the way a person would', () => {
    expect(describeDayStart(0)).toBe('Midnight');
    expect(describeDayStart(4)).toBe('4am');
    expect(describeDayStart(12)).toBe('12pm');
    expect(describeDayStart(13)).toBe('1pm');
    expect(describeDayStart(23)).toBe('11pm');
  });
});
