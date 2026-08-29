import { describe, expect, it } from 'vitest';
import {
  saidBytes,
  storageAdvice,
  storageLabel,
  storageLine,
  type StorageState,
} from '../storage';

const web = (over: Partial<Extract<StorageState, { kind: 'web' }>> = {}): StorageState => ({
  kind: 'web',
  persisted: false,
  usedBytes: 0,
  quotaBytes: null,
  ...over,
});

describe('bytes, said', () => {
  it('scales without dumping digits', () => {
    expect(saidBytes(0)).toBe('0 B');
    expect(saidBytes(900)).toBe('900 B');
    expect(saidBytes(2048)).toBe('2.0 KB');
    expect(saidBytes(60_000)).toBe('59 KB');
    expect(saidBytes(5 * 1024 * 1024)).toBe('5.0 MB');
    expect(saidBytes(500 * 1024 * 1024)).toBe('500 MB');
    expect(saidBytes(3 * 1024 * 1024 * 1024)).toBe('3.0 GB');
  });

  it('says unknown rather than inventing a zero', () => {
    // A browser that will not estimate has not told us the size is nothing.
    expect(saidBytes(null)).toBe('unknown');
  });
});

describe('the verdict', () => {
  it('separates anchored from not, in both modes', () => {
    for (const plain of [false, true]) {
      expect(storageLine(web({ persisted: true }), plain)).not.toBe(
        storageLine(web({ persisted: false }), plain),
      );
    }
  });

  it('tells the truth when the browser will not say', () => {
    const line = storageLine({ kind: 'unsupported' }).toLowerCase();
    expect(line).toContain('export');
  });

  it('says native storage is safe rather than measuring it', () => {
    const line = storageLine({ kind: 'native' });
    expect(line.length).toBeGreaterThan(0);
    expect(line).not.toMatch(/\d/);
  });

  it('drops the nautical vocabulary in plain mode', () => {
    expect(storageLine(web({ persisted: true }), true)).not.toContain('Anchored');
    expect(storageLine({ kind: 'native' }, true).toLowerCase()).not.toContain('ship');
    expect(storageLabel(true)).not.toContain('hold');
  });
});

describe('the advice', () => {
  it('says nothing when there is nothing to do', () => {
    expect(storageAdvice({ kind: 'native' })).toBeNull();
    expect(storageAdvice(web({ persisted: true }))).toBeNull();
  });

  it('names the thing that actually flips it', () => {
    const advice = storageAdvice(web({ persisted: false })) ?? '';
    expect(advice.toLowerCase()).toContain('home screen');
    expect(advice.toLowerCase()).toContain('export');
  });

  it('never blames the reader', () => {
    const copy = [
      storageLine(web({ persisted: false })),
      storageLine(web({ persisted: false }), true),
      storageLine({ kind: 'unsupported' }),
      storageAdvice(web({ persisted: false })) ?? '',
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['failed', 'should have', 'you forgot', 'warning', 'error', 'danger']) {
      expect(copy).not.toContain(word);
    }
  });
});
