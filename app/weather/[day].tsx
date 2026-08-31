import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/db/client';
import { logShift, reword, unlogShift, weatherDay } from '../../src/db/repo';
import { useHaki } from '../../src/state/HakiProvider';
import { SectionLabel } from '../../src/components/SectionLabel';
import { Rise } from '../../src/components/Rise';
import { useSingleFlight } from '../../src/state/useSingleFlight';
import {
  MAX_NOTE,
  NOTE_PLACEHOLDER,
  WEATHER_WORDS,
  dayLine,
  dayReadings,
  type Reading,
  type WeatherWord,
} from '../../src/domain/weather';
import { watchAt, watchName } from '../../src/domain/watches';
import { shortDay, todayKey } from '../../src/domain/date';
import { usableBottom } from '../../src/theme/viewport';
import { lit, press } from '../../src/theme/surfaces';
import { radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

/**
 * One day's weather, and every time it moved.
 *
 * The owner's ask, and the reason the module grew a second half: _"Currently I
 * set the weather when I wake up but then what happens if it shifts throughout
 * the day? I'm trying to learn to be better aware of my emotions and what
 * triggers them so to be able to click it and open it up and write updates to
 * it and a brief reason why is helpful."_
 *
 * So a day is a run of readings. The morning's word is the first of them and
 * comes from the read; everything after it is named here, when you notice,
 * with an optional line about what was happening.
 *
 * Four rules, all of them `domain/weather.ts`'s:
 *
 * - **Nothing is counted.** Not the readings, not the words, not how often the
 *   day moved. A figure for that is a steadiness score with a nautical hat on,
 *   and the vocabulary was chosen for having no scale in it at all.
 * - **The note records what was happening, never why.** The placeholder says
 *   "if you know", because the honest answer is often that you do not — and an
 *   app that insists on a cause teaches you to invent one. The same line
 *   `foresight.ts` holds against its own statistics.
 * - **A reading is a moment, so naming again never overwrites.** Fog at two
 *   and Bright at six are two true readings of one day.
 * - **The note can be written later**, because working out what was going on
 *   is usually the slow part. The word and the moment are what happened; the
 *   line about them is not.
 *
 * 見聞色's light: this is noticing your own state, which is the whole tab.
 */
export default function WeatherDayScreen() {
  const { day: raw } = useLocalSearchParams<{ day: string }>();
  const day = typeof raw === 'string' && raw ? raw : todayKey();
  const today = todayKey();
  const isToday = day === today;

  const { db } = useStore();
  const { palette, plainMode, hardening, charge, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [word, setWord] = useState<WeatherWord | null>(null);
  const [note, setNote] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const saving = useSingleFlight();
  const editing = useSingleFlight();

  const load = useCallback(async () => {
    const { morning, shifts } = await weatherDay(db, day);
    setReadings(dayReadings(morning, shifts));
  }, [db, day]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function name(next: WeatherWord) {
    if (!plainMode) void Haptics.selectionAsync();
    setWord((was) => (was === next ? null : next));
  }

  function save() {
    void saving(async () => {
      if (!word) return;
      // The acknowledgement goes first, inside the flight and before the
      // first await: the field clears in the same frame as the tap.
      const taking = word;
      const line = note;
      setWord(null);
      setNote('');
      if (!plainMode) void Haptics.selectionAsync();
      await logShift(db, taking, line, day);
      await load();
    });
  }

  function commitNote(id: number) {
    void editing(async () => {
      const line = draft;
      setOpen(null);
      await reword(db, id, line);
      await load();
    });
  }

  function drop(id: number) {
    void editing(async () => {
      setOpen(null);
      await unlogShift(db, id);
      await load();
    });
  }

  const said = dayLine(readings, plainMode);

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.body,
          { paddingBottom: usableBottom(insets.bottom) + space.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Rise>
          <View style={styles.head}>
            <Text style={styles.when}>{isToday ? 'Today' : shortDay(day, today)}</Text>
            {plainMode ? null : <Text style={styles.glyph}>空模様</Text>}
          </View>
          <Text style={styles.line}>{said}</Text>
        </Rise>

        {/* Naming is for today. A reading is a moment you noticed, and
            noticing last Tuesday's afternoon is a different act — the note on
            an existing one can still be written whenever it comes to you. */}
        {isToday ? (
          <Rise delay={40}>
            <View
              style={[styles.namer, lit(palette.violet, plainMode ? 0 : hardening, charge)]}
            >
              <SectionLabel label={t.weatherName} />
              <View style={styles.words}>
                {WEATHER_WORDS.map((w) => {
                  const on = word === w;
                  return (
                    <Pressable
                      key={w}
                      onPress={() => name(w)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      style={({ pressed }) => [
                        styles.chip,
                        on && styles.chipOn,
                        pressed && styles.pressed,
                      ]}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{w}</Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* The line is optional and the button does not wait for it. */}
              <TextInput
                style={styles.field}
                value={note}
                onChangeText={setNote}
                placeholder={NOTE_PLACEHOLDER}
                placeholderTextColor={palette.inkFaint}
                maxLength={MAX_NOTE}
                multiline
                accessibilityLabel="What was happening"
              />

              <Pressable
                onPress={save}
                disabled={!word}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.save,
                  !word && styles.saveOff,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.saveText, !word && styles.saveTextOff]}>
                  {t.weatherAdd}
                </Text>
              </Pressable>
            </View>
          </Rise>
        ) : null}

        <Rise delay={80}>
          <SectionLabel label={t.weatherRun} style={styles.runLabel} />
          {readings.length === 0 ? (
            <Text style={styles.empty}>
              {plainMode
                ? 'Nothing named for this day.'
                : 'Nothing named. The word is optional and always was.'}
            </Text>
          ) : (
            <View style={styles.run}>
              {readings.map((r, i) => (
                <Row
                  key={r.id ?? `morning-${i}`}
                  reading={r}
                  styles={styles}
                  plainMode={plainMode}
                  open={r.id !== null && open === r.id}
                  draft={draft}
                  onOpen={() => {
                    if (r.id === null) return;
                    setDraft(r.note);
                    setOpen(r.id);
                  }}
                  onDraft={setDraft}
                  onCommit={() => r.id !== null && commitNote(r.id)}
                  onDrop={() => r.id !== null && drop(r.id)}
                  placeholderColour={palette.inkFaint}
                />
              ))}
            </View>
          )}
        </Rise>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/**
 * One reading.
 *
 * The word is the loud part and the time is furniture. The watch comes from
 * the stamp by arithmetic (`watchAt`), never from a choice — the same rule the
 * Bells hold, so the day's picture and this list can never disagree about when
 * a thing was.
 */
function Row({
  reading,
  styles,
  plainMode,
  open,
  draft,
  onOpen,
  onDraft,
  onCommit,
  onDrop,
  placeholderColour,
}: {
  reading: Reading;
  styles: ReturnType<typeof makeStyles>;
  plainMode: boolean;
  open: boolean;
  draft: string;
  onOpen: () => void;
  onDraft: (next: string) => void;
  onCommit: () => void;
  onDrop: () => void;
  placeholderColour: string;
}) {
  const at = new Date(reading.at);
  const clock = `${String(at.getHours()).padStart(2, '0')}:${String(at.getMinutes()).padStart(2, '0')}`;
  const band = watchName(watchAt(at.getHours()));

  return (
    <View style={styles.reading}>
      <Pressable
        onPress={onOpen}
        disabled={reading.id === null}
        accessibilityRole={reading.id === null ? 'text' : 'button'}
        accessibilityLabel={`${reading.word} at ${clock}`}
        style={({ pressed }) => [styles.readingHead, pressed && styles.pressed]}
      >
        <Text style={styles.word}>{reading.word}</Text>
        <Text style={styles.stamp}>
          {reading.morning
            ? plainMode
              ? 'From the morning check-in'
              : 'Named on the morning read'
            : `${band} · ${clock}`}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.editor}>
          <TextInput
            style={styles.field}
            value={draft}
            onChangeText={onDraft}
            placeholder={NOTE_PLACEHOLDER}
            placeholderTextColor={placeholderColour}
            maxLength={MAX_NOTE}
            multiline
            autoFocus
            accessibilityLabel="What was happening"
          />
          <View style={styles.editorRow}>
            {/* Crimson, because this destroys a record — the app's one use
                of it. Everything else about a reading is ink. */}
            <Pressable
              onPress={onDrop}
              accessibilityRole="button"
              style={({ pressed }) => [styles.drop, pressed && styles.pressed]}
            >
              <Text style={styles.dropText}>Take it off</Text>
            </Pressable>
            <Pressable
              onPress={onCommit}
              accessibilityRole="button"
              style={({ pressed }) => [styles.keep, pressed && styles.pressed]}
            >
              <Text style={styles.keepText}>Keep</Text>
            </Pressable>
          </View>
        </View>
      ) : reading.note ? (
        <Text style={styles.note}>{reading.note}</Text>
      ) : reading.morning ? null : (
        // An offer rather than an absence, the day's-practice-card rule at
        // one reading's scale.
        <Pressable
          onPress={onOpen}
          accessibilityRole="button"
          accessibilityLabel="Add what was happening"
          style={({ pressed }) => [styles.invite, pressed && styles.pressed]}
        >
          <Text style={styles.inviteText}>
            {plainMode ? 'Add a note' : 'Say what was happening'}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    body: { padding: space.lg, gap: space.lg },
    head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
    when: { ...type.title, color: c.ink },
    glyph: { ...type.mono, fontSize: 13, color: c.violet },
    line: { ...type.small, color: c.inkDim, marginTop: space.xs, lineHeight: 22 },

    namer: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.lg,
      padding: space.lg,
      gap: space.md,
    },
    words: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
    },
    chipOn: { borderColor: c.violet, backgroundColor: c.violetSoft },
    chipText: { ...type.mono, fontSize: 13, color: c.ink },
    chipTextOn: { color: c.violet },

    field: {
      ...type.body,
      fontSize: 17,
      color: c.ink,
      minHeight: 66,
      padding: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
      textAlignVertical: 'top',
    },

    save: {
      minHeight: 48,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: c.violetSoft,
      borderWidth: 1,
      borderColor: c.violet,
    },
    // Nothing named yet is not an error, so it goes quiet rather than red.
    saveOff: { backgroundColor: c.surface2, borderColor: c.line },
    saveText: { ...type.heading, fontSize: 17, color: c.violet },
    saveTextOff: { color: c.inkFaint },

    runLabel: { marginBottom: space.sm },
    run: { gap: space.sm },
    empty: { ...type.small, color: c.inkDim },
    reading: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.lg,
      padding: space.md,
      gap: space.xs,
    },
    readingHead: {
      minHeight: 44,
      justifyContent: 'center',
      gap: 2,
    },
    word: { ...type.heading, fontSize: 19, color: c.ink },
    stamp: { ...type.mono, fontSize: 12, color: c.inkFaint },
    note: { ...type.body, fontSize: 17, color: c.inkDim, lineHeight: 25 },
    invite: { minHeight: 44, justifyContent: 'center' },
    inviteText: { ...type.mono, fontSize: 12, color: c.violet },

    editor: { gap: space.sm },
    editorRow: { flexDirection: 'row', gap: space.sm },
    drop: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.crimson,
    },
    dropText: { ...type.mono, fontSize: 13, color: c.crimson },
    keep: {
      flex: 1,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.violet,
      backgroundColor: c.violetSoft,
    },
    keepText: { ...type.mono, fontSize: 13, color: c.violet },
    pressed: { ...press },
  });
