import { describe, expect, it } from 'vitest';
import { MAX_TEXT, emptyLine, isSayable, newestFirst, type Mark } from '../headway';
import { pastDay } from '../training';

let stamp = 1000;
function mark(day: string, text = 'Filled in as main cam op'): Mark {
  stamp += 1;
  return { id: stamp, roadKey: 1, text, day, createdAt: stamp };
}

describe('the list', () => {
  it('puts the newest day first', () => {
    const marks = [mark('2026-08-20'), mark('2026-09-02'), mark('2026-08-28')];
    expect(newestFirst(marks).map((m) => m.day)).toEqual([
      '2026-09-02',
      '2026-08-28',
      '2026-08-20',
    ]);
  });

  it('breaks a tie on the same day by what was written last', () => {
    const first = mark('2026-09-02', 'Ran audio');
    const second = mark('2026-09-02', 'Filled in');
    expect(newestFirst([first, second]).map((m) => m.text)).toEqual(['Filled in', 'Ran audio']);
  });

  it('leaves the list it was handed alone', () => {
    const marks = [mark('2026-08-20'), mark('2026-09-02')];
    const before = marks.map((m) => m.day);
    newestFirst(marks);
    expect(marks.map((m) => m.day)).toEqual(before);
  });
});

describe('what can be written', () => {
  it('needs a word, and whitespace is not one', () => {
    expect(isSayable('Filled in')).toBe(true);
    expect(isSayable('')).toBe(false);
    expect(isSayable('   ')).toBe(false);
  });

  it('is one line, not an entry', () => {
    // Long enough for the owner's own example, short enough that the words
    // about how it felt still belong in the journal.
    expect(MAX_TEXT).toBeGreaterThan('Filled in as main cam op on the show'.length);
    expect(MAX_TEXT).toBeLessThan(200);
  });
});

describe('the day it happened', () => {
  const today = '2026-09-03';

  it('takes yesterday, because that is when this gets written up', () => {
    expect(pastDay('2', today)).toBe('2026-09-02');
  });

  it('refuses a day that has not happened', () => {
    expect(pastDay('2026-09-04', today)).toBeNull();
  });

  it('defaults to today when nothing is typed', () => {
    expect(pastDay('', today)).toBe(today);
  });
});

describe('the copy', () => {
  const lines = [emptyLine(), emptyLine(true)];

  it('offers rather than reporting an absence', () => {
    expect(emptyLine()).toMatch(/counts/);
    expect(emptyLine(true)).toMatch(/counts/);
  });

  it('never scolds, congratulates, or counts', () => {
    for (const line of lines) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'should',
        'lazy',
        'finally',
        'well done',
        'streak',
        'so far',
        'total',
      ]) {
        expect(text, `"${line}" says ${word}`).not.toContain(word);
      }
      // No figure anywhere: a mark you cannot decide to have more of must
      // never be shown as a number.
      expect(line, `"${line}" carries a figure`).not.toMatch(/\d/);
    }
  });

  it('says planned or not, without grading either', () => {
    const said = lines.join(' ').toLowerCase();
    expect(said).toContain('planned');
    for (const word of ['lucky', 'luck', 'earned', 'deserved']) {
      expect(said, `says ${word}`).not.toContain(word);
    }
  });
});
