import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { radius } from '../../theme/tokens';
import { hash, inscribe, rng } from './glyphs';

/**
 * A poneglyph — the stone a Log Pose card is cut into.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *
 * Hand-plotted, like the Sunny, the fist and the isles. If you draw better
 * stone, swapping it in needs nothing outside this file:
 *
 *   - It fills its parent absolutely and paints nothing but background. The
 *     card's own content is a sibling drawn over it, so this file must never
 *     know what is written on top of it.
 *   - Colours are props, never literals: `body`, `carve`, `lip`, `moss`.
 *     The palette supplies all four and they are identical on all four
 *     hardening levels, because a poneglyph is an object rather than a mood.
 *   - `seed` decides the inscription and nothing else. Same seed, same
 *     glyphs, forever.
 *
 * What makes it read as *carved* rather than printed is the pairing: every
 * glyph stroke is drawn twice, once in `carve` and once one unit lower in
 * `lip`. That is a cut and the light catching its near edge. Drop the lip
 * and the whole slab flattens into wallpaper.
 * ---------------------------------------------------------------------------
 */

/**
 * The grid this slab is cut on.
 *
 * The alphabet, the mason and the geometry all live in `glyphs.ts` now — the
 * chart's stones needed carving too, and one stonecutter beats two that
 * drift. What stays here is how big the letters are on *this* slab.
 */
const GRID = { cell: { w: 14, h: 18 }, gap: { x: 8, y: 10 } } as const;

export function Stone({
  seed,
  body,
  carve,
  lip,
  moss,
  /** Corner rounding, so the slab matches whatever card holds it. */
  round = radius.md,
}: {
  seed: string;
  body: string;
  carve: string;
  lip: string;
  moss: string;
  round?: number;
}) {
  // A fixed drawing box the slab is stretched over. The inscription is
  // meant to be texture, not typography — nobody is reading it — so
  // letting it scale with the card is right, and it means one memo per
  // seed rather than one per measured width.
  const W = 320;
  const H = 220;
  const glyphs = useMemo(() => inscribe(seed, GRID, W, H), [seed]);

  // The gradient's id, from the seed's hash rather than the seed itself.
  // A pillar is called things like "Master the blade", and an SVG id
  // containing spaces is invalid: `url(#face-Master the blade)` resolves to
  // nothing, and an unresolvable paint renders *black*. Both slabs came out
  // near-black on the first cut and the text on top stayed bright, which is
  // what gave it away — an opacity bug dims everything, a bad paint
  // reference dims only what it paints.
  const gid = useMemo(() => `face${hash(seed).toString(36)}`, [seed]);

  // Moss gathers where water sits: the corners and the foot. Seeded from
  // the same string, so a pillar weathers one way and keeps to it.
  const clumps = useMemo(() => {
    const next = rng(hash(`${seed}~moss`));
    return Array.from({ length: 7 }, (_, i) => {
      const onFoot = i % 2 === 0;
      const cx = next() * W;
      const cy = onFoot ? H - next() * 26 : next() * 22;
      const r = 8 + next() * 18;
      return { cx, cy, r, o: 0.07 + next() * 0.1 };
    });
  }, [seed]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ borderRadius: round }}
      >
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="0.35" y2="1">
            {/* Stone is lit from above and holds cold shadow at its foot. */}
            {/* Light along the top edge and a little cold at the foot —
                enough to say the slab is lit from somewhere, never enough
                to wash the rock's own colour out of it. The first cut
                dropped a 55% shadow over the lower two thirds and both
                stones came out black. */}
            <Stop offset="0" stopColor={lip} stopOpacity="0.22" />
            <Stop offset="0.3" stopColor={body} stopOpacity="0" />
            <Stop offset="1" stopColor={carve} stopOpacity="0.28" />
          </LinearGradient>
        </Defs>

        <Rect x={0} y={0} width={W} height={H} fill={body} />
        <Rect x={0} y={0} width={W} height={H} fill={`url(#${gid})`} />

        {/* The inscription, cut and then lit. Two passes, one path each. */}
        {/* Texture, not typography: nobody reads this, and at anything
            above a quarter it starts competing with the words on top. */}
        <G opacity={0.24}>
          <Path
            d={glyphs}
            transform="translate(0 1)"
            fill="none"
            stroke={lip}
            strokeWidth={2}
            strokeLinecap="square"
          />
          <Path d={glyphs} fill="none" stroke={carve} strokeWidth={2} strokeLinecap="square" />
        </G>

        {/* Weathering, then moss over it. */}
        {clumps.map((c, i) => (
          <Path
            key={i}
            d={`M ${c.cx - c.r} ${c.cy} q ${c.r * 0.5} ${-c.r * 0.5} ${c.r} 0 q ${c.r * 0.5} ${c.r * 0.45} ${c.r} 0`}
            fill="none"
            stroke={moss}
            strokeWidth={c.r * 0.5}
            strokeLinecap="round"
            opacity={c.o}
          />
        ))}
      </Svg>
    </View>
  );
}
