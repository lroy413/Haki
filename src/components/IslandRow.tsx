import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import type { HardeningLevel } from '../domain/hardening';
import { useHaki } from '../state/HakiProvider';
import { SWELL, swellPath } from './instruments/Sea';
import { ISLE_H, ISLE_W, ISLE_WATERLINE, Isle, type IsleKind } from './instruments/Isles';
import { space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * One island on the settings chart, and the water it stands in.
 *
 * The settings tab is drawn as an archipelago: each category is an island,
 * and pressing the island goes ashore to its page. This file is the *system*
 * half of that — the row, the water, the plotted course — and the landmasses
 * themselves live in `instruments/Isles.tsx`, replaceable per the usual rule:
 * drawings are replaceable, systems are not.
 *
 * What the system owns:
 *
 * - **The water is the Sunny's water.** Same `swellPath`, same `SWELL`
 *   amounts per hardening level — flat calm on paper, running in the settled
 *   dark. Two screens that disagreed about the weather would give the whole
 *   conceit away.
 * - **The course is plotted, not implied.** A dashed leg runs from the top
 *   edge of each row — where the previous island stands — down to this one,
 *   then a stub carries on toward the next, the way a route is pencilled
 *   across a chart. The rows stack with no gap so the legs join.
 * - **The whole row is the target.** The island is the button, but a 44pt
 *   coastline is a fiddly thing to hit; the entire band of sea it sits in
 *   presses, well clear of the floor.
 *
 * No card, no border: the sea is the ground. This is the one screen in the
 * app whose blocks are not blocks, and that is the point — settings is a
 * place you sail around, not a form you fill in.
 */

/** The band of sea one island owns. */
export const ROW_H = 96;
/** Where the waterline runs inside it. */
const WL = 64;
/** How far the island's box sits in from the screen edge. */
const EDGE = 8;

/** The x an island's centre sits at, given the chart width. */
export function anchorX(side: 'left' | 'right', w: number): number {
  return side === 'left' ? EDGE + ISLE_W / 2 : w - EDGE - ISLE_W / 2;
}

export function IslandRow({
  kind,
  name,
  value,
  side,
  w,
  prevX,
  last,
  level,
  accent,
  onPress,
}: {
  kind: IsleKind;
  name: string;
  value: string;
  side: 'left' | 'right';
  /** Chart width in dp, measured once by the screen. */
  w: number;
  /** Where the previous island stands, for the incoming course leg. */
  prevX: number | null;
  last: boolean;
  level: HardeningLevel;
  /** The one meaningful colour on the chart — see `Isles.tsx`. */
  accent: string;
  onPress: () => void;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const ax = anchorX(side, w);
  const sw = SWELL[level];

  // The course: in from the previous island, ashore here, out toward the
  // next. One path, drawn under the landmass so the arrival point is the
  // island itself rather than a mark beside it.
  const course = [
    prevX === null ? '' : `M ${prevX} 0 Q ${(prevX + ax) / 2} ${WL * 0.55} ${ax} ${WL - 4}`,
    last ? '' : `M ${ax} ${WL + 6} L ${ax} ${ROW_H}`,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${value}.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          {course ? (
            <Path
              d={course}
              fill="none"
              stroke={palette.inkFaint}
              strokeWidth={1.2}
              strokeDasharray="1.5 5.5"
              strokeLinecap="round"
              opacity={0.9}
            />
          ) : null}

          {/* Two runs of the Sunny's own swell, pooled around the island
              rather than ruled across the screen — six stacked full-width
              waterlines read as a ledger, not a sea. Both spans are whole
              half-wavelengths so the strokes end on nodes, and both run off
              the near screen edge the way the Sunny's band does. */}
          <Path
            d={swellPath(WL + 2, 1.9 * sw, 36, false, ax - 108, ax + 108)}
            fill="none"
            stroke={palette.inkFaint}
            strokeWidth={1.1}
            strokeLinecap="round"
            opacity={0.75}
          />
          {/* The near run only exists once there is swell to carry it — the
              Sunny's sea shows one line at level 0, and a second straight
              line here just double-underlined the island. */}
          {sw > 0 ? (
            <Path
              d={swellPath(WL + 9, 2.7 * sw, 27, true, ax - 67.5, ax + 67.5)}
              fill="none"
              stroke={palette.inkFaint}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.45}
            />
          ) : null}

          <G transform={`translate(${ax - ISLE_W / 2}, ${WL - ISLE_WATERLINE})`}>
            <Isle kind={kind} ink={palette.inkDim} faint={palette.inkFaint} accent={accent} />
          </G>
        </Svg>
      </View>

      {/* The name plate stands on the opposite shore, clear of the drawing. */}
      <View style={[styles.plate, side === 'left' ? styles.plateRight : styles.plateLeft]}>
        <Text style={[styles.name, side === 'left' && styles.textRight]}>{name}</Text>
        <Text style={[styles.value, side === 'left' && styles.textRight]}>{value}</Text>
      </View>
    </Pressable>
  );
}

/**
 * The island again, small and becalmed, at the top of its own page — the
 * "you are here" of having gone ashore. Decoration, so callers skip it in
 * plain mode.
 */
export function IslandBadge({ kind, accent }: { kind: IsleKind; accent: string }) {
  const { palette } = useHaki();
  return (
    <View style={badgeStyles.frame} pointerEvents="none">
      <Svg
        width={ISLE_W + 24}
        height={ISLE_H + 4}
        viewBox={`-12 -2 ${ISLE_W + 24} ${ISLE_H + 4}`}
      >
        {/* Harbour water: always calm, whatever is running outside. */}
        <Path
          d={`M -10 ${ISLE_WATERLINE} L ${ISLE_W + 10} ${ISLE_WATERLINE}`}
          fill="none"
          stroke={palette.inkFaint}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.75}
        />
        <Isle kind={kind} ink={palette.inkDim} faint={palette.inkFaint} accent={accent} />
      </Svg>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  frame: { alignItems: 'center' },
});

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      height: ROW_H,
      justifyContent: 'center',
    },
    pressed: { ...press },

    plate: {
      position: 'absolute',
      top: 0,
      bottom: space.md,
      justifyContent: 'center',
      maxWidth: '45%',
    },
    plateLeft: { left: space.lg, alignItems: 'flex-start' },
    plateRight: { right: space.lg, alignItems: 'flex-end' },
    name: { ...type.heading, color: c.ink },
    value: { ...type.mono, color: c.inkDim, marginTop: 3 },
    textRight: { textAlign: 'right' },
  });
