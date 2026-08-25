import { and, desc, eq, gte, inArray, isNotNull, lte } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { addDays, todayKey, type DayKey } from '../domain/date';
import type { DailyRead } from '../domain/willReserve';
import type { SleepNight } from '../domain/cascade';
import type { Session } from '../domain/training';
import { isWatch, type Task, type Watch } from '../domain/tasks';
import type { GearName, GearSession } from '../domain/gears';
import type { PracticeDepth, SitSession } from '../domain/stillness';
import { normaliseHeading, type Course } from '../domain/course';
import { appendLine, isWritable } from '../domain/logbook';
import type { Poneglyph, PoneglyphState, Road } from '../domain/logpose';
import { normaliseValue, type Value } from '../domain/flag';
import { normaliseUnit, type Sounding } from '../domain/soundings';
import { asternOn, type Astern } from '../domain/astern';
import { decodeWeekdays, encodeWeekdays, type Rhythm, type RhythmKind } from '../domain/rhythm';
import type { WeekDay } from '../domain/sail';
import type { DayRecord } from '../domain/foresight';
import { NO_ACTS } from '../domain/hardening';
import { minutesToday as gearMinutes } from '../domain/gears';
import { minutesToday as sitMinutes } from '../domain/stillness';
import {
  carried,
  course,
  dailyRead,
  entry,
  flagValue,
  gearSession,
  poneglyph,
  sounding,
  rhythm,
  roadPoneglyph,
  sailing,
  sitSession,
  setting,
  sleepLog,
  task,
  trainingSession,
  type CarriedRow,
  type EntryRow,
  type SailingRow,
  type TaskRow,
  type TrainingSessionRow,
} from './schema';

export type Db = ExpoSQLiteDatabase<Record<string, never>>;

const now = () => Date.now();

/* -------------------------------------------------------------- daily read */

export async function getRead(
  db: Db,
  day: DayKey = todayKey(),
): Promise<(DailyRead & { weather: string | null }) | null> {
  const rows = await db.select().from(dailyRead).where(eq(dailyRead.day, day)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    energy: row.energy,
    mood: row.mood,
    clarity: row.clarity,
    tension: row.tension,
    weather: row.weather,
  };
}

export async function saveRead(
  db: Db,
  read: DailyRead,
  day: DayKey = todayKey(),
  weather: string | null = null,
): Promise<void> {
  const t = now();
  await db
    .insert(dailyRead)
    .values({ day, ...read, weather, createdAt: t, updatedAt: t })
    .onConflictDoUpdate({
      target: dailyRead.day,
      set: { ...read, weather, updatedAt: t },
    });
}

/* ------------------------------------------------------------------- sleep */

export async function saveSleep(
  db: Db,
  hours: number,
  day: DayKey = todayKey(),
): Promise<void> {
  const t = now();
  await db
    .insert(sleepLog)
    .values({ day, hours, createdAt: t, updatedAt: t })
    .onConflictDoUpdate({ target: sleepLog.day, set: { hours, updatedAt: t } });
}

/** Most recent first, covering the trailing `days` window. */
export async function recentSleep(
  db: Db,
  days = 7,
  from: DayKey = todayKey(),
): Promise<SleepNight[]> {
  const since = addDays(from, -(days - 1));
  return db
    .select({ day: sleepLog.day, hours: sleepLog.hours })
    .from(sleepLog)
    .where(and(gte(sleepLog.day, since), lte(sleepLog.day, from)))
    .orderBy(desc(sleepLog.day));
}

/* ------------------------------------------------------------------- tasks */

/**
 * Every task, done ones included.
 *
 * The load calculation needs the finished ones too — the time they took still
 * came out of today.
 */
export async function allTasks(db: Db): Promise<Task[]> {
  const rows = await db.select().from(task).orderBy(task.createdAt);
  return rows.map(toTask);
}

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    minutes: row.minutes,
    committedFor: row.committedFor,
    doneAt: row.doneAt,
    rhythmKey: row.rhythmKey,
    islandKey: row.islandKey,
    watch: row.watch !== null && isWatch(row.watch) ? row.watch : null,
    createdAt: row.createdAt,
  };
}

export async function addTask(
  db: Db,
  title: string,
  minutes: number,
  committedFor: DayKey | null = null,
  opts: { islandKey?: number | null; watch?: Watch | null } = {},
): Promise<void> {
  await db.insert(task).values({
    title: title.trim(),
    minutes,
    committedFor,
    islandKey: opts.islandKey ?? null,
    watch: opts.watch ?? null,
    createdAt: now(),
  });
}

/**
 * What has been struck under each of these islands: count and minutes, keyed
 * by the poneglyph's `createdAt`. Counts only — the wake carries no
 * denominator, same as everything else on the Log Pose.
 */
