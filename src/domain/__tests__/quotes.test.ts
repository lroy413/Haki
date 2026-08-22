import { describe, expect, it } from 'vitest';
import { QUOTES, quoteForDay } from '../quotes';

describe('quoteForDay', () => {
  it('is stable for a given day', () => {
    // It must not reshuffle while you are using the app.
    const a = quoteForDay('2026-08-22');
    const b = quoteForDay('2026-08-22');
    expect(a).toEqual(b);
  });

  it('moves on over a run of days', () => {
    const days = Array.from(
      { length: 30 },
      (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`,
    );
    const seen = new Set(days.map((d) => quoteForDay(d).text));
    expect(seen.size).toBeGreaterThan(3);
  });

  it('always returns a real quote', () => {
    for (const day of ['2026-01-01', '2026-06-15', '2027-12-31']) {
      const q = quoteForDay(day);
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.who.length).toBeGreaterThan(0);
    }
  });

  it('works with a single-quote list', () => {
    const only = [{ text: 'one', who: 'someone' }];
    expect(quoteForDay('2026-08-22', only).text).toBe('one');
  });

  it('refuses an empty list rather than returning undefined', () => {
    expect(() => quoteForDay('2026-08-22', [])).toThrow();
  });
});

describe('the quote list', () => {
  it('has no duplicates', () => {
    expect(new Set(QUOTES.map((q) => q.text)).size).toBe(QUOTES.length);
  });

  it('attributes every line', () => {
    for (const q of QUOTES) expect(q.who.trim().length).toBeGreaterThan(0);
  });

  it('never scolds — this is the first thing seen on a bad day', () => {
    for (const q of QUOTES) {
      const text = q.text.toLowerCase();
      for (const word of ['lazy', 'excuse', 'pathetic', 'worthless', 'failure']) {
        expect(text).not.toContain(word);
      }
    }
  });
});
