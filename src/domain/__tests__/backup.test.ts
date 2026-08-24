import { describe, expect, it } from 'vitest';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  buildBackup,
  countRows,
  EMPTY_TABLES,
  entriesToMarkdown,
  KEYS,
  parseBackup,
  planMerge,
  serializeBackup,
  TABLE_NAMES,
  type BackupTables,
  type EntryBackup,
} from '../backup';

const read = (day: string, createdAt = 1) => ({
  day,
  energy: 4,
  mood: 4,
  clarity: 3,
  tension: 2,
  createdAt,
  updatedAt: createdAt,
});

const entry = (createdAt: number, body = 'hello'): EntryBackup => ({
  body,
  day: '2026-08-22',
  createdAt,
  updatedAt: createdAt,
});

const tables = (over: Partial<BackupTables> = {}): BackupTables => ({
  ...EMPTY_TABLES,
  ...over,
});

describe('round trip', () => {
  it('survives serialize then parse unchanged', () => {
    const original = tables({
      dailyRead: [read('2026-08-22')],
      entry: [entry(1000, 'a good day')],
      trainingSession: [
        {
          day: '2026-08-22',
          kind: 'Legs',
          minutes: 50,
          intensity: 4,
          note: null,
          closedGap: 7,
          createdAt: 2000,
        },
      ],
      carried: [
        {
          name: 'Someone',
          relationship: null,
          theirDream: 'a thing',
          whatICarry: null,
          createdAt: 3000,
          updatedAt: 3000,
        },
      ],
      task: [
        {
          title: 'Call the dentist',
          minutes: 10,
          committedFor: '2026-08-22',
          doneAt: null,
          rhythmKey: null,
          createdAt: 4000,
        },
      ],
      setting: [{ key: 'ui.plainMode', value: 'false' }],
    });

    const result = parseBackup(serializeBackup(buildBackup(original, 2, 12345)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.backup.data).toEqual(original);
    expect(result.backup.schemaVersion).toBe(2);
    expect(result.backup.exportedAt).toBe(12345);
    expect(result.rejected).toEqual({});
  });

  it('preserves nulls rather than turning them into undefined', () => {
    const original = tables({
      trainingSession: [
        {
          day: '2026-08-22',
          kind: 'Run',
          minutes: null,
          intensity: null,
          note: null,
          closedGap: 0,
          createdAt: 1,
        },
      ],
    });
    const result = parseBackup(serializeBackup(buildBackup(original, 2, 1)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.trainingSession[0].minutes).toBeNull();
    expect(result.backup.data.trainingSession[0].note).toBeNull();
  });
});

describe('parseBackup rejects bad input safely', () => {
  it('refuses non-JSON', () => {
    const r = parseBackup('not json at all {');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('not valid JSON');
  });

  it('refuses a JSON file that is not a Haki backup', () => {
    const r = parseBackup(JSON.stringify({ hello: 'world' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('not a Haki backup');
  });

  it('refuses a backup from a newer format than this build reads', () => {
    const r = parseBackup(
      JSON.stringify({ format: BACKUP_FORMAT, version: BACKUP_VERSION + 1, data: {} }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('newer version');
  });

  it('refuses a backup with no data section', () => {
    const r = parseBackup(JSON.stringify({ format: BACKUP_FORMAT, version: 1 }));
    expect(r.ok).toBe(false);
  });

  it('refuses a table that is not an array', () => {
    const r = parseBackup(
      JSON.stringify({ format: BACKUP_FORMAT, version: 1, data: { entry: 'nope' } }),
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain('malformed');
  });

  it('drops individual bad rows and reports the count instead of failing whole', () => {
    // One corrupt row must not cost you the other two.
    const r = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        data: {
          entry: [entry(1), { body: 42 }, entry(2), null],
        },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.data.entry).toHaveLength(2);
    expect(r.rejected.entry).toBe(2);
  });

  it('tolerates a table missing entirely, as an older export would have it', () => {
    const r = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        data: { dailyRead: [read('2026-08-22')] },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.data.trainingSession).toEqual([]);
    expect(r.backup.data.dailyRead).toHaveLength(1);
  });

  it('rejects NaN and Infinity, which JSON.parse would never produce but hand-edits might', () => {
    const r = parseBackup(
      JSON.stringify({
        format: BACKUP_FORMAT,
        version: 1,
        data: { sleepLog: [{ day: 'x', hours: null, createdAt: 1, updatedAt: 1 }] },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.data.sleepLog).toHaveLength(0);
  });
});

describe('planMerge', () => {
  const key = (r: { id: string }) => r.id;

  it('inserts everything into an empty target', () => {
    const plan = planMerge([], [{ id: 'a' }, { id: 'b' }], key);
    expect(plan.insert).toHaveLength(2);
    expect(plan.skipped).toBe(0);
  });

  it('skips rows already present rather than overwriting them', () => {
    const plan = planMerge([{ id: 'a' }], [{ id: 'a' }, { id: 'b' }], key);
    expect(plan.insert).toEqual([{ id: 'b' }]);
    expect(plan.skipped).toBe(1);
  });

  it('collapses duplicates inside the incoming file itself', () => {
    const plan = planMerge([], [{ id: 'a' }, { id: 'a' }], key);
    expect(plan.insert).toHaveLength(1);
    expect(plan.skipped).toBe(1);
  });

  it('is idempotent — importing the same file twice writes nothing the second time', () => {
    const incoming = [{ id: 'a' }, { id: 'b' }];
    const first = planMerge([], incoming, key);
    const afterFirst = first.insert;
    const second = planMerge(afterFirst, incoming, key);
    expect(second.insert).toHaveLength(0);
    expect(second.skipped).toBe(2);
  });
});

describe('natural keys', () => {
  it('keys reads and sleep by day, since those are one per day by definition', () => {
    expect(KEYS.dailyRead(read('2026-08-22'))).toBe('2026-08-22');
    expect(KEYS.sleepLog({ day: '2026-08-22', hours: 7, createdAt: 1, updatedAt: 1 })).toBe(
      '2026-08-22',
    );
  });

  it('keys entries by createdAt, which is stable across a round trip', () => {
    expect(KEYS.entry(entry(1234))).toBe('1234');
  });

  it('gives two same-day entries different keys', () => {
    expect(KEYS.entry(entry(1))).not.toBe(KEYS.entry(entry(2)));
  });

  it('keys settings by key so an import updates rather than duplicates', () => {
    expect(KEYS.setting({ key: 'ui.plainMode', value: 'true' })).toBe('ui.plainMode');
  });
});

describe('key hygiene', () => {
  it('builds keys from printable characters only', () => {
    // A stray control byte once landed in the carried separator. It still
    // worked as a separator, which is exactly why nothing caught it.
    const rows = {
      dailyRead: read('2026-08-22'),
      sleepLog: { day: '2026-08-22', hours: 7, createdAt: 1, updatedAt: 1 },
      entry: entry(1),
      trainingSession: {
        day: '2026-08-22',
        kind: 'Legs',
        minutes: null,
        intensity: null,
        note: null,
        closedGap: 0,
        createdAt: 1,
      },
      gearSession: {
        gear: 'second',
        day: '2026-08-22',
        startedAt: 1,
        endedAt: null,
        completed: 0,
        createdAt: 1,
      },
      sitSession: {
        depth: 'presence',
        day: '2026-08-22',
        startedAt: 1,
        endedAt: null,
        completed: 0,
        createdAt: 1,
      },
      course: {
        day: '2026-08-22',
        heading: 'One long thing, properly',
        createdAt: 1,
        updatedAt: 1,
      },
      roadPoneglyph: {
        title: 'Strong enough for the ones along the way',
        why: null,
        createdAt: 1,
        updatedAt: 1,
        retiredAt: null,
      },
      poneglyph: {
        roadCreatedAt: 1,
        title: 'An island',
        state: 'open',
        openedOn: '2026-08-22',
        closedOn: null,
        reason: null,
        createdAt: 1,
        updatedAt: 1,
      },
      carried: {
        name: 'Someone',
        relationship: null,
        theirDream: null,
        whatICarry: null,
        createdAt: 1,
        updatedAt: 1,
      },
      rhythm: {
        title: 'Laundry',
        minutes: 30,
        kind: 'weekdays',
        weekdays: '1,4',
        intervalDays: 1,
        createdAt: 1,
        updatedAt: 1,
        retiredAt: null,
      },
      sailing: {
        day: '2026-08-22',
        heading: 'One long thing, properly',
        note: null,
        createdAt: 1,
        updatedAt: 1,
      },
      task: {
        title: 'Something',
        minutes: 15,
        committedFor: null,
        doneAt: null,
        rhythmKey: null,
        createdAt: 1,
      },
      setting: { key: 'ui.plainMode', value: 'false' },
    };

    for (const table of TABLE_NAMES) {
      const key = (KEYS[table] as (row: unknown) => string)(rows[table]);
      expect(key.length).toBeGreaterThan(0);
      // eslint-disable-next-line no-control-regex
      expect(/[\x00-\x08\x0e-\x1f]/.test(key)).toBe(false);
    }
  });
});

describe('the tables added in v5', () => {
  const sit = (startedAt: number) => ({
    depth: 'presence',
    day: '2026-08-22',
    startedAt,
    endedAt: startedAt + 300_000,
    completed: 1,
    createdAt: startedAt,
  });
  const course = (day: string, heading = 'One long thing, properly') => ({
    day,
    heading,
    createdAt: 1,
    updatedAt: 1,
  });

  it('travels with everything else', () => {
    // Sits and headings are as much a record of the days as the entries are.
    // A backup that quietly dropped them would lose them on the move to
    // native, which is the exact thing this file exists to prevent.
    const original = tables({ sitSession: [sit(1000)], course: [course('2026-08-22')] });
    const result = parseBackup(serializeBackup(buildBackup(original, 5, 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.sitSession).toEqual(original.sitSession);
    expect(result.backup.data.course).toEqual(original.course);
  });

  it('imports a second time without stacking a day a second heading', () => {
    const existing = [course('2026-08-22')];
    // Re-exported after the heading was edited: same day, different text.
    const incoming = [course('2026-08-22', 'Rest, on purpose')];
    const plan = planMerge(existing, incoming, KEYS.course);
    expect(plan.insert).toHaveLength(0);
    expect(plan.skipped).toBe(1);
  });

  it('keys a sit on when it started, so two in one day both survive', () => {
    const plan = planMerge([sit(1000)], [sit(1000), sit(9000)], KEYS.sitSession);
    expect(plan.insert).toHaveLength(1);
    expect(plan.insert[0].startedAt).toBe(9000);
  });
});

describe('the tables added in v6', () => {
  const road = (createdAt: number, title = 'Strong enough for the ones along the way') => ({
    title,
    why: null,
    createdAt,
    updatedAt: createdAt,
    retiredAt: null,
  });
  const island = (createdAt: number, roadCreatedAt = 1, state = 'open') => ({
    roadCreatedAt,
    title: 'An island',
    state,
    openedOn: '2026-08-22',
    closedOn: state === 'open' ? null : '2026-08-23',
    reason: null,
    createdAt,
    updatedAt: createdAt,
  });

  it('travels with everything else', () => {
    const original = tables({ roadPoneglyph: [road(1)], poneglyph: [island(2)] });
    const result = parseBackup(serializeBackup(buildBackup(original, 6, 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.roadPoneglyph).toEqual(original.roadPoneglyph);
    expect(result.backup.data.poneglyph).toEqual(original.poneglyph);
  });

  it('keeps an island pointing at its pillar across the move', () => {
    // The link is the parent's createdAt precisely because row ids are not
    // carried. If this ever regresses, every island lands orphaned on the far
    // side and the whole Log Pose arrives blank.
    const original = tables({ roadPoneglyph: [road(1700)], poneglyph: [island(1800, 1700)] });
    const result = parseBackup(serializeBackup(buildBackup(original, 6, 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [glyph] = result.backup.data.poneglyph;
    const [pillar] = result.backup.data.roadPoneglyph;
    expect(glyph.roadCreatedAt).toBe(pillar.createdAt);
  });

  it('does not stack a pillar on a second import', () => {
    const plan = planMerge([road(1)], [road(1, 'Renamed since')], KEYS.roadPoneglyph);
    expect(plan.insert).toHaveLength(0);
    expect(plan.skipped).toBe(1);
  });

  it('rejects an island whose link is missing rather than importing it orphaned', () => {
    const bad = { ...island(2) } as Record<string, unknown>;
    delete bad.roadCreatedAt;
    const raw = buildBackup(tables({ poneglyph: [bad as never] }), 6, 0);
    const result = parseBackup(serializeBackup(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.poneglyph).toHaveLength(0);
    expect(result.rejected.poneglyph).toBe(1);
  });
});

describe('the tables added in v7', () => {
  const rhythm = (createdAt: number, weekdays = '1,4') => ({
    title: 'Laundry',
    minutes: 30,
    kind: 'weekdays',
    weekdays,
    intervalDays: 1,
    createdAt,
    updatedAt: createdAt,
    retiredAt: null,
  });
  const sailing = (day: string, heading = 'One long thing, properly') => ({
    day,
    heading,
    note: null,
    createdAt: 1,
    updatedAt: 1,
  });
  const struck = (createdAt: number, rhythmKey: number | null) => ({
    title: 'Laundry',
    minutes: 30,
    committedFor: '2026-08-22',
    doneAt: createdAt,
    rhythmKey,
    createdAt,
  });

  it('travels with everything else', () => {
    const original = tables({
      rhythm: [rhythm(1700)],
      sailing: [sailing('2026-08-23')],
    });
    const result = parseBackup(serializeBackup(buildBackup(original, 7, 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.rhythm).toEqual(original.rhythm);
    expect(result.backup.data.sailing).toEqual(original.sailing);
  });

  it('keeps a struck task pointing at the rhythm that produced it', () => {
    // Same natural-key link the Poneglyphs use, and for the same reason: row
    // ids are not carried, so a task keyed on one would arrive orphaned and
    // the rhythm would look like it had never been taken.
    const original = tables({ rhythm: [rhythm(1700)], task: [struck(1800, 1700)] });
    const result = parseBackup(serializeBackup(buildBackup(original, 7, 0)));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.task[0].rhythmKey).toBe(result.backup.data.rhythm[0].createdAt);
  });

  it('carries an ordinary task with no rhythm behind it', () => {
    const result = parseBackup(
      serializeBackup(buildBackup(tables({ task: [struck(9, null)] }), 7, 0)),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.task).toHaveLength(1);
    expect(result.backup.data.task[0].rhythmKey).toBeNull();
  });

  it('does not stack a second week on one day', () => {
    const plan = planMerge(
      [sailing('2026-08-23')],
      [sailing('2026-08-23', 'Rewritten')],
      KEYS.sailing,
    );
    expect(plan.insert).toHaveLength(0);
    expect(plan.skipped).toBe(1);
  });

  it('rejects a rhythm with a missing field rather than importing it broken', () => {
    const bad = { ...rhythm(2) } as Record<string, unknown>;
    delete bad.weekdays;
    const raw = buildBackup(tables({ rhythm: [bad as never] }), 7, 0);
    const result = parseBackup(serializeBackup(raw));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.backup.data.rhythm).toHaveLength(0);
    expect(result.rejected.rhythm).toBe(1);
  });
});

describe('countRows', () => {
  it('counts across every table', () => {
    expect(countRows(tables({ dailyRead: [read('a')], entry: [entry(1), entry(2)] }))).toBe(3);
  });

  it('is zero for an empty backup', () => {
    expect(countRows(EMPTY_TABLES)).toBe(0);
  });
});

describe('entriesToMarkdown', () => {
  it('puts the newest entry first', () => {
    const md = entriesToMarkdown([entry(1, 'older'), entry(2, 'newer')], 0);
    expect(md.indexOf('newer')).toBeLessThan(md.indexOf('older'));
  });

  it('marks an empty entry rather than leaving a blank gap', () => {
    expect(entriesToMarkdown([entry(1, '   ')], 0)).toContain('_(empty)_');
  });

  it('counts entries in the header', () => {
    expect(entriesToMarkdown([entry(1)], 0)).toContain('1 entry');
    expect(entriesToMarkdown([entry(1), entry(2)], 0)).toContain('2 entries');
  });

  it('handles an empty log without crashing', () => {
    expect(entriesToMarkdown([], 0)).toContain('0 entries');
  });
});
