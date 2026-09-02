import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Rect } from 'react-native-svg';

/**
 * 蒸気 — the steam a gear gives off, and the clouds the fifth one is made of.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - Fills its parent absolutely and paints nothing but vapour. It never
 *     knows what is written under it; `pointerEvents="none"` so it cannot
 *     eat a tap.
 *   - Two colour props and no others: `colour` is the vapour (the app's
 *     near-white, `onStone`, on every palette), `shade` is what the underside
 *     of a cloud is drawn in on a white ground (the app's near-black at low
 *     opacity). It never reads the palette.
 *   - `amount` is 0..1 and decides how much rises: how many wisps and how
 *     far. Zero draws nothing.
 *   - `rise` is how far above the plate the parent extends. The plate's top
 *     edge is at that y, and that is where the wisps come off.
 *   - `full` is the fifth gear: the box is filled with cumulus rather than
 *     wisps. The caller paints the ground white; this draws the clouds.
 *   - `seed` fixes the drawing. Same seed, same steam, every render.
 * ---------------------------------------------------------------------------
 *
 * Luffy's gears steam. Gear 2 is his blood pumped hot enough to vapourise off
 * him, and the higher gears keep the steam and add to it, until the fifth is
 * a body made of cloud — Nika, white, on a sky. So the ladder's plate wears
 * steam that thickens as the held rung climbs, and at the top the page turns
 * white with clouds. The owner's words: _"Luffy's gears screen should turn
 * white and have clouds visually showing around."_
 *
 * Static, like the crackle: the app's motion vocabulary is arrival and then
 * stillness, and steam that crawled on every render would be a battery bill
 * and a distraction. A puff is a column of circles shrinking as it rises,
 * drifting a little to one side; a cloud is a row of them with a flat base,
 * which is what a cumulus is.
 */

/** Deterministic. The same steam every time, on purpose. */
function rng(seed: number): () => number {
  let a = (seed || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_WISPS = 9;

type Puff = { cx: number; cy: number; r: number; o: number };

/**
 * One wisp: circles shrinking as they rise, each a little to one side of the
 * last. The sideways drift alternates so it wanders rather than leans.
 */
function wisp(next: () => number, x: number, base: number, reach: number, r0: number): Puff[] {
  const out: Puff[] = [];
  // Many circles, close together, each faint: the overlaps are what make it
  // read as a column of vapour. Four discs at a fifth opacity read as a
  // stack of bubbles, which is what the first cut drew.
  const steps = 6 + Math.floor(next() * 2);
  const lean = (next() - 0.5) * 14;
  for (let i = 0; i < steps; i += 1) {
    const at = i / (steps - 1);
    out.push({
      cx: x + lean * at + (i % 2 === 0 ? 1 : -1) * 2.5 * at,
      cy: base - reach * at - r0 * 0.5,
      r: r0 * (1 - at * 0.4),
      o: 0.13 * (1 - at * 0.7),
    });
  }
  return out;
}

/** A cumulus: five circles along a flat base, the tallest a little right of centre. */
function cloud(cx: number, cy: number, r: number): Puff[] {
  return [
    { cx: cx - 1.4 * r, cy: cy - 0.1 * r, r: 0.62 * r, o: 1 },
    { cx: cx - 0.6 * r, cy: cy - 0.55 * r, r: 0.85 * r, o: 1 },
    { cx: cx + 0.3 * r, cy: cy - 0.7 * r, r, o: 1 },
    { cx: cx + 1.25 * r, cy: cy - 0.3 * r, r: 0.78 * r, o: 1 },
    { cx: cx + 1.9 * r, cy: cy + 0.05 * r, r: 0.55 * r, o: 1 },
  ];
}

export function Steam({
  amount,
  colour,
  shade,
  seed,
  rise = 0,
  full = false,
}: {
  /** 0..1. Zero draws nothing at all. */
  amount: number;
  colour: string;
  shade: string;
  seed: number;
  rise?: number;
  full?: boolean;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const on = Math.max(0, Math.min(1, amount));

  const wisps = useMemo(() => {
    if (!size || on <= 0 || full) return [];
    const next = rng(seed);
    const count = Math.max(2, Math.round(on * MAX_WISPS));
    const out: Puff[][] = [];
    // One wisp per band across the plate's top edge, jittered inside its
    // band rather than placed at random: a seed once put three of four on
    // the right-hand end and the plate looked like it was leaking.
    const band = Math.max(1, size.w - 36) / count;
    for (let i = 0; i < count; i += 1) {
      const x = 18 + band * i + band * (0.2 + next() * 0.6);
      const reach = (rise * 0.5 + rise * 0.5 * next()) * (0.55 + on * 0.45);
      const r0 = 7 + next() * 5 + on * 3;
      out.push(wisp(next, x, rise + 4, reach, r0));
    }
    return out;
  }, [size, on, seed, rise, full]);

  const clouds = useMemo(() => {
    if (!size || !full) return [];
    const next = rng(seed);
    const out: Puff[][] = [];
    // A bank along the bottom, the biggest in the middle.
    const across = Math.max(3, Math.round(size.w / 110));
    for (let i = 0; i < across; i += 1) {
      const cx = ((i + 0.5) / across) * size.w + (next() - 0.5) * 30;
      const r = 26 + next() * 18;
      out.push(cloud(cx, size.h - 6 + next() * 10, r));
    }
    // Loose ones up the sides, smaller as they climb, and clear of the middle
    // where the words are.
    const climb = Math.max(2, Math.round(size.h / 170));
    for (let i = 0; i < climb; i += 1) {
      const y = size.h - 90 - i * (size.h / (climb + 0.5)) * 0.8;
      out.push(cloud(-8 + next() * 26, y, 16 + next() * 10));
      out.push(cloud(size.w + 8 - next() * 26, y - 40 * next(), 16 + next() * 10));
    }
    return out;
  }, [size, seed, full]);

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
          {/* The sky. A whisper of the shade over the whole box, so the
              clouds — drawn in the ground's own white — have something to
              be white against. Without it a cloud is its shadow and
              nothing else. */}
          {full ? (
            <Rect x={0} y={0} width={size.w} height={size.h} fill={shade} opacity={0.06} />
          ) : null}
          {wisps.map((puffs, i) => (
            <G key={`w${i}`}>
              {puffs.map((p, j) => (
                <Circle key={j} cx={p.cx} cy={p.cy} r={p.r} fill={colour} opacity={p.o} />
              ))}
            </G>
          ))}
          {clouds.map((puffs, i) => (
            <G key={`c${i}`}>
              {/* The underside first: the same cloud, nudged down, in the
                  shade at low opacity. On a white ground a white cloud is
                  nothing at all; the shadow under it is what makes it a
                  shape. Then the cloud itself, solid. */}
              {puffs.map((p, j) => (
                <Circle
                  key={`s${j}`}
                  cx={p.cx + 3}
                  cy={p.cy + 6}
                  r={p.r}
                  fill={shade}
                  opacity={0.14}
                />
              ))}
              <Rect
                x={puffs[0].cx - puffs[0].r}
                y={puffs[0].cy}
                width={puffs[4].cx + puffs[4].r - (puffs[0].cx - puffs[0].r)}
                height={puffs[2].r * 0.5}
                fill={colour}
              />
              {puffs.map((p, j) => (
                <Circle key={j} cx={p.cx} cy={p.cy} r={p.r} fill={colour} />
              ))}
            </G>
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
