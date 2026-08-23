import { useHaki } from '../../src/state/HakiProvider';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

const AUTOSAVE_MS = 800;

/**
 * The entry editor. Plain Markdown in a text field — nothing proprietary,
 * nothing that needs an export button to get your own words back out.
 *
 * Autosaves while you type, because an entry lost to a backgrounded app is an
 * entry you will not write twice.
 *
 * Two iOS-Safari rules shape how focus works here, and breaking either one
 * leaves you tapping a field that will not open the keyboard:
 *
 * 1. iOS only opens the keyboard for focus caused by a real user gesture.
 *    `autoFocus` focuses the field programmatically, so the field ends up
 *    focused with no keyboard — and because it is *already* focused, tapping
 *    it fires no new focus event and the keyboard never arrives. So autoFocus
 *    is native-only; on web the first tap does the focusing.
 * 2. A read-only field never opens the keyboard. The input is therefore always
 *    editable, and the row is created on demand instead of gating typing.
 */
export default function EntryScreen() {
  const { palette } = useHaki();

  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();
  const { db } = useStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const rowId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id === 'new') return; // the row is created on first save

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
    })();

    return () => {
      cancelled = true;
    };
  }, [db, id, router]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /**
   * The row this entry writes to, created on demand.
   *
   * Creating lazily means an empty entry you back out of never leaves a blank
   * row behind, and typing is never blocked waiting on the database.
   */
  async function ensureRow(): Promise<number | null> {
    if (rowId.current != null) return rowId.current;
    try {
      const created = await createEntry(db, '');
      rowId.current = created;
      setError(null);
      return created;
    } catch {
      setError('Could not save — your text is still here, try Done again.');
      return null;
    }
  }

  function onChange(next: string) {
    setBody(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        const rid = await ensureRow();
        if (rid != null) await updateEntry(db, rid, next);
      })();
    }, AUTOSAVE_MS);
  }

  function remove() {
    const currentId = rowId.current;
    if (timer.current) clearTimeout(timer.current);

    // Nothing was ever written — just leave.
    if (currentId == null) {
      router.back();
      return;
    }

    Alert.alert('Delete this entry?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await deleteEntry(db, currentId);
            router.back();
          })();
        },
      },
    ]);
  }

  async function done() {
    if (timer.current) clearTimeout(timer.current);

    // An entry you opened and left blank is not worth a row.
    if (rowId.current == null && !body.trim()) {
      router.back();
      return;
    }

    const rid = await ensureRow();
    if (rid == null) return; // error is on screen; do not lose the text
    await updateEntry(db, rid, body);
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
            <Pressable onPress={remove} hitSlop={10} style={styles.deleteHit}>
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
        // Native only — see the note at the top of this file.
        autoFocus={Platform.OS !== 'web' && id === 'new'}
        placeholder="Markdown. Whatever it is."
        placeholderTextColor={palette.inkFaint}
        textAlignVertical="top"
        accessibilityLabel="Entry body"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        onPress={done}
        style={({ pressed }) => [styles.done, pressed && styles.pressed]}
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    input: {
      flex: 1,
      ...type.body,
      fontSize: 17,
      lineHeight: 26,
      color: c.ink,
      padding: space.lg,
    },
    // Without the inset the label sits flush against the screen edge and clips.
    deleteHit: { paddingHorizontal: space.md, paddingVertical: space.xs },
    delete: { ...type.small, color: c.crimson },
    error: {
      ...type.small,
      color: c.warn,
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    done: {
      margin: space.lg,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    doneText: { ...type.heading, color: c.ink },
    pressed: { opacity: 0.75 },
  });
