import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { type DayShape } from '../domain/week';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The week as seven columns.
 *
 * One rule carries the whole drawing: **ink behind, outlines ahead.** A day
 * that has happened is a solid block at the darkness it earned; a day that has
 * not is a dashed outline holding whatever is placed on it. They are different
 * kinds of fact and they never share a channel — a bar meaning "used" on
 * Monday and "planned" on Friday is a chart you cannot read, and one that
 * quietly counts intentions as work.
 *
 * That grammar is already in the app: the rhythm's standing offers are dashed
 * and unfilled because they are not in the database. Same idea, one size up.
 *
 * Today is drawn as both, because it is both — what it has earned so far, with
 * what is still placed on it outlined above.
 *
 * There is no capacity line and nothing goes red. The app does not know how
 * much you can do, and a light day is a fact about a day.
 */
export function WeekChart({ week }: { week: DayShape[] }) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  /*
   * Two scales, because the two marks are not the same unit.
   *
   * Ink is absolute: a day's level runs 0–3 and a full column means the day
   * came out black. That reading has to mean the same thing in every week, or
   * a quiet week would draw its best day as tall as a heavy week's.
   *
   * Outlines are relative to this week's busiest day, because there is no
   * absolute maximum to scale against — the app has no capacity and will not
   * invent one. Putting both on one scale, as the first cut did, made
   * Wednesday's plans draw twice as tall as Monday's work: intentions
   * flattered into looking bigger than what actually happened.
   */
  const busiest = Math.max(1, ...week.map(cargoWeight));

  return (
    <View style={styles.chart}>
      {week.map((day) => {
        const inked = day.level / MAX_LEVEL;
        // Never past the top of the column: today carries both marks, and it
        // is the one that would otherwise clip.
        const placed = Math.min(cargoWeight(day) / busiest, 1 - inked);
        return (
          <View key={day.day} style={styles.column}>
            {/*
              Explicit heights, anchored to the bottom. The first cut used
              `flexGrow`, which distributes *free* space rather than setting a
              size — every column came out the same height whatever the day
              had actually earned, which is a chart that cannot be read.
            */}
            <View style={styles.stack}>
              {/* Placed above earned: what is still to come sits on top of
                  what the day already holds, which is how a day fills. */}
              {day.standing !== 'astern' && placed > 0 ? (
                <View
                  style={[styles.placed, { height: `${Math.round(placed * 100)}%` }]}
                  accessibilityRole="image"
                  accessibilityLabel={`${day.open} placed`}
                />
              ) : null}
              {inked > 0 ? (
                <View
                  style={[
                    styles.inked,
                    { height: `${Math.round(inked * 100)}%`, opacity: 0.4 + day.level * 0.2 },
                  ]}
                />
              ) : null}
            </View>
            <Text style={[styles.letter, day.standing === 'today' && styles.today]}>
              {day.letter}
            </Text>
            <Text style={[styles.date, day.standing === 'today' && styles.today]}>
              {day.date}
            </Text>
          </View>
        );
      })}
      {plainMode ? null : <View style={styles.waterline} />}
    </View>
  );
}

/**
 * How much a day is carrying, on the same scale the ink uses.
 *
 * Deliberately coarse — one unit a task, capped. This is a silhouette of a
 * week, not a workload calculation, and a column that grew without limit would
 * turn one heavy Thursday into the only thing on the chart.
 */
function cargoWeight(day: DayShape): number {
  return day.open + day.bells + day.ports;
}

/** The darkest a day can come out. See `domain/hardening.ts`. */
const MAX_LEVEL = 3;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    chart: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space.xs,
      height: 120,
    },
    column: { flex: 1, alignItems: 'center', gap: 2, height: '100%' },
    // Bottom-anchored: the columns grow up off the waterline, which is what
    // makes them comparable at a glance.
    stack: { flex: 1, width: '100%', justifyContent: 'flex-end', gap: 2 },
    // Solid: this happened. Opacity carries the level, so a darker day reads
    // heavier without a second colour or a number beside it.
    inked: { backgroundColor: c.ink, borderRadius: radius.sm, minHeight: 4 },
    // Dashed and unfilled: placed, not done. The rhythm's offer grammar.
    placed: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.line,
      borderRadius: radius.sm,
      minHeight: 8,
    },
    letter: { ...type.mono, fontSize: 11, color: c.inkFaint, marginTop: 2 },
    date: { ...type.mono, fontSize: 11, color: c.inkFaint },
    today: { color: c.ink },
    waterline: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 32,
      height: 1,
      backgroundColor: c.lineSoft,
    },
  });
