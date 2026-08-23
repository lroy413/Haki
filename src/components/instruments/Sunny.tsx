import Svg, { Circle, Ellipse, G, Line, Path, Polygon } from 'react-native-svg';
import type { HardeningLevel } from '../../domain/hardening';

/**
 * The Thousand Sunny, on the water at the top of the home screen.
 *
 * It is the hardening readout with a face on it — and the one thing it must
 * never be is a bar with a boat on it. A ship travelling along a track toward
 * somewhere is a progress bar in fancy dress, and `domain/hardening.ts` forbids
 * that for good reasons. So the Sunny does not move. It sits where it sits,
 * and what changes is what the ship and the water are *doing*:
 *
 *   0  at anchor — canvas furled, anchor down, flag hanging, water flat
 *   1  under way — sails set, the first crests, a short wake
 *   2  making way — full canvas, more sea running
 *   3  running    — sails hard, spray off the bow, wake tearing behind
 *
 * At anchor, not adrift. A ship at anchor at seven in the morning is a ship
 * about to leave; a ship adrift has failed at something, and this app does not
 * own a picture of failure.
 *
 * Drawn as a silhouette. At around fifty points of ship on a phone, three
 * things carry it and nothing else does: a crescent hull, square sails, and
 * the lion at the bow. The first pass proved the last one is the whole job —
 * a circle with a pointed muzzle is a duck, and a duck is what it looked like.
 * The mane spikes are what make it a lion, and they are also, conveniently,
 * a sun.
 */

type Sea = { waves: number; wake: number; spray: boolean; sail: number; anchored: boolean };

/** What each level is doing. `sail` is how much canvas is drawn, 0 to 1. */
const STATE: Record<HardeningLevel, Sea> = {
  0: { waves: 0, wake: 0, spray: false, sail: 0, anchored: true },
  1: { waves: 3, wake: 1, spray: false, sail: 0.55, anchored: false },
  2: { waves: 6, wake: 2, spray: false, sail: 0.8, anchored: false },
  3: { waves: 10, wake: 3, spray: true, sail: 1, anchored: false },
};

/**
 * Two masts, well apart.
 *
 * The second pass set them 26 units apart with sails half again as wide, and
 * the two sails merged into one grey block that read as a deckhouse. Canvas
 * needs sky around it or it stops being canvas.
 */
const MASTS = [
  { x: 86, top: 6, foot: 43, sailTop: 11 },
  { x: 118, top: 14, foot: 43, sailTop: 19 },
];

const SAIL_FOOT = 37;
const WATERLINE = 56;

/**
 * Where the crests sit, in the order they arrive.
 *
 * A list rather than an even division: five wave marks spaced identically read
 * as a dotted rule, and the sea fills in around the ship as the day does
 * rather than marching outward from it.
 */
const WAVE_X = [40, 76, 112, 150, 6, 182, -30, 216, -66, 250];

/**
 * The sea runs past both ends of the viewBox on purpose.
 *
 * The band is far wider than this drawing's aspect, so `meet` centres a
 * 200-unit ship in it and leaves air either side. Geometry outside the viewBox
 * still paints — it is clipped to the viewport, not the box — so a waterline
 * drawn from -150 to 350 reaches the edge of any screen while the ship stays
 * its own size in the middle of it.
 */
const SEA_FROM = -150;
const SEA_TO = 350;

/**
 * A square sail on its yard, bellied at the foot.
 *
 * The first pass drew a lens between two points on the mast, which renders as
 * a leaf. A brig's sail is a broad trapezoid hung from a yard, and the belly
 * lives in the curve along the bottom.
 */
function sailPath(x: number, top: number, foot: number, fullness: number): string {
  const half = 5 + 4 * fullness;
  const belly = 2 + 3 * fullness;
  return [
    `M ${x - half} ${top}`,
    `L ${x + half} ${top}`,
    `L ${x + half + belly} ${foot}`,
    `Q ${x} ${foot + 5} ${x - half - belly * 0.4} ${foot}`,
    'Z',
  ].join(' ');
}

/** The mane. Nine spikes around the head — a lion, and a sun. */
function mane(cx: number, cy: number, inner: number, outer: number): string[] {
  return Array.from({ length: 9 }).map((_, i) => {
    const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
    const spread = 0.28;
    const tip = `${(cx + Math.cos(a) * outer).toFixed(1)},${(cy + Math.sin(a) * outer).toFixed(1)}`;
    const left = `${(cx + Math.cos(a - spread) * inner).toFixed(1)},${(cy + Math.sin(a - spread) * inner).toFixed(1)}`;
    const right = `${(cx + Math.cos(a + spread) * inner).toFixed(1)},${(cy + Math.sin(a + spread) * inner).toFixed(1)}`;
    return `${left} ${tip} ${right}`;
  });
}

