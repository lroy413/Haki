/// <reference types="node" />
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Every tab screen takes its padding from `useTabInsets`.
 *
 * The tabs have no navigation header, so each screen is responsible for
 * starting below the notch and ending above the floating bar. Get that wrong
 * and the title sits under the status bar — but only on a phone with a notch,
 * which is exactly the device a browser screenshot cannot show you.
 *
 * So: no tab screen works out its own clearance. One place does the
 * arithmetic — and it asks the bar what it measured rather than trusting a
 * constant, because the bar is shorter in plain mode and sits differently on a
 * phone with a home indicator. This keeps it that way.
 */

const ROOT = join(__dirname, '..', '..', '..');
const TABS = join(ROOT, 'app', '(tabs)');

const screens = readdirSync(TABS).filter((f) => f.endsWith('.tsx') && f !== '_layout.tsx');

describe('tab screens use the inset hook', () => {
  it('finds the tab screens at all', () => {
    // Guards against the read silently matching nothing and passing forever.
    expect(screens.length).toBeGreaterThanOrEqual(4);
  });

  it.each(screens)('%s', (name) => {
    const src = String(readFileSync(join(TABS, name), 'utf8'));
    expect(src, 'import useTabInsets from components/PageHeading').toContain('useTabInsets');
    expect(src, 'let useTabInsets do the clearance arithmetic').not.toContain(
      'TAB_BAR_CLEARANCE',
    );
    // Nor by measuring the bar itself and doing the sum a second time.
    expect(src, 'take the padding from useTabInsets, not the bar height').not.toContain(
      'useTabBarHeight',
    );
  });
});
