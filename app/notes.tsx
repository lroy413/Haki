import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { listNotes } from '../src/db/repo';
import type { NoteRow } from '../src/db/schema';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { useHaki } from '../src/state/HakiProvider';
import { firstLine, plainLine } from '../src/domain/markdown';
import { foundLine, isSearching, matches } from '../src/domain/search';
import { SearchField, Excerpt } from '../src/components/SearchField';
import { shortDay, toDayKey, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Loose pages — writing that is not about a day.
 *
 * The owner asked for "a free notes separate from journal", and separate is
 * the whole specification. The Logbook is dated: it is listed by day, it feeds
 * what a day is measured by, and a year later it reads itself back at you. A
 * note is none of that — a list, a draft, a thing you looked up and want
 * again — and folding the two together would have cost both. Notes would
 * start counting toward how used a day was, which is untrue, and the Logbook
 * would fill up with shopping lists.
 *
 * Ordered by when it was last touched, which is where you left off. Nothing
 * counts them, nothing ages them out, and there is no archive: a note is kept
 * until you delete it.
 */
export default function NotesScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { palette, plainMode, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const opening = useSingleFlight();

  const [rows, setRows] = useState<NoteRow[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setRows(await listNotes(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  // The row is created by the editor on first keystroke, exactly like an
  // entry — a page you open and back out of leaves nothing behind.
  const start = () => void opening(async () => router.push('/note/new'));

  // The whole list is already loaded here — there is no hundred-row cap on a
  // screen whose entire content is the list — so search is a filter and needs
  // no second read. The title counts as well as the body: half the reason a
  // page has a name is so you can find it by one.
  const searching = isSearching(query);
  const shown = useMemo(
    () =>
      searching ? rows.filter((r) => matches(r.body, query) || matches(r.title, query)) : rows,
    [rows, query, searching],
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: usableBottom(insets.bottom) + space.xxxl },
      ]}
    >
      <Text style={styles.blurb}>{t.notesBlurb}</Text>

      <Pressable
        onPress={start}
        accessibilityRole="button"
        accessibilityLabel={t.notesNew}
        style={({ pressed }) => [styles.new, pressed && styles.pressed]}
      >
        <Text style={styles.newText}>{t.notesNew}</Text>
      </Pressable>

      {/* Only once there is a list worth searching. One page and a search
          field above it is furniture. */}
      {rows.length > 2 || searching ? (
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder={t.searchNotes}
          tint={palette.violet}
          found={searching ? foundLine(shown.length, plainMode) : null}
        />
      ) : null}

      {shown.length === 0 ? (
        <Text style={styles.empty}>{searching ? foundLine(0, plainMode) : t.notesEmpty}</Text>
      ) : null}

      {shown.map((row) => {
        // The title if there is one; otherwise the body's first line stands
        // in — and then the preview must skip that line rather than printing
        // it twice under itself.
        const titled = row.title.trim();
        const name = titled || firstLine(row.body);
        const rest = preview(row.body, !titled);
        return (
          <Pressable
            key={row.id}
            onPress={() => router.push(`/note/${row.id}`)}
            accessibilityRole="button"
            accessibilityLabel={name || t.noteUntitled}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.name, !name && styles.unnamed]} numberOfLines={1}>
              {name || t.noteUntitled}
            </Text>
            {/* The excerpt reads `rest`, not the body: the body still holds
                the line already printed as the name above, so searching it
                drew the name twice — the tab-labels-drawn-twice bug that
                `preview` exists to prevent, reintroduced one row down. A
                match that is *in* the name is shown by the name. */}
            {searching ? (
              <Excerpt text={rest} query={query} tint={palette.violet} fallback={rest} />
            ) : rest ? (
              <Text style={styles.preview} numberOfLines={2}>
                {rest}
              </Text>
            ) : null}
            <Text style={styles.when}>
              {shortDay(toDayKey(new Date(row.updatedAt)), todayKey())}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/**
 * The body minus the line already used as the name.
 *
 * Showing the first line twice — once as the title and once as the preview
 * under it — is the tab-labels-drawn-twice bug at row scale.
 */
function preview(body: string, usedFirstLine: boolean): string {
  const lines = body.split('\n').map((l) => l.trim());
  const at = lines.findIndex((l) => l.length > 0);
  if (at === -1) return '';
  return lines
    .slice(usedFirstLine ? at + 1 : at)
    .filter((l) => l.length > 0)
    .map(plainLine)
    .filter((l) => l.length > 0)
    .join(' · ');
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 19, marginBottom: space.xs },
    new: {
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingVertical: space.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: space.sm,
    },
    newText: { ...type.heading, fontSize: 18, color: c.ink },
    empty: { ...type.body, color: c.inkDim, lineHeight: 24, paddingVertical: space.md },
    row: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: 3,
    },
    name: { ...type.body, fontSize: 19, color: c.ink, lineHeight: 23 },
    unnamed: { color: c.inkFaint },
    preview: { ...type.small, color: c.inkDim, lineHeight: 19 },
    when: { ...type.mono, fontSize: 12, color: c.inkFaint },
    pressed: { ...press },
  });
