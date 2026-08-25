import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import type { HardeningLevel } from '../domain/hardening';
import { useHaki } from '../state/HakiProvider';
import { SWELL, swellPath } from './instruments/Sea';
import { ISLE_H, ISLE_W, ISLE_WATERLINE, Isle, type IsleKind } from './instruments/Isles';
import { Skyline } from './instruments/Skyline';
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
 *
 * And at night it is a *scene*. As the day hardens the sea darkens, the sky
 * fills with stars behind a moonlit peak, and each island becomes a dark
 * landmass whose landmark keeps a light — the lamp, the lanterns, the
 * beacon — standing in a warm pool on the water. The light is lamplight:
 * always `warn`, one warmth for the whole chart, never a lens colour — the
 * crew pennant stays the chart's one lens-coloured mark. It obeys the same
 * law as every aura in `lit()`: paper catches nothing (the chart stays the
 * pencilled drawing it always was), the light only grows with the level,
 * and plain mode never sees any of it because plain mode gets the list.
 */

/** The band of sea one island owns — the island, and its name beneath. */
export const ROW_H = 126;
/** Where the waterline runs inside it. */
const WL = 64;
/** How far the island's box sits in from the screen edge. */
const EDGE = 8;
/** The name plate's width, centred under its island. */
const PLATE_W = ISLE_W + 56;

/** The x an island's centre sits at, given the chart width. */
export function anchorX(side: 'left' | 'right', w: number): number {
  return side === 'left' ? EDGE + ISLE_W / 2 : w - EDGE - ISLE_W / 2;
}

/**
 * How hard an island's pool of light burns at each level. Zero on paper is
 * the law, not a tuning choice: unhardened Haki does not shine, and neither
 * does an unhardened sea.
 */
const LUME: Record<HardeningLevel, number> = { 0: 0, 1: 0.55, 2: 0.8, 3: 1 };

/**
 * The pool an island's light lies in — flat, wide ellipses on the waterline,
 * stepped down in opacity because native SVG has no blur to lean on. Drawn
 * under the swell so the waterlines cross *through* the glow, which is what
 * makes it read as light on water rather than a sticker behind an island.
 */
function LumePool({
  ax,
  wl,
  lume,
  strength,
}: {
  ax: number;
  wl: number;
  lume: string;
  strength: number;
}) {
  if (strength === 0) return null;
  const shells = [
    { rx: 100, ry: 16, o: 0.04 },
    { rx: 78, ry: 12, o: 0.07 },
    { rx: 58, ry: 9, o: 0.11 },
    { rx: 42, ry: 6.5, o: 0.17 },
    { rx: 30, ry: 4.5, o: 0.26 },
    // The hot ring at the shore — the brightest water is the water touching
    // the land, and it is what makes the pool read as the island's own light
    // rather than a haze that happens to be nearby.
    { rx: 21, ry: 3, o: 0.4 },
  ];
  return (
    <G>
      {shells.map((sh, i) => (
        <Ellipse
          key={i}
          cx={ax}
          cy={wl + 3}
          rx={sh.rx}
          ry={sh.ry}
          fill={lume}
          fillOpacity={sh.o * strength}
        />
      ))}
    </G>
  );
}

/**
 * The sky the archipelago sits under, and the far shore against it.
 *
 * On paper it is the pencilled skyline it always was — one stroked ridge,
 * part of the drawn chart. At night it opens into a scene: a gradient sky
 * salted with stars, the moon over the water, a moonlit massif with its
 * facets caught and lost, and the two ridges of the far shore in haze at its
 * feet. Every position is a fixed rhythm scaled to the chart's width —
 * deterministic, so the sky never reshuffles between visits.
 */
