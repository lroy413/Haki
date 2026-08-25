import type { HardeningLevel } from '../domain/hardening';

/**
 * One palette per hardening level.
 *
 * These are written out in full rather than interpolated. Four hand-set
 * palettes can each be checked against a contrast floor and held there; a
 * generated midpoint cannot, and the midpoint is exactly where a light-to-dark
 * ramp stops being readable.
 *
 * Level 0 is paper — a ship's log rather than a white screen. Level 1 is the
 * snap: the first act of the day hardens it, and from there the remaining
 * levels are depth rather than a second flip.
 *
 * The accents shift between 0 and 1 and then hold. A violet bright enough to
 * sit on near-black is far too pale to read on parchment, so the light palette
 * carries its own darker set. Every one of them is tested.
 *
 * **The floors were raised once, and the reason is worth keeping.** The owner
 * said the app was hard to read at full brightness — and the arithmetic agreed:
 * `inkFaint` carried nearly every date, stat, cadence and unit in the app, at
 * ten or eleven points, at a contrast of 2.9:1 on the palette the app spends
 * most of its day in. That is under the floor for *normal* text, let alone
 * small text. Faint is a role, not a licence to disappear: every one of these
 * values now clears 4.5:1 on all three grounds it can sit on, and the tests
 * hold them there. If a colour here has to be dimmed for looks, the thing to
 * change is what it is used for, never the number.
 */

export type Palette = {
  bg: string;
  surface: string;
  surface2: string;
  line: string;
  lineSoft: string;

  ink: string;
  inkDim: string;
  inkFaint: string;

  violet: string;
  violetSoft: string;
  cyan: string;
  cyanSoft: string;
  crimson: string;
  crimsonSoft: string;
  warn: string;
  warnSoft: string;

  /**
   * Enma's flame. Only the Zoro theme burns it — 覇王色 turns green when the
   * crew changes — but it lives in the palette like every other colour and is
   * held to the same floors, because a theme may not smuggle in a hex.
   */
  jade: string;
  jadeSoft: string;

  /**
   * The coating. Zoro's 武装色 — his Haki is black and purple, so under his
   * flag Armament's light moves off Luffy's crimson and onto this. A deep
   * blue-purple on purpose: the signature violet is 見聞色's and 覇王色's, and
   * a lens borrowing it would blur the legend the tab bar keeps. Same rule as
   * jade: it lives here and is held to every floor, because a theme may not
   * smuggle in a hex.
   */
  amethyst: string;
  amethystSoft: string;

  glass: string;
  glassEdge: string;

  /**
   * The glint along a card's top edge.
   *
   * Hardened Armament is glossy, not matte — the reference frames put hard
   * highlights on the knuckles, and that sheen is what makes the black read as
   * *hardened* rather than merely dark. It brightens up the ramp, and at level
   * 0 it is simply the hairline colour: an unhardened surface has no gloss to
   * catch anything.
   */
  specular: string;

  /**
   * What a raised card drops on the ground behind it. Always an rgba: the
   * alpha is the shadow, and a solid hex here would paint a slab.
   *
   * On paper it is warm ink at low alpha — the shade under a sheet laid on
   * the desk. On the dark palettes it is plain black and progressively
   * heavier, because a shadow on a near-black ground has to work harder to
   * read as depth at all. Used by `plate` in `theme/surfaces.ts`; reaching
   * past that helper for ad-hoc shadows is how a screen ends up with three
   * competing light sources.
   */
  shadow: string;

  /**
   * Text that sits *on* a filled accent button. Near-black on the dark
   * palettes, where every accent is bright; near-white on paper, where they
   * are deep.
   */
  onAccent: string;

  /** True when this palette wants dark status-bar icons. */
  lightSurface: boolean;
};

/** 0 — Unhardened. Paper. Nothing logged today yet. */
const unhardened: Palette = {
  bg: '#EDE7DA',
  surface: '#F7F3EA',
  surface2: '#E3DBCA',
  line: '#C6BBA2',
  lineSoft: '#DCD3BF',

  ink: '#171309',
  inkDim: '#463E30',
  inkFaint: '#625A4A',

  violet: '#6321B8',
  violetSoft: '#E2D5F5',
  cyan: '#0A6259',
  cyanSoft: '#C6E0DB',
  crimson: '#A62128',
  crimsonSoft: '#F3D8D9',
  warn: '#7A4A00',
  warnSoft: '#E6D5A8',
  jade: '#136B1B',
  jadeSoft: '#C6E4BE',
  amethyst: '#3A2FA8',
  amethystSoft: '#DCD6F1',

  // Denser than the dark palettes on purpose. A violet button scrolling under
  // a light bar shows straight through a thin fill, and the tab label is dark
  // ink that cannot survive sitting on it.
  glass: 'rgba(247,243,234,0.88)',
  glassEdge: 'rgba(23,19,9,0.14)',

  specular: '#C6BBA2',
  shadow: 'rgba(23,19,9,0.16)',
  onAccent: '#FFFFFF',
  lightSurface: true,
};

