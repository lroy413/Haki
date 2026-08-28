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

/** The installed branch of the safety net, as source. */
function installed(): string {
  const fit = net();
  const at = fit.indexOf('if (STANDALONE)');
  expect(at, 'the net has no installed branch').toBeGreaterThan(-1);
  return fit.slice(at, fit.indexOf('return;', at) + 7);
}

/** The visual-viewport safety net, as source. */
function net(): string {
  const at = src.indexOf('function fit(');
  expect(at, 'no visual-viewport safety net').toBeGreaterThan(-1);
  // Ends where `fit` does, not at the next function: the shell's own
  // self-report sits between them and also reads `visualViewport`, and a
  // slice that swallowed it would let the tab branch's assertions pass on
  // the wrong code.
  const end = src.indexOf('window.__HAKI_SHELL__', at);
  return src.slice(at, end > -1 ? end : src.indexOf('function settle(', at));
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

  it('never shrinks the installed app, and puts a floor under it', () => {
    // The fourth fix caused the fifth round. The pin was right — 874 points
    // on the phone it happens on — and the net beside it read
    // `visualViewport.height`, got 812, and shrank the app to it. 874 − 812
    // is 62, which is exactly that phone's *top* safe-area inset: in a
    // black-translucent standalone app iOS reports a visual viewport with
    // the status bar's strip taken off it.
    //
    // So the installed branch may only ever grow, and only to the layout
    // viewport — which in a standalone app with viewport-fit=cover is the
    // screen. That is a floor under every future cause of this bug,
    // whatever it turns out to be.
    const fit = net();
    expect(src, 'the shell does not know whether it is installed').toMatch(
      /navigator\.standalone|display-mode:\s*standalone/,
    );
    const branch = installed();
    expect(branch, 'the installed branch can shrink the app').not.toMatch(
      /visualViewport|vv\./,
    );
    expect(branch, 'the installed branch does not grow').toMatch(
      /window\.innerHeight\s*-\s*pinned\s*>/,
    );
  });

  it('never grows past the viewport, because there is nothing past it', () => {
    // Round six aimed at `screen.height` and put the tab bar's labels off the
    // bottom of the phone. Two measurements off the screenshot settle it: the
    // wordmark's cap sits at exactly `insets.top + space.lg`, so the viewport
    // is anchored at screen y = 0; and the tab bar's rounded rect reaches its
    // full left edge at 811.3 and then stops dead at 812.0, which is a clip
    // rather than a corner completing.
    //
    // iOS gives this app a web view positioned full-screen and sized as
    // though it were inset at the top. The last sixty-two points cannot be
    // painted into by anything.
    expect(installed(), 'the installed branch aims past the viewport').not.toMatch(
      /screenHeight\(\)/,
    );
  });

  it('publishes how much screen the app is not given', () => {
    // Not as a shortfall — it is not one the app can close — but so the tab
    // bar can stop reserving a bottom inset whose hazard is outside the box.
    expect(src, 'the shell cannot say what is out of reach').toContain('__HAKI_UNREACHABLE__');
    const band = src.slice(src.indexOf('window.__HAKI_UNREACHABLE__'));
    expect(band.slice(0, 260)).toMatch(/screenHeight\(\)\s*-\s*window\.innerHeight/);
    // Orientation is read off the window rather than assumed: iOS has
    // reported screen dimensions in the device's own orientation on some
    // versions and the current one on others.
    const measure = src.slice(
      src.indexOf('function screenHeight('),
      src.indexOf('function typing('),
    );
    expect(measure).toMatch(/innerHeight\s*>=\s*window\.innerWidth/);
    expect(measure).toMatch(/Math\.max\(s\.width, s\.height\)/);
  });

  it('measures the shortfall against the box it can actually paint into', () => {
    // The readout's first cut compared against `innerHeight` while the app was
    // aiming at the screen, so it reported "filling the screen" sixty-two
    // points short of it. Its second cut compared against the screen, which
    // called an unreachable band a shortfall. The target is the viewport, and
    // the band is reported beside it as its own fact.
    const report = src.slice(src.indexOf('window.__HAKI_SHELL__'));
    const target = report.slice(report.indexOf('var target'), report.indexOf('return out'));
    expect(target, 'the readout still aims at the screen').not.toMatch(/screenHeight\(\)/);
    expect(target, 'the readout does not report the unreachable band').toMatch(
      /out\.unreachable\s*=/,
    );
  });

  it('keeps both branches off the keyboard', () => {
    // While the keyboard is up the viewport is *supposed* to move, and
    // correcting for it would squash the layout under every keystroke.
    const fit = net();
    expect(fit, 'the shell corrects while an input is focused').toMatch(
      /if\s*\(!root \|\| typing\(\)\)/,
    );
    const guard = src.slice(src.indexOf('function typing('));
    expect(guard.slice(0, 400)).toContain('activeElement');
    expect(guard.slice(0, 400)).toMatch(/TEXTAREA/);
    // And it releases the pin before measuring it, or it can only ever agree
    // with the height it set last time.
    expect(fit, 'the shell never re-tests the pin').toMatch(/style\.height\s*=\s*''/);
  });

  it('can say what it measured, and which build said it', () => {
    // Five rounds of this bug were diagnosed by inference from a screenshot
    // and three of those inferences were wrong. The phone is the only thing
    // that knows, so it is given a way to say — and a build stamp, because
    // a PWA updates silently and "did the fix arrive" is otherwise
    // unanswerable exactly when it matters most.
    expect(src, 'the shell cannot report itself').toContain('__HAKI_SHELL__');
    expect(src, 'the build is not stamped').toContain('__HAKI_BUILD__');
    expect(src, 'the build stamp is not taken from the bundle hash').toMatch(
      /entry-\(\[a-f0-9\]\{8\}\)/,
    );
  });

  it('asks iOS for the whole screen in both grammars', () => {
    // Seventh round, and the first aimed at the cause. The phone's readout
    // showed a hybrid no single mode produces: positioned as a full-bleed
    // translucent app (painting from y = 0, env() reporting 62/34) but sized
    // as one that starts below the status bar (812 on an 874 screen). iOS
    // has two install grammars — the W3C manifest and the legacy
    // apple-mobile-web-app metas — and this app declared both. They must
    // agree on full-bleed, or one decides position and the other size.
    expect(src, 'the viewport meta lost viewport-fit=cover').toContain('viewport-fit=cover');
    expect(src, 'the viewport meta lost height=device-height').toContain(
      'height=device-height',
    );
    const manifest = JSON.parse(
      String(
        readFileSync(join(__dirname, '..', '..', '..', 'public', 'manifest.json'), 'utf8'),
      ),
    ) as { display?: string };
    expect(manifest.display, 'the manifest reserves the status bar again').toBe('fullscreen');
    expect(src, 'the translucent meta is gone').toContain('black-translucent');
  });

  it('reports which grammar won', () => {
    // After a reinstall, the Display-mode row is the first thing to read: it
    // distinguishes "the manifest change did not take" from "it took and did
    // not help", which is otherwise another full round of guessing.
    const report = src.slice(src.indexOf('window.__HAKI_SHELL__'));
    expect(report).toMatch(/display-mode:\s*fullscreen/);
    expect(report).toMatch(/mode:\s*mode/);
  });

  it('keeps the probes out of the SPA rewrite', () => {
    // The probe pages under /probe isolate the four install grammars on a
    // real phone. Vercel rewrites every unlisted path to the app shell, so a
    // probe that is not carved out serves the app with the probe's URL — an
    // experiment that silently measures the wrong thing.
    const vercel = String(
      readFileSync(join(__dirname, '..', '..', '..', 'vercel.json'), 'utf8'),
    );
    expect(vercel, 'the rewrite swallows /probe').toMatch(/\(\?![^)]*probe[^)]*\)/);

    // The probes also step out of the app's cross-origin-isolation headers —
    // the owner's working apps do not send them, and the probes exist to be
    // those apps. Probe X alone gets the headers back, so W vs X isolates
    // exactly that variable. The app itself must keep them: no isolation, no
    // SharedArrayBuffer, no database.
    const rules = JSON.parse(vercel) as {
      headers: { source: string; headers: { key: string }[] }[];
    };
    const global = rules.headers.find((r) =>
      r.headers.some((h) => h.key === 'Cross-Origin-Embedder-Policy'),
    );
    expect(global?.source, 'the app lost its isolation headers').toContain('(?!probe)');
    expect(
      rules.headers.some(
        (r) =>
          r.source.startsWith('/probe/x') &&
          r.headers.some((h) => h.key === 'Cross-Origin-Embedder-Policy'),
      ),
      'probe X lost the header variable it exists to test',
    ).toBe(true);
  });

  it('asks for a new shell every time the app comes back', () => {
    // The worker is network-first for navigations, which is enough on the
    // web. A standalone app on iOS is resumed for days without navigating
    // again, so a fix that lives in the shell can sit undelivered while both
    // ends believe it shipped.
    expect(src, 'the app never asks for an update once installed').toMatch(
      /reg\.update\(\)[\s\S]{0,400}visibilitychange|visibilitychange[\s\S]{0,400}reg\.update\(\)/,
    );
    // And the reload guard: `controllerchange` also fires the first time a
    // worker claims an uncontrolled page, and reloading on that is a loop.
    expect(src).toMatch(/if\s*\(navigator\.serviceWorker\.controller\)/);
  });
});
