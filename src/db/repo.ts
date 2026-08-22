import { and, desc, eq, gte, lte } from 'drizzle-orm';
import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';
import { addDays, todayKey, type DayKey } from '../domain/date';
import type { DailyRead } from '../domain/willReserve';
import type { SleepNight } from '../domain/cascade';
import type { Session } from '../domain/training';
import type { Task } from '../domain/tasks';
import {
  carried,
  dailyRead,
  entry,
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

/* ------------------------------------------------------------------ the log */

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
