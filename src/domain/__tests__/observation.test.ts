import { describe, expect, it } from 'vitest';
import {
  SAT_COUNTS_FROM,
  WINDOW_DAYS,
  observation,
  satDays,
  stateMessage,
  stateName,
  type ObservationDay,
  type ObservationState,
} from '../observation';
import { addDays, type DayKey } from '../date';

const TODAY = '2026-08-23' as DayKey;
const sat = (n: number, minutes = 10): ObservationDay[] =>
  Array.from({ length: n }, (_, i) => ({ day: addDays(TODAY, -i), satMinutes: minutes }));

const STATES: ObservationState[] = ['unread', 'clouded', 'open', 'clear', 'sharp'];

describe('satDays', () => {
  it('counts a day once, however many times it was sat', () => {
    const twice = [
      { day: TODAY, satMinutes: 10 },
      { day: TODAY, satMinutes: 15 },
    ];
    expect(satDays(twice, TODAY)).toBe(1);
  });

  it('starts counting at the shortest sit on offer', () => {
    expect(satDays([{ day: TODAY, satMinutes: SAT_COUNTS_FROM - 1 }], TODAY)).toBe(0);
    expect(satDays([{ day: TODAY, satMinutes: SAT_COUNTS_FROM }], TODAY)).toBe(1);
  });

  it('does not pay by the minute', () => {
    // Fifteen minutes is the same act as five, held longer.
    expect(satDays(sat(6, 5), TODAY)).toBe(satDays(sat(6, 45), TODAY));
  });

  it('ignores days outside the window and in the future', () => {
    expect(satDays([{ day: addDays(TODAY, -WINDOW_DAYS), satMinutes: 20 }], TODAY)).toBe(0);
    expect(satDays([{ day: addDays(TODAY, 1), satMinutes: 20 }], TODAY)).toBe(0);
  });
});

describe('clarity is what lets you use it', () => {
  it('says nothing at all without a Daily Read', () => {
    // There is no reading to report. Silence rather than a guess.
    expect(observation(sat(20), null, TODAY).state).toBe('unread');
  });

  it('is clouded on a loud day however long the practice is', () => {
    // The owner's rule, and canon's: Observation only works in clarity.
    expect(observation(sat(28), 1, TODAY).state).toBe('clouded');
    expect(observation(sat(0), 1, TODAY).state).toBe('clouded');
  });

  it('reaches further on the same practice when the head is clear', () => {
    const days = sat(14);
    const dim = observation(days, 2, TODAY);
    const bright = observation(days, 5, TODAY);
    expect(STATES.indexOf(bright.state)).toBeGreaterThan(STATES.indexOf(dim.state));
    // The practice itself is unchanged — only what can be done with it.
    expect(bright.depth).toBe(dim.depth);
    expect(bright.satDays).toBe(dim.satDays);
  });

  it('never lets a clear head stand in for the practice', () => {
    // Perfect clarity and no sitting is not sharp.
    expect(observation([], 5, TODAY).state).not.toBe('sharp');
  });

  it('reports the practice and the condition separately', () => {
    const o = observation(sat(7), 4, TODAY);
    expect(o.satDays).toBe(7);
    expect(o.depth).toBeCloseTo(7 / WINDOW_DAYS, 5);
    expect(o.clarity).toBeCloseTo(0.75, 5);
  });

  it('clamps a dial that is out of range rather than trusting it', () => {
    expect(observation(sat(10), 99, TODAY).clarity).toBe(1);
    expect(observation(sat(10), -4, TODAY).clarity).toBe(0);
  });
});

describe('what it says', () => {
  it('names every state', () => {
    for (const state of STATES) expect(stateName(state).length).toBeGreaterThan(0);
  });

  it('names which half is the limit, rather than only that something is', () => {
    // The sentence most apps cannot say: the practice is fine, today isn't.
    const practised = stateMessage(observation(sat(20), 1, TODAY)).toLowerCase();
    expect(practised).toContain('practice is there');
    expect(practised).toContain('today is loud');

    const unpractised = stateMessage(observation([], 4, TODAY)).toLowerCase();
    expect(unpractised).toContain('sitting');
  });

  it('never shames, in any state', () => {
    const cases = [
      observation([], null, TODAY),
      observation([], 1, TODAY),
      observation(sat(28), 1, TODAY),
      observation(sat(2), 4, TODAY),
      observation(sat(14), 5, TODAY),
      observation(sat(28), 5, TODAY),
    ];
    for (const o of cases) {
      const text = `${stateName(o.state)} ${stateMessage(o)}`.toLowerCase();
      for (const word of ['failed', 'should', 'lazy', 'behind', 'finally', 'missed']) {
        expect(text).not.toContain(word);
      }
    }
  });

  it('treats a loud day as a day and not a verdict', () => {
    expect(stateMessage(observation(sat(20), 1, TODAY))).toContain('not a verdict');
  });
});
