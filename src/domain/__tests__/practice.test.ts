import { describe, expect, it } from 'vitest';
import { dayMessage, practice, seaState, type PracticeKey } from '../practice';
import { NO_ACTS, type Acts, type HardeningLevel } from '../hardening';

const acts = (over: Partial<Acts> = {}): Acts => ({ ...NO_ACTS, ...over });
const byKey = (items: ReturnType<typeof practice>, key: PracticeKey) =>
  items.find((i) => i.key === key)!;

const LEVELS: HardeningLevel[] = [0, 1, 2, 3];

describe('the six', () => {
  it('covers every practice exactly once', () => {
    const keys = practice(NO_ACTS).map((p) => p.key);
    expect(keys).toEqual(['course', 'read', 'stillness', 'logbook', 'strike', 'gear']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('gives each one somewhere to go', () => {
    for (const item of practice(NO_ACTS)) {
      expect(item.route.startsWith('/')).toBe(true);
    }
  });

  it('is entirely undone on an untouched day', () => {
    expect(practice(NO_ACTS).every((p) => !p.done)).toBe(true);
  });
});

describe('an untouched practice shows its offer, not its absence', () => {
  it('says what a thing would be rather than that it has not happened', () => {
    // This is the whole difference between this card and a habit tracker.
    const items = practice(NO_ACTS);
    expect(byKey(items, 'stillness').line).toBe('5, 10 or 15');
    expect(byKey(items, 'read').line).toBe('30 seconds');
    expect(byKey(items, 'logbook').line).toBe('One entry');
    expect(byKey(items, 'gear').line).toBe('25 minutes');
  });

  it('never phrases an undone practice as a lack', () => {
    for (const item of practice(NO_ACTS)) {
      const line = item.line.toLowerCase();
      for (const word of ['not yet', 'none', 'missing', 'no ', 'never']) {
        expect(line).not.toContain(word);
      }
      // A standalone zero is a lack with a number on it. "30 seconds" is not.
      expect(line).not.toMatch(/\b0\b/);
    }
  });
});

describe('a practice that has happened shows what happened', () => {
  it('counts entries, strikes and minutes', () => {
    const items = practice(
      acts({
        course: true,
        read: true,
        entries: 2,
        struck: 3,
        gearMinutes: 50,
        satMinutes: 12,
      }),
    );
    expect(byKey(items, 'course')).toMatchObject({ done: true, line: 'Set' });
    expect(byKey(items, 'read')).toMatchObject({ done: true, line: 'Logged' });
    expect(byKey(items, 'stillness')).toMatchObject({ done: true, line: '12 min' });
    expect(byKey(items, 'logbook')).toMatchObject({ done: true, line: '2 entries' });
    expect(byKey(items, 'strike')).toMatchObject({ done: true, line: '3 struck' });
    expect(byKey(items, 'gear')).toMatchObject({ done: true, line: '50 min' });
  });

  it('says "1 entry", not "1 entries"', () => {
    expect(byKey(practice(acts({ entries: 1 })), 'logbook').line).toBe('1 entry');
  });

  it('counts a sit that was cut short, because those minutes happened', () => {
    // Hardening only pays for five minutes; the card still shows the two.
    const item = byKey(practice(acts({ satMinutes: 2 })), 'stillness');
    expect(item.done).toBe(true);
    expect(item.line).toBe('2 min');
  });
});

describe('plain mode', () => {
  it('drops every glyph, exactly like a tab does', () => {
    expect(practice(NO_ACTS, true).every((p) => p.kanji === '')).toBe(true);
    expect(practice(NO_ACTS, false).every((p) => p.kanji.length > 0)).toBe(true);
  });

  it('swaps the in-world names for plain ones', () => {
    const plain = practice(NO_ACTS, true);
    expect(byKey(plain, 'stillness').label).toBe('Meditation');
    expect(byKey(plain, 'course').label).toBe('Intention');
    expect(byKey(plain, 'logbook').label).toBe('Journal');
  });

  it('keeps the same six practices in the same order', () => {
    expect(practice(NO_ACTS, true).map((p) => p.key)).toEqual(
      practice(NO_ACTS, false).map((p) => p.key),
    );
  });
});

describe('dayMessage', () => {
  it('has something to say at every level', () => {
    for (const level of LEVELS) expect(dayMessage(level).length).toBeGreaterThan(0);
  });

  it('tells an unhardened day what would change it, not what is missing', () => {
    expect(dayMessage(0).toLowerCase()).toContain('any of these');
  });

  it('closes the loop at the top rather than dangling a next thing', () => {
    // Making a mechanic visible invites farming it. There is no fifth palette.
    expect(dayMessage(3).toLowerCase()).toContain('nothing left to darken');
  });

  it('never scores the day', () => {
    for (const level of LEVELS) {
      const message = dayMessage(level);
      expect(message).not.toMatch(/\d+\s*(of|\/)\s*\d+/);
      expect(message).not.toContain('%');
    }
  });

  it('never shames', () => {
    for (const level of LEVELS) {
      const lower = dayMessage(level).toLowerCase();
      for (const word of ['failed', 'should', 'lazy', 'behind', 'finally', 'wasted']) {
        expect(lower).not.toContain(word);
      }
    }
  });
});

describe('seaState', () => {
  it('names every level', () => {
    for (const level of LEVELS) expect(seaState(level).length).toBeGreaterThan(0);
  });

  it('reads an unused morning as a ship about to leave, not one that failed', () => {
    expect(seaState(0)).toBe('At anchor');
    for (const level of LEVELS) {
      const lower = seaState(level).toLowerCase();
      for (const word of ['adrift', 'becalmed', 'stuck', 'sinking', 'stranded', 'lost']) {
        expect(lower).not.toContain(word);
      }
    }
  });

  it('never turns the ship into a score', () => {
    for (const level of LEVELS) {
      expect(seaState(level)).not.toMatch(/\d/);
      expect(seaState(level)).not.toContain('%');
    }
  });
});

describe('the copy on the tiles', () => {
  it('never shames, in either mode, done or not', () => {
    const populated = acts({
      course: true,
      read: true,
      entries: 1,
      struck: 1,
      gearMinutes: 25,
      satMinutes: 5,
    });
    for (const plain of [false, true]) {
      for (const state of [NO_ACTS, populated]) {
        for (const item of practice(state, plain)) {
          const text = `${item.label} ${item.line}`.toLowerCase();
          for (const word of ['failed', 'should', 'lazy', 'behind', 'finally']) {
            expect(text).not.toContain(word);
          }
        }
      }
    }
  });
});
