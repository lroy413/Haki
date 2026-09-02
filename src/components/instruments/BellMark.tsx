import Svg, { Circle, Path } from 'react-native-svg';

/**
 * A ship's bell.
 *
 * ---------------------------------------------------------------------------
 * REPLACING THIS DRAWING
 *   - viewBox `0 0 24 24`, rendered square at whatever `size` the row wants.
 *   - One colour, `colour`, handed in. No palette read, no literal.
 *   - The lip of the bell sits on y ≈ 18 and the clapper just below it; keep
 *     the crown at the top, because that is what makes it a bell and not a
 *     cloche.
 * ---------------------------------------------------------------------------
 *
 * Drawn, never typed. 🔔 is an emoji and renders as whatever the platform
 * has — a yellow cartoon on one phone, a hollow box on another — and this
 * app's rule (`domain/moon.ts`, the writing bar) is that a mark is the shape
 * you drew. The owner: _"once I set a bell I don't know where it lives"_ —
 * so a bell now looks like one, in a row you can tap.
 */
export function BellMark({ colour, size = 22 }: { colour: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {/* The crown: the loop it hangs from. */}
      <Path d="M10.4 3.6 a1.6 1.6 0 0 1 3.2 0 v1.2 h-3.2 z" fill={colour} />
      {/* The body: a flared bell, shoulders in, lip out. */}
      <Path
        d="M12 4.8 C 8.4 4.8, 7.2 8.2, 7.2 11.4 L 7.2 15.2 C 7.2 16.2, 6.2 16.8, 5.2 17.4 L 5.2 18.4 L 18.8 18.4 L 18.8 17.4 C 17.8 16.8, 16.8 16.2, 16.8 15.2 L 16.8 11.4 C 16.8 8.2, 15.6 4.8, 12 4.8 Z"
        fill={colour}
      />
      {/* The clapper, hanging clear of the lip. */}
      <Circle cx={12} cy={20.6} r={1.5} fill={colour} />
    </Svg>
  );
}
