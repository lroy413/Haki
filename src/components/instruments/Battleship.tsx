import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

/**
 * The Battleship Bag.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - viewBox `0 0 ${W} ${H}` (240 × 100), `preserveAspectRatio="xMidYMax
 *     meet"`. The hull sits on `WATERLINE` (y = 86); below it is sea, and
 *     every dent bites into plating that shows above it — the first cut put
 *     the water at 76 and drowned six of the seven craters.
 *   - She faces **left**: bow on the left, stern on the right, like the
 *     Sunny, so the two ships on this app's screens agree about which way is
 *     forward.
 *   - Five colour props and nothing else: `ink` for the ship, `faint` for
 *     plating and shading, `tint` for the lens light that catches on the
 *     fresh metal of a dent, `ground` to paint a crater as absence, and
 *     `water` for the sea. No literals, no palette reads. There is a test.
 *   - `hits` is 0..7, one per day trained this week (`hitsThisWeek`). Keep
 *     the seven `DENTS` in order — hit N always lands in the same place, so a
 *     hull with three hits looks the same on Wednesday as it did on Tuesday
 *     plus one, and the week reads as a record rather than a random one.
 * ---------------------------------------------------------------------------
 *
 * Garp's battleship bags, from the manga: warships he punched until their
 * armoured hulls caved in, with no Haki and no Devil Fruit — _"a strength you
 * have to earn."_ The owner's picture for the gym is that hull, and the rule
 * that makes it honest is in `domain/training.ts`: **a day is one hit**, it
 * cannot go past seven, and on Monday there is a fresh ship.
 *
 * Two things this drawing must never become:
 *
 * A progress bar. The ship does not move, fill, or count. A hull with four
 * dents is a picture of four days, the same way the Sunny's canvas is a
 * picture of a day being used — you can see roughly how the week went and
 * you cannot read a score off it.
 *
 * A picture of failure. A hull with *no* dents on a Thursday is a warship at
 * anchor, whole, waiting — not an empty bar. The damage is the good news
 * here, which is the joke of the whole image and the reason it works.
 */

export const W = 240;
export const H = 100;
export const WATERLINE = 86;

/** Where the deck runs and how deep the hull goes. */
const DECK = 56;
const KEEL = 90;
/** Bow on the left, stern on the right. */
const BOW = 14;
const STERN = 226;

/**
 * The seven dents, in the order they land. Each is a bite out of the hull's
 * lower plating: an x along the keel, a width, and a depth. Spread from
 * midships outward so a half-week reads as a beaten centre and a full week
 * as a hull gone all the way along.
 */
const DENTS: { x: number; w: number; d: number }[] = [
  { x: 120, w: 26, d: 11 },
  { x: 78, w: 22, d: 9 },
  { x: 162, w: 24, d: 10 },
  { x: 48, w: 18, d: 8 },
  { x: 196, w: 20, d: 9 },
  { x: 100, w: 16, d: 13 },
  { x: 140, w: 18, d: 12 },
];

/** The hull's outline with the first `hits` dents bitten out of its bottom. */
function hullPath(hits: number): string {
  const dents = DENTS.slice(0, hits).sort((a, b) => a.x - b.x);
  // Start at the stern's deck corner, run the deck to the bow, drop the raked
  // bow to the keel, then come back along the keel biting out each dent.
  let d = `M ${STERN} ${DECK} L ${BOW + 10} ${DECK} L ${BOW} ${DECK + 6}`;
  d += ` C ${BOW - 2} ${DECK + 18}, ${BOW + 6} ${KEEL - 4}, ${BOW + 22} ${KEEL}`;
  let x = BOW + 22;
  for (const dent of dents) {
    const left = dent.x - dent.w / 2;
    const right = dent.x + dent.w / 2;
    d += ` L ${left} ${KEEL}`;
    // A crater: a jagged bite with a couple of teeth on the way up and down,
    // so it reads as caved-in plate rather than as a smooth scallop.
    const t1 = left + dent.w * 0.3;
    const t2 = left + dent.w * 0.55;
    const t3 = left + dent.w * 0.8;
    d += ` L ${t1} ${KEEL - dent.d * 0.7} L ${t2} ${KEEL - dent.d} L ${t3} ${KEEL - dent.d * 0.6} L ${right} ${KEEL}`;
    x = right;
  }
  d += ` L ${STERN - 10} ${KEEL} C ${STERN - 2} ${KEEL - 4}, ${STERN + 2} ${DECK + 14}, ${STERN} ${DECK} Z`;
  void x;
  return d;
}

/** A turret: a low drum with a barrel pointing forward. */
function Turret({
  x,
  ink,
  faint,
  scale = 1,
}: {
  x: number;
  ink: string;
  faint: string;
  scale?: number;
}) {
  const w = 22 * scale;
  const h = 9 * scale;
  const y = DECK - h;
  return (
    <G>
      <Rect x={x - w / 2} y={y} width={w} height={h} rx={3} fill={ink} />
      <Rect x={x - w / 2 + 3} y={y + 2} width={w - 6} height={2} fill={faint} opacity={0.5} />
      {/* Two barrels, forward. */}
      <Rect
        x={x - w / 2 - 20 * scale}
        y={y + h * 0.35}
        width={20 * scale}
        height={2.2}
        fill={ink}
      />
      <Rect
        x={x - w / 2 - 17 * scale}
        y={y + h * 0.65}
        width={17 * scale}
        height={2.2}
        fill={ink}
      />
    </G>
  );
}

