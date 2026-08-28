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
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { addRhythm, listRhythms, retireRhythm, updateRhythm } from '../src/db/repo';
import {
  DAY_NAMES,
  MAX_INTERVAL,
  MIN_INTERVAL,
  cadence,
  isPlayable,
  toggleWeekday,
  type Rhythm,
  type RhythmKind,
} from '../src/domain/rhythm';
import { DEFAULT_TASK_MINUTES, formatMinutes } from '../src/domain/tasks';
import { useHaki } from '../src/state/HakiProvider';
import { underCrew } from '../src/theme/palettes';
import { font, radius, space, type } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The rhythm — everything set to come back, and where they are made.
 *
 * Deliberately a screen you visit rather than a list you live in: the day's
 * work belongs on the Armament tab, and this is the workshop behind it. What
 * you set here shows up there as a standing offer on its days.
 *
 * Nothing on this screen reports how often a rhythm has been taken. That
 * number exists — it is the tasks it produced — and showing it here would
 * turn a set of offers into a set of scores, which is the one thing the model
 * is built to avoid. See `domain/rhythm.ts`.
 */

const MINUTE_CHIPS = [5, 15, 30, 60, 120];

type Draft = {
  title: string;
  minutes: number;
  kind: RhythmKind;
  weekdays: number[];
  intervalDays: number;
};

const EMPTY: Draft = {
  title: '',
  minutes: DEFAULT_TASK_MINUTES,
  kind: 'weekdays',
  weekdays: [],
  intervalDays: 3,
};

