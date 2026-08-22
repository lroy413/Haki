/**
 * Haki renders dark by default — this is an app opened in bed and on a walk,
 * and the Haki effects only read on a dark ground.
 */

export const color = {
  bg: '#0A0B12',
  surface: '#12141F',
  surface2: '#191C29',
  line: '#282C3D',
  lineSoft: '#1B1E2C',

  ink: '#E9E7F3',
  inkDim: '#9E9BB7',
  inkFaint: '#6C6A86',

  /** Conqueror's. The brand accent. */
  violet: '#B14CFF',
  violetSoft: '#241338',
  /** Observation. */
  cyan: '#45D9CB',
  cyanSoft: '#0E2A29',
  /** Armament. */
  crimson: '#F0575D',
  crimsonSoft: '#2E1518',

  /** Semantic, kept separate from the three Haki hues. */
  warn: '#F5A524',
  warnSoft: '#2C2008',

  /** Glass: translucent fills and hairlines for the floating chrome. */
  glass: 'rgba(18,20,31,0.62)',
  glassEdge: 'rgba(233,231,243,0.10)',
  glassActive: 'rgba(177,76,255,0.14)',
} as const;

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
export const reserveColor = {
  unknown: color.inkFaint,
  depleted: color.crimson,
  low: color.warn,
  steady: color.cyan,
  full: color.violet,
} as const;

/**
 * Vertical room every scroll view must leave at the bottom so its last item is
 * not swallowed by the floating tab bar. Safe-area inset is added on top of
 * this at the call site.
 */
export const TAB_BAR_CLEARANCE = 108;
