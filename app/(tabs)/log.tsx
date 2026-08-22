import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/db/client';
import { listEntries } from '../../src/db/repo';
import type { EntryRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { daysAtSea } from '../../src/domain/date';
import { color, radius, space, type } from '../../src/theme/tokens';

export default function LogScreen() {
  const { db, settings } = useStore();
  const { t } = useHaki();
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
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t.logEmpty}</Text>}
        renderItem={({ item }) => (
          <Link href={`/entry/${item.id}`} asChild>
            <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text style={styles.rowDay}>
                {t.daysAtSea(daysAtSea(settings.setSailAt, item.day))} · {item.day}
              </Text>
              <Text style={styles.rowBody} numberOfLines={2}>
                {item.body.trim() || 'Empty entry'}
              </Text>
            </Pressable>
          </Link>
        )}
      />

      <Link href="/entry/new" asChild>
        <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Text style={styles.fabText}>{t.newEntry}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  list: { padding: space.lg, gap: space.sm, paddingBottom: 96 },
  empty: { ...type.body, color: color.inkDim, textAlign: 'center', marginTop: space.xxxl },

  row: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  rowDay: { ...type.mono, color: color.inkFaint },
  rowBody: { ...type.body, color: color.ink, lineHeight: 21 },
  pressed: { opacity: 0.75 },

  fab: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    bottom: space.lg,
    backgroundColor: color.violet,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  fabText: { ...type.heading, color: '#0A0B12', fontWeight: '800' },
});
