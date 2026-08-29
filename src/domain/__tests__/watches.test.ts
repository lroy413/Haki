import { describe, expect, it } from 'vitest';
import {
  BANDS,
  DAY_CLOSES,
  DAY_OPENS,
  WATCH_STARTS,
  manifest,
  sunAt,
  watchAt,
  watchLine,
  watchName,
} from '../watches';
import { WATCH_ORDER, type Watch } from '../tasks';

const task = (watch: Watch | null, minutes: number) => ({ watch, minutes });

describe('which watch it is', () => {
  it('runs morning, afternoon, evening across the working day', () => {
    expect(watchAt(6)).toBe('morning');
    expect(watchAt(11)).toBe('morning');
    expect(watchAt(12)).toBe('afternoon');
    expect(watchAt(16)).toBe('afternoon');
    expect(watchAt(17)).toBe('evening');
    expect(watchAt(23)).toBe('evening');
  });

  it('gives the small hours to the evening, not to the next morning', () => {
    // Somebody still working at one in the morning is in tonight's evening
    // watch. The voyage's day boundary decides which day the act lands on;
    // this only decides which band of the day it is.
    expect(watchAt(0)).toBe('evening');
    expect(watchAt(2)).toBe('evening');
    expect(watchAt(4)).toBe('evening');
    expect(watchAt(5)).toBe('morning');
  });

  it('takes an hour outside the clock without breaking', () => {
    expect(watchAt(25)).toBe(watchAt(1));
    expect(watchAt(-1)).toBe(watchAt(23));
  });
});

describe('the bands', () => {
  it('covers the strip end to end, in order, with no gaps', () => {
    expect(BANDS.map((b) => b.watch)).toEqual(WATCH_ORDER);
    expect(BANDS[0].from).toBe(0);
    expect(BANDS[BANDS.length - 1].to).toBe(1);
    for (let i = 1; i < BANDS.length; i += 1) {
      expect(BANDS[i].from).toBeCloseTo(BANDS[i - 1].to);
    }
  });

  it('agrees with the hours the watches actually start at', () => {
    const span = DAY_CLOSES - DAY_OPENS;
    for (const band of BANDS) {
      expect(band.from).toBeCloseTo((WATCH_STARTS[band.watch] - DAY_OPENS) / span);
    }
  });
});

describe('the sun', () => {
  it('rides from one end of the strip to the other', () => {
    expect(sunAt(DAY_OPENS)).toBe(0);
    expect(sunAt(12)).toBeGreaterThan(0);
    expect(sunAt(12)).toBeLessThan(1);
    expect(sunAt(23, 59)).toBeCloseTo(1, 1);
  });

  it('is not up before the day opens or after it closes', () => {
    expect(sunAt(2)).toBeNull();
    expect(sunAt(4, 59)).toBeNull();
    expect(sunAt(24)).toBeNull();
  });

  it('only ever moves forward through the day', () => {
    let last = -1;
    for (let h = DAY_OPENS; h < DAY_CLOSES; h += 1) {
      const at = sunAt(h) ?? -1;
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });
});

describe('the manifest', () => {
  it('always returns all three watches, empty ones included', () => {
    const m = manifest([task('morning', 30)]);
    expect(m.watches.map((w) => w.watch)).toEqual(WATCH_ORDER);
    expect(m.watches[1].items).toHaveLength(0);
  });

  it('sums each watch in minutes, and the day as a whole', () => {
    const m = manifest([
      task('morning', 30),
      task('morning', 15),
      task('evening', 60),
      task(null, 25),
    ]);
    expect(m.watches[0].minutes).toBe(45);
    expect(m.watches[2].minutes).toBe(60);
    expect(m.hold).toHaveLength(1);
    expect(m.minutes).toBe(130);
  });

  it('treats the hold as an ordinary place, not a leftover', () => {
    const m = manifest([task(null, 10), task(null, 20)]);
    expect(m.hold).toHaveLength(2);
    expect(m.minutes).toBe(30);
    // Nothing about the shape says these are late or unplanned.
    expect(m.watches.every((w) => w.items.length === 0)).toBe(true);
  });

  it('reads an empty day without inventing anything', () => {
    const m = manifest([]);
    expect(m.minutes).toBe(0);
    expect(m.hold).toHaveLength(0);
    expect(m.watches.every((w) => w.minutes === 0)).toBe(true);
  });
});

describe('what the strip says', () => {
  it('offers open water rather than reporting an empty watch', () => {
    const empty = { watch: 'afternoon' as Watch, items: [], minutes: 0 };
    expect(watchLine(empty)).toBe('Open water');
    for (const word of ['no ', 'nothing', 'empty', 'yet']) {
      expect(watchLine(empty).toLowerCase()).not.toContain(word);
    }
  });

  it('counts what is placed, and never against a capacity', () => {
    const one = { watch: 'morning' as Watch, items: [task('morning', 30)], minutes: 30 };
    expect(watchLine(one)).toBe('1 thing');
    const three = { watch: 'morning' as Watch, items: [1, 2, 3], minutes: 90 };
    expect(watchLine(three)).toBe('3 things');
    // No denominator anywhere in the line.
    expect(watchLine(three)).not.toContain('/');
    expect(watchLine(three)).not.toContain('%');
  });

  it('swaps its vocabulary in plain mode', () => {
    expect(watchName('morning', true)).not.toContain('watch');
    expect(watchName('morning')).toContain('watch');
    expect(watchLine({ watch: 'evening', items: [], minutes: 0 }, true)).toBe('Nothing placed');
  });
});
