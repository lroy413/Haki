import { describe, expect, it } from 'vitest';
import {
  HOW_PLACEHOLDER,
  HOW_PROMPT,
  closingLine,
  dayEndOpen,
  emptyDayLine,
  headingLine,
  movedPrompt,
  openLabel,
  readBack,
} from '../dayEnd';
import type { Acts } from '../hardening';

const NOTHING: Acts = {
  course: false,
  read: false,
  entries: 0,
  struck: 0,
  trained: 0,
  gearMinutes: 0,
  satMinutes: 0,
};

describe('when it opens', () => {
  it('opens eighteen hours into the day and not before', () => {
    expect(dayEndOpen(9)).toBe(false);
    expect(dayEndOpen(17)).toBe(false);
    expect(dayEndOpen(18)).toBe(true);
    expect(dayEndOpen(22)).toBe(true);
    expect(dayEndOpen(23)).toBe(true);
  });

  it('counts from the day boundary, not from midnight', () => {
    // The owner's own example: a day that starts at four opens its end at
    // ten at night, and one in the morning is still that day's evening.
    expect(dayEndOpen(21, 4)).toBe(false);
    expect(dayEndOpen(22, 4)).toBe(true);
    expect(dayEndOpen(1, 4)).toBe(true);
    expect(dayEndOpen(3, 4)).toBe(true);
    expect(dayEndOpen(4, 4)).toBe(false);
  });

  it('closes when the day turns over', () => {
    // Under the midnight boundary one in the morning is tomorrow: the day
    // the door would close has gone, and the new one has barely started.
    expect(dayEndOpen(0)).toBe(false);
    expect(dayEndOpen(1)).toBe(false);
  });
});

describe('the day, read back', () => {
  it('lists only what happened', () => {
    const lines = readBack({ ...NOTHING, read: true, struck: 3, satMinutes: 12 });
    expect(lines).toEqual(['The read was taken', '3 tasks struck', '12 minutes sat']);
  });

  it('says nothing at all about a day with nothing in it', () => {
    // The empty line is the screen's job, not this function's — an empty list
    // is an empty list, and inventing "0 tasks struck" here is exactly the
    // audit the screen refuses to render.
    expect(readBack(NOTHING)).toEqual([]);
  });

  it('gets its singulars right', () => {
    const one = readBack({ ...NOTHING, struck: 1, trained: 1, entries: 1 });
    expect(one).toEqual(['1 task struck', '1 session logged', '1 entry written']);
  });

  it('never grades, totals, or compares', () => {
    const copy = readBack({
      ...NOTHING,
      read: true,
      struck: 4,
      trained: 1,
      gearMinutes: 30,
      satMinutes: 10,
      entries: 2,
    }).join(' ');
    expect(copy).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
    expect(copy).not.toContain('%');
    for (const word of ['good', 'great', 'best', 'better', 'only', 'just']) {
      expect(copy.toLowerCase()).not.toContain(word);
    }
  });
});

describe('the tone', () => {
  const everything = [
    HOW_PROMPT,
    HOW_PLACEHOLDER,
    emptyDayLine(),
    emptyDayLine(true),
    headingLine(),
    headingLine(true),
    openLabel(1),
    openLabel(4),
    movedPrompt(null),
    movedPrompt(null, true),
    movedPrompt('2026-09-21'),
    movedPrompt('2026-09-21', true),
    closingLine(),
    closingLine(true),
  ]
    .join(' ')
    .toLowerCase();

  it('never shames', () => {
    for (const word of [
      'failed',
      'should',
      'lazy',
      'finally',
      'missed',
      'behind',
      'procrast',
      'excuse',
    ]) {
      expect(everything).not.toContain(word);
    }
  });

  it('never congratulates', () => {
    for (const word of ['well done', 'great', 'nice work', 'proud', 'crushed', 'smashed']) {
      expect(everything).not.toContain(word);
    }
  });

  it('never claims a cause or gives advice', () => {
    for (const word of ['because', 'you should', 'try to', 'make sure', 'next time']) {
      expect(everything).not.toContain(word);
    }
  });

  it('asks rather than tells, where it asks at all', () => {
    expect(HOW_PROMPT).toContain('?');
    expect(movedPrompt(null)).toContain('?');
    expect(movedPrompt('2026-09-21')).toContain('?');
  });
});

describe('the empty day', () => {
  it('offers rather than reporting the absence', () => {
    // The day's practice card established this: six things you have not done
    // is a checklist, six things available is a card.
    for (const plain of [false, true]) {
      const line = emptyDayLine(plain).toLowerCase();
      expect(line).toContain('still');
      expect(line).not.toContain('nothing done');
      expect(line).not.toContain('empty day');
    }
  });
});

describe('the heading', () => {
  it('is read back, never marked', () => {
    // `app/course.tsx` promises in as many words that nothing asks at the end
    // of the day whether you held it. A question here would break it.
    for (const plain of [false, true]) {
      const line = headingLine(plain).toLowerCase();
      expect(line).not.toContain('?');
      expect(line).not.toContain('did you');
      expect(line).not.toContain('held');
      expect(line).not.toContain('kept');
    }
  });
});
