/**
 * Soundings — 測深.
 *
 * A sounding is a depth taken by dropping a weighted line over the side. You
 * take one when you want to know, you write down what you got, and the row of
 * figures behind you is the shape of the sea floor. Nobody sounding a channel
 * is scoring themselves against a target depth.
 *
 * Some islands are numeric by nature — a savings figure, a bodyweight, a word
 * count — and for those, "reached or not" throws away everything that
 * happened in between. This is the one place a number may be logged against
 * an island, and it is built to be *only* a record:
 *
 * - **No target, and nowhere to put one.** There is no goal field on a
 *   sounding line and no room reserved for one. The moment a target exists,
 *   every reading becomes a distance from failure.
 * - **No pace, no delta, no projection.** "Up two this week" is a pace, and a
 *   pace invites the question of whether it is fast enough. The readings are
 *   shown; the arithmetic between them is the reader's own business.
 * - **No direction is good.** Savings rising and a bodyweight rising are the
 *   same event to this module. Nothing here is coloured, arrowed or worded by
 *   which way it went — there is a test for that, because it is exactly the
 *   kind of "helpful" that would arrive in a later pass and go unnoticed.
 *
 * The shape is the information. That is the whole feature.
 */

import type { DayKey } from './date';

export type Sounding = {
  id: number;
  /** The island this was taken against, by its `createdAt`. */
  islandKey: number;
  value: number;
  day: DayKey;
  createdAt: number;
};

/** What the figure is in — 'kg', 'words', '£'. Free text, and often empty. */
export const UNIT_MAX_CHARS = 12;

export function normaliseUnit(unit: string): string {
  return unit.trim().slice(0, UNIT_MAX_CHARS);
}

/**
 * Parse what was typed, or null.
 *
 * Accepts a comma as a decimal point and strips grouping spaces, because a
 * number typed on a phone in a hurry is not a form submission. Rejects
 * anything not finite — an island logging Infinity is a bug, not a reading.
 */
export function parseSounding(text: string): number | null {
  const cleaned = text.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

/** Newest first — the order the screen reads them in. */
export function newestFirst(soundings: Sounding[]): Sounding[] {
  return [...soundings].sort((a, b) => b.createdAt - a.createdAt);
}

export function latest(soundings: Sounding[]): Sounding | null {
  return newestFirst(soundings)[0] ?? null;
}

/**
 * Format a reading for display.
 *
 * Trailing zeros are dropped, because 82.40 is a scale's opinion and 82.4 is
 * the number. The unit rides behind it when there is one.
 */
export function formatSounding(value: number, unit: string | null): string {
  const figure = Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
  return unit && unit.trim() ? `${figure} ${unit.trim()}` : figure;
}

/**
 * The readings as points in a unit box, oldest to newest, for drawing.
 *
 * x and y are both 0..1, y already flipped so 0 is the top — a drawing
 * convenience, not a claim that higher is better. A flat run and a single
 * reading both come back on the middle line rather than at an edge, because a
 * line pinned to the top of its box looks like a maximum.
 */
export function shape(soundings: Sounding[]): { x: number; y: number }[] {
  const ordered = [...soundings].sort((a, b) => a.createdAt - b.createdAt);
  if (ordered.length === 0) return [];
  const values = ordered.map((s) => s.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  return ordered.map((s, i) => ({
    x: ordered.length === 1 ? 0.5 : i / (ordered.length - 1),
    y: span === 0 ? 0.5 : 1 - (s.value - min) / span,
  }));
}

/**
 * What the sounding section says about itself.
 *
 * States what is there. It does not encourage another reading, note how long
 * since the last one, or have any opinion about the gap.
 */
export function soundingLine(count: number, plain = false): string {
  if (count === 0) {
    return plain
      ? 'No readings yet. Take one whenever you want to know.'
      : 'No soundings yet. Drop a line whenever you want to know the depth.';
  }
  if (count === 1) return plain ? 'One reading.' : 'One sounding.';
  return plain ? `${count} readings.` : `${count} soundings.`;
}
