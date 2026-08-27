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
 */

/** How tall a stone with nothing astern stands, and what each island adds. */
export const BASE = 74;
export const PER_ISLAND = 8;
/** Six is where a stone stops growing. Past that it is a tower, not a pillar. */
export const MAX_ISLANDS = 6;

/** Every mark keeps this much clear of both edges of the slab. */
export const MARGIN = 7;

/**
 * A stone's height in points, from what is astern of it.
 *
 * Never a percentage and never a total beside it — nobody sailing knows how
 * many islands are left, so a stone that has *grown* is the only honest way
 * to draw distance covered. It saturates rather than climbing forever,
 * because past six a pillar stops reading as a pillar.
 */
export function stoneHeight(reached: number): number {
  return BASE + Math.min(Math.max(reached, 0), MAX_ISLANDS) * PER_ISLAND;
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** One carved stroke, in the slab's own coordinates. */
export type Mark = { x: number; y: number; len: number; drop: number | null };

/**
 * A few carved marks on a stone this small.
 *
 * The full inscription in `Stone.tsx` is texture at card size; at fifty
 * points wide it would be mud. Four or five strokes read as carving and
 * leave the silhouette intact, which is the thing that has to survive here.
 *
 * Seeded from the pillar's own title, so each stone carries permanent glyphs
 * of its own — rename it and the stone is recut, which is correct: it is a
 * different sentence now.
 */
export function marks(seed: string, w: number, h: number): Mark[] {
  let a = hash(seed);
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const left = MARGIN;
  const right = w - MARGIN;
  const out: Mark[] = [];
  if (right - left < 4) return out;

  for (let y = 14; y < h - 10; y += 15) {
    const runs = 1 + Math.floor(next() * 2);
    for (let i = 0; i < runs; i += 1) {
      const x = left + next() * (right - left) * 0.45;
      const len = Math.min(6 + next() * (right - left) * 0.6, right - x);
      const drop = next() < 0.55 ? 4 + next() * 5 : null;
      if (len < 4) continue;
      out.push({ x, y, len, drop });
    }
  }
  return out;
}

/** The marks as one SVG path, which is all the drawing needs of them. */
export function marksPath(seed: string, w: number, h: number): string {
  return marks(seed, w, h)
    .flatMap((m) => {
      const move = `M ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;
      const strokes = [`${move} h ${m.len.toFixed(1)}`];
      if (m.drop !== null) strokes.push(`${move} v ${m.drop.toFixed(1)}`);
      return strokes;
    })
    .join(' ');
}
