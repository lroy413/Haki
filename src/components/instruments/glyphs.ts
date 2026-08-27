/**
 * The poneglyph alphabet, and the mason who sets it.
 *
 * Lifted out of `Stone.tsx` when the chart's stones needed carving too. The
 * usual seam: **drawings are replaceable, systems are not.** Redraw either
 * slab however you like — the inscription on both comes from here, so the
 * app has one stonecutter rather than two that drift, and a pillar reads the
 * same on the chart as it does on its own screen.
 *
 * No React Native imports, which is what lets the geometry be tested on
 * plain Node. It has already been got wrong twice: once by building an SVG
 * id out of user text, and once by letting a stroke run off the right edge
 * of its slab.
 */

/** The alphabet: rectilinear strokes inside a 10 × 13 cell. */
export const STROKES: string[] = [
  'M 1 1 H 9', // top bar
  'M 1 6 H 9', // middle bar
  'M 1 12 H 9', // foot
  'M 1 1 V 12', // left upright
  'M 5 1 V 12', // spine
  'M 9 1 V 12', // right upright
  'M 1 1 H 9 V 6', // shoulder
  'M 1 6 V 12 H 9', // hook
  'M 1 1 V 6 H 9', // ell
  'M 5 1 V 6 H 9', // branch
  'M 1 3 H 5 M 1 9 H 5', // twin ticks
  'M 5 4 H 9 M 5 9 H 9', // twin ticks, right
  'M 1 1 H 5 V 12', // flag
  'M 2 4 H 8 V 9 H 2 Z', // block
  'M 5 1 V 12 M 1 4 H 9', // cross
  'M 1 12 H 9 V 6', // heel
];

/**
 * The box the alphabet is plotted in. Everything scales off this.
 *
 * The strokes run 1..9 and 1..12 inside it, so a glyph sits a tenth of its
 * cell in from every edge — the gutter a mason leaves, and the reason a
 * cell's ink can never reach the next cell's.
 */
export const UNIT_W = 10;
export const UNIT_H = 13;
/** How far into its cell a glyph's ink actually reaches, as a fraction. */
export const INK = { from: 0.1, to: 0.9 } as const;

/** A hash small enough to read and stable enough to trust. */
export function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — deterministic, tiny, and good enough for stonework. */
export function rng(state: number): () => number {
  let a = state;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Where one glyph sits, in the slab's own coordinates. */
export type Cell = { x: number; y: number; w: number; h: number };

export type Grid = {
  /** Glyph cell size, and the space between cells. */
  cell: { w: number; h: number };
  gap: { x: number; y: number };
  /** Kept clear of every edge of the slab. */
  margin?: number;
};

/** How many columns and rows of a given grid fit on a slab this size. */
export function fits(grid: Grid, w: number, h: number): { cols: number; rows: number } {
  const m = grid.margin ?? 0;
  const pitchX = grid.cell.w + grid.gap.x;
  const pitchY = grid.cell.h + grid.gap.y;
  return {
    cols: Math.max(0, Math.floor((w - 2 * m + grid.gap.x) / pitchX)),
    rows: Math.max(0, Math.floor((h - 2 * m + grid.gap.y) / pitchY)),
  };
}

/**
 * The cells an inscription actually occupies.
 *
 * Exposed apart from the path so the geometry can be checked without
 * parsing SVG: a glyph that has left its rock paints a stray mark on
 * whatever is behind the slab, and that is the size of thing a screenshot
 * review walks straight past.
 *
 * A real inscription is not a full rectangle — lines end where the sentence
 * does, and the mason left gaps. Roughly one cell in seven stays blank,
 * which is what keeps it from reading as a QR code.
 */
export function cells(seed: string, grid: Grid, w: number, h: number): Cell[] {
  const { cols, rows } = fits(grid, w, h);
  if (cols === 0 || rows === 0) return [];
  const m = grid.margin ?? 0;
  const pitchX = grid.cell.w + grid.gap.x;
  const pitchY = grid.cell.h + grid.gap.y;
  // Whatever the grid does not use is split between the two margins, so an
  // inscription sits centred on its slab rather than crowding the left edge.
  const slackX = w - 2 * m - (cols * pitchX - grid.gap.x);
  const slackY = h - 2 * m - (rows * pitchY - grid.gap.y);
  const next = rng(hash(seed));

  const out: Cell[] = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (next() < 0.14) continue;
      out.push({
        x: m + slackX / 2 + col * pitchX,
        y: m + slackY / 2 + row * pitchY,
        w: grid.cell.w,
        h: grid.cell.h,
      });
    }
  }
  return out;
}

/**
 * The inscription: one path of every stroke in the grid.
 *
 * Returned as a single `d` so the whole thing is two draw calls — the cut
 * and its lip — rather than several hundred. A card-sized slab carries
 * upward of two hundred strokes, and a `<Path>` each was measurably slower
 * on the web at the moment a screen full of cards mounts.
 *
 * Seeded from the pillar's own title, so each stone carries permanent glyphs
 * of its own. Rename it and the stone is recut, which is correct: it is a
 * different sentence now.
 */
export function inscribe(seed: string, grid: Grid, w: number, h: number): string {
  // Two generators off the same seed rather than one shared stream: the
  // cells are decided first and the strokes second, so a slab that gains a
  // row does not reshuffle every glyph above it.
  const next = rng(hash(`${seed}~cut`));
  const sx = grid.cell.w / UNIT_W;
  const sy = grid.cell.h / UNIT_H;
  const parts: string[] = [];

  for (const c of cells(seed, grid, w, h)) {
    const count = 1 + Math.floor(next() * 2.4);
    for (let i = 0; i < count; i += 1) {
      const stroke = STROKES[Math.floor(next() * STROKES.length)];
      parts.push(
        stroke.replace(/([MHV]) ?(-?\d+(?:\.\d+)?)(?: (-?\d+(?:\.\d+)?))?/g, (_, op, a, b) =>
          op === 'H'
            ? `H ${(Number(a) * sx + c.x).toFixed(2)}`
            : op === 'V'
              ? `V ${(Number(a) * sy + c.y).toFixed(2)}`
              : `M ${(Number(a) * sx + c.x).toFixed(2)} ${(Number(b) * sy + c.y).toFixed(2)}`,
        ),
      );
    }
  }
  return parts.join(' ');
}
