import Svg, { Polyline } from 'react-native-svg';

/**
 * Sky lightning — a bolt that falls.
 *
 * This is the concept document's own lightning, brought into the app. The
 * doc has run a canvas behind its pages since the beginning, and the owner
 * liked that bolt better than the one the app was drawing overhead — with
 * good reason. They are two different things and the app was using the
 * wrong one:
 *
 *   `Lightning.tsx` is a **burst**: hard, angular, mitred joins, thrown
 *   radially off a contact point. It is a fist landing, and it is exactly
 *   right for the impact frame.
 *
 *   This is **weather**: one long bolt falling from above the screen,
 *   wandering as it goes, throwing a branch or two, drawn thin and faint
 *   with a soft halo. Distant sky, not violence.
 *
 * The ambient layer was translating and rotating the burst field around the
 * screen, which reads as a starburst going off behind the app rather than
 * as a storm somewhere over the horizon.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - Drawn in a 100 × 220 box, stretched to fill (`preserveAspectRatio
 *     ="none"`). A real bolt is far longer than it is wide, so the stretch
 *     flatters it.
 *   - Two colours, both props: `halo` is the wide faint stroke that stands
 *     in for a glow — React Native SVG has no dependable blur, and a second
 *     wider pass at low alpha is what a blur would have produced anyway —
 *     and `core` is the thin bright line on top.
 *   - `seed` decides the shape. A new seed per strike is the intent here,
 *     unlike the burst, which is fixed on purpose.
 *
 * The one thing to keep if you redraw it: **the jag is enveloped by a
 * sine**, so the deviation is zero at both ends and greatest in the middle.
 * That is what makes it look struck rather than scribbled — it leaves the
 * cloud clean, wanders through the middle of its run, and arrives clean.
 * ---------------------------------------------------------------------------
 */

const W = 100;
const H = 220;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** One run, jagged perpendicular to its own direction. */
function segment(
  next: () => number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  jag: number,
): string {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const steps = Math.max(3, Math.round(len / 7));
  // The normal to the run. The offset goes along this, never along the run
  // itself, so the bolt never doubles back on its own path.
  const nx = -dy / len;
  const ny = dx / len;
  const pts: string[] = [`${x1.toFixed(1)},${y1.toFixed(1)}`];
  for (let i = 1; i < steps; i += 1) {
    const t = i / steps;
    const off = (next() - 0.5) * jag * Math.sin(t * Math.PI);
    pts.push(`${(x1 + dx * t + nx * off).toFixed(1)},${(y1 + dy * t + ny * off).toFixed(1)}`);
  }
  pts.push(`${x2.toFixed(1)},${y2.toFixed(1)}`);
  return pts.join(' ');
}

/** The bolt and its branches, as polyline point strings. */
export function boltFor(seed: number): { main: string; branches: string[] } {
  const next = rng(seed);
  const x = W * (0.05 + next() * 0.9);
  const ex = x + (next() - 0.5) * W * 0.35;
  const ey = H * (0.45 + next() * 0.6);
  const main = segment(next, x, -10, ex, ey, 9);

  const pts = main.split(' ');
  const branches: string[] = [];
  const count = 1 + Math.floor(next() * 2);
  for (let i = 0; i < count; i += 1) {
    // Forks come off the middle of the run, never the first or last stroke:
    // a branch at the cloud looks like two bolts, one at the tip looks like
    // a mistake.
    const at = pts[Math.floor(pts.length * (0.3 + next() * 0.45))];
    const [bx, by] = at.split(',').map(Number);
    branches.push(segment(next, bx, by, bx + (next() - 0.5) * 48, by + 16 + next() * 34, 5));
  }
  return { main, branches };
}

export function SkyBolt({
  seed,
  core,
  halo,
  /** Scales every stroke. The storm's strength, from `domain/ambient`. */
  width = 1,
}: {
  seed: number;
  core: string;
  halo: string;
  width?: number;
}) {
  const { main, branches } = boltFor(seed);
  const all = [main, ...branches];

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
      {/* The glow: one wide faint pass under everything. */}
      {all.map((points, i) => (
        <Polyline
          key={`h${i}`}
          points={points}
          fill="none"
          stroke={halo}
          strokeWidth={(i === 0 ? 2.6 : 1.8) * width}
          strokeOpacity={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
      {/* And the bolt itself, thin. Branches carry half the weight of the
          run they came off, which is what makes them read as branches. */}
      {all.map((points, i) => (
        <Polyline
          key={`c${i}`}
          points={points}
          fill="none"
          stroke={core}
          strokeWidth={(i === 0 ? 0.5 : 0.32) * width}
          strokeOpacity={i === 0 ? 1 : 0.55}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </Svg>
  );
}
