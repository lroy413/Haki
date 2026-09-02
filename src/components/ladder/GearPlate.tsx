import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../../state/HakiProvider';
import { Steam } from '../instruments/Steam';
import { Flame } from '../instruments/Flame';
import {
  TOP,
  emptyLine,
  holdLine,
  reachLine,
  rungName,
  type Minimums,
  type Rung,
} from '../../domain/ladder';
import { darkest, underCrew } from '../../theme/palettes';
import { lit, plate } from '../../theme/surfaces';
import { font, radius, space, type } from '../../theme/tokens';
import type { Palette } from '../../theme/palettes';

/**
 * The ladder's identity plate — which rung the page wears, and why.
 *
 * It says three things and stops: the rung worn (the higher of what this
 * week has reached and what is held), how far the week has got and what the
 * next rung asks, and what is held. Nothing about last week, nothing about
 * how long, no count of weeks.
 *
 * **The held rung is drawn all the time.** The owner: _"every successful
 * week makes one level persist and vice versa if I miss a week I go down.
 * This should be expressed visually in the app someway."_ So the plate gives
 * off its crew's aura — Luffy's steam, Enma's green flame under Zoro — and
 * the aura thickens with the rung. A dropped week thins it, and that is the
 * whole of what a drop does: no red, no message, the steam just stands a
 * little lower.
 *
 * At the top the plate becomes its own object. Luffy's fifth gear is a body
 * made of cloud, so the plate turns white and the kanji goes near-black on
 * it; Zoro's King of Hell is the blade run green with Conqueror's, so the
 * plate goes near-black with the kanji in the crew's green. Both are fixed
 * colours rather than the palette's, the way the poneglyph is — the fifth
 * gear looks the same at dawn and at midnight because it is not a mood.
 *
 * Plain mode gets the words and none of the weather, like every other
 * performance in the app.
 */

/** How far above the plate the aura may rise. The wrapper leaves the room. */
export const RISE = 56;

export function GearPlate({
  worn,
  held,
  reached,
  completed,
  minimums,
  empty,
  tint,
}: {
  worn: Rung;
  held: Rung;
  reached: Rung;
  completed: number;
  minimums: Minimums;
  /** True before anything has been set up, so the plate offers rather than counts. */
  empty: boolean;
  /** The screen's light — the Armament lens under the crew. */
  tint: string;
}) {
  const { palette, crew, plainMode, conquerors, hardening, charge } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const name = rungName(crew.name, worn);
  const performing = !plainMode;
  const luffy = crew.instrument === 'fist';
  const top = performing && worn >= TOP;

  // On the top rung the plate is an object with its own colours.
  const ground = top ? (luffy ? palette.onStone : darkest(palette)) : null;
  const inkOn = ground ? (luffy ? darkest(palette) : palette.onStone) : palette.ink;
  const dimOn = ground ? inkOn : palette.inkDim;
  const kanjiOn = ground ? (luffy ? darkest(palette) : conquerors) : tint;

  // The aura grows with the rung and is full by the fourth; the fifth adds
  // the page around it, which is the pane's job.
  const amount = Math.min(1, worn / 4);
  const showAura = performing && worn > 0;

  return (
    <View style={[styles.wrap, showAura && styles.wrapRisen]}>
      {showAura ? (
        <View style={styles.aura}>
          {luffy ? (
            <Steam
              amount={amount}
              // White vapour on the dark palettes; on paper, where white is
              // the ground, the wisps are drawn in pencil.
              colour={palette.lightSurface ? palette.inkDim : palette.onStone}
              shade={darkest(palette)}
              seed={7 + worn}
              rise={RISE}
            />
          ) : (
            <Flame
              amount={amount}
              colour={conquerors}
              // The hot centre: near-white on the dark palettes, and on paper
              // — where near-white is the ground — the crew's soft green.
              core={
                palette.lightSurface ? underCrew(palette, crew).violetSoft : palette.onStone
              }
              seed={11 + worn}
              rise={RISE}
            />
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.plate,
          ground
            ? // Its own colours, and the palette's hairline for an edge: a white
              // plate on the white page has to still be a plate.
              {
                backgroundColor: ground,
                borderColor: palette.line,
                borderTopColor: palette.line,
              }
            : lit(tint, plainMode ? 0 : hardening, charge),
        ]}
      >
        {!plainMode && name.kanji ? (
          <Text style={[styles.kanji, { color: kanjiOn }]}>{name.kanji}</Text>
        ) : null}
        <Text style={[styles.label, { color: inkOn }]}>{name.label}</Text>
        <Text style={[styles.reach, { color: dimOn }]}>
          {empty ? emptyLine(crew.name) : reachLine(completed, reached, minimums, crew.name)}
        </Text>
        <Text style={[styles.hold, { color: dimOn }]}>{holdLine(held, crew.name)}</Text>
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { position: 'relative' },
    // Room for the aura to rise into, so it never paints over the tabs.
    wrapRisen: { marginTop: RISE - space.md },
    aura: {
      position: 'absolute',
      top: -RISE,
      left: -space.sm,
      right: -space.sm,
      bottom: 0,
    },
    plate: {
      ...plate(c),
      borderRadius: radius.lg,
      paddingHorizontal: space.lg,
      paddingVertical: space.lg,
      gap: space.xs,
    },
    kanji: { fontFamily: font.display, fontSize: 44, lineHeight: 50, letterSpacing: -1 },
    label: { ...type.title, color: c.ink },
    reach: { ...type.mono, fontSize: 13, color: c.inkDim, marginTop: space.xs },
    hold: { ...type.small, color: c.inkDim, lineHeight: 21 },
  });
