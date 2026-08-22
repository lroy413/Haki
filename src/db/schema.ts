import { index, integer, real, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/**
 * One row per day. Four dials, thirty seconds.
 * Unique on `day` so re-reading simply updates today rather than stacking rows.
 */
export const dailyRead = sqliteTable(
  'daily_read',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    energy: integer('energy').notNull(),
    mood: integer('mood').notNull(),
    clarity: integer('clarity').notNull(),
    tension: integer('tension').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('daily_read_day_idx').on(t.day)],
);

/** Keyed by the morning you woke up. See `domain/cascade.ts`. */
export const sleepLog = sqliteTable(
  'sleep_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    hours: real('hours').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('sleep_log_day_idx').on(t.day)],
);

/** The Log. Markdown in, Markdown out — never a proprietary blob. */
export const entry = sqliteTable('entry', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  body: text('body').notNull().default(''),
  day: text('day').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/**
 * Habits exist in v0 only so the cascade can name what is at risk.
 * The Hardness engine, logging UI, and Ryuo tier are v1.
 */
export const habit = sqliteTable('habit', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  isKeystone: integer('is_keystone', { mode: 'boolean' }).notNull().default(false),
  /** Set on a downstream habit to point at the keystone that carries it. */
  keystoneId: integer('keystone_id'),
  createdAt: integer('created_at').notNull(),
  archivedAt: integer('archived_at'),
});

/**
 * Training sessions. The downstream end of the keystone cascade.
 *
 * Several a day is legitimate, so this is not unique on `day` the way the
 * Daily Read is — a morning lift and an evening run are two sessions.
 */
export const trainingSession = sqliteTable(
  'training_session',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    kind: text('kind').notNull(),
    minutes: integer('minutes'),
    intensity: integer('intensity'),
    note: text('note'),
    /** The gap in days this session closed, if it landed as a Return. */
    closedGap: integer('closed_gap').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('training_session_day_idx').on(t.day)],
);

/**
 * Inherited Will — the people whose dreams you carry.
 *
 * A record, not a mechanic. Nothing reads this table to nag, score, or
 * motivate; the surfacing logic (at Road Poneglyph milestones and at the
 * weekly Setting Sail) lands in v2. Until then it is somewhere to write it
 * down, opened only on the days you choose to open it.
 */
export const carried = sqliteTable('carried', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  relationship: text('relationship'),
  /** What they wanted. */
  theirDream: text('their_dream'),
  /** What of it you're carrying forward. */
  whatICarry: text('what_i_carry'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

/** Small key/value bag. Typed accessors live in `settings.ts`. */
export const setting = sqliteTable('setting', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type DailyReadRow = typeof dailyRead.$inferSelect;
export type SleepRow = typeof sleepLog.$inferSelect;
export type EntryRow = typeof entry.$inferSelect;
export type HabitRow = typeof habit.$inferSelect;
export type CarriedRow = typeof carried.$inferSelect;
export type TrainingSessionRow = typeof trainingSession.$inferSelect;
