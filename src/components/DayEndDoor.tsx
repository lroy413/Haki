import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { dayEndOpen } from '../domain/dayEnd';
import { radius, space, type } from '../theme/tokens';
import { lit, press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The door to Day's End, and it only exists in the evening.
 *
 * A "close the day" card standing open at nine in the morning is a nag about
 * a day that has not happened yet — and worse, it is a thing you learn to
 * scroll past, which is how the one card that wanted your attention became
 * furniture. It appears when the evening watch starts and goes when the day
 * turns over.
 *
 * **It does not print what you wrote.** The first cut showed three lines of
 * the evening's note here, which put the most private paragraph in the app on
 * the screen you open in a cafe — and made the busiest screen busier with
 * words you had already read. The note is kept and read back on Day's End
 * itself, under `Astern`, which is somewhere you go on purpose.
 *
 * Coming back to revise an evening at eleven is the same evening; the door has
 * no idea whether you are done and does not ask.
 */
export function DayEndDoor({ onOpen }: { onOpen: () => void }) {
  const { palette, plainMode, hardening, t, dayEnd } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // Read once per render, like the day strip's sun. The home screen refreshes
  // on every focus, so the door appears the first time you open the app after
  // five — which is soon enough for a thing that has all evening.
  if (!dayEndOpen(new Date().getHours())) return null;

  const written = dayEnd !== null && dayEnd.length > 0;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={t.dayEndTitle}
      style={({ pressed }) => [
        styles.card,
        // The signature violet's own light, like the Return's — this belongs
        // to the day rather than to any one lens.
        lit(palette.violet, plainMode ? 0 : hardening),
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.head}>
        <Text style={[styles.label, { color: palette.violet }]}>{t.dayEndTitle}</Text>
        <Text style={styles.chevron}>›</Text>
      </View>
      <Text style={styles.blurb} numberOfLines={2}>
        {written ? t.dayEndWritten : t.dayEndBlurb}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: space.xs,
    },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { ...type.label },
    chevron: { ...type.heading, color: c.inkFaint },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 22 },
    pressed: { ...press },
  });
