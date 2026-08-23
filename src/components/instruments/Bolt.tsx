import { useMemo } from 'react';
import Svg, { ClipPath, Defs, G, Polyline, Rect } from 'react-native-svg';

/*
 * REPLACING THIS DRAWING
 * ----------------------
 * The Armament gauge: one horizontal bolt, filling left to right.
 *
 * Keep for a redraw:
 *   - viewBox `0 0 200 26`, preserveAspectRatio "none" is NOT used — the
 *     caller gives it a wide, short box and the drawing keeps its aspect.
 *   - Props: `track` (the faint unlit channel), `core` (the bolt's centre,
 *     the darkest colour the palette owns), `halo` (the hot rim — Armament's
 *     crimson), `fill` 0..1 for how far across it has travelled.
 *   - The channel must run the full 0..200 so `fill` can clip it anywhere.
 *   - The composition: a single jagged main channel with short frayed
 *     branches, reading as the reference stills — one strike crossing the
 *     frame — not as a field of bolts. The fray is what keeps a horizontal
 *     zigzag from reading as a heartbeat trace.
 *
 * The *system* is not in here and must survive any redraw: what `fill` means
 * (hardness / 100) is decided at the call site from `domain/armament.ts`,
 * and the geometry is seeded so it never re-rolls between renders.
 */

/** Deterministic. The same channel every time, on purpose. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const WIDTH = 200;
const HEIGHT = 26;
const MID = 13;

type Channel = { main: string; branches: string[] };

/**
 * The main channel wanders around the midline in hard segments, kicking to
 * alternate sides so it reads as lightning rather than as noise, and frays a
 * short branch off roughly every third vertex the way the reference stills
 * do — thinner, angled back, dying quickly.
 */
function build(): Channel {
  const rand = seeded(0x51c7);
  const points: [number, number][] = [[0, MID + 1.5]];
  const branches: string[] = [];

  // Irregular on purpose: mostly long, near-level runs with small wander, an
  // occasional hard spike, and the step length itself random — a fixed step
  // with alternating sides reads as a heartbeat trace, which the references
  // pointedly do not.
  let x = 0;
  let y = MID + 1.5;
  let side = -1;
  while (x < WIDTH - 6) {
    x += 6 + rand() * 14;
    const spike = rand() < 0.3;
    if (spike || rand() < 0.7) side = -side;
    y = MID + side * (spike ? 6 + rand() * 5 : 1 + rand() * 3.5);
    points.push([Math.min(x, WIDTH), y]);

    // A fray off the sharper vertices: a few thin segments angling away and
    // dying, most kicked backward the way a discharge frays behind its head.
    if (spike && x < WIDTH - 14) {
      const dir = side;
      const back = rand() < 0.7 ? -1 : 1;
      let bx = x;
      let by = y;
      const branch: string[] = [`${bx.toFixed(1)},${by.toFixed(1)}`];
      const steps = 2 + Math.floor(rand() * 3);
      for (let s = 0; s < steps; s += 1) {
        bx += back * (4 + rand() * 7);
        by += dir * (2.5 + rand() * 4);
        branch.push(`${bx.toFixed(1)},${by.toFixed(1)}`);
      }
      branches.push(branch.join(' '));
    }
  }
  points.push([WIDTH, MID + side * 2]);

  return {
    main: points.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' '),
    branches,
  };
}

const CHANNEL = build();

export function Bolt({
  track,
  core,
  halo,
  fill,
}: {
  track: string;
  core: string;
  halo: string;
  /** 0..1 — how far across the frame the strike has travelled. */
  fill: number;
}) {
  const litWidth = Math.max(0, Math.min(1, fill)) * WIDTH;
  const channel = useMemo(() => CHANNEL, []);

  return (
    <Svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet">
      <Defs>
        <ClipPath id="bolt-lit">
          <Rect x={0} y={0} width={litWidth} height={HEIGHT} />
        </ClipPath>
      </Defs>

      {/* The unlit channel: the storm's path, waiting. A hairline, so the lit
          part is unmistakably the subject. */}
      <Polyline
        points={channel.main}
        fill="none"
        stroke={track}
        strokeWidth={0.8}
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />

      {/* The strike so far. Three passes: a wide glow, the bolt itself in
          the hot colour, and a dark filament down its middle — Advanced
          Armament's crimson lightning with the black core, and the same
          stack on every ground. */}
      <G clipPath="url(#bolt-lit)">
        <Polyline
          points={channel.main}
          fill="none"
          stroke={halo}
          strokeWidth={5.4}
          opacity={0.28}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        {channel.branches.map((points, i) => (
          <Polyline
            key={`bh${i}`}
            points={points}
            fill="none"
            stroke={halo}
            strokeWidth={1.3}
            opacity={0.85}
            strokeLinecap="butt"
            strokeLinejoin="miter"
          />
        ))}
        <Polyline
          points={channel.main}
          fill="none"
          stroke={halo}
          strokeWidth={2.3}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <Polyline
          points={channel.main}
          fill="none"
          stroke={core}
          strokeWidth={0.9}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </G>
    </Svg>
  );
}
