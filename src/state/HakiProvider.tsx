import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../db/client';
import {
  allSessions,
  allTasks,
  gearSessionsOn,
  getRead,
  listEntries,
  readSetting,
  recentSleep,
} from '../db/repo';
import { setHardeningMark } from '../db/settings';
import { assessCascade, type CascadeVerdict } from '../domain/cascade';
import { trainingStatus, type TrainingStatus } from '../domain/training';
import { nextStrike, todaysLoad, type Load, type Task } from '../domain/tasks';
import { quoteForDay, type Quote } from '../domain/quotes';
import { minutesToday } from '../domain/gears';
import { NO_ACTS, settleLevel, type Acts, type HardeningLevel } from '../domain/hardening';
import { paletteFor, type Palette } from '../theme/palettes';
import { daysAtSea, todayKey } from '../domain/date';
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
  read: DailyRead | null;
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
  consistency: null,
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

const EMPTY_RESERVE: Reserve = {
  value: null,
  state: 'unknown',
  readScore: null,
  sleepScore: null,
};

export function HakiProvider({ children }: { children: React.ReactNode }) {
  const { db, settings } = useStore();
  const [read, setRead] = useState<DailyRead | null>(null);
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

  const refresh = useCallback(async () => {
    const today = todayKey();
    const [todayRead, nights, sessions, tasks, entries, gears, markDay, markLevel] =
      await Promise.all([
        getRead(db, today),
        recentSleep(db, 7, today),
        allSessions(db),
        allTasks(db),
        listEntries(db, 200),
        gearSessionsOn(db, today),
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

    const nextActs: Acts = {
      read: todayRead !== null,
      // A blank row created by opening the editor and leaving is not an entry.
      entries: entries.filter((e) => e.day === today && e.body.trim().length > 0).length,
      struck: nextLoad.doneToday.length,
      trained: sessions.filter((s) => s.day === today).length,
      gearMinutes: minutesToday(gears, Date.now()),
    };
    setActs(nextActs);

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
      hardening: settings.plainMode ? 3 : hardening,
      acts,
      palette: paletteFor(settings.plainMode ? 3 : hardening),
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
      settings.plainMode,
      settings.setSailAt,
      refresh,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
