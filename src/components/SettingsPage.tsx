import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHaki } from '../state/HakiProvider';
import { IslandBadge } from './IslandRow';
import type { IsleKind } from './instruments/Isles';
import { space } from '../theme/tokens';

/**
 * The scaffold every settings island's page stands on.
 *
 * Pushed screens keep their navigation headers, so the page's name lives up
 * there; what this adds is the island itself, small and at anchor, at the top
 * — the "you are here" that ties the page back to the chart it was pressed
 * on. Plain mode drops the badge: the chart is a performance, and so is the
 * postcard from it.
 */
export function SettingsPage({ kind, children }: { kind: IsleKind; children: ReactNode }) {
  const { palette, plainMode, conquerors } = useHaki();
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: palette.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {plainMode ? null : <IslandBadge kind={kind} accent={conquerors} />}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, gap: space.lg },
});
