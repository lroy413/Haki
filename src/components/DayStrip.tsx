import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { useHaki } from '../state/HakiProvider';
import { BANDS, manifest, sunAt, watchAt, watchLine, watchName } from '../domain/watches';
import { bellAt, bellsInWatch, clockLabel, inOrder, type Bell } from '../domain/bells';
import { formatMinutes, type Task } from '../domain/tasks';
import { press } from '../theme/surfaces';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The day's shape, at the top of the home screen.
 *
 * A horizon with the sun where it actually is, the day cut into its three
 * watches, and what each one is carrying. It is the answer to "what does today
 * look like" — a question the app could not previously answer without opening
 * the Do tab and reading a list.
 *
 * **The sun moves and the ship does not**, and the difference is the whole
 * rule. The Sunny above this is at anchor because a ship travelling toward
 * somewhere is a progress bar in fancy dress; the sun is not progress, it is
 * the time, and a day where it is getting late is a fact rather than a
 * verdict. Nothing here fills up, and no watch ever turns a colour because it
 * has too much in it.
 *
 * Plain mode keeps the shape and loses the sky: the bands, the names and the
 * loads are the information, and the horizon is the performance.
 */
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
  const { palette, plainMode, t } = useHaki();
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

      {/* The sky. One line for the horizon, one mark for the sun, and the
          watch divisions cut through both — so the day reads as a span of
          time before it reads as three lists. */}
      {plainMode ? null : (
        <View style={styles.sky} accessibilityRole="image" accessibilityLabel="The day so far">
          <Svg viewBox="0 0 300 46" width="100%" height="100%" preserveAspectRatio="none">
            <Path
              d="M 6 40 Q 150 2 294 40"
              fill="none"
              stroke={palette.lineSoft}
              strokeWidth={1}
            />
            {BANDS.slice(1).map((band) => (
              <Line
                key={band.watch}
                x1={6 + band.from * 288}
                y1={8}
                x2={6 + band.from * 288}
                y2={42}
                stroke={palette.line}
                strokeWidth={1}
              />
            ))}
            <Line x1={0} y1={42} x2={300} y2={42} stroke={palette.line} strokeWidth={1} />
            {/* The bells, hanging where they actually fall. Drawn under the
                sun so a bell at noon never eclipses the time. */}
            {bells.map((b) => {
              const at = bellAt(b.at);
              if (at === null) return null;
              const x = 6 + at * 288;
              return (
                <G key={b.id}>
                  <Line x1={x} y1={26} x2={x} y2={42} stroke={palette.warn} strokeWidth={1.5} />
                  <Circle cx={x} cy={24} r={3.5} fill={palette.warn} />
                </G>
              );
            })}
            {sun === null ? null : (
              <G>
                <Circle
                  cx={6 + sun * 288}
                  cy={40 - Math.sin(sun * Math.PI) * 30}
                  r={9}
                  fill={palette.warnSoft}
                />
                <Circle
                  cx={6 + sun * 288}
                  cy={40 - Math.sin(sun * Math.PI) * 30}
                  r={4.5}
                  fill={palette.warn}
                />
              </G>
            )}
          </Svg>
        </View>
      )}

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
          These were two bare mono links floating on the ground below this
          card — "The week ›   The month ›" — with nothing around them, which
          read as leftover text rather than as controls. They belong to the
          thing they zoom out of, so they sit on its foot as a segmented row:
          the day is where you are, the other two are where you can go. */}
      <View style={styles.zoom}>
        <View style={styles.zoomHere}>
          <Text style={styles.zoomHereText}>{plainMode ? 'Today' : 'This day'}</Text>
        </View>
        {(['week', 'month'] as const).map((to) => (
          <Pressable
            key={to}
            onPress={() => onZoom(to)}
            accessibilityRole="button"
            accessibilityLabel={to === 'week' ? 'Chart the week' : 'The month'}
            style={({ pressed }) => [styles.zoomStep, pressed && styles.pressed]}
          >
            <Text style={styles.zoomStepText}>{to === 'week' ? 'Week' : 'Month'}</Text>
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

    sky: { height: 46, marginHorizontal: -space.xs },

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
      gap: space.xs,
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.sm,
      marginTop: space.sm,
    },
    // Where you are reads as a filled segment; the other two as steps you can
    // take. Same grammar as the day chips on the bells screen.
    zoomHere: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      backgroundColor: c.surface2,
    },
    zoomHereText: { ...type.mono, fontSize: 13, color: c.ink },
    zoomStep: {
      flex: 1,
      minHeight: 40,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    zoomStepText: { ...type.mono, fontSize: 13, color: c.inkDim },
    bellTitle: { ...type.body, fontSize: 16, color: c.ink, flexShrink: 1 },
    pressed: { ...press },
  });
