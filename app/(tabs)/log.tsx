import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { useStore } from '../../src/db/client';
import { listEntries } from '../../src/db/repo';
import type { EntryRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { daysAtSea } from '../../src/domain/date';
import { radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

/** How much the floating button takes on top of the bar's own clearance. */
const FAB_ROOM = 72;

export default function LogScreen() {
  const router = useRouter();
  const { db, settings } = useStore();
  const { t, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  const [entries, setEntries] = useState<EntryRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const rows = await listEntries(db);
        if (!cancelled) setEntries(rows);
      })();
      return () => {
        cancelled = true;
      };
    }, [db]),
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        // The heading scrolls with the list rather than sitting in a band
        // above it, and the bottom padding clears the floating bar *and* the
        // button stacked on top of it.
        contentContainerStyle={[
          styles.list,
          { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom + FAB_ROOM },
        ]}
        ListHeaderComponent={<PageHeading title={t.logTitle} />}
        ListEmptyComponent={<Text style={styles.empty}>{t.logEmpty}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/entry/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open the entry from ${item.day}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowDay}>
              {t.daysAtSea(daysAtSea(settings.setSailAt, item.day))} · {item.day}
            </Text>
            <Text style={styles.rowBody} numberOfLines={2}>
              {item.body.trim() || 'Empty entry'}
            </Text>
          </Pressable>
        )}
      />

      <Pressable
        onPress={() => router.push('/entry/new')}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.fab,
          { bottom: pad.paddingBottom },
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.fabText}>{t.newEntry}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: space.lg, gap: space.sm },
    empty: { ...type.body, color: c.inkDim, textAlign: 'center', marginTop: space.xxxl },

    row: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    rowDay: { ...type.mono, color: c.inkFaint },
    rowBody: { ...type.body, color: c.ink, lineHeight: 21 },
    pressed: { opacity: 0.75 },

    fab: {
      position: 'absolute',
      left: space.lg,
      right: space.lg,
      // `bottom` comes from the insets at the call site: stacked above the
      // floating tab bar rather than under it, on every phone.
      backgroundColor: c.violet,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    fabText: { ...type.heading, color: c.onAccent },
  });
