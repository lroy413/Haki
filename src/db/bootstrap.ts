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
  {
    version: 5,
    up: `
      CREATE TABLE IF NOT EXISTS sit_session (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        depth       TEXT    NOT NULL,
        day         TEXT    NOT NULL,
        started_at  INTEGER NOT NULL,
        ended_at    INTEGER,
        completed   INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sit_session_day_idx ON sit_session (day);

      CREATE TABLE IF NOT EXISTS course (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        day         TEXT    NOT NULL,
        heading     TEXT    NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS course_day_idx ON course (day);
    `,
  },
  {
    version: 6,
    up: `
      CREATE TABLE IF NOT EXISTS road_poneglyph (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        why         TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL,
        retired_at  INTEGER
      );

      CREATE TABLE IF NOT EXISTS poneglyph (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        road_created_at  INTEGER NOT NULL,
        title            TEXT    NOT NULL,
        state            TEXT    NOT NULL DEFAULT 'open',
        opened_on        TEXT    NOT NULL,
        closed_on        TEXT,
        reason           TEXT,
        created_at       INTEGER NOT NULL,
        updated_at       INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS poneglyph_road_idx ON poneglyph (road_created_at);
    `,
  },
  {
    version: 7,
    up: `
      CREATE TABLE IF NOT EXISTS rhythm (
        id             INTEGER PRIMARY KEY AUTOINCREMENT,
        title          TEXT    NOT NULL,
        minutes        INTEGER NOT NULL DEFAULT 15,
        kind           TEXT    NOT NULL DEFAULT 'weekdays',
        weekdays       TEXT    NOT NULL DEFAULT '',
        interval_days  INTEGER NOT NULL DEFAULT 1,
        created_at     INTEGER NOT NULL,
        updated_at     INTEGER NOT NULL,
        retired_at     INTEGER
      );

      -- Which rhythm a struck task came from, by the rhythm's created_at.
      -- Nullable: most tasks are one-offs and belong to nothing.
      ALTER TABLE task ADD COLUMN rhythm_key INTEGER;
      CREATE INDEX IF NOT EXISTS task_rhythm_idx ON task (rhythm_key);

      CREATE TABLE IF NOT EXISTS sailing (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        day         TEXT    NOT NULL,
        heading     TEXT    NOT NULL DEFAULT '',
        note        TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS sailing_day_idx ON sailing (day);
    `,
  },
  {
    version: 8,
    up: `
      -- The island a struck task came from, by the poneglyph's created_at —
      -- the same natural-key linking every other child row here uses.
      -- Nullable: most tasks are not born on the Log Pose.
      ALTER TABLE task ADD COLUMN island_key INTEGER;
      CREATE INDEX IF NOT EXISTS task_island_idx ON task (island_key);

      -- Which watch of the day a task is placed in ('morning' | 'afternoon'
      -- | 'evening'). Nullable: an unplaced task is normal, not incomplete.
      ALTER TABLE task ADD COLUMN watch TEXT;

      -- The one optional word after the dials. See domain/weather.ts.
      ALTER TABLE daily_read ADD COLUMN weather TEXT;
    `,
  },
  {
    version: 9,
    up: `
      -- The Flag: three to five values, in the owner's own words. Nothing
      -- here is ever checked off, so there is no state column and no date
      -- beyond when it was raised.
      CREATE TABLE IF NOT EXISTS flag_value (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text        TEXT    NOT NULL,
        set_on      TEXT    NOT NULL,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      -- What an island's soundings are measured in ('kg', 'words', '£').
      -- Its presence is what makes an island numeric by nature; null is the
      -- ordinary case and means the island is done-or-not.
      ALTER TABLE poneglyph ADD COLUMN unit TEXT;

      -- One reading, taken whenever you wanted to know. No target column,
      -- and deliberately nowhere to put one. See domain/soundings.ts.
      CREATE TABLE IF NOT EXISTS sounding (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        island_key   INTEGER NOT NULL,
        value        REAL    NOT NULL,
        day          TEXT    NOT NULL,
        created_at   INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS sounding_island_idx ON sounding (island_key);
    `,
  },
  {
    version: 10,
    up: `
      -- The Eternal Pose: the one bearing that never recalibrates.
      --
      -- Rows are bearings, not settings. The one being held is the row with
      -- ended_on NULL, and there is at most one of those; taking a new
      -- bearing ends the old one in place rather than overwriting it,
      -- because the record of what you used to steer by is worth keeping.
      --
      -- Deliberately absent, and not to be added later: any column that
      -- could carry a tick, a count, a target or a last-kept date. This is
      -- read, never tracked — see domain/eternal.ts.
      CREATE TABLE IF NOT EXISTS eternal_pose (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        text        TEXT    NOT NULL,
        set_on      TEXT    NOT NULL,
        -- The day it stopped being the one, and the line written when it
        -- was let go. Both null while it is held.
        ended_on    TEXT,
        reason      TEXT,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );
    `,
  },
  {
    version: 11,
    up: `
      -- The Bells — things that happen at a time on the clock.
      --
      -- The one shape the app could not hold: everything else here is elastic
      -- (a task is for today, a rhythm comes round, an island takes weeks) and
      -- none of it happens at three o'clock. Without this the day's shape was
      -- a picture with its fixed points missing, which is the one way such a
      -- picture can actively mislead.
      --
      -- Deliberately absent, and not to be added later: any column that could
      -- carry a done flag, a count, a snooze or a notification time. A bell is
      -- a mark on a chart. Ticking one off would make the day's fixed points
      -- into a checklist, and a bell that has passed is not missed — it simply
      -- sits astern. See domain/bells.ts.
      CREATE TABLE IF NOT EXISTS bell (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        title       TEXT    NOT NULL,
        day         TEXT    NOT NULL,
        -- Minutes past midnight, 0..1439. Stored as a number rather than a
        -- string so ordering is arithmetic and needs no parsing.
        at          INTEGER NOT NULL,
        created_at  INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS bell_day ON bell (day, at);
    `,
  },
  {
    version: 12,
    up: `
      -- Why a task moved, or why it was let go.
      --
      -- The Log Pose's asymmetry, one size down: striking a task is one tap,
      -- and moving it or letting it go costs a written line. A decision you
      -- cannot be bothered to write down is drift wearing a different coat.
      --
      -- Kept rather than discarded, because the pattern is the point — for
      -- somebody whose stated problem is avoidance, what keeps getting moved
      -- and what was said about it is the most useful record in the app.
      --
      -- \`to_day\` is null when the task was let go rather than carried.
      -- Deliberately absent: any count, score, or flag derived from how often
      -- a task has moved. The rows are the record; nothing tallies them.
      CREATE TABLE IF NOT EXISTS task_move (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id     INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
        from_day    TEXT    NOT NULL,
        to_day      TEXT,
        reason      TEXT    NOT NULL,
        created_at  INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS task_move_task ON task_move (task_id, created_at);
    `,
  },
  {
    version: 13,
    up: `
      -- How the day went, in one line, in your own words.
      --
      -- One row per day and revisable, because an evening you come back to at
      -- eleven is the same evening. Deliberately not a journal entry: the
      -- journal is the free space and a ritual that silently wrote into it
      -- would make the journal a place things appear rather than a place you
      -- write. Deliberately not a rating either — there is no scale here, no
      -- score, and nothing that could be charted into a verdict about a run
      -- of days.
      CREATE TABLE IF NOT EXISTS day_end (
        day        TEXT PRIMARY KEY,
        line       TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Which day the decision was made on, as distinct from which day the
      -- task was scheduled for.
      --
      -- Day's End asks about the moves *you made today*, and carrying a task
      -- that had been at sea since Thursday is one of those — its from_day is
      -- Thursday, so the obvious query missed exactly the moves the ritual
      -- most wants to ask about. A timestamp cannot answer this either: a day
      -- here does not end at midnight (see voyage.dayStartHour), so the day
      -- is stamped by the writer, which is the only place that knows.
      ALTER TABLE task_move ADD COLUMN made_on TEXT NOT NULL DEFAULT '';

      CREATE INDEX IF NOT EXISTS task_move_made ON task_move (made_on);
    `,
  },
  {
    version: 14,
    up: `
      -- What is pressing: the flag, and the date it has to be done by.
      --
      -- due_by is deliberately not committed_for. One is when the thing has
      -- to be done and the other is when you plan to do it, and keeping them
      -- apart is what lets the app say when the two disagree — a task due
      -- Friday and planned for Saturday is the exact case worth catching, and
      -- an app with one date field cannot see it at all.
      --
      -- priority is one flag and not a scale. A three-level priority system
      -- is a system you spend Sunday administering, and the middle level
      -- always comes to mean "not really".
      --
      -- Deliberately absent: any count of how many dates have gone past, and
      -- any stored notion of "late". The date and today are both known, so
      -- everything else is derived — and a stored late flag is a fact about a
      -- person that outlives the day it was true.
      ALTER TABLE task ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE task ADD COLUMN due_by TEXT;

      CREATE INDEX IF NOT EXISTS task_due ON task (due_by);
    `,
  },
  {
    version: 15,
    up: `
      -- Loose pages: writing that is not about a day.
      --
      -- Deliberately not an entry. The journal is dated — it lives in the
      -- Logbook, it is listed by day, it feeds the acts a day is measured by,
      -- and "a year ago today" reads it back. A note is none of those things:
      -- a list, a draft, a thing you looked up, kept because you will want it
      -- again and not because of when you wrote it.
      --
      -- Folding the two together would have cost both. Notes would start
      -- counting toward how much a day was used, which is untrue, and the
      -- Logbook would fill with shopping lists.
      --
      -- The title is optional and usually empty: firstLine() in
      -- domain/markdown.ts reads one off the body, so writing a note never
      -- starts with naming it.
      CREATE TABLE IF NOT EXISTS note (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT    NOT NULL DEFAULT '',
        body       TEXT    NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS note_updated ON note (updated_at);
    `,
  },
  {
    version: 16,
    up: `
      -- A port of call: the day an island actually has to be reached by.
      --
      -- Optional by design and rare by intent. Most islands have no date —
      -- that is the whole point of a journey with no denominator, and an app
      -- that asked for one every time would turn the Log Pose into a project
      -- plan. But some things really do have a day attached, and before this
      -- the only place to put one was the title.
      --
      -- Same machinery as a task's due_by one size up: it counts toward, it
      -- keeps counting after, and it is never red. See domain/pressing.ts.
      ALTER TABLE poneglyph ADD COLUMN port_by TEXT;
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
