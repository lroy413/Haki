import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaki } from '../state/HakiProvider';
import { TAB_BAR_CLEARANCE, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * A tab's title, inside its own scroll view.
 *
 * The tabs used to carry a navigation header, which cost 64pt on the web and
 * about 103 on an iPhone once the notch inset is added — a permanent band, on
 * every screen, to hold one word that never changed. The ground under it was
 * the right colour so it looked continuous, but it was still a twelfth of the
 * screen nobody could use.
 *
 * So the title comes down into the content and scrolls away with it. The scene
 * now starts at the very top of the display, which is what makes the ground
 * genuinely run edge to edge rather than merely appear to.
 */
export function PageHeading({ title, trailing }: { title: string; trailing?: string }) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.row}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {trailing ? <Text style={styles.trailing}>{trailing}</Text> : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space.md,
      // Its own breathing room, because the screens it sits on set their own
      // gaps — the Do tab's is 8, which put a 26pt title straight on top of
      // the first section label.
      marginBottom: space.sm,
    },
    // Shrinks so a long trailing label can never push the title off the edge.
    title: { ...type.title, fontSize: 26, color: c.ink, flexShrink: 1 },
    trailing: { ...type.label, color: c.inkFaint },
  });

/**
 * The padding a tab's scroll content needs to clear the hardware.
 *
 * Top: the notch, since the scene now runs underneath it. Bottom: room for the
 * floating bar, plus the home indicator on the phones that have one.
 *
 * Returned as a style object to spread after a screen's own `content` style,
 * so the two vertical values win and everything else is left alone.
 */
export function useTabInsets(): { paddingTop: number; paddingBottom: number } {
  const insets = useSafeAreaInsets();
  return {
    paddingTop: insets.top + space.lg,
    paddingBottom: TAB_BAR_CLEARANCE + insets.bottom,
  };
}
