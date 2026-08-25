/**
 * The Flag — 旗.
 *
 * Pirates raise a flag to declare what they stand for, and then everything
 * else can be checked against it. Three to five values, in your own words,
 * set once and changed rarely.
 *
 * It is the last piece of 覇王色 from the concept doc, and it is deliberately
 * the *least* mechanical thing in the app:
 *
 * - **Nothing is ever checked off.** A value is not a task with a longer
 *   deadline; it is a description of who you are trying to be. There is no
 *   done state here, and there never will be.
 * - **Nothing is counted.** The app does not report how many pillars matched
 *   the flag, or how often you acted against it. That number would be an
 *   accusation dressed as arithmetic, and it is not the app's to make.
 * - **It asks, and then gets out of the way.** The flag surfaces at exactly
 *   two moments — naming a Road Poneglyph, and Setting Sail — and both times
 *   it is a question with no wrong answer and no button to press.
 *
 * Three is the floor because two values are a mood and one is a slogan. Five
 * is the ceiling for the same reason the Road Poneglyphs stop at seven: a
 * list long enough to contain everything says nothing.
 */

import type { DayKey } from './date';

export type Value = {
  id: number;
  /** The natural key — its `createdAt`. */
  key: number;
  text: string;
  setOn: DayKey;
};

export const FLAG_TARGET = 3;
export const FLAG_MAX = 5;

/** Values are short by design: a value that needs a paragraph is a plan. */
export const VALUE_MAX_CHARS = 60;

export function normaliseValue(text: string): string {
  return text.trim().replace(/\s+/g, ' ').slice(0, VALUE_MAX_CHARS);
}

/**
 * How much room the flag has left, said the way the Road Poneglyphs say it —
 * a description of the shape, never a fraction.
 */
export function flagRoom(count: number, plain = false): { canAdd: boolean; note: string } {
  if (count === 0) {
    return {
      canAdd: true,
      note: plain
        ? 'Three things you stand for, in your own words. Name the first.'
        : 'A flag says what you stand for before anyone asks. Three of them, in your words.',
    };
  }
  if (count < FLAG_TARGET) {
    const left = FLAG_TARGET - count;
    return {
      canAdd: true,
      note:
        left === 1
          ? 'One more makes three, which is enough to steer by.'
          : `${left} more makes three, which is enough to steer by.`,
    };
  }
  if (count < FLAG_MAX) {
    return { canAdd: true, note: 'Room for more, if something genuinely is not on it yet.' };
  }
  return { canAdd: false, note: 'Five. A list long enough to hold everything says nothing.' };
}

/**
 * The question the flag asks when a new front is being named.
 *
 * A question, and only a question. It has no correct answer, nothing records
 * what you decided, and naming the pillar anyway costs nothing — the flag is
 * a thing to think against for four seconds, not a gate.
 */
export function flagCheck(count: number, plain = false): string | null {
  if (count === 0) return null;
  return plain
    ? 'Before you name it — does this belong to what you said you stand for?'
    : 'Before you name it — does this front serve the flag?';
}

/** What the flag says on the ritual, where it is read rather than asked. */
export function flagAtSail(count: number, plain = false): string | null {
  if (count === 0) return null;
  return plain ? 'What you said you stand for.' : 'What you sail under.';
}
