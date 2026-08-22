import { StyleSheet, Text, View } from 'react-native';
import { color, radius, space, type } from '../theme/tokens';
import { reserveColor } from '../theme/tokens';
import type { Reserve } from '../domain/willReserve';

type Props = {
  reserve: Reserve;
  /** 0..1 from `effectIntensity`. Drives glow only — never legibility. */
  intensity: number;
  label: string;
  unknownLabel: string;
};

const STATE_WORD: Record<Reserve['state'], string> = {
  unknown: '—',
  depleted: 'Depleted',
  low: 'Low',
  steady: 'Steady',
  full: 'Full',
};

/**
 * The number on the home screen. A gauge, not a score.
 *
 * `intensity` is the mechanic where the app runs out of Haki alongside you:
 * as the reserve falls the glow fades out and the bar goes flat and dull.
 * It only ever affects decoration — text contrast, hit targets, and every
 * number stay exactly as legible at 5 as they are at 95.
 */
export function ReserveGauge({ reserve, intensity, label, unknownLabel }: Props) {
  const tone = reserveColor[reserve.state];
  const filled = reserve.value ?? 0;

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: reserve.value === null ? color.line : tone,
          shadowColor: tone,
          shadowOpacity: 0.55 * intensity,
          shadowRadius: 24 * intensity,
          elevation: Math.round(12 * intensity),
        },
      ]}
    >
      <Text style={styles.label}>{label}</Text>

      {reserve.value === null ? (
        <Text style={styles.unknown}>{unknownLabel}</Text>
      ) : (
        <View style={styles.readout}>
          <Text style={[styles.value, { color: tone }]}>{reserve.value}</Text>
          <Text style={styles.state}>{STATE_WORD[reserve.state]}</Text>
        </View>
      )}

      <View style={styles.track} accessibilityRole="progressbar">
        <View
          style={[
            styles.fill,
            {
              width: `${filled}%`,
              backgroundColor: tone,
              // The bar itself dims with the reserve, so a low day looks low
              // before you have read a single digit.
              opacity: 0.35 + 0.65 * intensity,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.lg,
    shadowOffset: { width: 0, height: 0 },
  },
  label: { ...type.label, color: color.inkFaint },
  readout: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  value: { fontSize: 64, fontWeight: '800', letterSpacing: -3, fontVariant: ['tabular-nums'] },
  state: { ...type.heading, color: color.inkDim },
  unknown: { ...type.body, color: color.inkDim, paddingVertical: space.md },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: color.surface2,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
});
