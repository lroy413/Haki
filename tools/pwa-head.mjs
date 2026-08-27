#!/usr/bin/env node
/**
 * Inject the PWA head tags into the exported index.html.
 *
 * Expo Router's `app/+html.tsx` only takes effect when `web.output` is
 * "static". Haki exports as "single" (a plain SPA) because static export
 * pre-renders every route at build time, and every screen here needs a
 * database that only exists in the browser.
 *
 * So the shell is injected afterwards instead. Run via `npm run build:web`,
 * which chains the export and this script — don't call `expo export` alone
 * and expect an installable app.
 *
 *     node tools/pwa-head.mjs <output-dir>
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const outDir = process.argv[2] ?? 'dist';
const indexPath = join(outDir, 'index.html');

if (!existsSync(indexPath)) {
  console.error(`pwa-head: no index.html in ${outDir}. Did the export run?`);
  process.exit(1);
}

const MARKER = '<!-- haki-pwa -->';

/**
 * A name for this build, taken from the bundle's own content hash.
 *
 * A PWA updates silently, which makes "did the fix reach the phone" an
 * unanswerable question exactly when it matters most — three of the five
 * rounds of the viewport bug were spent unable to tell a stale install from
 * a live one. Settings prints this next to the shell's measurements, so the
 * answer is a screenshot away.
 *
 * Filled in below, once the exported index.html has been read.
 */
let BUILD = 'dev';

