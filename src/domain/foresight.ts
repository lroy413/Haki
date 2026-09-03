import type { DayKey } from './date';
import type { CrewName } from './crew';

/**
 * 未来視 — Foresight. What the record has been trying to say.
 *
 * The app has been collecting reads, sleep, sits, sessions and struck tasks
 * for months and has never once told the owner what it can see in them. This
 * is that: a handful of sentences about which days read differently from
 * which, drawn from his own history rather than from anybody's advice.
 *
 * It is also the most dangerous module in the app, and most of what follows is
 * about not being dangerous. **A mental-health app that confidently reports a
 * pattern which is actually noise is worse than one that says nothing at all**
 * — it invents a rule about the owner's own mind and hands it to him with the
 * authority of arithmetic. So the whole design is built to keep quiet.
 *
 * ---
 *
 * ### How it reads
 *
 * Every question has the same shape: **split the days in two, compare the
 * dial.** Days with a sit against days without; nights at or above the sleep
 * target against nights below. The answer is a difference in means on the
 * ordinary 1–5 dial, which is a number the owner already knows how to feel —
 * unlike a correlation coefficient, which is a number nobody has ever felt.
 *
 * ### The gates, and how the bar was set
 *
 * A difference alone is worthless. This asks two dozen questions of one
 * history, and on 90 days of dial data the *first* honest attempt at this
 * module — a half-point difference plus a median check — reported a confident
 * pattern on **85% of simulated lives in which nothing was related to
 * anything**. That number is in `foresightNoise.test.ts`, and it is the reason
 * everything below exists. With the gates in place it speaks on one.
 *
 * So each question must clear all of:
 *
 *   - **Enough history.** Nothing at all before `MIN_READ_DAYS` reads.
 *   - **Enough of both kinds of day.** `MIN_GROUP` on each side, or a habit
 *     kept nearly every day produces a "finding" off two exceptions.
 *   - **An effect worth a sentence.** `MIN_EFFECT` is half a dial point,
 *     about the smallest difference a person could notice. A real but
 *     microscopic difference is not worth saying out loud.
 *   - **A signal that outruns the spread.** Welch's t across the two groups
 *     must exceed `MIN_T` — the gate that actually does the work, because
 *     unlike a raw difference it scales with how noisy and how numerous the
 *     days are.
 *   - **Not one loud day.** The medians must move the same way the means do,
 *     which catches a single catastrophic Tuesday carrying a whole result.
 *
 * **`MIN_T` is not from a table, and that is deliberate.** The textbook value
 * would be a Bonferroni-corrected critical value for two dozen tests, which
 * assumes each day is independent of the last — and daily self-reports are
 * nothing of the kind. A bad week is one event, not seven, so the effective
 * sample is far smaller than the day count and every tabulated threshold is
 * too generous here. The number was instead **calibrated by simulation**:
 * raised until the engine stayed quiet on the overwhelming majority of null
 * lives, then checked against a planted signal to confirm it had not gone so
 * far that nothing real survives. Both halves of that bargain are tests, and
 * if a change moves either number, the change is wrong.
 *
 * ### Which way it runs
 *
 * It cannot tell. Sitting on clear days and being clear on days you sit look
 * identical in this data, and the honest thing is to say so rather than to
 * bury it. So every sentence this module produces is a description of two
 * kinds of day, never a mechanism, and `directionNote` exists to say the
 * quiet part out loud.
 *
 * Sleep is the one exception worth noting: the hours are keyed to the morning
 * you woke, so a night is always *before* the day it is compared against.
 * That is the direction that cannot be reversed, and it is also the app's
 * founding failure mode — the cascade — which is why it is here at all.
 *
 * ### What it will never do
 *
 * **No advice.** Not one sentence in this file tells the owner what to do
 * about anything it finds. The moment a readout starts recommending, it is a
 * coach, and this app does not have a coach in it — it reports, and the person
 * reading decides. Nothing here nags, scores, or appears uninvited.
 */

/** The four dials, exactly as the Daily Read collects them. */
export type Dial = 'energy' | 'mood' | 'clarity' | 'tension';

export type SourceKey = 'sleep' | 'sat' | 'trained' | 'struck' | 'gear' | 'wrote';

/** One day, as Foresight needs it. `read` is null on days there wasn't one. */
export type DayRecord = {
  day: DayKey;
  read: { energy: number; mood: number; clarity: number; tension: number } | null;
  /** Hours slept the night before this day, or null if it was not logged. */
  sleepHours: number | null;
  sat: boolean;
  trained: boolean;
  struck: number;
  gearMinutes: number;
  wrote: boolean;
};

export type Finding = {
  source: SourceKey;
  dial: Dial;
  /** Mean of the dial on days the source was present. */
  withMean: number;
  withoutMean: number;
  /** `withMean - withoutMean`, in dial points. Signed. */
  effect: number;
  /** Welch's t for the split. Kept for ranking and for the debug readout. */
  t: number;
  withDays: number;
  withoutDays: number;
};

