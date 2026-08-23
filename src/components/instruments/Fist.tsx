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
 * The rendering follows the manga panel, not the anime cel. Oda's hardened
 * fist has no outline: it is a solid black mass whose forms are carried
 * entirely by broken licks of light along their top edges, floating inside a
 * soft bubble of aura. So the body paths here are stroked barely or not at
 * all, the sheen strokes are calligraphic and partial, and the Haki sits
 * around the whole fist as an envelope rather than hugging its edge.
 *
 * `fill` is the body, `rim` is the aura, `lines` is the radial burst, `sheen`
 * is the light. All four come from the palette at the call site so the frame
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
      {/* The aura: a soft envelope around the whole fist, the way the manga
          draws Ryuo — two offset shells faking the falloff, because native SVG
          has no blur to lean on. */}
      <Path
        d="M50 12 Q86 14 90 52 Q92 82 70 94 L32 96 Q10 86 10 54 Q13 18 50 12 Z"
        fill={rim}
        fillOpacity={0.2}
      />
      <Path
        d="M50 18 Q80 20 84 52 Q86 78 67 89 L34 90 Q16 82 16 54 Q19 23 50 18 Z"
        fill={rim}
        fillOpacity={0.32}
      />

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
      <Path d="M36 78 L64 78 L66 100 L34 100 Z" fill={fill} />

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
      />

      {/* The light. Thick wedges where an edge catches it and nothing else —
          on a black mass the manga lets three or four licks carry everything,
          and every extra line is noise. */}
      <G stroke={sheen} fill="none" strokeLinecap="round">
        {/* along the knuckle tops */}
        <Path d="M29.5 32 Q33.5 29 38 30.5" strokeWidth={4.2} />
        <Path d="M43.5 30 Q47.5 28 51 29.5" strokeWidth={4.2} />
        <Path d="M56.5 30 Q60 28 63.5 29.5" strokeWidth={3.8} />
        <Path d="M68.5 32.5 Q71 31.5 73 32.5" strokeWidth={2.8} />
        {/* a short lick down each finger's lit side */}
        <Path d="M41.5 37 L41.5 44" strokeWidth={2.6} />
        <Path d="M54.5 36 L54.5 45" strokeWidth={2.6} />
        <Path d="M67 37 L67 43" strokeWidth={2.2} />
        {/* the left flank */}
        <Path d="M25.5 40 Q24.2 47 25.2 53" strokeWidth={2.6} />
        {/* the thumb, wrapped across the lower half: its whole form is one
            long lick of light along the top edge, hooking down at the tip */}
        <Path d="M27.5 73 Q38 65.5 51 69.5 Q56.5 71.5 55.5 76.5" strokeWidth={3.2} />
        <Path d="M31 80 Q37.5 82 44 80" strokeWidth={2} />
      </G>
    </Svg>
  );
}