export function Battleship({
  hits,
  ink,
  faint,
  tint,
  ground,
  water,
}: {
  /** 0..7 from `hitsThisWeek`. */
  hits: number;
  ink: string;
  faint: string;
  /** The lens light, catching on the fresh metal of a dent. */
  tint: string;
  /** The exact colour behind the ship — a crater is painted as absence. */
  ground: string;
  water: string;
}) {
  const n = Math.max(0, Math.min(DENTS.length, Math.round(hits)));
  const dents = DENTS.slice(0, n);
  // A beaten ship settles by the stern: a degree of list per two hits, so a
  // full week's hull sits visibly lower and wearier than Monday's.
  const list = Math.min(3.5, n * 0.5);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax meet"
    >
      <G rotation={list} origin={`${(BOW + STERN) / 2}, ${WATERLINE}`}>
        {/* The hull, with the week's dents bitten out of it. */}
        <Path d={hullPath(n)} fill={ink} />

        {/* Armour belt: the heavy plating along the waterline, drawn as a
            band of the faint colour so the hull has a seam a punch could
            find. */}
        <Rect
          x={BOW + 18}
          y={DECK + 8}
          width={STERN - BOW - 30}
          height={5}
          fill={faint}
          opacity={0.45}
        />
        {/* Portholes along the belt, skipped where a dent has taken the
            plate they were on. */}
        {Array.from({ length: 12 }, (_, i) => BOW + 34 + i * 15)
          .filter((px) => px < STERN - 22)
          .map((px) => {
            const gone = dents.some((d) => Math.abs(d.x - px) < d.w / 2 + 2);
            return gone ? null : (
              <Circle key={px} cx={px} cy={DECK + 18} r={1.6} fill={faint} opacity={0.7} />
            );
          })}

        {/* Superstructure, from the bow back: a forward turret, the bridge
            tower with its rangefinder, the funnel, a mast, an aft turret. */}
        <Turret x={70} ink={ink} faint={faint} />
        <Turret x={188} ink={ink} faint={faint} scale={0.9} />
        {/* The bridge: a stepped tower, wide at the base. */}
        <Rect x={100} y={DECK - 14} width={44} height={14} rx={2} fill={ink} />
        <Rect x={106} y={DECK - 26} width={30} height={12} rx={2} fill={ink} />
        <Rect x={112} y={DECK - 34} width={18} height={8} rx={1.5} fill={ink} />
        {/* Bridge windows. */}
        <Rect x={109} y={DECK - 23} width={24} height={2.4} fill={faint} opacity={0.6} />
        {/* The funnel, aft of the bridge, with smoke that thickens as the
            week wears on — a ship taking punishment runs her boilers. */}
        <Rect x={150} y={DECK - 30} width={12} height={30} rx={2} fill={ink} />
        <Rect x={149} y={DECK - 31} width={14} height={3} fill={ink} />
        {[0, 1, 2].map((i) => (
          <Ellipse
            key={i}
            cx={156 + i * 7 + n * 0.6}
            cy={DECK - 40 - i * 7}
            rx={5 + i * 2 + n * 0.5}
            ry={3.5 + i * 1.3}
            fill={faint}
            opacity={Math.max(0.12, 0.42 - i * 0.1) * (0.6 + n * 0.08)}
          />
        ))}
        {/* The mast, with a yard and a pennant. */}
        <Line x1={121} y1={DECK - 34} x2={121} y2={DECK - 58} stroke={ink} strokeWidth={1.8} />
        <Line x1={112} y1={DECK - 50} x2={130} y2={DECK - 50} stroke={ink} strokeWidth={1.4} />
        <Path d={`M 121 ${DECK - 58} L 133 ${DECK - 55} L 121 ${DECK - 52} Z`} fill={faint} />

        {/* The dents' fresh metal: the lens light catches on the torn edge,
            which is the coating — Armament's own colour, on the one place a
            punch has been. Drawn as short strokes along each crater rim, so
            it reads as a glint and never as a fill. */}
        {dents.map((dnt, i) => {
          const left = dnt.x - dnt.w / 2;
          const t2 = left + dnt.w * 0.55;
          return (
            <G key={i}>
              <Line
                x1={left + dnt.w * 0.3}
                y1={KEEL - dnt.d * 0.7}
                x2={t2}
                y2={KEEL - dnt.d}
                stroke={tint}
                strokeWidth={1.6}
                strokeLinecap="round"
                opacity={0.9}
              />
              <Line
                x1={t2}
                y1={KEEL - dnt.d}
                x2={left + dnt.w * 0.8}
                y2={KEEL - dnt.d * 0.6}
                stroke={tint}
                strokeWidth={1.2}
                strokeLinecap="round"
                opacity={0.65}
              />
              {/* A crack running up the plate from the crater. */}
              <Path
                d={`M ${t2} ${KEEL - dnt.d} l ${-2} ${-4} l ${3} ${-3} l ${-1.5} ${-4}`}
                stroke={ground}
                strokeWidth={1.2}
                fill="none"
                strokeLinecap="round"
                opacity={0.9}
              />
            </G>
          );
        })}
      </G>

      {/* The sea, drawn last so it crosses the keel and any dent that dips
          below the waterline reads as flooded. A flat band with a swell on
          top; the Sunny's own sea is a system and lives in Sea.tsx, but this
          ship is at anchor in a scrapyard and does not need weather. */}
      <Path
        d={`M 0 ${WATERLINE} Q 20 ${WATERLINE - 3} 40 ${WATERLINE} T 80 ${WATERLINE} T 120 ${WATERLINE} T 160 ${WATERLINE} T 200 ${WATERLINE} T 240 ${WATERLINE} L 240 ${H} L 0 ${H} Z`}
        fill={water}
        opacity={0.92}
      />
    </Svg>
  );
}
