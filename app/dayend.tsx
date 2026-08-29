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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { play } from '../src/sound';
import { useStore } from '../src/db/client';
import {
  allTasks,
  commitTask,
  getDayEnd,
  moveTask,
  movesMadeOn,
  saveDayEnd,
  sayWhy,
  setTaskDone,
  upcomingCourses,
} from '../src/db/repo';
import type { TaskMoveRow } from '../src/db/schema';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { useHaki } from '../src/state/HakiProvider';
import { Rise } from '../src/components/Rise';
import { SectionLabel } from '../src/components/SectionLabel';
import {
  HOW_PLACEHOLDER,
  HOW_PROMPT,
  MAX_HOW,
  MOVED_LABEL,
  closingLine,
  emptyDayLine,
  headingLine,
  movedPrompt,
  openLabel,
  readBack,
} from '../src/domain/dayEnd';
import { courseFor } from '../src/domain/course';
import { MAX_REASON } from '../src/domain/atSea';
import { pressingFirst } from '../src/domain/pressing';
import { formatMinutes, isDone, type Task } from '../src/domain/tasks';
import { addDays, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Day's End — the evening pass.
 *
 * The app had a morning and a week and nothing between them, so the day's
 * leftovers rolled into tomorrow without anybody looking at them once. This
 * is the look. It reads the day back, offers the still-open things a decision
 * while the day is still yours to decide about, collects the words for
 * anything that moved without them, and asks one question.
 *
 * **Nothing here is required and nothing here is marked.** The course is read
 * back and never asked about — `app/course.tsx` promises that in as many
 * words. Every field closes empty if that is what the evening was. A ritual
 * you can fail is a ritual you stop opening, and this one has to survive the
 * bad days to be worth anything on them.
 *
 * The Return's violet, because this is not a lens's screen: it belongs to the
 * day rather than to any one tool.
 */
export default function DayEndScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { palette, plainMode, acts, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const committing = useSingleFlight();

  const day = todayKey();
  const tomorrow = addDays(day, 1);

  const [open, setOpen] = useState<Task[]>([]);
  const [moved, setMoved] = useState<{ move: TaskMoveRow; title: string }[]>([]);
  const [heading, setHeading] = useState<string | null>(null);
  const [line, setLine] = useState('');
  const [words, setWords] = useState<Map<number, string>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const [tasks, moves, courses, saved] = await Promise.all([
      allTasks(db),
      movesMadeOn(db, day),
      upcomingCourses(db, day),
      getDayEnd(db, day),
    ]);
    // Pressing first here too. The evening pass is where the leftovers get
    // decided about, and the flagged and dated ones are the ones the decision
    // actually matters for.
    setOpen(
      pressingFirst(
        tasks.filter((task) => task.committedFor === day && !isDone(task)),
        day,
      ),
    );
    setMoved(moves);
    setHeading(courseFor(courses, day)?.heading ?? null);
    // Only seed the field once. Re-seeding on a reload would overwrite what
    // the finger is in the middle of typing.
    setLine((current) => (current.length > 0 ? current : (saved?.line ?? '')));
    setLoaded(true);
  }, [db, day]);

  useEffect(() => {
    void load();
  }, [load]);

  const facts = readBack(acts, plainMode);

  /**
   * A task shows up once, never twice.
   *
   * Something carried in this morning and still not done is both "still
   * open" and "moved today", and rendering it in both sections put the same
   * title on the screen twice with two different asks under it. So the
   * wordless move rides along under the row it belongs to — one task, one
   * card, decide it and say why it moved — and the standalone section keeps
   * only the ones that have already left the day.
   */
  const openIds = new Set(open.map((task) => task.id));
  const inlineWhy = new Map<number, TaskMoveRow>();
  for (const { move: m } of moved) {
    if (m.reason.length === 0 && openIds.has(m.taskId)) inlineWhy.set(m.taskId, m);
  }
  const gone = moved.filter(({ move: m }) => !openIds.has(m.taskId));

  /** The field for one move, wherever it is rendered. */
  function whyField(m: TaskMoveRow) {
    return (
      <>
        <Text style={styles.prompt}>{movedPrompt(m.toDay, plainMode)}</Text>
        <TextInput
          value={words.get(m.id) ?? ''}
          onChangeText={(text) => setWords((prev) => new Map(prev).set(m.id, text))}
          placeholder={m.toDay === null ? 'Not this week.' : 'Ran out of day.'}
          placeholderTextColor={palette.inkFaint}
          maxLength={MAX_REASON}
          style={styles.smallInput}
          accessibilityLabel={movedPrompt(m.toDay, plainMode)}
        />
      </>
    );
  }

  /** Strike something still open. One tap, free, exactly as everywhere else. */
  async function strike(task: Task) {
    setOpen((prev) => prev.filter((t) => t.id !== task.id));
    void Haptics.selectionAsync();
    play('armamentStrike');
    await setTaskDone(db, task.id, true);
    await refresh();
    await load();
  }

  /**
   * Move it to tomorrow, or off the day.
   *
   * Both are recorded. A move at day's end arrives without words and this
   * screen asks for them a section below — which is the whole point of doing
   * this here rather than forty times in the flow of a day.
   */
  async function move(task: Task, to: 'tomorrow' | null) {
    const landing = to === 'tomorrow' ? tomorrow : null;
    setOpen((prev) => prev.filter((t) => t.id !== task.id));
    void Haptics.selectionAsync();
    if (task.committedFor !== null) {
      await moveTask(db, { id: task.id, committedFor: task.committedFor }, landing, '', day);
    } else {
      await commitTask(db, task.id, landing);
    }
    await refresh();
    await load();
  }

  async function close() {
    const evening = line;
    const said = [...words.entries()];
    await committing(async () => {
      // The screen answers the finger: the sound lands and the door closes in
      // this frame, and the rows go down behind it.
      play('observationRead');
      router.back();
      await saveDayEnd(db, day, evening);
      for (const [id, why] of said) {
        if (why.trim().length > 0) await sayWhy(db, id, why);
      }
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
          { paddingBottom: usableBottom(insets.bottom) + space.xxxl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ------------------------------------------------- the day, read back */}
        <Rise>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>{plainMode ? 'Today' : 'The day, read back'}</Text>
            {facts.length > 0 ? (
              <View style={styles.facts}>
                {facts.map((fact) => (
                  <Text key={fact} style={styles.fact}>
                    {fact}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>{emptyDayLine(plainMode)}</Text>
            )}
          </View>
        </Rise>

        {/* The heading is shown and never marked. `app/course.tsx` promises
            nothing asks at the end of the day whether you held it, and a tick
            beside this line would break that promise to your face. */}
        {heading ? (
          <Rise delay={40}>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>{headingLine(plainMode)}</Text>
              <Text style={styles.heading}>{heading}</Text>
            </View>
          </Rise>
        ) : null}

        {/* ------------------------------------------------------- still open */}
        {open.length > 0 ? (
          <Rise delay={80}>
            <View style={styles.group}>
              <SectionLabel label={openLabel(open.length)} />
              {open.map((task) => (
                <View key={task.id} style={styles.openCard}>
                  <View style={styles.row}>
                    <Pressable
                      onPress={() => void strike(task)}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: false }}
                      accessibilityLabel={`Done: ${task.title}`}
                      style={({ pressed }) => [styles.strike, pressed && styles.pressed]}
                    >
                      <View style={styles.box} />
                      <View style={styles.rowBody}>
                        <Text style={styles.rowTitle} numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text style={styles.rowMeta}>{formatMinutes(task.minutes)}</Text>
                      </View>
                    </Pressable>
                    <View style={styles.moves}>
                      <Pressable
                        onPress={() => void move(task, 'tomorrow')}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${task.title} to tomorrow`}
                        style={({ pressed }) => [styles.move, pressed && styles.pressed]}
                      >
                        <Text style={[styles.moveText, { color: palette.violet }]}>
                          Tomorrow
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void move(task, null)}
                        accessibilityRole="button"
                        accessibilityLabel={`Move ${task.title} to Waiting`}
                        style={({ pressed }) => [styles.move, pressed && styles.pressed]}
                      >
                        <Text style={styles.moveText}>Waiting</Text>
                      </Pressable>
                    </View>
                  </View>
                  {/* It was carried into today and is still here. The ask
                      rides under the row rather than repeating the title in
                      a section of its own. */}
                  {inlineWhy.has(task.id) ? (
                    <View style={styles.inline}>
                      {whyField(inlineWhy.get(task.id) as TaskMoveRow)}
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </Rise>
        ) : null}

        {/* ----------------------------------------------------- what moved */}
        {/* The debt the Do tab lets through. A first-day carry costs nothing
            in the flow of a day, because a writing tax on every leftover is
            how a list gets abandoned — and this is where it is collected
            instead: once, somewhere you came on purpose. Still optional. */}
        {gone.length > 0 ? (
          <Rise delay={120}>
            <View style={styles.group}>
              <SectionLabel label={MOVED_LABEL} />
              {gone.map(({ move: m, title }) => (
                <View key={m.id} style={styles.moveCard}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {title}
                  </Text>
                  {m.reason.length > 0 ? (
                    <Text style={styles.said}>{m.reason}</Text>
                  ) : (
                    whyField(m)
                  )}
                </View>
              ))}
            </View>
          </Rise>
        ) : null}

        {/* --------------------------------------------------- how it went */}
        <Rise delay={160}>
          <View style={styles.group}>
            <Text style={styles.question}>{HOW_PROMPT}</Text>
            <TextInput
              value={line}
              onChangeText={setLine}
              placeholder={HOW_PLACEHOLDER}
              placeholderTextColor={palette.inkFaint}
              style={styles.input}
              maxLength={MAX_HOW}
              multiline
              // Native only: iOS opens the keyboard for gesture-driven focus
              // but never for programmatic focus.
              autoFocus={Platform.OS !== 'web' && loaded && open.length === 0}
              accessibilityLabel={HOW_PROMPT}
            />
            <Text style={styles.note}>
              {plainMode
                ? 'Optional, like everything here. Nothing is scored.'
                : 'Optional, like everything here. It is never read back as a verdict.'}
            </Text>
          </View>
        </Rise>

        <Pressable
          onPress={() => void close()}
          accessibilityRole="button"
          accessibilityLabel="Close the day"
          style={({ pressed }) => [styles.save, pressed && styles.pressed]}
        >
          <Text style={styles.saveText}>{plainMode ? 'Save' : 'Close the day'}</Text>
        </Pressable>
        <Text style={styles.closing}>{closingLine(plainMode)}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: space.sm,
    },
    cardLabel: { ...type.label, color: c.inkFaint },
    facts: { gap: space.xs },
    fact: { ...type.body, fontSize: 19, color: c.ink, lineHeight: 24 },
    empty: { ...type.body, color: c.inkDim, lineHeight: 24 },
    heading: { ...type.body, fontSize: 21, color: c.ink, lineHeight: 26 },

    group: { gap: space.sm },

    openCard: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    inline: { gap: space.sm, paddingTop: space.sm },
    strike: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 44,
    },
    box: {
      width: 26,
      height: 26,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.line,
    },
    rowBody: { flex: 1, gap: 1 },
    rowTitle: { ...type.body, fontSize: 19, color: c.ink, lineHeight: 22 },
    rowMeta: { ...type.mono, fontSize: 12, color: c.inkFaint },
    moves: { alignItems: 'flex-end' },
    move: { minHeight: 22, justifyContent: 'center', paddingHorizontal: space.xs },
    moveText: { ...type.mono, fontSize: 13, color: c.inkDim },

    moveCard: {
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.sm,
    },
    said: { ...type.body, color: c.inkDim, lineHeight: 22 },
    prompt: { ...type.small, color: c.inkDim },
    smallInput: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      minHeight: 48,
    },

    question: { ...type.heading, color: c.ink },
    input: {
      ...type.body,
      fontSize: 21,
      lineHeight: 27,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    note: { ...type.small, color: c.inkFaint, lineHeight: 19 },

    save: {
      backgroundColor: c.violet,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    saveText: { ...type.heading, color: c.onAccent },
    closing: { ...type.small, color: c.inkFaint, textAlign: 'center' },
    pressed: { ...press },
  });
