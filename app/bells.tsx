import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { addBell, bellsOn, removeBell, updateBell } from '../src/db/repo';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { useHaki } from '../src/state/HakiProvider';
import { BellMark } from '../src/components/instruments/BellMark';
import {
  MAX_BELL_CHARS,
  clockLabel,
  inOrder,
  parseClock,
  watchOf,
  type Bell,
} from '../src/domain/bells';
import { WATCHES } from '../src/domain/tasks';
import { addDays, shortDay, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The bells — the things that happen at a time on the clock.
 *
 * Two days only: today and tomorrow. A bell is a fixed point in a day you can
 * still see, and an app that let you fill in next March would be a calendar,
 * which this is not — the Log Pose handles anything further out than a day,
 * and it does it in islands rather than in appointments.
 *
 * There is no done, no snooze and no reminder. A bell that has passed sits
 * astern; the only way one ends is that you take it down.
 *
 * **Every bell is a thing you can tap.** The owner: _"Once I set a bell I
 * don't know where it lives or can't change or adjust it."_ So a bell is
 * drawn as one, and tapping it opens the bell itself — its name and its time,
 * editable in place, with the take-down beside them — rather than a row that
 * only offered to destroy it.
 */
export default function BellsScreen() {
  const { db } = useStore();
  const { palette, plainMode, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const today = todayKey();
  const tomorrow = addDays(today, 1);

  const [day, setDay] = useState(today);
  const [rows, setRows] = useState<Bell[]>([]);
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  /** The bell that is open for editing, and the draft it holds. */
  const [open, setOpen] = useState<number | null>(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftWhen, setDraftWhen] = useState('');
  const committing = useSingleFlight();

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([bellsOn(db, today), bellsOn(db, tomorrow)]);
    setRows([...a, ...b]);
  }, [db, today, tomorrow]);

  useEffect(() => {
    void load();
  }, [load]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const at = parseClock(when);
  const ready = title.trim().length > 0 && at !== null;
  const shown = inOrder(rows.filter((r) => r.day === day));

  async function hang() {
    if (!ready || at === null) return;
    const draft = { title, at };
    await committing(async () => {
      // The acknowledgement goes INSIDE the flight, and that placement is the
      // whole fix: it used to sit outside, so a hang that arrived while any
      // other write was still running had its fields cleared by this screen
      // and then dropped by the guard. The form looked like it had saved and
      // the bell was never written — "I made a bell and I don't know where it
      // went". Inside, a dropped call leaves the text where you typed it, and
      // a second tap works.
      setTitle('');
      setWhen('');
      await addBell(db, draft.title, day, draft.at);
      await load();
      await refresh();
    });
  }

  const draftAt = parseClock(draftWhen);
  const draftReady = draftTitle.trim().length > 0 && draftAt !== null;

  function openBell(b: Bell) {
    setDraftTitle(b.title);
    setDraftWhen(clockLabel(b.at));
    setOpen(b.id);
  }

  async function keep() {
    if (open === null || !draftReady || draftAt === null) return;
    const id = open;
    const next = { title: draftTitle.trim(), at: draftAt };
    await committing(async () => {
      // Optimistic: the row wears the new name and time on the tap.
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...next } : r)));
      setOpen(null);
      await updateBell(db, id, next.title, next.at);
      await load();
      await refresh();
    });
  }

  async function take(id: number) {
    await committing(async () => {
      // Optimistic: the row leaves the list on the tap, not on the write.
      setRows((prev) => prev.filter((r) => r.id !== id));
      setOpen(null);
      await removeBell(db, id);
      await load();
      await refresh();
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.blurb}>
          {plainMode
            ? 'Things that happen at a set time. Nothing here rings, and nothing is ticked off — a time that has passed simply sits behind you.'
            : 'The fixed points of a day. A bell does not ring and is never struck: one that has passed sits astern, and the only way it ends is that you take it down.'}
        </Text>

        <View style={styles.days}>
          {[today, tomorrow].map((key) => (
            <Pressable
              key={key}
              onPress={() => setDay(key)}
              accessibilityRole="button"
              accessibilityState={{ selected: day === key }}
              style={({ pressed }) => [
                styles.dayChip,
                day === key && styles.dayChipOn,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.dayText, day === key && styles.dayTextOn]}>
                {key === today ? 'Today' : 'Tomorrow'}
              </Text>
            </Pressable>
          ))}
        </View>

        {shown.length === 0 ? (
          <Text style={styles.empty}>
            {plainMode ? 'Nothing at a set time.' : 'No bells on this day. Open water.'}
          </Text>
        ) : (
          shown.map((b) =>
            open === b.id ? (
              // The bell, opened: its name and its time, editable where they
              // are, with Keep and Take down beside them.
              <View key={b.id} style={[styles.row, styles.rowOpen]}>
                <View style={styles.editor}>
                  <TextInput
                    value={draftTitle}
                    onChangeText={setDraftTitle}
                    maxLength={MAX_BELL_CHARS}
                    style={styles.input}
                    // Named for the bell, because the form below carries the
                    // same two labels and a reader has to tell them apart.
                    accessibilityLabel={`${b.title}: name`}
                  />
                  <TextInput
                    value={draftWhen}
                    onChangeText={setDraftWhen}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                    onSubmitEditing={() => void keep()}
                    returnKeyType="done"
                    accessibilityLabel={`${b.title}: time`}
                  />
                  <Text style={styles.readAs}>
                    {draftAt === null ? 'Not a time yet.' : `Reads as ${clockLabel(draftAt)}.`}
                  </Text>
                  <View style={styles.editorRow}>
                    <Pressable
                      onPress={() => void take(b.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Take down: ${b.title}`}
                      style={({ pressed }) => [styles.takeDown, pressed && styles.pressed]}
                    >
                      <Text style={styles.takeDownText}>Take down</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => void keep()}
                      disabled={!draftReady}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.keep,
                        !draftReady && styles.disabled,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={styles.keepText}>Keep</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ) : (
              <Pressable
                key={b.id}
                onPress={() => openBell(b)}
                accessibilityRole="button"
                accessibilityLabel={`${b.title} at ${clockLabel(b.at)}. Open to change it.`}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                {/* Drawn, never typed — see BellMark. It wears the bells'
                    own warmth, the one colour this screen is allowed. */}
                <BellMark colour={palette.warn} />
                <Text style={styles.rowTime}>{clockLabel(b.at)}</Text>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{b.title}</Text>
                  <Text style={styles.rowWatch}>
                    {plainMode ? WATCHES[watchOf(b)].short : WATCHES[watchOf(b)].label} ·{' '}
                    {shortDay(b.day)}
                  </Text>
                </View>
                <Text style={styles.rowGo}>›</Text>
              </Pressable>
            ),
          )
        )}

        <View style={styles.form}>
          <Text style={styles.fieldLabel}>{plainMode ? 'What' : 'What it is'}</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Dentist"
            placeholderTextColor={palette.inkFaint}
            maxLength={MAX_BELL_CHARS}
            style={styles.input}
            accessibilityLabel={plainMode ? 'What' : 'What it is'}
          />
          <Text style={styles.fieldLabel}>{plainMode ? 'Time' : 'When it falls'}</Text>
          <TextInput
            value={when}
            onChangeText={setWhen}
            placeholder="15:00"
            placeholderTextColor={palette.inkFaint}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            onSubmitEditing={() => void hang()}
            returnKeyType="done"
            accessibilityLabel={plainMode ? 'Time' : 'When it falls'}
          />
          {/* Says what it read rather than validating at you: a time the app
              could not parse simply has not been read yet. */}
          <Text style={styles.readAs}>
            {when.trim().length === 0
              ? 'Twenty-four hour. 9, 9:30 and 0930 all read the same.'
              : at === null
                ? 'Not a time yet.'
                : `Reads as ${clockLabel(at)}.`}
          </Text>

          <Pressable
            onPress={() => void hang()}
            disabled={!ready}
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.filled,
              !ready && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.filledText}>{plainMode ? 'Add it' : 'Hang the bell'}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 22 },

    days: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    dayChip: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      minHeight: 44,
      justifyContent: 'center',
    },
    dayChipOn: { borderColor: c.warn, backgroundColor: c.warnSoft },
    dayText: { ...type.small, color: c.inkDim },
    dayTextOn: { color: c.warn },

    empty: { ...type.body, color: c.inkFaint, marginTop: space.sm },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
      padding: space.md,
      minHeight: 56,
    },
    rowTime: { ...type.mono, color: c.warn, minWidth: 44 },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { ...type.heading, fontSize: 18, color: c.ink },
    rowWatch: { ...type.mono, fontSize: 12, color: c.inkFaint },
    rowOpen: { alignItems: 'stretch', borderColor: c.warn, backgroundColor: c.surface },
    rowGo: { ...type.heading, fontSize: 18, color: c.inkFaint },
    editor: { flex: 1, gap: space.sm },
    editorRow: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    takeDown: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.crimson,
    },
    takeDownText: { ...type.mono, fontSize: 13, color: c.crimson },
    keep: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: c.warnSoft,
      borderWidth: 1,
      borderColor: c.warn,
    },
    keepText: { ...type.mono, fontSize: 13, color: c.warn },

    form: { gap: space.xs, marginTop: space.lg },
    fieldLabel: { ...type.label, color: c.inkFaint, marginTop: space.xs },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      minHeight: 48,
    },
    readAs: { ...type.small, color: c.inkFaint, marginTop: space.xs },

    filled: {
      backgroundColor: c.warn,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
      marginTop: space.sm,
    },
    filledText: { ...type.heading, fontSize: 16, color: c.onAccent },
    disabled: { opacity: 0.45 },
    pressed: { ...press },
  });
