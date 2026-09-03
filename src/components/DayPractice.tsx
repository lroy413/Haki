import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { underCrew } from '../theme/palettes';
import { practice, type Practice, type PracticeKey } from '../domain/practice';
import { levelName } from '../domain/hardening';
import { font, radius, space, type } from '../theme/tokens';
import { plate, press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The day's practice — the card that makes hardening legible.
 *
 * Six things, two to a row, each one a way in. The copy rules are all in
 * `domain/practice.ts`; the rules here are visual and there are three:
 *
 * 1. **Three tones, not six.** Colour follows the lens rather than the tile —
 *    Observation violet, Armament crimson, and the two that are records
 *    rather than acts in cyan. Six accents in a grid this size is a paint
 *    chart, and the lens groupings are the thing actually worth showing.
 * 2. **Fixed tile height.** Rows must line up whatever the labels do, per the
 *    repo's standing rule about cards in a row.
 * 3. **An untouched tile is quiet, never faint.** Dimming what you have not
 *    done yet turns the card into a scoreboard with the losses greyed out.
 *    The undone ones are legible; the done ones are simply lit.
 */

/** Which lens each practice belongs to, and so what colour it lights up in. */
function toneFor(c: Palette, key: PracticeKey): { on: string; soft: string } {
  switch (key) {
    case 'read':
    case 'stillness':
      return { on: c.violet, soft: c.violetSoft };
    case 'strike':
    case 'gear':
      return { on: c.crimson, soft: c.crimsonSoft };
    // The heading and the log are records rather than acts of will.
    default:
      return { on: c.cyan, soft: c.cyanSoft };
  }
}

/** Two to a row, so the rows can be Views and every tile can flex to match. */
function pairs(items: Practice[]): Practice[][] {
  const out: Practice[][] = [];
  for (let i = 0; i < items.length; i += 2) out.push(items.slice(i, i + 2));
  return out;
}

export function DayPractice({ onOpen }: { onOpen: (route: string) => void }) {
  const { acts, hardening, palette, plainMode, read, crew } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  // 武装色 through the crew's eyes, and only 武装色: the violet rows here are
  // Observation's, which never moves, so the conquerors slot is pinned.
  const lens = useMemo(
    () => underCrew(palette, { conquerors: 'violet', armament: crew.armament }),
    [palette, crew],
  );
  const items = useMemo(
    () => practice(acts, plainMode, read?.weather ?? null, crew.name),
    [acts, plainMode, read, crew],
  );

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>{plainMode ? 'Today' : 'The day'}</Text>
        {/* Plain mode pins hardening to the settled dark so a screenshare
            stays still, which makes the level meaningless there — so it is
            not shown, rather than shown wrong. */}
        {plainMode ? null : <Text style={styles.level}>{levelName(hardening)}</Text>}
      </View>

      {/* No sentence about the level here. The app going darker IS the
          message — a paragraph restating it is the wordiest thing on the
          busiest screen, and it is the closest this app ever came to printing
          hardening as a score. `dayMessage` still exists for the one screen
          that explains the mechanic. */}
      {pairs(items).map((row, i) => (
        <View key={i} style={styles.row}>
          {row.map((item) => {
            const tone = toneFor(lens, item.key);
            return (
              <Pressable
                key={item.key}
                onPress={() => onOpen(item.route)}
                accessibilityRole="button"
                accessibilityLabel={`${item.label}: ${item.line}`}
                style={({ pressed }) => [
                  styles.tile,
                  // Plain mode drops the glyph, so the tile does not need to
                  // reserve a corner for it.
                  item.kanji ? styles.tileGlyph : styles.tilePlain,
                  // Lit, not outlined. A tinted fill *and* a coloured rim is
                  // the same fact said twice, and on a day where all six are
                  // done it turned the busiest card on the home screen into
                  // six ringed boxes in three colours — a paint chart, which
                  // is the exact thing `toneFor` exists to avoid.
                  item.done && { backgroundColor: tone.soft, borderColor: tone.soft },
                  pressed && styles.pressed,
                ]}
              >
                {/* The glyph floats in the corner rather than sitting in the
                    flow. Plain mode drops it, and a tile laid out around a
                    glyph that is not there opens a hole in the middle. */}
                {item.kanji ? (
                  <Text style={[styles.kanji, item.done && { color: tone.on }]}>
                    {item.kanji}
                  </Text>
                ) : null}
                <View style={styles.words}>
                  <Text style={styles.tileLabel} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.line, item.done && { color: tone.on }]}
                    numberOfLines={2}
                  >
                    {item.line}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      ...plate(c),
      padding: space.md,
      gap: space.sm,
    },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    label: { ...type.label, color: c.inkFaint },
    level: { ...type.mono, fontSize: 13, color: c.inkDim },
    message: { ...type.small, color: c.inkDim, lineHeight: 19 },

    row: { flexDirection: 'row', gap: space.sm },
    tile: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.sm,
      paddingHorizontal: space.sm,
    },
    // Fixed heights, so the two tiles in a row match whatever their labels
    // do. The glyph sits in the corner and the words at the foot, so this
    // number is the gap between them: 92 opened a void down the middle of
    // every tile, three rows of it, on the screen with the least room to
    // spare in the app.
    tileGlyph: { minHeight: 74 },
    tilePlain: { minHeight: 62 },
    kanji: {
      position: 'absolute',
      top: space.sm,
      left: space.sm,
      fontFamily: font.display,
      fontSize: 16,
      color: c.inkFaint,
    },
    words: { gap: 1 },
    tileLabel: { ...type.heading, fontSize: 15, color: c.ink },
    line: { ...type.mono, fontSize: 12, color: c.inkFaint, lineHeight: 14 },
    pressed: { ...press },
  });
