/**
 * The writing toolbar's actual work.
 *
 * Every button on the bar is one of two operations on a string and a
 * selection: wrap the selection in a marker, or put a prefix on each line it
 * touches. Both toggle — pressing Bold on bold text takes the bold off, which
 * is the behaviour of every editor anybody has used and the absence of which
 * makes a toolbar feel broken.
 *
 * It lives here, in pure TypeScript, because it is exactly the kind of thing
 * that is fiddly at the edges and trivial to test: an empty selection, a
 * selection that already carries the marker, a multi-line selection with the
 * prefix on some lines and not others, a selection that starts mid-word. All
 * of that is arithmetic on a string, and none of it needs a simulator.
 *
 * **The result carries a selection back.** A toolbar that formats the text and
 * then drops the caret at the end is a toolbar you use once: the point of
 * bolding an empty selection is to keep typing inside the markers.
 */

export type Selection = { start: number; end: number };
export type Edit = { text: string; selection: Selection };

/** The markers, and what each button is called. */
export type Mark = 'bold' | 'italic' | 'code';
export type LinePrefix = 'heading' | 'bullet' | 'quote' | 'task';

const MARKERS: Record<Mark, string> = {
  bold: '**',
  italic: '_',
  code: '`',
};

const PREFIXES: Record<LinePrefix, string> = {
  heading: '## ',
  bullet: '- ',
  quote: '> ',
  task: '- [ ] ',
};

/** What the buttons say. Short — the bar sits above a keyboard. */
export const MARK_LABELS: Record<Mark, string> = {
  bold: 'B',
  italic: 'I',
  code: '`',
};

/**
 * Glyphs, chosen for legibility at 17pt rather than for cleverness.
 *
 * `❝` was the first pick for quote and renders as a small raised mark that
 * reads as a stray speck on the bar. A solid left bar is what a blockquote
 * looks like in every editor, and it survives being small.
 */
export const PREFIX_LABELS: Record<LinePrefix, string> = {
  heading: 'H',
  bullet: '•',
  quote: '▌',
  task: '☐',
};

/** What a screen reader says, since the labels above are glyphs. */
export const MARK_NAMES: Record<Mark, string> = {
  bold: 'Bold',
  italic: 'Italic',
  code: 'Code',
};

