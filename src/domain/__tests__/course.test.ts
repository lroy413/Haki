import { describe, expect, it } from 'vitest';
import {
  COURSE_PROMPT,
  MAX_HEADING,
  courseFor,
  noCourse,
  normaliseHeading,
  tomorrowNote,
  type Course,
} from '../course';
import type { DayKey } from '../date';

const TODAY = '2026-08-23' as DayKey;
const TOMORROW = '2026-08-24' as DayKey;

describe('normaliseHeading', () => {
  it('trims the ends', () => {
    expect(normaliseHeading('   ship it   ')).toBe('ship it');
  });

  it('flattens a paste into one line', () => {
    expect(normaliseHeading('finish\nthe\n\nedit')).toBe('finish the edit');
    expect(normaliseHeading('two    spaces')).toBe('two spaces');
  });

  it('clamps rather than refusing', () => {
    // Being told off by a text field at seven in the morning is worse than a
    // truncated sentence, so a long heading is trimmed and accepted.
    const long = 'a'.repeat(MAX_HEADING + 60);
    expect(normaliseHeading(long)).toHaveLength(MAX_HEADING);
  });

  it('reduces a whitespace-only heading to nothing at all', () => {
    // Which is what makes "save an empty field" mean "clear it".
    expect(normaliseHeading('   \n  ')).toBe('');
  });
});

describe('courseFor', () => {
  const courses: Course[] = [
    { day: TODAY, heading: 'One long thing, properly' },
    { day: TOMORROW, heading: 'Rest, on purpose' },
  ];

  it('finds the heading for a day', () => {
    expect(courseFor(courses, TODAY)?.heading).toBe('One long thing, properly');
    expect(courseFor(courses, TOMORROW)?.heading).toBe('Rest, on purpose');
  });

  it('is null for a day with no heading, never a blank one', () => {
    expect(courseFor(courses, '2026-08-25' as DayKey)).toBeNull();
    expect(courseFor([], TODAY)).toBeNull();
  });
});

describe('tomorrowNote', () => {
  it('names a heading already set for tomorrow', () => {
    const note = tomorrowNote({ day: TOMORROW, heading: 'Rest, on purpose' }, TODAY);
    expect(note).toContain('Rest, on purpose');
  });

  it('says nothing about today, or about any other day', () => {
    expect(tomorrowNote({ day: TODAY, heading: 'x' }, TODAY)).toBeNull();
    expect(tomorrowNote({ day: '2026-09-01' as DayKey, heading: 'x' }, TODAY)).toBeNull();
    expect(tomorrowNote(null, TODAY)).toBeNull();
  });
});

describe('what it says', () => {
  it('agrees with whatever the card calls it', () => {
    expect(noCourse('Course')).toBe('No course set');
    expect(noCourse('Intention')).toBe('No intention set');
  });

  it('never turns an unset course into a reproach', () => {
    const copy = [noCourse('Course'), noCourse('Intention'), COURSE_PROMPT]
      .join(' ')
      .toLowerCase();
    for (const word of ['failed', 'should', 'lazy', 'behind', 'finally', 'forgot', 'missed']) {
      expect(copy).not.toContain(word);
    }
  });

  it('does not ask a question, because an empty morning is not a prompt', () => {
    expect(noCourse('Course')).not.toContain('?');
    expect(COURSE_PROMPT).not.toContain('?');
  });
});
