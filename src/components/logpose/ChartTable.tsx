import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import type { HardeningLevel } from '../../domain/hardening';
import type { Needle } from '../../domain/logpose';
import { SWELL, swellPath } from '../instruments/Sea';
import { useHaki } from '../../state/HakiProvider';
import { press } from '../../theme/surfaces';
import { radius, space, type } from '../../theme/tokens';
import type { Palette } from '../../theme/palettes';
import { MAX_ISLANDS, marksPath, stoneHeight } from './chartMarks';

/**
 * The Log Pose as one chart: the pillars as standing stones on a sea.
 *
 * The Journey tab was six stacked cards, four of them paragraphs with two
 * buttons each — the worst screen in the app for words per screen, and the
 * shape of the journey nowhere in it. This is the whole pillar set in one
 * picture, and everything it says it says without a sentence:
 *
 * - **A stone's height is its work astern.** Islands reached cut it taller.
 *   Never a percentage and never a total beside it, which is the rule
 *   `domain/logpose.ts` already holds about denominators — nobody sailing
 *   knows how many islands are left, so a stone that has *grown* is the only
 *   honest way to draw distance covered.
 * - **A lamp at the waterline means an island is at sea.** No lamp means the
 *   needle is spinning. That is the entire status system.
 * - **An unraised pillar is a dashed outline.** The way this app already
 *   draws an offer.
 *
 * Four Road Poneglyphs triangulate Laugh Tale in canon, and standing them at
 * four bearings on a chart is the literal mechanism rather than a decoration
 * of it — it makes "four" read as a shape instead of a quota.
 *
 * **The drawing carries no words.** The first cut hung each pillar's title
 * under its stone, which at four columns on a phone is seven mono characters
 * a line: "STRONG ENOUGH", "A MIND THAT IS…". A picture that has to be
 * captioned in fragments is two bad things instead of one good one. So the
 * stones are a drawing, and `PillarRow` under them carries the names — dense
 * rows, not cards, each with its own stone in miniature at the left so the
 * eye can pair a row with the thing standing above it. Tapping either goes
 * ashore, where the words and the acts live.
 *
 * The water is the Sunny's water — `SWELL` and `swellPath` from
 * `instruments/Sea.tsx` — because two screens disagreeing about the weather
 * would give the whole conceit away.
 */

/** The drawing's height, and where the sea meets the stones inside it. */
const H = 162;
/**
 * The waterline.
 *
 * Set by the ceiling, not by taste: a stone at `MAX_ISLANDS` has to clear the
 * top of the box by a hair and no more, or every pillar short of the ceiling
 * stands under a band of empty sky. The first cut left seventy-six points of
 * it above the shortest stone, which read as a layout that had lost something
 * rather than as air.
 */
const WL = stoneHeight(MAX_ISLANDS) + 10;
/** Water below the line — enough for both runs of swell and no more. */
const SEA = H - WL;

/**
 * A compass rose: one ring, eight points, a hub.
 *
 * Drawn rather than imported because it is a few lines of trigonometry and a
 * mark this small has no business owning a component.
 *
 * The first cut had two rings and shoulders at a quarter of the radius, plus
 * rhumb lines ruled to the edges of the chart. Every one of those was
 * defensible on its own and together they webbed: the inner ring crossed all
 * eight shoulders, and the rhumbs ran down through the water and out under
 * the rows as long dashed scratches. Chart furniture has to sit *behind* the
 * thing the chart is about. One ring, narrow points, nothing ruled off it.
 */
function rose(cx: number, cy: number, r: number): string {
  const out: string[] = [
    // The ring, as two arcs — a full circle needs both halves.
    `M ${(cx - r).toFixed(1)} ${cy.toFixed(1)} a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(r * 2).toFixed(1)} 0 a ${r.toFixed(1)} ${r.toFixed(1)} 0 1 0 ${(-r * 2).toFixed(1)} 0`,
  ];
  const hub = r * 0.09;
  for (let i = 0; i < 8; i += 1) {
    const a = (i * Math.PI) / 4;
    // Cardinals reach the ring; intercardinals stop well short, which is what
    // makes eight spokes read as a rose rather than as a wheel.
    const reach = i % 2 === 0 ? r : r * 0.54;
    const tip = [cx + Math.sin(a) * reach, cy - Math.cos(a) * reach];
    const l = [cx + Math.cos(a) * hub, cy + Math.sin(a) * hub];
    const rt = [cx - Math.cos(a) * hub, cy - Math.sin(a) * hub];
    out.push(
      `M ${l[0].toFixed(1)} ${l[1].toFixed(1)} L ${tip[0].toFixed(1)} ${tip[1].toFixed(1)} L ${rt[0].toFixed(1)} ${rt[1].toFixed(1)}`,
    );
  }
  return out.join(' ');
}

