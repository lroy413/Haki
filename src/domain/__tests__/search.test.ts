import { describe, expect, it } from 'vitest';
import { MIN_QUERY, excerpt, foundLine, isSearching, matches } from '../search';
import { recentWeather, skyEmptyLine, skyLine, WEATHER_WORDS } from '../weather';
import type { DayKey } from '../date';

describe('finding a line', () => {
  it('waits for something worth searching for', () => {
    // One letter matches everything you ever wrote.
    expect(MIN_QUERY).toBeGreaterThan(1);
    expect(isSearching('a')).toBe(false);
    expect(isSearching('  ')).toBe(false);
    expect(isSearching('de')).toBe(true);
  });

  it('does not care about case, and trims the query', () => {
    expect(matches('The Dentist on Thursday', 'dentist')).toBe(true);
    expect(matches('The dentist on Thursday', '  DENTIST ')).toBe(true);
    expect(matches('nothing here', 'dentist')).toBe(false);
  });

  it('matches nothing on a query too short to run', () => {
    expect(matches('anything at all', 'a')).toBe(false);
  });
});

describe('the excerpt', () => {
  const body =
    'Woke up late again and the morning went nowhere. Rang the dentist about the ' +
    'thing in March and they can do the fourteenth, which is fine. Then a long ' +
    'afternoon of nothing much.';

  it('shows the sentence the word is in, not the first line', () => {
    const piece = excerpt(body, 'dentist');
    expect(piece).not.toBeNull();
    if (!piece) return;
    expect(piece.hit).toBe('dentist');
    expect(piece.before).toContain('Rang the');
    expect(piece.after).toContain('March');
    // Both ends were cut, so both carry the mark.
    expect(piece.before.startsWith('…')).toBe(true);
    expect(piece.after.endsWith('…')).toBe(true);
  });

  it('cuts on whole words', () => {
    const piece = excerpt(body, 'dentist');
    if (!piece) return;
    // "…he dentist appointmen…" reads as a rendering fault rather than as an
    // excerpt, so each edge is pulled out to a space.
    expect(piece.before).not.toMatch(/…\w/);
    expect(piece.after).not.toMatch(/\w…/);
  });

  it('marks neither end when nothing was cut', () => {
    const piece = excerpt('Rang the dentist.', 'dentist');
    if (!piece) return;
    expect(piece.before).toBe('Rang the ');
    expect(piece.after).toBe('.');
  });

  it('flattens the whitespace, because an entry is full of newlines', () => {
    const piece = excerpt('One line.\n\nThen the dentist.\n\nThen more.', 'dentist');
    if (!piece) return;
    expect(`${piece.before}${piece.hit}${piece.after}`).not.toContain('\n');
  });

  it('keeps the match as it was typed in the text, not as it was queried', () => {
    const piece = excerpt('Rang the Dentist.', 'dentist');
    expect(piece?.hit).toBe('Dentist');
  });

  it('returns nothing rather than an empty result row', () => {
    expect(excerpt('nothing here', 'dentist')).toBeNull();
    expect(excerpt('anything', 'a')).toBeNull();
  });
});

describe('what the count says', () => {
  it('is a fact about a query and never about the archive', () => {
    const copy = [foundLine(0), foundLine(1), foundLine(9), foundLine(0, true)].join(' ');
    expect(copy).not.toMatch(/\bof\b|\/|%/);
    expect(copy).not.toMatch(/\b(only|just|no more)\b/i);
  });

  it('says nothing found without saying nothing is there', () => {
    expect(foundLine(0)).toBe('Nothing with that in it.');
  });
});

describe('inner weather', () => {
  const days = ['2026-09-20', '2026-09-21', '2026-09-22'] as DayKey[];

  it('keeps an unnamed morning as a gap, never as Calm', () => {
    const run = recentWeather([{ day: '2026-09-21', weather: 'Fog' }], days);
    expect(run.map((s) => s.word)).toEqual([null, 'Fog', null]);
  });

  it('runs oldest first, in the order the days came', () => {
    const run = recentWeather(
      [
        { day: '2026-09-22', weather: 'Squall' },
        { day: '2026-09-20', weather: 'Bright' },
      ],
      days,
    );
    expect(run.map((s) => s.day)).toEqual(days);
    expect(run.map((s) => s.word)).toEqual(['Bright', null, 'Squall']);
  });

  it('refuses a word it does not know', () => {
    // The column is free text and a backup is data from outside.
    const run = recentWeather([{ day: '2026-09-20', weather: 'Miserable' }], days);
    expect(run[0].word).toBeNull();
  });

  it('never summarises, ranks or counts the run', () => {
    const run = recentWeather(
      WEATHER_WORDS.slice(0, 3).map((w, i) => ({ day: days[i], weather: w })),
      days,
    );
    const copy = [skyLine(run), skyLine(run, true), skyEmptyLine(), skyEmptyLine(true)].join(
      ' ',
    );
    expect(copy).not.toMatch(/\b(most|often|usually|average|trend|clearing|improving)\b/i);
    expect(copy).not.toMatch(/\d/);
  });

  it('says nothing at all until a word has been given', () => {
    expect(skyLine(recentWeather([], days))).toBeNull();
    // And what stands in is an offer rather than an absence.
    expect(skyEmptyLine()).toMatch(/shows up here/);
  });
});
