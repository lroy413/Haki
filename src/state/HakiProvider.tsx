import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Platform } from 'react-native';
import { crewFor, type Crew } from '../domain/crew';
import { useStore } from '../db/client';
import {
  allSessions,
  allTasks,
  entriesOn,
  gearSessionsOn,
  getCourse,
  getRead,
  readSetting,
  recentSleep,
  actsBetween,
  bellsOn,
  getDayEnd,
  drainsOn,
  heldDaysBetween,
  urgesOnDay,
  sitSessionsBetween,
  sitSessionsOn,
} from '../db/repo';
import { setHardeningMark } from '../db/settings';
import { assessCascade, type CascadeVerdict } from '../domain/cascade';
import { trainingStatus, type TrainingStatus } from '../domain/training';
import { nextStrike, todaysLoad, type Load, type Task } from '../domain/tasks';
import { pressing } from '../domain/pressing';
import { quoteForDay, type Quote } from '../domain/quotes';
import { minutesToday } from '../domain/gears';
import { minutesToday as sitMinutesToday } from '../domain/stillness';
import {
  WINDOW_DAYS as ARMAMENT_WINDOW,
  hardness,
  hardDays,
  type ArmamentDay,
} from '../domain/armament';
import { observation, type Observation, type ObservationDay } from '../domain/observation';
import { voyage, type Voyage } from '../domain/voyage';
import type { Bell } from '../domain/bells';

/**
 * How far back the voyage reads.
 *
 * Twelve weeks. Long enough that a serious gap has both of its ends inside
 * the window — a gap only half seen is not a gap this may report on — and
 * short enough to stay one query.
 */
const VOYAGE_WINDOW = 84;
import type { Course } from '../domain/course';
import { reachDays, reachFor, tierFor, type RyuoTier } from '../domain/ryuo';
import {
  NO_ACTS,
  settleCharge,
  settleLevel,
  weightOf,
  type Acts,
  type HardeningLevel,
} from '../domain/hardening';
import { paletteFor, type Palette } from '../theme/palettes';
import { addDays, daysAtSea, todayKey } from '../domain/date';
import {
  NO_SPEND,
  computeReserve,
  effectIntensity,
  type DailyRead,
  type Reserve,
} from '../domain/willReserve';
import { heldSomething } from '../domain/breakList';
import { strings, type Strings } from '../theme/strings';
import { syncKeystoneWarning } from '../notifications/denDenMushi';
import { preloadSounds, setSoundEnabled } from '../sound';

type HakiState = {
  read: (DailyRead & { weather: string | null }) | null;
  /** Whose will this is. See `domain/crew.ts`. */
  crew: Crew;
  /**
   * What 覇王色 burns in, under the crew currently flying.
   *
   * Every screen that draws Conqueror's — the Journey tab, the Dream, the
   * Flag, the burst, the tab bar's fourth glyph — reads this rather than
   * `palette.violet`, so a crew change moves all of them at once and none of
   * them has to know a crew exists.
   */
  conquerors: string;
  reserve: Reserve;
  cascade: CascadeVerdict;
  training: TrainingStatus;
  load: Load;
  next: Task | null;
  /**
   * What is bearing down, across every day rather than just today — a task
   * due today and planned for Saturday lives in Saturday's list, which is
   * the one place you will not look today.
   */
  bearing: Task[];
  quote: Quote;
  /** 0..1 — how strongly the app renders its own Haki. Plain mode pins it to 0. */
  intensity: number;
  /** How far the day has hardened. Every colour in the app comes from this. */
  hardening: HardeningLevel;
  /**
   * 0..1 — how far the day has gone *past* black, where the ground has run
   * out of dark and the plates take over. Plain mode pins it to 0, because
   * plain mode also pins `hardening` to the settled dark, which is exactly
   * the value that would burn brightest. See `domain/hardening.ts`.
   */
  charge: number;
  acts: Acts;
  palette: Palette;
  /** How far the emission reaches — see `domain/ryuo.ts`. */
  ryuo: { tier: RyuoTier; days: number; reach: number };
  /** Today's heading, or null. See `domain/course.ts`. */
  course: Course | null;
  /**
   * 武装色 — the share of the trailing window that had any act of doing in it.
   * Null before anything has ever been done. See `domain/armament.ts`.
   */
  hardness: { value: number | null; days: number };
  /** 見聞色 — the practice, and whether today is clear enough to use it. */
  observation: Observation;
  /** Returns and the Calm Belt, read from the days themselves. */
  voyage: Voyage;
  /** Today's bells, earliest first. See `domain/bells.ts`. */
  bells: Bell[];
  /** The evening line, if one has been written today. */
  dayEnd: string | null;
  day: number;
  t: Strings;
  plainMode: boolean;
  /**
   * Show a written value now, before the database has been asked about it.
   *
   * The screens that write through a door — the Daily Read and the Course —
   * close the door in the same frame as the tap and let the row land behind
   * it. That is right, and it left the *result* of the write waiting on a
   * round trip: the home screen refreshes when it regains focus, which
   * happens before the write is even issued, and the correct picture only
   * arrives on the refresh that follows the write.
   *
   * The owner: _"I'd hit today and it would take me to the main screen but
   * the course didn't show up... same with my daily read, I had to close and
   * reopen and then it was there."_
   *
   * So the write says what it wrote. This is the app's own rule — anything
   * that toggles holds its own optimistic state and drops it when the stored
   * value agrees — applied to the two doors that never had it. It cannot
   * disagree with the database for longer than one refresh, and if the write
   * fails the refresh puts the old value straight back.
   */
  showCourse: (next: Course | null) => void;
  showRead: (next: (DailyRead & { weather: string | null }) | null) => void;
  refresh: () => Promise<void>;
};

