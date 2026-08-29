import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path } from 'react-native-svg';
import { useHaki } from '../state/HakiProvider';
import { BANDS, manifest, sunAt, watchAt, watchLine, watchName } from '../domain/watches';
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
  onOpen,
}: {
  tasks: Task[];
  onOpen: (watch: string) => void;
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
          </Pressable>
        ))}
      </View>

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
      justifyContent: 'center',
    },
    // Where the day currently is. A ground, never a colour that says a watch
    // is behind or ahead of anything.
    bandHere: { backgroundColor: c.surface2 },
    bandName: { ...type.label, fontSize: 11, color: c.inkFaint },
    bandNameHere: { color: c.ink },
    bandLine: { ...type.small, color: c.inkDim },
    bandMinutes: { ...type.mono, fontSize: 11, color: c.inkFaint },

    hold: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.sm,
      marginTop: 2,
      minHeight: 44,
    },
    holdLabel: { ...type.label, color: c.inkFaint },
    holdCount: { ...type.mono, color: c.inkDim },
    pressed: { ...press },
  });
