/**
 * Whose will this is — the theme, named honestly.
 *
 * The seam was cut when the impact frame was built: **the field owns the
 * violence, the instrument owns the shape.** Everything about a strike — the
 * two inverted frames, the timing, the scratch-field of speed lines — belongs
 * to the layer above; only the drawn object changes. Luffy's is a fist.
 * Zoro's is a sword.
 *
 * A crew changes five things and nothing else:
 *
 * 1. **What 覇王色 burns.** Luffy's Conqueror's is the app's violet. Zoro's
 *    Haki is black and purple, and the green only arrives when Conqueror's
 *    does — Enma's flame down the blade — so under his crew the Journey tab,
 *    the Dream, the Flag and the burst turn jade.
 * 2. **What 武装色 burns.** Luffy coats in crimson; Zoro's coating is the
 *    black-and-purple itself, so under his flag Armament's light — the
 *    hardness aura, the Do tab, the strike — moves to the amethyst.
 *    見聞色 is violet under both crews; it is the one lens that never moves.
 * 3. **The instrument** in the impact frame.
 * 4. **What the focus sessions are called.** Luffy shifts gears; Zoro draws
 *    swords. Same three lengths, same costs, same rows in the database.
 * 5. **The word for the room they live in** — the Gears, or the Styles.
 *
 * What a crew may *never* change is the shape of the data. The gear keys stay
 * `second | third | fourth` whichever crew is flying, so a year of sessions
 * logged as Gear 3 reads as Nitoryu the moment you switch and back again if
 * you switch back. A theme that rewrote history would be a theme you could
 * not try.
 */

export type CrewName = 'luffy' | 'zoro';

export type Crew = {
  name: CrewName;
  label: string;
  /** One line, in the picker. */
  blurb: string;
  /**
   * Which palette token 覇王色 burns in. A key rather than a colour: the
   * palette moves through four levels and a crew that carried a hex would be
   * right on one of them.
   */
  conquerors: 'violet' | 'jade';
  /** Which palette token 武装色 burns in. Same rule: a key, never a colour. */
  armament: 'crimson' | 'amethyst';
  /** Which drawing the impact frame reaches for. */
  instrument: 'fist' | 'sword';
};

export const CREWS: Record<CrewName, Crew> = {
  luffy: {
    name: 'luffy',
    label: 'Luffy',
    blurb: 'The fist, the gears, and violet lightning. How the app was drawn.',
    conquerors: 'violet',
    armament: 'crimson',
    instrument: 'fist',
  },
  zoro: {
    name: 'zoro',
    label: 'Zoro',
    blurb: 'The blade, the sword styles, and Conqueror’s in Enma’s green.',
    conquerors: 'jade',
    armament: 'amethyst',
    instrument: 'sword',
  },
};

export const CREW_ORDER: CrewName[] = ['luffy', 'zoro'];

export function isCrewName(value: string): value is CrewName {
  return value in CREWS;
}

export function crewFor(name: CrewName): Crew {
  return CREWS[name];
}
