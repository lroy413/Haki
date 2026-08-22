import { todayKey, type DayKey } from '../domain/date';
import { DEFAULT_KEYSTONE, type KeystoneConfig } from '../domain/cascade';
import { DEFAULT_TRAINING, type TrainingConfig } from '../domain/training';
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
  keystone: KeystoneConfig;
  training: TrainingConfig;
};

const KEYS = {
  setSailAt: 'voyage.setSailAt',
  plainMode: 'ui.plainMode',
  keystone: 'keystone.config',
  training: 'training.config',
} as const;

export async function loadSettings(db: Db): Promise<Settings> {
  const [setSail, plain, keystoneRaw, trainingRaw] = await Promise.all([
    readSetting(db, KEYS.setSailAt),
    readSetting(db, KEYS.plainMode),
    readSetting(db, KEYS.keystone),
    readSetting(db, KEYS.training),
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
    keystone: parseKeystone(keystoneRaw),
    training: parseTraining(trainingRaw),
  };
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

export async function setKeystone(db: Db, config: KeystoneConfig): Promise<void> {
  await writeSetting(db, KEYS.keystone, JSON.stringify(config));
}

export async function setTraining(db: Db, config: TrainingConfig): Promise<void> {
  await writeSetting(db, KEYS.training, JSON.stringify(config));
}
