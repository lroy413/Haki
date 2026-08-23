import Svg, { G, Line, Path } from 'react-native-svg';

/**
 * The fist. Luffy's instrument, and the shape of the default impact frame.
 *
 * Drawn front-on — four knuckles, thumb wrapped across — because that is the
 * view the receiver gets, and an impact frame is always drawn from the
 * receiving end. Original geometry, not traced: an impact silhouette wants to
 * be bold and simple enough to read in fifty milliseconds, which a faithful
 * drawing would actually be worse at.
 *
 * `fill` is the body, `rim` is the coat of Haki around it, `lines` is the
 * radial burst. All three come from the palette at the call site so the frame
 * inverts correctly on both grounds; nothing here owns a colour.
 */
export function Fist({
  size,
  fill,
  rim,
  lines,
  sheen,
}: {
  size: number;
  fill: string;
  rim: string;
  lines: string;
  /** Glints on the knuckles — hardened Armament is glossy, so the frame is. */
  sheen: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Radial burst: the intensity comes off the fist, so every line points
          away from its centre and none of them touch it. */}
      <G stroke={lines} strokeWidth={1.6} strokeLinecap="round">
        <Line x1={50} y1={13} x2={50} y2={3} />
        <Line x1={71} y1={18} x2={77} y2={9} />
        <Line x1={86} y1={33} x2={95} y2={27} />
        <Line x1={91} y1={54} x2={99} y2={54} />
        <Line x1={86} y1={73} x2={94} y2={79} />
        <Line x1={29} y1={18} x2={23} y2={9} />
        <Line x1={14} y1={33} x2={5} y2={27} />
        <Line x1={9} y1={54} x2={1} y2={54} />
        <Line x1={14} y1={73} x2={6} y2={79} />
      </G>

      {/* Wrist, entering from the bottom. */}
      <Path d="M38 83 L62 83 L64 100 L36 100 Z" fill={fill} stroke={rim} strokeWidth={2.4} />

      {/* The fist, front-on: the four curled fingers are most of its face,
          so the silhouette is four knuckle masses and the grooves between
          them, the way the reference drawing carries it. */}
      <Path
        d="M22 52
           Q22 40 27 35
           Q28 27 34 27 Q39 27 40 33
           Q41 26 47 26 Q52 26 53 32
           Q54 26 60 26 Q65 27 66 33
           Q67 28 72 29 Q77 31 77 40
           L77 66
           Q77 78 66 82
           L34 84
           Q22 82 22 68 Z"
        fill={fill}
        stroke={rim}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />

      {/* The grooves between the fingers: strongest at the knuckles, gone by
          the heel — run them long enough to read as fingers, no further. */}
      <G stroke={rim} strokeWidth={1.8} strokeLinecap="round" fill="none">
        <Line x1={40} y1={36} x2={40} y2={58} />
        <Line x1={53} y1={34} x2={53} y2={60} />
        <Line x1={66} y1={36} x2={66} y2={56} />
      </G>

      {/* Each finger bends on its own; a single line across reads as a wire. */}
      <G stroke={rim} strokeWidth={1.5} strokeLinecap="round" fill="none">
        <Path d="M28 45 Q33 43 38 45" />
        <Path d="M42 44 Q47 42 51 44" />
        <Path d="M55 44 Q60 42 64 44" />
        <Path d="M68 45 Q72 43 75 45" />
      </G>

      {/* The thumb, tucked across the bottom left corner. */}
      <Path
        d="M24 76 Q26 66 35 67 Q42 68 41 75 Q40 81 32 82 Q26 81 24 76 Z"
        fill={fill}
        stroke={rim}
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* Glints: hardened Armament is glossy, and the gloss is what reads. */}
      <G stroke={sheen} strokeWidth={2} strokeLinecap="round">
        <Line x1={31} y1={34} x2={35} y2={33} />
        <Line x1={45} y1={32} x2={48} y2={32} />
        <Line x1={58} y1={32} x2={61} y2={32} />
      </G>
    </Svg>
  );
}
