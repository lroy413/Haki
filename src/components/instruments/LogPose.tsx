import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';

/**
 * The Log Pose.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 *   - Draws into a box `2r` across centred on (cx, cy) in the caller's own
 *     viewBox, and returns a `<G>`. It does not fill a parent, because it is
 *     furniture inside a bigger picture rather than a card's ground.
 *   - Colours are props, never literals: `wood`, `woodDark`, `glass`, `dial`,
 *     `needle`, `needleBack`, `ink`. They come from the palette's fixed
 *     instrument set and are identical on all four hardening levels.
 *   - `pencil` drops every fill and leaves the outline. That is the paper
 *     level, where the whole chart is pencilled and nothing catches light.
 *   - **The needle does not move**, and nothing about the day may be passed
 *     in to make it. See below.
 *
 * The composition, if you redraw it: a wooden case seen slightly from above,
 * a glass dome sitting in it with a highlight on the upper left, a dial
 * inside, and a needle across the dial with one half dark and one pale. The
 * dome reading as glass is the whole job — take the highlight off and it is
 * a button.
 * ---------------------------------------------------------------------------
 *
 * It replaced a compass rose, which was the right idea and the wrong
 * instrument: this screen is the Log Pose, and drawing a mariner's compass on
 * it was a stock nautical mark standing in for the thing the app is actually
 * named after.
 *
 * **The needle is fixed, and that is the design.** 覇王色 is the lens with no
 * meter — what this screen gives back is a bearing, not a score — so a needle
 * that swung with the day would be exactly the meter the screen refuses to
 * have. Canon is on side of the fixed needle too: a Log Pose locks onto an
 * island and holds, and what is at sea under each pillar is already said by
 * the lamps at the waterline.
 */
export function LogPose({
  cx,
  cy,
  r,
  wood,
  woodDark,
  glass,
  dial,
  needle,
  needleBack,
  ink,
  pencil,
  id,
}: {
  cx: number;
  cy: number;
  /** Half the width of the whole instrument, case included. */
  r: number;
  wood: string;
  woodDark: string;
  glass: string;
  dial: string;
  needle: string;
  needleBack: string;
  /** The chart's own line colour, used for the pencilled outline. */
  ink: string;
  /** Paper catches nothing: outline only, no fills, no glass. */
  pencil?: boolean;
  /** Unique within the parent SVG — gradients are referenced by id. */
  id: string;
}) {
  // The case is a shallow ring the dome sits in, so the dome's centre rides
  // a little above the middle of the whole instrument.
  const domeR = r * 0.8;
  const domeY = cy - r * 0.12;
  const caseY = cy + r * 0.52;

  // The needle lies across the dial at a fixed bearing — north-east, which
  // is far enough off both axes to read as a needle rather than as a cross.
  const a = -Math.PI * 0.28;
  const tip = [domeR * 0.72 * Math.cos(a), domeR * 0.72 * Math.sin(a)];
  const tail = [-tip[0] * 0.86, -tip[1] * 0.86];
  const perp = [-Math.sin(a) * domeR * 0.13, Math.cos(a) * domeR * 0.13];

  if (pencil) {
    return (
      <G opacity={0.32} stroke={ink} fill="none" strokeWidth={0.9} strokeLinejoin="round">
        <Ellipse cx={cx} cy={caseY} rx={r * 0.72} ry={r * 0.3} />
        <Circle cx={cx} cy={domeY} r={domeR} />
        <Ellipse cx={cx} cy={domeY + domeR * 0.62} rx={domeR * 0.86} ry={domeR * 0.3} />
        <Path
          d={`M ${cx + tail[0]} ${domeY + tail[1]} L ${cx + perp[0]} ${domeY + perp[1]} L ${cx + tip[0]} ${domeY + tip[1]} L ${cx - perp[0]} ${domeY - perp[1]} Z`}
        />
      </G>
    );
  }

  return (
    // Furniture. It sits in the chart's open water and must never pull the
    // eye off the stones, which are the thing the screen is about.
    <G opacity={0.86}>
      <Defs>
        <LinearGradient id={`${id}w`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={wood} stopOpacity="1" />
          <Stop offset="1" stopColor={woodDark} stopOpacity="1" />
        </LinearGradient>
        <RadialGradient id={`${id}d`} cx="0.42" cy="0.36" r="0.72">
          <Stop offset="0" stopColor={glass} stopOpacity="0.95" />
          <Stop offset="0.6" stopColor={dial} stopOpacity="1" />
          <Stop offset="1" stopColor={woodDark} stopOpacity="0.9" />
        </RadialGradient>
        <LinearGradient id={`${id}g`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={glass} stopOpacity="0.55" />
          <Stop offset="0.45" stopColor={glass} stopOpacity="0.06" />
          <Stop offset="1" stopColor={glass} stopOpacity="0.22" />
        </LinearGradient>
      </Defs>

      {/* The case: a wooden stand the dome sits down into, seen slightly
          from above. Narrower than the dome, or it reads as a blob with a
          bubble balanced on it. */}
      <Ellipse cx={cx} cy={caseY} rx={r * 0.72} ry={r * 0.3} fill={`url(#${id}w)`} />
      <Ellipse cx={cx} cy={caseY - r * 0.1} rx={r * 0.6} ry={r * 0.2} fill={woodDark} />

      {/* The dial, and the needle lying on it. */}
      <Circle cx={cx} cy={domeY} r={domeR} fill={`url(#${id}d)`} />
      <G>
        <Path
          d={`M ${cx + tail[0]} ${domeY + tail[1]} L ${cx + perp[0]} ${domeY + perp[1]} L ${cx + tip[0]} ${domeY + tip[1]} Z`}
          fill={needle}
        />
        <Path
          d={`M ${cx + tail[0]} ${domeY + tail[1]} L ${cx - perp[0]} ${domeY - perp[1]} L ${cx + tip[0]} ${domeY + tip[1]} Z`}
          fill={needleBack}
          fillOpacity={0.9}
        />
        <Circle cx={cx} cy={domeY} r={domeR * 0.1} fill={needleBack} />
      </G>

      {/* The glass over it. Without the highlight this is a button. */}
      <Circle cx={cx} cy={domeY} r={domeR} fill={`url(#${id}g)`} />
      <Path
        d={`M ${cx - domeR * 0.62} ${domeY - domeR * 0.34} a ${domeR * 0.72} ${domeR * 0.72} 0 0 1 ${domeR * 0.52} ${-domeR * 0.42}`}
        fill="none"
        stroke={needleBack}
        strokeWidth={domeR * 0.16}
        strokeLinecap="round"
        opacity={0.5}
      />
      <Circle
        cx={cx}
        cy={domeY}
        r={domeR}
        fill="none"
        stroke={woodDark}
        strokeWidth={r * 0.05}
      />
    </G>
  );
}
