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

/**
 * What a line already carries, read rather than assumed.
 *
 * `PREFIXES` says what the button *writes*; these say what counts as already
 * written, and the two are deliberately not the same string. A heading typed
 * as `# ` is a heading. A checkbox is a checkbox ticked or not, or the button
 * stops recognising its own work the moment you use it. And a bullet is a
 * bullet **only when it is not a checkbox** — `- [ ] bread` starts with `- `,
 * so a naive read lights up Bullet and Checklist at once and reports two
 * block types on one line.
 */
const PREFIX_PATTERNS: Record<LinePrefix, RegExp> = {
  heading: /^#{1,6} /,
  bullet: /^[-*+] (?!\[[ xX]\] )/,
  quote: /^> /,
  task: /^[-*+] \[[ xX]\] /,
};

/**
 * Every block marker, so one can be taken off before another goes on.
 *
 * **A line has one block type at a time.** Heading, bullet, checkbox and
 * quote are four answers to the same question — what kind of line is this —
 * so pressing one on a line that already has another *converts* it rather
 * than stacking. Without this, Bullet on `- [ ] bread` stripped the two
 * characters it recognised and left `[ ] bread`: the syntax showing through,
 * from a button that was only trying to help.
 */
const ANY_BLOCK = /^(?:#{1,6} |[-*+] \[[ xX]\] |[-*+] |> )+/;

/** The line with every block marker taken off it. */
function bare(line: string): string {
  return line.replace(ANY_BLOCK, '');
}

/** Whether this line already carries this kind of block. */
function carries(line: string, kind: LinePrefix): boolean {
  return PREFIX_PATTERNS[kind].test(line);
}

/** What a screen reader says, since the bar itself is drawings. */
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
 *
 * Putting one on **replaces** whatever block the line already had, because a
 * line is one kind of thing at a time. Pressing Checklist on a bullet gives a
 * checkbox, not `- - [ ] `; pressing Bullet on a checkbox gives a bullet, not
 * the `[ ] bread` the first cut left behind.
 */
export function togglePrefix(text: string, selection: Selection, kind: LinePrefix): Edit {
  const prefix = PREFIXES[kind];
  const { from, to } = lineSpan(text, selection);
  const lines = text.slice(from, to).split('\n');

  const allHave = lines.every((line) => carries(line, kind));
  const next = lines.map((line) => (allHave ? bare(line) : prefix + bare(line)));

  const body = next.join('\n');
  const grew = body.length - (to - from);
  const { start, end } = ordered(text, selection);
  const out = text.slice(0, from) + body + text.slice(to);

  // A caret stays a caret, nudged by whatever happened to *its own* line — it
  // was a place in the text and it should still be one. A range keeps
  // covering the same lines, so pressing the button again undoes it.
  if (start === end) {
    const i = text.slice(from, start).split('\n').length - 1;
    const lineFrom = from + next.slice(0, i).reduce((n, l) => n + l.length + 1, 0);
    const shift = next[i].length - lines[i].length;
    // Never below the line's own new start: a caret sitting inside the marker
    // that just came off has nowhere to be but the front of what is left.
    const at = clamp(start + shift, lineFrom, from + body.length);
    return { text: out, selection: { start: at, end: at } };
  }

  return {
    text: out,
    selection: { start: from, end: clamp(end + grew, from, from + body.length) },
  };
}

/**
 * Which block the lines under the selection already are.
 *
 * The bar shows this back, so the answer has to be the same one `togglePrefix`
 * would act on — hence `carries`, shared, rather than a second reading that
 * could drift from it. A prefix counts only when **every** line has it, for
 * exactly the reason removal does: two of three bulleted is not a bulleted
 * selection, it is a selection you are about to bullet.
 */
export function activePrefixes(text: string, selection: Selection): LinePrefix[] {
  const { from, to } = lineSpan(text, selection);
  const lines = text.slice(from, to).split('\n');
  return (Object.keys(PREFIXES) as LinePrefix[]).filter((kind) =>
    lines.every((line) => carries(line, kind)),
  );
}

/**
 * The marker pairs on one line: first to second, third to fourth.
 *
 * Naive on purpose. `snake_case` reads as an italic pair and there is no
 * cheap way to know it is not one — but the cost of being wrong is a button
 * that looks lit for a moment, not a mangled document, and every alternative
 * costs a parser.
 */
function pairsOn(line: string, marker: string): Array<{ open: number; close: number }> {
  const out: Array<{ open: number; close: number }> = [];
  let i = 0;
  let open = -1;
  while (i <= line.length - marker.length) {
    if (line.startsWith(marker, i)) {
      if (open === -1) open = i;
      else {
        out.push({ open, close: i });
        open = -1;
      }
      i += marker.length;
    } else i += 1;
  }
  return out;
}

/** Whether the selection sits wholly inside a marked run on its own line. */
function inside(text: string, start: number, end: number, marker: string): boolean {
  const from = text.lastIndexOf('\n', start - 1) + 1;
  const next = text.indexOf('\n', start);
  const to = next === -1 ? text.length : next;
  // A selection running past the end of the line is not inside anything: a
  // marked run does not cross a line break.
  if (end > to) return false;
  return pairsOn(text.slice(from, to), marker).some(
    (p) => start - from >= p.open + marker.length && end - from <= p.close,
  );
}

/**
 * Which marks the selection is already wearing.
 *
 * This is the half of a toolbar that teaches it. A row of buttons that look
 * identical whatever the caret is sitting in can only be learned by pressing
 * them and reading the syntax that comes out; a row where Bold is lit when you
 * tap into bold text has explained itself. It also answers the other half of
 * the question the icons cannot — pressing a lit button takes the format off.
 *
 * The three cases are `toggleMark`'s own, and that is not a coincidence:
 * anything this reports as on is something a press would turn off.
 */
export function activeMarks(text: string, selection: Selection): Mark[] {
  const { start, end } = tightened(text, ordered(text, selection));
  const inner = text.slice(start, end);
  return (Object.keys(MARKERS) as Mark[]).filter((mark) => {
    const marker = MARKERS[mark];
    // The markers are inside the selection: «**world**»
    if (
      inner.length >= marker.length * 2 &&
      inner.startsWith(marker) &&
      inner.endsWith(marker)
    ) {
      return true;
    }
    // The markers sit just outside it: **«world»**
    if (
      text.slice(Math.max(0, start - marker.length), start) === marker &&
      text.slice(end, end + marker.length) === marker
    ) {
      return true;
    }
    // Or the caret has simply been put down in the middle of a bold word.
    return inside(text, start, end, marker);
  });
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