export default function RhythmsScreen() {
  const { db } = useStore();
  const { t, palette, plainMode, refresh, crew } = useHaki();
  // The workshop is 武装色's back room, so it wears the lens's colour too.
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const insets = useSafeAreaInsets();

  const [rhythms, setRhythms] = useState<Rhythm[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** The row being edited, or null when the draft is a new one. */
  const [editing, setEditing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setRhythms(await listRhythms(db));
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const live = rhythms.filter((r) => !r.retired);
  const stopped = rhythms.filter((r) => r.retired);

  async function save() {
    if (!draft || !isPlayable(draft)) return;
    if (editing === null) await addRhythm(db, draft);
    else await updateRhythm(db, editing, draft);
    setDraft(null);
    setEditing(null);
    await load();
    await refresh();
  }

  function edit(r: Rhythm) {
    setEditing(r.id);
    setDraft({
      title: r.title,
      minutes: r.minutes,
      kind: r.kind,
      weekdays: r.weekdays,
      intervalDays: r.intervalDays,
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
        <Text style={styles.blurb}>{t.rhythmBlurb}</Text>

        {live.length === 0 && !draft ? <Text style={styles.empty}>{t.rhythmEmpty}</Text> : null}

        {live.map((r) => (
          <Pressable
            key={r.id}
            onPress={() => edit(r)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${r.title}, ${cadence(r)}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>{r.title}</Text>
              <Text style={styles.rowMeta}>
                {cadence(r)} · {formatMinutes(r.minutes)}
              </Text>
            </View>
            <Text style={styles.rowEdit}>Edit</Text>
          </Pressable>
        ))}

        {draft ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.rhythmName}</Text>
            <TextInput
              value={draft.title}
              onChangeText={(title) => setDraft({ ...draft, title })}
              autoFocus={Platform.OS !== 'web'}
              style={styles.input}
              placeholder="Laundry"
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.rhythmName}
            />

            {/* Two ways a thing can come back, and they answer different
                questions: "which days" for anything the week holds in place,
                "how often" for anything that just needs doing again. */}
            <View style={styles.kinds}>
              {(['weekdays', 'interval'] as RhythmKind[]).map((kind) => (
                <Pressable
                  key={kind}
                  onPress={() => setDraft({ ...draft, kind })}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: draft.kind === kind }}
                  style={({ pressed }) => [
                    styles.kind,
                    draft.kind === kind && styles.kindOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.kindText, draft.kind === kind && styles.kindTextOn]}>
                    {kind === 'weekdays' ? t.rhythmKindWeek : t.rhythmKindInterval}
                  </Text>
                </Pressable>
              ))}
            </View>

            {draft.kind === 'weekdays' ? (
              <>
                <Text style={styles.fieldLabel}>{t.rhythmDays}</Text>
                <View style={styles.days}>
                  {DAY_NAMES.map((name, index) => {
                    const on = draft.weekdays.includes(index);
                    return (
                      <Pressable
                        key={name}
                        onPress={() =>
                          setDraft({ ...draft, weekdays: toggleWeekday(draft.weekdays, index) })
                        }
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: on }}
                        accessibilityLabel={name}
                        style={({ pressed }) => [
                          styles.day,
                          on && styles.dayOn,
                          pressed && styles.pressed,
                        ]}
                      >
                        {/* Two letters, not one: S/S and T/T are the same
                            glyph twice and the week is not scannable. */}
                        <Text style={[styles.dayText, on && styles.dayTextOn]}>
                          {name.slice(0, 2)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>{t.rhythmEvery}</Text>
                <View style={styles.stepper}>
                  <Pressable
                    onPress={() =>
                      setDraft({
                        ...draft,
                        intervalDays: Math.max(MIN_INTERVAL, draft.intervalDays - 1),
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="One day fewer"
                    style={({ pressed }) => [styles.step, pressed && styles.pressed]}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>
                    {draft.intervalDays === 1
                      ? 'Every day'
                      : `Every ${draft.intervalDays} days`}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setDraft({
                        ...draft,
                        intervalDays: Math.min(MAX_INTERVAL, draft.intervalDays + 1),
                      })
                    }
                    accessibilityRole="button"
                    accessibilityLabel="One day more"
                    style={({ pressed }) => [styles.step, pressed && styles.pressed]}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
                <Text style={styles.hint}>
                  Counted from the last time you took it, so letting one pass never pushes the
                  next one away.
                </Text>
              </>
            )}

            <Text style={styles.fieldLabel}>{t.trainingMinutes}</Text>
            <View style={styles.chips}>
              {MINUTE_CHIPS.map((m) => (
                <Pressable
                  key={m}
                  onPress={() => setDraft({ ...draft, minutes: m })}
                  accessibilityRole="button"
                  accessibilityLabel={`${m} minutes`}
                  style={({ pressed }) => [
                    styles.chip,
                    draft.minutes === m && styles.chipOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.chipText, draft.minutes === m && styles.chipTextOn]}>
                    {formatMinutes(m)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              <Pressable
                onPress={() => {
                  setDraft(null);
                  setEditing(null);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void save()}
                disabled={!isPlayable(draft)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.filled,
                  !isPlayable(draft) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.filledText}>Save</Text>
              </Pressable>
            </View>

            {editing !== null ? (
              <Pressable
                onPress={() =>
                  void retireRhythm(db, editing, true).then(() => {
                    setDraft(null);
                    setEditing(null);
                    return load();
                  })
                }
                accessibilityRole="button"
                style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
              >
                <Text style={styles.quietText}>{t.rhythmRetire}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Pressable
            onPress={() => {
              setEditing(null);
              setDraft(EMPTY);
            }}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>{t.rhythmAdd}</Text>
          </Pressable>
        )}

        {stopped.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>{t.rhythmRetired}</Text>
            {stopped.map((r) => (
              <View key={r.id} style={styles.rowStopped}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitleStopped}>{r.title}</Text>
                  <Text style={styles.rowMeta}>{cadence(r)}</Text>
                </View>
                <Pressable
                  onPress={() => void retireRhythm(db, r.id, false).then(load)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.rhythmUnretire}: ${r.title}`}
                  style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
                >
                  <Text style={styles.quietText}>{t.rhythmUnretire}</Text>
                </Pressable>
              </View>
            ))}
            <Text style={styles.hint}>
              {plainMode
                ? 'Stopped ones keep everything already ticked off them.'
                : 'A stopped rhythm keeps every task it ever produced. Nothing is deleted.'}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 22, marginBottom: space.xs },
    empty: { ...type.body, color: c.inkFaint, marginVertical: space.lg },
    hint: { ...type.small, color: c.inkFaint, lineHeight: 18 },
    sectionLabel: { ...type.label, color: c.inkFaint, marginTop: space.lg },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      minHeight: 44,
    },
    rowStopped: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      paddingVertical: space.md,
      minHeight: 44,
    },
    rowBody: { flex: 1, gap: 2 },
    rowTitle: { fontFamily: font.displayBold, fontSize: 17, color: c.ink },
    rowTitleStopped: { fontFamily: font.displayBold, fontSize: 16, color: c.inkFaint },
    rowMeta: { ...type.mono, fontSize: 12, color: c.inkDim },
    rowEdit: { ...type.mono, fontSize: 12, color: c.crimson },

    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.sm,
    },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 11, marginTop: space.xs },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },

    kinds: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    kind: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    kindOn: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    kindText: { ...type.mono, fontSize: 12, color: c.inkDim },
    kindTextOn: { color: c.crimson },

    days: { flexDirection: 'row', gap: space.xs },
    day: {
      flex: 1,
      aspectRatio: 1,
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayOn: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    dayText: { ...type.mono, fontSize: 12, color: c.inkDim },
    dayTextOn: { color: c.crimson },

    stepper: { flexDirection: 'row', alignItems: 'center', gap: space.md },
    step: {
      width: 44,
      height: 44,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepText: { fontFamily: font.display, fontSize: 20, color: c.ink },
    stepValue: { ...type.body, color: c.ink, flex: 1, textAlign: 'center' },

    chips: { flexDirection: 'row', gap: space.xs, flexWrap: 'wrap' },
    // The same chip as the Armament tab's estimate row, deliberately: it is
    // the same question being asked, and a second shape for it would read as
    // a different control.
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.pill,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipOn: { borderColor: c.cyan, backgroundColor: c.cyanSoft },
    chipText: { ...type.mono, fontSize: 12, color: c.inkDim },
    chipTextOn: { color: c.cyan },

    actions: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    filled: {
      flex: 1,
      backgroundColor: c.crimson,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 15, color: c.onAccent },
    ghost: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { ...type.heading, fontSize: 15, color: c.inkDim },
    disabled: { opacity: 0.4 },
    quiet: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
    quietText: { ...type.mono, fontSize: 12, color: c.inkDim },

    add: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      paddingVertical: space.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: { ...type.heading, color: c.inkDim },
    pressed: { ...press },
  });
