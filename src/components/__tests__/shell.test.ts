/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The web shell is pinned, and the pin has to actually be in charge.
 *
 * This is the fourth form of one bug — the app stopping short of the bottom
 * of the phone — and the first three fixes all missed for the same reason:
 * they assumed the pinning they had written was in effect. It was not. Expo's
 * own reset ships `#root { height: 100% }` above ours, and CSS 2.1 §10.6.4
 * says that when `top`, `bottom` and `height` are all given on a fixed
 * element, **`bottom` is ignored**. So the rule that was supposed to have
 * replaced the measurement sat directly underneath it, doing nothing, through
 * three rounds of this.
 *
 * Nothing about that is visible in a screenshot, in `innerText`, or in a
 * typecheck. It is visible in one line of CSS, so this reads that line.
 */

const SHELL = join(__dirname, '..', '..', '..', 'tools', 'pwa-head.mjs');
const src = String(readFileSync(SHELL, 'utf8'));

/**
 * The pinning rule's own declaration block, comments stripped.
 *
 * Anchored on `#root` alone at the start of a line — the shell also paints a
 * pre-bundle ground through `html, body, #root`, and reading that one instead
 * would pass every assertion below while proving nothing.
 */
function rootRule(): string {
  // Comments come out first, not last: the one inside this very rule quotes
  // `#root { height: 100% }`, and a brace in a comment would close the block
  // early — which is how the first cut of this test managed to read four
  // lines of a rule and pass.
  const bare = src.replace(/\/\*[\s\S]*?\*\//g, '');
  const at = bare.search(/\n\s*#root\s*\{/);
  expect(at, 'no standalone #root rule in the shell').toBeGreaterThan(-1);
  const open = bare.indexOf('{', at);
  return bare.slice(open + 1, bare.indexOf('}', open));
}

describe('the pinned shell', () => {
  it('pins to all four sides', () => {
    const rule = rootRule();
    for (const side of ['top: 0', 'right: 0', 'bottom: 0', 'left: 0']) {
      expect(rule, `#root is not pinned: missing ${side}`).toContain(side);
    }
    expect(rule).toContain('position: fixed');
  });

  it('neutralises the height, or the pin is ignored', () => {
    // `height: auto` is not a height calculation — it is the absence of one,
    // which is the only thing that lets `top` and `bottom` decide. Drop it
    // and Expo's `height: 100%` wins by being the only height there is.
    expect(rootRule(), 'the pin is inert without `height: auto`').toMatch(/height:\s*auto/);
  });

  it('never measures the viewport', () => {
    // Every unit that claims to be the height of the screen has cost this app
    // this exact bug: percentages resolve against a viewport a translucent
    // status bar shrinks, -webkit-fill-available settles a frame late, and
    // dvh is only as honest as the browser's idea of what counts as dynamic.
    const rule = rootRule();
    for (const unit of ['vh', 'dvh', 'svh', 'lvh', 'fill-available', '100%']) {
      expect(rule, `#root measures the viewport with ${unit}`).not.toContain(unit);
    }
  });

  it('injects below Expo’s reset, and fails the build if that changes', () => {
    // Same specificity, so the later rule wins and nothing else does. If Expo
    // ever moves its reset down the head, the app goes back to measuring
    // silently — so the build checks the order rather than trusting it.
    expect(src).toContain('id="expo-reset"');
    expect(src, 'the build does not check that the shell wins').toMatch(
      /reset\s*>\s*html\.indexOf\(MARKER\)/,
    );
  });

  it('keeps the safety net off the keyboard', () => {
    // The visual-viewport net exists for the Safari-tab case, where toolbars
    // overlay the layout viewport instead of shrinking it. While the keyboard
    // is up the visual viewport is *supposed* to be short, and resizing the
    // app to it would squash the layout under every keystroke.
    const at = src.indexOf('function fit(');
    expect(at, 'no visual-viewport safety net').toBeGreaterThan(-1);
    const fit = src.slice(at, src.indexOf('function settle(', at));
    expect(fit).toContain('activeElement');
    expect(fit).toMatch(/TEXTAREA/);
    // And it must release the pin before measuring it, or it can only ever
    // agree with the height it set last time.
    expect(fit, 'the net never re-tests the pin').toMatch(/style\.height\s*=\s*''/);
  });
});
