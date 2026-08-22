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

export const radius = { sm: 3, md: 6, lg: 12, pill: 999 } as const;

export const type = {
  display: { fontSize: 34, fontWeight: '800', letterSpacing: -1 },
  title: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  heading: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400' },
  small: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.6, textTransform: 'uppercase' },
  mono: { fontSize: 12, letterSpacing: 0.4 },
} as const;

/** Reserve bands, matched to `domain/willReserve.ts` states. */
export const reserveColor = {
  unknown: color.inkFaint,
  depleted: color.crimson,
  low: color.warn,
  steady: color.cyan,
  full: color.violet,
} as const;
