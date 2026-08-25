import { describe, expect, it } from 'vitest';
import {
  FLAG_MAX,
  FLAG_TARGET,
  VALUE_MAX_CHARS,
  flagAtSail,
  flagCheck,
  flagRoom,
  normaliseValue,
} from '../flag';
import { asternLine, asternOn, type PastEntry } from '../astern';
import {
  formatSounding,
  latest,
  newestFirst,
  normaliseUnit,
  parseSounding,
  shape,
  soundingLine,
  type Sounding,
} from '../soundings';

/* ---------------------------------------------------------------- the flag */

describe('the flag', () => {
  it('runs three to five', () => {
    expect(FLAG_TARGET).toBe(3);
    expect(FLAG_MAX).toBe(5);
  });

  it('describes the room it has left without ever making a fraction of it', () => {
    for (const count of [0, 1, 2, 3, 4, 5]) {
      const { note } = flagRoom(count);
      expect(note, `count ${count}`).not.toMatch(/\d+\s*(of|\/)\s*\d+|%/);
    }
    expect(flagRoom(0).canAdd).toBe(true);
    expect(flagRoom(4).canAdd).toBe(true);
    expect(flagRoom(FLAG_MAX).canAdd).toBe(false);
  });

  it('asks a question and never gives an instruction', () => {
    for (const plain of [false, true]) {
      const asked = flagCheck(3, plain);
      expect(asked).not.toBeNull();
      expect(asked).toContain('?');
      for (const word of ['should', 'must', 'need to', 'make sure']) {
        expect(asked?.toLowerCase(), word).not.toContain(word);
      }
    }
  });

  it('says nothing at all when no flag has been raised', () => {
    // A question about a flag that does not exist is a prompt to make one,
    // in the middle of doing something else.
    expect(flagCheck(0)).toBeNull();
    expect(flagAtSail(0)).toBeNull();
  });

  it('keeps a value short and single-spaced', () => {
    expect(normaliseValue('  finish   what   I start  ')).toBe('finish what I start');
    expect(normaliseValue('x'.repeat(200))).toHaveLength(VALUE_MAX_CHARS);
  });

  it('never speaks of a value as done, kept or broken', () => {
    const lines = [
      ...[0, 1, 2, 3, 4, 5].flatMap((n) => [flagRoom(n, false).note, flagRoom(n, true).note]),
      flagCheck(3, false),
      flagCheck(3, true),
      flagAtSail(3, false),
      flagAtSail(3, true),
    ].filter((l): l is string => l !== null);
    for (const line of lines) {
      for (const word of ['done', 'complete', 'kept', 'broken', 'failed', 'streak', 'score']) {
        expect(line.toLowerCase(), `"${line}" contains "${word}"`).not.toContain(word);
      }
    }
  });
});

/* ------------------------------------------------------------ astern in the log */

describe('astern in the log', () => {
  const e = (id: number, day: string, body: string): PastEntry => ({ id, day, body });

  it('finds this date in an earlier year', () => {
    const found = asternOn([e(1, '2025-08-24', 'The first island.')], '2026-08-24');
    expect(found?.entry.id).toBe(1);
    expect(found?.years).toBe(1);
  });

  it('says nothing when the log is younger than a year', () => {
    // The ordinary case for most of the first year, and it is silence rather
    // than an empty card.
    expect(asternOn([e(1, '2026-08-01', 'Recent.')], '2026-08-24')).toBeNull();
    expect(asternOn([], '2026-08-24')).toBeNull();
  });

  it('ignores a different date and an empty body', () => {
    expect(asternOn([e(1, '2025-08-23', 'A day out.')], '2026-08-24')).toBeNull();
    expect(asternOn([e(1, '2025-08-24', '   ')], '2026-08-24')).toBeNull();
  });

  it('prefers the most recent qualifying year', () => {
    const found = asternOn(
      [e(1, '2021-08-24', 'Five years back.'), e(2, '2025-08-24', 'Last year.')],
      '2026-08-24',
    );
    expect(found?.entry.id).toBe(2);
    expect(found?.years).toBe(1);
  });

  it('takes the longest entry when a day holds several', () => {
    const found = asternOn(
      [
        e(1, '2025-08-24', 'Short.'),
        e(2, '2025-08-24', 'A much longer thing, worth re-reading.'),
      ],
      '2026-08-24',
    );
    expect(found?.entry.id).toBe(2);
  });

  it('handles a leap day without inventing one', () => {
    expect(asternOn([e(1, '2024-02-29', 'Leap.')], '2025-02-28')).toBeNull();
    expect(asternOn([e(1, '2024-02-29', 'Leap.')], '2028-02-29')?.years).toBe(4);
  });

  it('states the distance and nothing else', () => {
    expect(asternLine(1)).toBe('A year ago today, you wrote:');
    expect(asternLine(3)).toBe('3 years ago today, you wrote:');
    for (const years of [1, 2, 7]) {
      const line = asternLine(years).toLowerCase();
      for (const word of ['already', 'still', 'only', 'streak', 'congratul', '!']) {
        expect(line, word).not.toContain(word);
      }
    }
  });
});

