import { describe, expect, it } from 'vitest';
import {
  BASE,
  MARGIN,
  MAX_ISLANDS,
  PER_ISLAND,
  marks,
  marksPath,
  stoneHeight,
} from '../logpose/chartMarks';

/**
 * The chart's two systems, held to what they claim.
 *
 * A stone's height is the only figure the Journey tab draws, and a carved
 * mark is the only thing on it small enough to escape a screenshot review —
 * the first cut ran one off the right edge of the fourth slab and painted a
 * red dash on the water, which read as a rendering fault rather than as
 * carving. Both are arithmetic, so both are testable without a simulator.
 */

/** Every width and height the chart can actually produce on a phone. */
const WIDTHS = Array.from({ length: 29 }, (_, i) => 26 + i);
const SEEDS = [
  'Strong enough for whoever is next',
  'Work that outlives the contract',
  'A mind quiet on a loud day',
  'People who would sail with me again',
  'Master the blade',
  'x',
  '',
  '道',
];

describe('a stone stands as tall as its work astern', () => {
  it('grows with what is reached', () => {
    expect(stoneHeight(0)).toBe(BASE);
    expect(stoneHeight(1)).toBe(BASE + PER_ISLAND);
    expect(stoneHeight(3)).toBeGreaterThan(stoneHeight(2));
  });

  it('saturates rather than climbing forever', () => {
    // Past six a pillar stops reading as a pillar. It is also what keeps the
    // waterline honest: the box is sized to the tallest stone that can exist.
    expect(stoneHeight(MAX_ISLANDS)).toBe(stoneHeight(MAX_ISLANDS + 40));
  });

  it('never goes below the base, whatever it is handed', () => {
    expect(stoneHeight(-3)).toBe(BASE);
  });
});

describe('carving stays on its own rock', () => {
  it.each(SEEDS)('%s keeps both margins at every size', (seed) => {
    for (const w of WIDTHS) {
      for (let reached = 0; reached <= MAX_ISLANDS; reached += 1) {
        const h = stoneHeight(reached);
        for (const m of marks(seed, w, h)) {
          expect(m.x, `${seed} @${w}: starts left of the margin`).toBeGreaterThanOrEqual(
            MARGIN - 0.001,
          );
          expect(m.x + m.len, `${seed} @${w}: runs off the right edge`).toBeLessThanOrEqual(
            w - MARGIN + 0.001,
          );
          expect(m.y, `${seed} @${w}: carved above the slab`).toBeGreaterThan(0);
          expect(m.y + (m.drop ?? 0), `${seed} @${w}: carved below the foot`).toBeLessThan(h);
          // A stroke shorter than this is a speck, not a cut.
          expect(m.len).toBeGreaterThanOrEqual(4);
        }
      }
    }
  });

  it('cuts the same stone twice for the same title', () => {
    // The inscription is permanent: it is seeded from the pillar's own words,
    // so a re-render never recuts it and a rename always does.
    expect(marksPath('Ship the rewrite', 48, 90)).toBe(marksPath('Ship the rewrite', 48, 90));
    expect(marksPath('Ship the rewrite', 48, 90)).not.toBe(
      marksPath('Ship the rewrite again', 48, 90),
    );
  });

  it('leaves a slab too narrow to carve alone', () => {
    expect(marks('anything', 2 * MARGIN, 90)).toEqual([]);
    expect(marksPath('anything', 2 * MARGIN, 90)).toBe('');
  });

  it('puts something on every stone that has room', () => {
    for (const seed of SEEDS) {
      expect(marks(seed, 54, stoneHeight(0)).length, `${seed}: uncarved`).toBeGreaterThan(0);
    }
  });
});
