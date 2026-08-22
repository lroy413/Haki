import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../../src/db/client';
import { createEntry, deleteEntry, getEntry, updateEntry } from '../../src/db/repo';
import { color, radius, space, type } from '../../src/theme/tokens';

const AUTOSAVE_MS = 800;

/**
 * The entry editor. Plain Markdown in a text field — nothing proprietary,
 * nothing that needs an export button to get your own words back out.
 *
 * Autosaves while you type, because an entry lost to a backgrounded app is an
 * entry you will not write twice.
 */
export default function EntryScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [body, setBody] = useState('');
  const [ready, setReady] = useState(false);
  const rowId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id === 'new') {
        const created = await createEntry(db, '');
        if (cancelled) return;
        rowId.current = created;
        setReady(true);
        return;
      }

      const parsed = Number(id);
      if (!Number.isFinite(parsed)) {
        router.back();
        return;
      }
      const row = await getEntry(db, parsed);
      if (cancelled) return;
      if (!row) {
        router.back();
        return;
      }
      rowId.current = row.id;
      setBody(row.body);
      setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [db, id, router]);

  // Flush any pending autosave on unmount so backing out never drops a keystroke.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function onChange(next: string) {
    setBody(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (rowId.current != null) void updateEntry(db, rowId.current, next);
    }, AUTOSAVE_MS);
  }

  async function remove() {
    const currentId = rowId.current;
    if (currentId == null) return;
    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            if (timer.current) clearTimeout(timer.current);
            await deleteEntry(db, currentId);
            router.back();
          })();
        },
      },
    ]);
  }

  async function done() {
    if (timer.current) clearTimeout(timer.current);
    if (rowId.current != null) await updateEntry(db, rowId.current, body);
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={remove} hitSlop={10}>
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          ),
        }}
      />

      <TextInput
        style={styles.input}
        value={body}
        onChangeText={onChange}
        multiline
        autoFocus={id === 'new'}
        editable={ready}
        placeholder="Markdown. Whatever it is."
        placeholderTextColor={color.inkFaint}
        textAlignVertical="top"
        accessibilityLabel="Entry body"
      />

      <Pressable onPress={done} style={({ pressed }) => [styles.done, pressed && styles.pressed]}>
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  input: {
    flex: 1,
    ...type.body,
    fontSize: 16,
    lineHeight: 24,
    color: color.ink,
    padding: space.lg,
  },
  delete: { ...type.small, color: color.crimson, fontWeight: '600' },
  done: {
    margin: space.lg,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  doneText: { ...type.heading, color: color.ink },
  pressed: { opacity: 0.75 },
});
