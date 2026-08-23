import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { addDays, todayKey, type DayKey } from '../domain/date';
import type { DailyRead } from '../domain/willReserve';
import type { SleepNight } from '../domain/cascade';
import type { Session } from '../domain/training';
import type { Task } from '../domain/tasks';
import type { GearName, GearSession } from '../domain/gears';
import type { SitDepth, SitSession } from '../domain/stillness';
import { normaliseHeading, type Course } from '../domain/course';
import { appendLine, isWritable } from '../domain/logbook';
import {
  carried,
  course,
  dailyRead,
  entry,
  gearSession,
  sitSession,
  setting,
  sleepLog,
  task,
  trainingSession,
  type CarriedRow,
  type EntryRow,
  type TaskRow,
  type TrainingSessionRow,
} from './schema';

export type Db = ExpoSQLiteDatabase<Record<string, never>>;

const now = () => Date.now();

/* -------------------------------------------------------------- daily read */

export async function getRead(db: Db, day: DayKey = todayKey()): Promise<DailyRead | null> {
  const rows = await db.select().from(dailyRead).where(eq(dailyRead.day, day)).limit(1);
  const row = rows[0];
  if (!row) return null;
  return { energy: row.energy, mood: row.mood, clarity: row.clarity, tension: row.tension };
}

export async function saveRead(
  db: Db,
  read: DailyRead,
  day: DayKey = todayKey(),
): Promise<void> {
  const t = now();
  await db
    .insert(dailyRead)
    .values({ day, ...read, createdAt: t, updatedAt: t })
    .onConflictDoUpdate({
      target: dailyRead.day,
      set: { ...read, updatedAt: t },
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
    createdAt: row.createdAt,
  };
}

export async function addTask(
  db: Db,
  title: string,
  minutes: number,
  committedFor: DayKey | null = null,
): Promise<void> {
  await db.insert(task).values({
    title: title.trim(),
    minutes,
    committedFor,
    createdAt: now(),
  });
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
    depth: row.depth as SitDepth,
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
  depth: SitDepth,
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
