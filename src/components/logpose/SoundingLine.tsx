import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';
import { shape, type Sounding } from '../../domain/soundings';
import { useHaki } from '../../state/HakiProvider';

/**
 * The line behind you — the shape of the readings, and nothing else.
 *
 * A sparkline with everything stripped that would turn a record into a
 * score. There is no axis, because an axis implies a zero worth reaching.
 * There is no target line, because there is no target. There is no fill
 * under the curve, because a filled area reads as an amount accumulated.
 *
 * **It is drawn in one colour whichever way it went.** Savings climbing and a
 * bodyweight climbing are the same event to this component, and the moment it
 * turns green for up it has taken a side in somebody's life that the app
 * knows nothing about. The last reading is marked, because "where am I now"
 * is the only question a sounding answers.
 */
export function SoundingLine({
  soundings,
  tint,
  width = 220,
  height = 34,
}: {
  soundings: Sounding[];
  tint: string;
  width?: number;
  height?: number;
}) {
  const points = useMemo(() => shape(soundings), [soundings]);
  const { plainMode } = useHaki();

  // One reading is a dot, not a line — a two-point line drawn from a single
  // value would be inventing a trend out of nothing.
  if (points.length === 0) return null;

  // Inset so the stroke and the end dot are not clipped by the viewbox.
  const pad = 4;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const at = (p: { x: number; y: number }) => ({ x: pad + p.x * w, y: pad + p.y * h });
  const last = at(points[points.length - 1]);

  return (
    <View
      style={styles.frame}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={width} height={height}>
        {points.length > 1 ? (
          <Polyline
            points={points
              .map((p) => {
                const q = at(p);
                return `${q.x},${q.y}`;
              })
              .join(' ')}
            fill="none"
            stroke={tint}
            strokeWidth={1.5}
            strokeOpacity={plainMode ? 0.7 : 0.55}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : null}
        <Circle cx={last.x} cy={last.y} r={3} fill={tint} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignSelf: 'flex-start' },
});
