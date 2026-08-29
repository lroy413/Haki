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

/**
 * The run of recent weather, oldest first — the Inner Weather chart.
 *
 * The word was asked for every morning and shown nowhere but that morning's
 * own read row, which made it a question with no answer behind it. This is the
 * answer: what you have been calling it. A day with no word is a real gap and
 * is kept as one, because "nothing said" is not "Calm".
 *
 * What it deliberately is not:
 *
 * - **Not counted.** No "most common", no tally per word, no "you have said
 *   Squall nine times this month". The vocabulary was chosen because sea
 *   weather carries no verdict, and a leaderboard of your own bad days would
 *   put one back.
 * - **Not ranked or scored.** `WEATHER_WORDS` is ordered settled-to-rough for
 *   layout and nothing maps it to numbers — so there is no average, no trend
 *   line and no "clearing" claim. The run is shown in order and read by you.
 * - **Not fed to Foresight.** A categorical word is not a dial and the engine
 *   only speaks arithmetic; adding a grouping variable would multiply its
 *   hypotheses and move the noise rate `MIN_T` was calibrated against, which
 *   `foresightNoise.test.ts` exists to forbid.
 */
export type Sky = { day: string; word: WeatherWord | null };

export function recentWeather(
  reads: { day: string; weather: string | null }[],
  days: string[],
): Sky[] {
  const byDay = new Map(reads.map((r) => [r.day, r.weather]));
  return days.map((day) => {
    const word = byDay.get(day) ?? null;
    return { day, word: word && isWeatherWord(word) ? word : null };
  });
}

/**
 * The line under the run, or null when there is nothing to say.
 *
 * Names what the picture is and stops. It does not summarise the run, because
 * summarising it is exactly the claim the app has no standing to make.
 */
export function skyLine(run: Sky[], plain = false): string | null {
  const named = run.filter((s) => s.word !== null).length;
  if (named === 0) return null;
  return plain
    ? 'The word you gave each morning.'
    : 'What you have been calling it. The word is optional and always was.';
}

/** Nothing named yet — an offer, not an absence. */
export function skyEmptyLine(plain = false): string {
  return plain
    ? 'A word on the morning read shows up here.'
    : 'Name the weather on a morning read and it shows up here.';
}
