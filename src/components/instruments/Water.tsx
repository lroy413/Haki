import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { radius } from '../../theme/tokens';

/**
 * Still water — 見聞色's material.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * Same contract as `Stone.tsx`, and for the same reason: it fills its parent
 * absolutely, paints only background, and never knows what is written over
 * it.
 *
 *   - Colours are props, never literals: `face`, `deep`, `sheen`.
 *   - `openness` is 0..1 — how far the day's reading has opened. It decides
 *     how far the rings have spread and how much light is on the surface.
 *     Nothing else varies, so the same value always draws the same water.
 *   - Returns a `<View>` filling its parent. Give the parent
 *     `overflow: 'hidden'` and a radius.
 *
 * What makes it read as *water* rather than a purple gradient is the pair of
 * things real still water has: a **reflection** — one soft horizontal band of
 * light lying on it, broken where the surface moves — and **rings**, spreading
 * from a point and flattening as they go. Ellipses, never circles: you are
 * looking across a surface, not down at one.
 * ---------------------------------------------------------------------------
 *
 * Perception is a surface you read things off, so the more open the reading,
 * the further the rings have travelled and the more the reflection settles
 * into an unbroken line. A closed reading is dark water with one ring barely
 * out from the centre — something has been dropped in and nothing has been
 * read yet.
 */
export function Water({
  face,
  deep,
  sheen,
  openness,
  round = radius.lg,
}: {
  face: string;
  deep: string;
  sheen: string;
  /** 0..1 — how far the day's reading has opened. */
  openness: number;
  round?: number;
}) {
  const W = 320;
  const H = 150;
  const open = Math.max(0, Math.min(1, openness));

  // Everything happens in the lower half. The plate is read as looking
  // *across* water toward a dark far shore: the text sits in the air above
  // the waterline, and the surface — reflection, rings, swell — lives under
  // it. The first cut spread the reflection across the whole face and its
  // broken band ran straight through the 見聞色 label, which read as a
  // rendering fault rather than as light on water.
  const WL = H * 0.6;

  const rings = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) => {
        const step = i / 4;
        const reach = 0.4 + 0.6 * open;
        return {
          rx: (30 + step * 132) * reach,
          ry: (5 + step * 22) * reach,
          o: (0.62 - step * 0.1) * (0.4 + 0.6 * open),
          w: 1.6 - step * 0.24,
        };
      }),
    [open],
  );

  const cx = W * 0.44;
  const cy = H * 0.86;

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
          <LinearGradient id="waterFace" x1="0" y1="0" x2="0" y2="1">
            {/* Dark above the waterline, and the surface below it catches
                what light there is. */}
            <Stop offset="0" stopColor={deep} stopOpacity="1" />
            <Stop offset="0.58" stopColor={face} stopOpacity="1" />
            <Stop offset="0.74" stopColor={sheen} stopOpacity="0.14" />
            <Stop offset="1" stopColor={deep} stopOpacity="0.75" />
          </LinearGradient>
        </Defs>

        <Rect width={W} height={H} fill={face} />
        <Rect width={W} height={H} fill="url(#waterFace)" />

        {/* The waterline itself. */}
        <Rect y={WL} width={W} height={1} fill={sheen} fillOpacity={0.18 + 0.2 * open} />

        {/* The reflection: one band of light lying on the surface just below
            the line, broken twice. An unbroken band reads as a stripe. */}
        <G opacity={0.2 + 0.3 * open}>
          <Rect x={0} y={WL + 9} width={W * 0.3} height={1.8} rx={0.9} fill={sheen} />
          <Rect x={W * 0.36} y={WL + 9} width={W * 0.2} height={1.8} rx={0.9} fill={sheen} />
          <Rect x={W * 0.62} y={WL + 9} width={W * 0.32} height={1.8} rx={0.9} fill={sheen} />
          <Rect x={W * 0.16} y={WL + 17} width={W * 0.44} height={1.3} rx={0.65} fill={sheen} />
        </G>

        {/* The rings, drawn outside-in so the nearest sits over the ones it
            has already outrun. Ellipses, never circles: you are looking
            across a surface, not down at one. */}
        {[...rings].reverse().map((r, i) => (
          <Ellipse
            key={i}
            cx={cx}
            cy={cy}
            rx={r.rx}
            ry={r.ry}
            fill="none"
            stroke={sheen}
            strokeWidth={r.w}
            strokeOpacity={r.o}
          />
        ))}

        {/* Where it was touched. */}
        <Ellipse
          cx={cx}
          cy={cy}
          rx={3.4}
          ry={1.5}
          fill={sheen}
          fillOpacity={0.5 + 0.4 * open}
        />

        {/* A slow swell, so the water is never perfectly flat — flat water
            reads as glass, and glass is not a thing you read anything off. */}
        <Path
          d={`M 0 ${(H * 0.94).toFixed(1)} q ${W * 0.12} -4 ${W * 0.25} 0 t ${W * 0.25} 0 t ${W * 0.25} 0 t ${W * 0.25} 0`}
          fill="none"
          stroke={sheen}
          strokeWidth={1}
          strokeOpacity={0.14}
        />
      </Svg>
    </View>
  );
}
