import { G, Path } from 'react-native-svg';

/**
 * The massif on the chart's horizon.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * Hand-plotted, like the Sunny, the fist and the isles. One mountain, seen
 * at night, built from flat facets — a snow cap catching the moon, a lit
 * face, a shadowed face, and a skirt of foothills. If you draw a better
 * mountain, swapping it in needs nothing outside this file:
 *
 *   - Drawn inside a local box of 200 × 118, base line at y = 118. The sky
 *     translates the group so that base sits on the far shore's own base —
 *     a mountain drawn taller simply rises higher into the stars.
 *   - Four colours, all props, no literals: `snow` for the cap, `litFace`
 *     for the moonward facets, `shadeFace` for the dark ones, `foot` for
 *     the foothills. The sky decides what those are per palette.
 *   - Returns a `<G>`, not an `<Svg>`.
 *
 * What makes it read as a mountain rather than a triangle is the *hem* —
 * the zigzag where snow meets rock — and the split down the arête: two
 * faces in two tones. Keep both.
 * ---------------------------------------------------------------------------
 */
export function Skyline({
  snow,
  litFace,
  shadeFace,
  foot,
}: {
  snow: string;
  litFace: string;
  shadeFace: string;
  foot: string;
}) {
  return (
    <G>
      {/* Foothills first, behind the peak's base. */}
      <Path d="M 8 118 L 42 74 L 66 96 L 84 118 Z" fill={foot} opacity={0.9} />
      <Path d="M 118 118 L 148 70 L 178 100 L 192 118 Z" fill={foot} opacity={0.9} />

      {/* The two faces, split at the arête under the summit. */}
      <Path d="M 100 34 L 96 42 L 60 118 L 100 118 Z" fill={litFace} opacity={0.55} />
      <Path d="M 100 34 L 104 42 L 142 118 L 100 118 Z" fill={shadeFace} />

      {/* The cap, with its hem — snow does not end in a straight line. */}
      <Path
        d="M 100 6 L 86 36 L 92 31 L 97 40 L 103 32 L 108 39 L 114 36 Z"
        fill={snow}
        opacity={0.92}
      />
      {/* A second, lesser fall of snow on the lit shoulder. */}
      <Path d="M 86 36 L 80 50 L 88 44 L 92 31 Z" fill={snow} opacity={0.5} />
    </G>
  );
}
