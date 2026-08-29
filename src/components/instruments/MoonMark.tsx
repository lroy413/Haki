import { Circle, Path, Svg } from 'react-native-svg';
import { litPath } from '../../domain/moon';
import { MOON_LIT, type MoonMark as Mark } from '../../domain/tide';

/**
 * REPLACING THIS DRAWING
 *
 * A moon the size of a full stop, for the Tide Calendar's four principal
 * phases. viewBox is `-10 -10 20 20`, square, drawn at whatever `size` the
 * caller gives it; colour arrives as `tint` and nothing here reads the
 * palette. What the composition has to keep: the dark of the moon is present
 * but faint (a new moon must still be a disc, or the mark disappears on the
 * one night it means something), and the lit part is the *same* geometry the
 * settings chart's moon uses — `litPath` in `domain/moon.ts`. Do not
 * re-derive a terminator here.
 *
 * Not a glyph. ◐ and ◑ are not in the mono face and fell back to a clipped
 * sliver; a twelve-point drawing is exact at any size and cannot be defeated
 * by a font.
 */
export function MoonMark({ mark, size, tint }: { mark: Mark; size: number; tint: string }) {
  const { fraction, waxing } = MOON_LIT[mark];
  const lit = litPath(9, fraction, waxing);
  return (
    <Svg width={size} height={size} viewBox="-10 -10 20 20">
      {/* The whole disc, barely — earthshine, and the new moon's only mark. */}
      <Circle cx={0} cy={0} r={9} fill={tint} opacity={0.24} />
      {/* The ring carries the new moon on its own — the one night with nothing
          lit is the one night the mark must still be legible. */}
      <Circle cx={0} cy={0} r={9} fill="none" stroke={tint} strokeWidth={1.4} opacity={0.8} />
      {lit === 'none' ? null : lit === 'full' ? (
        <Circle cx={0} cy={0} r={9} fill={tint} />
      ) : (
        <Path d={lit} fill={tint} />
      )}
    </Svg>
  );
}
