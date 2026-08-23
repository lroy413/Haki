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
 * Tasks — the load you are carrying.
 *
 * `committedFor` is the day a task was pulled into, or null while it sits in
 * the backlog. `minutes` is always present: an estimate is what makes the day
 * plannable, and a task without one cannot be weighed against capacity.
 */
export const task = sqliteTable(
  'task',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    minutes: integer('minutes').notNull().default(15),
    committedFor: text('committed_for'),
    doneAt: integer('done_at'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('task_committed_idx').on(t.committedFor)],
);

/**
 * One row per focus session. `started_at` is the source of truth for elapsed
 * time — nothing ticks, so closing the app mid-gear loses nothing.
 *
 * `completed` is the flag the costs hang off: only a finished session triggers
 * the Gear 3 cooldown or the Gear 4 lockout.
 */
export const gearSession = sqliteTable(
  'gear_session',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    gear: text('gear').notNull(),
    day: text('day').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    completed: integer('completed').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('gear_session_day_idx').on(t.day)],
);

/**
 * One sit per row. Same shape as `gear_session` and for the same reason:
 * `started_at` is the truth about elapsed time, so the phone can lock, the app
 * can be killed, and the answer is still right when it comes back.
 *
 * Unlike a gear, nothing hangs off `completed` — sitting has no costs. It is
 * recorded because ending early and running out are different things, and the
 * screen says something different for each.
 */
export const sitSession = sqliteTable(
  'sit_session',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    depth: text('depth').notNull(),
    day: text('day').notNull(),
    startedAt: integer('started_at').notNull(),
    endedAt: integer('ended_at'),
    completed: integer('completed').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [index('sit_session_day_idx').on(t.day)],
);

/**
 * The day's heading. One row per day, so setting it again replaces it rather
 * than stacking — a course is the current answer, not a history of answers.
 *
 * Rows for days in the future are ordinary and expected: setting tomorrow's
 * heading before bed is the flow this is actually for.
 */
export const course = sqliteTable(
  'course',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    day: text('day').notNull(),
    heading: text('heading').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [uniqueIndex('course_day_idx').on(t.day)],
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
export type TaskRow = typeof task.$inferSelect;
export type GearSessionRow = typeof gearSession.$inferSelect;
export type SitSessionRow = typeof sitSession.$inferSelect;
export type CourseRow = typeof course.$inferSelect;