/* -------------------------------------------------------------- soundings */

describe('soundings', () => {
  const s = (id: number, value: number, createdAt: number): Sounding => ({
    id,
    islandKey: 1,
    value,
    day: '2026-08-24',
    createdAt,
  });

  it('reads a number typed in a hurry', () => {
    expect(parseSounding('82.4')).toBe(82.4);
    expect(parseSounding(' 82,4 ')).toBe(82.4);
    expect(parseSounding('1 200')).toBe(1200);
    expect(parseSounding('-3')).toBe(-3);
    expect(parseSounding('')).toBeNull();
    expect(parseSounding('lots')).toBeNull();
    expect(parseSounding('1.2.3')).toBeNull();
  });

  it('formats a reading without a scale’s opinion', () => {
    expect(formatSounding(82, 'kg')).toBe('82 kg');
    expect(formatSounding(82.4, 'kg')).toBe('82.4 kg');
    expect(formatSounding(82.4, null)).toBe('82.4');
    expect(formatSounding(1200, 'words')).toBe('1200 words');
  });

  it('keeps a unit short', () => {
    expect(normaliseUnit('  kg  ')).toBe('kg');
    expect(normaliseUnit('x'.repeat(50))).toHaveLength(12);
  });

  it('orders by when it was taken', () => {
    const all = [s(1, 10, 100), s(2, 20, 300), s(3, 15, 200)];
    expect(newestFirst(all).map((x) => x.id)).toEqual([2, 3, 1]);
    expect(latest(all)?.id).toBe(2);
    expect(latest([])).toBeNull();
  });

  it('draws a shape, oldest to newest, normalised to its own range', () => {
    const points = shape([s(1, 10, 100), s(2, 20, 200), s(3, 15, 300)]);
    expect(points.map((p) => p.x)).toEqual([0, 0.5, 1]);
    // y is flipped for drawing: the largest value sits at the top of the box.
    expect(points[1].y).toBe(0);
    expect(points[0].y).toBe(1);
  });

  it('puts a flat run and a lone reading on the middle line', () => {
    // A single point pinned to the top of its box reads as a maximum, and a
    // flat week pinned to the bottom reads as a failure. Neither is a claim
    // this module is allowed to make.
    expect(shape([s(1, 5, 100)])).toEqual([{ x: 0.5, y: 0.5 }]);
    expect(shape([s(1, 5, 100), s(2, 5, 200)]).map((p) => p.y)).toEqual([0.5, 0.5]);
    expect(shape([])).toEqual([]);
  });

  it('counts the readings and says nothing about the gap between them', () => {
    for (const [count, expected] of [
      [0, 'No soundings yet'],
      [1, 'One sounding.'],
      [4, '4 soundings.'],
    ] as const) {
      expect(soundingLine(count)).toContain(expected);
    }
    for (const count of [0, 1, 4, 40]) {
      for (const plain of [false, true]) {
        const line = soundingLine(count, plain).toLowerCase();
        for (const word of ['due', 'overdue', 'since', 'target', 'goal', 'behind', 'should']) {
          expect(line, `${count}: "${word}"`).not.toContain(word);
        }
      }
    }
  });

  it('has no opinion about which way a reading went', () => {
    // The module must be unable to say "up" or "down": savings rising and a
    // bodyweight rising are the same event here. If a later pass adds a
    // helpful arrow, this is the test that should stop it.
    const rising = [s(1, 10, 100), s(2, 20, 200)];
    const falling = [s(1, 20, 100), s(2, 10, 200)];
    expect(soundingLine(rising.length)).toBe(soundingLine(falling.length));
    expect(shape(rising).map((p) => p.x)).toEqual(shape(falling).map((p) => p.x));
    for (const set of [rising, falling]) {
      expect(formatSounding(latest(set)!.value, 'kg')).toMatch(/^\d+ kg$/);
    }
  });
});
