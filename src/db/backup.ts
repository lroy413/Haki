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
import { carried, dailyRead, entry, setting, sleepLog, trainingSession } from './schema';

/**
 * Reading every table out, and merging one back in.
 *
 * Row `id`s are deliberately not exported. They are autoincrement values that
 * mean nothing outside the database that issued them — carrying them across
 * would only invite collisions on the far side. Identity comes from the natural
 * keys in `domain/backup.ts`.
 */

export async function readAllTables(db: Db): Promise<BackupTables> {
  const [reads, sleeps, entries, sessions, people, settings] = await Promise.all([
    db.select().from(dailyRead).orderBy(desc(dailyRead.day)),
    db.select().from(sleepLog).orderBy(desc(sleepLog.day)),
    db.select().from(entry).orderBy(desc(entry.createdAt)),
    db.select().from(trainingSession).orderBy(desc(trainingSession.day)),
    db.select().from(carried).orderBy(desc(carried.createdAt)),
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
    carried: people.map((r) => ({
      name: r.name,
      relationship: r.relationship,
      theirDream: r.theirDream,
      whatICarry: r.whatICarry,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
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
    await db.transaction(async (tx) => {
      switch (table) {
        case 'dailyRead':
          await tx.insert(dailyRead).values(plan.insert as never);
          break;
        case 'sleepLog':
          await tx.insert(sleepLog).values(plan.insert as never);
          break;
        case 'entry':
          await tx.insert(entry).values(plan.insert as never);
          break;
        case 'trainingSession':
          await tx.insert(trainingSession).values(plan.insert as never);
          break;
        case 'carried':
          await tx.insert(carried).values(plan.insert as never);
          break;
        case 'setting':
          await tx.insert(setting).values(plan.insert as never);
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