const head = (build) => `${MARKER}
    <link rel="manifest" href="/manifest.json" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="Haki" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <style>
      /* Painted before the JS bundle parses, so a cold start shows the app's
         own ground instead of a white flash. The value is a fallback: the
         script below overwrites it with the ground this install last used,
         because the app opens on *paper* for an unused day and a near-black
         flash before it is the wrong first frame. */
      html, body, #root { background-color: #0A0B12; }
      body { overscroll-behavior-y: contain; }
      ::selection { background: #B85BFF; color: #0A0B12; }

      /* THE SHELL DOES NOT MEASURE THE VIEWPORT. It is pinned to it.
         
         Every unit that claims to be "the height of the screen" is
         negotiable on iOS: percentages resolve against a layout viewport
         that a translucent status bar shrinks, -webkit-fill-available
         settles a frame late, and even dvh is only as honest as the
         browser's idea of what counts as dynamic. Each one has now cost
         this app the same bug — a dead band under the floating tab bar,
         the app visibly stopping short of the bottom of the phone.

         A fixed element pinned to all four sides asks no question. It is
         placed
         against the viewport itself, so there is no number to get wrong and
         no reflow to be late for. The app scrolls inside its own views —
         nothing has ever relied on the document scrolling — so pinning the
         root costs nothing and closes the whole class of bug. The height
         rules below stay only as the pre-paint ground for the split second
         before this rule applies. */
      html, body { height: 100%; margin: 0; overflow: hidden; }
      #root {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        overflow: hidden;
        /* AND THIS LINE IS THE PIN.

           Expo ships its own reset above this one, and it sets
           '#root { height: 100% }'. CSS 2.1 §10.6.4 is unambiguous about
           what happens next: when 'top', 'bottom' and 'height' are all
           given on a fixed element, **'bottom' is ignored**. So for three
           rounds of this bug the shell was never pinned at all — it was
           still measuring, against the one unit the comment above swears
           off, while the rule that was supposed to have replaced the
           measurement sat directly underneath doing nothing.

           It reproduces in one line in any browser: set 'bottom: 200px'
           on #root and watch the height not move. Neutralise 'height'
           and the offsets take over immediately.

           'height: auto' is not a height calculation. It is the absence
           of one, which is what lets 'top' and 'bottom' decide. */
        height: auto;
        width: auto;
      }
    </style>
    <script>
      window.__HAKI_BUILD__ = '${build}';

      /* The ground the app last rendered, painted before the bundle parses.
         Hardening means the correct opening colour is a fact about this
         install's day, not a constant — so the app records it and the shell
         reads it back. Wrapped because a private window can refuse storage,
         and a colour is never worth a boot failure. */
      try {
        var ground = localStorage.getItem('haki.ground');
        if (ground && /^#[0-9A-Fa-f]{6}$/.test(ground)) {
          document.documentElement.style.backgroundColor = ground;
        }
      } catch (e) {}

      /* THE VIEWPORT GETS PUT BACK.

         Pinning #root fixed what the shell *paints* — the ground now runs to
         the bottom of the phone no matter what. But iOS has one more move:
         when the keyboard opens in a standalone app it pans the whole layout
         viewport upward, and when the keyboard goes it does not always pan
         it back. The root is pinned to that viewport, so the app — tab bar,
         content, everything — sits stranded the pan's height above the
         bottom, over ground the shell is dutifully painting. Third form of
         the same bug, and the first one pinning cannot close, because
         nothing is mis-measured: the viewport itself is displaced.

         So the shell puts it back. Whenever focus leaves an input or the
         visual viewport changes size, any leftover pan is scrolled to zero.
         The document itself never scrolls (overflow is hidden and nothing
         relies on it), so this is a no-op in every healthy state — it only
         acts when iOS has left the viewport somewhere it never returns from
         on its own. The retries exist because the keyboard animation
         finishes after the events that announce it. */
      (function () {
        function level() {
          var vv = window.visualViewport;
          var panned = (window.scrollY || 0) + (vv && vv.offsetTop ? vv.offsetTop : 0);
          if (panned > 0.5) window.scrollTo(0, 0);
        }
        /* THE NET NEVER TOUCHES THE INSTALLED APP, AND THERE IS A FLOOR.

           Fifth round of this bug, and the fourth fix caused it: the pin
           was finally right, and the net shipped beside it read
           'visualViewport.height', got 812 on an 874-point phone, and
           shrank the app to it. Sixty-two points is exactly that phone's
           *top* inset — in a black-translucent standalone app iOS reports
           a visual viewport with the status bar's strip taken off it.

           The screenshot said so before the reasoning did. The tab bar's
           shadow faded smoothly and then stopped dead, with every row
           below it byte-identical ground. A blur does not end in a hard
           line. It was clipped, by the 'overflow: hidden' above, at a
           height something had set.

           So the two cases are now opposites, and neither can produce the
           other's failure:

             installed  — the app owns the screen. The shell may only ever
                          *grow* the root, and only to 'innerHeight', which
                          in a standalone app with viewport-fit=cover is
                          the screen. Nothing may shrink it. That is a
                          floor under every future cause of this bug,
                          whatever it turns out to be.

             browser tab — the toolbars overlay the layout viewport rather
                          than shrink it, so the visible box genuinely is
                          the shorter one. The shell may only ever *shrink*
                          the root, and only on that signature. */
        var STANDALONE =
          window.navigator.standalone === true ||
          (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
          (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);

        function typing() {
          var a = document.activeElement;
          return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable);
        }

        function fit() {
          var root = document.getElementById('root');
          /* While the keyboard is up the viewport is *supposed* to move.
             Correcting for it would squash the layout under every
             keystroke. */
          if (!root || typing()) return;

          /* Always start from the pin, so the shell is re-testing the
             layout rather than agreeing with the height it set last
             time. */
          root.style.height = '';
          var pinned = root.getBoundingClientRect().height;

          if (STANDALONE) {
            if (window.innerHeight - pinned > 1) root.style.height = window.innerHeight + 'px';
            return;
          }

          var vv = window.visualViewport;
          if (!vv) return;
          if (vv.height < window.innerHeight - 1 && pinned - vv.height > 1) {
            root.style.height = vv.height + 'px';
          }
        }

        /* WHAT THIS INSTALL ACTUALLY MEASURED.

           Five rounds of this bug were diagnosed by inference from a
           screenshot, and three of the five inferences were wrong. The app
           can simply say. Settings reads this and prints it, so the next
           round is one screenshot rather than five guesses — and so there
           is an answer to "is the phone even running the new build". */
        window.__HAKI_SHELL__ = function () {
          var root = document.getElementById('root');
          var r = root && root.getBoundingClientRect();
          var vv = window.visualViewport;
          var probe = document.createElement('div');
          probe.style.cssText =
            'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;' +
            'padding:env(safe-area-inset-top) env(safe-area-inset-right) ' +
            'env(safe-area-inset-bottom) env(safe-area-inset-left)';
          document.body.appendChild(probe);
          var ps = window.getComputedStyle(probe);
          var px = function (v) { return Math.round(parseFloat(v) || 0); };
          var out = {
            build: window.__HAKI_BUILD__ || '?',
            standalone: !!STANDALONE,
            screen: [window.screen ? window.screen.width : 0, window.screen ? window.screen.height : 0],
            inner: [window.innerWidth, window.innerHeight],
            visual: vv ? [Math.round(vv.width), Math.round(vv.height), Math.round(vv.offsetTop)] : null,
            root: r ? [Math.round(r.top), Math.round(r.bottom), Math.round(r.height)] : null,
            forced: root && root.style.height ? root.style.height : 'pinned',
            safe: [px(ps.paddingTop), px(ps.paddingRight), px(ps.paddingBottom), px(ps.paddingLeft)],
            scrollY: Math.round(window.scrollY || 0),
          };
          probe.remove();
          /* The one number that matters, worked out here so the readout
             cannot disagree with the shell about it — and measured against
             whichever box the app is *supposed* to fill. An installed app
             owns the screen; in a browser tab, stopping above the toolbars
             is the correct behaviour and not a shortfall. */
          var target = STANDALONE
            ? window.innerHeight
            : vv
              ? Math.min(vv.height, window.innerHeight)
              : window.innerHeight;
          out.short = r ? Math.max(0, Math.round(target - r.bottom)) : 0;
          return out;
        };
        function settle() {
          setTimeout(level, 60);
          setTimeout(fit, 60);
          setTimeout(level, 420);
          setTimeout(fit, 420);
        }
        window.addEventListener('focusout', settle);
        window.addEventListener('orientationchange', settle);
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', settle);
        }
        /* And at every entry to the app, not only at keyboard events: iOS
           can restore a displaced viewport across suspends and relaunches,
           and a pan restored at wake has no keyboard event to announce it.
           pageshow covers cold and warm starts, visibilitychange covers
           coming back from the app switcher. */
        window.addEventListener('pageshow', settle);
        document.addEventListener('visibilitychange', function () {
          if (!document.hidden) settle();
        });
        settle();
      })();

      /* AN INSTALLED APP HAS TO BE TOLD TO LOOK.

         The worker is network-first for navigations, which is enough on the
         web: every load is a navigation and every navigation gets the newest
         shell. A standalone app on iOS is not like that. It is resumed from
         the app switcher for days at a time without ever navigating again,
         so a fix that lives in the shell — which is where every round of the
         viewport bug has lived — can sit undelivered indefinitely while both
         ends believe it shipped.

         So: ask on every return to the foreground, and reload once when a
         new worker actually takes over. The guard matters — 'controllerchange'
         also fires the first time a worker claims an uncontrolled page, and
         reloading on that is an infinite loop on a first visit. */
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker
            .register('/sw.js')
            .then(function (reg) {
              var look = function () {
                if (!document.hidden) reg.update().catch(function () {});
              };
              document.addEventListener('visibilitychange', look);
              window.addEventListener('pageshow', look);
            })
            .catch(function () {
              /* Offline support is a bonus, never a requirement. */
            });

          if (navigator.serviceWorker.controller) {
            var reloading = false;
            navigator.serviceWorker.addEventListener('controllerchange', function () {
              if (reloading) return;
              reloading = true;
              window.location.reload();
            });
          }
        });
      }
    </script>`;

