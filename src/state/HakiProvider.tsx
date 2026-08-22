import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useStore } from '../db/client';
import { allSessions, allTasks, getRead, recentSleep } from '../db/repo';
import { assessCascade, type CascadeVerdict } from '../domain/cascade';
import { trainingStatus, type TrainingStatus } from '../domain/training';
import { nextStrike, todaysLoad, type Load, type Task } from '../domain/tasks';
import { quoteForDay, type Quote } from '../domain/quotes';
import { daysAtSea, todayKey } from '../domain/date';
import {
  computeReserve,
  effectIntensity,
  type DailyRead,
  type Reserve,
} from '../domain/willReserve';
import { strings, type Strings } from '../theme/strings';
import { syncKeystoneWarning } from '../notifications/denDenMushi';

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

  const refresh = useCallback(async () => {
    const today = todayKey();
    const [todayRead, nights, sessions, tasks] = await Promise.all([
      getRead(db, today),
      recentSleep(db, 7, today),
      allSessions(db),
      allTasks(db),
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
    setLoad(todaysLoad(tasks, today, settings.capacityMinutes));

    // Fire-and-forget: a notification failure must never break a screen.
    void syncKeystoneWarning(nextCascade);
  }, [db, settings.keystone, settings.training, settings.capacityMinutes]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

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
      day: daysAtSea(settings.setSailAt, todayKey()),
      t: strings(settings.plainMode),
      plainMode: settings.plainMode,
      refresh,
    }),
    [read, reserve, cascade, training, load, settings.plainMode, settings.setSailAt, refresh],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
