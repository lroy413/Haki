import { describe, expect, it } from 'vitest';
import {
  carriedLine,
  daysCarried,
  daysHeld,
  lostLine,
  needsReason,
  poseLine,
  type Bearing,
  type EternalPose,
} from '../eternal';

const bearing = (over: Partial<Bearing> = {}): Bearing => ({
  id: 1,
  text: 'I do not go a day without speaking to someone.',
  setOn: '2026-06-01',
  endedOn: null,
  reason: null,
  ...over,
});

const empty: EternalPose = { held: null, carried: [] };

describe('the Eternal Pose', () => {
  it('counts from the day it was set, day one being that day', () => {
    const pose: EternalPose = { held: bearing(), carried: [] };
    expect(daysHeld(pose, '2026-06-01')).toBe(1);
    expect(daysHeld(pose, '2026-06-10')).toBe(10);
    expect(daysHeld(empty, '2026-06-10')).toBeNull();
  });

  it('carries a number that cannot be broken', () => {
    // The load-bearing property. This figure counts days since the bearing
    // was taken, never days it was kept — so there is no behaviour, on any
    // day, that can make it smaller. A non-negotiable with a breakable
    // number attached is a shame machine pointed at the one thing somebody
    // promised themselves.
    const pose: EternalPose = { held: bearing(), carried: [] };
    let last = 0;
    for (const day of ['2026-06-01', '2026-06-02', '2026-06-09', '2026-07-01', '2027-01-01']) {
      const n = daysHeld(pose, day)!;
      expect(n).toBeGreaterThan(last);
      last = n;
    }
  });

  it('lets an ended bearing keep the days it had', () => {
    const old = bearing({ setOn: '2026-01-01', endedOn: '2026-03-01', reason: 'It was done.' });
    expect(daysCarried(old)).toBe(60);
    // And a fresh bearing does not inherit or reset it — they are separate
    // facts, so letting one go never zeroes anything.
    const pose: EternalPose = { held: bearing({ setOn: '2026-03-01' }), carried: [old] };
    expect(daysHeld(pose, '2026-03-01')).toBe(1);
    expect(daysCarried(pose.carried[0])).toBe(60);
  });

  it('has no number at all for a bearing still held', () => {
    expect(daysCarried(bearing())).toBeNull();
  });

  it('offers rather than reports an absence when nothing is set', () => {
    for (const plain of [false, true]) {
      const line = poseLine(empty, '2026-06-10', plain);
      expect(line.toLowerCase()).toContain('set it');
      // Not "no bearing", not "none", not a dash.
      expect(line).not.toMatch(/^—|^-|^None|^No /i);
    }
  });

  it('reads the held bearing as a span, and the first day as today', () => {
    const pose: EternalPose = { held: bearing(), carried: [] };
    expect(poseLine(pose, '2026-06-01', false)).toBe('Taken today.');
    expect(poseLine(pose, '2026-06-01', true)).toBe('Set today.');
    expect(poseLine(pose, '2026-06-10', false)).toBe('Held 10 days.');
  });

  it('records a let-go bearing as carried, never as abandoned or broken', () => {
    const line = carriedLine(bearing({ setOn: '2026-01-01', endedOn: '2026-01-01' }));
    expect(line).toBe('Carried a day.');
    expect(carriedLine(bearing({ setOn: '2026-01-01', endedOn: '2026-02-01' }))).toBe(
      'Carried 32 days.',
    );
  });

  it('never uses shame language anywhere in its copy', () => {
    const held: EternalPose = { held: bearing(), carried: [] };
    const lines = [
      poseLine(empty, '2026-06-10', false),
      poseLine(empty, '2026-06-10', true),
      poseLine(held, '2026-06-10', false),
      poseLine(held, '2026-06-10', true),
      poseLine(held, '2026-06-01', false),
      carriedLine(bearing({ endedOn: '2026-06-02' })),
      lostLine(held) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    for (const word of [
      'failed',
      'fail',
      'broke',
      'broken',
      'should',
      'lazy',
      'finally',
      'streak',
      'missed',
      'abandon',
      'quit',
    ]) {
      expect(lines, `copy says "${word}"`).not.toContain(word);
    }
  });

  it('speaks when every needle is spinning, and only if a bearing is held', () => {
    expect(lostLine(empty)).toBeNull();
    const line = lostLine({ held: bearing(), carried: [] });
    expect(line).toBe('Nothing is at sea. This still points.');
    // It reports and does not ask: no question, no instruction.
    expect(line).not.toContain('?');
  });

  it('asks for a reason only when something is being replaced', () => {
    expect(needsReason(empty)).toBe(false);
    expect(needsReason({ held: bearing(), carried: [] })).toBe(true);
  });
});