const Ctx = createContext<HakiState | null>(null);

export function useHaki(): HakiState {
  const state = useContext(Ctx);
  if (!state) throw new Error('useHaki must be used inside <HakiProvider>');
  return state;
}

const EMPTY_TRAINING: TrainingStatus = {
  sessionsThisWeek: 0,
  weeklyTarget: 0,
  daysSinceLast: null,
  lastSessionDay: null,
  inGap: false,
};

const EMPTY_LOAD: Load = {
  open: [],
  doneToday: [],
  openMinutes: 0,
  doneMinutes: 0,
  capacityMinutes: 0,
  read: 'empty',
  overBy: 0,
};

/** Where the day's high-water mark lives. Derived state, not a user setting. */
const HARDENING_DAY = 'hardening.day';
const HARDENING_LEVEL = 'hardening.level';
/**
 * The weight behind the mark, appended rather than folded into the level.
 *
 * The charge is derived from it, so one recorded number keeps the level and
 * the charge from ever disagreeing about what the day held. A device that has
 * not written one yet reads null and simply starts today's high-water mark
 * from the acts in front of it.
 */
const HARDENING_WEIGHT = 'hardening.weight';

/** Rows to days. Both lens figures want the same shape out of the database. */
function groupByDay<T extends { day: string }>(rows: T[]): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const bucket = out.get(row.day);
    if (bucket) bucket.push(row);
    else out.set(row.day, [row]);
  }
  return out;
}

const EMPTY_RESERVE: Reserve = {
  value: null,
  state: 'unknown',
  readScore: null,
  sleepScore: null,
  spend: NO_SPEND,
  started: null,
};

