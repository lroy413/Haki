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
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { play } from '../../src/sound';
import { Emission } from '../../src/components/Emission';
import { useStore } from '../../src/db/client';
import {
  addTask,
  allTasks,
  commitTask,
  deleteTask,
  gearSessionsOn,
  recentSessions,
  setTaskDone,
  startGear,
} from '../../src/db/repo';
import type { TrainingSessionRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { returnMessage } from '../../src/domain/training';
import {
  backlog,
  DEFAULT_TASK_MINUTES,
  formatMinutes,
  loadMessage,
  stale,
  type Task,
} from '../../src/domain/tasks';
import {
  GEARS,
  GEAR_ORDER,
  GEAR_SOUND,
  availability,
  minutesToday,
  runningSession,
  type GearName,
  type GearSession,
} from '../../src/domain/gears';
import { todayKey } from '../../src/domain/date';
import { TAB_BAR_CLEARANCE, font, radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

/** Estimates you can pick without thinking. Typing a number is a decision too. */
const MINUTE_CHIPS = [5, 15, 30, 60, 120];

/**
 * 武装色 — Armament. Everything you do on purpose.
 *
 * Today's load sits at the top because that is the only part you act on. The
 * backlog is below and deliberately quieter: a wall of undone things is what
 * makes an ADHD brain close the app, so it is somewhere you go on purpose
 * rather than the first thing you face.
 */
export default function ArmamentScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, training, load, refresh, plainMode, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(DEFAULT_TASK_MINUTES);
  const [showBacklog, setShowBacklog] = useState(false);
  const [gears, setGears] = useState<GearSession[]>([]);

  const reload = useCallback(async () => {
    const [allT, recent, todaysGears] = await Promise.all([
      allTasks(db),
      recentSessions(db, 8),
      gearSessionsOn(db),
    ]);
    setTasks(allT);
    setSessions(recent);
    setGears(todaysGears);
    await refresh();
  }, [db, refresh]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function add(commitToday: boolean) {
    const name = title.trim();
    if (!name) return;
    void Haptics.selectionAsync();
    await addTask(db, name, minutes, commitToday ? todayKey() : null);
    setTitle('');
    setMinutes(DEFAULT_TASK_MINUTES);
    await reload();
  }

  async function toggleDone(taskItem: Task) {
    const marking = taskItem.doneAt === null;
    // Only on the way to done — an undo should not sound like an achievement.
    if (marking) play('armamentStrike');
    void Haptics.selectionAsync();
    await setTaskDone(db, taskItem.id, marking);
    await reload();
  }

  async function moveTo(taskItem: Task, day: string | null) {
    await commitTask(db, taskItem.id, day);
    await reload();
  }

  async function remove(taskItem: Task) {
    await deleteTask(db, taskItem.id);
    await reload();
  }

  async function shiftInto(gear: GearName) {
    play(GEAR_SOUND[gear]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await startGear(db, gear);
    await reload();
    router.push({ pathname: '/gear', params: { gear } });
  }

  const nowMs = Date.now();
  const running = runningSession(gears, nowMs);
  const inGear = minutesToday(gears, nowMs);
  const today = [
    ...load.open.map((item) => ({ item, done: false })),
    ...load.doneToday.map((item) => ({ item, done: true })),
  ];
  const waiting = backlog(tasks);
  const old = stale(tasks, todayKey());
  const message = loadMessage(load);
  const since = training.daysSinceLast;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ---------------------------------------------------------- today */}
        <View style={styles.head}>
          <Text style={styles.sectionLabel}>{t.todayLoad}</Text>
          <Text style={[styles.carrying, load.read === 'over' && { color: palette.warn }]}>
            {formatMinutes(load.openMinutes)}
          </Text>
        </View>

        {message ? (
          <Text style={[styles.message, load.read === 'over' && styles.messageWarn]}>
            {message}
          </Text>
        ) : null}

        {/*
          One list, not two. Striking a task moves it from `open` to
          `doneToday`, and across two separate maps React sees that as an
          unmount and a remount — which throws away the row's own state and
          swallows the emission before a frame of it renders. Rendering both
          from one array keeps the component identity, so the row is reordered
          in place and the corona survives the move.
        */}
        {today.map(({ item, done }) => (
          <TaskRow
            key={item.id}
            task={item}
            done={done}
            onToggle={() => toggleDone(item)}
            onSecondary={done ? undefined : () => moveTo(item, null)}
            secondaryLabel={done ? undefined : 'Later'}
          />
        ))}

        {/* ------------------------------------------------------ capture */}
        <View style={styles.capture}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.taskPlaceholder}
            placeholderTextColor={palette.inkFaint}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => void add(true)}
            accessibilityLabel={t.taskPlaceholder}
          />

          <View style={styles.chips}>
            {MINUTE_CHIPS.map((m) => (
              <Pressable
                key={m}
                onPress={() => setMinutes(m)}
                accessibilityRole="button"
                accessibilityLabel={`${m} minutes`}
                style={({ pressed }) => [
                  styles.chip,
                  minutes === m && styles.chipOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, minutes === m && styles.chipTextOn]}>
                  {formatMinutes(m)}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.addRow}>
            <Pressable
              onPress={() => void add(true)}
              disabled={!title.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addToday,
                !title.trim() && styles.addDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.addTodayText}>{t.addToToday}</Text>
            </Pressable>
            <Pressable
              onPress={() => void add(false)}
              disabled={!title.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addLater,
                !title.trim() && styles.addDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.addLaterText}>{t.addToLater}</Text>
            </Pressable>
          </View>
        </View>

        {/* ------------------------------------------------------ backlog */}
        <Pressable
          onPress={() => setShowBacklog((v) => !v)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
        >
          <Text style={styles.disclosureText}>
            {t.backlogLabel} · {waiting.length}
            {old.length > 0 ? ` · ${old.length} sitting a while` : ''}
          </Text>
          <Text style={styles.chevron}>{showBacklog ? '−' : '+'}</Text>
        </Pressable>

        {showBacklog
          ? waiting.map((item) => (
              <TaskRow
                key={item.id}
                task={item}
                onToggle={() => toggleDone(item)}
                onSecondary={() => moveTo(item, todayKey())}
                secondaryLabel="Today"
                onRemove={() => remove(item)}
              />
            ))
          : null}

        {showBacklog && waiting.length === 0 ? (
          <Text style={styles.emptyBacklog}>{t.backlogEmpty}</Text>
        ) : null}

        {/* ------------------------------------------------------- gears */}
        <Text style={[styles.sectionLabel, styles.trainingLabel]}>
          {t.gearsTitle}
          {inGear > 0 ? ` · ${formatMinutes(inGear)} today` : ''}
        </Text>

        {running ? (
          <Pressable
            onPress={() => router.push({ pathname: '/gear', params: { gear: running.gear } })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.gearRunning, pressed && styles.pressed]}
          >
            <Text style={styles.gearRunningLabel}>{GEARS[running.gear].label} is running</Text>
            <Text style={styles.gearRunningHint}>Tap to go back to it</Text>
          </Pressable>
        ) : (
          GEAR_ORDER.map((name) => {
            const gear = GEARS[name];
            const state = availability(name, gears, nowMs);
            return (
              <Pressable
                key={name}
                onPress={() => void shiftInto(name)}
                disabled={!state.ready}
                accessibilityRole="button"
                accessibilityLabel={`${gear.label}, ${gear.minutes} minutes`}
                style={({ pressed }) => [
                  styles.gear,
                  !state.ready && styles.gearLocked,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.gearHead}>
                  <Text style={styles.gearName}>
                    {plainMode ? gear.label : `${gear.kanji}  ${gear.label}`}
                  </Text>
                  <Text style={styles.gearMinutes}>{formatMinutes(gear.minutes)}</Text>
                </View>
                <Text style={styles.gearBlurb}>{state.ready ? gear.blurb : state.reason}</Text>
                {state.ready && gear.cost ? (
                  <Text style={styles.gearCost}>{gear.cost}</Text>
                ) : null}
              </Pressable>
            );
          })
        )}

        {/* ----------------------------------------------------- training */}
        <Text style={[styles.sectionLabel, styles.trainingLabel]}>{t.trainingTitle}</Text>

        <View style={styles.stats}>
          <Stat
            label={t.trainingThisWeek}
            value={`${training.sessionsThisWeek}/${training.weeklyTarget}`}
            tone={palette.crimson}
          />
          <Stat
            label={t.trainingConsistency}
            value={training.consistency === null ? null : `${training.consistency}%`}
            tone={palette.violet}
          />
          <Stat
            label={t.trainingSinceLast}
            value={since === null ? null : String(since)}
            tone={training.inGap ? palette.warn : palette.cyan}
          />
        </View>

        {training.inGap && since !== null ? (
          <View style={styles.gap}>
            <Text style={styles.gapLabel}>In a gap</Text>
            <Text style={styles.gapBody}>
              {since} days since the last session. Logging one now lands as a Return.
            </Text>
          </View>
        ) : null}

        {sessions.slice(0, 4).map((item) => (
          <View key={item.id} style={styles.session}>
            <View style={styles.sessionHead}>
              <Text style={styles.sessionKind}>{item.kind}</Text>
              <Text style={styles.sessionDay}>{item.day}</Text>
            </View>
            <Text style={styles.sessionMeta}>
              {[
                item.minutes ? `${item.minutes} min` : null,
                item.intensity ? `intensity ${item.intensity}/5` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {item.closedGap > 0 ? (
              <Text style={styles.sessionReturn}>{returnMessage(item.closedGap)}</Text>
            ) : null}
          </View>
        ))}

        <Pressable
          onPress={() => router.push('/session')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logSession, pressed && styles.pressed]}
        >
          <Text style={styles.logSessionText}>{t.trainingLog}</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function TaskRow({
  task,
  onToggle,
  onSecondary,
  secondaryLabel,
  onRemove,
  done,
}: {
  task: Task;
  onToggle: () => void;
  onSecondary?: () => void;
  secondaryLabel?: string;
  onRemove?: () => void;
  done?: boolean;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  // Only on the way to done. Undoing something is not an act of will.
  const [strikes, setStrikes] = useState(0);

  return (
    <Emission
      trigger={strikes}
      radius={radius.md}
      style={StyleSheet.flatten([styles.task, done && styles.taskDone])}
    >
      <Pressable
        onPress={() => {
          if (!done) setStrikes((n) => n + 1);
          onToggle();
        }}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!done }}
        accessibilityLabel={`${done ? 'Undo' : 'Done'}: ${task.title}`}
        hitSlop={8}
        style={({ pressed }) => [styles.box, done && styles.boxOn, pressed && styles.pressed]}
      >
        {done ? <Text style={styles.tick}>✓</Text> : null}
      </Pressable>

      <View style={styles.taskBody}>
        <Text style={[styles.taskTitle, done && styles.taskTitleDone]} numberOfLines={2}>
          {task.title}
        </Text>
        <Text style={styles.taskMinutes}>{formatMinutes(task.minutes)}</Text>
      </View>

      {onSecondary && secondaryLabel ? (
        <Pressable
          onPress={onSecondary}
          accessibilityRole="button"
          accessibilityLabel={`${secondaryLabel}: ${task.title}`}
          hitSlop={6}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove: ${task.title}`}
          hitSlop={6}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.removeText}>Drop</Text>
        </Pressable>
      ) : null}
    </Emission>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | null; tone: string }) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {value === null ? (
        <Text style={styles.statEmpty}>Not yet</Text>
      ) : (
        <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      )}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm, paddingBottom: TAB_BAR_CLEARANCE },

    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    sectionLabel: { ...type.label, color: c.inkFaint },
    carrying: {
      fontFamily: font.display,
      fontSize: 22,
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    message: { ...type.small, color: c.inkDim, lineHeight: 20, marginBottom: space.xs },
    messageWarn: { color: c.warn },

    /* ------------------------------------------------------------- a task */
    task: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
    },
    taskDone: { opacity: 0.45 },
    box: {
      width: 26,
      height: 26,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.inkFaint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxOn: { backgroundColor: c.cyan, borderColor: c.cyan },
    tick: { color: c.onAccent, fontSize: 15, fontFamily: font.displayBold },
    taskBody: { flex: 1, gap: 1 },
    taskTitle: { ...type.body, fontSize: 16, color: c.ink },
    taskTitleDone: { textDecorationLine: 'line-through', color: c.inkDim },
    taskMinutes: { ...type.mono, fontSize: 11, color: c.inkFaint },
    secondary: { paddingHorizontal: space.sm, paddingVertical: space.xs },
    secondaryText: { ...type.mono, fontSize: 11, color: c.cyan },
    removeText: { ...type.mono, fontSize: 11, color: c.inkFaint },

    /* ------------------------------------------------------------ capture */
    capture: {
      gap: space.sm,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      marginTop: space.sm,
    },
    input: {
      ...type.body,
      fontSize: 16,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      height: 46,
    },
    chips: { flexDirection: 'row', gap: space.xs },
    chip: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.pill,
      paddingVertical: space.xs,
      alignItems: 'center',
    },
    chipOn: { borderColor: c.cyan, backgroundColor: c.cyanSoft },
    chipText: { ...type.mono, fontSize: 11, color: c.inkDim },
    chipTextOn: { color: c.cyan },
    addRow: { flexDirection: 'row', gap: space.sm },
    addToday: {
      flex: 2,
      backgroundColor: c.cyan,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    addTodayText: { ...type.heading, color: c.onAccent },
    addLater: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    addLaterText: { ...type.heading, color: c.inkDim },
    addDisabled: { opacity: 0.4 },

    /* ------------------------------------------------------------ backlog */
    disclosure: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: space.md,
      marginTop: space.sm,
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
    },
    disclosureText: { ...type.label, color: c.inkFaint },
    chevron: { ...type.heading, color: c.inkFaint },
    emptyBacklog: {
      ...type.small,
      color: c.inkFaint,
      textAlign: 'center',
      padding: space.md,
    },

    /* ----------------------------------------------------------- training */
    trainingLabel: { marginTop: space.xl, marginBottom: space.xs },
    stats: { flexDirection: 'row', gap: space.sm },
    stat: {
      flex: 1,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.xs,
    },
    statLabel: { ...type.label, color: c.inkFaint, fontSize: 9 },
    statValue: {
      fontFamily: font.display,
      fontSize: 24,
      letterSpacing: -1,
      fontVariant: ['tabular-nums'],
    },
    statEmpty: { ...type.small, fontSize: 14, color: c.inkFaint, lineHeight: 28 },

    gap: {
      borderWidth: 1,
      borderColor: c.warn,
      backgroundColor: c.warnSoft,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    gapLabel: { ...type.label, color: c.warn },
    gapBody: { ...type.body, color: c.ink, lineHeight: 21 },

    session: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      gap: 2,
    },
    sessionHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    sessionKind: { ...type.heading, color: c.ink },
    sessionDay: { ...type.mono, color: c.inkFaint },
    sessionMeta: { ...type.small, fontSize: 13, color: c.inkDim },
    sessionReturn: { ...type.small, fontSize: 13, color: c.violet },

    logSession: {
      backgroundColor: c.crimson,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
      marginTop: space.sm,
    },
    logSessionText: { ...type.heading, color: c.onAccent },

    pressed: { opacity: 0.75 },

    gear: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    // Still legible, still readable — a locked gear explains itself, so it must
    // not be dimmed to the point where the reason cannot be read.
    gearLocked: { backgroundColor: c.bg, borderColor: c.lineSoft },
    gearHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    gearName: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    gearMinutes: { ...type.mono, color: c.inkDim },
    gearBlurb: { ...type.body, color: c.inkDim, lineHeight: 21 },
    gearCost: { ...type.mono, fontSize: 11, color: c.inkFaint },

    gearRunning: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cyan,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    gearRunningLabel: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    gearRunningHint: { ...type.mono, color: c.inkDim },
  });
