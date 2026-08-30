import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { usableBottom } from '../../src/theme/viewport';
import { useSingleFlight } from '../../src/state/useSingleFlight';
import { fireImpact } from '../../src/impact';
import { useStore } from '../../src/db/client';
import {
  addTask,
  allTasks,
  commitTask,
  deleteSession,
  deleteTask,
  lastDoneByRhythm,
  listRhythms,
  moveTask,
  recentSessions,
  setTaskDone,
  strikeToday,
  strikeRhythm,
  unstrikeRhythm,
} from '../../src/db/repo';
import type { TrainingSessionRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { underCrew } from '../../src/theme/palettes';
import { Steel } from '../../src/components/instruments/Steel';
import { Crackle } from '../../src/components/instruments/Crackle';
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
import { atSea, atSeaLabel, type AtSea } from '../../src/domain/atSea';
import { AtSeaRow } from '../../src/components/AtSeaRow';
import {
  DUE_CHIPS,
  PRIORITY_LABEL,
  dueFromChip,
  dueLine,
  heatOf,
  isWarm,
  parseDay,
  daysUntil,
} from '../../src/domain/pressing';
import { addDays, shortDay, todayKey } from '../../src/domain/date';
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
import { lit, offer, plate, press, row } from '../../src/theme/surfaces';
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
  const { t, training, load, hardness, refresh, plainMode, palette, hardening, charge, crew } =
    useHaki();
  // 武装色 through the crew's eyes: crimson under Luffy, amethyst under Zoro.
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const pad = useTabInsets();
  const insets = useSafeAreaInsets();
  // A lens's material is a performance: plain mode gets none, and paper
  // catches nothing — a plate on parchment is parchment.
  const material = !plainMode && hardening > 0;

  const [tasks, setTasks] = useState<Task[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);
  const [title, setTitle] = useState('');
  const [minutes, setMinutes] = useState(DEFAULT_TASK_MINUTES);
  const [watch, setWatch] = useState<Watch | null>(null);
  const [priority, setPriority] = useState(false);
  const [dueBy, setDueBy] = useState<string | null>(null);
  const [dueText, setDueText] = useState('');
  const [capturing, setCapturing] = useState(false);
  const [showMore, setShowMore] = useState(false);
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

  const committing = useSingleFlight();
  async function add(committedFor: string | null) {
    const name = title.trim();
    if (!name) return;
    // Read the typed date before the fields clear — the clearing happens
    // inside the flight, in this same frame, and reading after it would
    // silently drop a date somebody had just typed.
    const chosenDue = dueBy ?? parseDay(dueText, day);
    await committing(async () => {
      // The field empties in the same frame as the tap — the emptying is
      // the acknowledgement — and the flight guard holds off a second tap
      // while the write runs down the single sqlite channel.
      setCapturing(false);
      setShowMore(false);
      setTitle('');
      setMinutes(DEFAULT_TASK_MINUTES);
      setWatch(null);
      setPriority(false);
      setDueBy(null);
      setDueText('');
      void Haptics.selectionAsync();
      // The watch travels with the task even into the backlog: it says when
      // in a day the thing belongs, and that stays true whichever day it
      // lands.
      await addTask(db, name, minutes, committedFor, { watch, priority, dueBy: chosenDue });
      await reload();
    });
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
    // The row moves lists in the same frame as the tap; the reload then
    // agrees with what the screen already showed. Same shape as TaskRow's
    // checkbox, applied to the list the row sits in.
    setTasks((prev) =>
      prev.map((item) => (item.id === taskItem.id ? { ...item, committedFor: day } : item)),
    );
    await commitTask(db, taskItem.id, day);
    await reload();
  }

  /**
   * Strike something still at sea. One tap, and it lands on today.
   *
   * The row leaves in the tap's own frame — `atSea` is derived from `tasks`,
   * so marking the local copy done is what takes it off the screen before the
   * write comes back down the sqlite channel.
   */
  async function strikeOld(entry: AtSea) {
    const stamp = Date.now();
    setTasks((prev) =>
      prev.map((item) =>
        item.id === entry.task.id ? { ...item, committedFor: day, doneAt: stamp } : item,
      ),
    );
    await strikeToday(db, entry.task.id, day);
    await reload();
  }

  /** Move it, with the line that was written about it. */
  async function moveOld(entry: AtSea, to: 'today' | null, reason: string) {
    const landing = to === 'today' ? day : null;
    setTasks((prev) =>
      prev.map((item) =>
        item.id === entry.task.id ? { ...item, committedFor: landing } : item,
      ),
    );
    void Haptics.selectionAsync();
    await moveTask(db, { id: entry.task.id, committedFor: entry.from }, landing, reason, day);
    await reload();
  }

  async function takeRhythm(r: Rhythm, next: boolean) {
    if (next) await strikeRhythm(db, r, todayKey());
    else await unstrikeRhythm(db, r.key, todayKey());
    await reload();
  }

  async function remove(taskItem: Task) {
    setTasks((prev) => prev.filter((item) => item.id !== taskItem.id));
    await deleteTask(db, taskItem.id);
    await reload();
  }

  /**
   * Take a logged session back off the record.
   *
   * Confirmed, because unlike a task this cannot be undone by re-ticking a
   * box, and unlike a task it may be carrying a Return. Optimistic once
   * confirmed: the row leaves on the tap, not on the write.
   */
  async function dropSession(id: number, kind: string) {
    const go = async () => {
      setSessions((prev) => prev.filter((item) => item.id !== id));
      await deleteSession(db, id);
      await reload();
      await refresh();
    };

    if (Platform.OS === 'web') {
      // eslint-disable-next-line no-alert
      if (typeof window !== 'undefined' && !window.confirm(`Remove the ${kind} session?`))
        return;
      await go();
      return;
    }
    Alert.alert(`Remove the ${kind} session?`, 'The day keeps everything else it earned.', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void go() },
    ]);
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
  /**
   * Committed to a day that has passed, and not done.
   *
   * These appeared nowhere at all before — `todaysLoad` wants today and
   * `backlog` wants no day, so anything committed to yesterday and left
   * undone fell between them and was orphaned. It sits above the day now,
   * because the owner's whole ask was to know what did not get done.
   */
  const adrift = atSea(tasks, day);
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
        <PageHeading
          title={t.trainingTitle}
          trailing={plainMode ? undefined : '武装色'}
          tint={lens.crimson}
        />

        {/*
          The lens, read over four weeks — from everything done under this
          tool, tasks and workouts alike. It used to be sessions-per-week,
          which made Armament look like a gym tracker and gave a figure with
          about two useful values to somebody who trains once a day.
        */}
        {/* 武装色's own light. The lens that measures the day is the thing
            the day lights up. */}
        <View
          style={[
            styles.hardnessCard,
            material && styles.hardnessSteel,
            lit(lens.crimson, plainMode ? 0 : hardening, charge),
          ]}
        >
          {/* 武装色 coats. The plate is black metal and the light on it comes
              up with the hardness — the concept doc's armour you can see,
              and deliberately not a bar: you cannot read the figure off how
              bright a surface is. */}
          {material ? (
            <Steel
              face={palette.steelFace}
              deep={palette.steelDeep}
              sheen={palette.steelSheen}
              hardness={(hardness.value ?? 0) / 100}
            />
          ) : null}
          {/* Over the material, never under it — the discharge sits on the
              coating, not inside it. Past black the palette has nowhere left
              to go, so the day keeps hardening here instead: the plate's edge
              lights and the arcs settle onto it. See `domain/hardening.ts`. */}
          <Crackle charge={charge} tint={lens.crimson} seed={7} />
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
                halo={lens.crimson}
                fill={hardness.value === null ? 0 : Math.max(0.07, hardness.value / 100)}
              />
            </View>
          )}
          <Text style={styles.message}>
            {hardnessMessage(hardness.value, hardness.days, todayIn, plainMode)}
          </Text>
        </View>

        {/* ---------------------------------------------------- still at sea */}
        {/*
          What did not get done, above the day rather than buried under it.
          Nothing here is coloured red, ranked, or totalled — the days are
          stated the way an island at sea states them. Doing one is a tap;
          moving one costs a written line, which is the Log Pose's asymmetry
          at the scale of a single task.
        */}
        {adrift.length > 0 ? (
          <>
            <SectionLabel
              label={atSeaLabel(adrift.length, plainMode)}
              trailing={plainMode ? undefined : '航海中'}
            />
            {adrift.map((entry) => (
              <AtSeaRow
                key={entry.task.id}
                item={entry}
                tint={lens.crimson}
                onStrike={() => void strikeOld(entry)}
                onMove={(to, reason) => void moveOld(entry, to, reason)}
              />
            ))}
          </>
        ) : null}

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
              // A rhythm's offer is never priority and never dated: it comes
              // round on its own and that is the whole model.
              priority: false,
              dueBy: null,
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

        {/* A button, and the form behind it.

            The capture card used to stand permanently open with six rows of
            controls in it — a title field, five duration chips, three watch
            chips, a flag and four due chips, a date field, and three commit
            buttons — all of it on screen whether or not you were writing
            anything down. Most strikes are a sentence and a tap, so the
            sentence and the tap are what the sheet opens on, and everything
            that qualifies a task sits behind one more. */}
        <Pressable
          onPress={() => setCapturing(true)}
          accessibilityRole="button"
          accessibilityLabel={t.newStrike}
          style={({ pressed }) => [styles.newStrike, pressed && styles.pressed]}
        >
          <Text style={styles.newStrikeText}>+ {t.newStrike}</Text>
        </Pressable>

        <Modal
          visible={capturing}
          transparent
          animationType="slide"
          onRequestClose={() => setCapturing(false)}
        >
          <Pressable
            style={styles.scrim}
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setCapturing(false)}
          />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.sheetDock}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetHead}>
                <Text style={styles.sheetTitle}>{t.newStrike}</Text>
                <Pressable
                  onPress={() => setCapturing(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={({ pressed }) => [styles.sheetClose, pressed && styles.pressed]}
                >
                  <Text style={styles.sheetCloseText}>Cancel</Text>
                </Pressable>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={styles.sheetBody}
                // The sheet floats over the tab bar rather than above it, so
                // it takes the raw home-indicator inset rather than the tab
                // clearance — `useTabInsets` would leave a band of nothing.
                contentContainerStyle={{
                  paddingBottom: usableBottom(insets.bottom) + space.lg,
                  gap: space.sm,
                }}
              >
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

                {/* One more tap for anything that qualifies the strike. The
              ordinary task has no watch, no flag and no date, and it must
              stay the cheapest thing in the app to write down. */}
                <Pressable
                  onPress={() => setShowMore((v) => !v)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: showMore }}
                  accessibilityLabel={t.strikeDetails}
                  style={({ pressed }) => [styles.moreRow, pressed && styles.pressed]}
                >
                  <Text style={styles.moreText}>
                    {showMore ? '−' : '+'} {t.strikeDetails}
                  </Text>
                </Pressable>

                {showMore ? (
                  <>
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

                    {/* The flag and the date. Both optional, both a second tap from
              gone — a task with neither is the ordinary case and must stay
              the cheapest thing to write down. */}
                    <View style={styles.chips}>
                      <Pressable
                        onPress={() => setPriority((on) => !on)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: priority }}
                        accessibilityLabel={PRIORITY_LABEL}
                        style={({ pressed }) => [
                          styles.chip,
                          priority && styles.flagOn,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.chipText, priority && styles.flagTextOn]}>
                          {PRIORITY_LABEL}
                        </Text>
                      </Pressable>
                      {DUE_CHIPS.map((c) => {
                        const at = dueFromChip(c.days, day);
                        const on = dueBy === at;
                        return (
                          <Pressable
                            key={c.label}
                            onPress={() => {
                              setDueBy(on ? null : at);
                              setDueText('');
                            }}
                            accessibilityRole="button"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={`Due ${plainMode ? c.plain : c.label}`}
                            style={({ pressed }) => [
                              styles.chip,
                              on && styles.flagOn,
                              pressed && styles.pressed,
                            ]}
                          >
                            <Text style={[styles.chipText, on && styles.flagTextOn]}>
                              {plainMode ? c.plain : c.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* Anything the chips do not cover. Reads 15, 9/15, sep 15 — and
              refuses rather than guessing, because a date the app got wrong
              is worse than one it declined: you would not check it. */}
                    <View style={styles.dueRow}>
                      <TextInput
                        value={dueText}
                        onChangeText={(text) => {
                          setDueText(text);
                          setDueBy(null);
                        }}
                        placeholder={
                          plainMode ? 'Or a date — 15, 9/15, sep 15' : 'Or a date to make'
                        }
                        placeholderTextColor={palette.inkFaint}
                        style={styles.dueInput}
                        returnKeyType="done"
                        accessibilityLabel="Due date"
                      />
                      <Text style={styles.dueEcho}>
                        {dueBy !== null
                          ? (dueLine(dueBy, day) ?? '')
                          : dueText.trim().length === 0
                            ? ''
                            : (dueLine(parseDay(dueText, day), day) ?? 'Not a date')}
                      </Text>
                    </View>
                  </>
                ) : null}

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
                    <Text
                      style={[styles.addTodayText, !title.trim() && styles.addDisabledText]}
                    >
                      {t.addToToday}
                    </Text>
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
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ------------------------------------------------------ backlog */}
        {waiting.length > 0 ? (
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
        ) : null}

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
        {/* The gym, under its own name, in about a fifth of the room it used
            to take. It was two stat cards, a gap card, and four session cards
            each carrying a heading, a day, a Remove and two more lines — a
            third of this screen to say "I trained on Tuesday". It tracks one
            thing and it now looks like it tracks one thing.

            The two figures are one line. A gap colours the second of them
            rather than opening a card to explain itself. */}
        <SectionLabel label={t.trainingSection} style={styles.trainingLabel} />

        <View style={styles.trainRow}>
          <Text style={styles.trainWeek}>
            {training.sessionsThisWeek === 0
              ? t.trainingPlanned(training.weeklyTarget)
              : `${training.sessionsThisWeek}/${training.weeklyTarget} this week`}
          </Text>
          <Text
            style={[styles.trainSince, training.inGap && { color: palette.warn }]}
            numberOfLines={1}
          >
            {since === null
              ? t.trainingNever
              : since === 0
                ? t.trainingToday
                : `${since} days since`}
          </Text>
        </View>

        {sessions.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.sessionRow}>
            <View style={styles.sessionBody}>
              <Text style={styles.sessionKind} numberOfLines={1}>
                {item.kind}
              </Text>
              <Text style={styles.sessionMeta} numberOfLines={1}>
                {[
                  shortDay(item.day),
                  item.minutes ? `${item.minutes} min` : null,
                  item.intensity ? `${item.intensity}/5` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {/* The Return keeps the signature violet under both crews: it is
                  not a lens's light, and the lens palette would turn it jade. */}
              {item.closedGap > 0 ? (
                <Text style={[styles.sessionReturn, { color: palette.violet }]}>
                  {returnMessage(item.closedGap)}
                </Text>
              ) : null}
            </View>
            {/* A session logged twice by a slipped thumb is not a record of
                anything. This removes the row and nothing else — the day it
                happened on keeps every other mark it earned. */}
            <Pressable
              onPress={() => void dropSession(item.id, item.kind)}
              accessibilityRole="button"
              accessibilityLabel={`Remove the ${item.kind} session from ${shortDay(item.day)}`}
              style={({ pressed }) => [styles.sessionDrop, pressed && styles.pressed]}
            >
              <Text style={styles.sessionDropText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={() => router.push('/session')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.logSession, pressed && styles.pressed]}
        >
          <Text style={styles.logSessionText}>{t.trainingLog}</Text>
          <Text style={styles.logSessionGo}>+</Text>
        </Pressable>

        {/* 断ち — the things you are trying not to do. Under 武装色 because
            armament is the tool for what you do, and holding an urge is the
            hardest thing it has to hold. A quiet line rather than a card: it
            is a place you go when an urge lands, not a thing to be reminded of
            all day. See app/breaklist.tsx. */}
        <Pressable
          onPress={() => router.push('/breaklist')}
          accessibilityRole="button"
          accessibilityLabel={t.breakTitle}
          style={({ pressed }) => [styles.breakDoor, pressed && styles.pressed]}
        >
          <View style={styles.breakDoorText}>
            <Text style={styles.breakDoorName}>
              {plainMode ? t.breakTitle : `断ち  ${t.breakDoor}`}
            </Text>
            <Text style={styles.breakDoorLine}>{t.breakDoorLine}</Text>
          </View>
          <Text style={styles.breakDoorGo}>Open</Text>
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
  const { palette, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
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

  const today = todayKey();
  const days = daysUntil(task.dueBy, today);
  const heat = heatOf(days);
  const warm = isWarm(heat, task.priority);
  const due = dueLine(task.dueBy, today);
  // Warm covers "look at this"; hot is the narrower case where the date is
  // today or behind, which is the only thing that earns the colour outright.
  const hot = heat === 'past' || heat === 'today';

  return (
    <Emission
      trigger={strikes}
      radius={radius.md}
      style={StyleSheet.flatten([
        styles.task,
        standing && !checked && styles.taskOffer,
        // Loud by weight and edge, never by alarm. `warn` is the app's one
        // warmth — crimson would say something has gone wrong, and a date
        // arriving is not a breach. Same call the Calm Belt made.
        warm && !checked && styles.taskWarm,
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
          <Text
            style={[
              styles.taskTitle,
              warm && !checked && styles.taskTitleWarm,
              checked && styles.taskTitleDone,
            ]}
            numberOfLines={2}
          >
            {task.title}
          </Text>
          {/* One line, not three. The flag and the date ride with the
              estimate rather than stacking under it — a row with an action
              beside it is already narrow, and three stacked lines turned
              every dated task into a paragraph. */}
          <Text style={styles.taskMinutes}>
            {formatMinutes(task.minutes)}
            {note ? ` · ${note}` : ''}
            {task.priority && !checked ? (
              <Text style={styles.markFlag}> · {PRIORITY_LABEL}</Text>
            ) : null}
            {due && !checked ? (
              <Text style={hot ? styles.markHot : styles.markCool}> · {due}</Text>
            ) : null}
          </Text>
        </View>
      </Pressable>

      {/* Stacked, not side by side. At the raised type scale two words on
          one line took enough width to wrap every task title to two lines —
          the same shape the at-sea rows already use, for the same reason. */}
      {(actions ?? []).length > 0 ? (
        <View style={styles.actions}>
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
        </View>
      ) : null}

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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },

    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    // The lens's own readout, raised: the one plate on this screen.
    hardnessCard: { ...plate(c), padding: space.lg, gap: space.sm, marginBottom: space.xs },
    // On steel the plate supplies nothing of its own, and the drawing is
    // clipped to the card's corners.
    hardnessSteel: {
      backgroundColor: c.steelFace,
      borderColor: c.steelSheen,
      borderTopColor: c.steelSheen,
      overflow: 'hidden',
    },
    sectionLabel: { ...type.label, color: c.inkFaint },
    // The way into the workshop, sitting on the label rather than as a button
    // of its own — the day's work is the subject of this section, not this.
    rhythmLink: { flexDirection: 'row', alignItems: 'baseline', gap: space.md, minHeight: 44 },
    rhythmLinkText: { ...type.mono, fontSize: 13, color: c.crimson },
    // Full-bleed within the padding; the drawing keeps its own aspect.
    bolt: { width: '100%', aspectRatio: 200 / 26, marginVertical: -2 },
    carrying: {
      fontFamily: font.display,
      fontSize: 24,
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
    flagOn: { borderColor: c.warn, backgroundColor: c.surface2 },
    flagTextOn: { color: c.warn },
    dueRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    dueInput: {
      ...type.body,
      fontSize: 16,
      flex: 1,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      minHeight: 44,
    },
    // Says back what it read. A date field that silently accepts nonsense is
    // how a deadline ends up unset without anybody noticing.
    dueEcho: { ...type.mono, fontSize: 12, color: c.inkDim, minWidth: 76 },
    taskOffer: { ...offer(c), backgroundColor: 'transparent' },
    // A bar down the leading edge rather than a tinted card: the row still
    // reads as one of the list, and the edge is what your eye catches
    // scanning down it.
    taskWarm: { borderLeftWidth: 3, borderLeftColor: c.warn },
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
    // Striking is 武装色's act, so the box that fills carries its
    // colour — crimson under Luffy, the amethyst coating under Zoro.
    boxOn: { backgroundColor: c.crimson, borderColor: c.crimson },
    tick: { color: c.onAccent, fontSize: 16, fontFamily: font.displayBold },
    taskBody: { flex: 1, gap: 1 },
    taskTitle: { ...type.body, fontSize: 18, color: c.ink },
    // Weight, not size: nothing in this app goes under 11pt and nothing
    // grows to shout. The heavier face is the emphasis.
    taskTitleWarm: { fontFamily: font.bodyMedium },
    markFlag: { color: c.warn },
    markHot: { color: c.warn },
    markCool: { color: c.inkDim },
    taskTitleDone: { textDecorationLine: 'line-through', color: c.inkDim },
    taskMinutes: { ...type.mono, fontSize: 13, color: c.inkFaint },
    actions: { justifyContent: 'center', alignItems: 'flex-end', paddingRight: space.md },
    // 22 each, two of them, comes to the 44pt floor for the pair — and the
    // whole row is a tap target anyway, so neither is the only way through.
    secondary: { minHeight: 22, justifyContent: 'center', paddingLeft: space.sm },
    secondaryText: { ...type.mono, fontSize: 13, color: c.crimson },
    removeText: { ...type.mono, fontSize: 13, color: c.inkFaint },

    /* ------------------------------------------------------------ capture */
    // The lens's own plate, not a slab of the lens's own colour. On the three
    // hardened palettes `crimson` is a *text* colour — light, so it can be
    // read on a dark ground — and filling a full-width button with it puts a
    // near-white highlighter block in the middle of the screen, louder than
    // the hardness readout above it. Tinted ground, lens border, lens text:
    // the primary act on the screen, said once rather than shouted.
    newStrike: {
      minHeight: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      backgroundColor: c.crimsonSoft,
      borderWidth: 1,
      borderColor: c.crimson,
      marginTop: space.sm,
    },
    newStrikeText: { ...type.heading, fontSize: 17, color: c.crimson },

    // The darkest the palette holds, at an alpha — `darkest()` rather than
    // `ink`, which is the *text* colour and is near-white on three of the four.
    scrim: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: darkest(c),
      // Heavier than it looks like it needs: darkening a near-black ground
      // barely reads, and a scrim that does not separate the sheet from the
      // list is a sheet that looks pasted on.
      opacity: 0.72,
    },
    sheetDock: { flex: 1, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: c.bg,
      borderTopLeftRadius: radius.lg,
      borderTopRightRadius: radius.lg,
      borderTopWidth: 1,
      borderColor: c.line,
      paddingTop: space.md,
      maxHeight: '86%',
    },
    sheetHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.lg,
      paddingBottom: space.sm,
    },
    sheetTitle: { ...type.heading, color: c.ink },
    sheetClose: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
    sheetCloseText: { ...type.mono, fontSize: 13, color: c.inkDim },
    sheetBody: { paddingHorizontal: space.lg },
    moreRow: { minHeight: 44, justifyContent: 'center' },
    moreText: { ...type.mono, fontSize: 13, color: c.crimson },

    capture: {
      ...row(c),
      gap: space.sm,
      padding: space.md,
      marginTop: space.sm,
    },
    input: {
      ...type.body,
      fontSize: 18,
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
    chipOn: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    // Watches sit directly under the duration chips and now share their
    // colour, so they separate on *weight* instead: a watch is chosen by
    // filling it, a duration by outlining it.
    watchOn: { borderColor: c.crimson, backgroundColor: c.crimson },
    watchTextOn: { color: c.onAccent },
    chipText: { ...type.mono, fontSize: 13, color: c.inkDim },
    chipTextOn: { color: c.crimson },
    addRow: { flexDirection: 'row', gap: space.sm },
    addToday: {
      flex: 2,
      backgroundColor: c.crimson,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    addTodayText: { ...type.heading, fontSize: 16, color: c.onAccent },
    addLater: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    addLaterText: { ...type.heading, fontSize: 14, color: c.inkDim },
    // An empty composer drops the fill instead of dimming it. Forty percent
    // of a cool colour still reads as a button; forty percent of a warm one
    // reads as mud, and this button is warm on both crews. An outline says
    // "not yet" without pretending to be a slab.
    addDisabled: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: c.line,
      opacity: 0.75,
    },
    addDisabledText: { color: c.inkFaint },

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
    trainingLabel: { marginTop: space.lg, marginBottom: space.xs },

    sessionKind: { ...type.heading, color: c.ink },
    sessionDrop: { minHeight: 44, justifyContent: 'center' },
    sessionDropText: { ...type.mono, fontSize: 12, color: c.inkFaint },
    sessionMeta: { ...type.small, fontSize: 14, color: c.inkDim },
    sessionReturn: { ...type.small, fontSize: 14, color: c.violet },

    trainRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      gap: space.md,
      paddingVertical: space.xs,
    },
    trainWeek: { ...type.body, color: c.ink },
    trainSince: { ...type.mono, fontSize: 13, color: c.inkFaint },

    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingLeft: space.md,
      paddingRight: space.xs,
      paddingVertical: space.sm,
      minHeight: 44,
    },
    sessionBody: { flex: 1, gap: 1 },

    logSession: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    logSessionText: { ...type.heading, fontSize: 18, color: c.ink },
    logSessionGo: { ...type.heading, fontSize: 16, color: c.crimson },

    breakDoor: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      marginTop: space.sm,
      minHeight: 44,
    },
    breakDoorText: { flex: 1, gap: 2 },
    breakDoorName: { ...type.heading, fontSize: 18, color: c.ink },
    breakDoorLine: { ...type.mono, fontSize: 13, color: c.inkFaint },
    breakDoorGo: { ...type.heading, fontSize: 16, color: c.crimson },

    pressed: { ...press },
  });
