import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { radius } from '../../theme/tokens';

/**
 * Hardened steel — 武装色's material.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * Same contract as `Stone.tsx` and `Water.tsx`: fills its parent absolutely,
 * paints only background, never knows what is written over it.
 *
 *   - Colours are props, never literals: `face`, `deep`, `sheen`.
 *   - `hardness` is 0..1. It decides one thing — how much light the surface
 *     holds — and it decides it everywhere at once: the sweep, the edge, and
 *     the grain all come up together.
 *   - Returns a `<View>` filling its parent. Give the parent
 *     `overflow: 'hidden'` and a radius.
 *
 * What makes it read as *hardened* rather than merely dark is the **sheen**:
 * a hard-edged band of light raked across the face, plus a lit top edge.
 * CLAUDE.md already says this about the specular on cards — "that sheen is
 * what makes the black read as hardened rather than merely dark" — and this
 * is that sentence as a material.
 *
 * The grain runs the same way as the sweep. Brushed metal has a direction,
 * and a surface whose highlight and grain disagree reads as plastic.
 * ---------------------------------------------------------------------------
 *
 * The concept document asks for armour you can see: bare at nothing, full
 * black sheen at everything. This is that, and it is deliberately *not* a
 * bar — you cannot read a number off how bright a plate is, which is the
 * same licence `lit()` operates under.
 */
export function Steel({
  face,
  deep,
  sheen,
  hardness,
  round = radius.lg,
}: {
  face: string;
  deep: string;
  sheen: string;
  /** 0..1 — how coated the tool is. Light, never a figure. */
  hardness: number;
  round?: number;
}) {
  const W = 320;
  const H = 150;
  const h = Math.max(0, Math.min(1, hardness));

  // The rake. Steep enough to read as a highlight travelling across a
  // surface rather than a diagonal stripe painted on one.
  const grain = Array.from({ length: 14 }, (_, i) => {
    const x = (i / 13) * (W + 90) - 60;
    return `M ${x.toFixed(0)} ${H + 10} L ${(x + 74).toFixed(0)} -10`;
  }).join(' ');

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ borderRadius: round }}
      >
        <Defs>
          <LinearGradient id="steelFace" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={sheen} stopOpacity="0.1" />
            <Stop offset="0.45" stopColor={face} stopOpacity="1" />
            <Stop offset="1" stopColor={deep} stopOpacity="1" />
          </LinearGradient>
          {/* The sweep travels along the rake, so its own gradient runs the
              same way the band does. */}
          <LinearGradient id="steelSweep" x1="0.1" y1="1" x2="0.7" y2="0">
            <Stop offset="0" stopColor={sheen} stopOpacity="0" />
            <Stop offset="0.45" stopColor={sheen} stopOpacity="0.85" />
            <Stop offset="0.62" stopColor={sheen} stopOpacity="0.3" />
            <Stop offset="1" stopColor={sheen} stopOpacity="0" />
          </LinearGradient>
        </Defs>

        <Rect width={W} height={H} fill={face} />
        <Rect width={W} height={H} fill="url(#steelFace)" />

        {/* Brushed grain, along the rake. Faint at bare, present when
            coated — the surface itself gets a texture as it hardens. */}
        <Path
          d={grain}
          fill="none"
          stroke={sheen}
          strokeWidth={0.7}
          strokeOpacity={0.05 + 0.09 * h}
        />

        {/* The sweep: one raked band of light. This is the whole read. */}
        <G opacity={0.18 + 0.62 * h}>
          <Path
            d={`M ${W * 0.24} ${H + 12} L ${W * 0.24 + 96} -12 L ${W * 0.24 + 150} -12 L ${W * 0.24 + 54} ${H + 12} Z`}
            fill="url(#steelSweep)"
          />
        </G>

        {/* The lit edge along the top, and the shadow the plate sits in at
            the foot. A coated surface catches hardest where it turns. */}
        <Rect width={W} height={1.4} fill={sheen} fillOpacity={0.2 + 0.55 * h} />
        <Rect y={H - 1.2} width={W} height={1.2} fill={deep} fillOpacity={0.85} />
      </Svg>
    </View>
  );
}