export function ChartSky({ w, level }: { w: number; level: HardeningLevel }) {
  const { palette } = useHaki();
  const lit = level > 0;
  const H = lit ? 208 : 52;

  // One ridge as an open run of peaks: [x fraction, height fraction] pairs,
  // heights measured up from the ridge's own base.
  const run = (pts: [number, number][], base: number, rise: number) =>
    `M 0 ${base} ` +
    pts
      .map(([fx, fh]) => `L ${(fx * w).toFixed(1)} ${(base - fh * rise).toFixed(1)}`)
      .join(' ') +
    ` L ${w} ${base}`;

  const farBase = H - 14;
  const nearBase = H - 4;
  const far = run(
    [
      [0.06, 0.35],
      [0.14, 0.1],
      [0.24, 0.62],
      [0.33, 0.2],
      [0.45, 0.85],
      [0.56, 0.3],
      [0.66, 0.55],
      [0.78, 0.12],
      [0.9, 0.45],
    ],
    farBase,
    38,
  );
  const near = run(
    [
      [0.1, 0.2],
      [0.22, 0.75],
      [0.38, 0.15],
      [0.62, 1],
      [0.8, 0.3],
      [0.93, 0.55],
    ],
    nearBase,
    48,
  );

  if (!lit) {
    return (
      <View style={{ height: H }} pointerEvents="none">
        <Svg width="100%" height="100%">
          {/* On paper the far shore is pencilled, one skyline, nothing
              filled — the same hand that drew the islands. */}
          <Path
            d={near}
            fill="none"
            stroke={palette.inkFaint}
            strokeWidth={1.2}
            strokeLinejoin="round"
            opacity={0.75}
          />
        </Svg>
      </View>
    );
  }

  // Fixed stars: [x fraction, y, radius, opacity]. Clustered unevenly on
  // purpose — an even field reads as a pattern, not a sky.
  const STARS: [number, number, number, number][] = [
    [0.08, 22, 1.1, 0.55],
    [0.16, 48, 0.8, 0.35],
    [0.23, 14, 0.9, 0.5],
    [0.31, 62, 0.8, 0.3],
    [0.38, 30, 1.2, 0.6],
    [0.44, 10, 0.8, 0.4],
    [0.52, 44, 0.9, 0.35],
    [0.58, 20, 0.8, 0.5],
    [0.67, 56, 1.1, 0.4],
    [0.72, 12, 0.9, 0.55],
    [0.9, 66, 0.9, 0.4],
    [0.95, 26, 1.1, 0.5],
    [0.12, 84, 0.8, 0.25],
    [0.55, 78, 0.8, 0.25],
  ];
  const strength = LUME[level];
  const moonX = w * 0.82;
  const moonY = 44;

  return (
    <View style={{ height: H }} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="chartSky" x1="0" y1="0" x2="0" y2="1">
            {/* Darkest at the zenith, lifting toward the horizon — night
                haze sits low. Both stops are the palette's own grounds. */}
            <Stop offset="0" stopColor={palette.bg} stopOpacity="1" />
            <Stop offset="0.72" stopColor={palette.surface} stopOpacity="0.55" />
            <Stop offset="1" stopColor={palette.surface} stopOpacity="0.95" />
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={w} height={H} fill="url(#chartSky)" />

        {STARS.map(([fx, y, r, o], i) => (
          <Circle key={i} cx={fx * w} cy={y} r={r} fill={palette.ink} opacity={o * strength} />
        ))}

        {/* The moon, and its air. The one light up here — the lamplight
            below is warm, the moon is not, and the difference is what makes
            the lamps read as kept by somebody. */}
        {[
          { r: 38, o: 0.03 },
          { r: 31, o: 0.045 },
          { r: 25, o: 0.06 },
          { r: 20, o: 0.08 },
          { r: 17, o: 0.1 },
        ].map((sh) => (
          <Circle
            key={sh.r}
            cx={moonX}
            cy={moonY}
            r={sh.r}
            fill={palette.ink}
            opacity={sh.o * strength}
          />
        ))}
        <Circle cx={moonX} cy={moonY} r={15} fill={palette.ink} opacity={0.92} />
        <Circle cx={moonX - 4} cy={moonY - 3} r={3.2} fill={palette.bg} opacity={0.28} />
        <Circle cx={moonX + 5} cy={moonY + 4} r={2.1} fill={palette.bg} opacity={0.22} />
        <Circle cx={moonX + 1} cy={moonY - 7} r={1.5} fill={palette.bg} opacity={0.2} />

        {/* The massif, moonlit, standing on the horizon's own base line. */}
        <G transform={`translate(${w * 0.5 - 100}, ${farBase - 118})`}>
          <Skyline
            snow={palette.ink}
            litFace={palette.specular}
            shadeFace={palette.surface2}
            foot={palette.surface}
          />
        </G>

        {/* The far shore, in two depths of haze, closed into the sea. */}
        <Path d={`${far} L ${w} ${H} L 0 ${H} Z`} fill={palette.surface} opacity={0.85} />
        <Path d={`${near} L ${w} ${H} L 0 ${H} Z`} fill={palette.surface2} opacity={0.95} />
        <Path
          d={near}
          fill="none"
          stroke={palette.specular}
          strokeWidth={0.9}
          strokeLinejoin="round"
          opacity={0.4}
        />
      </Svg>
    </View>
  );
}

