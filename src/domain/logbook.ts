/**
 * The Logbook — and the way in that asks nothing.
 *
 * Oden kept one when he left Wano, and the whole point of a ship's log is that
 * it is not writing. It is a line about the day, entered because the day
 * happened. Nobody ever failed to keep a log because they could not think of
 * an opening sentence.
 *
 * Which is the friction this removes. The editor is a full screen with a
 * cursor blinking in an empty document, and an empty document is a demand —
 * for a subject, a length, a reason to have opened it. So there is a second
 * door: one line, typed where you already are, folded into today's entry. No
 * title, no tags, no mood, no prompt, nothing required and nothing asked.
 *
 * Lines through a day accumulate into one entry rather than one entry each,
 * because that matches what a day's log is and because the daily practice
 * counts entries — three quick lines on a Tuesday is one Tuesday, not three.
 */

/**
 * Fold a captured line into whatever today's entry already holds.
 *
 * A blank line changes nothing: the caller can hand this whatever is in the
 * field without checking first.
 *
 * Separated by a blank line rather than a newline, because these are
 * paragraphs in Markdown and a single newline would run them together on the
 * way back out.
 */
export function appendLine(existing: string, line: string): string {
  const next = line.trim();
  if (!next) return existing;
  const before = existing.replace(/\s+$/, '');
  return before ? `${before}\n\n${next}` : next;
}

/** Whether a capture would write anything at all. */
export function isWritable(line: string): boolean {
  return line.trim().length > 0;
}

/**
 * The one-line prompt on the capture field.
 *
 * Not a question. A question is a thing to answer, and answering is the part
 * that does not happen — this is a field that says what it takes and nothing
 * about what it is for.
 */
export const CAPTURE_PLACEHOLDER = 'A line. Anything.';
