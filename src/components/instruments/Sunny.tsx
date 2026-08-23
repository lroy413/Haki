import Svg, { Circle, Ellipse, G, Line, Path, Polygon, Rect } from 'react-native-svg';
import type { HardeningLevel } from '../../domain/hardening';
import { SEA_VIEWBOX, WATERLINE } from './Sea';

/**
 * The Thousand Sunny.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * This is a hand-plotted silhouette and it is the weakest thing in the app. If
 * you draw a better one — in Illustrator or anywhere else — swapping it in is
 * meant to be easy, and nothing outside this file needs to change. The
 * contract is:
 *
 *   - Export to `viewBox="0 0 200 72"` with `preserveAspectRatio="xMidYMax
 *     meet"`. Those live in `Sea.tsx` as `SEA_VIEWBOX` and are imported here
 *     so the two can never drift apart.
 *   - Sit the hull on `WATERLINE` (y = 58). The sea is drawn separately and
 *     underneath, so anything below that line will be crossed by water.
 *   - She faces **left**: lion at the bow on the left, stern on the right. The
 *     wake in `Sea.tsx` trails right from `STERN_X`; nudge that if the stern
 *     moves.
 *   - Fill every part of the ship with the `ink` prop and the flag with
 *     `flag`. No colour literals — the ground moves through four palettes and
 *     a baked-in hex is right in exactly one of them. There is a test.
 *   - Keep the four `sail` states. `STATE` below is the only thing that reads
 *     the hardening level: furled at 0, then progressively more canvas. If a
 *     new drawing has a different rig, change the shapes and leave the table.
 *
 * The water is not here. It is a system rather than a drawing and it lives in
 * `Sea.tsx`, so redrawing the ship never means redrawing the sea.
 * ---------------------------------------------------------------------------
 *
 * The ship is the hardening readout with a face on it — and the one thing it
 * must never be is a bar with a boat on it. A ship travelling along a track
 * toward somewhere is a progress bar in fancy dress, and
 * `domain/hardening.ts` forbids that for good reasons. So the Sunny does not
 * move. She sits where she sits, and what changes is what she is doing: at
 * anchor with the canvas furled, then under way, making way, and running.
 *
 * At anchor, not adrift. A ship at anchor at seven in the morning is a ship
 * about to leave; a ship adrift has failed at something, and this app does not
 * own a picture of failure.
 *
 * Drawn against silhouette references, which settled four things earlier
 * passes had wrong: she faces left; the hull is a deep crescent with both ends
 * swept up, not a bowl and not the shallow canoe of the third pass; the sails
 * hang clear of the deck, because canvas set flush to a hull merges with it
 * and the rig reads as buildings on a barge; and she has crow's nests, the one
 * detail that says *this* ship rather than any ship. The lion is still the
 * whole job at the bow — a circle with a pointed muzzle is a duck, and a duck
 * is what an earlier pass looked like. The mane spikes are what make it a
 * lion, and they are also, conveniently, a sun.
 */

type Rig = { spray: boolean; sail: number; anchored: boolean };

/** What each level is doing. `sail` is how much canvas is drawn, 0 to 1. */
const STATE: Record<HardeningLevel, Rig> = {
  0: { spray: false, sail: 0, anchored: true },
  1: { spray: false, sail: 0.55, anchored: false },
  2: { spray: false, sail: 0.8, anchored: false },
  3: { spray: true, sail: 1, anchored: false },
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
  /** The spray and the anchor cable — the ship's own marks on the water. */
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
    <Svg width="100%" height="100%" viewBox={SEA_VIEWBOX} preserveAspectRatio="xMidYMax meet">
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
