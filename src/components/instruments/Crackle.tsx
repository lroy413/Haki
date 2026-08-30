import { useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { radius } from '../../theme/tokens';

/**
 * 硬化 — the discharge a charged plate carries.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - Fills its parent absolutely, paints nothing but light, never knows what
 *     is written over it. `pointerEvents="none"`, so it cannot eat a tap.
 *   - One colour prop, `tint` — the screen's own lens. It never touches the
 *     palette, like every other instrument.
 *   - `charge` is 0..1 from `domain/hardening.ts`. It decides everything —
 *     how bright the rim is, how many arcs there are and how hard they bite.
 *   - `seed` fixes the arcs. Same seed, same discharge, every render.
 *   - Give the parent the same `round` you give this, or the rim will not sit
 *     on the border it is meant to be lighting.
 * ---------------------------------------------------------------------------
 *
 * **This is the third lightning and it is not either of the other two.**
 * `Lightning.tsx` is a *burst* — hard bolts thrown radially off a contact
 * point, which is a fist landing. `instruments/SkyBolt.tsx` is *weather* — one
 * long bolt falling from a cloud, sine-enveloped so it leaves clean and
 * arrives clean. This is neither thrown nor falling: it **clings**. Advanced
 * Armament does not spark off into the air, it runs along the surface it has
 * coated, and that is the read to keep if this is ever redrawn — every arc
 * travels *with* an edge and kicks a short way off it, never across the face
 * and never out into the middle.
 *
 * Static in both senses of the word. It does not move, and that is the owner's
 * own word for it — *"showing the static haki electricity"*. A crawling
 * animation on every plate in the app would be a battery bill and a
 * distraction, and this app's whole motion vocabulary (`Rise`) is arrival and
 * then stillness. A discharge that has settled onto a surface and stayed there
 * is what a hardened arm actually looks like between blows.
 *
 * Every arc is stroked twice, and the order is the opposite of
 * `Lightning.tsx`'s: a wide near-transparent halo first, then a thin bright
 * line on top. That file strokes a *dark* core with a hot rim, which is right
 * at the width an impact burst draws at — under three points the same
 * construction inverts and reads as an outlined squiggle rather than as light.
 * A charged plate is only ever dark (the charge cannot exist below level 3),
 * so there is no light ground here for a dark core to be visible against.
 */

/** Deterministic. The same discharge every time, on purpose. */
function rng(seed: number): () => number {
  let a = (seed || 1) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Most arcs a fully charged plate carries. Past this it reads as a texture. */
const MAX_ARCS = 6;
/**
 * How far along an edge one arc runs, as a share of that edge.
 *
 * Short. The first cut ran a fifth of the side, which on a full-width plate is
 * a hundred and fifty points of tidy zig-zag — it read as a heart-rate trace,
 * and on the Do tab it read as a second copy of the hardness gauge four lines
 * above it. A discharge is brief.
 */
const RUN = 0.09;
/** Segments per arc. Many and short: the frequency is what makes it crackle. */
const STEPS = 8;
/** How close to the border an arc sits. It clings; it does not hover. */
const CLING = 2;

type Arc = { path: string };

/**
 * One arc, clinging to an edge.
 *
 * It starts somewhere along a side, runs a short way along it, and kicks
 * outward as it goes. The kick alternates so the run zig-zags rather than
 * bulging — a bolt that only wanders is a wobbly line, which is the note
 * `Lightning.tsx` leaves for the same reason.
 *
 * The kick is largest in the middle of the run and zero at both ends, so the
 * arc leaves the edge and returns to it. That is the sine envelope from
 * `SkyBolt`, borrowed for the opposite geometry: there it keeps a falling bolt
 * clean at the cloud and clean at the ground, here it keeps a clinging one
 * attached at both ends.
 */
function arcOn(next: () => number, w: number, h: number, corner: number): Arc {
  const side = Math.floor(next() * 4);
  // Along the edge, and away from it. `along` runs the length of the side,
  // `off` is the distance from it — the kick is signed, so an arc leaves the
  // border on both sides of it the way a spark does.
  const horizontal = side === 0 || side === 2;
  const span = horizontal ? w : h;
  const run = Math.max(18, span * RUN * (0.7 + next() * 0.7));
  // Kept clear of the rounded corners at both ends: an arc that runs off the
  // straight and into the curve leaves the border and hangs in the fill,
  // which reads as a stray mark rather than as a discharge.
  const room = Math.max(1, span - run - corner * 2);
  const start = corner + next() * room;
  const edge = side === 0 || side === 3 ? CLING : (horizontal ? h : w) - CLING;
  const reach = 2 + next() * 3;

  const points: string[] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const at = i / STEPS;
    const envelope = Math.sin(at * Math.PI);
    const kick = (i % 2 === 0 ? 1 : -1) * reach * envelope * (0.4 + next() * 0.6);
    const along = start + run * at;
    const off = edge + kick;
    const x = horizontal ? along : off;
    const y = horizontal ? off : along;
    points.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return { path: `M ${points.join(' L ')}` };
}

export function Crackle({
  charge,
  tint,
  seed,
  round = radius.lg,
}: {
  /** 0..1 from `domain/hardening.ts`. Zero draws nothing at all. */
  charge: number;
  tint: string;
  /** Fixes the discharge. Anything stable per plate — a title's hash will do. */
  seed: number;
  round?: number;
}) {
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const on = Math.max(0, Math.min(1, charge));

  const arcs = useMemo(() => {
    if (!size || on <= 0) return [];
    const next = rng(seed);
    // The count climbs with the charge and the first one arrives immediately:
    // the act that pushes a day past black has to be visible, or the ramp has
    // a dead zone at exactly the point it is meant to resume.
    const count = Math.max(1, Math.round(on * MAX_ARCS));
    return Array.from({ length: count }, () => arcOn(next, size.w, size.h, round + CLING));
  }, [size, on, seed, round]);

  if (on <= 0) return null;

  const measure = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) setSize({ w: width, h: height });
  };

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={measure}>
      {size ? (
        <Svg width={size.w} height={size.h}>
          {/* The rim. A charged plate catches light along its edge before it
              catches it anywhere else, and this is the half of the effect that
              is visible at a glance — the arcs are what you see when you look
              at it. Inset by half a stroke so it sits *on* the border rather
              than half outside it. */}
          <Rect
            x={0.75}
            y={0.75}
            width={Math.max(0, size.w - 1.5)}
            height={Math.max(0, size.h - 1.5)}
            rx={round}
            ry={round}
            fill="none"
            stroke={tint}
            strokeWidth={1.5}
            // Tuned against the loudest ground it lands on. The Observation
            // reading is a violet plate under a violet lens, so the same
            // opacity that read as a lit edge on the Do tab's black steel
            // read there as a selection ring around the card.
            strokeOpacity={0.07 + on * 0.19}
          />
          {/* The halo. Wide and nearly transparent — this is the air around
              the arc, and it is what makes the line above it read as light
              rather than as a drawn squiggle. */}
          {arcs.map((arc, i) => (
            <Path
              key={`halo-${i}`}
              d={arc.path}
              fill="none"
              stroke={tint}
              strokeWidth={4.5}
              strokeOpacity={0.05 + on * 0.1}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          {/* The arc itself: thin, and the brightest thing the plate carries.
              See the header for why this is the opposite way round from the
              impact burst's. */}
          {arcs.map((arc, i) => (
            <Path
              key={i}
              d={arc.path}
              fill="none"
              stroke={tint}
              strokeWidth={1.1}
              strokeOpacity={0.3 + on * 0.36}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
      ) : null}
    </View>
  );
}
