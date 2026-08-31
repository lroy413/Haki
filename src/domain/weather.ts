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
 * **And the weather shifts.** The owner: _"Currently I set the weather when I
 * wake up but then what happens if it shifts throughout the day? I'm trying to
 * learn to be better aware of my emotions and what triggers them."_ So a day
 * is a **run of readings** rather than one word: the morning's, and then
 * however many the day turned out to need, each with an optional line about
 * what was happening. The morning word still lives on the day's read, because
 * that is where it is given; the shifts live in `weather_reading`.
 *
 * Foresight does not read any of it — a categorical word is not a dial, and
 * the engine only speaks arithmetic.
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
/**
 * One reading: a word, when it was taken, and optionally what was happening.
 *
 * `at` is a timestamp rather than a watch, because the watch is arithmetic on
 * it (`watchAt`) and storing both is two things that can disagree. The
 * morning's reading has `morning: true` and comes from the day's read; every
 * other one was taken on purpose, later.
 */
export type Reading = {
  id: number | null;
  word: WeatherWord;
  at: number;
  /** What was happening. Optional, like everything here. */
  note: string;
  /** True for the word given on the morning read, which has no row of its own. */
  morning: boolean;
};

/** A day, and everything it was called. Oldest first — the order it happened. */
export type SkyDay = { day: string; readings: Reading[] };

/**
 * What a day came to, which is the last thing you called it.
 *
 * **The last, never an average and never the worst.** An average of eight
 * words with no numbers behind them is arithmetic on a vocabulary that was
 * chosen for having no scale; and taking the roughest would make every day
 * with one bad hour in it a bad day, which is the exact reading the whole
 * module refuses. What a day ended up being called is a fact about the day.
 */
export function settled(readings: Reading[]): WeatherWord | null {
  return readings.length ? readings[readings.length - 1].word : null;
}

/**
 * Build a day's run out of the morning word and whatever shifts were logged.
 *
 * A morning with no word and no shifts is a gap — still true, still not
 * "Calm". A day whose only readings are shifts is fine: the run simply starts
 * later.
 */
export function dayReadings(
  morning: { word: string | null; at: number } | null,
  shifts: { id: number; word: string; note: string; at: number }[],
): Reading[] {
  const out: Reading[] = [];
  if (morning?.word && isWeatherWord(morning.word)) {
    out.push({ id: null, word: morning.word, at: morning.at, note: '', morning: true });
  }
  for (const s of shifts) {
    if (isWeatherWord(s.word)) {
      out.push({ id: s.id, word: s.word, at: s.at, note: s.note, morning: false });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

/**
 * The line under one day's run, and it says what is there rather than what it
 * means. No count of shifts: "your weather moved five times today" is a
 * verdict on a day wearing a number, and the number would quietly become a
 * score for how steady you were.
 */
export function dayLine(readings: Reading[], plain = false): string {
  if (readings.length === 0) {
    return plain
      ? 'Nothing named for this day yet.'
      : 'Nothing named yet. Name it whenever you notice.';
  }
  if (readings.length === 1) {
    return plain
      ? 'One reading. Add another whenever it shifts.'
      : 'One reading so far. The weather is allowed to change.';
  }
  return plain ? 'How the day went.' : 'How the day went, in the order it went.';
}

/** What the note field asks for — context, never a cause. */
export const NOTE_PLACEHOLDER = 'What was happening, if you know.';

/** The most a note may be. A line, not an entry: the Logbook is next door. */
export const MAX_NOTE = 240;

/**
 * One column of the run.
 *
 * `word` is what the day *came to*, and `moved` says only that it got there by
 * more than one reading — never how many. A figure there would be a count of
 * how much your weather shifted, which is a steadiness score with a nautical
 * hat on, and the whole vocabulary was chosen to have nothing like that in it.
 */
export type Sky = { day: string; word: WeatherWord | null; moved: boolean };

export function recentWeather(
  reads: { day: string; weather: string | null }[],
  days: string[],
  shifts: { day: string; word: string; note: string; at: number }[] = [],
): Sky[] {
  const byDay = new Map(reads.map((r) => [r.day, r.weather]));
  const shiftsByDay = new Map<
    string,
    { id: number; word: string; note: string; at: number }[]
  >();
  for (const s of shifts) {
    const list = shiftsByDay.get(s.day) ?? [];
    list.push({ id: 0, ...s });
    shiftsByDay.set(s.day, list);
  }
  return days.map((day) => {
    const morning = byDay.get(day) ?? null;
    const readings = dayReadings(
      morning === null ? null : { word: morning, at: 0 },
      shiftsByDay.get(day) ?? [],
    );
    return { day, word: settled(readings), moved: readings.length > 1 };
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

/**
 * Nothing named yet — an offer, not an absence.
 *
 * It names both ways in now. The morning read is where the word is usually
 * given, but a run with nothing in it draws no columns, and a column is the
 * only door to a day — so on a fresh install the one thing you could not do
 * was name the weather at four in the afternoon.
 */
export function skyEmptyLine(plain = false): string {
  return plain
    ? 'A word on the morning read shows up here. You can also add one now.'
    : 'Name the weather on a morning read — or name it now, whatever it is.';
}
