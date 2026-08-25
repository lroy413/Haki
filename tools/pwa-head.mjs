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

const HEAD = `${MARKER}
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
      }
    </style>
    <script>
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
        function settle() {
          setTimeout(level, 60);
          setTimeout(level, 420);
        }
        window.addEventListener('focusout', settle);
        window.addEventListener('orientationchange', settle);
        if (window.visualViewport) {
          window.visualViewport.addEventListener('resize', settle);
        }
      })();

      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('/sw.js').catch(function () {
            /* Offline support is a bonus, never a requirement. */
          });
        });
      }
    </script>`;

let html = readFileSync(indexPath, 'utf8');

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

html = html.replace('</head>', `    ${HEAD}\n  </head>`);

if (!html.includes(MARKER)) {
  console.error('pwa-head: could not find </head> to inject into.');
  process.exit(1);
}

writeFileSync(indexPath, html);
console.log(`pwa-head: injected manifest, iOS meta, and service worker into ${indexPath}`);
