import { desc } from 'drizzle-orm';
import {
  buildBackup,
  KEYS,
  planMerge,
  TABLE_NAMES,
  type Backup,
  type BackupTables,
} from '../domain/backup';
import { LATEST_VERSION } from './bootstrap';
import type { Db } from './repo';
import {
  carried,
  dailyRead,
  entry,
  gearSession,
  setting,
  sleepLog,
  task,
  trainingSession,
} from './schema';

/**
 * Reading every table out, and merging one back in.
 *
 * Row `id`s are deliberately not exported. They are autoincrement values that
 * mean nothing outside the database that issued them — carrying them across
 * would only invite collisions on the far side. Identity comes from the natural
 * keys in `domain/backup.ts`.
 */

export async function readAllTables(db: Db): Promise<BackupTables> {
  const [reads, sleeps, entries, sessions, gears, people, tasks, settings] = await Promise.all([
    db.select().from(dailyRead).orderBy(desc(dailyRead.day)),
    db.select().from(sleepLog).orderBy(desc(sleepLog.day)),
    db.select().from(entry).orderBy(desc(entry.createdAt)),
    db.select().from(trainingSession).orderBy(desc(trainingSession.day)),
    db.select().from(gearSession).orderBy(desc(gearSession.startedAt)),
    db.select().from(carried).orderBy(desc(carried.createdAt)),
    db.select().from(task).orderBy(desc(task.createdAt)),
    db.select().from(setting),
  ]);

  return {
    dailyRead: reads.map((r) => ({
      day: r.day,
      energy: r.energy,
      mood: r.mood,
      clarity: r.clarity,
      tension: r.tension,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    sleepLog: sleeps.map((r) => ({
      day: r.day,
      hours: r.hours,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    entry: entries.map((r) => ({
      body: r.body,
      day: r.day,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    trainingSession: sessions.map((r) => ({
      day: r.day,
      kind: r.kind,
      minutes: r.minutes,
      intensity: r.intensity,
      note: r.note,
      closedGap: r.closedGap,
      createdAt: r.createdAt,
    })),
    gearSession: gears.map((r) => ({
      gear: r.gear,
      day: r.day,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      completed: r.completed,
      createdAt: r.createdAt,
    })),
    carried: people.map((r) => ({
      name: r.name,
      relationship: r.relationship,
      theirDream: r.theirDream,
      whatICarry: r.whatICarry,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    task: tasks.map((r) => ({
      title: r.title,
      minutes: r.minutes,
      committedFor: r.committedFor,
      doneAt: r.doneAt,
      createdAt: r.createdAt,
    })),
    setting: settings.map((r) => ({ key: r.key, value: r.value })),
  };
}

export async function exportBackup(db: Db, now: number): Promise<Backup> {
  return buildBackup(await readAllTables(db), LATEST_VERSION, now);
}

export type ImportReport = {
  inserted: Record<string, number>;
  skipped: Record<string, number>;
  totalInserted: number;
  totalSkipped: number;
};

/**
 * Merge a backup into this database.
 *
 * Nothing is deleted and nothing already present is overwritten — the local
 * copy always wins. Combined with the natural keys, that makes a repeat import
 * a no-op, so re-running one when you are unsure is safe.
 *
 * `voyage.setSailAt` is the one setting held back: it is the day *this* install
 * started counting, and letting an import move it would silently renumber every
 * "day at sea" in the app.
 */
export async function importBackup(db: Db, incoming: BackupTables): Promise<ImportReport> {
  const existing = await readAllTables(db);

  const inserted: Record<string, number> = {};
  const skipped: Record<string, number> = {};

  for (const table of TABLE_NAMES) {
    const source =
      table === 'setting'
        ? incoming.setting.filter((s) => s.key !== 'voyage.setSailAt')
        : incoming[table];

    const plan = planMerge(
      existing[table] as unknown[],
      source as unknown[],
      KEYS[table] as (row: unknown) => string,
    );

    inserted[table] = plan.insert.length;
    skipped[table] = plan.skipped;

    if (plan.insert.length === 0) continue;

    // One transaction per table: a failure part-way cannot leave half a table
    // written.
    //
    // The callback is deliberately NOT async, and neither are the inserts.
    // Drizzle's expo-sqlite driver is synchronous all the way down —
    // prepareSync, executeSync, getAllSync — and its `transaction` runs the
    // callback and takes the returned value without awaiting it. Hand it an
    // async function and it receives a pending promise, commits immediately,
    // and the inserts land *after* the COMMIT: outside the transaction, from
    // microtasks that interleave with anything else querying at the time.
    //
    // On web that also corrupts reads. Every sync call marshals its result
    // through one shared buffer guarded by a lock, so a query firing from a
    // stray microtask can read a payload half-written by another and throw a
    // JSON parse error at a different offset each run. `.run()` executes the
    // statement here and now, which is what the driver was always expecting.
    db.transaction((tx) => {
      switch (table) {
        case 'dailyRead':
          tx.insert(dailyRead)
            .values(plan.insert as never)
            .run();
          break;
        case 'sleepLog':
          tx.insert(sleepLog)
            .values(plan.insert as never)
            .run();
          break;
        case 'entry':
          tx.insert(entry)
            .values(plan.insert as never)
            .run();
          break;
        case 'trainingSession':
          tx.insert(trainingSession)
            .values(plan.insert as never)
            .run();
          break;
        case 'gearSession':
          tx.insert(gearSession)
            .values(plan.insert as never)
            .run();
          break;
        case 'carried':
          tx.insert(carried)
            .values(plan.insert as never)
            .run();
          break;
        case 'task':
          tx.insert(task)
            .values(plan.insert as never)
            .run();
          break;
        case 'setting':
          tx.insert(setting)
            .values(plan.insert as never)
            .run();
          break;
      }
    });
  }

  const sum = (record: Record<string, number>) =>
    Object.values(record).reduce((a, b) => a + b, 0);

  return {
    inserted,
    skipped,
    totalInserted: sum(inserted),
    totalSkipped: sum(skipped),
  };
}