/** 1 — Hardened. The snap, on the first act of the day. */
const hardened: Palette = {
  bg: '#1C1F2A',
  surface: '#262A38',
  surface2: '#303546',
  line: '#434859',
  lineSoft: '#2A2E3C',

  ink: '#F1EFF8',
  inkDim: '#C5C3D5',
  inkFaint: '#9F9DB3',

  violet: '#C87FFF',
  violetSoft: '#332154',
  cyan: '#5FE3D6',
  cyanSoft: '#123330',
  crimson: '#FF7377',
  crimsonSoft: '#3A1F21',
  warn: '#FFBB45',
  warnSoft: '#382B10',
  jade: '#63E86E',
  jadeSoft: '#1B3E1E',
  amethyst: '#A79BFF',
  amethystSoft: '#2B2A5C',

  glass: 'rgba(38,42,56,0.66)',
  glassEdge: 'rgba(241,239,248,0.12)',

  specular: '#4C5266',
  shadow: 'rgba(0,0,0,0.34)',
  onAccent: '#0A0B12',
  lightSurface: false,
};

/** 2 — Set. A used day. */
const set: Palette = {
  bg: '#12141C',
  surface: '#1B1E2A',
  surface2: '#232735',
  line: '#353A4B',
  lineSoft: '#232634',

  ink: '#EDEBF5',
  inkDim: '#B4B2C8',
  inkFaint: '#918FA4',

  violet: '#BE68FF',
  violetSoft: '#2A1741',
  cyan: '#52DED0',
  cyanSoft: '#102E2C',
  crimson: '#F76369',
  crimsonSoft: '#33191C',
  warn: '#FAB136',
  warnSoft: '#32260C',
  jade: '#57E163',
  jadeSoft: '#123015',
  amethyst: '#9C8EFF',
  amethystSoft: '#232250',

  glass: 'rgba(27,30,42,0.64)',
  glassEdge: 'rgba(237,235,245,0.11)',

  specular: '#565C77',
  shadow: 'rgba(0,0,0,0.42)',
  onAccent: '#0A0B12',
  lightSurface: false,
};

/** 3 — Black. A full day. The palette this app was designed in. */
const black: Palette = {
  bg: '#0A0B12',
  surface: '#12141F',
  surface2: '#191C29',
  line: '#282C3D',
  lineSoft: '#1B1E2C',

  ink: '#E9E7F3',
  inkDim: '#ABA9C1',
  inkFaint: '#8D8CA4',

  violet: '#B85BFF',
  violetSoft: '#241338',
  cyan: '#45D9CB',
  cyanSoft: '#0E2A29',
  crimson: '#F0575D',
  crimsonSoft: '#2E1518',
  warn: '#F5A524',
  warnSoft: '#2C2008',
  jade: '#4BDC58',
  jadeSoft: '#0E2712',
  amethyst: '#968CFF',
  amethystSoft: '#1D1C42',

  glass: 'rgba(18,20,31,0.62)',
  glassEdge: 'rgba(233,231,243,0.10)',

  specular: '#616787',
  shadow: 'rgba(0,0,0,0.52)',
  onAccent: '#0A0B12',
  lightSurface: false,
};

export const PALETTES: Record<HardeningLevel, Palette> = {
  0: unhardened,
  1: hardened,
  2: set,
  3: black,
};

export function paletteFor(level: HardeningLevel): Palette {
  return PALETTES[level];
}

/**
 * The darkest colour a palette paints large areas with.
 *
 * On paper that is the ink; on the three dark palettes it is the ground. Black
 * lightning is drawn in it — impact frame, ambient weather and Conqueror's
 * burst all want the same thing and all three used to work it out by hand.
 *
 * Not, strictly, the darkest hex in the palette: `onAccent` is darker still on
 * levels 1 and 2, and is deliberately not a candidate. It exists to be read on
 * top of a bright violet button and nowhere else, so borrowing it as a ground
 * would be a category error that happens to look fine today.
 *
 * It exists because the obvious name is a trap. `ink` reads as "the dark one"
 * and is near-black on exactly one of the four palettes; from level 1 up it is
 * near-*white*, because it is the text colour and the text is light on a dark
 * ground. Washing a full-screen effect in `palette.ink` flashed the whole
 * display white on every palette the app actually spends its day in, and
 * nothing about the name suggested it would. One expression, one place, and a
 * test that holds it to what it claims.
 */
export function darkest(p: Palette): string {
  return p.lightSurface ? p.ink : p.bg;
}

/**
 * The palette as a given crew's lenses see it.
 *
 * Every lens screen writes `c.violet` or `c.crimson` and means "the lens's
 * colour", not "purple" or "red" — so rather than teaching a dozen screens
 * that a crew exists, the crew is applied to the palette once and the screens
 * are handed the result. Under Luffy it is the identity function; under Zoro
 * the violet slots carry Enma's green (what 覇王色 adds) and the crimson
 * slots carry the amethyst (his own coating — black and purple).
 *
 * Deliberately not applied globally, and for two different reasons:
 * 見聞色 is violet under both crews, so a blanket violet swap would turn the
 * reading card and the eyes green; and crimson doubles as semantic red — a
 * breach, a delete — which must never soften into a theme colour. A screen
 * takes the lens palette only where it means the lens.
 */
export function underCrew(
  p: Palette,
  crew: { conquerors: 'violet' | 'jade'; armament: 'crimson' | 'amethyst' },
): Palette {
  let out = p;
  if (crew.conquerors === 'jade') out = { ...out, violet: p.jade, violetSoft: p.jadeSoft };
  if (crew.armament === 'amethyst')
    out = { ...out, crimson: p.amethyst, crimsonSoft: p.amethystSoft };
  return out;
}