export function Sunny({
  level,
  /** The hull, the masts, the lion: the solid silhouette. */
  ink,
  /** The sea, the wake, the spray, the anchor cable. */
  faint,
  /** The Jolly Roger. */
  flag,
}: {
  level: HardeningLevel;
  ink: string;
  faint: string;
  flag: string;
}) {
  const sea = STATE[level];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 200 72" preserveAspectRatio="xMidYMax meet">
      {/* ------------------------------------------------------------ sea */}
      <Line
        x1={SEA_FROM}
        y1={WATERLINE}
        x2={SEA_TO}
        y2={WATERLINE}
        stroke={faint}
        strokeWidth={1}
      />
      {Array.from({ length: sea.waves }).map((_, i) => {
        const x = WAVE_X[i % WAVE_X.length];
        // Alternating depth *and* width. A single row of identical crests is
        // a scalloped border, not a sea.
        const y = WATERLINE + (i % 3 === 0 ? 3 : i % 3 === 1 ? 8 : 12);
        const w = i % 2 === 0 ? 15 : 10;
        return (
          <Path
            key={`w${i}`}
            d={`M ${x} ${y} q ${w / 2} -4 ${w} 0`}
            fill="none"
            stroke={faint}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        );
      })}
      {/* The wake tears back from the stern, never forward from the bow. */}
      {Array.from({ length: sea.wake }).map((_, i) => (
        // Angled, and widening away from the stern: three level rules read as
        // a barcode under the ship rather than as water being pushed aside.
        <Line
          key={`k${i}`}
          x1={54 - i * 5}
          y1={WATERLINE - 4 + i * 3}
          x2={-14 - i * 26}
          y2={WATERLINE + 2 + i * 5}
          stroke={faint}
          strokeWidth={1.2}
          strokeLinecap="round"
        />
      ))}

      {/* ----------------------------------------------------------- ship */}
      <G>
        {/* Anchor cable, on the only morning it is down. */}
        {sea.anchored ? (
          <Line
            x1="141"
            y1="44"
            x2="152"
            y2={WATERLINE + 8}
            stroke={faint}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ) : null}

        {/* Canvas first, masts over it: one silhouette in one colour, with the
            spars reading as the lines *through* the sails rather than beside
            them. Two tones here turned the rig into a building. */}
        {MASTS.map((mast) =>
          sea.sail > 0 ? (
            <Path
              key={`s${mast.x}`}
              d={sailPath(mast.x, mast.sailTop, SAIL_FOOT, sea.sail)}
              fill={ink}
            />
          ) : (
            // Furled: the canvas is gathered along the yard in a bundle.
            <Ellipse
              key={`s${mast.x}`}
              cx={mast.x}
              cy={mast.sailTop + 1}
              rx={9}
              ry={2.2}
              fill={ink}
            />
          ),
        )}
        {MASTS.map((mast) => (
          <G key={mast.x}>
            <Line
              x1={mast.x}
              y1={mast.top}
              x2={mast.x}
              y2={mast.foot}
              stroke={ink}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            {/* The yard, always: it is what a furled sail hangs from. */}
            <Line
              x1={mast.x - 10}
              y1={mast.sailTop}
              x2={mast.x + 10}
              y2={mast.sailTop}
              stroke={ink}
              strokeWidth={1.4}
              strokeLinecap="round"
            />
          </G>
        ))}

        {/* The Jolly Roger. It streams once there is way on to stream it, and
            hangs down the mast when there is not. */}
        <Polygon
          points={
            sea.sail > 0
              ? `${MASTS[0].x},${MASTS[0].top} ${MASTS[0].x + 14},${MASTS[0].top + 2.5} ${MASTS[0].x},${MASTS[0].top + 5}`
              : `${MASTS[0].x},${MASTS[0].top} ${MASTS[0].x + 4},${MASTS[0].top + 2} ${MASTS[0].x + 2.5},${MASTS[0].top + 7} ${MASTS[0].x},${MASTS[0].top + 7}`
          }
          fill={flag}
        />

        {/*
          Hull: a crescent, and a deep one. The deck sags amidships and lifts
          at both ends, which is the line that says "ship" before any of the
          detail does — but the third pass drew it four units deep and it read
          as a canoe. Fifteen units, sitting *on* the waterline rather than
          through it, is a ship.
        */}
        <Path d={`M 56 41 Q 102 46 148 40 L 144 49 Q 102 56 60 49 Z`} fill={ink} />
        {/* The aftercastle, standing at the stern and overlapping the deck so
            the two read as one shape rather than a box alongside a boat. */}
        <Path d={`M 56 32 L 73 35 L 73 44 L 57 42 Z`} fill={ink} />
        {/* The prow, rising to carry the figurehead. */}
        <Path d={`M 136 40 L 157 29 L 163 36 L 145 45 Z`} fill={ink} />

        {/* The lion. Spikes first, so the head sits on top of its own mane. */}
        {mane(164, 29, 5, 10).map((points, i) => (
          <Polygon key={`m${i}`} points={points} fill={ink} />
        ))}
        <Circle cx="164" cy="29" r="5.4" fill={ink} />
        {/* A blunt snout, never a point: a point is a beak. */}
        <Ellipse cx="170.5" cy="30.5" rx="4.2" ry="3.2" fill={ink} />

        {/* Spray off the forefoot, at the only speed that throws any. */}
        {sea.spray
          ? [0, 1, 2].map((i) => (
              <Path
                key={`s${i}`}
                d={`M ${150 + i * 6} ${50 - i * 4} q 5 -5 11 -3`}
                fill="none"
                stroke={faint}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            ))
          : null}
      </G>
    </Svg>
  );
}
