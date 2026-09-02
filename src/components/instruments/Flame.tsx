import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';

/**
 * 閻魔の炎 — Enma's flame, the green fire down Zoro's blade.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - Fills its parent absolutely and paints nothing but fire. It never
 *     knows what is written under it; `pointerEvents="none"`.
 *   - Two colour props and no others: `colour` is the flame (the crew's
 *     Conqueror's green under Zoro), `core` the hot centre of each tongue
 *     (the app's near-white). It never reads the palette.
 *   - `amount` is 0..1 and decides how much burns: how many tongues and how
 *     tall. Zero draws nothing.
 *   - `rise` is how far above the plate the parent extends; the plate's top
 *     edge is at that y and the tongues stand on it.
 *   - `full` is the top style: the box's own edges catch, bottom and sides,
 *     and the tongues are tall. The caller paints the ground dark.
 *   - `seed` fixes the drawing. Same seed, same fire, every render.
 * ---------------------------------------------------------------------------
 *
 * Zoro's styles do not steam; they burn. Enma draws Haki out of him whether
 * he likes it or not and the blade runs green with it, and by the King of
 * Hell the fire is the whole picture. So the ladder's plate wears a green
 * flame that grows as the held style climbs, and at the top the page is lit
 * with it — the owner's words: _"zoro should have green flames around his
 * page."_
 *
 * A tongue is one closed path: up the left flank to a tip that leans a little,
 * down the right, with the tip placed off-centre so no two tongues are the
 * same shape mirrored. Every tongue is drawn twice — the flame, then a shorter
 * core in the hot colour — because one fill reads as a paper cut-out and two
 * read as heat. Static, like the steam and the crackle: the app's motion
 * vocabulary is arrival and then stillness.
 */

