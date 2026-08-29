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
    expect(band).toMatch(/screenHeight\(\)\s*-\s*window\.innerHeight/);
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

  it('never puts the pan back while the keyboard is up', () => {
    // The pan-back exists for AFTER the keyboard has gone. While an input is
    // focused the pan is iOS bringing the field into view, and scrolling to
    // zero fights it — tap a field low on the page and the whole app
    // snapped back to the top. The resize net had this guard from birth;
    // the older pan-back branch shipped without it.
    const at = src.indexOf('function level(');
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(at, at + 600), 'level() runs while typing').toMatch(
      /if \(typing\(\)\) return;/,
    );
  });

  it('captures the strip as served, before any script touches it', () => {
    // The one row that separates the two remaining strip mechanisms: served
    // ground but wrong visible strip = iOS reads the manifest snapshot;
    // served constant = the worker's paint has not reached this launch.
    const cap = src.indexOf('__HAKI_STRIP__');
    const rewrite = src.indexOf("localStorage.getItem('haki.ground')");
    expect(cap).toBeGreaterThan(-1);
    expect(cap, 'the capture runs after the rewrite and lies').toBeLessThan(rewrite);
    expect(src, 'the readout does not report the served strip').toMatch(
      /strip:\s*window\.__HAKI_STRIP__/,
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

  it('declares exactly one install grammar, and it is the manifest', () => {
    // Eighth round, and the closing one — decided by the probe rig rather
    // than by theory. On current iOS every translucent full-bleed install,
    // including an exact clone of the owner's older apps that still fill
    // their screens, comes up sixty-two points short at the bottom; the
    // below-the-bar installs end at the true physical bottom (the probes'
    // gold bar measured at 858..874 on an 874-point screen). The old recipe
    // worked on old installs because the geometry is decided at install
    // time by the iOS version doing the installing.
    //
    // So the legacy metas are gone. If either one comes back, the app goes
    // back to painting a ground it cannot use.
    expect(src, 'the legacy capable meta is back').not.toContain(
      'apple-mobile-web-app-capable',
    );
    expect(src, 'the translucent status-bar meta is back').not.toContain('black-translucent');
    expect(src, 'the viewport meta lost viewport-fit=cover').toContain('viewport-fit=cover');
    const manifest = JSON.parse(
      String(
        readFileSync(join(__dirname, '..', '..', '..', 'public', 'manifest.json'), 'utf8'),
      ),
    ) as { display?: string };
    expect(manifest.display, 'the manifest is not the probe-proven grammar').toBe('standalone');
  });

  it('opens the strip on the ground the day will open on', () => {
    // Measured on the phone: iOS samples theme-color at launch and ignores
    // later changes, and the stored ground is the ground of the session that
    // STORED it. Without the day boundary, the settled black stored at last
    // night's quit becomes a black strip over this morning's parchment.
    expect(src, 'the boot script is not day-aware').toContain('haki.groundUntil');
    // Asserted structurally rather than by hex — the colour-literal guard
    // rightly covers test files too, and the boot script (tools/, where the
    // shell's pre-palette constants live) is the one place the value may be.
    expect(src, 'a new day does not open on paper').toMatch(
      /Date\.now\(\) >= until\) ground = '#/,
    );
    const provider = String(
      readFileSync(
        join(__dirname, '..', '..', '..', 'src', 'state', 'HakiProvider.tsx'),
        'utf8',
      ),
    );
    expect(provider, 'the provider never stores the boundary').toContain('haki.groundUntil');
    // Plain mode pins the palette to the settled dark, so its ground stays
    // valid across days and a paper fallback would be wrong.
    // Plain mode pins the palette to the settled dark, so its ground stays
    // valid across days: until stays 0 and the boundary key is removed.
    expect(provider, 'plain mode writes a boundary it must not').toMatch(
      /if \(!settings\.plainMode\)[\s\S]{0,300}boundary\.getTime\(\)/,
    );
    expect(provider).toContain("removeItem('haki.groundUntil')");
  });

  it('paints the strip where iOS actually reads it', () => {
    // Measured on the phone twice: with both the boot script and the
    // provider rewriting the theme-color meta to the live ground, the strip
    // still wore the constant baked into the exported HTML. iOS reads the
    // statically parsed bytes and never the DOM — so the one place the
    // colour can be set is the served document, and the service worker is
    // what serves it.
    const sw = String(
      readFileSync(join(__dirname, '..', '..', '..', 'public', 'sw.js'), 'utf8'),
    );
    expect(sw, 'the worker never learns the ground').toContain("type === 'haki-ground'");
    expect(sw, 'the worker does not paint navigations').toMatch(
      /theme-color[^\n]*content="\)#\[0-9A-Fa-f\]\{6\}/,
    );
    // Both branches: a fresh navigation and the offline fallback both go
    // through paint(), or an offline morning opens on last night's colour.
    expect(sw.match(/paint\(/g)?.length ?? 0).toBeGreaterThanOrEqual(3);
    // And the body is re-encoded honestly: the old encoding headers would
    // corrupt a decoded body.
    expect(sw).toContain("headers.delete('content-encoding')");
    const provider = String(
      readFileSync(
        join(__dirname, '..', '..', '..', 'src', 'state', 'HakiProvider.tsx'),
        'utf8',
      ),
    );
    expect(provider, 'the page never tells the worker').toContain("type: 'haki-ground'");
  });

  it('has exactly one runtime writer of the strip colour', () => {
    // Two components wrote the same meta for a while — harmless while they
    // agreed, drift the moment a palette changes shape. The provider owns it.
    const layout = String(
      readFileSync(join(__dirname, '..', '..', '..', 'app', '_layout.tsx'), 'utf8'),
    );
    expect(layout, 'the layout writes the theme-color meta again').not.toMatch(
      /querySelector[^\n]*theme-color/,
    );
  });

  it('keeps the strip behind the clock on the live ground', () => {
    // Below the bar, iOS paints the status-bar strip with the page's
    // theme-color. The app's ground is a function of the day, so both the
    // boot script and the provider keep the meta synced — a constant here
    // means a black band over paper every morning.
    expect(src, 'the boot script does not sync theme-color').toMatch(
      /theme-color[\s\S]{0,200}setAttribute\('content', ground\)/,
    );
    const provider = String(
      readFileSync(
        join(__dirname, '..', '..', '..', 'src', 'state', 'HakiProvider.tsx'),
        'utf8',
      ),
    );
    expect(provider, 'the provider does not sync theme-color').toMatch(
      /theme-color[\s\S]{0,200}setAttribute\('content', palette\.bg\)/,
    );
  });

  it('only calls the bottom band unreachable when the viewport is top-anchored', () => {
    // Painting from y = 0 while sized short strands the bottom — and
    // env(safe-area-inset-top) is nonzero exactly then. Below the bar the
    // box ends at the physical bottom and the home indicator is inside it,
    // so the bottom inset is real again. Dropping it there floats the tab
    // bar over the indicator.
    const band = src.slice(src.indexOf('window.__HAKI_UNREACHABLE__'));
    expect(band.slice(0, 900), 'the band ignores the anchor').toMatch(
      /if\s*\(top\s*<=\s*0\)\s*return 0;/,
    );
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

describe('the focus ring', () => {
  // Chromium's default is a two-pixel gold outline, in a palette that has no
  // gold in it, drawn over borders that were chosen — on every text field in
  // the app it reads as a validation error on a form that is fine.
  it('is cleared for a pointer and kept for a keyboard', () => {
    const css = String(readFileSync(SHELL, 'utf8'));
    expect(css).toMatch(/:focus\s*\{[^}]*outline:\s*none/);
    expect(css).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px solid/);
  });
});
