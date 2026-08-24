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
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { play } from '../../src/sound';
import { Emission } from '../../src/components/Emission';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { fireImpact } from '../../src/impact';
import { useStore } from '../../src/db/client';
import {
  addTask,
  allTasks,
  commitTask,
  deleteTask,
  lastDoneByRhythm,
  listRhythms,
  recentSessions,
  setTaskDone,
  strikeRhythm,
  unstrikeRhythm,
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
  WATCHES,
  WATCH_ORDER,
  byWatch,
  type Watch,
} from '../../src/domain/tasks';
import { addDays, todayKey } from '../../src/domain/date';
import {
  cadence,
  offerLine as rhythmOfferLine,
  offers,
  type Rhythm,
} from '../../src/domain/rhythm';
import { hardnessMessage, hardnessName } from '../../src/domain/armament';
import { Bolt } from '../../src/components/instruments/Bolt';
import { darkest } from '../../src/theme/palettes';
import { font, radius, space, type } from '../../src/theme/tokens';
import { offer, plate, press, row } from '../../src/theme/surfaces';
import { Fragment } from 'react';
import { SectionLabel } from '../../src/components/SectionLabel';
import type { Palette } from '../../src/theme/palettes';

/** Estimates you can pick without thinking. Typing a number is a decision too. */
const MINUTE_CHIPS = [5, 15, 30, 60, 120];

/**
 * 武装色 — Armament. The productivity tool: the list, the workouts, the day.
 *
 * Everything done under this tool hardens this lens — the owner's rule, and
 * the reason the hardness figure sits at the top of it. Today's load is first
 * because that is the only part you act on. The backlog is below and
 * deliberately quieter: a wall of undone things is what makes an ADHD brain
 * close the app, so it is somewhere you go on purpose rather than the first
 * thing you face.
 *
 * The Gears used to be a section here and are deliberately gone: Haki is will
 * and a Devil Fruit is ability, and they wait on `/gears` for the ability
 * page. Nothing on this screen spends; all of it builds.
 */
