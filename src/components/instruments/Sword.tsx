import Svg, { Ellipse, G, Path, Rect } from 'react-native-svg';

/**
 * The sword. Zoro's instrument, and the shape of his impact frame.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * Hand-plotted, like the fist beside it. If you draw a better katana,
 * swapping it in needs nothing outside this file. The contract is identical
 * to `Fist.tsx`, and deliberately so — the layer above cannot tell them
 * apart:
 *
 *   - `viewBox="0 0 100 100"`, `preserveAspectRatio="xMidYMid meet"`. The
 *     lightning in `../Lightning.tsx` crackles out of the same centre at the
 *     same aspect, so a drawing that keeps the box keeps the crackle.
 *   - Three colours, all props, no literals: `fill` is the body, `rim` is the
 *     aura, `sheen` is the interior line. The impact frame inverts between
 *     its two frames and the whole app moves through four palettes.
 *   - **The whole sword stays inside the box.** The first version ran the
 *     blade corner to corner and pushed both ends out of frame, which left a
 *     long grey diagonal — a stick. What makes a katana legible at a glance
 *     is the *ends*: the guard and the wrapped hilt at one, the angled
 *     kissaki at the other. Lose them and the drawing stops being a sword.
 *
 * The field owns the violence, the instrument owns the shape.
 * ---------------------------------------------------------------------------
 *
 * A single blade on the rising diagonal, caught at the end of a downward cut,
 * with the butt of the hilt at the lower left and the point near the upper
 * right — both comfortably inside the frame. The cutting edge carries a hard
 * highlight in `sheen` down one side only, the way the reference frames light
 * Enma when the flame is running along it; a highlight down both sides reads
 * as chrome, and this is a blade with fire on it.
 *
 * The three details that make a katana unmistakable are all here and all
 * necessary: the **tsuba** (the guard, an oval seen nearly edge-on), the
 * **wrap** (bindings crossing the hilt), and the **kissaki** (the angled
 * tip). Drop any one and it becomes a machete.
 */
export function Sword({ fill, rim, sheen }: { fill: string; rim: string; sheen: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      {/* The aura, following the cut rather than the object — two shells on
          the blade's own axis, since native SVG has no blur to lean on. */}
      <G transform="rotate(-38 50 50)">
        <Ellipse cx={48} cy={54} rx={62} ry={19} fill={rim} fillOpacity={0.17} />
        <Ellipse cx={48} cy={54} rx={54} ry={11} fill={rim} fillOpacity={0.28} />
      </G>

      <G transform="rotate(-38 50 50)">
        {/* -------------------------------------------------------- the hilt */}
        <Rect x={-2} y={51} width={25} height={9} rx={3.4} fill={fill} />
        {/* The wrap: narrow bindings angled the way tsuka-ito crosses. Kept
            thin — at full width they read as a barber's pole rather than
            cord, and the hilt stops looking gripped. */}
        <Path d="M 2 51 L 4.4 51 L 1.4 60 L -1 60 Z" fill={sheen} fillOpacity={0.38} />
        <Path d="M 7.6 51 L 10 51 L 7 60 L 4.6 60 Z" fill={sheen} fillOpacity={0.38} />
        <Path d="M 13.2 51 L 15.6 51 L 12.6 60 L 10.2 60 Z" fill={sheen} fillOpacity={0.38} />
        <Path d="M 18.8 51 L 21.2 51 L 18.2 60 L 15.8 60 Z" fill={sheen} fillOpacity={0.38} />

        {/* ------------------------------------------------------- the guard */}
        {/* The tsuba, across the blade rather than around it — at this angle
            it is an oval seen nearly edge-on. */}
        <Ellipse cx={24.5} cy={55.5} rx={3} ry={11} fill={fill} />
        <Ellipse cx={24.5} cy={55.5} rx={1.2} ry={9} fill={sheen} fillOpacity={0.3} />

        {/* ------------------------------------------------------- the blade */}
        {/* Slightly bowed, as a katana is: the spine is the long shallow
            curve on top, the edge the straighter side beneath it. One closed
            path, so the point can be a proper angled kissaki rather than a
            rounded cap. */}
        <Path
          d="M 27 51.2
             C 48 49.8, 72 47.6, 92.5 45.4
             L 97 49.2
             L 90 54.6
             C 70 56.4, 48 58.4, 27 60.2
             Z"
          fill={fill}
        />
        {/* The edge, lit. The cutting side only. */}
        <Path
          d="M 27 60.2 C 48 58.4, 70 56.4, 90 54.6 L 87.6 52.7 C 68 54.4, 48 56.2, 27 57.9 Z"
          fill={sheen}
          fillOpacity={0.92}
        />
        {/* The hi — the narrow groove down the spine. One thin line; two make
            it look like a ruler. */}
        <Path
          d="M 33 51.6 C 52 50.4, 72 48.8, 86 47.4 L 86.5 48.8 C 72 50.2, 52 51.8, 33 53 Z"
          fill={sheen}
          fillOpacity={0.32}
        />
      </G>
    </Svg>
  );
}
