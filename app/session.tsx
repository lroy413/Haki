import { useEffect, useMemo, useState } from 'react';
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
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Dial } from '../src/components/Dial';
import { useStore } from '../src/db/client';
import {
  allSessions,
  deleteSession,
  getSession,
  logSession,
  updateSession,
} from '../src/db/repo';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { useHaki } from '../src/state/HakiProvider';
import { underCrew } from '../src/theme/palettes';
import { gapClosedBy, pastDay, returnMessage } from '../src/domain/training';
import { play } from '../src/sound';
import { shortDay, todayKey } from '../src/domain/date';
import { font, radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

const QUICK_KINDS = ['Push', 'Pull', 'Legs', 'Full body', 'Run', 'Conditioning'];

/**
 * Log a training session — or change one.
 *
 * Only `kind` is required. Everything else is optional, because a session
 * logged in five seconds beats a session not logged at all — and the gap
 * detection that matters only needs the date.
 *
 * Two things the owner asked for by name: **the day is a field**, because a
 * session is logged from memory as often as from the gym floor and a Tuesday
 * entered on Thursday is a Tuesday; and **a row opens back up** — with an
 * `id` this is the same form over an existing session, with Save writing the
 * changes and a Remove at the foot.
 *
 * A backdated session is bookkeeping rather than a comeback, so it never
 * gets the Return ceremony: the gap it closed is still worked out against the
 * day it was, and written, but the drums are for today.
 */
export default function SessionScreen() {
  const router = useRouter();
  const { db, settings } = useStore();
  const { t, refresh, palette, crew, training } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);

  const { id: rawId } = useLocalSearchParams<{ id?: string }>();
  const editing = typeof rawId === 'string' && /^\d+$/.test(rawId) ? Number(rawId) : null;

  const [kind, setKind] = useState('');
  const [minutes, setMinutes] = useState('');
  const [intensity, setIntensity] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [when, setWhen] = useState('');
  const [returned, setReturned] = useState<string | null>(null);

  const today = todayKey();
  // Empty means today. Anything else has to read as a day that has happened.
  const day = pastDay(when, today);

  useEffect(() => {
    if (editing === null) return;
    let cancelled = false;
    void getSession(db, editing).then((row) => {
      if (cancelled || !row) return;
      setKind(row.kind);
      setMinutes(row.minutes ? String(row.minutes) : '');
      setIntensity(row.intensity);
      setNote(row.note ?? '');
      setWhen(row.day === today ? '' : row.day);
    });
    return () => {
      cancelled = true;
    };
  }, [db, editing, today]);

  // The flight guard, not a state flag, is what stops a second tap: state
  // is exactly what is too slow here.
  const canSave = kind.trim().length > 0 && day !== null;

  const committing = useSingleFlight();

  async function save() {
    if (!canSave) return;

    // Captured before anything closes, because the fields are about to be
    // out of reach.
    const parsedMinutes = Number.parseInt(minutes, 10);
    const draft = {
      kind: kind.trim(),
      minutes: Number.isFinite(parsedMinutes) && parsedMinutes > 0 ? parsedMinutes : null,
      intensity,
      note: note.trim() || null,
    };

    const landsOn = day ?? today;

    // Whether this lands as a Return is already known synchronously — the
    // provider works it out on every refresh — so the screen does not have to
    // wait for a database read to know which acknowledgement to give. Only a
    // session for *today* can be a comeback; a backdated one is bookkeeping.
    const willReturn = editing === null && landsOn === today && training.inGap;
    const gapDays = training.daysSinceLast ?? 0;

    await committing(async () => {
      // The screen answers the finger. Three taps on this button used to
      // write three sessions, because it closed only after the write came
      // back down the single sqlite channel — the same shape the rest of the
      // app was swept for, and this file was missed.
      if (willReturn) {
        play('returnDrums');
        setReturned(returnMessage(gapDays));
      } else {
        router.back();
      }

      if (editing !== null) {
        await updateSession(db, editing, { ...draft, day: landsOn });
        await refresh();
        return;
      }

      // Work out the gap before writing, or this session becomes its own
      // "previous session" and every Return would read as zero.
      const existing = await allSessions(db);
      const gap = gapClosedBy(existing, landsOn, settings.training);

      await logSession(db, { ...draft, day: landsOn }, gap);
      await refresh();
    });
  }

  function remove() {
    if (editing === null) return;
    void committing(async () => {
      router.back();
      await deleteSession(db, editing);
      await refresh();
    });
  }

  if (returned) {
    return (
      <View style={styles.returnScreen}>
        {/* The signature violet under both crews — a Return is not a lens's
            light, and the lens palette would turn it jade. */}
        <Text style={[styles.returnKanji, { color: palette.violet }]}>帰</Text>
        <Text style={styles.returnTitle}>Return</Text>
        <Text style={styles.returnBody}>{returned}</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.save, styles.returnDone, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>Good</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* The same form over an existing session says so in the header —
          "Log a session" above a row you came to correct is the wrong word. */}
      {editing !== null ? <Stack.Screen options={{ title: t.sessionEditTitle }} /> : null}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingKind}</Text>
          <TextInput
            value={kind}
            onChangeText={setKind}
            placeholder="Push"
            placeholderTextColor={palette.inkFaint}
            style={styles.input}
            // Native only: iOS opens the keyboard for gesture-driven focus,
            // never for programmatic focus, and an already-focused field
            // fires no new focus event when tapped.
            autoFocus={Platform.OS !== 'web'}
            accessibilityLabel={t.trainingKind}
          />
          <View style={styles.quick}>
            {QUICK_KINDS.map((q) => (
              <Pressable
                key={q}
                onPress={() => setKind(q)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.chip,
                  kind === q && styles.chipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, kind === q && styles.chipTextOn]}>{q}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.sessionDay}</Text>
          <TextInput
            value={when}
            onChangeText={setWhen}
            placeholder="Today"
            placeholderTextColor={palette.inkFaint}
            keyboardType="numbers-and-punctuation"
            style={styles.input}
            accessibilityLabel={t.sessionDay}
          />
          {/* Says what it read rather than validating at you. */}
          <Text style={styles.readAs}>
            {when.trim().length === 0
              ? 'Today. A day number, "aug 28" or "8/28" for one that has been.'
              : day === null
                ? 'Not a day that has happened.'
                : `Reads as ${day === today ? 'today' : shortDay(day, today)}.`}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingMinutes}</Text>
          <TextInput
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            placeholder="45"
            placeholderTextColor={palette.inkFaint}
            style={styles.input}
            accessibilityLabel={t.trainingMinutes}
          />
        </View>

        <Dial
          label={t.trainingIntensity}
          value={intensity}
          onChange={setIntensity}
          accent={lens.crimson}
        />

        <View style={styles.field}>
          <Text style={styles.label}>{t.trainingNote}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Optional"
            placeholderTextColor={palette.inkFaint}
            style={[styles.input, styles.multiline]}
            accessibilityLabel={t.trainingNote}
          />
        </View>

        <Pressable
          onPress={save}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel="Save this session"
          style={({ pressed }) => [
            styles.save,
            !canSave && styles.saveDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>
            {!kind.trim()
              ? 'Name it first'
              : day === null
                ? 'Fix the day'
                : editing !== null
                  ? 'Save it'
                  : 'Log it'}
          </Text>
        </Pressable>

        {/* A session logged twice by a slipped thumb is not a record of
            anything. This removes the row and nothing else — the day it
            happened on keeps every other mark it earned. Crimson-less on
            purpose: it is a correction, not a breach. */}
        {editing !== null ? (
          <Pressable
            onPress={remove}
            accessibilityRole="button"
            accessibilityLabel="Remove this session"
            style={({ pressed }) => [styles.remove, pressed && styles.pressed]}
          >
            <Text style={styles.removeText}>Remove this session</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },

    field: { gap: space.sm },
    label: { ...type.heading, color: c.ink },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      height: 54,
    },
    multiline: { height: 90, paddingTop: space.md, textAlignVertical: 'top' },
    readAs: { ...type.small, color: c.inkFaint },
    remove: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    removeText: { ...type.mono, fontSize: 13, color: c.inkFaint },

    quick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    chip: {
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    chipOn: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    chipText: { ...type.small, color: c.inkDim },
    chipTextOn: { color: c.crimson },

    save: {
      backgroundColor: c.crimson,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      paddingHorizontal: space.lg,
      alignItems: 'center',
    },
    // Centred rather than stretched, so it needs a width of its own.
    returnDone: { paddingHorizontal: space.xxxl, minWidth: 180, marginTop: space.sm },
    saveDisabled: { backgroundColor: c.surface2 },
    saveText: { ...type.heading, color: c.onAccent },
    pressed: { ...press },

    returnScreen: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
      gap: space.lg,
    },
    returnKanji: { fontFamily: font.display, fontSize: 72, color: c.violet },
    returnTitle: { ...type.display, color: c.ink },
    returnBody: {
      ...type.body,
      color: c.inkDim,
      textAlign: 'center',
      lineHeight: 23,
      maxWidth: 320,
    },
  });
