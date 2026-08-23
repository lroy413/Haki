import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Schema creation, versioned by SQLite's own `user_version` pragma.
 *
 * v0 deliberately skips the drizzle-kit migration pipeline. That pipeline needs
 * a Babel inline-import plugin and a Metro config change to load generated .sql
 * at runtime, which is three extra moving parts to maintain before the schema
 * has changed even once. Drizzle still provides the typed query layer above
 * this — only the DDL is hand-rolled.
 *
 * To add a migration: append a new entry to MIGRATIONS. Never edit an existing
 * one; a shipped migration has already run on a real device holding real
 * journal entries.
 */

const MIGRATIONS: { version: number; up: string }[] = [
  {
    version: 1,
    up: `
      CREATE TABLE IF NOT EXISTS daily_read (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        day         TEXT    NOT NULL,
        energy      INTEGER NOT NULL,
        mood        INTEGER NOT NULL,
        clarity     INTEGER NOT NULL,
        tension     INTEGER NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS daily_read_day_idx ON daily_read (day);

      CREATE TABLE IF NOT EXISTS sleep_log (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        day         TEXT    NOT NULL,
        hours       REAL    NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS sleep_log_day_idx ON sleep_log (day);

      CREATE TABLE IF NOT EXISTS entry (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        body        TEXT    NOT NULL DEFAULT '',
        day         TEXT    NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS entry_created_idx ON entry (created_at DESC);

      CREATE TABLE IF NOT EXISTS habit (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        name         TEXT    NOT NULL,
        is_keystone  INTEGER NOT NULL DEFAULT 0,
        keystone_id  INTEGER REFERENCES habit(id) ON DELETE SET NULL,
        created_at   INTEGER NOT NULL,
        archived_at  INTEGER
      );

      CREATE TABLE IF NOT EXISTS carried (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        name          TEXT    NOT NULL,
        relationship  TEXT,
        their_dream   TEXT,
        what_i_carry  TEXT,
        created_at    INTEGER NOT NULL,
        updated_at    INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS setting (
        key    TEXT PRIMARY KEY,
        value  TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    up: `
      CREATE TABLE IF NOT EXISTS training_session (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        day         TEXT    NOT NULL,
        kind        TEXT    NOT NULL,
        minutes     INTEGER,
        intensity   INTEGER,
        note        TEXT,
        closed_gap  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS training_session_day_idx ON training_session (day);
    `,
  },
  {
    version: 3,
    up: `
      CREATE TABLE IF NOT EXISTS task (
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        title         TEXT    NOT NULL,
        minutes       INTEGER NOT NULL DEFAULT 15,
        committed_for TEXT,
        done_at       INTEGER,
        created_at    INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS task_committed_idx ON task (committed_for);
    `,
  },
  {
    version: 4,
    up: `
      CREATE TABLE IF NOT EXISTS gear_session (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        gear        TEXT    NOT NULL,
        day         TEXT    NOT NULL,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS gear_session_day_idx ON gear_session (day);
    `,
  },
];

export const LATEST_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;

export async function bootstrap(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const current = row?.user_version ?? 0;

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.up);
    });
    // PRAGMA user_version does not accept a bound parameter, and `version` is
    // an integer literal from the table above rather than anything user-typed.
    await db.execAsync(`PRAGMA user_version = ${migration.version};`);
  }
}
