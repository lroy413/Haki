import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  sitSessionsBetween,
  sitSessionsOn,
} from '../db/repo';
import { setHardeningMark } from '../db/settings';
import { assessCascade, type CascadeVerdict } from '../domain/cascade';
import { trainingStatus, type TrainingStatus } from '../domain/training';
import { nextStrike, todaysLoad, type Load, type Task } from '../domain/tasks';
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
import type { Course } from '../domain/course';
import { reachDays, reachFor, tierFor, type RyuoTier } from '../domain/ryuo';
import { NO_ACTS, settleLevel, type Acts, type HardeningLevel } from '../domain/hardening';
import { paletteFor, type Palette } from '../theme/palettes';
import { addDays, daysAtSea, todayKey } from '../domain/date';
import {
  computeReserve,
  effectIntensity,
  type DailyRead,
  type Reserve,
} from '../domain/willReserve';
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
  quote: Quote;
  /** 0..1 — how strongly the app renders its own Haki. Plain mode pins it to 0. */
  intensity: number;
  /** How far the day has hardened. Every colour in the app comes from this. */
  hardening: HardeningLevel;
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
  day: number;
  t: Strings;
  plainMode: boolean;
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
  const [ryuoDays, setRyuoDays] = useState(0);
  const [course, setCourse] = useState<Course | null>(null);
  const [armament, setArmament] = useState<{ value: number | null; days: number }>({
    value: null,
    days: 0,
  });
  const [seeing, setSeeing] = useState<Observation>(() =>
    observation([], null, todayKey(), ARMAMENT_WINDOW),
  );

  const refresh = useCallback(async () => {
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
      sitWindow,
      markDay,
      markLevel,
    ] = await Promise.all([
      getRead(db, today),
      recentSleep(db, 7, today),
      allSessions(db),
      allTasks(db),
      entriesOn(db, today),
      gearSessionsOn(db, today),
      sitSessionsOn(db, today),
      getCourse(db, today),
      sitSessionsBetween(db, addDays(today, -(ARMAMENT_WINDOW - 1)), today),
      readSetting(db, HARDENING_DAY),
      readSetting(db, HARDENING_LEVEL),
    ]);

    const nextReserve = computeReserve({
      read: todayRead,
      recentSleepHours: nights.map((n) => n.hours),
      sleepTargetHours: settings.keystone.targetHours,
    });
    const nextCascade = assessCascade(nights, settings.keystone, today);

    setRead(todayRead);
    setReserve(nextReserve);
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

    const sitHistory: ObservationDay[] = [...groupByDay(sitWindow)].map(([key, group]) => ({
      day: key as typeof today,
      satMinutes: sitMinutesToday(group, now),
    }));
    setSeeing(observation(sitHistory, todayRead?.clarity ?? null, today, ARMAMENT_WINDOW));

    const recorded =
      markDay && markLevel !== null
        ? { day: markDay, level: Number(markLevel) as HardeningLevel }
        : null;
    const settled = settleLevel(nextActs, today, recorded);
    setHardening(settled);

    // Only write when the mark actually moves — every screen focus calls this.
    if (!recorded || recorded.day !== today || recorded.level !== settled) {
      await setHardeningMark(db, today, settled);
    }

    // Fire-and-forget: a notification failure must never break a screen.
    void syncKeystoneWarning(nextCascade);
  }, [
    db,
    settings.keystone,
    settings.training,
    settings.capacityMinutes,
    settings.dayStartHour,
  ]);

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
    try {
      localStorage.setItem('haki.ground', palette.bg);
    } catch {
      // A private window can refuse storage. The colour is already applied.
    }
  }, [palette.bg]);

  const value = useMemo<HakiState>(
    () => ({
      read,
      reserve,
      cascade,
      training,
      load,
      next: nextStrike(load),
      quote: quoteForDay(todayKey()),
      // In plain mode the app stops performing entirely.
      intensity: settings.plainMode ? 0 : effectIntensity(reserve),
      // Plain mode is the mute button for effects, and this is the loudest one
      // in the app. Pinned to the settled dark so a screenshare stays still.
      hardening: level,
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
      day: daysAtSea(settings.setSailAt, todayKey()),
      t: strings(settings.plainMode),
      plainMode: settings.plainMode,
      refresh,
    }),
    [
      read,
      reserve,
      cascade,
      training,
      load,
      hardening,
      acts,
      ryuoDays,
      course,
      armament,
      seeing,
      settings.plainMode,
      settings.setSailAt,
      crew,
      palette,
      refresh,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
