import { clampHour, configureDayStart, todayKey, type DayKey } from '../domain/date';
import type { HardeningLevel } from '../domain/hardening';
import { DEFAULT_KEYSTONE, type KeystoneConfig } from '../domain/cascade';
import { DEFAULT_TRAINING, type TrainingConfig } from '../domain/training';
import { DEFAULT_CAPACITY_MINUTES } from '../domain/tasks';
import { isCrewName, type CrewName } from '../domain/crew';
import { encodeMinimums, parseMinimums, type Minimums } from '../domain/ladder';
import { readSetting, writeSetting, type Db } from './repo';

/**
 * Typed accessors over the key/value `setting` table.
 * Every read has a default, so a fresh install is a working install.
 */

export type Settings = {
  /** Day one of the voyage. Drives "days at sea". */
  setSailAt: DayKey;
  /** Haki mode is the default and the real UI. Plain is the mute button. */
  plainMode: boolean;
  /** Whose will this is. Changes the instrument and what 覇王色 burns. */
  crew: CrewName;
  keystone: KeystoneConfig;
  training: TrainingConfig;
  /** Minutes of intentional work a day can really hold. */
  capacityMinutes: number;
  soundOn: boolean;
  /**
   * The hour the day rolls over, 0–23. Production hours do not end at
   * midnight, and rolling over underneath someone still working splits one
   * day's work across two.
   */
  dayStartHour: number;
  /**
   * The day's hardening high-water mark, carried here rather than read
   * separately so it is known before the first frame. Read it late and the app
   * paints paper and then snaps to black on every cold start.
   */
  hardening: { day: DayKey; level: HardeningLevel } | null;
};

const KEYS = {
  setSailAt: 'voyage.setSailAt',
  plainMode: 'ui.plainMode',
  crew: 'ui.crew',
  keystone: 'keystone.config',
  training: 'training.config',
  capacity: 'tasks.capacityMinutes',
  sound: 'ui.soundOn',
  dayStart: 'voyage.dayStartHour',
  hardeningDay: 'hardening.day',
  hardeningLevel: 'hardening.level',
  hardeningWeight: 'hardening.weight',
  /** The ladder's rungs, raised above the floor. See `domain/ladder.ts`. */
  ladderRungs: 'ladder.rungs',
  /** The Monday of the week the top rung last fired the burst. */
  ladderBurst: 'ladder.burstWeek',
} as const;

export async function loadSettings(db: Db): Promise<Settings> {
  // The boundary is read first and applied before anything else, because
  // `todayKey()` is wrong until it is — including the first-launch default
  // three lines down.
  const dayStartRaw = await readSetting(db, KEYS.dayStart);
  const dayStartHour = clampHour(Number(dayStartRaw ?? 0));
  configureDayStart(dayStartHour);

  const [
    setSail,
    plain,
    crewRaw,
    keystoneRaw,
    trainingRaw,
    capacityRaw,
    soundRaw,
    hardDay,
    hardLevel,
  ] = await Promise.all([
    readSetting(db, KEYS.setSailAt),
    readSetting(db, KEYS.plainMode),
    readSetting(db, KEYS.crew),
    readSetting(db, KEYS.keystone),
    readSetting(db, KEYS.training),
    readSetting(db, KEYS.capacity),
    readSetting(db, KEYS.sound),
    readSetting(db, KEYS.hardeningDay),
    readSetting(db, KEYS.hardeningLevel),
  ]);

  // First launch is day one.
  let setSailAt = setSail;
  if (!setSailAt) {
    setSailAt = todayKey();
    await writeSetting(db, KEYS.setSailAt, setSailAt);
  }

  return {
    setSailAt,
    plainMode: plain === 'true',
    // The app was drawn for Luffy, so he is what an unset install flies.
    crew: crewRaw !== null && isCrewName(crewRaw) ? crewRaw : 'luffy',
    keystone: parseKeystone(keystoneRaw),
    training: parseTraining(trainingRaw),
    capacityMinutes: numberOr(Number(capacityRaw), DEFAULT_CAPACITY_MINUTES),
    // Default on — it is one of the reasons to open the thing.
    soundOn: soundRaw !== 'false',
    dayStartHour,
    hardening:
      hardDay && hardLevel !== null
        ? { day: hardDay, level: clampLevel(Number(hardLevel)) }
        : null,
  };
}

function clampLevel(value: number): HardeningLevel {
  if (!Number.isFinite(value)) return 0;
  return Math.min(3, Math.max(0, Math.trunc(value))) as HardeningLevel;
}

