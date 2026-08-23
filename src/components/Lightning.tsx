import { useMemo } from 'react';
import Svg, { Polyline } from 'react-native-svg';

/**
 * The black lightning.
 *
 * Advanced Armament does not just coat a fist, it crackles — short, hard,
 * angular bolts throwing off the contact point, black at the core with a hot
 * edge. That edge is the whole trick: a black bolt on a black ground is
 * nothing, and the reference frames never draw one without it.
 *
 * So every bolt is stroked twice — wide in the halo colour, narrow in the core
 * on top. The core is the darkest colour the palette owns, never the
 * instrument's own: the impact frame inverts, so taking the fist's colour made
 * the bolts *white* on the frame where the fist is pale. Against the light
 * frame that reads as a black bolt with a hot rim; against the dark one the
 * core sinks into the ground and the rim is all you see, which is exactly how
 * the animators draw it over a night sky.
 *
 * Deterministic, like the scratch field it fires alongside: the bolts are
 * generated once at module load rather than per render, because a field that
 * re-rolled between the two frames of a flash would read as static rather than
 * as one strike.
 *
 * **The second lightning is not this one.** Conqueror's leaks continuously and
 * in colour, and grows as the will behind it does — that needs the Conqueror's
 * unlock, which does not exist yet. This takes its colours, its count and its
 * reach as props so that version is a call site rather than a rewrite.
 */

/** Deterministic. The same bolts every time, on purpose. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

const SEGMENTS = 6;

/**
 * One bolt, thrown from `from` to `to` along `angle`.
 *
 * The lateral jitter widens along the run, so a bolt leaves the contact point
 * tight and frays as it travels — which is what stops a radial burst reading
 * as a sunburst.
 */
function bolt(rand: () => number, angle: number, from: number, to: number): string {
  const points: string[] = [];
  for (let i = 0; i <= SEGMENTS; i += 1) {
    const along = i / SEGMENTS;
    const r = from + (to - from) * along;
    // Alternating sides, widening as it travels: a bolt that only wanders is
    // a wobbly line. The kick back and forth is the whole read.
    const side = i % 2 === 0 ? 1 : -1;
    const spread = side * (1.5 + rand() * 5) * (0.25 + along);
    const x = 50 + Math.cos(angle) * r + Math.cos(angle + Math.PI / 2) * spread;
    const y = 50 + Math.sin(angle) * r + Math.sin(angle + Math.PI / 2) * spread;
    points.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return points.join(' ');
}

function buildBolts(count: number): string[] {
  const rand = seeded(0x2f19);
  const out: string[] = [];
  for (let i = 0; i < count; i += 1) {
    // Jittered around the circle so the throw is uneven without ever clumping.
    const angle = (i / count) * Math.PI * 2 + (rand() - 0.5) * 0.5;
    const from = 16 + rand() * 8;
    const to = 44 + rand() * 26;
    out.push(bolt(rand, angle, from, to));
    // Roughly every third bolt forks, which is what makes the rest read as
    // lightning rather than as spokes.
    if (rand() < 0.36) {
      const split = from + (to - from) * 0.55;
      out.push(
        bolt(rand, angle + (rand() < 0.5 ? -0.42 : 0.42), split, split + 12 + rand() * 14),
      );
    }
  }
  return out;
}

/**
 * Built once per distinct count and kept. Determinism is the point — a field
 * that re-rolled between two frames of one flash reads as static rather than
 * as a single strike — and the seed is fixed, so the same count is always the
 * same field.
 */
const FIELDS = new Map<number, string[]>();

function boltsFor(count: number): string[] {
  const cached = FIELDS.get(count);
  if (cached) return cached;
  const built = buildBolts(count);
  FIELDS.set(count, built);
  return built;
}

export function Lightning({
  core,
  halo,
  /** Scales how far the bolts throw. 1 is the strike everyone gets. */
  reach = 1,
  width = 1,
  /** How many bolts are thrown. Seven is one strike off a fist. */
  count = 7,
}: {
  core: string;
  halo: string;
  reach?: number;
  width?: number;
  count?: number;
}) {
  const bolts = useMemo(() => boltsFor(count), [count]);
  return (
    <Svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      // `meet`, matching the instrument it crackles around. `slice` on a phone
      // crops the box to a third of its width, which leaves the vertical bolts
      // running the whole screen and the horizontal ones stubs.
      preserveAspectRatio="xMidYMid meet"
      // Ryuo throws them further; scaling the whole drawing rather than the
      // geometry keeps them centred on the contact.
      style={{ transform: [{ scale: reach }] }}
    >
      {bolts.map((points, i) => (
        <Polyline
          key={`h${i}`}
          points={points}
          fill="none"
          stroke={halo}
          strokeWidth={width * 2.4}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      ))}
      {bolts.map((points, i) => (
        <Polyline
          key={`c${i}`}
          points={points}
          fill="none"
          stroke={core}
          strokeWidth={width}
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      ))}
    </Svg>
  );
}
