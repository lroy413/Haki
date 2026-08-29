/**
 * Backup: the file that gets your data out, and back in somewhere else.
 *
 * This exists because the PWA and the native app are two separate databases.
 * Three weeks of reads, entries and sessions do not follow you across on their
 * own — this is how they travel.
 *
 * Two hard rules, both about not losing anything:
 *
 * 1. **Import merges, it never wipes.** Nothing here deletes a row. Importing
 *    into a database that already has data adds what is missing and leaves the
 *    rest alone.
 *
 * 2. **Import is idempotent.** Every table dedupes on a natural key, so
 *    importing the same file twice changes nothing the second time. If you are
 *    not sure whether an import worked, running it again is safe.
 *
 * A malformed file must never get as far as the database. Everything here is
 * pure and validated before a single write happens.
 */

export const BACKUP_FORMAT = 'haki.export';
export const BACKUP_VERSION = 1;

export type DailyReadBackup = {
  day: string;
  energy: number;
  mood: number;
  clarity: number;
  tension: number;
  /** The optional one-word sky. Absent in backups older than format v8. */
  weather?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SleepBackup = {
  day: string;
  hours: number;
  createdAt: number;
  updatedAt: number;
};

export type EntryBackup = {
  body: string;
  day: string;
  createdAt: number;
  updatedAt: number;
};

export type SessionBackup = {
  day: string;
  kind: string;
  minutes: number | null;
  intensity: number | null;
  note: string | null;
  closedGap: number;
  createdAt: number;
};

export type CarriedBackup = {
  name: string;
  relationship: string | null;
  theirDream: string | null;
  whatICarry: string | null;
  createdAt: number;
  updatedAt: number;
};

export type TaskBackup = {
  title: string;
  minutes: number;
  committedFor: string | null;
  doneAt: number | null;
  /** The rhythm that produced it, by that rhythm's createdAt. */
  rhythmKey: number | null;
  /** The island it was struck from. Absent in older backups. */
  islandKey?: number | null;
  /** Which watch of the day it was placed in. Absent in older backups. */
  watch?: string | null;
  /**
   * The flag, as 0 or 1. Absent in older backups, where it means 0.
   *
   * A number rather than a boolean because import inserts these rows straight
   * into the table — there is no transform between here and the column, and
   * the column is an INTEGER. `closedGap` next door holds the same shape for
   * the same reason.
   */
  priority?: number;
  /** The day it had to be done by. Absent in older backups. */
  dueBy?: string | null;
  createdAt: number;
};

export type RhythmBackup = {
  title: string;
  minutes: number;
  kind: string;
  weekdays: string;
  intervalDays: number;
  createdAt: number;
  updatedAt: number;
  retiredAt: number | null;
};

export type FlagValueBackup = {
  text: string;
  setOn: string;
  createdAt: number;
  updatedAt: number;
};

export type TaskMoveBackup = {
  /** Identifies the task by its creation stamp, as tasks do elsewhere here. */
  taskCreatedAt: number;
  fromDay: string;
  toDay: string | null;
  /** The day the decision was made on, which is not always `fromDay`. */
  madeOn: string;
  reason: string;
  createdAt: number;
};

/**
 * A named stone. The kind is a string here rather than a union, because a
 * backup is data arriving from outside and a widened union in a later version
 * must not make an older file unreadable — `isKind` decides on the way in.
 */
export type SeaPrismBackup = {
  kind: string;
  name: string;
  createdAt: number;
  retiredAt: number | null;
};

/**
 * A day a stone was named on, keyed by the stone's `createdAt` rather than its
 * row id — ids are not carried across a backup at all, so a child keyed on one
 * would arrive pointing at nothing. The column holds the same value, so this
 * row is the table's row.
 */
export type SeaPrismHitBackup = {
  stoneKey: number;
  day: string;
  createdAt: number;
};

/** A thing you are trying not to do. */
export type BreakBackup = {
  name: string;
  createdAt: number;
  retiredAt: number | null;
};

/**
 * One urge and what happened, keyed by the break's `createdAt`.
 *
 * `outcome` is a string rather than the union for the same reason
 * `SeaPrismBackup.kind` is: a file written by a later version must still
 * import, and the reader decides on the way out of the database.
 */
export type UrgeBackup = {
  breakKey: number;
  day: string;
  outcome: string;
  createdAt: number;
};

export type NoteBackup = {
  title: string;
  body: string;
  createdAt: number;
  updatedAt: number;
};

export type DayEndBackup = {
  day: string;
  line: string;
  createdAt: number;
  updatedAt: number;
};

export type BellBackup = {
  title: string;
  day: string;
  /** Minutes past midnight. */
  at: number;
  createdAt: number;
};

export type EternalPoseBackup = {
  text: string;
  setOn: string;
  endedOn: string | null;
  reason: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SoundingBackup = {
  /** The island it was taken against, by that poneglyph's createdAt. */
  islandKey: number;
  value: number;
  day: string;
  createdAt: number;
};

export type SailingBackup = {
  day: string;
  heading: string;
  note: string | null;
  createdAt: number;
  updatedAt: number;
};

export type SettingBackup = {
  key: string;
  value: string;
};

export type GearSessionBackup = {
  gear: string;
  day: string;
  startedAt: number;
  endedAt: number | null;
  completed: number;
  createdAt: number;
};

export type SitSessionBackup = {
  depth: string;
  day: string;
  startedAt: number;
  endedAt: number | null;
  completed: number;
  createdAt: number;
};

export type CourseBackup = {
  day: string;
  heading: string;
  createdAt: number;
  updatedAt: number;
};

export type RoadPoneglyphBackup = {
  title: string;
  why: string | null;
  createdAt: number;
  updatedAt: number;
  retiredAt: number | null;
};

/**
 * Linked to its Road Poneglyph by the parent's `createdAt`, not its row id.
 * Ids are not carried across a backup at all — see the note at the top of this
 * file — so a child keyed on one would arrive pointing at nothing.
 */
export type PoneglyphBackup = {
  roadCreatedAt: number;
  title: string;
  state: string;
  openedOn: string;
  closedOn: string | null;
  reason: string | null;
  /** The day it has to be reached by. Absent in backups before schema v16. */
  portBy?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type BackupTables = {
  dailyRead: DailyReadBackup[];
  sleepLog: SleepBackup[];
  entry: EntryBackup[];
  trainingSession: SessionBackup[];
  gearSession: GearSessionBackup[];
  sitSession: SitSessionBackup[];
  course: CourseBackup[];
  roadPoneglyph: RoadPoneglyphBackup[];
  poneglyph: PoneglyphBackup[];
  rhythm: RhythmBackup[];
  sailing: SailingBackup[];
  flagValue: FlagValueBackup[];
  eternalPose: EternalPoseBackup[];
  bell: BellBackup[];
  dayEnd: DayEndBackup[];
  note: NoteBackup[];
  seaPrism: SeaPrismBackup[];
  seaPrismHit: SeaPrismHitBackup[];
  breakItem: BreakBackup[];
  urge: UrgeBackup[];
  sounding: SoundingBackup[];
  carried: CarriedBackup[];
  task: TaskBackup[];
  /**
   * After `task`, and that is load-bearing.
   *
   * `TABLE_NAMES` is this object's key order and the import walks it in that
   * order. A move is the one row in the file whose shape is not its table's —
   * it carries the task's stamp where the column holds the task's id — so the
   * import has to look the task up, and it cannot look up a task it has not
   * inserted yet. See `importBackup`.
   */
  taskMove: TaskMoveBackup[];
  setting: SettingBackup[];
};

export type Backup = {
  format: typeof BACKUP_FORMAT;
  version: number;
  exportedAt: number;
  schemaVersion: number;
  data: BackupTables;
};

export const EMPTY_TABLES: BackupTables = {
  dailyRead: [],
  sleepLog: [],
  entry: [],
  trainingSession: [],
  gearSession: [],
  sitSession: [],
  course: [],
  roadPoneglyph: [],
  poneglyph: [],
  rhythm: [],
  sailing: [],
  flagValue: [],
  eternalPose: [],
  bell: [],
  dayEnd: [],
  note: [],
  seaPrism: [],
  seaPrismHit: [],
  breakItem: [],
  urge: [],
  sounding: [],
  carried: [],
  task: [],
  // After `task` — the order is the import's order. See the type above.
  taskMove: [],
  setting: [],
};

export const TABLE_NAMES = Object.keys(EMPTY_TABLES) as (keyof BackupTables)[];

/* ------------------------------------------------------------------ build */

export function buildBackup(
  data: BackupTables,
  schemaVersion: number,
  exportedAt: number,
): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt,
    schemaVersion,
    data,
  };
}

export function serializeBackup(backup: Backup): string {
  // Pretty-printed on purpose: this is a file you might open in a text editor
  // years from now, possibly without this app to read it for you.
  return JSON.stringify(backup, null, 2);
}

/* --------------------------------------------------------------- validate */

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const str = (v: unknown): v is string => typeof v === 'string';
const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nullableStr = (v: unknown): v is string | null => v === null || str(v);
const nullableNum = (v: unknown): v is number | null => v === null || num(v);
// A column added after a backup was written is simply absent from its rows.
// Absent and null both mean "not set", so a validator for such a column must
// accept both — requiring the key would silently reject every row of an
// older, perfectly good backup.
const absentableStr = (v: unknown): v is string | null | undefined =>
  v === undefined || nullableStr(v);
const absentableNum = (v: unknown): v is number | null | undefined =>
  v === undefined || nullableNum(v);

type RowCheck = (row: Record<string, unknown>) => boolean;

const CHECKS: { [K in keyof BackupTables]: RowCheck } = {
  dailyRead: (r) =>
    str(r.day) &&
    num(r.energy) &&
    num(r.mood) &&
    num(r.clarity) &&
    num(r.tension) &&
    num(r.createdAt) &&
    num(r.updatedAt) &&
    absentableStr(r.weather),
  sleepLog: (r) => str(r.day) && num(r.hours) && num(r.createdAt) && num(r.updatedAt),
  entry: (r) => str(r.body) && str(r.day) && num(r.createdAt) && num(r.updatedAt),
  trainingSession: (r) =>
    str(r.day) &&
    str(r.kind) &&
    nullableNum(r.minutes) &&
    nullableNum(r.intensity) &&
    nullableStr(r.note) &&
    num(r.closedGap) &&
    num(r.createdAt),
  gearSession: (r) =>
    str(r.gear) &&
    str(r.day) &&
    num(r.startedAt) &&
    nullableNum(r.endedAt) &&
    num(r.completed) &&
    num(r.createdAt),
  sitSession: (r) =>
    str(r.depth) &&
    str(r.day) &&
    num(r.startedAt) &&
    nullableNum(r.endedAt) &&
    num(r.completed) &&
    num(r.createdAt),
  course: (r) => str(r.day) && str(r.heading) && num(r.createdAt) && num(r.updatedAt),
  roadPoneglyph: (r) =>
    str(r.title) &&
    nullableStr(r.why) &&
    num(r.createdAt) &&
    num(r.updatedAt) &&
    nullableNum(r.retiredAt),
  poneglyph: (r) =>
    num(r.roadCreatedAt) &&
    str(r.title) &&
    str(r.state) &&
    str(r.openedOn) &&
    nullableStr(r.closedOn) &&
    nullableStr(r.reason) &&
    // `unit` arrived in schema v9 and is absent from every earlier export;
    // `portBy` in v16, same story.
    absentableStr(r.unit) &&
    absentableStr(r.portBy) &&
    num(r.createdAt) &&
    num(r.updatedAt),
  flagValue: (r) => str(r.text) && str(r.setOn) && num(r.createdAt) && num(r.updatedAt),
  eternalPose: (r) =>
    str(r.text) &&
    str(r.setOn) &&
    // Both null on the bearing currently held, and both absent from every
    // export made before schema v10.
    absentableStr(r.endedOn) &&
    absentableStr(r.reason) &&
    num(r.createdAt) &&
    num(r.updatedAt),
  taskMove: (r) =>
    num(r.taskCreatedAt) &&
    str(r.fromDay) &&
    nullableStr(r.toDay) &&
    str(r.madeOn) &&
    str(r.reason) &&
    num(r.createdAt),
  // The kind is checked as a string, not as the union. A file written by a
  // later version with a fifth kind in it must still import — `isKind` decides
  // on the way out of the database, and an unknown one lands as a loop rather
  // than throwing away somebody's row.
  seaPrism: (r) => str(r.kind) && str(r.name) && num(r.createdAt) && nullableNum(r.retiredAt),
  seaPrismHit: (r) => num(r.stoneKey) && str(r.day) && num(r.createdAt),
  breakItem: (r) => str(r.name) && num(r.createdAt) && nullableNum(r.retiredAt),
  urge: (r) => num(r.breakKey) && str(r.day) && str(r.outcome) && num(r.createdAt),
  // The line is never empty — an emptied field deletes the row rather than
  // storing a blank, so a blank one arriving in an import is not a day
  // somebody said nothing about, it is a malformed row.
  // An empty body is a real note somebody opened and has not filled in yet —
  // unlike a day's end line, where empty means the row should not exist.
  note: (r) => str(r.title) && str(r.body) && num(r.createdAt) && num(r.updatedAt),
  dayEnd: (r) =>
    str(r.day) &&
    str(r.line) &&
    (r.line as string).length > 0 &&
    num(r.createdAt) &&
    num(r.updatedAt),
  // `at` is minutes past midnight; anything off the clock is not a bell.
  bell: (r) =>
    str(r.title) &&
    str(r.day) &&
    num(r.at) &&
    (r.at as number) >= 0 &&
    (r.at as number) <= 1439 &&
    num(r.createdAt),
  sounding: (r) => num(r.islandKey) && num(r.value) && str(r.day) && num(r.createdAt),
  carried: (r) =>
    str(r.name) &&
    nullableStr(r.relationship) &&
    nullableStr(r.theirDream) &&
    nullableStr(r.whatICarry) &&
    num(r.createdAt) &&
    num(r.updatedAt),
  task: (r) =>
    str(r.title) &&
    num(r.minutes) &&
    nullableStr(r.committedFor) &&
    nullableNum(r.doneAt) &&
    // rhythmKey arrived in schema v7, islandKey and watch in v8: all three
    // are absent from rows exported before their columns existed.
    absentableNum(r.rhythmKey) &&
    absentableNum(r.islandKey) &&
    absentableStr(r.watch) &&
    // priority and dueBy arrived in schema v14.
    absentableNum(r.priority) &&
    absentableStr(r.dueBy) &&
    num(r.createdAt),
  rhythm: (r) =>
    str(r.title) &&
    num(r.minutes) &&
    str(r.kind) &&
    str(r.weekdays) &&
    num(r.intervalDays) &&
    num(r.createdAt) &&
    num(r.updatedAt) &&
    nullableNum(r.retiredAt),
  sailing: (r) =>
    str(r.day) && str(r.heading) && nullableStr(r.note) && num(r.createdAt) && num(r.updatedAt),
  setting: (r) => str(r.key) && str(r.value),
};

export type ParseResult =
  { ok: true; backup: Backup; rejected: Record<string, number> } | { ok: false; error: string };

/**
 * Parse and validate a backup file.
 *
 * The envelope is strict — a wrong format or a newer version is refused
 * outright rather than half-read. Individual rows are checked and bad ones are
 * counted and dropped, so one corrupt row cannot cost you the other 2,000.
 * The counts are reported, never swallowed.
 */
export function parseBackup(text: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' };
  }

  if (!isObject(raw)) return { ok: false, error: 'That file is not a Haki backup.' };
  if (raw.format !== BACKUP_FORMAT) {
    return { ok: false, error: 'That file is not a Haki backup.' };
  }
  if (!num(raw.version)) return { ok: false, error: 'This backup has no version.' };
  if (raw.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `This backup was written by a newer version of Haki (format ${raw.version}, this build reads ${BACKUP_VERSION}). Update the app first.`,
    };
  }
  if (!isObject(raw.data)) return { ok: false, error: 'This backup has no data.' };

  const data: BackupTables = { ...EMPTY_TABLES };
  const rejected: Record<string, number> = {};

  for (const table of TABLE_NAMES) {
    const rows = (raw.data as Record<string, unknown>)[table];
    if (rows === undefined) continue; // an older export simply lacked this table
    if (!Array.isArray(rows)) {
      return { ok: false, error: `The "${table}" section of this backup is malformed.` };
    }

    const good: unknown[] = [];
    let bad = 0;
    for (const row of rows) {
      if (isObject(row) && CHECKS[table](row)) good.push(row);
      else bad += 1;
    }
    if (bad > 0) rejected[table] = bad;
    // Checked above by CHECKS[table]; the cast is the boundary of validation.
    (data[table] as unknown[]) = good;
  }

  return {
    ok: true,
    rejected,
    backup: {
      format: BACKUP_FORMAT,
      version: raw.version,
      exportedAt: num(raw.exportedAt) ? raw.exportedAt : 0,
      schemaVersion: num(raw.schemaVersion) ? raw.schemaVersion : 0,
      data,
    },
  };
}

