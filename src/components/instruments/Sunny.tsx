import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
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
 * Drawn against silhouette references, which settled four things the earlier
 * passes had wrong:
 *
 * 1. **She faces left**, lion at the bow, stern to the right. Every reference
 *    draws her that way, and it is the view the shape is recognised from.
 * 2. **The hull is a deep bowl**, and the heaviest thing on the page. Three
 *    passes drew it shallow and every one read as a canoe.
 * 3. **Crow's nests.** A round platform partway up each mast is the detail
 *    that says *this* ship rather than any ship, and no amount of hull is a
 *    substitute for it.
 * 4. **A railing along the deck**, which is what gives the hull a scale.
 *
 * The lion is still the whole job at the bow: a circle with a pointed muzzle
 * is a duck, and a duck is what an earlier pass looked like. The mane spikes
 * are what make it a lion — and they are also, conveniently, a sun.
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
 * Two masts, well apart, each with its platform and its flag.
 *
 * `nest` is where the crow's nest rides, above the yard the sail hangs from.
 * Two earlier passes got the balance wrong in opposite directions: sails so
 * wide they merged into a deckhouse, then sails so short the masts stood bare
 * above them and the whole thing read as a barge. The rig is most of the
 * drawing's height, as it is in every reference.
 */
const MASTS = [
  { x: 76, top: 3, nest: 11, yard: 16, half: 11 },
  { x: 114, top: 1, nest: 9, yard: 14, half: 13 },
];

const DECK = 42;
/**
 * The sail's foot, and the number that took the longest to get right.
 *
 * It has to clear the deck by a good margin. Set flush to it, the canvas and
 * the hull merge into one mass and the rig reads as two buildings on a barge —
 * which is exactly what the pass before this looked like. Sky between the foot
 * of a sail and the deck is what makes it a hanging sail.
 */
const SAIL_FOOT = 33;
const WATERLINE = 58;

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
 * Where the crests sit, in the order they arrive.
 *
 * A list rather than an even division: crests spaced identically read as a
 * dotted rule, and the sea fills in around the ship as the day does rather
 * than marching outward from it.
 */
const WAVE_X = [22, 176, 60, 210, -14, 132, -52, 244, -88, 278];

/**
 * A square sail on its yard, bellied at the foot and trailing aft.
 *
 * She sails left, so the canvas bellies right — which is also what makes the
 * rig read as being pushed rather than parked.
 */
function sailPath(
  x: number,
  top: number,
  foot: number,
  half: number,
  fullness: number,
): string {
  const w = half * (0.62 + 0.38 * fullness);
  const belly = 2 + 4 * fullness;
  // Narrower at the foot than at the yard. Widening downward is a roof, and a
  // roof on a mast is a building.
  const foot_w = w * 0.78;
  return [
    `M ${x - w} ${top}`,
    `L ${x + w} ${top}`,
    `L ${x + foot_w + belly} ${foot}`,
    `Q ${x + belly * 0.3} ${foot + 3.5} ${x - foot_w + belly * 0.3} ${foot}`,
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
  /** The hull, the rig, the lion: the whole silhouette, in one colour. */
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
        const y = WATERLINE + (i % 3 === 0 ? 3 : i % 3 === 1 ? 7 : 11);
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
      {/* The wake tears back from the stern — she sails left, so it runs
          right. Angled and widening: three level rules read as a barcode. */}
      {Array.from({ length: sea.wake }).map((_, i) => (
        <Line
          key={`k${i}`}
          x1={162 + i * 5}
          y1={WATERLINE - 3 + i * 3}
          x2={230 + i * 26}
          y2={WATERLINE + 3 + i * 5}
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
            x1="44"
            y1="47"
            x2="34"
            y2={WATERLINE + 8}
            stroke={faint}
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ) : null}

        {/* Canvas first, spars over it: one silhouette in one colour, with the
            masts reading as the lines *through* the sails. */}
        {MASTS.map((mast) =>
          sea.sail > 0 ? (
            <Path
              key={`s${mast.x}`}
              d={sailPath(mast.x, mast.yard, SAIL_FOOT, mast.half, sea.sail)}
              fill={ink}
            />
          ) : null,
        )}

        {MASTS.map((mast) => (
          <G key={mast.x}>
            <Line
              x1={mast.x}
              y1={mast.top}
              x2={mast.x}
              y2={DECK + 2}
              stroke={ink}
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            {/*
              The yard. Furled, it is simply thicker — canvas gathered along a
              spar *is* a fatter spar, and the bundle this used to draw as its
              own ellipse blobbed into the crow's nest above it.
            */}
            <Line
              x1={mast.x - mast.half}
              y1={mast.yard}
              x2={mast.x + mast.half}
              y2={mast.yard}
              stroke={ink}
              strokeWidth={sea.sail > 0 ? 1.4 : 4.5}
              strokeLinecap="round"
            />
            {/* The crow's nest: a round platform riding partway up. This is
                the reference detail that makes her this ship and not a ship. */}
            <Rect
              x={mast.x - 5}
              y={mast.nest - 3}
              width={10}
              height={5.5}
              rx={2.2}
              fill={ink}
            />
            {/* Every masthead carries a flag; only the main flies the Roger. */}
            <Polygon
              points={
                sea.sail > 0
                  ? `${mast.x},${mast.top - 1} ${mast.x + 11},${mast.top + 1.5} ${mast.x},${mast.top + 4}`
                  : `${mast.x},${mast.top - 1} ${mast.x + 3.5},${mast.top + 1.5} ${mast.x + 2},${mast.top + 4.5} ${mast.x},${mast.top + 4.5}`
              }
              fill={mast === MASTS[1] ? flag : ink}
            />
          </G>
        ))}

        {/*
          The hull: deep, and a crescent — both ends swept up above the deck
          line. A bowl with straight ends is a hovercraft, which is what it
          looked like for two passes.
        */}
        <Path
          d={
            `M 40 33 Q 50 41 64 43 L 148 43 Q 162 42 168 33 ` +
            `Q 168 50 138 57 Q 96 62 64 55 Q 44 48 40 33 Z`
          }
          fill={ink}
        />

        {/* The aftercastle, standing at the stern and stepped. */}
        <Path d={`M 142 29 L 160 29 L 160 44 L 142 44 Z`} fill={ink} />
        <Rect x="147" y="24" width="7" height="6" rx="1.5" fill={ink} />

        {/* The bow, carrying the figurehead out over the water. */}
        <Path d={`M 50 31 L 37 28 L 33 40 L 48 43 Z`} fill={ink} />

        {/* The lion. Spikes first, so the head sits on top of its own mane. */}
        {mane(30, 31, 5.5, 11).map((points, i) => (
          <Polygon key={`m${i}`} points={points} fill={ink} />
        ))}
        <Circle cx="30" cy="31" r="6" fill={ink} />
        {/* A blunt muzzle, never a point: a point is a beak. */}
        <Ellipse cx="22.5" cy="32.5" rx="4.6" ry="3.4" fill={ink} />

        {/* Spray off the forefoot, at the only speed that throws any. */}
        {sea.spray
          ? [0, 1, 2].map((i) => (
              <Path
                key={`p${i}`}
                d={`M ${40 - i * 6} ${52 - i * 4} q -5 -5 -11 -3`}
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