export default function ArmamentScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, training, load, hardness, refresh, plainMode, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(DEFAULT_TASK_MINUTES);
  const [watch, setWatch] = useState<Watch | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);
  const [showTomorrow, setShowTomorrow] = useState(false);
  const [rhythms, setRhythms] = useState<Rhythm[]>([]);
  const [lastDone, setLastDone] = useState<Map<number, string>>(new Map());

  const reload = useCallback(async () => {
    const [allT, recent, allR, done] = await Promise.all([
      allTasks(db),
      recentSessions(db, 8),
      listRhythms(db),
      lastDoneByRhythm(db),
    ]);
    setTasks(allT);
    setSessions(recent);
    setRhythms(allR);
    setLastDone(done);
    await refresh();
  }, [db, refresh]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  async function add(committedFor: string | null) {
    const name = title.trim();
    if (!name) return;
    void Haptics.selectionAsync();
    // The watch travels with the task even into the backlog: it says when in
    // a day the thing belongs, and that stays true whichever day it lands.
    await addTask(db, name, minutes, committedFor, { watch });
    setTitle('');
    setMinutes(DEFAULT_TASK_MINUTES);
    setWatch(null);
    await reload();
  }

  /**
   * The row says what it wants; this only writes it.
   *
   * It used to read `doneAt` and flip whatever it found, which is a
   * read-modify-write against a row the screen may not have reloaded yet —
   * two quick taps both saw "open" and both wrote "done". Taking the value
   * as an argument makes the tap and the write agree by construction.
   */
  async function toggleDone(taskItem: Task, next: boolean) {
    await setTaskDone(db, taskItem.id, next);
    await reload();
  }

  async function moveTo(taskItem: Task, day: string | null) {
    await commitTask(db, taskItem.id, day);
    await reload();
  }

  async function takeRhythm(r: Rhythm, next: boolean) {
    if (next) await strikeRhythm(db, r, todayKey());
    else await unstrikeRhythm(db, r.key, todayKey());
    await reload();
  }

  async function remove(taskItem: Task) {
    await deleteTask(db, taskItem.id);
    await reload();
  }

  const day = todayKey();
  /** Whether today has already banked into the hardness window. */
  const todayIn =
    tasks.some((item) => item.committedFor === day && item.doneAt !== null) ||
    sessions.some((item) => item.day === day);
  /**
   * A rhythm already taken today is a real struck task in `load.doneToday`,
   * so it must not also appear as an offer — hence the keys handed to
   * `offers`. The remaining offers are rendered as rows that exist only on
   * screen; nothing is written until one is tapped.
   */
  const struckRhythmKeys = new Set(
    tasks
      .filter((item) => item.rhythmKey !== null && item.committedFor === day)
      .map((item) => item.rhythmKey as number),
  );
  const standing = offers(rhythms, day, lastDone, struckRhythmKeys);
  const standingMinutes = standing.reduce((sum, r) => sum + r.minutes, 0);

  /**
   * The cadence line for a struck task, or nothing.
   *
   * A retired rhythm keeps the tasks it produced, and one whose row is gone
   * entirely is still a perfectly good record of a day — so a task whose
   * rhythm cannot be found simply reads as an ordinary task rather than
   * throwing or inventing a cadence.
   */
  function cadenceOf(key: number | null): string | undefined {
    if (key === null) return undefined;
    const found = rhythms.find((r) => r.key === key);
    return found ? cadence(found) : undefined;
  }

  const today = [
    ...load.open.map((item) => ({ item, done: false })),
    ...load.doneToday.map((item) => ({ item, done: true })),
  ];
  const tomorrow = addDays(day, 1);
  const tomorrowTasks = tasks.filter(
    (item) => item.committedFor === tomorrow && item.doneAt === null,
  );
  const waiting = backlog(tasks);
  const old = stale(tasks, todayKey());
  const message = loadMessage(load);
  const since = training.daysSinceLast;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, pad]}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading title={t.trainingTitle} trailing={plainMode ? undefined : '武装色'} />

        {/*
          The lens, read over four weeks — from everything done under this
          tool, tasks and workouts alike. It used to be sessions-per-week,
          which made Armament look like a gym tracker and gave a figure with
          about two useful values to somebody who trains once a day.
        */}
        <View style={styles.hardnessCard}>
          <View style={styles.head}>
            <Text style={styles.sectionLabel}>{t.hardnessLabel}</Text>
            <Text style={styles.carrying}>
              {hardness.value === null ? hardnessName(null) : `${hardness.value}%`}
            </Text>
          </View>
          {/* The gauge: one bolt, filling across the frame as the window fills
            with used days. The faint channel is the storm's path; the strike
            has travelled as far as the figure above says. Plain mode keeps
            the words and loses the weather. */}
          {plainMode ? null : (
            <View
              style={styles.bolt}
              accessibilityRole="image"
              accessibilityLabel={`Hardness, ${hardnessName(hardness.value)}`}
            >
              {/* A perceptual floor on the lit length: day one is 1/28 ≈ 4%,
                which is a sliver so thin the whole gauge reads as unlit —
                after five struck tasks, which is exactly the moment it must
                not. The label above still tells the true number; the floor
                only guarantees that "lit at all" is visible at arm's
                length. */}
              <Bolt
                track={palette.lineSoft}
                core={darkest(palette)}
                halo={palette.crimson}
                fill={hardness.value === null ? 0 : Math.max(0.07, hardness.value / 100)}
              />
            </View>
          )}
          <Text style={styles.message}>
            {hardnessMessage(hardness.value, hardness.days, todayIn)}
          </Text>
        </View>

        {/* ---------------------------------------------------------- today */}
        <View style={styles.head}>
          <Pressable
            onPress={() => router.push('/rhythms')}
            accessibilityRole="button"
            accessibilityLabel={t.rhythmManage}
            style={({ pressed }) => [styles.rhythmLink, pressed && styles.pressed]}
          >
            <Text style={styles.sectionLabel}>{t.todayLoad}</Text>
            <Text style={styles.rhythmLinkText}>{t.rhythmManage} ›</Text>
          </Pressable>
          {/* Standing offers count toward the figure. They are minutes the day
              genuinely holds — a reader looking at 45 minutes of rhythm rows
              and a total of 0m is being told something untrue. The capacity
              *verdict* below still reads committed work only, so a heavy
              rhythm day never triggers an over-capacity warning on its own. */}
          {/* Remaining minutes while anything stands; once the list is clear
              the figure flips to what was carried — "0m" over a column of
              struck tasks reads as the day not counting. */}
          <Text style={[styles.carrying, load.read === 'over' && { color: palette.warn }]}>
            {load.openMinutes + standingMinutes > 0
              ? formatMinutes(load.openMinutes + standingMinutes)
              : load.doneMinutes > 0
                ? `${formatMinutes(load.doneMinutes)} struck`
                : formatMinutes(0)}
          </Text>
        </View>

        {/* An empty committed list is not an empty day when the rhythm has
            something standing on it — saying "nothing pulled in" directly
            above two offers is the kind of small lie that makes an app feel
            careless. */}
        {load.open.length === 0 && load.doneToday.length === 0 && standing.length > 0 ? (
          <Text style={styles.message}>{rhythmOfferLine(standing.length, plainMode)}</Text>
        ) : message ? (
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
        {/*
          The rhythm's standing offers, above the one-offs. These rows are not
          in the database and will not be unless one is tapped — a day you let
          an offer pass leaves nothing behind to go red tomorrow. Taking one
          writes a struck task like any other, which is why it can share
          TaskRow and get the same emission, sound and impact frame.

          The synthetic id is negative so it can never collide with a real
          task's, and it is derived from the rhythm's key so the row keeps its
          identity across a reload.
        */}
        {standing.map((r) => (
          <TaskRow
            key={`rhythm-${r.key}`}
            standing
            task={{
              id: -r.key,
              title: r.title,
              minutes: r.minutes,
              committedFor: day,
              doneAt: null,
              rhythmKey: r.key,
              islandKey: null,
              watch: null,
              createdAt: r.key,
            }}
            note={cadence(r)}
            onToggle={(next) => void takeRhythm(r, next)}
          />
        ))}

        {/* Grouped by watch, headings materialising only once a task carries
            one — an unplaced day renders exactly the flat list it always did.
            A strike never changes a task's watch, so a row keeps its group
            and its element identity across the move; the emission survives. */}
        {byWatch(today.map(({ item, done }) => ({ watch: item.watch, item, done }))).map(
          (group) => (
            <Fragment key={group.watch ?? 'any'}>
              {group.watch !== null ? (
                <SectionLabel
                  label={plainMode ? WATCHES[group.watch].short : WATCHES[group.watch].label}
                  trailing={plainMode ? undefined : WATCHES[group.watch].kanji}
                />
              ) : today.some(({ item }) => item.watch !== null) ? (
                <SectionLabel label="Any time" />
              ) : null}
              {group.items.map(({ item, done }) => (
                <TaskRow
                  // A struck rhythm keeps the key its offer row had, so
                  // striking one is a re-render rather than an unmount — the
                  // same swallowed-emission bug the one-list comment below
                  // describes, which the rhythm rows quietly reintroduced by
                  // changing key mid-strike.
                  key={item.rhythmKey !== null ? `rhythm-${item.rhythmKey}` : item.id}
                  task={item}
                  done={done}
                  note={cadenceOf(item.rhythmKey)}
                  onToggle={(next) =>
                    item.rhythmKey === null
                      ? toggleDone(item, next)
                      : void unstrikeRhythm(db, item.rhythmKey, day).then(reload)
                  }
                  actions={
                    done || item.rhythmKey !== null
                      ? undefined
                      : [
                          { label: t.addToTomorrow, run: () => void moveTo(item, tomorrow) },
                          { label: t.addToLater, run: () => void moveTo(item, null) },
                        ]
                  }
                />
              ))}
            </Fragment>
          ),
        )}

        {/* ------------------------------------------------------ capture */}
        <View style={styles.capture}>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t.taskPlaceholder}
            placeholderTextColor={palette.inkFaint}
            style={styles.input}
            returnKeyType="done"
            onSubmitEditing={() => void add(day)}
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

          {/* The watch is optional and a second tap clears it: an unplaced
              task is normal, not incomplete. */}
          <View style={styles.chips}>
            {WATCH_ORDER.map((w) => (
              <Pressable
                key={w}
                onPress={() => setWatch(watch === w ? null : w)}
                accessibilityRole="button"
                accessibilityState={{ selected: watch === w }}
                accessibilityLabel={WATCHES[w].label}
                style={({ pressed }) => [
                  styles.chip,
                  watch === w && styles.watchOn,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.chipText, watch === w && styles.watchTextOn]}>
                  {WATCHES[w].short}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.addRow}>
            <Pressable
              onPress={() => void add(day)}
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
              onPress={() => void add(tomorrow)}
              disabled={!title.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.addLater,
                !title.trim() && styles.addDisabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.addLaterText}>{t.addToTomorrow}</Text>
            </Pressable>
            <Pressable
              onPress={() => void add(null)}
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
                onToggle={(next) => toggleDone(item, next)}
                actions={[{ label: 'Today', run: () => void moveTo(item, todayKey()) }]}
                onRemove={() => remove(item)}
              />
            ))
          : null}

        {showBacklog && waiting.length === 0 ? (
          <Text style={styles.emptyBacklog}>{t.backlogEmpty}</Text>
        ) : null}

        {/* ----------------------------------------------------- tomorrow */}
        {/* Only present once something is actually placed there: an empty
            "tomorrow" standing open every day is a nag about planning. At
            the day boundary these simply become today's list — nothing
            moves, the key under them changes meaning. */}
        {tomorrowTasks.length > 0 ? (
          <Pressable
            onPress={() => setShowTomorrow((v) => !v)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.disclosure, pressed && styles.pressed]}
          >
            <Text style={styles.disclosureText}>
              {t.tomorrowLabel} · {tomorrowTasks.length}
            </Text>
            <Text style={styles.chevron}>{showTomorrow ? '−' : '+'}</Text>
          </Pressable>
        ) : null}

        {showTomorrow
          ? tomorrowTasks.map((item) => (
              <TaskRow
                key={item.id}
                task={item}
                onToggle={(next) => toggleDone(item, next)}
                actions={[{ label: 'Today', run: () => void moveTo(item, day) }]}
                onRemove={() => remove(item)}
              />
            ))
          : null}

        {/* ----------------------------------------------------- training */}
        {/* The gym, under its own name. One half of the figure at the top of
            this screen; the list above is the other. */}
        <SectionLabel label={t.trainingSection} style={styles.trainingLabel} />

        <View style={styles.stats}>
          <Stat
            label={t.trainingThisWeek}
            value={`${training.sessionsThisWeek}/${training.weeklyTarget}`}
            tone={palette.crimson}
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
  actions,
  onRemove,
  done,
  note,
  standing,
}: {
  task: Task;
  onToggle: (next: boolean) => void;
  /** Quiet moves offered on the row's right edge — Tomorrow, Later, Today. */
  actions?: { label: string; run: () => void }[];
  onRemove?: () => void;
  done?: boolean;
  /** True for a rhythm offer: a row that does not exist until it is taken. */
  standing?: boolean;
  /** A rhythm's cadence, shown beside the estimate. */
  note?: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  // Only on the way to done. Undoing something is not an act of will.
  const [strikes, setStrikes] = useState(0);

  /**
   * What the box shows *now*, ahead of the database.
   *
   * Striking a task writes one row and then reloads eleven queries, every one
   * of them going through the single synchronous channel expo-sqlite has on
   * the web. Until all of that lands, the tick is not drawn — so the box read
   * as broken and got tapped again, and a second tap on a checkbox is a
   * perfectly good "undo", so it landed as one. Three taps to check a box,
   * and not one of them missed.
   *
   * The box answers the finger, not the write. `pending` is what was just
   * asked for, and it is dropped the moment the stored value agrees.
   */
  const [pending, setPending] = useState<boolean | null>(null);
  const checked = pending ?? !!done;

  useEffect(() => {
    if (pending !== null && pending === !!done) setPending(null);
  }, [pending, done]);

  function strike() {
    const next = !checked;
    setPending(next);
    void Haptics.selectionAsync();
    // Only on the way to done — an undo should not sound like an achievement.
    if (next) {
      play('armamentStrike');
      setStrikes((n) => n + 1);
      fireImpact();
    }
    onToggle(next);
  }

  return (
    <Emission
      trigger={strikes}
      radius={radius.md}
      style={StyleSheet.flatten([
        styles.task,
        standing && !checked && styles.taskOffer,
        checked && styles.taskDone,
      ])}
    >
      {/*
        The whole row is the target, not the 26pt box sitting in it. Even with
        hit slop that box was under the 44pt floor, and a checklist you have to
        aim at is a checklist that gets abandoned.
      */}
      <Pressable
        onPress={strike}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={`${checked ? 'Undo' : 'Done'}: ${task.title}`}
        style={({ pressed }) => [styles.strike, pressed && styles.pressed]}
      >
        <View style={[styles.box, checked && styles.boxOn]}>
          {checked ? <Text style={styles.tick}>✓</Text> : null}
        </View>

        <View style={styles.taskBody}>
          <Text style={[styles.taskTitle, checked && styles.taskTitleDone]} numberOfLines={2}>
            {task.title}
          </Text>
          <Text style={styles.taskMinutes}>
            {formatMinutes(task.minutes)}
            {note ? ` · ${note}` : ''}
          </Text>
        </View>
      </Pressable>

      {(actions ?? []).map((action) => (
        <Pressable
          key={action.label}
          onPress={action.run}
          accessibilityRole="button"
          accessibilityLabel={`${action.label}: ${task.title}`}
          style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
        >
          <Text style={styles.secondaryText}>{action.label}</Text>
        </Pressable>
      ))}

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          accessibilityLabel={`Remove: ${task.title}`}
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
    content: { padding: space.lg, gap: space.sm },

    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    // The lens's own readout, raised: the one plate on this screen.
    hardnessCard: { ...plate(c), padding: space.lg, gap: space.sm, marginBottom: space.xs },
    sectionLabel: { ...type.label, color: c.inkFaint },
    // The way into the workshop, sitting on the label rather than as a button
    // of its own — the day's work is the subject of this section, not this.
    rhythmLink: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, minHeight: 44 },
    rhythmLinkText: { ...type.mono, fontSize: 11, color: c.crimson },
    // Full-bleed within the padding; the drawing keeps its own aspect.
    bolt: { width: '100%', aspectRatio: 200 / 26, marginVertical: -2 },
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
      ...row(c),
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    // A standing offer is dashed and unfilled: it is not in the database and
    // will not be unless taken. The moment it is checked it renders solid,
    // because at that moment it becomes a real struck task.
    taskOffer: { ...offer(c), backgroundColor: 'transparent' },
    taskDone: { opacity: 0.45 },
    // The padding lives on the press target rather than the card, so the
    // whole face of the row is tappable rather than a box inside it.
    strike: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 56,
      paddingVertical: space.md,
      paddingLeft: space.md,
      paddingRight: space.sm,
    },
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
    secondary: {
      justifyContent: 'center',
      paddingLeft: space.sm,
      paddingRight: space.md,
    },
    secondaryText: { ...type.mono, fontSize: 11, color: c.cyan },
    removeText: { ...type.mono, fontSize: 11, color: c.inkFaint },

    /* ------------------------------------------------------------ capture */
    capture: {
      ...row(c),
      gap: space.sm,
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
    watchOn: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    watchTextOn: { color: c.crimson },
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
    addTodayText: { ...type.heading, fontSize: 15, color: c.onAccent },
    addLater: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    addLaterText: { ...type.heading, fontSize: 13, color: c.inkDim },
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
      ...row(c),
      flex: 1,
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
      ...row(c),
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

    pressed: { ...press },
  });
