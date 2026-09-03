import { describe, expect, it } from 'vitest';
import { CREWS, CREW_ORDER, crewFor, isCrewName } from '../crew';
import { GEARS, GEAR_ORDER, focusBlurb, styleFor } from '../gears';
import { NO_ACTS } from '../hardening';
import { practice } from '../practice';
import { readBack } from '../dayEnd';
import { spendNote, NO_SPEND } from '../willReserve';

describe('the crews', () => {
  it('lists every crew once, Luffy first', () => {
    expect(CREW_ORDER[0]).toBe('luffy');
    expect([...CREW_ORDER].sort()).toEqual(Object.keys(CREWS).sort());
  });

  it('recognises its own names and nothing else', () => {
    for (const name of CREW_ORDER) expect(isCrewName(name)).toBe(true);
    expect(isCrewName('sanji')).toBe(false);
    expect(isCrewName('')).toBe(false);
  });

  it("gives Zoro's Conqueror's the green and his Armament the purple", () => {
    // His Haki is black and purple — so the coating itself burns amethyst —
    // and the green is what Conqueror's adds. Two lenses move; 見聞色 is not
    // a key on the crew at all, which is how it stays violet under both.
    expect(crewFor('luffy').conquerors).toBe('violet');
    expect(crewFor('zoro').conquerors).toBe('jade');
    expect(crewFor('luffy').armament).toBe('crimson');
    expect(crewFor('zoro').armament).toBe('amethyst');
  });

  it('carries colour keys rather than colours', () => {
    // A crew that held a hex would be right on one of four palettes.
    for (const name of CREW_ORDER) {
      expect(crewFor(name).conquerors).not.toMatch(/^#/);
      expect(crewFor(name).armament).not.toMatch(/^#/);
    }
  });

  it('gives each crew its own instrument', () => {
    expect(crewFor('luffy').instrument).toBe('fist');
    expect(crewFor('zoro').instrument).toBe('sword');
  });
});

describe('the focus sessions under each crew', () => {
  it('keeps the same three keys and lengths whichever crew is flying', () => {
    // This is the load-bearing rule. A year of sessions logged as Gear 3 has
    // to read as Nitoryu the moment you switch, and as Gear 3 again if you
    // switch back — so a crew renames, and never restructures.
    for (const key of GEAR_ORDER) {
      const luffy = styleFor('luffy', key);
      const zoro = styleFor('zoro', key);
      expect(luffy.minutes, key).toBe(GEARS[key].minutes);
      expect(zoro.minutes, key).toBe(GEARS[key].minutes);
      expect(luffy.name, key).toBe(key);
      expect(zoro.name, key).toBe(key);
      // The costs are worded differently and are the same cost: one has a
      // cooldown and one ends the day, in both crews.
      expect(zoro.cost === null, key).toBe(GEARS[key].cost === null);
    }
  });

  it('never leaves one crew speaking the other one’s vocabulary', () => {
    // The first pass renamed the three cards and left "gear" in every cost
    // line underneath them, which is the kind of thing that reads as a
    // half-finished theme.
    const zoro = [
      focusBlurb('zoro'),
      ...GEAR_ORDER.flatMap((k) => {
        const s = styleFor('zoro', k);
        return [s.label, s.kanji, s.blurb, s.cost ?? ''];
      }),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['gear', '速']) {
      expect(zoro, `zoro says "${word}"`).not.toContain(word);
    }

    const luffy = [
      focusBlurb('luffy'),
      ...GEAR_ORDER.flatMap((k) => {
        const s = styleFor('luffy', k);
        return [s.label, s.kanji, s.blurb, s.cost ?? ''];
      }),
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['blade', 'sword', '刀']) {
      expect(luffy, `luffy says "${word}"`).not.toContain(word);
    }
  });

  it('names Zoro by the number of blades, in his own order', () => {
    expect(styleFor('zoro', 'second').label).toBe('Ittoryu');
    expect(styleFor('zoro', 'third').label).toBe('Nitoryu');
    expect(styleFor('zoro', 'fourth').label).toBe('Santoryu');
    expect(styleFor('zoro', 'second').kanji).toBe('一刀流');
    expect(styleFor('zoro', 'fourth').kanji).toBe('三刀流');
  });

  it('leaves Luffy exactly as he was', () => {
    for (const key of GEAR_ORDER) {
      expect(styleFor('luffy', key)).toEqual(GEARS[key]);
    }
  });

  it('never congratulates or instructs in either crew, and keeps ending early free', () => {
    for (const crew of ['luffy', 'zoro'] as const) {
      for (const key of GEAR_ORDER) {
        const s = styleFor(crew, key);
        for (const word of ['should', 'must', 'failed', 'lazy', 'finally', 'well done']) {
          expect(
            `${s.blurb} ${s.cost ?? ''}`.toLowerCase(),
            `${crew}/${key}: ${word}`,
          ).not.toContain(word);
        }
      }
      // The shortest one is still free in both crews — the whole reason it is
      // the shortest is that starting must not be a decision.
      expect(styleFor(crew, 'second').cost).toBeNull();
    }
  });
});

describe('the rest of the app under each crew', () => {
  // The home page's practice tile, the Reserve's spend note and the evening's
  // read-back all name the focus session. Under Zoro's flag the word is his:
  // the owner saw "Gear" on the home page with the swords flying.
  const gearing = { ...NO_ACTS, gearMinutes: 90 };
  const spend = { ...NO_SPEND, fraction: 0.4, gearMinutes: 90 };

  it('names the tile, the spend and the read-back in Zoro’s words', () => {
    const tile = practice(gearing, false, null, 'zoro').find((p) => p.key === 'gear');
    expect(tile?.label).toBe('Sword');
    expect(tile?.kanji).toBe('一刀流');
    const said = [
      tile?.label ?? '',
      tile?.kanji ?? '',
      readBack(gearing, false, 'zoro').join(' '),
      spendNote(spend, false, 'zoro') ?? '',
    ]
      .join(' ')
      .toLowerCase();
    for (const word of ['gear', '速']) expect(said, `zoro says "${word}"`).not.toContain(word);
    expect(said).toContain('drawn');
  });

  it('leaves Luffy exactly as he was, and never with a blade', () => {
    const tile = practice(gearing, false, null, 'luffy').find((p) => p.key === 'gear');
    expect(tile?.label).toBe('Gear');
    expect(tile?.kanji).toBe('二速');
    const said = [tile?.label ?? '', readBack(gearing).join(' '), spendNote(spend) ?? '']
      .join(' ')
      .toLowerCase();
    for (const word of ['sword', 'blade', 'drawn', '刀']) {
      expect(said, `luffy says "${word}"`).not.toContain(word);
    }
    expect(said).toContain('in gear');
  });

  it('keeps the tile’s key and route the same under both flags', () => {
    // A theme renames; it never restructures.
    for (const crew of CREW_ORDER) {
      const tile = practice(NO_ACTS, false, null, crew).find((p) => p.key === 'gear');
      expect(tile?.route).toBe('/gears');
    }
  });
});
