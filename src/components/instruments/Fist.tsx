import Svg, { Ellipse, G, Path } from 'react-native-svg';

/**
 * The fist. Luffy's instrument, and the shape of the default impact frame.
 *
 * A punch, not a fist bump: every reference panel is a side profile with the
 * forearm driving in from the panel's edge, because direction is what makes
 * it a blow. So the drawing is horizontal — knuckles leading, forearm running
 * off the frame — rotated into a diagonal and sliced to the screen, entering
 * from the bottom-right corner the way Oda crops it at the panel border.
 *
 * The rendering rule stays the manga's: no outline. A solid black mass whose
 * forms are carried by licks of light — the long streak down the forearm's
 * top edge is the signature in every panel — inside a soft envelope of aura.
 *
 * `fill` is the body, `rim` is the aura, `sheen` is the light. All from the
 * palette at the call site so the frame inverts on both grounds; nothing
 * here owns a colour.
 */
export function Fist({ fill, rim, sheen }: { fill: string; rim: string; sheen: string }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
      <G transform="translate(4 2) rotate(47 45 42)">
        {/* The aura, hugging the fist and wrist — two shells faking falloff,
            since native SVG has no blur to lean on. */}
        <Ellipse cx={42} cy={42} rx={30} ry={26} fill={rim} fillOpacity={0.2} />
        <Ellipse cx={42} cy={42} rx={23} ry={20} fill={rim} fillOpacity={0.32} />

        {/* The fist, side on: the leading face is the stack of curled
            fingers, so the silhouette itself carries the bumps. */}
        <Path
          d="M38 26
             Q30 26 28 31
             Q23 32 24 37
             Q20.5 39 22 43
             Q20 46 23 49
             Q23 54 28 56
             Q31 59 38 59
             L48 59 Q54 58 56 54
             L56 31 Q52 26 46 26 Z"
          fill={fill}
        />

        {/* The forearm, driving in from past the frame — slimmer than the
            fist, the way every panel tapers it, and overlapping the wrist so
            no seam of ground can show through. */}
        <Path
          d="M52 31 Q70 27 84 29 Q98 31 112 28
             L112 58 Q96 62 80 60 Q66 58 52 55 Z"
          fill={fill}
        />

        {/* The light. The long streak down the forearm's top edge is the
            signature of every panel; the rest is a lick per form. */}
        <G stroke={sheen} fill="none" strokeLinecap="round">
          <Path d="M56 31.5 Q75 28 96 30" strokeWidth={2.6} />
          <Path d="M63 35 Q78 32.5 90 34" strokeWidth={1.1} />
          {/* the knuckle stack, one lick per bump */}
          <Path d="M30.5 30.5 Q27.5 31.5 27.8 34.5" strokeWidth={2.2} />
          <Path d="M26 36.5 Q23.8 38 24.3 41" strokeWidth={2} />
          <Path d="M23.5 44 Q22.5 45.8 24 48" strokeWidth={2} />
          <Path d="M25.5 51 Q26 53.5 28.5 55" strokeWidth={1.8} />
          {/* the back of the hand */}
          <Path d="M39 27.5 Q45 26.8 51 28" strokeWidth={2} />
          {/* the thumb, wrapped across the near side */}
          <Path d="M31 50 Q36 46 42 47.5" strokeWidth={2.2} />
          <Path d="M33 54.5 Q38 52.5 43 53.5" strokeWidth={1.3} />
          {/* the wrist creases */}
          <Path d="M55 33 L54.5 39" strokeWidth={1.1} />
          <Path d="M55.5 45 L55 52" strokeWidth={1.1} />
        </G>
      </G>
    </Svg>
  );
}
