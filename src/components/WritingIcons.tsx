import { View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/**
 * The writing bar's marks — drawn, never typed.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THESE DRAWINGS
 *
 *   - viewBox `0 0 24 24` each, rendered square. Content sits inside roughly
 *     y 5..19 so every mark carries the same optical weight as the letters
 *     beside it; an icon that fills its box stands a head taller than the B.
 *   - One colour, `colour`, handed in. No palette read, no literal — the same
 *     contract every instrument in this app signs.
 *   - `pointerEvents="none"`, because each of these sits inside a button.
 * ---------------------------------------------------------------------------
 *
 * **This is the moon's law applied to a toolbar.** `domain/moon.ts` draws its
 * terminator rather than typing ◐ because that glyph is not in the mono face
 * and came out as a clipped sliver. The bar had the same fault in five places
 * and nobody had read the pixels: the blockquote's `▌` rendered as a solid
 * teal block indistinguishable from a missing-glyph box, the inline-code
 * backtick as a speck in the top-left of an otherwise empty button, and `☐`,
 * `•` and `—` as a hollow square, a dot and a dash — three shapes that mean
 * nothing on their own. A character chosen because it *resembles* an icon is
 * still a character: it is set at the font's size, on the font's baseline, in
 * whatever face happens to have it, and it looks like whatever that face
 * decided. A drawing looks like what it is.
 *
 * So these are the shapes every editor uses, at the weight the rest of the bar
 * is set in. B, I and H stay as letterforms and are not here — those three are
 * *letters* in every toolbar ever built, they are the two the owner said he
 * could read, and Latin capitals are the one thing no face is missing.
 */

export type IconName = 'code' | 'bullet' | 'task' | 'quote' | 'rule';

/**
 * The single stroke weight, so five different drawings read as one set.
 *
 * Matched by eye to Bricolage's bold B at 19pt sitting two buttons away —
 * a hairline set beside that letter reads as a different toolbar.
 */
const STROKE = 2;
/** The checkbox's outline: a rule, not a mark, so it is drawn one step finer. */
const HAIRLINE = 1.7;

export function WritingIcon({
  name,
  colour,
  size = 20,
}: {
  name: IconName;
  /** The bar decides. A drawing takes its colour and never chooses one. */
  colour: string;
  size?: number;
}) {
  return (
    <View pointerEvents="none">
      <Svg width={size} height={size} viewBox="0 0 24 24">
        {mark(name, colour)}
      </Svg>
    </View>
  );
}

function mark(name: IconName, colour: string) {
  const line = {
    stroke: colour,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  switch (name) {
    /* `<>`. The one universal mark for code, and the only one of the five that
       needs no second element to be read. */
    case 'code':
      return (
        <>
          <Path d="M9.3 5.8 L3.8 12 L9.3 18.2" {...line} />
          <Path d="M14.7 5.8 L20.2 12 L14.7 18.2" {...line} />
        </>
      );

    /* A list, not a bullet. The dot on its own was the bug: one `•` in a
       44-point button is a full stop, and what the button does is turn lines
       into a list — so the drawing is the list. */
    case 'bullet':
      return (
        <>
          {[6, 12, 18].map((y) => (
            <Circle key={y} cx={4} cy={y} r={1.5} fill={colour} />
          ))}
          {[6, 12, 18].map((y) => (
            <Path key={y} d={`M8.8 ${y} H20.5`} {...line} />
          ))}
        </>
      );

    /* One box, ticked, and big.
     *
     * The first cut drew the whole list — two boxes and two lines — and at
     * twenty points the two boxes touched and read as a figure 8 with an
     * equals sign beside it. There is not room for a list here: a box needs
     * to be about half the icon before the tick inside it is a tick rather
     * than a smudge, and two of those plus the air between them is more than
     * the box has. So it is the one thing the button makes, at a size you can
     * see — which is what Notes, Bear and Notion all draw for the same
     * control, and for the same reason. */
    case 'task':
      return (
        <>
          <Rect
            x={5.6}
            y={5.6}
            width={12.8}
            height={12.8}
            rx={3}
            stroke={colour}
            strokeWidth={STROKE}
            fill="none"
          />
          <Path d="M8.9 12.2 L11.3 14.7 L15.4 9.3" {...line} strokeWidth={2.2} />
        </>
      );

    /* A pair of quotation marks, filled.
     *
     * The bar used to carry a solid left bar here, on the reasoning that a
     * blockquote *renders* as a rule down its left edge — true, and still the
     * wrong drawing, because a bar with nothing beside it is a bar. Drawing
     * the quoted lines as well would have made a third icon in the same
     * grammar as the two above it, and at 20 points a dot, a box and a bar
     * with lines beside them are one icon in three costumes. A quotation mark
     * is not confusable with anything. */
    case 'quote':
      return (
        <>
          <Path
            d="M5.1 17.75 L8.55 17.75 L10.85 13.15 L10.85 6.25 L3.95 6.25 L3.95 13.15 L7.4 13.15 Z"
            fill={colour}
          />
          <Path
            d="M14.3 17.75 L17.75 17.75 L20.05 13.15 L20.05 6.25 L13.15 6.25 L13.15 13.15 L16.6 13.15 Z"
            fill={colour}
          />
        </>
      );

    /* A rule. One line, the width of the box, at the weight of a rule.
     *
     * The em-dash it replaces was a *character*: fourteen points wide, a point
     * thick, sitting on a font's baseline rather than in the middle of the
     * button, and identical to a minus sign because it very nearly is one.
     *
     * The first redraw added two faint stubs above and below to say "between
     * paragraphs", and at twenty points three horizontal lines is an equals
     * sign — the top stub was lost against paper and the bottom one read as
     * the second bar of an `=`. One line, centred and confident, is what every
     * editor draws here, and it is the one shape this button cannot be
     * mistaken for something else in. */
    case 'rule':
      return <Path d="M2.2 12 H21.8" {...line} strokeWidth={2.6} />;
  }
}