export const PREFIX_NAMES: Record<LinePrefix, string> = {
  heading: 'Heading',
  bullet: 'Bullet list',
  quote: 'Quote',
  task: 'Checkbox',
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function ordered(text: string, selection: Selection): Selection {
  const start = clamp(Math.min(selection.start, selection.end), 0, text.length);
  const end = clamp(Math.max(selection.start, selection.end), 0, text.length);
  return { start, end };
}

/**
 * Pull the selection in off surrounding whitespace.
 *
 * Selections arrive carrying whitespace constantly, through nobody's fault: a
 * double-click on the web takes the trailing space with the word, and dragging
 * to the end of a line takes the newline with it. Wrapping those verbatim
 * produces `**milk\n**`, which is not bold — it is a broken marker on the wrong
 * side of a line break. Found by selecting a line in a browser and pressing
 * the button, which is the only way it shows up.
 *
 * A selection that is *all* whitespace is left exactly as it is: that is a
 * caret sitting in a gap, and the markers belong right there.
 */
function tightened(text: string, selection: Selection): Selection {
  let { start, end } = selection;
  while (start < end && /\s/.test(text[start])) start += 1;
  while (end > start && /\s/.test(text[end - 1])) end -= 1;
  return start === end ? selection : { start, end };
}

/**
 * Wrap the selection, or unwrap it if it is already wrapped.
 *
 * With nothing selected it inserts the pair and puts the caret between them,
 * so the next keystroke lands inside. That is the case that makes the button
 * worth pressing at all.
 */
export function toggleMark(text: string, selection: Selection, mark: Mark): Edit {
  const marker = MARKERS[mark];
  const { start, end } = tightened(text, ordered(text, selection));
  const inner = text.slice(start, end);

  // Already wrapped, markers inside the selection: **like this**
  if (inner.length >= marker.length * 2 && inner.startsWith(marker) && inner.endsWith(marker)) {
    const stripped = inner.slice(marker.length, inner.length - marker.length);
    return {
      text: text.slice(0, start) + stripped + text.slice(end),
      selection: { start, end: start + stripped.length },
    };
  }

  // Already wrapped, markers just outside the selection: **|like this|**
  const before = text.slice(Math.max(0, start - marker.length), start);
  const after = text.slice(end, end + marker.length);
  if (before === marker && after === marker) {
    const cut = start - marker.length;
    return {
      text: text.slice(0, cut) + inner + text.slice(end + marker.length),
      selection: { start: cut, end: cut + inner.length },
    };
  }

  const wrapped = marker + inner + marker;
  return {
    text: text.slice(0, start) + wrapped + text.slice(end),
    // Empty selection: caret between the markers. Otherwise: keep the words
    // selected, so a second press undoes it.
    selection:
      inner.length === 0
        ? { start: start + marker.length, end: start + marker.length }
        : { start: start + marker.length, end: start + marker.length + inner.length },
  };
}

/** The span of whole lines the selection touches. */
function lineSpan(text: string, selection: Selection): { from: number; to: number } {
  const { start, end } = ordered(text, selection);
  const from = text.lastIndexOf('\n', start - 1) + 1;
  const next = text.indexOf('\n', end);
  return { from, to: next === -1 ? text.length : next };
}

/**
 * Put a prefix on every line the selection touches, or take it off.
 *
 * Off only when **every** line already has it. A selection where two lines out
 * of three are bulleted wants the third bulleted too — that is what the finger
 * meant, and removing all three instead is the reading no editor uses.
 */
export function togglePrefix(text: string, selection: Selection, kind: LinePrefix): Edit {
  const prefix = PREFIXES[kind];
  const { from, to } = lineSpan(text, selection);
  const lines = text.slice(from, to).split('\n');

  // A task box counts as prefixed whether it is ticked or not, or checking one
  // off would make the button stop recognising its own work.
  const has = (line: string) =>
    kind === 'task' ? /^- \[[ xX]\] /.test(line) : line.startsWith(prefix);

  const allHave = lines.every(has);
  const next = lines.map((line) => {
    if (allHave) {
      const width =
        kind === 'task' ? (/^- \[[ xX]\] /.exec(line)?.[0].length ?? 0) : prefix.length;
      return line.slice(width);
    }
    return has(line) ? line : prefix + line;
  });

  const body = next.join('\n');
  const grew = body.length - (to - from);
  const { start, end } = ordered(text, selection);
  const out = text.slice(0, from) + body + text.slice(to);

  // A caret stays a caret, nudged by whatever happened to its own line — it
  // was a place in the text and it should still be one. A range keeps
  // covering the same lines, so pressing the button again undoes it.
  if (start === end) {
    const lineFrom = text.lastIndexOf('\n', start - 1) + 1;
    const carried = widthOn(text, lineFrom, kind);
    const shift = allHave ? -carried : carried > 0 ? 0 : PREFIXES[kind].length;
    const at = clamp(start + shift, from, from + body.length);
    return { text: out, selection: { start: at, end: at } };
  }

  return {
    text: out,
    selection: { start: from, end: clamp(end + grew, from, from + body.length) },
  };
}

function lineIndexEnd(text: string, at: number): number {
  const next = text.indexOf('\n', at);
  return next === -1 ? text.length : next;
}

/** How much prefix this line actually carries, which a task box varies. */
function widthOn(text: string, lineFrom: number, kind: LinePrefix): number {
  const line = text.slice(lineFrom, lineIndexEnd(text, lineFrom));
  if (kind === 'task') return /^- \[[ xX]\] /.exec(line)?.[0].length ?? 0;
  return line.startsWith(PREFIXES[kind]) ? PREFIXES[kind].length : 0;
}

/**
 * A ruled line, inserted whole.
 *
 * Its own function because it is the one control that ignores the selection
 * entirely — a horizontal rule goes between things, never around them.
 */
export function insertRule(text: string, selection: Selection): Edit {
  const { start, end } = ordered(text, selection);
  const atLineStart = start === 0 || text[start - 1] === '\n';
  const piece = `${atLineStart ? '' : '\n'}---\n`;
  return {
    text: text.slice(0, start) + piece + text.slice(end),
    selection: { start: start + piece.length, end: start + piece.length },
  };
}

/**
 * The first line, as a title — for a note that has not been given one.
 *
 * Strips the markdown a heading would carry, because "## Groceries" in a list
 * of note titles is the syntax leaking into the furniture.
 */
export function firstLine(body: string, max = 60): string {
  const line = body
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return '';
  const bare = plainLine(line);
  return bare.length > max ? `${bare.slice(0, max - 1).trimEnd()}…` : bare;
}

/**
 * One line with its markdown taken off.
 *
 * The list shows names and previews, and `- [ ] bread` in a preview is the
 * syntax leaking into the furniture — the same fault `firstLine` exists to
 * fix, one line further down the row.
 */
export function plainLine(line: string): string {
  // Trim first: every pattern below is anchored, so an indented line would
  // otherwise sail straight past all of them.
  return line
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/^[-*+]\s+(\[[ xX]\]\s+)?/, '')
    .replace(/^>\s+/, '')
    .replace(/[*_`]/g, '')
    .trim();
}
