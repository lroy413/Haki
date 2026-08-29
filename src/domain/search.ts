/**
 * Finding a thing you wrote.
 *
 * The Logbook lists a hundred entries newest first and there was no way to
 * reach the hundred-and-first, or to find the one about the dentist. A journal
 * you cannot search is a journal you write into and never read, which makes
 * the whole archive a write-only pile — and "read it back a year later" is
 * half of what the Logbook is for.
 *
 * Deliberately small. Substring, case-insensitive, no ranking, no stemming, no
 * index: a personal journal is a few thousand rows and the naive scan is
 * instant on all of them. Anything cleverer would need tuning, and a search
 * that quietly decides one match is better than another is a search that hides
 * things from you.
 *
 * The one thing it does properly is the **excerpt**. Showing an entry's first
 * two lines under a search for "dentist" is not a search result, it is a list
 * that happens to be shorter — the point is to see the sentence the word is in.
 */

/** Shortest query worth running. One letter matches everything you ever wrote. */
export const MIN_QUERY = 2;

export function isSearching(query: string): boolean {
  return query.trim().length >= MIN_QUERY;
}

export function matches(text: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_QUERY) return false;
  return text.toLowerCase().includes(needle);
}

/** Characters of context on each side of the match. */
const RADIUS = 44;

export type Excerpt = {
  before: string;
  hit: string;
  after: string;
};

/**
 * A window around the first match, with the match itself separated out so the
 * caller can mark it.
 *
 * Returns null when there is no match, so a caller can fall back to whatever it
 * shows normally rather than rendering an empty result row.
 *
 * The window is trimmed to whole words at both ends: cutting mid-word gives
 * "…he dentist appointmen…", which reads as a rendering fault rather than as
 * an excerpt. An ellipsis is added only where something was actually cut.
 */
export function excerpt(text: string, query: string): Excerpt | null {
  const needle = query.trim().toLowerCase();
  if (needle.length < MIN_QUERY) return null;
  // Collapse the whitespace first: a Markdown entry is full of newlines, and
  // an excerpt three lines tall in a one-line row is a broken row.
  const flat = text.replace(/\s+/g, ' ').trim();
  const at = flat.toLowerCase().indexOf(needle);
  if (at < 0) return null;

  const from = Math.max(0, at - RADIUS);
  const to = Math.min(flat.length, at + needle.length + RADIUS);

  // Pull each edge out to a word boundary, but only when something was cut —
  // the start of the text is not a truncation.
  const start = from === 0 ? 0 : nextSpace(flat, from);
  const end = to === flat.length ? flat.length : lastSpace(flat, to);

  // The ellipsis keeps a space off the word it elides: "…and the morning"
  // reads as a typo, "… and the morning" reads as an elision.
  const before = (start > 0 ? '… ' : '') + flat.slice(start, at);
  const after = flat.slice(at + needle.length, end) + (end < flat.length ? ' …' : '');
  return { before, hit: flat.slice(at, at + needle.length), after };
}

/** The first character after the next space at or after `i`, bounded by `stop`. */
function nextSpace(text: string, i: number, stop = i + RADIUS): number {
  for (let j = i; j < Math.min(text.length, stop); j += 1) {
    if (text[j] === ' ') return j + 1;
  }
  return i;
}

/** The end of the last whole word at or before `i`. */
function lastSpace(text: string, i: number, stop = i - RADIUS): number {
  for (let j = i; j > Math.max(0, stop); j -= 1) {
    if (text[j] === ' ') return j;
  }
  return i;
}

/**
 * What the result count says, or null while nothing is being searched for.
 *
 * A count of matches is a fact about a query, not a figure about a life — it
 * is the one number this app can print without a denominator problem, because
 * the denominator is "what you asked for". It says nothing about the archive
 * and nothing about you.
 */
export function foundLine(count: number, plain = false): string {
  if (count === 0) return plain ? 'No matches.' : 'Nothing with that in it.';
  // "One." and "2." alone read as a cryptogram under a text field. The word
  // costs nothing and makes the line a sentence.
  if (count === 1) return plain ? '1 match.' : 'One found.';
  return plain ? `${count} matches.` : `${count} found.`;
}
