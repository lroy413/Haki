import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { actsBetween, allTasks, bellsBetween, portsBetween } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { WeekChart } from '../src/components/WeekChart';
import { SectionLabel } from '../src/components/SectionLabel';
import { Rise } from '../src/components/Rise';
import {
  aheadLine,
  asternLine,
  cargoLine,
  chartWeek,
  hasCargo,
  weekDays,
  weekLabel,
  type DayShape,
} from '../src/domain/week';
import { formatMinutes, isDone } from '../src/domain/tasks';
import { shortDay, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Chart the Week — the forward half of Setting Sail.
 *
 * The ritual reads the week *behind* and asks for a heading. There was never
 * anywhere to see the week **in front of you**, which is the half you can still
 * do something about — so this is that half, and it is reachable all week
 * rather than once at the ritual.
 *
 * The picture is one rule: ink behind, outlines ahead. Under it, the days that
 * are carrying something, in order, with what they carry. The drawing shows
 * the shape and the rows carry the words — the chart table's rule, at week
 * scale.
 *
 * No total, no capacity, nothing red. Setting Sail is the one screen in this
 * app allowed to put a denominator on a week, and it earns that by saying it
 * once in the ritual; a chart that repeated it every day would turn a bounded
 * honest count into a target.
 */
export default function WeekScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { palette, plainMode, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const today = todayKey();
  const [week, setWeek] = useState<DayShape[]>([]);
  const [ports, setPorts] = useState<{ day: string; title: string }[]>([]);

  const load = useCallback(async () => {
    const days = weekDays(today);
    const from = days[0];
    const to = days[6];
    const [acts, tasks, bells, portRows] = await Promise.all([
      actsBetween(db, from, to),
      allTasks(db),
      bellsBetween(db, from, to),
      portsBetween(db, from, to),
    ]);

    // What is placed on each day: committed and still open. Struck work is
    // already in the ink — counting it again as "placed" would draw the same
    // task twice on one column.
    const placed = days.map((day) => {
      const on = tasks.filter((task) => task.committedFor === day && !isDone(task));
      return {
        day,
        open: on.length,
        minutes: on.reduce((sum, task) => sum + task.minutes, 0),
      };
    });

    setPorts(portRows);
    setWeek(
      chartWeek(
        today,
        acts.map((a) => ({ day: a.day, acts: a })),
        placed,
        bells,
        portRows,
      ),
    );
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const carrying = week.filter(hasCargo);
  const ahead = aheadLine(week, plainMode);
  const astern = asternLine(week, plainMode);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: usableBottom(insets.bottom) + space.xxxl },
      ]}
    >
      <Rise>
        <View style={styles.card}>
          {/* Where in the week you are standing, which changes what the chart
              is mostly about: on Monday it is nearly all ahead of you. */}
          <Text style={styles.where}>{weekLabel(today, plainMode)}</Text>
          <WeekChart week={week} />
          {/* The legend, in words rather than swatches: what the two marks
              mean is the whole thing worth explaining about this picture. */}
          <Text style={styles.legend}>{t.weekLegend}</Text>
        </View>
      </Rise>

      <Rise delay={40}>
        <View style={styles.lines}>
          {ahead ? <Text style={styles.line}>{ahead}</Text> : null}
          {astern ? <Text style={styles.quiet}>{astern}</Text> : null}
        </View>
      </Rise>

      {carrying.length > 0 ? (
        <Rise delay={80}>
          <View style={styles.group}>
            <SectionLabel label={t.weekCargo} trailing={plainMode ? undefined : '積荷'} />
            {carrying.map((day) => (
              <View key={day.day} style={styles.row}>
                <Text style={[styles.when, day.standing === 'today' && styles.whenNow]}>
                  {day.standing === 'today' ? t.weekToday : shortDay(day.day, today)}
                </Text>
                <View style={styles.rowBody}>
                  <Text style={styles.cargo}>{cargoLine(day, plainMode)}</Text>
                  {day.openMinutes > 0 ? (
                    <Text style={styles.minutes}>{formatMinutes(day.openMinutes)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}

      {/* Ports fall on a day like anything else, but they are the one thing
          here worth naming rather than counting — an island is weeks of work
          and its date arriving is a real event. */}
      {ports.length > 0 ? (
        <Rise delay={120}>
          <View style={styles.group}>
            <SectionLabel label={t.weekPorts} trailing={plainMode ? undefined : '寄港'} />
            {ports.map((port) => (
              <View key={`${port.day}-${port.title}`} style={styles.row}>
                <Text style={styles.when}>{shortDay(port.day, today)}</Text>
                <Text style={styles.cargo}>{port.title}</Text>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}

      <Rise delay={160}>
        <Pressable
          onPress={() => router.push('/sail')}
          accessibilityRole="button"
          accessibilityLabel={t.sailTitle}
          style={({ pressed }) => [styles.door, pressed && styles.pressed]}
        >
          <Text style={styles.doorLabel}>{t.sailTitle}</Text>
          <Text style={styles.doorText}>{t.weekRitual}</Text>
        </Pressable>
      </Rise>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },
    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: space.sm,
    },
    where: { ...type.label, color: c.inkFaint },
    legend: { ...type.small, color: c.inkFaint, lineHeight: 18 },
    lines: { gap: space.xs },
    line: { ...type.body, fontSize: 19, color: c.ink, lineHeight: 24 },
    quiet: { ...type.small, color: c.inkDim, lineHeight: 19 },
    group: { gap: space.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    when: { ...type.mono, fontSize: 13, color: c.inkFaint, minWidth: 58 },
    whenNow: { color: c.ink },
    rowBody: { flex: 1, gap: 2 },
    cargo: { ...type.body, fontSize: 18, color: c.ink, flex: 1 },
    minutes: { ...type.mono, fontSize: 12, color: c.inkFaint },
    door: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: space.xs,
      minHeight: 44,
    },
    doorLabel: { ...type.label, color: c.violet },
    doorText: { ...type.body, color: c.inkDim, lineHeight: 22 },
    pressed: { ...press },
  });
