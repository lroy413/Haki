import { useMemo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaki } from '../state/HakiProvider';
import { useTabBarHeight } from './GlassTabBar';
import { space, type } from '../theme/tokens';
import { usableBottom } from '../theme/viewport';
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
export function PageHeading({
  title,
  trailing,
  tint,
  slot,
}: {
  title: string;
  trailing?: string;
  /**
   * Something other than a label in the corner — the home screen's course.
   * Takes the place of `trailing`, and the row aligns to the top rather than
   * the baseline, because a two-line slot has no single baseline to share.
   */
  slot?: ReactNode;
  /**
   * Colours the trailing mark. Passed the lens's own colour on the three
   * lens tabs, so the kanji in the corner is the same violet, crimson or
   * cyan that the screen's labels and its tab are using — one screen, one
   * light. Left off where the trailing slot holds data rather than a mark.
   */
  tint?: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={[styles.row, slot ? styles.rowSlot : null]}>
      <Text style={styles.title} accessibilityRole="header" numberOfLines={1}>
        {title}
      </Text>
      {slot ??
        (trailing ? (
          <Text style={[styles.trailing, tint ? { color: tint } : null]}>{trailing}</Text>
        ) : null)}
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
    rowSlot: { alignItems: 'flex-start' },
    // Shrinks so a long trailing label can never push the title off the edge.
    title: { ...type.title, fontSize: 26, color: c.ink, flexShrink: 1 },
    trailing: { ...type.label, color: c.inkFaint },
  });

/**
 * The padding a tab's scroll content needs to clear the hardware.
 *
 * Top: the notch, since the scene runs underneath it.
 *
 * Bottom: exactly what the bar occupies, plus one gap. This used to be a
 * hardcoded 108 that matched nothing — it left 39 points of dead ground under
 * the last item on the web, around 51 on a phone with a home indicator, and
 * more again in plain mode where the bar loses its kanji and gets shorter.
 *
 * The arithmetic below is the bar's own, term for term: it sits
 * `max(insets.bottom, space.md)` off the bottom and is `useTabBarHeight()`
 * tall, so content clears it by `space.lg` and no more, on every device and in
 * both modes.
 *
 * Returned as a style object to spread after a screen's own `content` style,
 * so the two vertical values win and everything else is left alone.
 */
export function useTabInsets(): { paddingTop: number; paddingBottom: number } {
  const insets = useSafeAreaInsets();
  const bar = useTabBarHeight();
  return {
    paddingTop: insets.top + space.lg,
    // `usableBottom` drops the inset on a phone whose home indicator sits
    // outside the viewport iOS gave the app — see `theme/viewport.ts`. It is
    // the bar's own arithmetic, term for term, so the two cannot drift.
    paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + bar + space.lg,
  };
}
