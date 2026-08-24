import { describe, expect, it } from 'vitest';
import {
  TIERS,
  WINDOW_DAYS,
  isClash,
  reachDays,
  reachFor,
  tierFor,
  tierMessage,
  tierName,
  topStruck,
  type RyuoTier,
} from '../ryuo';
import type { Task } from '../tasks';

const TODAY = '2026-08-23';
let seq = 0;

function task(over: Partial<Task> = {}): Task {
  seq += 1;
  return {
    id: seq,
    title: `task ${seq}`,
    minutes: 15,
    committedFor: TODAY,
    rhythmKey: null,
    islandKey: null,
    watch: null,
    doneAt: null,
    createdAt: seq * 1000,
    ...over,
  };
}

const TIER_LIST: RyuoTier[] = [0, 1, 2, 3, 4];

describe('topStruck', () => {
  it('is false with nothing committed — there was no top to hit', () => {
    expect(topStruck([], TODAY)).toBe(false);
    expect(topStruck([task({ committedFor: null })], TODAY)).toBe(false);
  });

  it('counts the day when the oldest committed task is done', () => {
    const oldest = task({ createdAt: 100, doneAt: 500 });
    const newer = task({ createdAt: 900 });
    expect(topStruck([newer, oldest], TODAY)).toBe(true);
  });

  it('does not count clearing the easy ones while the top sits open', () => {
    // The whole point. Three new things struck and the one that has been
    // waiting since Tuesday still open is not a day at the top of the list.
    const stale = task({ createdAt: 100 });
    const easy = [
      task({ createdAt: 800, doneAt: 900 }),
      task({ createdAt: 810, doneAt: 910 }),
      task({ createdAt: 820, doneAt: 920 }),
    ];
    expect(topStruck([stale, ...easy], TODAY)).toBe(false);
  });

  it('ignores other days entirely', () => {
    const other = task({ committedFor: '2026-08-22', createdAt: 10, doneAt: 20 });
    const mine = task({ createdAt: 100 });
    expect(topStruck([other, mine], TODAY)).toBe(false);
  });

  it('is true for a single struck task', () => {
    expect(topStruck([task({ doneAt: 1 })], TODAY)).toBe(true);
  });
});

describe('reachDays', () => {
  const on = (day: string, over: Partial<Task> = {}) => task({ committedFor: day, ...over });

  it('is zero on an empty history', () => {
    expect(reachDays([], TODAY)).toBe(0);
  });

  it('counts each day whose top was struck', () => {
    const tasks = [
      on('2026-08-23', { createdAt: 1, doneAt: 2 }),
      on('2026-08-22', { createdAt: 1, doneAt: 2 }),
      on('2026-08-21', { createdAt: 1 }), // open — does not count
      on('2026-08-20', { createdAt: 1, doneAt: 2 }),
    ];
    expect(reachDays(tasks, TODAY)).toBe(3);
  });

  it('does not look past the window', () => {
    const old = `2026-07-01`;
    expect(reachDays([on(old, { createdAt: 1, doneAt: 2 })], TODAY)).toBe(0);
  });

  it('never exceeds the window', () => {
    const tasks = Array.from({ length: 60 }, (_, i) =>
      on(`2026-08-${String(23 - (i % 23)).padStart(2, '0')}`, { createdAt: 1, doneAt: 2 }),
    );
    expect(reachDays(tasks, TODAY)).toBeLessThanOrEqual(WINDOW_DAYS);
  });
});

describe('tiers', () => {
  it('starts latent', () => {
    expect(tierFor(0)).toBe(0);
    expect(tierFor(TIERS[1] - 1)).toBe(0);
  });

  it('matches its own thresholds', () => {
    for (const [tier, days] of Object.entries(TIERS)) {
      expect(tierFor(days)).toBe(Number(tier));
      expect(tierFor(days - 1)).toBeLessThan(Number(tier));
    }
  });

  it('tops out rather than overflowing', () => {
    expect(tierFor(999)).toBe(4);
  });

  it('reaches further at every tier, and takes nothing from tier zero', () => {
    expect(reachFor(0)).toBe(1);
    const reaches = TIER_LIST.map(reachFor);
    for (let i = 1; i < reaches.length; i += 1) {
      expect(reaches[i], `tier ${i}`).toBeGreaterThan(reaches[i - 1]);
    }
  });

  it('only lands without contact at the top', () => {
    expect(TIER_LIST.filter(isClash)).toEqual([4]);
  });

  it('names every tier', () => {
    for (const tier of TIER_LIST) expect(tierName(tier).length).toBeGreaterThan(0);
  });
});

describe('the copy', () => {
  it('never scolds, and never calls a quiet day a loss', () => {
    const lines = [
      ...TIER_LIST.map((t) => tierMessage(t, TIERS[1])),
      tierMessage(0, 0),
      tierMessage(4, 28),
      ...TIER_LIST.map(tierName),
    ];
    for (const line of lines) {
      const text = line.toLowerCase();
      for (const word of [
        'failed',
        'fail',
        'should',
        'lazy',
        'behind',
        'lost',
        'streak',
        'broke',
        'only',
      ]) {
        expect(text, line).not.toContain(word);
      }
    }
  });

  it('tells you what builds reach before you have any', () => {
    expect(tierMessage(0, 0).toLowerCase()).toContain('top of the list');
  });

  it('counts down to the next tier rather than up from nothing', () => {
    const days = TIERS[1];
    expect(tierMessage(1, days)).toContain(`${TIERS[2] - days} more`);
  });

  it('says what the top tier actually means', () => {
    expect(tierMessage(4, 25).toLowerCase()).toContain('without contact');
  });
});
