import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import {
  actsBetween,
  getDream,
  lastSailing,
  listCarried,
  listPoneglyphs,
  listRoads,
  listSailings,
  setSail,
  listFlag,
  readPose,
} from '../src/db/repo';
import type { CarriedRow, SailingRow } from '../src/db/schema';
import {
  SAIL_EVERY_DAYS,
  headingPrompt,
  readWeek,
  sailedMessage,
  weekMessage,
  type WeekReading,
} from '../src/domain/sail';
import { logPose, needleLine, type LogPose } from '../src/domain/logpose';
import { flagAtSail, type Value } from '../src/domain/flag';
import { poseLine, type EternalPose } from '../src/domain/eternal';
import { addDays, shortDay, todayKey } from '../src/domain/date';
import { formatMinutes } from '../src/domain/tasks';
import { useHaki } from '../src/state/HakiProvider';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { font, radius, space, type } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import { press } from '../src/theme/surfaces';
import { row } from '../src/theme/surfaces';
import { SectionLabel } from '../src/components/SectionLabel';
import { returnsNote } from '../src/domain/voyage';
import { underCrew } from '../src/theme/palettes';
import type { Palette } from '../src/theme/palettes';

/**
 * Setting Sail — the weekly ritual.
 *
 * Three movements, and the order is the argument: read the week that happened,
 * look at every needle once, then say where the next one points. Reflection
 * before decision, and the decision made with the pillars actually in front of
 * you rather than from memory.
 *
 * **The only screen in this app that totals anything.** Everywhere else a
 * count would need a denominator it does not have — a journey has no total,
 * hardening has no score. A week is different: seven days is a real,
 * bounded, honest denominator, and "four of the seven days had something in
 * them" is a fact rather than a grade. The tone rules still bind: the top of
 * the range gets a question, never a trophy (`domain/sail.ts`).
 *
 * Inherited Will surfaces here and only here — the concept doc's rule, kept:
 * at the weekly ritual, never on a schedule, never on a failure screen. One
 * person, quietly, with nothing asked of you.
 */