export async function wakesFor(
  db: Db,
  islandKeys: number[],
): Promise<Map<number, { struck: number; minutes: number }>> {
  const out = new Map<number, { struck: number; minutes: number }>();
  if (islandKeys.length === 0) return out;
  const rows = await db
    .select()
    .from(task)
    .where(and(isNotNull(task.doneAt), inArray(task.islandKey, islandKeys)));
  for (const row of rows) {
    const key = row.islandKey as number;
    const wake = out.get(key) ?? { struck: 0, minutes: 0 };
    wake.struck += 1;
    wake.minutes += row.minutes;
    out.set(key, wake);
  }
  return out;
}

/** Pull into a day, or push back to the backlog with null. */
export async function commitTask(db: Db, id: number, day: DayKey | null): Promise<void> {
  await db.update(task).set({ committedFor: day }).where(eq(task.id, id));
}

/** Toggle rather than one-way: finishing something by mistake must be undoable. */
export async function setTaskDone(db: Db, id: number, done: boolean): Promise<void> {
  await db
    .update(task)
    .set({ doneAt: done ? now() : null })
    .where(eq(task.id, id));
}

export async function updateTask(
  db: Db,
  id: number,
  patch: { title?: string; minutes?: number },
): Promise<void> {
  await db.update(task).set(patch).where(eq(task.id, id));
}

export async function deleteTask(db: Db, id: number): Promise<void> {
  await db.delete(task).where(eq(task.id, id));
}

/* ---------------------------------------------------------------- training */

/**
 * Every session, most recent first.
 *
 * Deliberately unbounded: the consistency window and gap detection both need
 * the full history to be correct, and a personal training log is a few
 * thousand rows after a decade. Paginate the *display*, never this.
 */
export async function allSessions(db: Db): Promise<Session[]> {
  const rows = await db
    .select({
      day: trainingSession.day,
      kind: trainingSession.kind,
      minutes: trainingSession.minutes,
      intensity: trainingSession.intensity,
      note: trainingSession.note,
    })
    .from(trainingSession)
    .orderBy(desc(trainingSession.day));
  return rows;
}

export async function recentSessions(db: Db, limit = 30): Promise<TrainingSessionRow[]> {
  return db
    .select()
    .from(trainingSession)
    .orderBy(desc(trainingSession.day), desc(trainingSession.createdAt))
    .limit(limit);
}

export async function logSession(
  db: Db,
  session: Omit<Session, 'day'> & { day?: DayKey },
  closedGap = 0,
): Promise<void> {
  await db.insert(trainingSession).values({
    day: session.day ?? todayKey(),
    kind: session.kind,
    minutes: session.minutes,
    intensity: session.intensity,
    note: session.note,
    closedGap,
    createdAt: now(),
  });
}

export async function deleteSession(db: Db, id: number): Promise<void> {
  await db.delete(trainingSession).where(eq(trainingSession.id, id));
}

/* ---------------------------------------------------------------- gears */

function toGearSession(row: {
  gear: string;
  day: string;
  startedAt: number;
  endedAt: number | null;
  completed: number;
}): GearSession {
  return {
    gear: row.gear as GearName,
    day: row.day as DayKey,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    completed: row.completed === 1,
  };
}

/**
 * Every gear session for a day.
 *
 * Availability is decided across the whole day rather than from the latest
 * row, because both costs — the Gear 3 cooldown and the Gear 4 lockout — reach
 * forward from whenever they were paid.
 */
export async function gearSessionsOn(db: Db, day: DayKey = todayKey()): Promise<GearSession[]> {
  const rows = await db
    .select()
    .from(gearSession)
    .where(eq(gearSession.day, day))
    .orderBy(gearSession.startedAt);
  return rows.map(toGearSession);
}

/**
 * Every gear session across a window, for the Armament figure.
 *
 * Grouped by day at the call site rather than here: the domain wants days, the
 * database only knows rows, and the seam between those two belongs above this
 * function rather than inside it.
 */
export async function gearSessionsBetween(
  db: Db,
  from: DayKey,
  to: DayKey,
): Promise<GearSession[]> {
  const rows = await db
    .select()
    .from(gearSession)
    .where(and(gte(gearSession.day, from), lte(gearSession.day, to)))
    .orderBy(gearSession.startedAt);
  return rows.map(toGearSession);
}

/**
 * The session still open, if there is one — searched across yesterday too.
 *
 * A gear started at 11:40pm belongs to the day it started on, but it is still
 * running after midnight and the app has to be able to find it.
 */
export async function openGearSession(
  db: Db,
): Promise<{ id: number; session: GearSession } | null> {
  const today = todayKey();
  const rows = await db
    .select()
    .from(gearSession)
    .where(and(gte(gearSession.day, addDays(today, -1)), lte(gearSession.day, today)))
    .orderBy(desc(gearSession.startedAt));
  const row = rows.find((r) => r.endedAt === null);
  return row ? { id: row.id, session: toGearSession(row) } : null;
}