/* ------------------------------------------------------------------ merge */

/**
 * Natural keys. These are what make a second import a no-op.
 *
 * `daily_read` and `sleep_log` are one row per day by definition. The others
 * have no natural key, so `createdAt` stands in — it is a millisecond stamp
 * from the moment the row was written, which is unique in practice and, more
 * importantly, stable across an export/import round trip.
 */
export const KEYS: { [K in keyof BackupTables]: (row: BackupTables[K][number]) => string } = {
  dailyRead: (r) => r.day,
  sleepLog: (r) => r.day,
  entry: (r) => String(r.createdAt),
  trainingSession: (r) => String(r.createdAt),
  gearSession: (r) => String(r.startedAt),
  sitSession: (r) => String(r.startedAt),
  // One heading per day by definition, exactly like a Daily Read.
  course: (r) => r.day,
  roadPoneglyph: (r) => String(r.createdAt),
  poneglyph: (r) => String(r.createdAt),
  rhythm: (r) => String(r.createdAt),
  // One per day by definition, exactly like a course.
  sailing: (r) => r.day,
  flagValue: (r) => String(r.createdAt),
  eternalPose: (r) => String(r.createdAt),
  // A title at a time on a day is the bell — two at the same minute with
  // the same name are the same appointment imported twice.
  bell: (r) => `${r.day} ${r.at} ${r.title}`,
  // One move per task per moment; the stamp is what makes it unique.
  taskMove: (r) => `${r.taskCreatedAt} ${r.createdAt}`,
  // One evening per day.
  dayEnd: (r) => String(r.day),
  // Two notes written in the same millisecond would be the same note.
  note: (r) => String(r.createdAt),
  // A stone is its name under its kind — the same person named twice is one
  // stone, however many devices the file has been through.
  seaPrism: (r) => `${r.kind} ${r.name}`,
  // One tap per stone per moment.
  seaPrismHit: (r) => `${r.stoneKey} ${r.createdAt}`,
  // A break is its name, however many devices the file has been through.
  breakItem: (r) => String(r.name),
  // One urge per break per moment.
  urge: (r) => `${r.breakKey} ${r.createdAt}`,
  sounding: (r) => String(r.createdAt),
  carried: (r) => `${r.name} ${r.createdAt}`,
  task: (r) => String(r.createdAt),
  setting: (r) => r.key,
};

