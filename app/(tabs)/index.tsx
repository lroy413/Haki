import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { CourseLine } from '../../src/components/CourseLine';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { DayPractice } from '../../src/components/DayPractice';
import { NextStrike } from '../../src/components/NextStrike';
import { QuoteLine } from '../../src/components/QuoteLine';
import { SeaBand } from '../../src/components/SeaBand';
import { ReserveGauge } from '../../src/components/ReserveGauge';
import { useStore } from '../../src/db/client';
import { setTaskDone } from '../../src/db/repo';
import { useHaki } from '../../src/state/HakiProvider';
import { font, radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

export default function Home() {
  const { palette } = useHaki();

  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();
  const router = useRouter();
  const { db } = useStore();
  const { reserve, cascade, intensity, day, t, read, training, next, quote, course, refresh } =
    useHaki();

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
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} tintColor={palette.inkDim} />
      }
    >
      {/* Wordmark and day count on one line, the way a masthead carries its
          date. Two stacked rows for six words was the header's habit, not a
          layout. */}
      <PageHeading title={t.appName} trailing={t.daysAtSea(day)} />

      {/* The day, as a ship. It never moves along anything — see
          `domain/practice.ts`. */}
      <SeaBand />

      <QuoteLine quote={quote} />

      {/* Directly under the day count, because that is what it is: the line
          saying what this particular day at sea is for. */}
      <CourseLine
        course={course}
        label={t.courseTitle}
        onPress={() => router.push('/course')}
      />

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

      <NextStrike
        task={next}
        emptyLabel={t.nextStrikeEmpty}
        onOpenList={() => router.push('/training')}
        onDone={(task) => {
          void (async () => {
            await setTaskDone(db, task.id, true);
            await refresh();
          })();
        }}
      />

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
        onPress={() => router.push('/training')}
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
        <Text
          style={[
            styles.stripCount,
            { color: training.inGap ? palette.warn : palette.crimson },
          ]}
        >
          {training.sessionsThisWeek}/{training.weeklyTarget}
        </Text>
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

    ctaPressed: { opacity: 0.75 },

    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
    },
    stripLabel: { ...type.label, color: c.inkFaint, marginBottom: 2 },
    stripValue: { ...type.body, color: c.ink },
    stripCount: { fontFamily: font.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  });
