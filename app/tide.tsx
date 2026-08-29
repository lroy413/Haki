import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { actsBetween, earliestAct, entriesOn, getCourse, portsBetween } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { SectionLabel } from '../src/components/SectionLabel';
import { Rise } from '../src/components/Rise';
import { MoonMark } from '../src/components/instruments/MoonMark';
import {
  MOON_NAME,
  canGoBack,
  canGoOn,
  isThisMonth,
  monthGrid,
  monthLabel,
  monthLine,
  monthStart,
  shiftMonth,
  type TideDay,
} from '../src/domain/tide';
import { readBack } from '../src/domain/dayEnd';
import { NO_ACTS, type Acts, type HardeningLevel } from '../src/domain/hardening';
import { shortDay, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * How dark each level draws.
 *
 * Three steps that can be told apart at arm's length. It is the same figure
 * the week chart inks a bar with and the same law binds it: this is a shape,
 * never a score — no number is printed beside it, nothing is ranked by it, and
 * a level 3 day is not a better day than a level 1 one, only a fuller one.
 */
const INK: Record<HardeningLevel, number> = { 0: 0, 1: 0.3, 2: 0.58, 3: 0.9 };

/**
 * The Tide Calendar — a month, inked by what the days held.
 *
 * The strip shows today, Chart the Week shows the week, and this is the size
 * above both. It answers the one thing neither can: what the month has
 * actually been like — not as a number, as a shape.
 *
 * Read-only by construction. Nothing here creates anything and there is no way
 * to plan from it; the future is the week chart's job, because a week ahead is
 * something you can still act on and a month ahead is a calendar. Forward
 * stops at the month you are in.
 *
 * No total, no streak, nothing red. A calendar is where every other app grows
 * a streak counter, and thirty inked squares in a row is exactly the figure
 * this app refuses to turn into a score.
 */
export default function TideScreen() {
  const { db, settings } = useStore();
  const { palette, plainMode, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const today = todayKey();
  const [month, setMonth] = useState(() => monthStart(today));
  const [acts, setActs] = useState<{ day: string; acts: Acts }[]>([]);
  const [ports, setPorts] = useState<{ day: string; title: string }[]>([]);
  const [open, setOpen] = useState<TideDay | null>(null);
  /** Stepping months closes the read-back: it belongs to a day now off screen. */
  function step(by: number) {
    setOpen(null);
    setDetail(null);
    setMonth(shiftMonth(month, by));
  }
  // Where the calendar stops going back. Read once, because it cannot change
  // while the screen is up.
  const [first, setFirst] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ lines: string[]; heading: string | null } | null>(
    null,
  );

  const load = useCallback(async () => {
    // The grid pads out to whole weeks, so the query has to cover the padding
    // too or the neighbouring days would always read as empty.
    const from = shiftMonth(month, -1);
    const to = shiftMonth(month, 2);
    const [rows, portRows] = await Promise.all([
      actsBetween(db, from, to),
      portsBetween(db, from, to),
    ]);
    setActs(rows.map((r) => ({ day: r.day, acts: r })));
    setPorts(portRows);
  }, [db, month]);

  useEffect(() => {
    void earliestAct(db).then(setFirst);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const weeks = useMemo(
    () => monthGrid(month, today, acts as { day: string; acts: Acts }[], ports),
    [month, today, acts, ports],
  );
  const line = monthLine(weeks, plainMode);
  // The grid's ports, named. The squares say *that* one falls this month; a
  // port is the one mark here worth saying *which*, because an island is weeks
  // of work and its date arriving is a real event.
  const monthPorts = useMemo(() => {
    const days = new Set(
      weeks
        .flat()
        .filter((d) => d.inMonth)
        .map((d) => d.day),
    );
    return ports.filter((p) => days.has(p.day)).sort((a, b) => a.day.localeCompare(b.day));
  }, [weeks, ports]);

  /** Open one day: what it held, read back the way Day's End reads today. */
  async function look(day: TideDay) {
    if (!day.inMonth) return;
    if (open?.day === day.day) {
      setOpen(null);
      setDetail(null);
      return;
    }
    setOpen(day);
    setDetail(null);
    const found = acts.find((a) => a.day === day.day)?.acts ?? NO_ACTS;
    const [course, bodies] = await Promise.all([
      getCourse(db, day.day),
      entriesOn(db, day.day),
    ]);
    setDetail({
      lines: readBack(
        { ...found, entries: bodies.filter((b) => b.trim().length > 0).length },
        plainMode,
      ),
      heading: course?.heading ?? null,
    });
  }

  // Day one, or the first day anything was logged on if that is earlier — a
  // restore holds `setSailAt` back on purpose, so the setting alone would lock
  // an imported history out of the one screen built to look at it.
  const floor = (
    first && first < settings.setSailAt ? first : settings.setSailAt
  ) as typeof settings.setSailAt;
  const back = canGoBack(month, floor);
  const on = canGoOn(month, today);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: usableBottom(insets.bottom) + space.xxxl },
      ]}
    >
      <View style={styles.headBlock}>
        <View style={styles.head}>
          <Pressable
            onPress={() => back && step(-1)}
            disabled={!back}
            accessibilityRole="button"
            accessibilityLabel="The month before"
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            {/* Absent rather than faded when it cannot move. A quarter-opacity
              chevron measures well under the app's contrast floor, and a mark
              you cannot quite see is worse than no mark: the box keeps its
              44 points either way, so nothing shifts. */}
            {back ? <Text style={styles.stepText}>‹</Text> : null}
          </Pressable>
          <Text style={styles.month}>{monthLabel(month, today)}</Text>
          <Pressable
            onPress={() => on && step(1)}
            disabled={!on}
            accessibilityRole="button"
            accessibilityLabel="The month after"
            style={({ pressed }) => [styles.step, pressed && styles.pressed]}
          >
            {on ? <Text style={styles.stepText}>›</Text> : null}
          </Pressable>
        </View>

        {/* A way home from three months back. Only there when you have walked
          off, because a control that does nothing is furniture. */}
        {!isThisMonth(month, today) ? (
          <Pressable
            onPress={() => {
              setOpen(null);
              setDetail(null);
              setMonth(monthStart(today));
            }}
            accessibilityRole="button"
            accessibilityLabel={t.tideNow}
            style={({ pressed }) => [styles.now, pressed && styles.pressed]}
          >
            <Text style={styles.nowText}>{t.tideNow}</Text>
          </Pressable>
        ) : null}
      </View>

      <Rise>
        <View style={styles.grid}>
          <View style={styles.row}>
            {LETTERS.map((letter, i) => (
              <Text key={`${letter}-${i}`} style={styles.letter}>
                {letter}
              </Text>
            ))}
          </View>
          {weeks.map((week) => (
            <View key={week[0].day} style={styles.row}>
              {week.map((day) => (
                <Pressable
                  key={day.day}
                  onPress={() => void look(day)}
                  disabled={!day.inMonth}
                  accessibilityRole="button"
                  accessibilityLabel={`${shortDay(day.day, today)}${day.moon ? `, ${MOON_NAME[day.moon]}` : ''}`}
                  style={({ pressed }) => [
                    styles.cell,
                    // The chosen day is ringed around the whole cell, not
                    // inside the square: an ink ring on an ink-filled square
                    // is invisible, and the fullest days are exactly the ones
                    // worth opening. The ring is always drawn — in the ground
                    // colour until it is wanted — so nothing shifts.
                    open?.day === day.day && styles.picked,
                    pressed && day.inMonth && styles.pressed,
                  ]}
                >
                  <View
                    style={[
                      styles.square,
                      // Opacity carries the level, and the three steps have to
                      // be told apart across the room — the first cut ran
                      // 0.46/0.70/0.94 and a busy day was indistinguishable
                      // from a full one. A padding day keeps its box and half
                      // its ink: dropping the box left five holes in the top
                      // row, which is exactly what padding the grid out to
                      // whole weeks was for.
                      day.level > 0 && {
                        backgroundColor: palette.ink,
                        opacity: INK[day.level] * (day.inMonth ? 1 : 0.5),
                      },
                      day.standing === 'today' && styles.today,
                    ]}
                  />
                  {/* Ranked by colour rather than by opacity: this month's
                      dates are ink, the padding days are faint, and neither
                      goes under the floor. */}
                  <Text style={[styles.date, !day.inMonth && styles.outside]}>{day.date}</Text>
                  {/* Two marks, and neither is a count: a port that falls here,
                    and the four phases the month has a rhythm around. */}
                  <View style={styles.marks}>
                    {day.port ? <Text style={styles.port}>◆</Text> : null}
                    {day.moon && !plainMode ? (
                      <MoonMark mark={day.moon} size={11} tint={palette.inkDim} />
                    ) : null}
                  </View>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </Rise>

      {line ? (
        <Rise delay={40}>
          <Text style={styles.line}>{line}</Text>
        </Rise>
      ) : null}

      {monthPorts.length > 0 ? (
        <Rise delay={80}>
          <View style={styles.group}>
            <SectionLabel label={t.tidePorts} trailing={plainMode ? undefined : '寄港'} />
            {monthPorts.map((port) => (
              <View key={`${port.day}-${port.title}`} style={styles.portRow}>
                <Text style={styles.when}>{shortDay(port.day, today)}</Text>
                <Text style={styles.portTitle}>{port.title}</Text>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}

      {open ? (
        <View style={styles.group}>
          <SectionLabel label={shortDay(open.day, today)} />
          <View style={styles.card}>
            {open.moon ? <Text style={styles.detailMoon}>{MOON_NAME[open.moon]}</Text> : null}
            {detail?.heading ? <Text style={styles.heading}>{detail.heading}</Text> : null}
            {detail && detail.lines.length > 0 ? (
              detail.lines.map((l) => (
                <Text key={l} style={styles.fact}>
                  {l}
                </Text>
              ))
            ) : (
              <Text style={styles.empty}>{t.tideEmptyDay}</Text>
            )}
          </View>
        </View>
      ) : (
        <Text style={styles.hint}>{t.tideHint}</Text>
      )}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    headBlock: { gap: space.xs },
    head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    month: { ...type.title, color: c.ink },
    step: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
    stepText: { ...type.title, color: c.inkDim },

    now: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.xs },
    nowText: { ...type.mono, fontSize: 13, color: c.violet },

    grid: { gap: space.xs },
    row: { flexDirection: 'row', gap: space.xs },
    letter: { ...type.mono, fontSize: 12, color: c.inkFaint, flex: 1, textAlign: 'center' },
    cell: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
      minHeight: 44,
      padding: 2,
      borderWidth: 1,
      borderColor: c.bg,
      borderRadius: radius.md,
    },
    picked: { borderColor: c.violet },
    square: {
      width: '100%',
      height: 26,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.lineSoft,
    },
    today: { borderColor: c.violet, borderWidth: 2 },
    date: { ...type.mono, fontSize: 12, color: c.inkDim },
    outside: { color: c.inkFaint },
    marks: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 12 },
    // `warn`, like every other date in the app.
    port: { ...type.mono, fontSize: 12, color: c.warn, lineHeight: 12 },

    portRow: {
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
    portTitle: { ...type.body, color: c.ink, flex: 1 },

    line: { ...type.body, color: c.ink, lineHeight: 25 },
    hint: { ...type.small, color: c.inkFaint, lineHeight: 21 },
    group: { gap: space.sm },
    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
      gap: space.xs,
    },
    detailMoon: { ...type.mono, fontSize: 12, color: c.inkFaint },
    heading: { ...type.body, color: c.ink, lineHeight: 25 },
    fact: { ...type.body, color: c.inkDim, lineHeight: 25 },
    empty: { ...type.body, color: c.inkDim, lineHeight: 25 },
    pressed: { ...press },
  });
