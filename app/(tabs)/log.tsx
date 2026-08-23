import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { useStore } from '../../src/db/client';
import { listEntries, logLine } from '../../src/db/repo';
import type { EntryRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { daysAtSea } from '../../src/domain/date';
import { CAPTURE_PLACEHOLDER, isWritable } from '../../src/domain/logbook';
import { radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

/** How much the floating button takes on top of the bar's own clearance. */
const FAB_ROOM = 72;

/**
 * The Logbook.
 *
 * Two doors, and the small one is the point. The button at the bottom opens
 * the editor — a full screen with a cursor in an empty document, which is a
 * demand for a subject and a length and a reason to have opened it. The field
 * at the top asks for none of that: one line, typed where you already are,
 * folded into today's entry. See `domain/logbook.ts`.
 */
export default function LogScreen() {
  const router = useRouter();
  const { db, settings } = useStore();
  const { t, palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [line, setLine] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const rows = await listEntries(db);
    setEntries(rows);
  }, [db]);

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

  async function capture() {
    if (!isWritable(line) || saving) return;
    setSaving(true);
    try {
      // Cleared first: the line is already the user's, and a field that sits
      // full while a write lands reads as a tap that did nothing.
      const text = line;
      setLine('');
      void Haptics.selectionAsync();
      await logLine(db, text);
      await load();
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
        // An element, never an inline arrow: a new component type on every
        // render would remount the field and drop the keyboard mid-sentence.
        ListHeaderComponent={
          <View style={styles.head}>
            <PageHeading title={t.logTitle} />
            <View style={styles.capture}>
              <TextInput
                value={line}
                onChangeText={setLine}
                placeholder={CAPTURE_PLACEHOLDER}
                placeholderTextColor={palette.inkFaint}
                style={styles.input}
                returnKeyType="done"
                onSubmitEditing={() => void capture()}
                accessibilityLabel={CAPTURE_PLACEHOLDER}
              />
              <Pressable
                onPress={() => void capture()}
                disabled={!isWritable(line) || saving}
                accessibilityRole="button"
                accessibilityLabel="Log this line"
                style={({ pressed }) => [
                  styles.log,
                  !isWritable(line) && styles.logDisabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.logText}>{t.logLine}</Text>
              </Pressable>
            </View>
          </View>
        }
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
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: space.lg, gap: space.sm },
    head: { gap: space.sm, marginBottom: space.sm },
    capture: { flexDirection: 'row', gap: space.sm },
    input: {
      ...type.body,
      flex: 1,
      fontSize: 16,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      height: 48,
    },
    log: {
      justifyContent: 'center',
      paddingHorizontal: space.lg,
      backgroundColor: c.cyan,
      borderRadius: radius.md,
    },
    logDisabled: { opacity: 0.4 },
    logText: { ...type.heading, color: c.onAccent },
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
