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
import { createNote, deleteNote, getNote, updateNote } from '../../src/db/repo';
import { useSingleFlight } from '../../src/state/useSingleFlight';
import { useHaki } from '../../src/state/HakiProvider';
import { WritingBar } from '../../src/components/WritingBar';
import type { Edit, Selection } from '../../src/domain/markdown';
import { space, type } from '../../src/theme/tokens';
import { press } from '../../src/theme/surfaces';
import type { Palette } from '../../src/theme/palettes';

const AUTOSAVE_MS = 800;

/**
 * One loose page.
 *
 * The same shape as the journal entry editor next door — plain Markdown,
 * autosaved, the row created on the first keystroke rather than on open — with
 * two differences that follow from what a note is.
 *
 * **It has a name, and the name is optional.** A note is looked up, so it
 * wants a handle; but making you name a thing before you can write it is how a
 * quick list never gets written. Left blank, the list reads the first line off
 * the body.
 *
 * **There is no Done.** A note is not an act you finish — there is nothing to
 * close, nothing counts it, and the back arrow is the whole exit. The journal
 * keeps its Done because an entry is a thing you write and then have written.
 *
 * The two iOS-Safari focus rules from the entry editor apply here unchanged:
 * `autoFocus` is native-only, and the field is always editable.
 */
export default function NoteScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const { id } = useLocalSearchParams<{ id: string }>();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });
  const [error, setError] = useState<string | null>(null);
  const rowId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ title?: string; body?: string }>({});
  const field = useRef<TextInput>(null);

  /**
   * What the toolbar just wrote, held until the field reports it back.
   *
   * Setting `selection` on a React Native TextInput every render fights the
   * user's own caret — you cannot type past a pinned selection. So it is only
   * pinned for the render that follows a toolbar press, and released as soon
   * as the field's own `onSelectionChange` confirms it landed.
   */
  const [forced, setForced] = useState<Selection | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (id === 'new') return; // the row is created on first save
      const parsed = Number(id);
      if (!Number.isFinite(parsed)) {
        router.back();
        return;
      }
      const row = await getNote(db, parsed);
      if (cancelled) return;
      if (!row) {
        router.back();
        return;
      }
      rowId.current = row.id;
      setTitle(row.title);
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

  async function ensureRow(): Promise<number | null> {
    if (rowId.current != null) return rowId.current;
    try {
      const created = await createNote(db, '');
      rowId.current = created;
      setError(null);
      return created;
    } catch {
      setError('Could not save — your text is still here, try again.');
      return null;
    }
  }

  /**
   * Autosave, with the pending patch **merged** rather than replaced.
   *
   * Two fields share one debounce timer, so the first cut lost every title:
   * typing a name and then the body meant the body's `save` cleared the
   * title's timer and wrote only `{ body }`. The name went to the database
   * exactly never. Accumulating into a ref and flushing the whole thing is
   * the fix, and it is why this is not just `setTimeout(..., patch)`.
   */
  function save(patch: { title?: string; body?: string }) {
    pending.current = { ...pending.current, ...patch };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        const next = pending.current;
        pending.current = {};
        const rid = await ensureRow();
        if (rid != null) await updateNote(db, rid, next);
      })();
    }, AUTOSAVE_MS);
  }

  /** A toolbar press: take its text and pin its caret for one render. */
  function apply(edit: Edit) {
    setBody(edit.text);
    setForced(edit.selection);
    setSelection(edit.selection);
    save({ body: edit.text });
    // The bar is above the keyboard, so the field never lost focus — but on
    // the web the press moves it, and typing has to land back in the text.
    field.current?.focus();
  }

  const closing = useSingleFlight();
  function remove() {
    const currentId = rowId.current;
    if (timer.current) clearTimeout(timer.current);
    if (currentId == null) {
      router.back();
      return;
    }
    const go = () =>
      void closing(async () => {
        router.back();
        await deleteNote(db, currentId);
      });

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && !window.confirm('Delete this page?')) return;
      go();
      return;
    }
    Alert.alert('Delete this page?', 'This cannot be undone.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: go },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={remove}
              accessibilityRole="button"
              accessibilityLabel="Delete this page"
              hitSlop={10}
              style={styles.deleteHit}
            >
              <Text style={styles.delete}>Delete</Text>
            </Pressable>
          ),
        }}
      />

      <TextInput
        style={styles.title}
        value={title}
        onChangeText={(next) => {
          setTitle(next);
          save({ title: next });
        }}
        placeholder={t.noteUntitled}
        placeholderTextColor={palette.inkFaint}
        returnKeyType="next"
        accessibilityLabel="Page title"
      />

      <TextInput
        ref={field}
        style={styles.body}
        value={body}
        onChangeText={(next) => {
          setBody(next);
          save({ body: next });
        }}
        selection={forced ?? undefined}
        onSelectionChange={(e) => {
          const next = e.nativeEvent.selection;
          setSelection(next);
          // Release the pin the moment the field agrees with it, or the caret
          // is stuck where the toolbar put it and nothing can be typed.
          if (forced && next.start === forced.start && next.end === forced.end) setForced(null);
        }}
        multiline
        autoFocus={Platform.OS !== 'web' && id === 'new'}
        placeholder="Markdown. Whatever it is."
        placeholderTextColor={palette.inkFaint}
        textAlignVertical="top"
        accessibilityLabel="Page body"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {/* Cyan: notes hang off the Observation tab, and one screen carries one
          light. See the one-light rule. */}
      <WritingBar tint={palette.cyan} value={body} selection={selection} onEdit={apply} />
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    // A hairline under the name: without it the title and the first line of
    // body run together as one paragraph in two faces.
    title: {
      ...type.heading,
      fontSize: 20,
      color: c.ink,
      paddingHorizontal: space.lg,
      paddingTop: space.lg,
      paddingBottom: space.md,
      minHeight: 44,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
      marginBottom: space.md,
    },
    body: {
      flex: 1,
      ...type.body,
      fontSize: 17,
      lineHeight: 26,
      color: c.ink,
      paddingHorizontal: space.lg,
    },
    deleteHit: { paddingHorizontal: space.md, paddingVertical: space.xs },
    delete: { ...type.small, color: c.crimson },
    error: {
      ...type.small,
      color: c.warn,
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    pressed: { ...press },
  });
