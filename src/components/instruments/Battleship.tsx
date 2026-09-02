import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

/**
 * The Battleship Bag.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - viewBox `0 0 ${W} ${H}` (240 × 130), `preserveAspectRatio="xMidYMax
 *     slice"` — it fills the dock's width and crops sky off the top, because
 *     the hull runs off the frame anyway and a letterboxed hull with the
 *     card's ground showing either side of it is a ship in a box, not a wall
 *     you are standing under. The scrapyard floor is `FLOOR` (y = 108); the
 *     hull rises out of the top-left and its belly curves down to meet it.
 *   - Five colour props and nothing else: `ink` for the hull and the figure,
 *     `faint` for plating and rivets, `tint` for the lens light catching on
 *     the torn edge of a dent, `ground` to paint a crater as the sky showing
 *     through, and `deck` for the wreckage underfoot. No literals, no
 *     palette reads. There is a test.
 *   - `hits` is 0..7. Keep the seven `DENTS` in order — hit N always lands in
 *     the same place, so a hull with three hits looks the same on Wednesday
 *     as it did on Tuesday plus one, and the week reads as a record.
 *   - Keep the figure. It is what says the scale.
 * ---------------------------------------------------------------------------
 *
 * The frame this is drawn from: young Aokiji and Garp in a navy scrapyard,
 * dwarfed by the underside of a beached battleship, punching its hull. **It
 * is not the whole ship — it is the bottom of one**, a wall of riveted plate
 * curving up out of the frame, seen from where a person stands. The first
 * cut drew a warship in profile at sea, turrets and funnel and all, and the
 * owner sent the frame: _"It isn't the whole ship but just the bottom part."_
 * So this is the bottom part: the belly of the hull, the strakes running
 * along it, the keel, the wreckage it rests on, and one small figure at its
 * foot with a fist up — which is the only thing in the picture that says
 * how big it is.
 *
 * The rule that makes it honest is in `domain/training.ts`: a day is one
 * hit, it cannot go past seven, and on Monday there is a fresh hull. Two
 * things the drawing must never become: a progress bar (it does not fill or
 * count — a hull with four dents is a picture of four days you can see
 * roughly and cannot read exactly) and a picture of failure (an unmarked
 * hull on a Thursday is a wall of armour waiting for you, not an empty bar —
 * the damage is the good news, which is the joke of the whole image).
 */

export const W = 240;
export const H = 130;
export const FLOOR = 108;

/**
 * The hull's belly, as it hangs over the yard: from off the top-left edge,
 * bulging out and down to rest on the floor at the right. Everything else on
 * the hull — strakes, keel, dents — follows this curve.
 */
const BELLY = `M -8 -6 C 30 12, 110 22, 160 48 C 192 66, 206 86, 208 ${FLOOR}`;
/** The plate wall's fill: the belly curve closed against the top-left corner. */
const HULL = `${BELLY} L -8 ${FLOOR} Z`;

/**
 * The seven dents, in the order they land — x along the hull, y on the plate,
 * and the size of the bite. Spread from the middle of the face outward, so a
 * half-week reads as a beaten centre and a full week as plate gone all the
 * way along it.
 */
const DENTS: { x: number; y: number; r: number }[] = [
  { x: 96, y: 62, r: 11 },
  { x: 54, y: 50, r: 9 },
  { x: 134, y: 74, r: 10 },
  { x: 24, y: 78, r: 8 },
  { x: 166, y: 88, r: 9 },
  { x: 76, y: 84, r: 10 },
  { x: 116, y: 94, r: 9 },
];

/**
 * A crater's outline: a jagged ring of `r` around the point, with a crack or
 * two radiating from it. Deterministic per dent — the jag pattern is a fixed
 * table rather than a random one, so the same day's hit is the same shape.
 */
const JAG = [1, 0.72, 0.95, 0.68, 1, 0.78, 0.9, 0.7, 0.98, 0.74, 0.88, 0.66];