export async function startGear(db: Db, gear: GearName): Promise<number> {
  const stamp = now();
  const inserted = await db
    .insert(gearSession)
    .values({ gear, day: todayKey(), startedAt: stamp, createdAt: stamp })
    .returning({ id: gearSession.id });
  return inserted[0].id;
}

/**
 * Close a session.
 *
 * `completed` is passed in rather than worked out here, so that running out
 * and stopping early are never confused: only the first one costs anything.
 */
export async function endGear(db: Db, id: number, completed: boolean): Promise<void> {
  await db
    .update(gearSession)
    .set({ endedAt: now(), completed: completed ? 1 : 0 })
    .where(eq(gearSession.id, id));
}

/* -------------------------------------------------------------- stillness */

function toSitSession(row: typeof sitSession.$inferSelect): SitSession {
  return {
    depth: row.depth as PracticeDepth,
    day: row.day as DayKey,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
    completed: row.completed === 1,
  };
}

/** Every sit for a day. Several is ordinary — sitting has no daily maximum. */
export async function sitSessionsOn(db: Db, day: DayKey = todayKey()): Promise<SitSession[]> {
  const rows = await db
    .select()
    .from(sitSession)
    .where(eq(sitSession.day, day))
    .orderBy(sitSession.startedAt);
  return rows.map(toSitSession);
}

/** Every sit across a window, for the Observation figure. */
export async function sitSessionsBetween(
  db: Db,
  from: DayKey,
  to: DayKey,
): Promise<SitSession[]> {
  const rows = await db
    .select()
    .from(sitSession)
    .where(and(gte(sitSession.day, from), lte(sitSession.day, to)))
    .orderBy(sitSession.startedAt);
  return rows.map(toSitSession);
}

/**
 * The sit still open, if there is one — searched across yesterday too, for the
 * same reason a gear is: one started at 11:55pm is still running at midnight.
 */
export async function openSitSession(
  db: Db,
): Promise<{ id: number; session: SitSession } | null> {
  const today = todayKey();
  const rows = await db
    .select()
    .from(sitSession)
    .where(and(gte(sitSession.day, addDays(today, -1)), lte(sitSession.day, today)))
    .orderBy(desc(sitSession.startedAt));
  const row = rows.find((r) => r.endedAt === null);
  return row ? { id: row.id, session: toSitSession(row) } : null;
}

/**
 * Start a sit, and hand back the session as well as its id.
 *
 * `/sit` is both the picker and the clock, so it needs the running session in
 * hand the moment it starts one — returning it here saves a read-back, and
 * saves the screen from assembling a stand-in row of its own.
 */
export async function startSit(
  db: Db,
  depth: PracticeDepth,
): Promise<{ id: number; session: SitSession }> {
  const stamp = now();
  const day = todayKey();
  const inserted = await db
    .insert(sitSession)
    .values({ depth, day, startedAt: stamp, createdAt: stamp })
    .returning({ id: sitSession.id });
  return {
    id: inserted[0].id,
    session: { depth, day, startedAt: stamp, endedAt: null, completed: false },
  };
}

/**
 * Close a sit.
 *
 * `completed` costs nothing either way — nothing in stillness has a cost. It
 * is recorded so the screen can tell the difference between running out and
 * getting up, which are different things to say.
 */
export async function endSit(db: Db, id: number, completed: boolean): Promise<void> {
  await db
    .update(sitSession)
    .set({ endedAt: now(), completed: completed ? 1 : 0 })
    .where(eq(sitSession.id, id));
}

/* ----------------------------------------------------------------- course */

export async function getCourse(db: Db, day: DayKey = todayKey()): Promise<Course | null> {
  const rows = await db.select().from(course).where(eq(course.day, day)).limit(1);
  const row = rows[0];
  return row ? { day: row.day as DayKey, heading: row.heading } : null;
}

/** Today's and tomorrow's, which is every heading a screen ever shows at once. */
export async function upcomingCourses(db: Db, from: DayKey = todayKey()): Promise<Course[]> {
  const rows = await db
    .select()
    .from(course)
    .where(and(gte(course.day, from), lte(course.day, addDays(from, 1))))
    .orderBy(course.day);
  return rows.map((row) => ({ day: row.day as DayKey, heading: row.heading }));
}

/**
 * Set — or clear — a day's heading.
 *
 * An empty heading deletes the row rather than storing a blank one, so "is
 * there a course" stays a single question with a single answer.
 */
export async function setCourse(db: Db, day: DayKey, heading: string): Promise<void> {
  const text = normaliseHeading(heading);
  if (!text) {
    await db.delete(course).where(eq(course.day, day));
    return;
  }
  const t = now();
  await db
    .insert(course)
    .values({ day, heading: text, createdAt: t, updatedAt: t })
    .onConflictDoUpdate({ target: course.day, set: { heading: text, updatedAt: t } });
}