export function HakiProvider({ children }: { children: React.ReactNode }) {
  const { db, settings } = useStore();
  const [read, setRead] = useState<(DailyRead & { weather: string | null }) | null>(null);
  const [reserve, setReserve] = useState<Reserve>(EMPTY_RESERVE);
  const [cascade, setCascade] = useState<CascadeVerdict>({
    level: 'clear',
    consecutiveBadNights: 0,
    hasData: false,
    message: null,
  });
  const [training, setTraining] = useState<TrainingStatus>(EMPTY_TRAINING);
  const [load, setLoad] = useState<Load>(EMPTY_LOAD);
  // Seeded from the mark that came in with the settings, which are loaded
  // before anything renders. Starting at 0 and reading the mark afterwards
  // paints paper and then snaps to black on every cold start of a used day.
  const [hardening, setHardening] = useState<HardeningLevel>(() =>
    settleLevel(NO_ACTS, todayKey(), settings.hardening),
  );
  const [acts, setActs] = useState<Acts>(NO_ACTS);
  // Not seeded from the settings the way the level is. The mark's weight is
  // read inside `refresh` rather than carried on `Settings`, and a first frame
  // that opens uncharged and lights a moment later is a plate catching up;
  // one that opens *pale* and snaps to black is the whole app changing colour.
  const [charge, setCharge] = useState(0);
  const [ryuoDays, setRyuoDays] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [armament, setArmament] = useState<{ value: number | null; days: number }>({
    value: null,
    days: 0,
  });
  const [seeing, setSeeing] = useState<Observation>(() =>
    observation([], null, todayKey(), ARMAMENT_WINDOW),
  );
  const [sailing, setSailing] = useState<Voyage>(() => voyage([], todayKey()));
  const [bells, setBells] = useState<Bell[]>([]);
  const [bearing, setBearing] = useState<Task[]>([]);
  const [dayEnd, setDayEnd] = useState<string | null>(null);

  /**
   * Which refresh is the current one.
   *
   * Leaving the Daily Read runs two of these at once: the save's own, and the
   * one the home screen fires as it regains focus. They queue on expo-sqlite's
   * single channel, and the one that started first reads the *older* database
   * — so without this the stale answer could land last and put the old number
   * back on screen, which is exactly what "I saved it and nothing happened"
   * looked like. Only the newest refresh is allowed to write.
   */
  const refreshes = useRef(0);

  const refresh = useCallback(async () => {
    const mine = (refreshes.current += 1);
    const today = todayKey();
    const [
      todayRead,
      nights,
      sessions,
      tasks,
      entries,
      gears,
      sits,
      todayCourse,
      todayBells,
      evening,
      drains,
      todayUrges,
      markDay,
      markLevel,
      markWeight,
    ] = await Promise.all([
      getRead(db, today),
      recentSleep(db, 7, today),
      allSessions(db),
      allTasks(db),
      entriesOn(db, today),
      gearSessionsOn(db, today),
      sitSessionsOn(db, today),
      getCourse(db, today),
      bellsOn(db, today),
      getDayEnd(db, today),
      drainsOn(db, today),
      urgesOnDay(db, today),
      readSetting(db, HARDENING_DAY),
      readSetting(db, HARDENING_LEVEL),
      readSetting(db, HARDENING_WEIGHT),
    ]);

    // A newer refresh started while this one was in flight, so this one's
    // answers are already history. Dropping them here is what stops a slow
    // read from overwriting a fast one — see the note on `refreshes` above.
    if (mine !== refreshes.current) return;

    const nextCascade = assessCascade(nights, settings.keystone, today);

    setRead(todayRead);
    setCascade(nextCascade);
    setTraining(trainingStatus(sessions, settings.training, today));

    const nextLoad = todaysLoad(tasks, today, settings.capacityMinutes);
    setLoad(nextLoad);

    // Reach is read over a trailing window, so it is recomputed with the rest
    // rather than tracked incrementally — there is no state to drift.
    setRyuoDays(reachDays(tasks, today));

    setCourse(todayCourse);

    const nextActs: Acts = {
      course: todayCourse !== null,
      read: todayRead !== null,
      // A blank row created by opening the editor and leaving is not an entry.
      entries: entries.filter((body) => body.trim().length > 0).length,
      struck: nextLoad.doneToday.length,
      trained: sessions.filter((s) => s.day === today).length,
      gearMinutes: minutesToday(gears, Date.now()),
      satMinutes: sitMinutesToday(sits, Date.now()),
    };
    setActs(nextActs);
    setBells(todayBells);
    const nextBearing = pressing(tasks, today);
    setBearing(nextBearing);
    setDayEnd(evening?.line ?? null);

    // The Reserve reads the day's acts, so it is computed here rather than
    // with the other loads: the level is what the morning started with, and
    // the burn is what has gone into the day since.
    setReserve(
      computeReserve({
        read: todayRead,
        recentSleepHours: nights.map((n) => n.hours),
        sleepTargetHours: settings.keystone.targetHours,
        acts: nextActs,
        // The other half of the burn: what happened, rather than what was
        // done. First stage, because the gauge is on the home screen and a
        // reading that arrives without it would be visibly wrong for a beat.
        drains,
        urges: todayUrges.length,
      }),
    );

    // 武装色 and 見聞色, each read over the same trailing window. Grouped into
    // days here because the domain wants days and the database only has rows.
    //
    // Armament reads its own tool and nothing else: tasks struck and sessions
    // logged. Gears are conspicuously not in this list — they are leaving the
    // page for the ability tool, and hardening (which reads the whole day)
    // is where a gear block still counts.
    const now = Date.now();
    const armamentDays = new Map<string, ArmamentDay>();
    const dayOf = (key: string): ArmamentDay => {
      const existing = armamentDays.get(key);
      if (existing) return existing;
      const fresh: ArmamentDay = { day: key as typeof today, struck: 0, sessions: 0 };
      armamentDays.set(key, fresh);
      return fresh;
    };
    for (const t of tasks) {
      if (t.committedFor && t.doneAt !== null) dayOf(t.committedFor).struck += 1;
    }
    for (const session of sessions) dayOf(session.day).sessions += 1;
    const armamentHistory = [...armamentDays.values()];
    setArmament({
      value: hardness(armamentHistory, today, ARMAMENT_WINDOW),
      days: hardDays(armamentHistory, today, ARMAMENT_WINDOW),
    });

    // The palette belongs to the fast half. Hardening is computed entirely
    // from the day's own acts, and it is the most visible thing the app does
    // — an act that darkens the screen has to darken it now, not after three
    // months of history have been read.
    const recorded =
      markDay && markLevel !== null
        ? { day: markDay, level: Number(markLevel) as HardeningLevel }
        : null;
    const settled = settleLevel(nextActs, today, recorded);
    setHardening(settled);

    // The charge rides the same mark. It is the day's weight past the point
    // the ground stops answering, and it holds its high-water for the same
    // reason the level does — un-ticking a task must not undo an afternoon.
    const markedWeight = markDay === today && markWeight !== null ? Number(markWeight) : null;
    const heldWeight =
      markedWeight !== null && Number.isFinite(markedWeight)
        ? { day: today, weight: markedWeight }
        : null;
    setCharge(settleCharge(nextActs, today, heldWeight));

    // Only write when the mark actually moves — every screen focus calls this.
    const weight = Math.max(weightOf(nextActs), markedWeight ?? 0);
    if (
      !recorded ||
      recorded.day !== today ||
      recorded.level !== settled ||
      markedWeight !== weight
    ) {
      await setHardeningMark(db, today, settled, weight);
    }

    // Fire-and-forget: a notification failure must never break a screen.
    void syncKeystoneWarning(nextCascade);

    // ---------------------------------------------------------------------
    // The trailing windows. Twelve weeks of acts across seven tables and a
    // month of sits are by far the most expensive thing this function does,
    // and none of it changes the numbers already on screen — so it runs after
    // them rather than in front of them, and the day's own figures no longer
    // wait behind three months of history on one sqlite channel.
    const [sitWindow, actHistory, heldDays] = await Promise.all([
      sitSessionsBetween(db, addDays(today, -(ARMAMENT_WINDOW - 1)), today),
      // Far enough back that a long gap has both of its ends inside the
      // window — a return read from a half-seen gap would be invented.
      actsBetween(db, addDays(today, -(VOYAGE_WINDOW - 1)), today),
      // Which of those days had an urge held on them. Second stage with the
      // rest of the window: the Calm Belt is the only thing that reads it.
      heldDaysBetween(db, addDays(today, -(VOYAGE_WINDOW - 1)), today),
    ]);
    if (mine !== refreshes.current) return;

    const sitHistory: ObservationDay[] = [...groupByDay(sitWindow)].map(([key, group]) => ({
      day: key as typeof today,
      satMinutes: sitMinutesToday(group, now),
    }));
    setSeeing(observation(sitHistory, todayRead?.clarity ?? null, today, ARMAMENT_WINDOW));

    // Today is recomputed live above, so it goes on top of the stored
    // history: a task struck a second ago has to count as today being used
    // or the Return would still think the gap was open.
    const held = new Set(heldDays);
    setSailing(
      voyage(
        [
          ...actHistory
            .filter((d) => d.day !== today)
            .map((d) => ({ ...d, held: held.has(d.day) })),
          { day: today, ...nextActs, held: heldSomething(todayUrges) },
        ],
        today,
      ),
    );
  }, [
    db,
    settings.keystone,
    settings.training,
    settings.capacityMinutes,
    settings.dayStartHour,
  ]);

  /**
   * What a write just wrote, shown before the database is asked.
   *
   * Deliberately not a cache and not a queue: one value, replaced by the next
   * refresh whatever it says. If the write failed, the refresh puts the old
   * value back — which is the correct outcome and the reason this cannot lie
   * for longer than a moment.
   */
  const showCourse = useCallback((next: Course | null) => setCourse(next), []);
  const showRead = useCallback(
    (next: (DailyRead & { weather: string | null }) | null) => setRead(next),
    [],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Plain mode is the mute button for everything, sound included.
  useEffect(() => {
    const on = settings.soundOn && !settings.plainMode;
    setSoundEnabled(on);
    if (on) preloadSounds();
  }, [settings.soundOn, settings.plainMode]);

  // Plain mode pins the ramp to the settled dark so a screenshare stays still.
  const level = settings.plainMode ? 3 : hardening;
  const palette = paletteFor(level);
  const crew = crewFor(settings.crew);

  /**
   * The page itself wears the day's ground.
   *
   * The app paints its own screens, so this is only ever seen at the edges —
   * the overscroll rubber-band, the split second before the bundle parses,
   * and any sliver a phone decides to keep for itself. But the shell's
   * colour was a constant while the app's was a function of the day, so on
   * paper every one of those edges was a black seam.
   *
   * Written to storage as well as applied, so the *next* cold start opens on
   * the right ground instead of flashing the one this app happened to be
   * designed in. See `tools/pwa-head.mjs` for the reading half.
   */
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = palette.bg;
    document.body.style.backgroundColor = palette.bg;
    // The installed app starts below the status bar now, and iOS paints the
    // strip behind the clock with the page's theme-color. Measured on the
    // phone: the strip is sampled at launch and does not follow later
    // changes, so the live sync here is for browsers that do follow it, and
    // the launch half of the job belongs to the boot script — which is why
    // the store below carries a day boundary as well as a colour. The strip
    // the app launches under must be the ground the day will OPEN on: a new
    // voyage day opens on paper, and yesterday's settled black over this
    // morning's parchment was the exact seam this exists to close. Plain
    // mode pins the palette instead, so there the stored ground is simply
    // valid until it changes and no boundary is written.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((m) => m.setAttribute('content', palette.bg));
    let until = 0;
    if (!settings.plainMode) {
      const now = new Date();
      const boundary = new Date(now);
      boundary.setHours(settings.dayStartHour, 0, 0, 0);
      if (boundary <= now) boundary.setDate(boundary.getDate() + 1);
      until = boundary.getTime();
    }
    try {
      localStorage.setItem('haki.ground', palette.bg);
      if (until > 0) localStorage.setItem('haki.groundUntil', String(until));
      else localStorage.removeItem('haki.groundUntil');
    } catch {
      // A private window can refuse storage. The colour is already applied.
    }
    // Measured on the phone: iOS reads the strip's colour from the
    // statically parsed HTML and never from the DOM, so the meta writes
    // above are for browsers that do track it. The copy iOS believes is the
    // one the service worker serves — tell it the ground, and it paints the
    // meta into the document bytes before the next launch is parsed.
    try {
      navigator.serviceWorker?.controller?.postMessage({
        type: 'haki-ground',
        ground: palette.bg,
        until,
      });
    } catch {
      // No worker, no paint — the static fallback colour still stands.
    }
  }, [palette.bg, settings.plainMode, settings.dayStartHour]);

  const value = useMemo<HakiState>(
    () => ({
      read,
      reserve,
      cascade,
      training,
      load,
      // The next *ordinary* thing: anything already bearing down is shown by
      // its own card above, and one task drawn twice on one screen is the
      // bug Day's End had to fix once already.
      next: nextStrike(load, bearing),
      quote: quoteForDay(todayKey()),
      // In plain mode the app stops performing entirely.
      intensity: settings.plainMode ? 0 : effectIntensity(reserve),
      // Plain mode is the mute button for effects, and this is the loudest one
      // in the app. Pinned to the settled dark so a screenshare stays still.
      hardening: level,
      // Plain mode stops the app performing, and this is a performance. It
      // cannot be read off `level` there, because plain mode pins that to 3.
      charge: settings.plainMode ? 0 : charge,
      acts,
      palette,
      crew,
      conquerors: palette[crew.conquerors],
      ryuo: (() => {
        // Plain mode turns the effects off, and reach is entirely an effect.
        const tier = settings.plainMode ? 0 : tierFor(ryuoDays);
        return { tier, days: ryuoDays, reach: reachFor(tier) };
      })(),
      course,
      hardness: armament,
      observation: seeing,
      voyage: sailing,
      bells,
      bearing,
      dayEnd,
      showCourse,
      showRead,
      day: daysAtSea(settings.setSailAt, todayKey()),
      t: strings(settings.plainMode),
      plainMode: settings.plainMode,
      refresh,
    }),
    [
      read,
      reserve,
      cascade,
      bearing,
      dayEnd,
      training,
      load,
      hardening,
      charge,
      acts,
      ryuoDays,
      course,
      armament,
      seeing,
      settings.plainMode,
      settings.setSailAt,
      crew,
      palette,
      showCourse,
      showRead,
      refresh,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
