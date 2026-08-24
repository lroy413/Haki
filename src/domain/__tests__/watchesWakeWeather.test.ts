import { describe, expect, it } from 'vitest';
import { WATCHES, WATCH_ORDER, byWatch, islandWake, isWatch, wakeLine } from '../tasks';
import { WEATHER_WORDS, isWeatherWord } from '../weather';

/* ------------------------------------------------------------- the watches */

describe('the watches', () => {
  it('runs morning to evening, each named once', () => {
    expect(WATCH_ORDER).toEqual(['morning', 'afternoon', 'evening']);
    for (const w of WATCH_ORDER) expect(WATCHES[w].label).toContain('watch');
  });

  it('recognises its own keys and nothing else', () => {
    for (const w of WATCH_ORDER) expect(isWatch(w)).toBe(true);
    expect(isWatch('night')).toBe(false);
    expect(isWatch('')).toBe(false);
  });

  it('groups in watch order with the unplaced last', () => {
    const rows = [
      { id: 1, watch: null },
      { id: 2, watch: 'evening' as const },
      { id: 3, watch: 'morning' as const },
      { id: 4, watch: 'morning' as const },
    ];
    const groups = byWatch(rows);
    expect(groups.map((g) => g.watch)).toEqual(['morning', 'evening', null]);
    expect(groups[0].items.map((r) => r.id)).toEqual([3, 4]);
  });

  it('shows one plain group when nothing carries a watch', () => {
    // The exact list the screen drew before watches existed: no headings
    // materialise until something actually uses one.
    const groups = byWatch([{ watch: null }, { watch: null }]);
    expect(groups).toHaveLength(1);
    expect(groups[0].watch).toBeNull();
  });

  it('never manufactures an empty group', () => {
    const groups = byWatch([{ watch: 'afternoon' as const }]);
    expect(groups).toHaveLength(1);
    for (const g of groups) expect(g.items.length).toBeGreaterThan(0);
  });
});

/* -------------------------------------------------------- the island's wake */

describe("the island's wake", () => {
  const tasks = [
    { islandKey: 7, doneAt: 100, minutes: 30 },
    { islandKey: 7, doneAt: 200, minutes: 45 },
    { islandKey: 7, doneAt: null, minutes: 60 }, // still open — not wake
    { islandKey: 9, doneAt: 300, minutes: 15 }, // another island
    { islandKey: null, doneAt: 400, minutes: 15 }, // ordinary task
  ];

  it('counts only what was struck under this island', () => {
    expect(islandWake(tasks, 7)).toEqual({ struck: 2, minutes: 75 });
    expect(islandWake(tasks, 9)).toEqual({ struck: 1, minutes: 15 });
    expect(islandWake(tasks, 1)).toEqual({ struck: 0, minutes: 0 });
  });

  it('says the wake as counts, or says nothing', () => {
    expect(wakeLine({ struck: 2, minutes: 75 })).toBe('2 struck · 1h 15m in its wake');
    expect(wakeLine({ struck: 1, minutes: 0 })).toBe('1 struck');
    // An empty wake is not reported — a record shows what is astern, and
    // six "nothing yet"s on a screen about work is a scoreboard of absences.
    expect(wakeLine({ struck: 0, minutes: 0 })).toBeNull();
  });

  it('never speaks a denominator', () => {
    for (const wake of [
      { struck: 1, minutes: 20 },
      { struck: 14, minutes: 380 },
    ]) {
      const line = wakeLine(wake);
      expect(line).not.toBeNull();
      expect(line).not.toMatch(/of |\/|%/);
    }
  });
});

/* ------------------------------------------------------------- the weather */

describe('naming the weather', () => {
  it('offers eight words of sea weather', () => {
    expect(WEATHER_WORDS).toHaveLength(8);
    expect(new Set(WEATHER_WORDS).size).toBe(8);
  });

  it('recognises its own words and nothing else', () => {
    for (const w of WEATHER_WORDS) expect(isWeatherWord(w)).toBe(true);
    expect(isWeatherWord('Sad')).toBe(false);
    expect(isWeatherWord('')).toBe(false);
  });

  it('carries no verdicts', () => {
    // Sea weather, not assessment language. None of these words may drift
    // into the clinical or the judgemental.
    for (const word of WEATHER_WORDS) {
      const lower = word.toLowerCase();
      for (const banned of ['bad', 'good', 'depress', 'anxi', 'fail', 'low', 'poor']) {
        expect(lower, `${word} vs "${banned}"`).not.toContain(banned);
      }
    }
  });
});