/* ------------------------------------------------------------------ the log */

/**
 * Today's entry bodies, and nothing else.
 *
 * The provider only ever wanted a count of non-empty entries for one day, and
 * was getting it by pulling two hundred full entries and filtering in memory —
 * on the web that is the single heaviest thing in a refresh, and a refresh
 * happens on every screen focus and every task struck.
 */
export async function entriesOn(db: Db, day: DayKey = todayKey()): Promise<string[]> {
  const rows = await db.select({ body: entry.body }).from(entry).where(eq(entry.day, day));
  return rows.map((row) => row.body);
}

export async function listEntries(db: Db, limit = 100): Promise<EntryRow[]> {
  return db.select().from(entry).orderBy(desc(entry.createdAt)).limit(limit);
}

export async function getEntry(db: Db, id: number): Promise<EntryRow | null> {
  const rows = await db.select().from(entry).where(eq(entry.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function createEntry(db: Db, body = ''): Promise<number> {
  const t = now();
  const rows = await db
    .insert(entry)
    .values({ body, day: todayKey(), createdAt: t, updatedAt: t })
    .returning({ id: entry.id });
  return rows[0].id;
}

/**
 * The entry today's lines go into — the most recent one, if there is one.
 *
 * Several entries in a day are legitimate (the editor makes a new row every
 * time), so a capture joins the latest rather than inventing a fourth.
 */
export async function todaysEntry(db: Db, day: DayKey = todayKey()): Promise<EntryRow | null> {
  const rows = await db
    .select()
    .from(entry)
    .where(eq(entry.day, day))
    .orderBy(desc(entry.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * The way in that asks nothing: one line, folded into today.
 *
 * Returns the row it landed in, or null when the line was blank — the caller
 * hands over whatever is in the field and this decides whether that is
 * anything, so an empty field can never create an empty entry.
 */
export async function logLine(db: Db, line: string): Promise<number | null> {
  if (!isWritable(line)) return null;
  const existing = await todaysEntry(db);
  if (existing) {
    await updateEntry(db, existing.id, appendLine(existing.body, line));
    return existing.id;
  }
  return createEntry(db, appendLine('', line));
}

export async function updateEntry(db: Db, id: number, body: string): Promise<void> {
  await db.update(entry).set({ body, updatedAt: now() }).where(eq(entry.id, id));
}

export async function deleteEntry(db: Db, id: number): Promise<void> {
  await db.delete(entry).where(eq(entry.id, id));
}

/* -------------------------------------------------------- inherited will */

export async function listCarried(db: Db): Promise<CarriedRow[]> {
  return db.select().from(carried).orderBy(desc(carried.createdAt));
}

export async function upsertCarried(
  db: Db,
  value: Omit<CarriedRow, 'id' | 'createdAt' | 'updatedAt'> & { id?: number },
): Promise<void> {
  const t = now();
  if (value.id != null) {
    await db
      .update(carried)
      .set({
        name: value.name,
        relationship: value.relationship,
        theirDream: value.theirDream,
        whatICarry: value.whatICarry,
        updatedAt: t,
      })
      .where(eq(carried.id, value.id));
    return;
  }
  await db.insert(carried).values({
    name: value.name,
    relationship: value.relationship,
    theirDream: value.theirDream,
    whatICarry: value.whatICarry,
    createdAt: t,
    updatedAt: t,
  });
}

export async function deleteCarried(db: Db, id: number): Promise<void> {
  await db.delete(carried).where(eq(carried.id, id));
}

/* ----------------------------------------------------------------- rhythm */

function toRhythm(row: {
  id: number;
  title: string;
  minutes: number;
  kind: string;
  weekdays: string;
  intervalDays: number;
  createdAt: number;
  retiredAt: number | null;
}): Rhythm {
  return {
    id: row.id,
    key: row.createdAt,
    title: row.title,
    minutes: row.minutes,
    kind: row.kind as RhythmKind,
    weekdays: decodeWeekdays(row.weekdays),
    intervalDays: row.intervalDays,
    retired: row.retiredAt !== null,
  };
}

/** Every rhythm, retired ones included — the history has to keep making sense. */
export async function listRhythms(db: Db): Promise<Rhythm[]> {
  const rows = await db.select().from(rhythm).orderBy(rhythm.createdAt);
  return rows.map(toRhythm);
}

export async function addRhythm(
  db: Db,
  value: Pick<Rhythm, 'title' | 'minutes' | 'kind' | 'weekdays' | 'intervalDays'>,
): Promise<void> {
  const t = now();
  await db.insert(rhythm).values({
    title: value.title.trim(),
    minutes: value.minutes,
    kind: value.kind,
    weekdays: encodeWeekdays(value.weekdays),
    intervalDays: value.intervalDays,
    createdAt: t,
    updatedAt: t,
  });
}

export async function updateRhythm(
  db: Db,
  id: number,
  patch: Partial<Pick<Rhythm, 'title' | 'minutes' | 'kind' | 'weekdays' | 'intervalDays'>>,
): Promise<void> {
  const next: Record<string, unknown> = { updatedAt: now() };
  if (patch.title !== undefined) next.title = patch.title.trim();
  if (patch.minutes !== undefined) next.minutes = patch.minutes;
  if (patch.kind !== undefined) next.kind = patch.kind;
  if (patch.weekdays !== undefined) next.weekdays = encodeWeekdays(patch.weekdays);
  if (patch.intervalDays !== undefined) next.intervalDays = patch.intervalDays;
  await db.update(rhythm).set(next).where(eq(rhythm.id, id));
}

/** Retire, or bring back. Never a delete — struck tasks still point at it. */
export async function retireRhythm(db: Db, id: number, retired: boolean): Promise<void> {
  await db
    .update(rhythm)
    .set({ retiredAt: retired ? now() : null, updatedAt: now() })
    .where(eq(rhythm.id, id));
}

/**
 * The last day each rhythm was actually struck.
 *
 * Read off the tasks it produced rather than stored on the rhythm, so there is
 * exactly one source of truth and un-striking a task moves the answer back on
 * its own.
 */
export async function lastDoneByRhythm(db: Db): Promise<Map<number, DayKey>> {
  const rows = await db
    .select()
    .from(task)
    .where(and(isNotNull(task.rhythmKey), isNotNull(task.doneAt)));
  const last = new Map<number, DayKey>();
  for (const row of rows) {
    if (row.rhythmKey === null || row.committedFor === null) continue;
    const seen = last.get(row.rhythmKey);
    if (!seen || row.committedFor > seen) last.set(row.rhythmKey, row.committedFor);
  }
  return last;
}

/**
 * Take a rhythm's offer for a day: one struck task, written now.
 *
 * The task is created already done, because the offer *is* the tap — there is
 * no state where a rhythm sits committed-but-undone. Idempotent, so a double
 * tap on a slow write cannot write it twice.
 */
export async function strikeRhythm(
  db: Db,
  value: Pick<Rhythm, 'key' | 'title' | 'minutes'>,
  day: DayKey = todayKey(),
): Promise<void> {
  const existing = await db
    .select()
    .from(task)
    .where(and(eq(task.rhythmKey, value.key), eq(task.committedFor, day)))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(task).values({
    title: value.title,
    minutes: value.minutes,
    committedFor: day,
    doneAt: now(),
    rhythmKey: value.key,
    createdAt: now(),
  });
}

/**
 * Give the offer back.
 *
 * Deletes the row rather than clearing `doneAt`: a rhythm is either taken
 * today or standing today, and a committed-but-undone rhythm row is exactly
 * the rotting artefact this model exists to not create.
 */
export async function unstrikeRhythm(
  db: Db,
  key: number,
  day: DayKey = todayKey(),
): Promise<void> {
  await db.delete(task).where(and(eq(task.rhythmKey, key), eq(task.committedFor, day)));
}

/* -------------------------------------------------------------- foresight */

/**
 * The whole history, shaped for `domain/foresight.ts`.
 *
 * One query per table and one pass to assemble, because this reads months
 * rather than a week and per-day queries would be hundreds of round trips
 * through expo-sqlite's single channel.
 *
 * Sleep is attached by its own key without shifting: `sleep_log` is keyed by
 * the morning you woke, so the hours on a day are already the night *before*
 * that day's read. That is the one relationship in the whole engine whose
 * direction cannot be argued with, and it is free.
 *
 * Only days that carry a Daily Read come back. A day with acts and no read
 * cannot answer any question Foresight asks, and including it would mean
 * counting days into a comparison that contribute nothing to either side.
 */
export async function historyForForesight(db: Db, from: DayKey): Promise<DayRecord[]> {
  const [reads, sleeps, tasks, sessions, gears, sits, entries] = await Promise.all([
    db.select().from(dailyRead).where(gte(dailyRead.day, from)),
    db.select().from(sleepLog).where(gte(sleepLog.day, from)),
    db
      .select()
      .from(task)
      .where(and(isNotNull(task.doneAt), gte(task.committedFor, from))),
    db.select().from(trainingSession).where(gte(trainingSession.day, from)),
    db.select().from(gearSession).where(gte(gearSession.day, from)),
    db.select().from(sitSession).where(gte(sitSession.day, from)),
    db.select().from(entry).where(gte(entry.day, from)),
  ]);

  const days = new Map<DayKey, DayRecord>();
  for (const row of reads) {
    days.set(row.day, {
      day: row.day,
      read: {
        energy: row.energy,
        mood: row.mood,
        clarity: row.clarity,
        tension: row.tension,
      },
      sleepHours: null,
      sat: false,
      trained: false,
      struck: 0,
      gearMinutes: 0,
      wrote: false,
    });
  }

  const at = (key: string | null): DayRecord | undefined =>
    key === null ? undefined : days.get(key);

  for (const row of sleeps) {
    const day = at(row.day);
    if (day) day.sleepHours = row.hours;
  }
  for (const row of tasks) {
    const day = at(row.committedFor);
    if (day) day.struck += 1;
  }
  for (const row of sessions) {
    const day = at(row.day);
    if (day) day.trained = true;
  }
  // A blank row left behind by opening the editor is not writing something.
  for (const row of entries) {
    const day = at(row.day);
    if (day && row.body.trim().length > 0) day.wrote = true;
  }

  const stamp = now();
  for (const [key, group] of groupByDay(gears)) {
    const day = at(key);
    if (day) day.gearMinutes += gearMinutes(group.map(toGearSession), stamp);
  }
  for (const [key, group] of groupByDay(sits)) {
    const day = at(key);
    if (day) day.sat = sitMinutes(group.map(toSitSession), stamp) > 0;
  }

  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/* ---------------------------------------------------------------- sailing */

/**
 * Every day in a range, with what it had in it.
 *
 * One query per table rather than per day — a week is seven days but a screen
 * asking for seven days' worth of seven tables would be forty-nine round trips
 * through expo-sqlite's single channel, which is exactly how the web build
 * gets slow. Days with nothing in them are present with zeros, so the caller
 * can count what a week held without having to know which days exist.
 */
export async function actsBetween(db: Db, from: DayKey, to: DayKey): Promise<WeekDay[]> {
  const [reads, entries, tasks, sessions, gears, sits, courses] = await Promise.all([
    db
      .select()
      .from(dailyRead)
      .where(and(gte(dailyRead.day, from), lte(dailyRead.day, to))),
    db
      .select()
      .from(entry)
      .where(and(gte(entry.day, from), lte(entry.day, to))),
    db
      .select()
      .from(task)
      .where(
        and(isNotNull(task.doneAt), gte(task.committedFor, from), lte(task.committedFor, to)),
      ),
    db
      .select()
      .from(trainingSession)
      .where(and(gte(trainingSession.day, from), lte(trainingSession.day, to))),
    gearSessionsBetween(db, from, to),
    sitSessionsBetween(db, from, to),
    db
      .select()
      .from(course)
      .where(and(gte(course.day, from), lte(course.day, to))),
  ]);

  const days = new Map<DayKey, WeekDay>();
  const dayOf = (key: DayKey): WeekDay => {
    const seen = days.get(key);
    if (seen) return seen;
    const fresh: WeekDay = { day: key, ...NO_ACTS };
    days.set(key, fresh);
    return fresh;
  };

  for (let day = from; day <= to; day = addDays(day, 1)) dayOf(day);

  for (const row of reads) dayOf(row.day).read = true;
  for (const row of courses) dayOf(row.day).course = true;
  // A blank row left behind by opening the editor is not an entry.
  for (const row of entries) if (row.body.trim().length > 0) dayOf(row.day).entries += 1;
  for (const row of tasks) if (row.committedFor) dayOf(row.committedFor).struck += 1;
  for (const row of sessions) dayOf(row.day).trained += 1;

  const stamp = now();
  for (const [key, group] of groupByDay(gears))
    dayOf(key).gearMinutes += gearMinutes(group, stamp);
  for (const [key, group] of groupByDay(sits))
    dayOf(key).satMinutes += sitMinutes(group, stamp);

  return [...days.values()].sort((a, b) => a.day.localeCompare(b.day));
}

/** Group day-stamped rows by their day. */
function groupByDay<T extends { day: string }>(rows: T[]): Map<DayKey, T[]> {
  const out = new Map<DayKey, T[]>();
  for (const row of rows) {
    const group = out.get(row.day);
    if (group) group.push(row);
    else out.set(row.day, [row]);
  }
  return out;
}

export async function lastSailing(db: Db): Promise<SailingRow | null> {
  const rows = await db.select().from(sailing).orderBy(desc(sailing.day)).limit(1);
  return rows[0] ?? null;
}

export async function listSailings(db: Db, limit = 12): Promise<SailingRow[]> {
  return db.select().from(sailing).orderBy(desc(sailing.day)).limit(limit);
}

/** One per day, so setting sail twice is one decision restated. */
export async function setSail(
  db: Db,
  heading: string,
  note: string | null,
  day: DayKey = todayKey(),
): Promise<void> {
  const t = now();
  await db
    .insert(sailing)
    .values({
      day,
      heading: heading.trim(),
      note: note?.trim() || null,
      createdAt: t,
      updatedAt: t,
    })
    .onConflictDoUpdate({
      target: sailing.day,
      set: { heading: heading.trim(), note: note?.trim() || null, updatedAt: t },
    });
}

/* ---------------------------------------------------------------- log pose */

/**
 * The dream lives in `setting` rather than a table of its own.
 *
 * There is exactly one, it is a single string, and a table holding one row
 * forever is a table. Two keys, and it rides the existing backup wiring for
 * free — `setting` already dedupes on `key`.
 */
export const DREAM_KEY = 'logpose.dream';
export const DREAM_SET_KEY = 'logpose.dreamSetOn';

export async function getDream(db: Db): Promise<{ text: string; setOn: DayKey } | null> {
  const text = await readSetting(db, DREAM_KEY);
  if (!text?.trim()) return null;
  return { text: text.trim(), setOn: (await readSetting(db, DREAM_SET_KEY)) ?? todayKey() };
}

/**
 * Name it, or restate it.
 *
 * The day it was first named is kept and never moved by a restatement. A dream
 * is allowed to be said better; the date it started is a fact about the
 * voyage, and rewriting it would quietly erase how long you have been at this.
 */
export async function setDream(db: Db, text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;
  await writeSetting(db, DREAM_KEY, trimmed);
  if (!(await readSetting(db, DREAM_SET_KEY))) {
    await writeSetting(db, DREAM_SET_KEY, todayKey());
  }
}

function toRoad(row: {
  id: number;
  title: string;
  why: string | null;
  createdAt: number;
  retiredAt: number | null;
}): Road {
  return {
    id: row.id,
    key: row.createdAt,
    title: row.title,
    why: row.why,
    retired: row.retiredAt !== null,
  };
}

/** Every Road Poneglyph, retired ones included — the history has to survive. */
export async function listRoads(db: Db): Promise<Road[]> {
  const rows = await db.select().from(roadPoneglyph).orderBy(roadPoneglyph.createdAt);
  return rows.map(toRoad);
}

export async function addRoad(db: Db, title: string, why: string | null): Promise<void> {
  const t = now();
  await db.insert(roadPoneglyph).values({
    title: title.trim(),
    why: why?.trim() || null,
    createdAt: t,
    updatedAt: t,
  });
}

export async function updateRoad(
  db: Db,
  id: number,
  patch: { title?: string; why?: string | null },
): Promise<void> {
  await db
    .update(roadPoneglyph)
    .set({ ...patch, updatedAt: now() })
    .where(eq(roadPoneglyph.id, id));
}

/**
 * Retire a pillar, or bring it back.
 *
 * Never a delete. The islands reached under it stay reached, and a front you
 * stepped away from in March is part of the record of the year.
 */
export async function retireRoad(db: Db, id: number, retired: boolean): Promise<void> {
  await db
    .update(roadPoneglyph)
    .set({ retiredAt: retired ? now() : null, updatedAt: now() })
    .where(eq(roadPoneglyph.id, id));
}

export async function listPoneglyphs(db: Db): Promise<Poneglyph[]> {
  const rows = await db.select().from(poneglyph).orderBy(poneglyph.createdAt);
  return rows.map((row) => ({
    id: row.id,
    roadKey: row.roadCreatedAt,
    key: row.createdAt,
    title: row.title,
    state: row.state as PoneglyphState,
    openedOn: row.openedOn,
    closedOn: row.closedOn,
    reason: row.reason,
    unit: row.unit,
  }));
}

/**
 * Open an island under a pillar.
 *
 * The WIP limit is enforced here as well as in the UI, because "one at a time"
 * that only holds while the screen is on the screen is not a limit. A second
 * open island under the same pillar is refused and says so.
 */
export async function openPoneglyph(
  db: Db,
  roadKey: number,
  title: string,
  day: DayKey = todayKey(),
): Promise<void> {
  const existing = await db
    .select()
    .from(poneglyph)
    .where(and(eq(poneglyph.roadCreatedAt, roadKey), eq(poneglyph.state, 'open')))
    .limit(1);
  if (existing.length > 0) return;

  const t = now();
  await db.insert(poneglyph).values({
    roadCreatedAt: roadKey,
    title: title.trim(),
    state: 'open',
    openedOn: day,
    createdAt: t,
    updatedAt: t,
  });
}

/**
 * Close an island — reached, or sailed past with a reason.
 *
 * One function for both because they are the same event from the app's side: a
 * loop closing on purpose. The difference is what gets written down, and that
 * difference is the whole intervention.
 */
export async function closePoneglyph(
  db: Db,
  id: number,
  state: 'reached' | 'passed',
  reason: string | null = null,
  day: DayKey = todayKey(),
): Promise<void> {
  await db
    .update(poneglyph)
    .set({
      state,
      closedOn: day,
      reason: state === 'passed' ? reason?.trim() || null : null,
      updatedAt: now(),
    })
    .where(eq(poneglyph.id, id));
}

/** Undo a close. Marking something reached by mistake has to be reversible. */
export async function reopenPoneglyph(db: Db, id: number): Promise<void> {
  await db
    .update(poneglyph)
    .set({ state: 'open', closedOn: null, reason: null, updatedAt: now() })
    .where(eq(poneglyph.id, id));
}

export async function renamePoneglyph(db: Db, id: number, title: string): Promise<void> {
  await db
    .update(poneglyph)
    .set({ title: title.trim(), updatedAt: now() })
    .where(eq(poneglyph.id, id));
}

/* ---------------------------------------------------------------- settings */

export async function readSetting(db: Db, key: string): Promise<string | null> {
  const rows = await db.select().from(setting).where(eq(setting.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function writeSetting(db: Db, key: string, value: string): Promise<void> {
  await db
    .insert(setting)
    .values({ key, value })
    .onConflictDoUpdate({ target: setting.key, set: { value } });
}

/* -------------------------------------------------------------- the flag */

export async function listFlag(db: Db): Promise<Value[]> {
  const rows = await db.select().from(flagValue).orderBy(flagValue.createdAt);
  return rows.map((row) => ({
    id: row.id,
    key: row.createdAt,
    text: row.text,
    setOn: row.setOn,
  }));
}

export async function addValue(db: Db, text: string): Promise<void> {
  const clean = normaliseValue(text);
  if (!clean) return;
  const t = now();
  await db
    .insert(flagValue)
    .values({ text: clean, setOn: todayKey(), createdAt: t, updatedAt: t });
}

export async function updateValue(db: Db, id: number, text: string): Promise<void> {
  const clean = normaliseValue(text);
  if (!clean) return;
  await db.update(flagValue).set({ text: clean, updatedAt: now() }).where(eq(flagValue.id, id));
}

/**
 * A value comes down rather than being retired.
 *
 * Everything else in this app keeps its history — a retired pillar keeps its
 * islands, a stopped rhythm keeps its struck tasks — because those are
 * records of things that happened. A value you no longer hold is not a
 * record of anything; keeping a list of former values would be a monument to
 * having changed your mind, which is the opposite of what a flag is for.
 */
export async function removeValue(db: Db, id: number): Promise<void> {
  await db.delete(flagValue).where(eq(flagValue.id, id));
}

/* ------------------------------------------------------ astern in the log */

/**
 * What was written on this date in an earlier year, if anything.
 *
 * Reads the whole log rather than a window: the match is on month and day
 * across every year there is, and a date-shaped SQL query for that is less
 * legible than filtering in the domain, on a table that holds one row per
 * entry per lifetime.
 */
export async function asternToday(db: Db, today: DayKey = todayKey()): Promise<Astern | null> {
  const rows = await db.select({ id: entry.id, day: entry.day, body: entry.body }).from(entry);
  return asternOn(rows, today);
}

/* -------------------------------------------------------------- soundings */

export async function soundingsFor(db: Db, islandKey: number): Promise<Sounding[]> {
  const rows = await db
    .select()
    .from(sounding)
    .where(eq(sounding.islandKey, islandKey))
    .orderBy(sounding.createdAt);
  return rows.map((row) => ({
    id: row.id,
    islandKey: row.islandKey,
    value: row.value,
    day: row.day,
    createdAt: row.createdAt,
  }));
}

export async function takeSounding(db: Db, islandKey: number, value: number): Promise<void> {
  await db.insert(sounding).values({ islandKey, value, day: todayKey(), createdAt: now() });
}

export async function dropSounding(db: Db, id: number): Promise<void> {
  await db.delete(sounding).where(eq(sounding.id, id));
}

/**
 * The most recent reading for each of these islands, keyed by island.
 *
 * One query for the whole tab rather than one per card. Only the latest is
 * returned: the Conqueror's tab shows where you are, and the line behind you
 * belongs on the pillar screen where there is room to read it.
 */
export async function latestSoundings(
  db: Db,
  islandKeys: number[],
): Promise<Map<number, Sounding>> {
  const out = new Map<number, Sounding>();
  if (islandKeys.length === 0) return out;
  const rows = await db
    .select()
    .from(sounding)
    .where(inArray(sounding.islandKey, islandKeys))
    .orderBy(sounding.createdAt);
  for (const row of rows) {
    // Ordered oldest first, so the last write for a key wins.
    out.set(row.islandKey, {
      id: row.id,
      islandKey: row.islandKey,
      value: row.value,
      day: row.day,
      createdAt: row.createdAt,
    });
  }
  return out;
}

/** Set or clear what an island's readings are measured in. */
export async function setIslandUnit(db: Db, id: number, unit: string | null): Promise<void> {
  const clean = unit === null ? null : normaliseUnit(unit) || null;
  await db.update(poneglyph).set({ unit: clean, updatedAt: now() }).where(eq(poneglyph.id, id));
}
