import { describe, expect, it } from 'vitest';
import {
  BASE,
  GRID,
  MARGIN,
  MAX_ISLANDS,
  PER_ISLAND,
  inscription,
  stoneCells,
  stoneHeight,
} from '../logpose/chartMarks';
import { INK } from '../instruments/glyphs';

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
  it.each(SEEDS)('%s keeps every margin at every size', (seed) => {
    for (const w of WIDTHS) {
      for (let reached = 0; reached <= MAX_ISLANDS; reached += 1) {
        const h = stoneHeight(reached);
        for (const c of stoneCells(seed, w, h)) {
          // A cell's ink sits a tenth of the cell in from each edge — the
          // gutter the mason leaves — so the cell box is what has to fit.
          const left = c.x + INK.from * c.w;
          const right = c.x + INK.to * c.w;
          const top = c.y + INK.from * c.h;
          const foot = c.y + INK.to * c.h;
          expect(left, `${seed} @${w}: cut left of the margin`).toBeGreaterThanOrEqual(
            MARGIN - 0.001,
          );
          expect(right, `${seed} @${w}: cut off the right edge`).toBeLessThanOrEqual(
            w - MARGIN + 0.001,
          );
          expect(top, `${seed} @${w}: cut above the slab`).toBeGreaterThanOrEqual(
            MARGIN - 0.001,
          );
          expect(foot, `${seed} @${w}: cut below the foot`).toBeLessThanOrEqual(
            h - MARGIN + 0.001,
          );
        }
      }
    }
  });

  it('cuts the same stone twice for the same title', () => {
    // The inscription is permanent: it is seeded from the pillar's own words,
    // so a re-render never recuts it and a rename always does.
    expect(inscription('Ship the rewrite', 48, 90)).toBe(
      inscription('Ship the rewrite', 48, 90),
    );
    expect(inscription('Ship the rewrite', 48, 90)).not.toBe(
      inscription('Ship the rewrite again', 48, 90),
    );
  });

  it('leaves a slab too narrow to carve alone', () => {
    expect(stoneCells('anything', 2 * MARGIN, 90)).toEqual([]);
    expect(inscription('anything', 2 * MARGIN, 90)).toBe('');
  });

  it('writes rather than scratches', () => {
    // The first cut invented a sparse second vocabulary — four or five loose
    // strokes — on the theory that the real alphabet would be mud at this
    // size. It was not mud, it was empty: five scratches read as a damaged
    // rectangle, not as writing. The narrowest stone still gets a grid.
    const narrow = stoneCells('Strong enough for whoever is next', 26, stoneHeight(0));
    expect(narrow.length, 'the narrowest stone is barely carved').toBeGreaterThanOrEqual(8);
    const wide = stoneCells('Strong enough for whoever is next', 54, stoneHeight(MAX_ISLANDS));
    expect(wide.length, 'a full stone is barely carved').toBeGreaterThanOrEqual(24);
    // And it is a grid, not a scatter: every column shares an x.
    expect(new Set(wide.map((c) => c.x.toFixed(2))).size).toBeLessThanOrEqual(6);
  });

  it('uses the same alphabet as the card-sized slab', () => {
    // One stonecutter, so a pillar reads as the same rock in both places.
    expect(GRID.cell.w / GRID.cell.h).toBeCloseTo(14 / 18, 1);
  });
});
