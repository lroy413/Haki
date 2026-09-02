import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GearsPane } from '../src/components/GearsPane';
import { useHaki } from '../src/state/HakiProvider';
import { space } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import type { Palette } from '../src/theme/palettes';

/**
 * The Gears on a screen of their own — the same pane the ability tool mounts
 * as its second tab, kept at this route so the practice card's door still
 * opens. See `components/GearsPane.tsx`.
 */
export default function GearsScreen() {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
      ]}
    >
      <GearsPane />
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg },
  });
