import type { Palette } from './palettes';
import type { Reserve } from '../domain/willReserve';

/**
 * Everything about the look that does *not* change as the day hardens.
 *
 * Colour deliberately does not live here any more. It is a function of how
 * much the day has been used, so it comes from `palettes.ts` through
 * `useHaki().palette` — see `domain/hardening.ts` for why. Spacing, radii and
 * type are fixed, and fixed is the point: only the ground moves.
 */

export const space = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 36,
  xxxl: 56,
} as const;

export const radius = { sm: 3, md: 6, lg: 12, xl: 20, pill: 999 } as const;

/**
 * The three faces from the concept doc, carried into the app.
 *
 * Bricolage Grotesque does the shouting, Newsreader does the reading — a
 * journal should feel like something you read, not something you operate —
 * and IBM Plex Mono handles labels, dates, and anything in a column.
 *
 * Each weight is its own family. Never pair these with `fontWeight`: React
 * Native would try to synthesise a bolder face on top of one that is already
 * bold, which renders as smeared letterforms on Android.
 */
export const font = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  displaySemi: 'BricolageGrotesque_600SemiBold',
  body: 'Newsreader_400Regular',
  bodyItalic: 'Newsreader_400Regular_Italic',
  bodyMedium: 'Newsreader_500Medium',
  mono: 'IBMPlexMono_500Medium',
  monoSemi: 'IBMPlexMono_600SemiBold',
} as const;

export const type = {
  /** The wordmark and the one number that matters. */
  display: { fontFamily: font.display, fontSize: 34, letterSpacing: -1.4 },
  title: { fontFamily: font.displayBold, fontSize: 22, letterSpacing: -0.5 },
  heading: { fontFamily: font.displaySemi, fontSize: 17, letterSpacing: -0.2 },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 24 },
  bodyStrong: { fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: font.body, fontSize: 14, lineHeight: 20 },
  label: {
    fontFamily: font.monoSemi,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  mono: { fontFamily: font.mono, fontSize: 12, letterSpacing: 0.2 },
} as const;

/** Reserve bands, matched to `domain/willReserve.ts` states. */
export function reserveColor(c: Palette): Record<Reserve['state'], string> {
  return {
    unknown: c.inkFaint,
    depleted: c.crimson,
    low: c.warn,
    steady: c.cyan,
    full: c.violet,
  };
}

/**
 * Vertical room every scroll view must leave at the bottom so its last item is
 * not swallowed by the floating tab bar. Safe-area inset is added on top of
 * this at the call site.
 */
export const TAB_BAR_CLEARANCE = 108;