export type Foresight =
  /** Not enough history to look. */
  | { state: 'watching'; readDays: number; needed: number }
  /** Enough history, and nothing cleared the bar. The commonest good outcome. */
  | { state: 'quiet'; readDays: number }
  | { state: 'reading'; readDays: number; findings: Finding[] };

/** Reads before it will say anything at all. */
export const MIN_READ_DAYS = 21;

/** Days needed on *each* side of a split. */
export const MIN_GROUP = 6;

/** Half a dial point — about the smallest difference a person would notice. */
export const MIN_EFFECT = 0.5;

/**
 * Welch's t the split must clear. Calibrated, not tabulated — see the note at
 * the top of this file, and the simulation in `foresightNoise.test.ts`.
 */
export const MIN_T = 3.5;

/** How many findings the readout will ever carry. */
export const MAX_FINDINGS = 4;

const DIALS: Dial[] = ['energy', 'mood', 'clarity', 'tension'];

const SOURCES: SourceKey[] = ['sleep', 'sat', 'trained', 'struck', 'gear', 'wrote'];

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sample variance, Bessel-corrected. Zero for a group of one. */
function variance(values: number[], m: number): number {
  if (values.length < 2) return 0;
  return values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
}

/**
 * Welch's t — a difference measured in units of its own uncertainty.
 *
 * Welch rather than Student because the two groups have no reason to share a
 * spread: days you sit and days you do not are not two samples of one thing.
 *
 * Two groups that never vary at all are the limiting case, and it is a strong
 * one rather than a broken one: every day of one kind read exactly one way and
 * every day of the other read exactly another, which is as cleanly separated
 * as evidence gets. So it returns infinity in the direction of the gap, and 0
 * only when there is no gap either. Real dial data never lands here — it comes
 * up in tests, and getting it backwards would have made the engine reject the
 * most obvious pattern it could ever be shown.
 */
