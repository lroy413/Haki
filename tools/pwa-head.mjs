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
    <!-- The manifest is the ONLY install grammar declared, on the strength
         of the probe rig (eighth round, and the closing one). On current iOS
         every translucent full-bleed install — including an exact clone of
         the owner's older apps that still fill their screens — comes up 62
         points short at the BOTTOM, because the web view paints from y = 0
         but is sized as if inset. The below-the-bar installs (manifest-only,
         and the legacy default-bar one) end at the true physical bottom:
         the probes' gold bar measured at 858..874 on an 874-point screen.
         The old recipe worked on the owner's older installs because this is
         decided at install time by the iOS version doing the installing.

         So: no legacy capable meta, no translucent status-bar meta. The app
         starts below the clock, reaches the real bottom, and the strip
         behind the clock is painted in the page's theme-color, which the
         boot script and HakiProvider keep synced to the live ground. -->
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

      /* The theme-color exactly as the parser saw it — captured before any
         script touches the meta. If this shows the live ground while the
         visible strip does not, iOS is reading the manifest snapshot and no
         served byte can reach it; if this shows the baked constant, the
         worker's paint has not reached this launch yet. */
      var stripMeta = document.querySelector('meta[name="theme-color"]');
      window.__HAKI_STRIP__ = stripMeta ? stripMeta.getAttribute('content') : '';

      /* The ground the app last rendered, painted before the bundle parses.
         Hardening means the correct opening colour is a fact about this
         install's day, not a constant — so the app records it and the shell
         reads it back. Wrapped because a private window can refuse storage,
         and a colour is never worth a boot failure. */
      try {
        var ground = localStorage.getItem('haki.ground');
        /* The stored ground is the ground of the SESSION that stored it, and
           iOS samples the theme-color — the strip behind the clock — once at
           launch. So a launch on a new voyage day must not wear yesterday's
           colour: the app opens a fresh day on paper, and the settled black
           stored at last night's quit would put a black strip over this
           morning's parchment. The provider stores the day boundary beside
           the colour; past it, the strip opens on paper too. Plain mode pins
           the palette and stores no boundary, so its ground is simply used. */
        var until = Number(localStorage.getItem('haki.groundUntil') || 0);
        if (until > 0 && Date.now() >= until) ground = '#EDE7DA';
        if (ground && /^#[0-9A-Fa-f]{6}$/.test(ground)) {
          document.documentElement.style.backgroundColor = ground;
          var tcs = document.querySelectorAll('meta[name="theme-color"]');
          for (var ti = 0; ti < tcs.length; ti += 1) {
            tcs[ti].setAttribute('content', ground);
          }
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
          /* Putting the pan back is for AFTER the keyboard has gone. While
             an input is focused the pan is iOS bringing the field into
             view, and scrolling to zero here fights it — tap a field low
             on the page and the whole app snapped back to the top. Same
             guard the resize net already had; this branch never got it. */
          if (typing()) return;
          var vv = window.visualViewport;
          var panned = (window.scrollY || 0) + (vv && vv.offsetTop ? vv.offsetTop : 0);
          if (panned > 0.5) window.scrollTo(0, 0);
        }
        /* THE NET NEVER TOUCHES THE INSTALLED APP, AND THERE IS A FLOOR.

           Fifth round of this bug, and the fourth fix caused it: the pin
           was finally right, and the net shipped beside it read
           'visualViewport.height', got 812 on an 874-point phone, and
           shrank the app to it. Sixty-two points is exactly that phone's
           *top* inset — in a translucent standalone app iOS reports
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

        /* THE SCREEN, WHICH IS NOT THE VIEWPORT.

           Sixth round, and this is the number every earlier round was
           groping for. The phone finally said it:

               Screen       402 x 874
               Window       402 x 812
               App box      812 tall, ends at 812
               Safe area    62 / 0 / 34 / 0
               Height       pinned

           The pin is doing exactly what it should. It is pinned to the
           layout viewport, and iOS hands a standalone app a layout
           viewport 62 points shorter than the screen — exactly the top
           inset — while still reporting that inset through env() and
           still painting content from y = 0. The status bar's clock is
           drawn over the app's own text at the top of the screen, so the
           viewport is not displaced downward; it is simply short.

           So 'innerHeight' is not the screen here, and every fix that
           trusted it was fixing the wrong number. 'screen.height' is the
           screen.

           Orientation is read off the window rather than assumed, because
           iOS has reported screen dimensions in the device's own
           orientation on some versions and the current one on others, and
           this file has been bitten once already by trusting which is
           which. */
        /* HOW MUCH SCREEN THE APP IS NOT GIVEN.

           Round six grew the root to 'screen.height' and the tab bar's
           labels went off the bottom of the phone. The measurements settle
           it, and they are worth writing down because the next person will
           want to try growing it again:

             the wordmark's cap sits at 84 points, which is exactly
             insets.top + space.lg + the cap offset, so the viewport is
             anchored at screen y = 0;

             the tab bar's rounded rect reaches its full left edge at
             811.3 and then stops dead at 812.0 — a hard clip, not a
             corner completing.

           So iOS gives this app a web view positioned full-screen and
           sized as though it were inset at the top: 812 tall on an 874
           screen. **The last sixty-two points are not reachable.** No
           amount of CSS puts anything there; the page's own background
           colour is extended into the band by the browser, which is why
           it looks continuous and why this took six rounds to see.

           What the app can do is stop wasting the space it *does* have.
           'env(safe-area-inset-bottom)' is 34 because the home indicator
           is at screen 858 — but that is out in the unreachable band, not
           inside the viewport, so reserving 34 points at the bottom of an
           812-point box protects against a hazard that is not in the box.
           This number is how the app knows. Zero on a healthy device, so
           nothing changes there. */
        window.__HAKI_UNREACHABLE__ = function () {
          /* Only a top-anchored viewport strands the bottom: painting from
             y = 0 while sized short leaves a band below that nothing can
             reach, and env(safe-area-inset-top) is nonzero exactly then.
             In the below-the-bar install env top is 0, the box ends at the
             physical bottom, and the home indicator is INSIDE it — so the
             bottom inset is real again and nothing is out of reach. */
          var p = document.createElement('div');
          p.style.cssText =
            'position:fixed;top:0;left:0;width:0;height:0;visibility:hidden;' +
            'padding-top:env(safe-area-inset-top)';
          document.body.appendChild(p);
          var top = Math.round(parseFloat(window.getComputedStyle(p).paddingTop) || 0);
          p.remove();
          if (top <= 0) return 0;
          return Math.max(0, Math.round(screenHeight() - window.innerHeight));
        };

        function screenHeight() {
          var s = window.screen;
          if (!s || !s.width || !s.height) return 0;
          var portrait = window.innerHeight >= window.innerWidth;
          return portrait ? Math.max(s.width, s.height) : Math.min(s.width, s.height);
        }

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
            /* Growing only, so this can never become the shrink that
               caused round five — and only ever to the viewport, because
               round six proved there is nothing past it. */
            if (window.innerHeight - pinned > 1) {
              root.style.height = window.innerHeight + 'px';
            }
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
          var mode = 'browser tab';
          if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) {
            mode = 'fullscreen';
          } else if (
            window.matchMedia &&
            window.matchMedia('(display-mode: standalone)').matches
          ) {
            mode = 'standalone';
          } else if (window.navigator.standalone === true) {
            mode = 'standalone (legacy)';
          }
          var out = {
            build: window.__HAKI_BUILD__ || '?',
            standalone: !!STANDALONE,
            mode: mode,
            strip: window.__HAKI_STRIP__ || '',
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
          /* The box the app can actually paint into. Round six aimed at
             the screen instead and clipped the tab bar off the bottom, so
             the honest target is the viewport — and the difference between
             that and the screen is reported separately rather than called
             a shortfall, because it is not one the app can close. */
          var target =
            !STANDALONE && vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight;
          out.short = r ? Math.max(0, Math.round(target - r.bottom)) : 0;
          out.target = target;
          out.unreachable = STANDALONE ? window.__HAKI_UNREACHABLE__() : 0;
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
//
// height=device-height rode through the probe rig unchanged: probe C carried
// it and ended at the true physical bottom, so it stays. The grammar story
// lives in the comment beside the manifest link — the short version is that
// on current iOS a translucent full-bleed install strands the bottom of the
// screen, so this app declares the manifest alone and starts below the bar.
html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

if (!html.includes('viewport-fit=cover') || !html.includes('height=device-height')) {
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