/** Deterministic. The same fire every time, on purpose. */
function rng(seed: number): () => number {
  let a = (seed || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_TONGUES = 16;

type Tongue = { flame: string; core: string };

/**
 * One tongue standing on a base line at `y`, pointing up.
 *
 * The left flank bows out and pinches in under the tip; the right flank
 * comes down with a second bulge, so the silhouette is an S rather than a
 * leaf. A single symmetric point is exactly what the first cut drew, and at
 * twenty points tall it read as a row of sprouts on the plate.
 */
function tongueUp(x: number, y: number, w: number, h: number, lean: number): string {
  const tipX = x + lean;
  const tipY = y - h;
  const f = (n: number) => n.toFixed(1);
  return [
    `M ${f(x - w / 2)} ${f(y)}`,
    `C ${f(x - w * 0.75)} ${f(y - h * 0.3)}, ${f(tipX - w * 0.4)} ${f(y - h * 0.55)}, ${f(tipX - w * 0.08)} ${f(y - h * 0.8)}`,
    `C ${f(tipX - w * 0.02)} ${f(y - h * 0.9)}, ${f(tipX)} ${f(tipY + h * 0.05)}, ${f(tipX)} ${f(tipY)}`,
    `C ${f(tipX + w * 0.12)} ${f(y - h * 0.82)}, ${f(x + w * 0.3)} ${f(y - h * 0.62)}, ${f(x + w * 0.62)} ${f(y - h * 0.38)}`,
    `C ${f(x + w * 0.75)} ${f(y - h * 0.22)}, ${f(x + w * 0.6)} ${f(y - h * 0.08)}, ${f(x + w / 2)} ${f(y)}`,
    'Z',
  ].join(' ');
}

/** A tongue lying along a vertical edge, pointing up the side. */
function tongueSide(x: number, y: number, w: number, h: number, inward: number): string {
  const tipX = x + inward * w * 0.5;
  const tipY = y - h;
  const f = (n: number) => n.toFixed(1);
  return [
    `M ${f(x)} ${f(y + w * 0.4)}`,
    `C ${f(x + inward * w * 1.1)} ${f(y - h * 0.15)}, ${f(x + inward * w * 0.9)} ${f(y - h * 0.5)}, ${f(tipX)} ${f(tipY)}`,
    `C ${f(x + inward * w * 0.25)} ${f(y - h * 0.62)}, ${f(x + inward * w * 0.05)} ${f(y - h * 0.3)}, ${f(x)} ${f(y - w * 0.4)}`,
    'Z',
  ].join(' ');
}

/**
 * A flame is a main tongue with a shorter lick beside it. Two prongs of
 * different heights, overlapping at the base, are what the eye reads as fire
 * — one prong is a leaf, whatever its outline.
 */
function flame(next: () => number, x: number, y: number, w: number, h: number): Tongue[] {
  const lean = (next() - 0.5) * w * 0.9;
  const side = next() < 0.5 ? -1 : 1;
  const lickX = x + side * w * 0.45;
  const lickH = h * (0.4 + next() * 0.25);
  return [
    {
      flame: tongueUp(x, y, w, h, lean),
      core: tongueUp(x, y, w * 0.45, h * 0.55, lean * 0.5),
    },
    {
      flame: tongueUp(lickX, y, w * 0.6, lickH, lean * 0.4 + side * w * 0.15),
      core: tongueUp(lickX, y, w * 0.28, lickH * 0.5, lean * 0.2),
    },
  ];
}

export function Flame({
  amount,
  colour,
  core,
  seed,
  rise = 0,
  full = false,
}: {
  /** 0..1. Zero draws nothing at all. */
  amount: number;
  colour: string;
  core: string;
  seed: number;
  rise?: number;
  full?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const on = Math.max(0, Math.min(1, amount));

  const tongues = useMemo(() => {
    if (!size || (on <= 0 && !full)) return [];
    const next = rng(seed);
    const out: Tongue[] = [];

    if (!full) {
      // A fringe along the whole top edge, low when little is held and
      // taller as the rung climbs: a few tall tongues with gaps between them
      // read as sprouts, a continuous run of them reads as a lit edge.
      const count = 7 + Math.round(on * (MAX_TONGUES - 7));
      const band = Math.max(1, size.w - 24) / count;
      for (let i = 0; i < count; i += 1) {
        const x = 12 + band * i + band * (0.3 + next() * 0.4);
        const h = rise * (0.3 + 0.7 * on) * (0.55 + next() * 0.45);
        // Narrow when little is held: squat tongues as wide as their band
        // read as a hedge along the plate rather than as small fires.
        const w = band * (0.55 + 0.45 * on) * (0.9 + next() * 0.5);
        out.push(...flame(next, x, rise + 3, w, h));
      }
      return out;
    }

    // The top style: the box's own bottom edge burns, and the fire climbs the
    // sides. Tall in the corners, where it reads as the page catching rather
    // than as a fringe.
    const across = Math.max(6, Math.round(size.w / 30));
    for (let i = 0; i < across; i += 1) {
      const x = ((i + 0.5) / across) * size.w + (next() - 0.5) * 12;
      const edge = Math.min(x, size.w - x) / size.w; // 0 at the corners
      const h = 40 + next() * 50 + (0.5 - edge) * 130;
      out.push(...flame(next, x, size.h + 4, 22 + next() * 16, h));
    }
    const climb = Math.max(3, Math.round(size.h / 90));
    for (let i = 0; i < climb; i += 1) {
      const y = size.h - 40 - i * (size.h / (climb + 0.8));
      const h = 50 + next() * 60;
      const w = 18 + next() * 12;
      const yr = y - 30 * next();
      out.push({
        flame: tongueSide(-2, y, w, h, 1),
        core: tongueSide(-2, y, w * 0.5, h * 0.55, 1),
      });
      out.push({
        flame: tongueSide(size.w + 2, yr, w, h, -1),
        core: tongueSide(size.w + 2, yr, w * 0.5, h * 0.55, -1),
      });
    }
    return out;
  }, [size, on, seed, rise, full]);

  if (on <= 0 && !full) return null;

  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (!size || Math.abs(size.w - width) > 1 || Math.abs(size.h - height) > 1) {
      setSize({ w: width, h: height });
    }
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={measure}>
      {size ? (
        <Svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          {tongues.map((t, i) => (
            <Path key={`f${i}`} d={t.flame} fill={colour} opacity={full ? 0.62 : 0.5} />
          ))}
          {tongues.map((t, i) => (
            <Path key={`c${i}`} d={t.core} fill={core} opacity={full ? 0.38 : 0.3} />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
