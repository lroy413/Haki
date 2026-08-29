import { useHaki } from '../state/HakiProvider';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

const STEPS = [1, 2, 3, 4, 5];

type Props = {
  label: string;
  value: number | null;
  onChange: (value: number) => void;
  /** Tension reads better with the scale reversed — low is the good end. */
  inverted?: boolean;
  accent?: string;
};

/**
 * One dial of the Daily Read. Five big targets, one tap each.
 *
 * The whole check-in has to clear in under thirty seconds or it will not happen
 * at 11pm — which is exactly when it matters most. That budget is why this is a
 * row of taps rather than a slider.
 */
export function Dial({ label, value, onChange, inverted = false, accent }: Props) {
  const { palette } = useHaki();
  const tone = accent ?? palette.violet;

  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        {/* A hint recedes by weight and colour, never by wearing the lens's
            red: nothing on this screen has gone wrong. */}
        <Text style={styles.hint}>{inverted ? 'low is better' : ''}</Text>
      </View>
      <View style={styles.row}>
        {STEPS.map((step) => {
          const selected = value === step;
          return (
            <Pressable
              key={step}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={`${label} ${step} of 5`}
              hitSlop={6}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(step);
              }}
              style={({ pressed }) => [
                styles.step,
                selected && { backgroundColor: tone, borderColor: tone },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.stepText, selected && styles.stepTextSelected]}>{step}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    label: { ...type.heading, color: c.ink },
    hint: { ...type.mono, fontSize: 11, letterSpacing: 1, color: c.inkFaint },
    row: { flexDirection: 'row', gap: space.sm },
    step: {
      flex: 1,
      height: 54,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { ...press },
    stepText: { ...type.body, color: c.inkDim, fontVariant: ['tabular-nums'] },
    stepTextSelected: { color: c.onAccent },
  });
