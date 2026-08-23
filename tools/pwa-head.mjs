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
         own ground instead of a white flash. */
      html, body, #root { background-color: #0A0B12; }
      body { overscroll-behavior-y: contain; }
      ::selection { background: #B14CFF; color: #0A0B12; }
      /* iOS standalone with a translucent status bar lies about percentage
         heights: the page paints under the clock, but html's 100% resolves
         to the screen minus the status bar, so the whole app stopped 62pt
         short at the *bottom* on an iPhone 16 Pro — a dead band under the
         tab bar, measured off a device screenshot as exactly the top inset.
         The modern viewport units measure the real screen. min-height keeps
         100% as the floor, so on any browser where these units are the
         smaller lie the worst case is what shipped before, never shorter. */
      @supports (-webkit-touch-callout: none) {
        html, body, #root { height: -webkit-fill-available; min-height: 100%; }
      }
      @supports (height: 100dvh) {
        html, body, #root { height: 100dvh; min-height: 100%; }
      }
    </style>
    <script>
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
