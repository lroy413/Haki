import Svg, { Ellipse, G, Path } from 'react-native-svg';

/**
 * The fist. Luffy's instrument, and the shape of the default impact frame.
 *
 * A punch seen from the receiving end — the four curled fingers fill the
 * face, the thumb locks across beneath them, the back of the hand recedes to
 * a wrist that runs off the frame. That is the composition of every graphic
 * punch in the references, and the view an impact frame is always drawn from.
 *
 * The rendering is the black-fist idiom from the line-art sheets: a solid
 * mass with **complete interior contours** in the ground's colour — full
 * finger separations, the jagged fold where the fingers curl in, the thumb
 * with its nail, the knuckle ridge, wrist creases. Sparse licks read as a
 * glove; contour drawing is what reads as a hand.
 *
 * `fill` is the body, `rim` is the aura, `sheen` is the line. All from the
 * palette at the call site so the frame inverts on both grounds; nothing
 * here owns a colour.
 */
export function Fist({ fill, rim, sheen }: { fill: string; rim: string; sheen: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
      <G transform="rotate(-8 50 50)">
        {/* The aura, wrapping the whole hand — two shells faking falloff,
            since native SVG has no blur to lean on. */}
        <Ellipse cx={52} cy={50} rx={40} ry={34} fill={rim} fillOpacity={0.2} />
        <Ellipse cx={52} cy={50} rx={32} ry={27} fill={rim} fillOpacity={0.32} />

        {/* One mass: four scalloped finger columns, the back of the hand
            receding top-right, the thumb closing the bottom. */}
        <Path
          d="M24 42
             Q24 30.5 30 27.2
             Q33.5 25.4 36 27.6
             Q39.5 24.6 43 25.6
             Q47 24.4 49.5 26.6
             Q52.5 24.6 55.5 25.8
             Q59 24.8 61 27.4
             Q64 26 66 27.6
             Q80 28 91 33.5
             Q100 37 106 36.5
             L106 61
             Q97 60.5 89 62.5
             Q80 66 73 69
             Q66 74 56 75.5
             Q44 77 34 73.5
             Q27 71 24.5 63
             Z"
          fill={fill}
        />

        {/* The contours: what makes it a hand instead of a mitt. */}
        <G stroke={sheen} fill="none" strokeLinecap="round" strokeLinejoin="round">
          {/* full-length separations between the four fingers */}
          <Path d="M36.5 28 Q34.8 43 36.8 59" strokeWidth={2} />
          <Path d="M49.5 27 Q47.8 43 49.8 60" strokeWidth={2} />
          <Path d="M61.5 28 Q60 43 61.5 59" strokeWidth={1.9} />
          {/* each finger's mid-joint crease */}
          <Path d="M28.5 45 Q31.5 43.8 34.5 45" strokeWidth={1} strokeOpacity={0.65} />
          <Path d="M41 44.5 Q44 43.2 47 44.5" strokeWidth={1} strokeOpacity={0.65} />
          <Path d="M53.5 44.5 Q56.5 43.4 59 44.5" strokeWidth={1} strokeOpacity={0.6} />
          <Path d="M64.5 45 Q67 44 69 45" strokeWidth={0.9} strokeOpacity={0.55} />
          {/* the fold: a jagged line with a wedge where each finger turns in */}
          <Path
            d="M25.5 60 L34 61.5 L36.8 58.5 L39 62 L47 62.5 L49.8 59.5 L52 63 L59.5 63 L61.5 60 L63.5 63.5 L69 62.5"
            strokeWidth={2.4}
          />
          {/* the thumb, locked across beneath the fingers, and its nail */}
          <Path d="M26.5 66 Q38 72.5 52 71.5 Q62 70.5 68.5 65.5" strokeWidth={2.2} />
          <Path d="M47.5 67 Q47.5 70.2 50.8 70.4 Q54.4 70.4 54.6 66.8" strokeWidth={1.4} />
          <Path d="M31 68.5 Q34.5 70.3 38.5 70.8" strokeWidth={1} strokeOpacity={0.6} />
          {/* the knuckle ridge, where the face turns into the back of the hand */}
          <Path d="M67.5 30 Q70 29 71.5 31" strokeWidth={1.5} />
          <Path d="M73 33.5 Q75.5 33 77 35.5" strokeWidth={1.5} />
          <Path d="M78.5 38.5 Q80.8 38.5 82 41" strokeWidth={1.4} />
          {/* the back of the hand: two tendons and the wrist creases */}
          <Path d="M70 34 Q74 42 74.5 52" strokeWidth={0.9} strokeOpacity={0.55} />
          <Path d="M76 38 Q79.5 45 79 54" strokeWidth={0.9} strokeOpacity={0.5} />
          <Path d="M92 40 Q94 47 92.5 55" strokeWidth={1.2} />
          <Path d="M97 39.5 Q99 47 97.5 56" strokeWidth={1} strokeOpacity={0.7} />
        </G>

        {/* The lit plane along the knuckle tops — the third value that turns
            a poster into a form; ground-colour washes model correctly on
            both frames. */}
        <G stroke={sheen} fill="none" strokeLinecap="round">
          <Path d="M27 33 Q30.5 30.5 34 32" strokeWidth={3.6} strokeOpacity={0.11} />
          <Path d="M40 31 Q43.5 29 47 30.5" strokeWidth={3.6} strokeOpacity={0.11} />
          <Path d="M52.5 31 Q55.5 29.5 58.5 31" strokeWidth={3.4} strokeOpacity={0.1} />
          <Path d="M63.5 32 Q65.5 31 67.5 32.5" strokeWidth={3} strokeOpacity={0.12} />
          <Path d="M74 34 Q84 36 93 37.5" strokeWidth={4} strokeOpacity={0.1} />
        </G>
      </G>
    </Svg>
  );
}
