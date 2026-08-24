/**
 * Naming the weather — the one word after the dials.
 *
 * The four dials measure; this names. A word engages a different faculty than
 * a 1-to-5, and sometimes the word is the only part that was true. It is
 * **optional every single day**: the chips sit under the dials, a read saves
 * fine without one, and nothing anywhere counts how often one was given.
 *
 * The vocabulary is weather at sea, because that is this app's accent and
 * because sea weather carries no verdict: a squall is not a failure of the
 * ocean. Deliberately not clinical emotion labels — this is a log line, not
 * an assessment.
 *
 * Stored as the plain word on the day's read. Foresight does not read it —
 * a categorical word is not a dial, and the engine only speaks arithmetic.
 */

export type WeatherWord =
  'Calm' | 'Bright' | 'Swell' | 'Overcast' | 'Fog' | 'Restless' | 'Squall' | 'Heavy';

/**
 * Eight words, two rows of four on a phone. Ordered from settled to rough,
 * but the order is layout, not a scale — nothing maps these to numbers.
 */
export const WEATHER_WORDS: WeatherWord[] = [
  'Calm',
  'Bright',
  'Swell',
  'Overcast',
  'Fog',
  'Restless',
  'Squall',
  'Heavy',
];

export function isWeatherWord(value: string): value is WeatherWord {
  return (WEATHER_WORDS as string[]).includes(value);
}