let html = readFileSync(indexPath, 'utf8');

// The exported bundle's content hash names the build. It changes exactly when
// the shipped code changes, which is the property that makes it useful.
const bundle = html.match(/entry-([a-f0-9]{8})[a-f0-9]*\.js/);
BUILD = bundle ? bundle[1] : 'dev';

if (html.includes(MARKER)) {
  console.log('pwa-head: already injected, nothing to do.');
  process.exit(0);
}

// viewport-fit=cover lets the app paint under the notch and home indicator;
// react-native-safe-area-context reads the insets back out.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

if (!html.includes('viewport-fit=cover')) {
  console.error('pwa-head: could not rewrite the viewport meta — Expo changed the template.');
  process.exit(1);
}

html = html.replace('</head>', `    ${head(BUILD)}\n  </head>`);

if (!html.includes(MARKER)) {
  console.error('pwa-head: could not find </head> to inject into.');
  process.exit(1);
}

// The shell's `#root` rule only beats Expo's `height: 100%` because it comes
// later in the document — same specificity, last one wins. If Expo ever moves
// its reset below the injection point the app silently goes back to measuring
// the viewport, which is the bug this whole file exists to close. Fail here
// rather than ship it.
const reset = html.indexOf('id="expo-reset"');
if (reset !== -1 && reset > html.indexOf(MARKER)) {
  console.error(
    "pwa-head: Expo's reset now comes after the shell, so `#root { height: 100% }` wins " +
      'and the app is measuring the viewport again. Move the injection below it.',
  );
  process.exit(1);
}

writeFileSync(indexPath, html);
console.log(`pwa-head: injected manifest, iOS meta, and service worker into ${indexPath}`);
