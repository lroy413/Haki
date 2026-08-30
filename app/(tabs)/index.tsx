import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CourseLine } from '../../src/components/CourseLine';
import { VoyageNote } from '../../src/components/VoyageNote';
import { DayStrip } from '../../src/components/DayStrip';
import { DayEndDoor } from '../../src/components/DayEndDoor';
import { Bearing } from '../../src/components/Bearing';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { DayPractice } from '../../src/components/DayPractice';
import { NextStrike } from '../../src/components/NextStrike';
import { LogLine } from '../../src/components/LogLine';
import { QuoteLine } from '../../src/components/QuoteLine';
import { ReserveGauge } from '../../src/components/ReserveGauge';
import { useStore } from '../../src/db/client';
import { todayKey } from '../../src/domain/date';
import { setTaskDone, strikeToday } from '../../src/db/repo';
import { useHaki } from '../../src/state/HakiProvider';
import { useSingleFlight } from '../../src/state/useSingleFlight';
import { underCrew } from '../../src/theme/palettes';
import { font, radius, space, type } from '../../src/theme/tokens';
import { press, row } from '../../src/theme/surfaces';
import type { Palette } from '../../src/theme/palettes';

export default function Home() {
  const { palette, crew } = useHaki();

  const styles = useMemo(() => makeStyles(palette), [palette]);
  const striking = useSingleFlight();
  const pad = useTabInsets();
  const router = useRouter();
  const { db } = useStore();
  const {
    reserve,
    cascade,
    intensity,
    day,
    t,
    read,
    training,
    next,
    quote,
    course,
    load,
    bells,
    bearing,
    voyage: sailing,
    refresh,
  } = useHaki();

  // Coming back from the Daily Read modal should show the new number at once.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const breach = cascade.level === 'breach';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, pad]}
      // The quick journal line lives mid-page now; without this, the tap on
      // its Log button while the keyboard is up only dismisses the keyboard.
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} tintColor={palette.inkDim} />
      }
    >
      {/* Wordmark and day count on one line, the way a masthead carries its
          date. Two stacked rows for six words was the header's habit, not a
          layout. */}
      <PageHeading title={t.appName} trailing={t.daysAtSea(day)} />

      {/* What is bearing down, above everything else on the screen you open.
          Absent when nothing is — a card that always stands here is one you
          learn to scroll past. See `Bearing`. */}
      <Bearing
        tasks={bearing}
        onOpenList={() => router.push('/armament')}
        onStrike={(task) => {
          // The card fires its own sound, impact and haptic on the tap; this
          // guard only keeps a second tap from queueing a second write while
          // the first is still in the sqlite channel.
          void striking(async () => {
            // Lands on today, not on the day it was planned for. Doing a
            // Saturday task on Thursday is a Thursday that counted — see
            // `strikeToday`.
            await strikeToday(db, task.id, todayKey());
            await refresh();
          });
        }}
      />

      <QuoteLine quote={quote} />

      {/* Directly under the day count, because that is what it is: the line
          saying what this particular day at sea is for. */}
      <CourseLine
        course={course}
        label={t.courseTitle}
        onPress={() => router.push('/course')}
      />

      {/* What the day looks like: the Sunny on the water, the sun where it
          actually is above her, three watches and what each is carrying. The
          ship used to sail in a band of its own at the top of this screen,
          over a second horizon this card drew as its baseline — one ocean too
          many. Silent about capacity — see `domain/watches.ts`. */}
      <DayStrip
        tasks={[...load.open, ...load.doneToday]}
        bells={bells}
        onOpen={() => router.push('/armament')}
        onBells={() => router.push('/bells')}
        onZoom={(to) => router.push(to === 'week' ? '/week' : '/tide')}
      />

      {/* The evening pass. Only present during the evening watch — see
          `DayEndDoor`. Directly under the strip, because the strip is the
          day and this is the door that closes it. */}
      <DayEndDoor onOpen={() => router.push('/dayend')} />

      {/* The gauge is the way into the Daily Read now that the loose button
          below is gone. It already says "no reading yet today" when there
          isn't one, which makes it the honest place to tap. */}
      <Pressable
        onPress={() => router.push('/read')}
        accessibilityRole="button"
        accessibilityLabel={read ? t.dailyReadDone : t.dailyReadCta}
        style={({ pressed }) => [pressed && styles.ctaPressed]}
      >
        <ReserveGauge
          reserve={reserve}
          intensity={intensity}
          label={t.reserveLabel}
          unknownLabel={t.reserveUnknown}
        />
      </Pressable>

      {/* The two sentences about the run rather than the day. Silent on
          an ordinary one, which is nearly all of them. */}
      <VoyageNote voyage={sailing} />

      {cascade.message ? (
        <View style={[styles.warning, breach ? styles.warningBreach : styles.warningWatch]}>
          <Text
            style={[styles.warningLabel, { color: breach ? palette.crimson : palette.warn }]}
          >
            {breach ? 'Keystone slipping' : 'Keystone'}
          </Text>
          <Text style={styles.warningBody}>{cascade.message}</Text>
        </View>
      ) : null}

      {/* The next ordinary thing. Hidden entirely when everything open is
          already bearing down above — two cards both saying "do this next"
          is worse than one, and its empty state would be a lie about a day
          that has plenty in it. */}
      {next !== null || bearing.length === 0 ? (
        <NextStrike
          task={next}
          emptyLabel={t.nextStrikeEmpty}
          onOpenList={() => router.push('/armament')}
          onDone={(task) => {
            // The card's own sound, impact and haptic land with the tap; this
            // guard only keeps a second tap from queueing a second write while
            // the first is still in the channel.
            void striking(async () => {
              await setTaskDone(db, task.id, true);
              await refresh();
            });
          }}
        />
      ) : null}

      {/* The journal's small door, kept on home when the journal moved into
          the Observation tab. One line, folded into today's entry — the door
          that asks nothing stays one tap from where the day starts. */}
      {/* Cyan: the home screen is the day and its record. */}
      <LogLine tint={palette.cyan} />

      {/*
        Everything you do already counts — the acts feed a weight, the weight
        settles a level, and the whole app goes darker. This is the part that
        says so. It also replaces the two loose call-to-action buttons that
        used to sit at the bottom of this screen: the Daily Read and a new
        entry are two of the six, and having them twice made the six look
        optional.
      */}
      <DayPractice onOpen={(route) => router.push(route as '/read')} />

      <Pressable
        onPress={() => router.push('/armament')}
        accessibilityRole="button"
        accessibilityLabel={t.trainingSection}
        style={({ pressed }) => [styles.strip, pressed && styles.ctaPressed]}
      >
        <View>
          {/* The gym, honestly labelled. This strip shows sessions, and
              calling it Armament was what made the lens look like one. */}
          <Text style={styles.stripLabel}>{t.trainingSection}</Text>
          <Text style={styles.stripValue}>
            {training.daysSinceLast === null
              ? t.trainingNever
              : training.daysSinceLast === 0
                ? t.trainingToday
                : `${training.daysSinceLast} days since last`}
          </Text>
        </View>
        {training.sessionsThisWeek === 0 ? (
          <Text style={styles.stripOffer}>{t.trainingPlanned(training.weeklyTarget)}</Text>
        ) : (
          <Text style={[styles.stripCount, { color: palette.ink }]}>
            {training.sessionsThisWeek}/{training.weeklyTarget}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    warning: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.xs },
    warningBreach: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    warningWatch: { borderColor: c.warn, backgroundColor: c.warnSoft },
    warningLabel: { ...type.label },
    warningBody: { ...type.body, color: c.ink, lineHeight: 21 },

    ctaPressed: { ...press },

    strip: {
      ...row(c),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: space.lg,
    },
    stripLabel: { ...type.label, color: c.inkFaint, marginBottom: 2 },
    stripValue: { ...type.body, color: c.ink },
    stripCount: { fontFamily: font.display, fontSize: 24, fontVariant: ['tabular-nums'] },
    // Before the first session of the week the slot carries the target as
    // an offer rather than a zero, so it is set at label weight.
    stripOffer: { ...type.label, color: c.inkDim },
  });