/**
 * Move the day boundary.
 *
 * Applied immediately as well as stored: every `todayKey()` after this call has
 * to agree with it, or the next write lands on the day the app just left.
 */
export async function setDayStartHour(db: Db, hour: number): Promise<number> {
  const clamped = clampHour(hour);
  configureDayStart(clamped);
  await writeSetting(db, KEYS.dayStart, String(clamped));
  return clamped;
}

/**
 * The day's high-water mark.
 *
 * `weight` was appended rather than folded into the level: the charge is
 * derived from it (see `domain/hardening.ts`), and one recorded number keeps
 * the two from ever disagreeing about what the day held. A device that has
 * never written one simply starts today's mark from the acts in front of it.
 */
export async function setHardeningMark(
  db: Db,
  day: DayKey,
  level: HardeningLevel,
  weight: number,
): Promise<void> {
  await writeSetting(db, KEYS.hardeningDay, day);
  await writeSetting(db, KEYS.hardeningLevel, String(level));
  await writeSetting(db, KEYS.hardeningWeight, String(Math.max(0, Math.round(weight))));
}

function parseKeystone(raw: string | null): KeystoneConfig {
  if (!raw) return DEFAULT_KEYSTONE;
  try {
    const parsed = JSON.parse(raw) as Partial<KeystoneConfig>;
    return {
      targetHours: numberOr(parsed.targetHours, DEFAULT_KEYSTONE.targetHours),
      thresholdHours: numberOr(parsed.thresholdHours, DEFAULT_KEYSTONE.thresholdHours),
      escalateAfterNights: numberOr(
        parsed.escalateAfterNights,
        DEFAULT_KEYSTONE.escalateAfterNights,
      ),
      downstreamNames: Array.isArray(parsed.downstreamNames)
        ? parsed.downstreamNames.filter((n): n is string => typeof n === 'string')
        : DEFAULT_KEYSTONE.downstreamNames,
    };
  } catch {
    // A corrupt blob must never take the app down — fall back to defaults.
    return DEFAULT_KEYSTONE;
  }
}

function parseTraining(raw: string | null): TrainingConfig {
  if (!raw) return DEFAULT_TRAINING;
  try {
    const parsed = JSON.parse(raw) as Partial<TrainingConfig>;
    return {
      weeklyTarget: numberOr(parsed.weeklyTarget, DEFAULT_TRAINING.weeklyTarget),
      gapDaysForReturn: numberOr(parsed.gapDaysForReturn, DEFAULT_TRAINING.gapDaysForReturn),
    };
  } catch {
    return DEFAULT_TRAINING;
  }
}

function numberOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export async function setPlainMode(db: Db, on: boolean): Promise<void> {
  await writeSetting(db, KEYS.plainMode, on ? 'true' : 'false');
}

export async function setCrew(db: Db, crew: CrewName): Promise<void> {
  await writeSetting(db, KEYS.crew, crew);
}

export async function setKeystone(db: Db, config: KeystoneConfig): Promise<void> {
  await writeSetting(db, KEYS.keystone, JSON.stringify(config));
}

export async function setTraining(db: Db, config: TrainingConfig): Promise<void> {
  await writeSetting(db, KEYS.training, JSON.stringify(config));
}

export async function setCapacityMinutes(db: Db, minutes: number): Promise<void> {
  await writeSetting(db, KEYS.capacity, String(minutes));
}

export async function setSoundOn(db: Db, on: boolean): Promise<void> {
  await writeSetting(db, KEYS.sound, on ? 'true' : 'false');
}

/* ----------------------------------------------------------------- ladder */

/** The rung table as the owner has raised it; the floor when never touched. */
export async function readLadderMinimums(db: Db): Promise<Minimums> {
  return parseMinimums(await readSetting(db, KEYS.ladderRungs));
}

export async function writeLadderMinimums(db: Db, m: Minimums): Promise<void> {
  await writeSetting(db, KEYS.ladderRungs, encodeMinimums(m));
}

/**
 * Which week the top rung last fired the Conqueror's burst.
 *
 * Written before the burst fires, so a second refresh landing in the same
 * frame cannot fire it twice — and read on every load, so reaching the top
 * lights the screen once a week at most and never again for the same week.
 */
export async function readBurstWeek(db: Db): Promise<string | null> {
  return readSetting(db, KEYS.ladderBurst);
}

export async function writeBurstWeek(db: Db, weekStart: string): Promise<void> {
  await writeSetting(db, KEYS.ladderBurst, weekStart);
}