export default function SailScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, palette, plainMode, crew, voyage: sailing } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const insets = useSafeAreaInsets();

  const [week, setWeek] = useState<WeekReading | null>(null);
  const [pose, setPose] = useState<LogPose | null>(null);
  const [previous, setPrevious] = useState<SailingRow | null>(null);
  const [past, setPast] = useState<SailingRow[]>([]);
  const [carried, setCarried] = useState<CarriedRow | null>(null);
  const [flag, setFlag] = useState<Value[]>([]);
  const [eternal, setEternal] = useState<EternalPose>({ held: null, carried: [] });

  const [heading, setHeading] = useState('');
  const [note, setNote] = useState('');
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    const today = todayKey();
    const from = addDays(today, -(SAIL_EVERY_DAYS - 1));
    const [days, dream, roads, glyphs, last, history, people, values, bearing] =
      await Promise.all([
        actsBetween(db, from, today),
        getDream(db),
        listRoads(db),
        listPoneglyphs(db),
        lastSailing(db),
        listSailings(db, 6),
        listCarried(db),
        listFlag(db),
        readPose(db),
      ]);
    setFlag(values);
    setEternal(bearing);

    const closedThisWeek = glyphs.filter((g) => g.closedOn && g.closedOn >= from);
    setWeek(
      readWeek(
        days,
        {
          reached: closedThisWeek.filter((g) => g.state === 'reached').length,
          passed: closedThisWeek.filter((g) => g.state === 'passed').length,
        },
        today,
      ),
    );
    setPose(logPose(dream?.text ?? null, roads, glyphs, today));
    setPrevious(last);
    setPast(history.filter((row) => row.day !== today));

    // One person, chosen by the day so it is the same one all week rather
    // than a shuffle every time the screen opens.
    if (people.length > 0) {
      const index = Number(today.replaceAll('-', '')) % people.length;
      setCarried(people[index]);
    }

    const todays = history.find((row) => row.day === today);
    if (todays) {
      setHeading(todays.heading);
      setNote(todays.note ?? '');
    } else if (last) {
      setNote('');
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const committing = useSingleFlight();
  async function save() {
    await committing(async () => {
      // The ritual answers the hand that finished it: the acknowledgement
      // lands with the tap, and the write follows down the slow channel.
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setDone(true);
      await setSail(db, heading, note || null);
      await load();
    });
  }

  if (!week || !pose) return <View style={styles.screen} />;

  const facts: { label: string; value: string }[] = [
    // Every label one or two words. "Days with something in them" is the
    // truer phrase and it wrapped to three lines, leaving its tile taller than
    // the two beside it — uneven cards in a row are a bug here. The sentence
    // above the tiles carries the full phrasing instead.
    { label: 'Days used', value: `${week.daysUsed}` },
    { label: plainMode ? 'Tasks done' : 'Struck', value: `${week.struck}` },
    { label: plainMode ? 'Meditations' : 'Days sat', value: `${week.daysSat}` },
    { label: plainMode ? 'Entries' : 'Logbook', value: `${week.entries}` },
    { label: plainMode ? 'Workouts' : 'Sessions', value: `${week.trained}` },
    { label: plainMode ? 'Focus' : 'In gear', value: formatMinutes(week.gearMinutes) },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ------------------------------------------------ the week behind */}
        <SectionLabel label={t.sailWeekLabel} />
        <Text style={styles.weekMessage}>{weekMessage(week)}</Text>

        <View style={styles.facts}>
          {facts.map((fact) => (
            <View key={fact.label} style={styles.fact}>
              <Text style={styles.factValue}>{fact.value}</Text>
              <Text style={styles.factLabel}>{fact.label}</Text>
            </View>
          ))}
        </View>

        {week.reached > 0 || week.passed > 0 ? (
          <Text style={styles.closed}>
            {[
              week.reached > 0
                ? `${week.reached} ${plainMode ? 'finished' : week.reached === 1 ? 'island reached' : 'islands reached'}`
                : null,
              week.passed > 0
                ? `${week.passed} ${plainMode ? 'set aside' : 'sailed past'}`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}

        {/* ---------------------------------------------------- returns */}
        {/* The arc, listed and left alone. No trend is asserted and the days
            away are totalled nowhere — every number here exists only because
            a gap ended. */}
        {sailing.returns.length > 0 ? (
          <>
            <SectionLabel
              label={plainMode ? 'Coming back' : 'The returns'}
              style={styles.spaced}
            />
            <View style={styles.returns}>
              {sailing.returns.slice(0, 5).map((r) => (
                <View key={r.day} style={styles.returnRow}>
                  <Text style={styles.returnDay}>{shortDay(r.day)}</Text>
                  {/* Signature violet under both flags — see CLAUDE.md.
                      The screen's palette is crew-coated, where `violet`
                      is jade under Zoro, so this takes the raw one. */}
                  <Text style={[styles.returnAfter, { color: palette.violet }]}>
                    {plainMode ? `after ${r.after} days` : `back after ${r.after} days`}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={styles.flagAsk}>{returnsNote(sailing.returns.length, plainMode)}</Text>
          </>
        ) : null}

        {previous?.heading ? (
          <View style={styles.lastHeading}>
            <Text style={styles.lastHeadingLabel}>
              {plainMode ? 'Last week you said' : 'Last week the heading was'}
            </Text>
            <Text style={styles.lastHeadingText}>{previous.heading}</Text>
          </View>
        ) : null}

        {/* ---------------------------------------------------- the needles */}
        {/* "Read the week, check the Flag, name the next island" — the
            concept doc's order, and the flag sits in the middle of it
            because it is what the needles get judged against. Read here,
            never asked: the ritual has enough decisions in it already. */}
        {flagAtSail(flag.length, plainMode) ? (
          <>
            <SectionLabel label={t.flagTitle} style={styles.spaced} />
            <Text style={styles.flagAsk}>{flagAtSail(flag.length, plainMode)}</Text>
            <View style={styles.flagList}>
              {flag.map((value) => (
                <Text key={value.id} style={styles.flagValue}>
                  {value.text}
                </Text>
              ))}
            </View>
          </>
        ) : null}

        {/* And the bearing that does not move. Read at the ritual and
            nowhere else in it — the whole point of an Eternal Pose is that
            it is the one thing the weekly read never has to decide about.
            Deliberately last before the needles: everything after this gets
            looked at with it in view. */}
        {eternal.held ? (
          <>
            <SectionLabel label={t.eternalTitle} style={styles.spaced} />
            <Text style={styles.flagValue}>{eternal.held.text}</Text>
            <Text style={styles.flagAsk}>{poseLine(eternal, todayKey(), plainMode)}</Text>
          </>
        ) : null}

        <SectionLabel label={t.sailNeedlesLabel} style={styles.spaced} />

        {pose.needles.length === 0 ? (
          <Pressable
            onPress={() => router.push('/conquerors')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.emptyNeedles, pressed && styles.pressed]}
          >
            <Text style={styles.emptyNeedlesText}>
              {plainMode
                ? 'No main goals set yet. Tap to set them.'
                : 'No Road Poneglyphs yet. Tap to name the first.'}
            </Text>
          </Pressable>
        ) : null}

        {/* Looked at once, deliberately. Drift survives on never being looked
            at, so this list is the treatment and not a summary. */}
        {pose.needles.map((needle) => (
          <View key={needle.road.id} style={styles.needle}>
            <Text style={styles.needleRoad}>{needle.road.title}</Text>
            {needle.next ? (
              <>
                <Text style={styles.needleIsland}>{needle.next.title}</Text>
                <Text style={styles.needleMeta}>{needleLine(needle, plainMode)}</Text>
              </>
            ) : (
              <Text style={styles.needleSpinning}>{needleLine(needle, plainMode)}</Text>
            )}
          </View>
        ))}

        {/* ---------------------------------------------------- the heading */}
        <SectionLabel label={t.sailHeadingLabel} style={styles.spaced} />
        <Text style={styles.prompt}>{headingPrompt(plainMode)}</Text>

        <TextInput
          value={heading}
          onChangeText={(next) => {
            setHeading(next);
            setDone(false);
          }}
          style={styles.input}
          placeholder={plainMode ? 'What this week is for.' : 'Where the week points.'}
          placeholderTextColor={palette.inkFaint}
          accessibilityLabel={t.sailHeadingLabel}
        />

        <TextInput
          value={note}
          onChangeText={(next) => {
            setNote(next);
            setDone(false);
          }}
          multiline
          style={[styles.input, styles.inputTall]}
          placeholder={t.sailNoteLabel}
          placeholderTextColor={palette.inkFaint}
          accessibilityLabel={t.sailNoteLabel}
        />

        <Pressable
          onPress={() => void save()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.filled, pressed && styles.pressed]}
        >
          <Text style={styles.filledText}>{t.sailSave}</Text>
        </Pressable>

        {done ? <Text style={styles.doneLine}>{sailedMessage(plainMode)}</Text> : null}

        {/* --------------------------------------------------- inherited will */}
        {carried ? (
          <Pressable
            onPress={() => router.push('/carried')}
            accessibilityRole="button"
            accessibilityLabel={`${t.carriedTitle}: ${carried.name}`}
            style={({ pressed }) => [styles.carried, pressed && styles.pressed]}
          >
            <Text style={styles.carriedLabel}>{t.sailCarriedLabel}</Text>
            <Text style={styles.carriedName}>{carried.name}</Text>
            {carried.whatICarry ? (
              <Text style={styles.carriedBody}>{carried.whatICarry}</Text>
            ) : carried.theirDream ? (
              <Text style={styles.carriedBody}>{carried.theirDream}</Text>
            ) : null}
          </Pressable>
        ) : null}

        {past.length > 0 ? (
          <>
            <SectionLabel label={t.sailPastLabel} style={styles.spaced} />
            {past.map((row) => (
              <View key={row.id} style={styles.pastRow}>
                <Text style={styles.pastDay}>{shortDay(row.day)}</Text>
                <Text style={styles.pastHeading}>{row.heading || '—'}</Text>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    sectionLabel: { ...type.label, color: c.inkFaint },
    spaced: { marginTop: space.lg },

    weekMessage: { ...type.body, color: c.ink, lineHeight: 23, marginBottom: space.xs },

    facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    fact: {
      // Three across on a phone, and the gaps subtract cleanly so the last
      // row never sits wider than the ones above it.
      ...row(c),
      width: '31.5%',
      paddingVertical: space.md,
      paddingHorizontal: space.sm,
      gap: 2,
      // A floor, so a longer label on one tile can never leave it taller than
      // its neighbours in the same row.
      minHeight: 74,
      justifyContent: 'center',
    },
    factValue: {
      fontFamily: font.display,
      fontSize: 24,
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    factLabel: { ...type.mono, fontSize: 12, color: c.inkFaint, lineHeight: 13 },
    closed: { ...type.mono, fontSize: 13, color: c.violet, marginTop: space.xs },

    lastHeading: {
      borderLeftWidth: 2,
      borderLeftColor: c.line,
      paddingLeft: space.md,
      marginTop: space.md,
      gap: 2,
    },
    lastHeadingLabel: { ...type.label, fontSize: 12, color: c.inkFaint },
    lastHeadingText: { ...type.body, color: c.inkDim, fontStyle: 'italic', lineHeight: 21 },

    flagAsk: { ...type.small, color: c.inkDim, lineHeight: 19 },

    // The returns read as a short ledger rather than as cards: the point
    // is the column of figures, which is where the arc actually shows.
    returns: { gap: space.xs, marginTop: space.xs },
    returnRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
    returnDay: { ...type.mono, fontSize: 13, color: c.inkFaint, minWidth: 62 },
    returnAfter: { ...type.body },
    flagList: {
      borderLeftWidth: 2,
      borderLeftColor: c.violet,
      paddingLeft: space.md,
      gap: space.xs,
      marginTop: space.xs,
    },
    flagValue: { fontFamily: font.displayBold, fontSize: 19, lineHeight: 23, color: c.ink },

    needle: {
      ...row(c),
      padding: space.lg,
      gap: 3,
    },
    needleRoad: { ...type.label, fontSize: 12, color: c.violet },
    needleIsland: { fontFamily: font.displayBold, fontSize: 19, color: c.ink, lineHeight: 22 },
    needleMeta: { ...type.mono, fontSize: 13, color: c.inkFaint },
    needleSpinning: { ...type.body, color: c.inkDim, lineHeight: 21 },
    emptyNeedles: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      padding: space.lg,
      minHeight: 44,
      justifyContent: 'center',
    },
    emptyNeedlesText: { ...type.body, color: c.inkDim },

    prompt: { ...type.body, color: c.inkDim, lineHeight: 21 },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    inputTall: { minHeight: 80, textAlignVertical: 'top' },
    filled: {
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: space.xs,
    },
    filledText: { ...type.heading, fontSize: 16, color: c.onAccent },
    doneLine: { ...type.mono, fontSize: 13, color: c.violet },

    carried: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.lg,
      marginTop: space.lg,
      gap: 3,
      minHeight: 44,
    },
    carriedLabel: { ...type.label, fontSize: 12, color: c.inkFaint },
    carriedName: { fontFamily: font.displayBold, fontSize: 19, color: c.ink },
    carriedBody: { ...type.body, color: c.inkDim, lineHeight: 21 },

    pastRow: {
      flexDirection: 'row',
      gap: space.md,
      paddingVertical: space.sm,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    pastDay: { ...type.mono, fontSize: 13, color: c.inkFaint },
    pastHeading: { ...type.body, fontSize: 16, color: c.inkDim, flex: 1 },
    pressed: { ...press },
  });
