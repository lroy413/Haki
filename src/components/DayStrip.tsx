import { useMemo } from 'react';
import { StyleSheet, Pressable, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { useHaki } from '../state/HakiProvider';
import { Sea, WATERLINE } from './instruments/Sea';
import { Sunny } from './instruments/Sunny';
import { seaState } from '../domain/practice';
import { BANDS, manifest, sunAt, watchAt, watchLine, watchName } from '../domain/watches';
import { bellAt, bellsInWatch, clockLabel, inOrder, type Bell } from '../domain/bells';
import { formatMinutes, type Task } from '../domain/tasks';
import { press } from '../theme/surfaces';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The day's shape, at the top of the home screen.
 *
 * One scene: the Sunny on the water, the sun where it actually is above her,
 * the day cut into its three watches, and what each one is carrying. It is the
 * answer to "what does today look like" — a question the app could not
 * previously answer without opening the Do tab and reading a list.
 *
 * **There is one horizon.** The ship used to sail in its own band directly
 * above this card, on its own sea, over a second horizon drawn as this strip's
 * baseline — two waterlines forty points apart on the same screen, which is
 * not a picture of anything. The owner: *"makes no sense to have an ocean with
 * a ship and then under it the horizon."* So the sea is the baseline now, the
 * ship is small and sits on it, and the whole thing costs about forty points
 * less than the two of them did.
 *
 * **The sun moves and the ship does not**, and the difference survived the
 * merge because it is the whole rule. The Sunny is at anchor and then under
 * way — a state, never a position. A ship travelling along the strip toward
 * evening would be a progress bar in fancy dress, and `domain/hardening.ts`
 * forbids that for good reasons. What she gained is a direction: she faces the
 * way the day runs, which is a heading rather than a journey. Nothing here
 * fills up, and no watch ever turns a colour because it has too much in it.
 *
 * Plain mode keeps the ship and loses the sky. The ship is the app's own
 * picture of the day rather than an effect — it survived the band it used to
 * live in — but the sun, the arc and the bell marks are a performance, and
 * plain mode is the switch that stops the app performing.
 */
/**
 * The scene's geometry, in the chart SVG's own units — which are pixels,
 * because the chart stretches (`preserveAspectRatio="none"`) and its viewBox
 * height is `SKY_H`.
 *
 * `HULL_H` is the whole trick. `Sunny` and `Sea` both draw a 200 × 72 box
 * anchored bottom-centre with `meet`, so on a band far wider than that aspect
 * the *height* they are given is what sets their scale — and a ship a third of
 * the card wide is exactly what shrinking her means. Their shared waterline
 * sits at `WATERLINE` of 72, so with the layer's bottom on the container's the
 * water lands `HULL_H * (1 - WATERLINE / 72)` up from the foot. `WATER_Y` is
 * that number, and the chart draws to it.
 */
const SKY_H = 84;
const HULL_H = 30;
const WATER_Y = SKY_H - HULL_H * (1 - WATERLINE / 72);
/**
 * How high the sun climbs above the waterline at noon.
 *
 * Tuned against the masts, not chosen: the ship's box starts at
 * `SKY_H - HULL_H`, the sun crosses her between about a third and two thirds
 * of the day, and a nine-unit halo has to clear the topmasts through all of
 * it. The first cut arced to 34 and the afternoon sun sat in her rigging.
 */
const ARC = 42;

export function DayStrip({
  tasks,
  bells,
  onOpen,
  onBells,
  onZoom,
}: {
  tasks: Task[];
  bells: Bell[];
  onOpen: (watch: string) => void;
  onBells: () => void;
  /** Up one size, and up two. See the note on the zoom row below. */
  onZoom: (to: 'week' | 'month') => void;
}) {
  const { palette, plainMode, hardening, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const now = new Date();
  const day = useMemo(() => manifest(tasks), [tasks]);
  const here = watchAt(now.getHours());
  const sun = plainMode ? null : sunAt(now.getHours(), now.getMinutes());

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>{t.dayStripLabel}</Text>
        <Text style={styles.total}>
          {day.minutes > 0
            ? formatMinutes(day.minutes)
            : plainMode
              ? 'Nothing yet'
              : 'Open water'}
        </Text>
      </View>

      {/* The scene. Three layers in one coordinate system: the chart (the
          sun's arc, the watch divisions, the bells), then the water, then the
          ship on it. Stacked rather than merged, so redrawing any one of the
          three never touches the other two — the same seam `SeaBand` used to
          keep, moved down one card. */}
      <View
        style={[styles.sky, plainMode && styles.skyPlain]}
        accessibilityRole="image"
        accessibilityLabel={
          plainMode ? undefined : `The Thousand Sunny, ${seaState(hardening).toLowerCase()}`
        }
        // Plain mode keeps the ship — it is the app's own picture of the day,
        // not an effect — but stops narrating a metaphor nobody asked for.
        importantForAccessibility={plainMode ? 'no-hide-descendants' : 'yes'}
      >
        {plainMode ? null : (
          <Svg
            viewBox={`0 0 300 ${SKY_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            {/* The sun's path. It ends at the waterline at both ends, because
                that is where a sun goes. */}
            <Path
              d={`M 6 ${WATER_Y} Q 150 ${WATER_Y - ARC * 2} 294 ${WATER_Y}`}
              fill="none"
              stroke={palette.lineSoft}
              strokeWidth={1}
            />
            {BANDS.slice(1).map((band) => (
              <Line
                key={band.watch}
                x1={6 + band.from * 288}
                y1={10}
                x2={6 + band.from * 288}
                y2={WATER_Y}
                stroke={palette.line}
                strokeWidth={1}
              />
            ))}
            {/* No baseline: the sea draws the horizon now, and at level 0 it
                is the same single flat line this used to stroke. */}
            {/* The bells, marked on the water where they actually fall — a
                short tick rather than the hanging stem and lamp this used to
                draw. That version stood twenty-four units tall through the
                middle of the strip, which is exactly where the ship now sits:
                a warn-coloured disc landed on her topmast and read as a second
                sun in her rigging. A mark on the waterline cannot, and where
                she crosses one she simply passes in front of it. */}
            {bells.map((b) => {
              const at = bellAt(b.at);
              if (at === null) return null;
              const x = 6 + at * 288;
              return (
                <Line
                  key={b.id}
                  x1={x}
                  y1={WATER_Y - 9}
                  x2={x}
                  y2={WATER_Y + 1}
                  stroke={palette.warn}
                  strokeWidth={2}
                  strokeLinecap="round"
                />
              );
            })}
            {sun === null ? null : (
              <G>
                <Circle
                  cx={6 + sun * 288}
                  cy={WATER_Y - Math.sin(sun * Math.PI) * ARC}
                  r={9}
                  fill={palette.warnSoft}
                />
                <Circle
                  cx={6 + sun * 288}
                  cy={WATER_Y - Math.sin(sun * Math.PI) * ARC}
                  r={4.5}
                  fill={palette.warn}
                />
              </G>
            )}
          </Svg>
        )}

        {/* Water and ship, bottom-anchored so their shared waterline lands on
            the chart's. Mirrored as a pair rather than singly: the wake in
            `Sea.tsx` trails from the stern, so flipping the ship alone would
            put her wake in front of her. */}
        <View style={styles.hull}>
          <View style={StyleSheet.absoluteFill}>
            <Sea level={hardening} colour={palette.inkFaint} />
          </View>
          <View style={StyleSheet.absoluteFill}>
            <Sunny
              level={hardening}
              ink={palette.ink}
              faint={palette.inkFaint}
              flag={palette.crimson}
            />
          </View>
        </View>
      </View>

      {/* The three watches. Each is a door into its own group on the Do tab. */}
      <View style={styles.bands}>
        {day.watches.map((cargo) => (
          <Pressable
            key={cargo.watch}
            onPress={() => onOpen(cargo.watch)}
            accessibilityRole="button"
            accessibilityLabel={`${watchName(cargo.watch, plainMode)}, ${watchLine(cargo, plainMode)}`}
            style={({ pressed }) => [
              styles.band,
              cargo.watch === here && styles.bandHere,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.bandName, cargo.watch === here && styles.bandNameHere]}>
              {plainMode
                ? watchName(cargo.watch, true)
                : watchName(cargo.watch, false).split(' ')[0]}
            </Text>
            <Text style={styles.bandLine}>{watchLine(cargo, plainMode)}</Text>
            {/* Minutes are a fact, never a capacity: no bar, no ceiling. */}
            {cargo.minutes > 0 ? (
              <Text style={styles.bandMinutes}>{formatMinutes(cargo.minutes)}</Text>
            ) : null}
            {/* A bell is a fixed point, so it is named rather than counted. */}
            {bellsInWatch(bells, cargo.watch).map((b) => (
              <Text key={b.id} style={styles.bell} numberOfLines={1}>
                {clockLabel(b.at)} {b.title}
              </Text>
            ))}
          </Pressable>
        ))}
      </View>

      {/* The bells' own door. Present whether or not any are hung, because
          the day cannot tell the truth about a Tuesday until it knows about
          the dentist — and there has to be somewhere to say so. */}
      <Pressable
        onPress={onBells}
        accessibilityRole="button"
        accessibilityLabel={plainMode ? 'Appointments' : 'The bells'}
        style={({ pressed }) => [styles.hold, pressed && styles.pressed]}
      >
        {/* The next bell by name, not just by time. This row used to read
            "THE BELLS  15:00" and nothing else, so a bell you had just made
            was a number in 12pt mono with no way to tell it from any other
            bell — "I made a Bell and I don't know where it went". */}
        <Text style={styles.holdLabel}>{plainMode ? 'Appointments' : 'The bells'}</Text>
        {bells.length > 0 ? (
          <View style={styles.bellNext}>
            <Text style={styles.bellTitle} numberOfLines={1}>
              {inOrder(bells)[0].title}
            </Text>
            <Text style={styles.holdCount}>{clockLabel(inOrder(bells)[0].at)}</Text>
          </View>
        ) : (
          <Text style={styles.holdCount}>+</Text>
        )}
      </Pressable>

      {/* The hold. Not a backlog and not a failure to plan — the ordinary
          place for a thing you have not decided the hour of. */}
      {day.hold.length > 0 ? (
        <Pressable
          onPress={() => onOpen('hold')}
          accessibilityRole="button"
          accessibilityLabel={`${plainMode ? 'Unplaced' : 'In the hold'}, ${day.hold.length}`}
          style={({ pressed }) => [styles.hold, pressed && styles.pressed]}
        >
          <Text style={styles.holdLabel}>{plainMode ? 'Unplaced' : 'In the hold'}</Text>
          <Text style={styles.holdCount}>{day.hold.length}</Text>
        </Pressable>
      ) : null}

      {/* Up a size, and up two.
          Two goes at this now, and both failed the same way. First they were
          bare mono links floating on the ground under the card — "The week ›
          The month ›" — with nothing around them, which read as leftover
          text. Then they were a three-cell segmented row on the card's foot,
          with "This day" filled as the current position: *"the week and
          month buttons look weird and insignificant."* Both true. A segment
          you cannot press is a tab bar with a dead tab in it, and one word in
          an outlined box is not a place.
          They are destinations, so they are named as destinations, they carry
          the chevron every other door in the app carries, and they wear the
          screen's own light. The day is not one of them: you are standing on
          it. */}
      <View style={styles.zoom}>
        {(['week', 'month'] as const).map((to) => (
          <Pressable
            key={to}
            onPress={() => onZoom(to)}
            accessibilityRole="button"
            accessibilityLabel={to === 'week' ? 'Chart the week' : 'The tide calendar'}
            style={({ pressed }) => [styles.zoomStep, pressed && styles.pressed]}
          >
            <Text style={styles.zoomStepText} numberOfLines={1}>
              {to === 'week'
                ? plainMode
                  ? 'This week'
                  : 'The week'
                : plainMode
                  ? 'This month'
                  : 'The tide'}
            </Text>
            <Text style={styles.zoomGo}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.sm,
    },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    label: { ...type.label, color: c.inkFaint },
    total: { ...type.mono, color: c.inkDim },

    // `overflow` matters: the sea deliberately draws past both ends of its
    // viewBox so it reaches the edge of any band, and without a clip it would
    // run out over the card's border and onto the screen.
    sky: { height: SKY_H, marginHorizontal: -space.xs, overflow: 'hidden' },
    // Plain mode draws no sky, so it should not reserve one: without this the
    // ship sat at the foot of fifty points of nothing.
    skyPlain: { height: HULL_H },
    hull: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      height: HULL_H,
      // She faces the way the day runs. The drawing faces left by contract
      // (see `Sunny.tsx`), and the sun travels left to right, so a ship
      // pointing into the morning reads as sailing against the day. This is a
      // heading, not a journey: she still never moves along the strip.
      transform: [{ scaleX: -1 }],
    },

    bands: { flexDirection: 'row', gap: space.xs },
    band: {
      flex: 1,
      borderRadius: radius.sm,
      paddingVertical: space.sm,
      paddingHorizontal: space.xs,
      gap: 2,
      // A watch is a target you tap, so it carries its own floor.
      minHeight: 62,
      // Top-aligned, not centred: three bands carrying different amounts
      // centre their contents at three different heights, and the names stop
      // reading as one row.
      justifyContent: 'flex-start',
    },
    // Where the day currently is. A ground, never a colour that says a watch
    // is behind or ahead of anything.
    bandHere: { backgroundColor: c.surface2 },
    bandName: { ...type.label, fontSize: 12, color: c.inkFaint },
    bandNameHere: { color: c.ink },
    bandLine: { ...type.small, color: c.inkDim },
    bandMinutes: { ...type.mono, fontSize: 12, color: c.inkFaint },
    // Lamplight, like every other fixed mark on a chart in this app.
    bell: { ...type.mono, fontSize: 12, color: c.warn, marginTop: 1 },

    hold: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: space.md,
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.sm,
      marginTop: 2,
      minHeight: 44,
    },
    holdLabel: { ...type.label, color: c.inkFaint },
    holdCount: { ...type.mono, color: c.inkDim },
    bellNext: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm, flexShrink: 1 },

    zoom: {
      flexDirection: 'row',
      gap: space.sm,
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.sm,
      marginTop: space.sm,
    },
    // A door, not a tab. 44 because it is one of the things on this screen
    // most likely to be tapped one-handed.
    zoomStep: {
      flex: 1,
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: space.sm,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    // Cyan without a prop, like `CourseLine` next to it: this card stands on
    // the home screen and nowhere else, and cyan is the day's own light.
    zoomStepText: { ...type.mono, fontSize: 13, color: c.cyan },
    zoomGo: { ...type.mono, fontSize: 13, color: c.cyan },
    bellTitle: { ...type.body, fontSize: 16, color: c.ink, flexShrink: 1 },
    pressed: { ...press },
  });