function welchT(a: number[], b: number[], meanA: number, meanB: number): number {
  const se = Math.sqrt(variance(a, meanA) / a.length + variance(b, meanB) / b.length);
  if (se === 0) return meanA === meanB ? 0 : Math.sign(meanA - meanB) * Infinity;
  return (meanA - meanB) / se;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Was the source present on this day?
 *
 * Null rather than a boolean when the day cannot answer — an unlogged night is
 * not a short night, and guessing either way would put invented data into the
 * comparison.
 */
function present(day: DayRecord, source: SourceKey, sleepTargetHours: number): boolean | null {
  switch (source) {
    case 'sleep':
      return day.sleepHours === null ? null : day.sleepHours >= sleepTargetHours;
    case 'sat':
      return day.sat;
    case 'trained':
      return day.trained;
    case 'struck':
      return day.struck > 0;
    case 'gear':
      return day.gearMinutes > 0;
    case 'wrote':
      return day.wrote;
  }
}

/** One question, asked and answered — or refused for want of evidence. */
function ask(
  days: DayRecord[],
  source: SourceKey,
  dial: Dial,
  sleepTargetHours: number,
): Finding | null {
  const withIt: number[] = [];
  const withoutIt: number[] = [];

  for (const day of days) {
    if (!day.read) continue;
    const has = present(day, source, sleepTargetHours);
    if (has === null) continue;
    (has ? withIt : withoutIt).push(day.read[dial]);
  }

  if (withIt.length < MIN_GROUP || withoutIt.length < MIN_GROUP) return null;

  const withMean = mean(withIt);
  const withoutMean = mean(withoutIt);
  const effect = withMean - withoutMean;
  if (Math.abs(effect) < MIN_EFFECT) return null;

  // The gate that does the real work: a difference has to outrun the spread
  // of the days it was measured from.
  const t = welchT(withIt, withoutIt, withMean, withoutMean);
  if (Math.abs(t) < MIN_T) return null;

  // One loud day should not be able to carry a finding on its own.
  const medianShift = median(withIt) - median(withoutIt);
  if (Math.sign(medianShift) !== Math.sign(effect)) return null;

  return {
    source,
    dial,
    withMean,
    withoutMean,
    effect,
    t,
    withDays: withIt.length,
    withoutDays: withoutIt.length,
  };
}

/**
 * Read the whole history.
 *
 * Findings are ranked by how large the difference is, then by how much
 * evidence sits behind it, and cut at `MAX_FINDINGS`. The cut is not a
 * statistical device — everything returned has already passed every gate — it
 * is a reading one: a wall of twenty patterns is not a readout, it is a
 * dashboard, and nobody has ever changed anything because of a dashboard.
 */
export function foresight(days: DayRecord[], sleepTargetHours: number): Foresight {
  const readDays = days.filter((d) => d.read !== null).length;
  if (readDays < MIN_READ_DAYS) {
    return { state: 'watching', readDays, needed: MIN_READ_DAYS - readDays };
  }

  const findings: Finding[] = [];
  for (const source of SOURCES) {
    for (const dial of DIALS) {
      const found = ask(days, source, dial, sleepTargetHours);
      if (found) findings.push(found);
    }
  }

  if (findings.length === 0) return { state: 'quiet', readDays };

  // Ranked by t rather than by raw difference: a large gap measured off wildly
  // scattered days is weaker evidence than a smaller, steadier one, and the
  // top of this list is what the owner will actually read.
  findings.sort(
    (a, b) =>
      Math.abs(b.t) - Math.abs(a.t) ||
      b.withDays + b.withoutDays - (a.withDays + a.withoutDays),
  );

  return { state: 'reading', readDays, findings: findings.slice(0, MAX_FINDINGS) };
}

/* ------------------------------------------------------------------ words */

const DIAL_WORDS: Record<Dial, string> = {
  energy: 'energy',
  mood: 'mood',
  clarity: 'clarity',
  tension: 'tension',
};

/** What each side of the split is called, in the app's own language. */
function sourceWords(
  source: SourceKey,
  plain: boolean,
  crew: CrewName,
): { withIt: string; withoutIt: string } {
  switch (source) {
    case 'sleep':
      return { withIt: 'a full night', withoutIt: 'a short one' };
    case 'sat':
      return plain
        ? { withIt: 'days you meditate', withoutIt: 'days you do not' }
        : { withIt: 'days with a sit in them', withoutIt: 'days without' };
    case 'trained':
      return { withIt: 'days you train', withoutIt: 'days you do not' };
    case 'struck':
      return plain
        ? { withIt: 'days you finish something', withoutIt: 'days you do not' }
        : { withIt: 'days something got struck', withoutIt: 'days nothing did' };
    case 'gear':
      return plain
        ? { withIt: 'days you use focus', withoutIt: 'days you do not' }
        : crew === 'zoro'
          ? { withIt: 'days with a sword drawn', withoutIt: 'days without' }
          : { withIt: 'days with a gear in them', withoutIt: 'days without' };
    case 'wrote':
      return plain
        ? { withIt: 'days you write', withoutIt: 'days you do not' }
        : { withIt: 'days you write something down', withoutIt: 'days you do not' };
  }
}

/**
 * One finding, said plainly.
 *
 * Descriptive, always. Two kinds of day and how they differ — never "because",
 * never "so you should". The number is rounded to one place because a dial
 * that only takes whole values cannot support two.
 */
export function findingLine(finding: Finding, plain = false, crew: CrewName = 'luffy'): string {
  const words = sourceWords(finding.source, plain, crew);
  const size = Math.abs(finding.effect).toFixed(1);
  const way = finding.effect > 0 ? 'higher' : 'lower';
  const dial = DIAL_WORDS[finding.dial];

  if (finding.source === 'sleep') {
    return `After ${words.withIt}, ${dial} reads about ${size} ${way} than after ${words.withoutIt}.`;
  }
  return `On ${words.withIt}, ${dial} reads about ${size} ${way} than on ${words.withoutIt}.`;
}

/** How much history sits behind a finding. */
export function findingEvidence(finding: Finding): string {
  return `${finding.withDays} against ${finding.withoutDays} days`;
}

/**
 * The caveat, carried by every finding that is not about sleep.
 *
 * Not a disclaimer bolted on for safety — it is the single most important true
 * thing this module knows, and burying it would be the dishonest choice.
 */
export function directionNote(finding: Finding, plain = false): string | null {
  if (finding.source === 'sleep') return null;
  return plain
    ? 'Which way that runs is not something this can tell.'
    : 'Which way that runs, this cannot say — the two simply go together.';
}

/**
 * The line above the whole readout.
 *
 * "Watching" says what it is waiting for without making it a task; nothing
 * here asks the owner to go and generate data. "Quiet" is the commonest good
 * outcome and is written as one — no pattern found is a perfectly ordinary
 * thing for a life to be, not a failure of the life or of the app.
 */
export function stateMessage(reading: Foresight, plain = false): string {
  switch (reading.state) {
    case 'watching':
      if (reading.readDays === 0) {
        return plain
          ? 'Patterns need a few weeks of check-ins before there is anything to see.'
          : 'Nothing to read yet. Foresight works from a few weeks of Daily Reads.';
      }
      return `${reading.readDays} ${reading.readDays === 1 ? 'read' : 'reads'} so far. Patterns start to show around ${MIN_READ_DAYS}.`;
    case 'quiet':
      return plain
        ? `${reading.readDays} reads, and no clear pattern in them. That is an ordinary result.`
        : `${reading.readDays} reads, and nothing stands out in them. That is an ordinary result — most days are not explained by one thing.`;
    case 'reading':
      return plain
        ? `From ${reading.readDays} check-ins. These are patterns, not rules.`
        : `Read from ${reading.readDays} days of your own record. Patterns, not rules.`;
  }
}
