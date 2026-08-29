import { desc } from 'drizzle-orm';
import {
  buildBackup,
  KEYS,
  planMerge,
  TABLE_NAMES,
  type Backup,
  type BackupTables,
  type TaskMoveBackup,
} from '../domain/backup';
import { LATEST_VERSION } from './bootstrap';
import type { Db } from './repo';
import {
  carried,
  course,
  flagValue,
  bell,
  eternalPose,
  sounding,
  dailyRead,
  entry,
  gearSession,
  poneglyph,
  rhythm,
  roadPoneglyph,
  sailing,
  setting,
  sitSession,
  sleepLog,
  dayEnd,
  note,
  seaPrism,
  seaPrismHit,
  task,
  taskMove,
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
  const [
    reads,
    sleeps,
    entries,
    sessions,
    gears,
    sits,
    courses,
    roads,
    glyphs,
    rhythms,
    sailings,
    flag,
    poseRows,
    bellRows,
    soundings,
    people,
    tasks,
    moves,
    evenings,
    notes,
    stones,
    stoneHits,
    settings,
  ] = await Promise.all([
    db.select().from(dailyRead).orderBy(desc(dailyRead.day)),
    db.select().from(sleepLog).orderBy(desc(sleepLog.day)),
    db.select().from(entry).orderBy(desc(entry.createdAt)),
    db.select().from(trainingSession).orderBy(desc(trainingSession.day)),
    db.select().from(gearSession).orderBy(desc(gearSession.startedAt)),
    db.select().from(sitSession).orderBy(desc(sitSession.startedAt)),
    db.select().from(course).orderBy(desc(course.day)),
    db.select().from(roadPoneglyph).orderBy(roadPoneglyph.createdAt),
    db.select().from(poneglyph).orderBy(poneglyph.createdAt),
    db.select().from(rhythm).orderBy(rhythm.createdAt),
    db.select().from(sailing).orderBy(desc(sailing.day)),
    db.select().from(flagValue).orderBy(flagValue.createdAt),
    db.select().from(eternalPose).orderBy(eternalPose.createdAt),
    db.select().from(bell).orderBy(bell.day, bell.at),
    db.select().from(sounding).orderBy(sounding.createdAt),
    db.select().from(carried).orderBy(desc(carried.createdAt)),
    db.select().from(task).orderBy(desc(task.createdAt)),
    db.select().from(taskMove).orderBy(taskMove.createdAt),
    db.select().from(dayEnd).orderBy(dayEnd.day),
    db.select().from(note).orderBy(note.createdAt),
    db.select().from(seaPrism).orderBy(seaPrism.createdAt),
    db.select().from(seaPrismHit).orderBy(seaPrismHit.createdAt),
    db.select().from(setting),
  ]);

  return {
    dailyRead: reads.map((r) => ({
      day: r.day,
      energy: r.energy,
      mood: r.mood,
      clarity: r.clarity,
      tension: r.tension,
      weather: r.weather,
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
    sitSession: sits.map((r) => ({
      depth: r.depth,
      day: r.day,
      startedAt: r.startedAt,
      endedAt: r.endedAt,
      completed: r.completed,
      createdAt: r.createdAt,
    })),
    course: courses.map((r) => ({
      day: r.day,
      heading: r.heading,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    roadPoneglyph: roads.map((r) => ({
      title: r.title,
      why: r.why,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      retiredAt: r.retiredAt,
    })),
    poneglyph: glyphs.map((r) => ({
      roadCreatedAt: r.roadCreatedAt,
      title: r.title,
      state: r.state,
      openedOn: r.openedOn,
      closedOn: r.closedOn,
      reason: r.reason,
      unit: r.unit,
      portBy: r.portBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    rhythm: rhythms.map((r) => ({
      title: r.title,
      minutes: r.minutes,
      kind: r.kind,
      weekdays: r.weekdays,
      intervalDays: r.intervalDays,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      retiredAt: r.retiredAt,
    })),
    sailing: sailings.map((r) => ({
      day: r.day,
      heading: r.heading,
      note: r.note,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    flagValue: flag.map((r) => ({
      text: r.text,
      setOn: r.setOn,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    eternalPose: poseRows.map((r) => ({
      text: r.text,
      setOn: r.setOn,
      endedOn: r.endedOn,
      reason: r.reason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    bell: bellRows.map((r) => ({
      title: r.title,
      day: r.day,
      at: r.at,
      createdAt: r.createdAt,
    })),
    sounding: soundings.map((r) => ({
      islandKey: r.islandKey,
      value: r.value,
      day: r.day,
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
      rhythmKey: r.rhythmKey,
      islandKey: r.islandKey,
      watch: r.watch,
      priority: r.priority,
      dueBy: r.dueBy,
      createdAt: r.createdAt,
    })),
    // Moves reference their task by its creation stamp rather than its id,
    // because ids are reassigned on import and the stamp is not.
    taskMove: moves.flatMap((r) => {
      const owner = tasks.find((t) => t.id === r.taskId);
      return owner
        ? [
            {
              taskCreatedAt: owner.createdAt,
              fromDay: r.fromDay,
              toDay: r.toDay,
              madeOn: r.madeOn,
              reason: r.reason,
              createdAt: r.createdAt,
            },
          ]
        : [];
    }),
    dayEnd: evenings.map((r) => ({
      day: r.day,
      line: r.line,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    note: notes.map((r) => ({
      title: r.title,
      body: r.body,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
    seaPrism: stones.map((r) => ({
      kind: r.kind,
      name: r.name,
      createdAt: r.createdAt,
      retiredAt: r.retiredAt,
    })),
    // The hit already carries the stone's stamp in its own column, so unlike
    // a task move there is nothing to look up on the way out or back in.
    seaPrismHit: stoneHits.map((r) => ({
      stoneKey: r.stoneKey,
      day: r.day,
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

/** Every backup table, by the name `TABLE_NAMES` uses. */
const TABLES = {
  dailyRead,
  sleepLog,
  entry,
  trainingSession,
  gearSession,
  sitSession,
  course,
  roadPoneglyph,
  poneglyph,
  rhythm,
  sailing,
  flagValue,
  eternalPose,
  bell,
  sounding,
  carried,
  task,
  taskMove,
  dayEnd,
  note,
  seaPrism,
  seaPrismHit,
  setting,
} as const;

/**
 * Rows per transaction.
 *
 * Two limits hide under one number. Drizzle builds one INSERT for every array
 * it is handed, so an unchunked import of a year's journal is a single
 * statement carrying hundreds of kilobytes. And on the web the whole batch —
 * however it is chunked — wedges once roughly a third of a megabyte has gone
 * through expo-sqlite's channel *without the main thread yielding*: no error,
 * no rejection, the promise never settles and the import sits there looking
 * busy forever. Twelve hundred small tasks import in three seconds; six
 * hundred page-long entries never finish. It is bytes, not rows.
 *
 * So the import is one transaction per chunk with a macrotask yield between
 * them, rather than one transaction per table. What that trades away is
 * per-table atomicity, and the merge design already covers it: import never
 * deletes, never overwrites, and dedupes on natural keys, so a failure
 * part-way leaves a partial import that running the same file again simply
 * completes. Idempotency is the real guarantee here; the transaction was only
 * ever making the window smaller.
 *
 * The floor this cannot go under is one row: a single entry with a novel
 * pasted into it is one statement whatever happens here.
 */
const CHUNK_ROWS = 25;

/** Let the event loop breathe between chunks — see the note above. */
const yieldToEventLoop = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

function chunk<T>(rows: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

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
/**
 * Moves, with their task's id looked up from its creation stamp.
 *
 * Ids are reassigned on import, so the file carries the stamp instead — the
 * same trick `poneglyph.road_created_at` and `sounding.island_key` play, except
 * those two hold the stamp in the column as well and need no translation. This
 * one does, and `taskMove` sits after `task` in `TABLE_NAMES` so the tasks it
 * looks up are already in.
 *
 * A move whose task did not make it is dropped rather than inserted pointing
 * at nothing — the export side already guards the same way round.
 */
async function linkMoves(db: Db, moves: TaskMoveBackup[]) {
  const tasks = await db.select({ id: task.id, createdAt: task.createdAt }).from(task);
  const byStamp = new Map(tasks.map((t) => [t.createdAt, t.id]));
  return moves.flatMap((m) => {
    const taskId = byStamp.get(m.taskCreatedAt);
    return taskId === undefined
      ? []
      : [
          {
            taskId,
            fromDay: m.fromDay,
            toDay: m.toDay,
            madeOn: m.madeOn,
            reason: m.reason,
            createdAt: m.createdAt,
          },
        ];
  });
}

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

    // Almost every backup row *is* its table's row, which is why the import
    // can insert them straight. `task_move` is the exception and it had never
    // been driven: the file carries the task's creation stamp and the column
    // holds the task's id, so every restore of a backup that had ever recorded
    // a move died on that table — which, on a device that has carried a task,
    // is every backup. See `linkMoves`.
    const rows =
      table === 'taskMove' ? await linkMoves(db, plan.insert as TaskMoveBackup[]) : plan.insert;

    inserted[table] = rows.length;
    skipped[table] = plan.skipped;

    if (rows.length === 0) continue;

    // One transaction per chunk, a yield between chunks — the why is on
    // CHUNK_ROWS above.
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
    for (const batch of chunk(rows, CHUNK_ROWS)) {
      db.transaction((tx) => {
        tx.insert(TABLES[table])
          .values(batch as never)
          .run();
      });
      await yieldToEventLoop();
    }
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
