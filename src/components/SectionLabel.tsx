import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useMemo } from 'react';
import { useHaki } from '../state/HakiProvider';
import type { Palette } from '../theme/palettes';
import { space, type } from '../theme/tokens';

/**
 * A section label with a rule running off its end.
 *
 * "HARDNESS" floating alone above a card is a caption; "HARDNESS ————" is a
 * heading — the rule claims the width, so the eye reads the label as opening
 * a region rather than annotating whatever box happens to sit below it.
 * Every screen drawing sections by hand had the caption problem, each with
 * slightly different spacing, which is half of what made them read as the
 * same template.
 *
 * `trailing` hangs a small mono note on the far end of the rule — a count, a
 * kanji — where it reads as part of the heading rather than as data.
 */
export function SectionLabel({
  label,
  trailing,
  tint,
  style,
}: {
  label: string;
  trailing?: string;
  /** Colours the label (never the rule); defaults to the faint ink. */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={[styles.head, style]}>
      <Text style={[styles.label, tint ? { color: tint } : null]}>{label}</Text>
      <View style={styles.rule} />
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      marginTop: space.sm,
    },
    label: { ...type.label, color: c.inkFaint },
    rule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.line },
    trailing: { ...type.mono, fontSize: 10, color: c.inkFaint },
  });
