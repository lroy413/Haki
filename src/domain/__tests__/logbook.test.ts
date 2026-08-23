import { describe, expect, it } from 'vitest';
import { CAPTURE_PLACEHOLDER, appendLine, isWritable } from '../logbook';

describe('appendLine', () => {
  it('is the whole entry when there is nothing yet', () => {
    expect(appendLine('', 'Slept badly, went anyway.')).toBe('Slept badly, went anyway.');
  });

  it('separates lines by a blank one, so Markdown keeps them apart', () => {
    expect(appendLine('First.', 'Second.')).toBe('First.\n\nSecond.');
  });

  it('does not stack blank lines on an entry that ends in whitespace', () => {
    expect(appendLine('First.\n\n', 'Second.')).toBe('First.\n\nSecond.');
    expect(appendLine('First.\n   \n\n', 'Second.')).toBe('First.\n\nSecond.');
  });

  it('trims the line without touching what is already written', () => {
    expect(appendLine('  Kept as typed.  ', '  new  ')).toBe('  Kept as typed.\n\nnew');
  });

  it('changes nothing when the line is blank', () => {
    // The caller hands over whatever is in the field; deciding is this job.
    expect(appendLine('Already here.', '')).toBe('Already here.');
    expect(appendLine('Already here.', '   \n ')).toBe('Already here.');
    expect(appendLine('', '   ')).toBe('');
  });

  it('keeps the newlines inside a pasted line', () => {
    expect(appendLine('', 'one\ntwo')).toBe('one\ntwo');
  });
});

describe('isWritable', () => {
  it('agrees with appendLine about what counts as nothing', () => {
    for (const line of ['', '   ', '\n', ' \t ']) {
      expect(isWritable(line)).toBe(false);
      expect(appendLine('x', line)).toBe('x');
    }
    for (const line of ['a', ' a ', '.']) {
      expect(isWritable(line)).toBe(true);
      expect(appendLine('x', line)).not.toBe('x');
    }
  });
});

describe('the prompt', () => {
  it('does not ask a question', () => {
    // A question is a thing to answer, and answering is the part that does
    // not happen.
    expect(CAPTURE_PLACEHOLDER).not.toContain('?');
  });

  it('never shames', () => {
    const lower = CAPTURE_PLACEHOLDER.toLowerCase();
    for (const word of ['failed', 'should', 'lazy', 'behind', 'finally', 'forgot', 'missed']) {
      expect(lower).not.toContain(word);
    }
  });
});
