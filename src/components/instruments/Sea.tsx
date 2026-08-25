import Svg, { Line, Path } from 'react-native-svg';
import type { HardeningLevel } from '../../domain/hardening';

/**
 * The water the Sunny sits on.
 *
 * Split out from the ship on purpose. The ship is a *drawing* — a thing whose
 * quality is judged by eye and which somebody may well redraw properly in
 * Illustrator one day. The sea is a *system*: undulation, wavelength, phase,
 * how much of it is running. Those are different jobs and they belong in
 * different files, so replacing one never means touching the other. Both draw
 * into the same viewBox at the same aspect, so they stack and align exactly.
 *
 * How it builds with the day:
 *
 *   0  flat calm — one line, no swell at all
 *   1  a swell starts and a second line appears behind it
 *   2  three lines running, crests forming
 *   3  full swell, crests everywhere, wake tearing back from the stern
 *
 * The swell is one function evaluated three times at different depths,
 * wavelengths and phases. Layering is what stops water reading as a rule with
 * decoration on it: a near line moving differently to a far one is most of
 * what makes a flat drawing look like a surface.
 */

/** The ship's own coordinate system. Both drawings share it. */
export const SEA_VIEWBOX = '0 0 200 72';
export const WATERLINE = 58;

/**
 * The sea runs past both ends of the viewBox on purpose.
 *
 * The band is far wider than this drawing's aspect, so `meet` centres a
 * 200-unit scene in it and leaves air either side. Geometry outside the
 * viewBox still paints — it is clipped to the viewport, not the box — so water
 * drawn from -150 to 350 reaches the edge of any screen while the ship stays
 * its own size in the middle of it.
 */
const FROM = -150;
const TO = 350;

type Water = { swell: number; crests: number; wake: number; lines: 1 | 2 | 3 };

/**
 * How much sea is running, 0..1 by hardening level.
 *
 * Exported because this is the app's *one* answer to that question: the
 * settings chart draws its own water and it has to be the same water — flat
 * calm on paper, full swell in the settled dark — or the two screens would
 * disagree about the weather.
 */
export const SWELL: Record<HardeningLevel, number> = { 0: 0, 1: 0.35, 2: 0.7, 3: 1 };

const STATE: Record<HardeningLevel, Water> = {
  0: { swell: SWELL[0], crests: 0, wake: 0, lines: 1 },
  1: { swell: SWELL[1], crests: 2, wake: 1, lines: 2 },
  2: { swell: SWELL[2], crests: 5, wake: 2, lines: 3 },
  3: { swell: SWELL[3], crests: 8, wake: 3, lines: 3 },
};

/**
 * One run of swell.
 *
 * Alternating quadratics: each pair of half-wavelengths completes a trough and
 * a crest, which is a sine wave with none of the arithmetic. At zero amplitude
 * every segment is flat and the path is a straight line — so calm water is the
 * same code with the wind taken out of it, rather than a special case.
 */
export function swellPath(
  y: number,
  amp: number,
  wavelength: number,
  rising: boolean,
  from = FROM,
  to = TO,
): string {
  const half = wavelength / 2;
  let d = `M ${from} ${y}`;
  let up = rising;
  for (let x = from; x < to; x += half) {
    d += ` q ${(half / 2).toFixed(1)} ${(up ? -amp : amp).toFixed(2)} ${half.toFixed(1)} 0`;
    up = !up;
  }
  return d;
}

/**
 * The three runs, far to near.
 *
 * Different wavelengths and opposed phases, so they never line up into stripes
 * — and shorter and deeper as they come toward you, which is the whole of
 * perspective at this size.
 */
const RUNS = [
  { dy: -3, amp: 1.1, wavelength: 52, rising: true, opacity: 0.4, width: 1 },
  { dy: 0, amp: 1.9, wavelength: 36, rising: false, opacity: 1, width: 1.1 },
  { dy: 6, amp: 2.7, wavelength: 27, rising: true, opacity: 0.65, width: 1.2 },
];

/**
 * Where the crests sit, in the order they arrive.
 *
 * A list rather than an even division: crests spaced identically read as a
 * dotted rule, and the sea fills in around the ship as the day does rather
 * than marching outward from it.
 */
const CREST_X = [22, 176, 60, 210, -14, 132, -52, 244, -88, 278];

/** The stern the wake trails from. Nudge this if the ship is ever redrawn. */
const STERN_X = 166;

export function Sea({
  level,
  /** Every line of it. The water is one colour and one weight. */
  colour,
}: {
  level: HardeningLevel;
  colour: string;
}) {
  const water = STATE[level];

  return (
    <Svg width="100%" height="100%" viewBox={SEA_VIEWBOX} preserveAspectRatio="xMidYMax meet">
      {RUNS.slice(0, water.lines).map((run, i) => (
        <Path
          key={`run${i}`}
          d={swellPath(WATERLINE + run.dy, run.amp * water.swell, run.wavelength, run.rising)}
          fill="none"
          stroke={colour}
          strokeWidth={run.width}
          strokeLinecap="round"
          opacity={run.opacity}
        />
      ))}

      {Array.from({ length: water.crests }).map((_, i) => {
        // Caps ride *on* a run rather than floating between them. Loose arcs
        // in the gaps read as clutter once the water underneath actually
        // moves — they were carrying the sea before the swell existed.
        const run = RUNS[i % water.lines];
        const x = CREST_X[i % CREST_X.length];
        const w = i % 2 === 0 ? 13 : 9;
        return (
          <Path
            key={`c${i}`}
            d={`M ${x} ${WATERLINE + run.dy - 1} q ${w / 2} -4 ${w} 0`}
            fill="none"
            stroke={colour}
            strokeWidth={1.2}
            strokeLinecap="round"
            opacity={run.opacity}
          />
        );
      })}

      {/* The wake tears back from the stern — she sails left, so it runs
          right. Angled and widening: three level rules read as a barcode. */}
      {Array.from({ length: water.wake }).map((_, i) => (
        <Line
          key={`k${i}`}
          x1={STERN_X + i * 5}
          y1={WATERLINE - 2 + i * 2.5}
          x2={STERN_X + 58 + i * 22}
          y2={WATERLINE + 1 + i * 3.5}
          stroke={colour}
          strokeWidth={1.2}
          strokeLinecap="round"
          opacity={0.8}
        />
      ))}
    </Svg>
  );
}
