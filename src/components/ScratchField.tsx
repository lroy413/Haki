import { useMemo } from 'react';
import Svg, { Line, Polygon } from 'react-native-svg';

/**
 * The scratch-field: what makes an impact frame violent.
 *
 * The real frames are not a tidy radial burst — they are dozens of rough
 * speed-lines tearing from the centre to past the edges, with flecks of
 * debris shaken loose around the figure. Density and irregularity are the
 * whole texture, so the lines are generated, not drawn: a seeded generator
 * keeps them identical on every render and across both frames of the flash,
 * because the field must not re-roll mid-flash.
 *
 * `slice` crops a square field to the screen, so the lines genuinely run to
 * every edge on any aspect ratio.
 */

/** Deterministic. The same field every time, on purpose. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

type Scratch = { x1: number; y1: number; x2: number; y2: number; w: number };
type Fleck = { points: string };

function buildField(): { scratches: Scratch[]; flecks: Fleck[] } {
  const rand = seeded(0x81f5);
  const scratches: Scratch[] = [];
  const flecks: Fleck[] = [];

  for (let i = 0; i < 56; i += 1) {
    // Jittered around the circle so density varies without ever clumping.
    const angle = (i / 56) * Math.PI * 2 + (rand() - 0.5) * 0.22;
    const from = 26 + rand() * 12;
    const to = 52 + rand() * 32;
    scratches.push({
      x1: 50 + Math.cos(angle) * from,
      y1: 50 + Math.sin(angle) * from,
      x2: 50 + Math.cos(angle) * to,
      y2: 50 + Math.sin(angle) * to,
      w: 0.35 + rand() * 1.1,
    });
  }

  for (let i = 0; i < 16; i += 1) {
    const angle = rand() * Math.PI * 2;
    const r = 30 + rand() * 22;
    const cx = 50 + Math.cos(angle) * r;
    const cy = 50 + Math.sin(angle) * r;
    const s = 0.8 + rand() * 1.6;
    // Irregular shards, not neat triangles.
    flecks.push({
      points: [
        `${cx},${cy - s}`,
        `${cx + s * (0.6 + rand() * 0.8)},${cy + s * 0.4}`,
        `${cx - s * (0.5 + rand() * 0.7)},${cy + s * (0.5 + rand() * 0.6)}`,
      ].join(' '),
    });
  }

  return { scratches, flecks };
}

const FIELD = buildField();

export function ScratchField({ color }: { color: string }) {
  const field = useMemo(() => FIELD, []);
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      {field.scratches.map((s, i) => (
        <Line
          key={`s${i}`}
          x1={s.x1}
          y1={s.y1}
          x2={s.x2}
          y2={s.y2}
          stroke={color}
          strokeWidth={s.w}
          strokeLinecap="round"
        />
      ))}
      {field.flecks.map((f, i) => (
        <Polygon key={`f${i}`} points={f.points} fill={color} />
      ))}
    </Svg>
  );
}
