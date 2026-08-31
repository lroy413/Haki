import { describe, expect, it } from 'vitest';
import {
  dayLine,
  dayReadings,
  recentWeather,
  settled,
  skyEmptyLine,
  skyLine,
  WEATHER_WORDS,
  type Reading,
} from '../weather';

/**
 * Inner Weather, and the day it is allowed to change on.
 *
 * The word was asked for once, on waking, and the afternoon it turned had
 * nowhere to go. The owner's reason for wanting more is the design brief and
 * also the hazard: _"I'm trying to learn to be better aware of my emotions and
 * what triggers them."_ A module that reports on somebody's emotional
 * steadiness is one bad figure away from being a scoreboard for it, so most of
 * this file is about what the run refuses to say.
 */

const morning = (word: string | null, at = 8) => (word === null ? null : { word, at });
const shift = (word: string, at: number, note = '') => ({ id: at, word, note, at });

describe('a day is a run of readings', () => {
  it('starts with the morning word and keeps the order it happened in', () => {
    const run = dayReadings(morning('Overcast'), [shift('Fog', 14), shift('Bright', 18)]);
    expect(run.map((r) => r.word)).toEqual(['Overcast', 'Fog', 'Bright']);
    expect(run[0].morning).toBe(true);
    expect(run[1].morning).toBe(false);
  });

  it('sorts by when it was taken, not by the order it was handed over', () => {
    const run = dayReadings(morning('Calm'), [shift('Heavy', 20), shift('Swell', 13)]);
    expect(run.map((r) => r.word)).toEqual(['Calm', 'Swell', 'Heavy']);
  });

  it('starts later when the morning said nothing', () => {
    // A morning with no word is a real gap and stays one. The day simply
    // begins at the first thing that was named.
    const run = dayReadings(morning(null), [shift('Fog', 15)]);
    expect(run.map((r) => r.word)).toEqual(['Fog']);
  });

  it('is empty when nothing was named at all', () => {
    expect(dayReadings(null, [])).toEqual([]);
    expect(dayReadings(morning(null), [])).toEqual([]);
  });

  it('drops a word that is not one of the eight', () => {
    // The vocabulary is the feature. A row carrying something else came from
    // an edited backup, and drawing it would put a word on the run that the
    // chips cannot produce and the reader has no key for.
    const run = dayReadings(morning('Fine'), [shift('anxious', 12), shift('Fog', 13)]);
    expect(run.map((r) => r.word)).toEqual(['Fog']);
  });

  it('carries the note on a shift, and the morning has none to carry', () => {
    const run = dayReadings(morning('Calm'), [shift('Squall', 16, 'the call ran long')]);
    expect(run[0].note).toBe('');
    expect(run[1].note).toBe('the call ran long');
  });
});

describe('what a day came to', () => {
  it('is the last thing you called it', () => {
    const run = dayReadings(morning('Heavy'), [shift('Swell', 14), shift('Calm', 19)]);
    expect(settled(run)).toBe('Calm');
  });

  it('is not the roughest', () => {
    // Taking the worst reading would make every day with one bad hour in it a
    // bad day, which is the reading this whole module exists to refuse.
    const run = dayReadings(morning('Bright'), [shift('Heavy', 13), shift('Bright', 20)]);
    expect(settled(run)).toBe('Bright');
  });

  it('is not an average, because there is nothing to average', () => {
    // `WEATHER_WORDS` is ordered settled-to-rough for layout and nothing maps
    // it to numbers. A mean of Calm and Heavy is not Overcast; it is a
    // category error with a nautical hat on.
    const run = dayReadings(morning('Calm'), [shift('Heavy', 17)]);
    expect(settled(run)).toBe('Heavy');
    expect(WEATHER_WORDS.indexOf('Overcast')).toBeGreaterThan(-1);
  });

  it('is nothing at all on a day nothing was named', () => {
    expect(settled([])).toBeNull();
  });
});

describe('the run of columns', () => {
  const days = ['2026-08-29', '2026-08-30', '2026-08-31'];

  it('shows what each day came to', () => {
    const run = recentWeather([{ day: '2026-08-31', weather: 'Overcast' }], days, [
      { day: '2026-08-31', word: 'Bright', note: '', at: 18 },
    ]);
    expect(run.map((s) => s.word)).toEqual([null, null, 'Bright']);
  });

  it('marks a day that moved, and never says how much', () => {
    const run = recentWeather(
      [
        { day: '2026-08-30', weather: 'Calm' },
        { day: '2026-08-31', weather: 'Calm' },
      ],
      days,
      [
        { day: '2026-08-31', word: 'Fog', note: '', at: 12 },
        { day: '2026-08-31', word: 'Swell', note: '', at: 15 },
        { day: '2026-08-31', word: 'Bright', note: '', at: 19 },
      ],
    );
    const [, quiet, busy] = run;
    expect(quiet.moved).toBe(false);
    expect(busy.moved).toBe(true);
    // The column carries a flag and not a figure. A day that moved three
    // times and a day that moved once are the same mark, on purpose: a count
    // there is a steadiness score, and nothing in this app keeps one.
    expect(Object.keys(busy).sort()).toEqual(['day', 'moved', 'word']);
    expect(typeof busy.moved).toBe('boolean');
  });

  it('keeps an unnamed morning as a gap rather than as Calm', () => {
    const run = recentWeather([], days, []);
    expect(run.every((s) => s.word === null && s.moved === false)).toBe(true);
    expect(skyLine(run)).toBeNull();
    // An offer, and it names both ways in: the morning read, and today.
    expect(skyEmptyLine()).toMatch(/morning read/);
    expect(skyEmptyLine()).toMatch(/name it now/i);
  });

  it('reads a day made only of shifts', () => {
    // Nothing says the morning has to have gone first — someone who opens the
    // app at four in the afternoon has a real day with a real reading in it.
    const run = recentWeather([], days, [
      { day: '2026-08-31', word: 'Restless', note: '', at: 16 },
    ]);
    expect(run[2]).toEqual({ day: '2026-08-31', word: 'Restless', moved: false });
  });
});

describe('the line under a day', () => {
  const some = (n: number): Reading[] =>
    Array.from({ length: n }, (_, i) => ({
      id: i,
      word: 'Calm' as const,
      at: i,
      note: '',
      morning: false,
    }));

  it('offers rather than reporting an absence', () => {
    expect(dayLine([])).toMatch(/whenever you notice/);
    expect(dayLine([], true)).not.toMatch(/0|none|nothing named yet\./i);
  });

  it('says the weather is allowed to change when there is one reading', () => {
    expect(dayLine(some(1))).toMatch(/allowed to change/);
  });

  it('never counts the readings', () => {
    // The number is derivable and printing it would turn a record into a
    // score for how steady the day was. Same rule `task_move` holds.
    for (const n of [0, 1, 2, 5, 12]) {
      for (const plain of [false, true]) {
        expect(dayLine(some(n), plain), `${n} readings`).not.toMatch(/\d/);
      }
    }
  });

  it('says nothing about whether the day was good', () => {
    const words = [...Array(6)].map((_, n) => `${dayLine(some(n))} ${dayLine(some(n), true)}`);
    for (const line of words) {
      expect(line).not.toMatch(/\b(better|worse|improv|unstable|steady|volatile|calm down)\b/i);
    }
  });
});