function craterPath(x: number, y: number, r: number): string {
  const pts = JAG.map((k, i) => {
    const a = (i / JAG.length) * Math.PI * 2;
    return `${(x + Math.cos(a) * r * k).toFixed(1)} ${(y + Math.sin(a) * r * k * 0.82).toFixed(1)}`;
  });
  return `M ${pts.join(' L ')} Z`;
}

/** A strake: a plating seam that follows the belly, offset down into the hull. */
function strake(offset: number): string {
  return `M -8 ${-6 + offset} C 30 ${12 + offset}, 110 ${22 + offset}, 160 ${48 + offset} C 192 ${66 + offset}, 206 ${86 + offset}, 208 ${FLOOR + offset}`;
}

export function Battleship({
  hits,
  ink,
  faint,
  tint,
  ground,
  deck,
}: {
  /** 0..7 from `hitsThisWeek`. */
  hits: number;
  ink: string;
  faint: string;
  /** The lens light, catching on the torn edge of a dent. */
  tint: string;
  /** The exact colour behind the hull — a crater is the sky showing through. */
  ground: string;
  /** The wreckage underfoot. */
  deck: string;
}) {
  const n = Math.max(0, Math.min(DENTS.length, Math.round(hits)));
  const dents = DENTS.slice(0, n);

  return (
    <Svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
    >
      {/* The hull: a wall of plate, curving up and out of the frame. */}
      <Path d={HULL} fill={ink} />
      {/* The strakes — plating seams following the belly — and the rivets
          along them. Drawn in the faint colour at low opacity so they read as
          seams in armour rather than as stripes. */}
      {[14, 30, 46, 62].map((off) => (
        <Path
          key={off}
          d={strake(off)}
          fill="none"
          stroke={faint}
          strokeWidth={1}
          opacity={0.45}
        />
      ))}
      {[14, 30, 46, 62].map((off) =>
        [8, 32, 56, 80, 104, 128, 150, 170, 186].map((t) => {
          // Rivets sit a little below each seam, spaced along the curve.
          const p = pointOn(t, off + 4);
          const gone = dents.some((d) => Math.hypot(d.x - p.x, d.y - p.y) < d.r + 2);
          return gone ? null : (
            <Circle key={`${off}-${t}`} cx={p.x} cy={p.y} r={1.1} fill={faint} opacity={0.75} />
          );
        }),
      )}
      {/* The keel: a heavier band along the very edge of the belly, the plate
          a punch lands on first. */}
      <Path d={BELLY} fill="none" stroke={faint} strokeWidth={3.5} opacity={0.35} />
      <Path d={BELLY} fill="none" stroke={ink} strokeWidth={1.2} />

      {/* The dents: craters punched through the plate, the sky showing
          through them, with cracks running off across the armour and the
          lens light catching on the torn edge — the coating, on the one place
          a punch has been. */}
      {dents.map((d, i) => (
        <G key={i}>
          <Path d={craterPath(d.x, d.y, d.r)} fill={ground} />
          {/* Cracks, two per crater, in the ground colour so they read as
              splits in the plate. */}
          <Path
            d={`M ${d.x + d.r * 0.8} ${d.y - d.r * 0.3} l ${d.r * 0.7} ${-d.r * 0.4} l ${d.r * 0.4} ${d.r * 0.2} l ${d.r * 0.6} ${-d.r * 0.45}`}
            stroke={ground}
            strokeWidth={1.1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d={`M ${d.x - d.r * 0.6} ${d.y + d.r * 0.6} l ${-d.r * 0.4} ${d.r * 0.65} l ${d.r * 0.25} ${d.r * 0.3}`}
            stroke={ground}
            strokeWidth={1}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* The glint: the torn lip, lit. Short arcs on the upper-left rim,
              where light would fall on bent metal. */}
          <Path
            d={`M ${d.x - d.r * 0.9} ${d.y - d.r * 0.1} Q ${d.x - d.r * 0.6} ${d.y - d.r * 0.85} ${d.x + d.r * 0.1} ${d.y - d.r * 0.82}`}
            stroke={tint}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
            opacity={0.95}
          />
          <Path
            d={`M ${d.x + d.r * 0.3} ${d.y - d.r * 0.78} Q ${d.x + d.r * 0.75} ${d.y - d.r * 0.55} ${d.x + d.r * 0.85} ${d.y - d.r * 0.15}`}
            stroke={tint}
            strokeWidth={1.2}
            fill="none"
            strokeLinecap="round"
            opacity={0.6}
          />
        </G>
      ))}

      {/* A full week: a split runs the length of the face, crater to crater.
          The hull is caving, which is what Garp was working toward. */}
      {n >= DENTS.length ? (
        <Path
          d={`M ${DENTS[3].x} ${DENTS[3].y} L ${DENTS[5].x - 6} ${DENTS[5].y - 4} L ${DENTS[0].x} ${DENTS[0].y + 6} L ${DENTS[6].x - 4} ${DENTS[6].y - 8} L ${DENTS[2].x} ${DENTS[2].y + 3} L ${DENTS[4].x} ${DENTS[4].y - 6}`}
          stroke={ground}
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
        />
      ) : null}

      {/* The yard: wreckage the hull rests on, painted after it so the keel
          sits buried in it rather than floating above it. */}
      <Rect x={0} y={FLOOR} width={W} height={H - FLOOR} fill={deck} />
      {/* Broken timbers and plate lying about, in the faint colour, more of
          it as the week goes on — what a punched hull sheds. */}
      {[
        [8, 114, 26, 116],
        [40, 118, 62, 116],
        [150, 116, 176, 118],
        [200, 113, 226, 114],
      ]
        .concat(n >= 3 ? [[100, 119, 122, 121]] : [])
        .concat(n >= 5 ? [[128, 113, 146, 115]] : [])
        .concat(n >= 7 ? [[66, 112, 92, 111]] : [])
        .map(([x1, y1, x2, y2], i) => (
          <Line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={faint}
            strokeWidth={2.4}
            strokeLinecap="round"
            opacity={0.7}
          />
        ))}

      {/* The figure. Small, at the foot of the wall, fist up — the only
          thing in the picture that says how big the hull is. */}
      <G>
        <Circle cx={222} cy={FLOOR - 15} r={2.4} fill={ink} />
        <Path
          d={`M 222 ${FLOOR - 12.5} L 222 ${FLOOR - 5} M 222 ${FLOOR - 5} L 219 ${FLOOR} M 222 ${FLOOR - 5} L 225 ${FLOOR} M 222 ${FLOOR - 11} L 215 ${FLOOR - 16} M 222 ${FLOOR - 10} L 226 ${FLOOR - 7}`}
          stroke={ink}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <Circle cx={214.5} cy={FLOOR - 16.5} r={1.5} fill={ink} />
      </G>
    </Svg>
  );
}

/**
 * A point along a strake, for placing rivets: `x` runs 0..208 along the
 * hull, and the y is read off the same curve the strake follows.
 *
 * Written as one expression on purpose. The first cut had a block-scoped
 * `const u` derived from the parameter, and the minifier renamed both to
 * `t` — the inner one shadowing the outer inside its own initialiser, which
 * is a temporal-dead-zone throw on every render of the ability page. No
 * inner binding, nothing to shadow.
 */
function pointOn(x: number, offset: number): { x: number; y: number } {
  const y =
    x <= 160
      ? -6 + 54 * (((x + 8) / 168) ** 2 * 0.55 + ((x + 8) / 168) * 0.45)
      : 48 + 60 * (((x - 160) / 48) ** 2 * 0.6 + ((x - 160) / 48) * 0.4);
  return { x, y: y + offset };
}