export function IslandRow({
  kind,
  name,
  value,
  side,
  w,
  prevX,
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
  level: HardeningLevel;
  /** The one meaningful colour on the chart — see `Isles.tsx`. */
  accent: string;
  onPress: () => void;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const ax = anchorX(side, w);
  const sw = SWELL[level];

  // The course: in from the previous island, ashore here. One curve per
  // row, entering at the top edge — which is where the previous island
  // stands, its own name plate ending just above — so the pencilled legs
  // read as one continuous route without ever crossing a label.
  const course =
    prevX === null ? '' : `M ${prevX} 0 Q ${(prevX + ax) / 2} ${WL * 0.55} ${ax} ${WL - 4}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}. ${value}.`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* The soft half of the glow: a ground-coloured oval whose shadow is
          the bloom. Real blur on the platforms this app lives on, and the
          body itself vanishes into the sea it sits in. Under the SVG, so the
          swell and the landmass draw over it. */}
      {LUME[level] > 0 ? (
        <View
          pointerEvents="none"
          style={[
            styles.bloom,
            {
              left: ax - 52,
              shadowOpacity: 0.18 + 0.18 * LUME[level],
              shadowRadius: 20 + 10 * LUME[level],
            },
          ]}
        />
      ) : null}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          <LumePool ax={ax} wl={WL} lume={palette.warn} strength={LUME[level]} />
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
            {/* On paper the island is drawn; at night it is a landmass with
                its landmark lit, standing dark in its own lamplight. */}
            <Isle
              kind={kind}
              mode={level === 0 ? 'drawn' : 'lit'}
              ink={level === 0 ? palette.inkDim : palette.ink}
              faint={level === 0 ? palette.inkFaint : palette.inkDim}
              accent={accent}
              body={palette.surface2}
              lume={palette.warn}
            />
          </G>
        </Svg>
      </View>

      {/* The name beneath the island, the way a camp labels its tents —
          centred on the landmass, clamped so an edge island's label never
          leaves the screen. */}
      <View
        style={[
          styles.plate,
          { left: Math.max(space.xs, Math.min(ax - PLATE_W / 2, w - PLATE_W - space.xs)) },
        ]}
      >
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.value} numberOfLines={1}>
          {value}
        </Text>
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
  const { palette, hardening, plainMode } = useHaki();
  // The harbour keeps the chart's light, under the same law as the chart.
  const strength = LUME[plainMode ? 0 : hardening];
  return (
    <View style={badgeStyles.frame} pointerEvents="none">
      <Svg
        width={ISLE_W + 24}
        height={ISLE_H + 4}
        viewBox={`-12 -2 ${ISLE_W + 24} ${ISLE_H + 4}`}
      >
        {strength > 0 ? (
          <LumePool
            ax={ISLE_W / 2}
            wl={ISLE_WATERLINE}
            lume={palette.warn}
            strength={strength * 0.8}
          />
        ) : null}
        {/* Harbour water: always calm, whatever is running outside. */}
        <Path
          d={`M -10 ${ISLE_WATERLINE} L ${ISLE_W + 10} ${ISLE_WATERLINE}`}
          fill="none"
          stroke={palette.inkFaint}
          strokeWidth={1.1}
          strokeLinecap="round"
          opacity={0.75}
        />
        <Isle
          kind={kind}
          mode={strength > 0 ? 'lit' : 'drawn'}
          ink={strength > 0 ? palette.ink : palette.inkDim}
          faint={strength > 0 ? palette.inkDim : palette.inkFaint}
          accent={accent}
          body={palette.surface2}
          lume={palette.warn}
        />
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

    bloom: {
      position: 'absolute',
      top: WL - 24,
      width: 104,
      height: 42,
      borderRadius: 52,
      backgroundColor: c.bg,
      shadowColor: c.warn,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },

    plate: {
      position: 'absolute',
      top: WL + 16,
      width: PLATE_W,
      alignItems: 'center',
      gap: 2,
    },
    name: { ...type.label, fontSize: 12, color: c.ink, textAlign: 'center' },
    value: { ...type.mono, color: c.inkDim, textAlign: 'center' },
  });