export type MergePlan<T> = {
  insert: T[];
  /** Already present in the target, left untouched. */
  skipped: number;
};

/**
 * Decide what actually needs writing.
 *
 * Rows already in the target are skipped rather than overwritten: the local
 * copy is treated as the newer one. Duplicates *within* the incoming file are
 * also collapsed, so a hand-merged backup cannot insert the same row twice.
 */
export function planMerge<T>(
  existing: T[],
  incoming: T[],
  key: (row: T) => string,
): MergePlan<T> {
  const seen = new Set(existing.map(key));
  const insert: T[] = [];
  let skipped = 0;

  for (const row of incoming) {
    const k = key(row);
    if (seen.has(k)) {
      skipped += 1;
      continue;
    }
    seen.add(k);
    insert.push(row);
  }

  return { insert, skipped };
}

export function countRows(data: BackupTables): number {
  return TABLE_NAMES.reduce((total, table) => total + data[table].length, 0);
}

/* --------------------------------------------------------------- markdown */

/**
 * The journal as plain Markdown — one file, newest first.
 *
 * Not re-importable and not meant to be. This is the copy you can still read
 * in ten years with no app, no database, and no JSON parser.
 */
export function entriesToMarkdown(entries: EntryBackup[], exportedAt: number): string {
  const sorted = [...entries].sort((a, b) => b.createdAt - a.createdAt);
  const stamp = new Date(exportedAt).toISOString().slice(0, 10);

  const header = `# Ship's Log\n\n_${sorted.length} ${
    sorted.length === 1 ? 'entry' : 'entries'
  }, exported ${stamp}._\n`;

  const body = sorted
    .map((entry) => {
      const time = new Date(entry.createdAt).toISOString().slice(11, 16);
      return `\n---\n\n## ${entry.day} ${time}\n\n${entry.body.trim() || '_(empty)_'}\n`;
    })
    .join('');

  return header + body;
}
