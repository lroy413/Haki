import { describe, expect, it } from 'vitest';
import { firstLine, insertRule, plainLine, toggleMark, togglePrefix } from '../markdown';

/**
 * Write the selection as visible guillemets, so a failure reads at a glance.
 *
 * Deliberately not square brackets: a checkbox is `- « »`, and a helper that
 * strips every bracket in the string eats the syntax it is meant to be
 * testing. The first cut did exactly that and reported an app bug that was
 * entirely the harness's.
 */
const show = ({
  text,
  selection,
}: {
  text: string;
  selection: { start: number; end: number };
}) =>
  `${text.slice(0, selection.start)}«${text.slice(selection.start, selection.end)}»${text.slice(selection.end)}`;

const at = (marked: string) => {
  const start = marked.indexOf('«');
  const end = marked.indexOf('»') - 1;
  return { text: marked.replace(/[«»]/g, ''), selection: { start, end } };
};

describe('wrapping a selection', () => {
  it('wraps what is selected and keeps it selected', () => {
    const { text, selection } = at('hello «world»');
    expect(show(toggleMark(text, selection, 'bold'))).toBe('hello **«world»**');
  });

  it('unwraps when the markers are inside the selection', () => {
    const { text, selection } = at('hello «**world**»');
    expect(show(toggleMark(text, selection, 'bold'))).toBe('hello «world»');
  });

  it('unwraps when the markers sit just outside it', () => {
    // Selecting the words and pressing Bold again is the same intent as
    // selecting the markers too. Both have to undo.
    const { text, selection } = at('hello **«world»**');
    expect(show(toggleMark(text, selection, 'bold'))).toBe('hello «world»');
  });

  it('puts the caret between the markers when nothing is selected', () => {
    // The case that makes the button worth pressing: type, then keep typing
    // inside what you just opened.
    const { text, selection } = at('hello «»');
    expect(show(toggleMark(text, selection, 'bold'))).toBe('hello **«»**');
  });

  it('handles a backwards selection', () => {
    // Dragging right to left gives start > end on the web.
    expect(show(toggleMark('hello world', { start: 11, end: 6 }, 'italic'))).toBe(
      'hello _«world»_',
    );
  });

  it('does the same for italic and code', () => {
    const { text, selection } = at('«x»');
    expect(toggleMark(text, selection, 'italic').text).toBe('_x_');
    expect(toggleMark(text, selection, 'code').text).toBe('`x`');
  });

  it('leaves whitespace outside the markers', () => {
    // Found in a browser, not in a test: five presses of Shift+Right from the
    // start of "milk\nbread" selects the newline too, and wrapping that gives
    // `**milk\n**` — a marker on the wrong side of a line break. A
    // double-click on the web takes the trailing space the same way.
    expect(toggleMark('milk\nbread', { start: 0, end: 5 }, 'bold').text).toBe(
      '**milk**\nbread',
    );
    expect(toggleMark('a word here', { start: 1, end: 7 }, 'bold').text).toBe(
      'a **word** here',
    );
  });

  it('still wraps a caret sitting in a gap', () => {
    // All-whitespace is not a sloppy selection, it is a place to start typing.
    expect(show(toggleMark('a b', { start: 1, end: 2 }, 'bold'))).toBe('a**« »**b');
  });

  it('round-trips', () => {
    const once = toggleMark('a word here', { start: 2, end: 6 }, 'bold');
    const twice = toggleMark(once.text, once.selection, 'bold');
    expect(twice.text).toBe('a word here');
  });
});

describe('prefixing lines', () => {
  it('prefixes the line the caret is on, wherever in it the caret sits', () => {
    const { text, selection } = at('one\ntw«»o\nthree');
    expect(togglePrefix(text, selection, 'bullet').text).toBe('one\n- two\nthree');
  });

  it('prefixes every line the selection touches', () => {
    const { text, selection } = at('«one\ntwo\nthree»');
    expect(togglePrefix(text, selection, 'quote').text).toBe('> one\n> two\n> three');
  });

  it('removes only when every line already has it', () => {
    // Two of three bulleted means the finger wanted the third bulleted too.
    // Removing all three is the reading no editor uses.
    const mixed = at('«- one\ntwo\n- three»');
    expect(togglePrefix(mixed.text, mixed.selection, 'bullet').text).toBe(
      '- one\n- two\n- three',
    );

    const all = at('«- one\n- two»');
    expect(togglePrefix(all.text, all.selection, 'bullet').text).toBe('one\ntwo');
  });

  it('still recognises a checkbox that has been ticked', () => {
    // Otherwise the button stops seeing its own work the moment you use it.
    const done = at('«- [x] one\n- [ ] two»');
    expect(togglePrefix(done.text, done.selection, 'task').text).toBe('one\ntwo');
  });

  it('adds a checkbox unticked', () => {
    const { text, selection } = at('«buy milk»');
    expect(togglePrefix(text, selection, 'task').text).toBe('- [ ] buy milk');
  });

  it('handles the first and last line of the field', () => {
    expect(togglePrefix('solo', { start: 0, end: 0 }, 'heading').text).toBe('## solo');
    expect(togglePrefix('a\nb', { start: 3, end: 3 }, 'heading').text).toBe('a\n## b');
  });

  it('leaves the rest of the text alone', () => {
    const { text, selection } = at('keep\n«change»\nkeep');
    const out = togglePrefix(text, selection, 'bullet').text;
    expect(out).toBe('keep\n- change\nkeep');
  });
});

describe('the rule', () => {
  it('starts on its own line', () => {
    expect(insertRule('above', { start: 5, end: 5 }).text).toBe('above\n---\n');
    expect(insertRule('above\n', { start: 6, end: 6 }).text).toBe('above\n---\n');
  });
});

describe('a note that has not been named', () => {
  it('takes the first line and drops the syntax', () => {
    expect(firstLine('## Groceries\n- milk')).toBe('Groceries');
    expect(firstLine('- [ ] call the bank')).toBe('call the bank');
    expect(firstLine('> a quote')).toBe('a quote');
    expect(firstLine('**bold** start')).toBe('bold start');
  });

  it('skips leading blank lines', () => {
    expect(firstLine('\n\n  real content')).toBe('real content');
  });

  it('is empty for an empty note, rather than inventing a name', () => {
    expect(firstLine('')).toBe('');
    expect(firstLine('\n  \n')).toBe('');
  });

  it('strips the syntax off any line, not just the first', () => {
    // The list draws a preview under the name, and "- [ ] bread" there is the
    // syntax leaking into the furniture.
    expect(plainLine('- [ ] bread')).toBe('bread');
    expect(plainLine('- [x] eggs')).toBe('eggs');
    expect(plainLine('  > quoted  ')).toBe('quoted');
    expect(plainLine('### Heading')).toBe('Heading');
    expect(plainLine('some **bold** and `code`')).toBe('some bold and code');
  });

  it('trims a long first line rather than letting it run', () => {
    const long = 'x'.repeat(200);
    expect(firstLine(long).length).toBeLessThanOrEqual(60);
    expect(firstLine(long).endsWith('…')).toBe(true);
  });
});