/**
 * The lamp's pool, hot at the shore and falling off in shells.
 *
 * Same shape the settings chart's lamplight takes. Five steps rather than
 * two, because opacity does not soften an edge — only more of them does.
 */
const SHELLS = [
  { w: 58, h: 20, o: 0.05 },
  { w: 46, h: 16, o: 0.07 },
  { w: 34, h: 12, o: 0.1 },
  { w: 24, h: 9, o: 0.14 },
  { w: 15, h: 7, o: 0.2 },
] as const;

export function ChartTable({
  needles,
  level,
  canAdd,
  onStone,
  onRaise,
  w,
}: {
  needles: Needle[];
  level: HardeningLevel;
  /** Whether there is room for another pillar under the ceiling. */
  canAdd: boolean;
  onStone: (roadId: number) => void;
  onRaise: () => void;
  /** Chart width in dp, measured once by the screen. */
  w: number;
}) {
  const { palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // One column per pillar, plus one for the offer when there is room.
  const slots = needles.length + (canAdd ? 1 : 0);
  const colW = w / Math.max(1, slots);
  const stoneW = Math.max(26, Math.min(54, colW - 20));
  const swell = SWELL[level];
  // Paper catches nothing: on the unhardened palette the chart is pencilled,
  // the same licence the settings archipelago runs under. Water drawn as a
  // pale fill on near-white paper is a grey smear, not a sea.
  const wet = level > 0;

  const stones = needles.map((needle, i) => {
    const h = stoneHeight(needle.reached);
    const cx = colW * (i + 0.5);
    return { needle, h, cx, x: cx - stoneW / 2, y: WL - h, lit: needle.next !== null };
  });

  return (
    <View style={{ height: H }}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%" viewBox={`0 0 ${w} ${H}`}>
          <Defs>
            {/* The sea catches what light there is near the horizon and
                gives it all back by the bottom of the box. Fading out rather
                than down to a colour matters: an opaque band ends in a hard
                edge across the whole chart, which reads as a metal strip
                laid on the page rather than as water running away from
                you. */}
            <LinearGradient id="chartSea" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={palette.surface2} stopOpacity="0.8" />
              <Stop offset="0.55" stopColor={palette.surface} stopOpacity="0.35" />
              <Stop offset="1" stopColor={palette.bg} stopOpacity="0" />
            </LinearGradient>
            <LinearGradient id="chartFace" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor={palette.stoneRoadLip} stopOpacity="0.28" />
              <Stop offset="0.4" stopColor={palette.stoneRoad} stopOpacity="0" />
              <Stop offset="1" stopColor={palette.stoneRoadCarve} stopOpacity="0.42" />
            </LinearGradient>
          </Defs>

          {/* The rose, under everything.

              The sky over the stones was the one part of this drawing with
              nothing in it, and a chart is exactly the kind of picture that
              has an answer for that: a compass rose is what a chart puts in
              open water. It is also the right answer *here* rather than a
              borrowed one — 覇王色 is the lens with no meter, and what this
              screen gives back is a bearing. So the sky holds the instrument
              and the stones stand in front of it.

              Pencilled at every level: it is chart furniture, not weather,
              and it never moves. A rose whose needle swung with the day
              would be a meter, which is the one thing this screen does not
              have. */}
          <Path
            d={rose(w * 0.74, WL * 0.34, Math.min(WL * 0.26, 34))}
            fill="none"
            stroke={palette.inkFaint}
            strokeWidth={0.9}
            strokeLinecap="round"
            opacity={0.3}
          />

          {/* The sea, below the waterline only. Above it is the ground the
              rest of the screen is standing on, which is already the right
              colour — a painted sky here would just be a band. */}
          {wet ? <Rect y={WL} width={w} height={SEA} fill="url(#chartSea)" /> : null}

          {/* The horizon, drawn either way: on paper it is the whole sea. */}
          <Rect
            y={WL}
            width={w}
            height={1}
            fill={palette.inkFaint}
            opacity={wet ? 0.3 : 0.45}
          />

          {/* Reflections first, so each stone sits on top of its own.

              Broken into bands rather than drawn as one block, which is the
              idiom `Water.tsx` already uses and for the same reason: an
              unbroken rectangle under a stone reads as a shadow with a hard
              bottom edge, and water does not have edges. Each band is
              shorter and fainter than the one above it, so the stone
              dissolves into the sea instead of stopping in it. */}
          {wet
            ? stones.map((s, i) =>
                [0, 1, 2, 3].map((b) => {
                  const y = WL + 2 + b * 6;
                  if (y > H - 4) return null;
                  const inset = b * 3;
                  return (
                    <Rect
                      key={`r${i}-${b}`}
                      x={s.x + inset}
                      y={y}
                      width={Math.max(2, stoneW - inset * 2)}
                      height={4}
                      fill={palette.stoneRoad}
                      opacity={0.26 - b * 0.055}
                    />
                  );
                }),
              )
            : null}

          {stones.map((s, i) => (
            <G key={`s${i}`}>
              <Rect
                x={s.x}
                y={s.y}
                width={stoneW}
                height={s.h}
                rx={2}
                fill={palette.stoneRoad}
              />
              <Rect x={s.x} y={s.y} width={stoneW} height={s.h} rx={2} fill="url(#chartFace)" />
              {/* The cut and the light on its near edge — the pairing that
                  keeps a slab from reading as printed. Drop the lip and the
                  stone flattens into wallpaper. */}
              <G transform={`translate(${s.x}, ${s.y})`} opacity={0.42}>
                <Path
                  d={marksPath(s.needle.road.title, stoneW, s.h)}
                  transform="translate(0 1)"
                  stroke={palette.stoneRoadLip}
                  strokeWidth={1.3}
                  fill="none"
                />
                <Path
                  d={marksPath(s.needle.road.title, stoneW, s.h)}
                  stroke={palette.stoneRoadCarve}
                  strokeWidth={1.3}
                  fill="none"
                />
              </G>
              <Rect
                x={s.x}
                y={s.y}
                width={stoneW}
                height={1.4}
                fill={palette.stoneRoadLip}
                opacity={0.75}
              />
              {/* Moss at the foot, where the water reaches it. */}
              <Rect
                x={s.x}
                y={WL - 4}
                width={stoneW}
                height={4}
                fill={palette.moss}
                opacity={0.3}
              />

              {/* The lamp: an island is at sea under this pillar.

                  One warmth for the whole chart, never a lens colour — the
                  same law the settings archipelago's lamplight holds. The
                  pool is built from falling shells rather than two rounded
                  blocks: at two it read as a lozenge of soap sitting on the
                  water with a dot on top, because a rectangle at a quarter
                  opacity still has edges and light does not.

                  The halo only arrives with the dark, because paper catches
                  nothing. The lamp itself stays at every level, because it
                  is the whole status system and not a mood. */}
              {s.lit ? (
                <G>
                  {wet
                    ? SHELLS.map((sh, k) => (
                        <Rect
                          key={`l${k}`}
                          x={s.cx - sh.w / 2}
                          y={WL - sh.h * 0.3}
                          width={sh.w}
                          height={sh.h}
                          rx={sh.h / 2}
                          fill={palette.warn}
                          opacity={sh.o}
                        />
                      ))
                    : null}
                  <Rect
                    x={s.cx - 3.5}
                    y={WL - 7}
                    width={7}
                    height={7}
                    rx={3.5}
                    fill={palette.warn}
                  />
                </G>
              ) : null}
            </G>
          ))}

          {/* The offer: a pillar not yet raised. Shorter than a standing
              stone, because it has nothing astern of it yet. */}
          {canAdd ? (
            <Rect
              x={colW * (needles.length + 0.5) - stoneW / 2}
              y={WL - stoneHeight(0) * 0.62}
              width={stoneW}
              height={stoneHeight(0) * 0.62}
              rx={2}
              fill="none"
              stroke={palette.line}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
          ) : null}

          {/* The Sunny's own swell, running as hard as the day has — and
              nothing at all when it is not running. At anchor `SWELL[0]` is
              zero, and `swellPath` at zero amplitude draws a dead straight
              line twelve points under the horizon: a second horizon, which
              reads as a rendering fault rather than as a calm sea. The
              horizon is the whole sea on a still day. */}
          {swell > 0 ? (
            <Path
              d={swellPath(WL + 12, 1.9 * swell, 36, false, -20, w + 20)}
              fill="none"
              stroke={palette.inkFaint}
              strokeWidth={1.1}
              strokeLinecap="round"
              opacity={0.45}
            />
          ) : null}
          {swell > 0 ? (
            <Path
              d={swellPath(WL + 27, 2.7 * swell, 27, true, -20, w + 20)}
              fill="none"
              stroke={palette.inkFaint}
              strokeWidth={1.2}
              strokeLinecap="round"
              opacity={0.28}
            />
          ) : null}
        </Svg>
      </View>

      {/* The targets, laid over the drawing. A whole column each, because a
          fifty-point slab is a fiddly thing to hit and the water beside it
          means the same pillar. No text: the rows underneath carry that. */}
      <View style={styles.columns}>
        {needles.map((needle) => (
          <Pressable
            key={needle.road.id}
            onPress={() => onStone(needle.road.id)}
            accessibilityRole="button"
            accessibilityLabel={
              needle.next
                ? `${needle.road.title}. At sea: ${needle.next.title}.`
                : `${needle.road.title}. Nothing at sea.`
            }
            style={({ pressed }) => [styles.col, pressed && styles.pressed]}
          />
        ))}
        {canAdd ? (
          <Pressable
            onPress={onRaise}
            accessibilityRole="button"
            accessibilityLabel={t.roadAdd}
            style={({ pressed }) => [styles.col, pressed && styles.pressed]}
          >
            <Text style={styles.plus}>+</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/**
 * One pillar, as a row.
 *
 * The words the drawing above deliberately does not carry: what the pillar
 * is, and what is at sea under it right now. A row rather than a card — the
 * complaint that started this rework was cards everywhere, and four of them
 * down a screen is four paragraphs whether or not they have borders.
 *
 * The miniature at the left is the same stone at the same relative height, so
 * a row and the thing standing above it pair without either being numbered.
 * It is the only place what-is-astern appears twice, and it is a height both
 * times, never a score.
 */
export function PillarRow({ needle, onPress }: { needle: Needle; onPress: () => void }) {
  const { palette, plainMode, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const tall = stoneHeight(needle.reached) / stoneHeight(MAX_ISLANDS);
  // An untouched pillar shows its offer, never its absence.
  const sub = needle.next ? needle.next.title : t.islandAdd;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${needle.road.title}. ${sub}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {plainMode ? null : (
        <View style={styles.mini}>
          <View style={[styles.miniStone, { height: `${Math.round(tall * 100)}%` }]} />
        </View>
      )}
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {needle.road.title}
        </Text>
        <View style={styles.rowMeta}>
          {/* The lamp again, at row scale. Lit exactly when the chart's is,
              so the two can never disagree about what is at sea. */}
          {needle.next ? <View style={styles.lamp} /> : null}
          <Text style={[styles.rowSub, !needle.next && styles.rowOffer]} numberOfLines={1}>
            {sub}
          </Text>
        </View>
      </View>
      {/* What is astern, counted, with nothing beside it. A journey has no
          denominator, so there is no total here and never will be. */}
      {needle.reached > 0 ? <Text style={styles.astern}>{needle.reached}</Text> : null}
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    columns: {
      ...StyleSheet.absoluteFill,
      flexDirection: 'row',
      alignItems: 'flex-end',
    },
    col: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
    plus: { ...type.mono, fontSize: 15, color: c.inkFaint, marginBottom: H - WL + 14 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 52,
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    // The stone in miniature, bottom-aligned so its height is the read.
    mini: { width: 6, height: 30, justifyContent: 'flex-end' },
    miniStone: { width: 6, borderRadius: 1, backgroundColor: c.stoneRoad },
    rowText: { flex: 1, gap: 2 },
    rowTitle: { ...type.small, fontSize: 15, color: c.ink },
    rowMeta: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
    lamp: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.warn },
    rowSub: { ...type.mono, fontSize: 12, color: c.inkDim, flexShrink: 1 },
    rowOffer: { color: c.inkFaint },
    astern: { ...type.mono, fontSize: 12, color: c.inkFaint },
    chevron: { ...type.body, color: c.inkFaint, lineHeight: 20 },

    pressed: { ...press, borderRadius: radius.sm },
  });
