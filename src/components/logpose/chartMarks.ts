/**
 * The chart's geometry: how tall a stone stands, and where its carving goes.
 *
 * Separated from the drawing on the usual seam — drawings are replaceable,
 * systems are not. Redraw the stones however you like; a stone's height is
 * still its work astern, and a mark still has to stay on its own rock.
 *
 * No React Native imports here, which is what lets both rules be tested on
 * plain Node. Both have already been got wrong once: the first cut picked a
 * mark's start and its length independently and let the sum run off the right
 * edge, painting a short red dash on the water beside the fourth stone.
 * Carving that has left its rock is not a texture, it is a rendering fault —
 * and the kind that a screenshot review reads straight past.
 *
 * The alphabet itself is not here. It lives in `instruments/glyphs.ts` with
 * the mason that sets it, shared with the card-sized slab, so the app has one
 * stonecutter and a pillar reads as the same rock in both places.
 */

import { INK, cells, inscribe, type Cell } from '../instruments/glyphs';

/** How tall a stone with nothing astern stands, and what each island adds. */
export const BASE = 74;
export const PER_ISLAND = 8;
/** Six is where a stone stops growing. Past that it is a tower, not a pillar. */
export const MAX_ISLANDS = 6;

/** Every glyph keeps this much clear of every edge of the slab. */
export const MARGIN = 5;

/**
 * The grid a chart stone is cut on.
 *
 * A quarter the pitch of the card-sized slab in `Stone.tsx`, because a
 * chart stone is around forty points wide and the card is three hundred
 * and twenty. It is the *same alphabet* at the same proportions, which is
 * the point — a pillar reads as the same rock on the chart as it does on
 * its own screen.
 *
 * The first cut did not do this. It invented a second, sparser vocabulary —
 * four or five loose strokes — on the theory that the real inscription
 * would be mud at this size. It was not mud, it was empty: a slab with five
 * scratches on it reads as a damaged rectangle rather than as writing.
 */
export const GRID = {
  cell: { w: 6, h: 8 },
  gap: { x: 3, y: 4 },
  margin: MARGIN,
} as const;

/** A stone's height, in points, from what is astern of it. */
export function stoneHeight(reached: number): number {
  return BASE + Math.min(Math.max(reached, 0), MAX_ISLANDS) * PER_ISLAND;
}

/** Where each glyph sits on a stone this size — the geometry, for testing. */
export function stoneCells(seed: string, w: number, h: number): Cell[] {
  return cells(seed, GRID, w, h);
}

/** The inscription for a chart stone, as one path. */
export function inscription(seed: string, w: number, h: number): string {
  return inscribe(seed, GRID, w, h);
}
