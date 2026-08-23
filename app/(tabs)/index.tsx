import { useCallback, useMemo } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { NextStrike } from '../../src/components/NextStrike';
import { QuoteLine } from '../../src/components/QuoteLine';
import { ReserveGauge } from '../../src/components/ReserveGauge';
import { useStore } from '../../src/db/client';
import { setTaskDone } from '../../src/db/repo';
import { useHaki } from '../../src/state/HakiProvider';
import { TAB_BAR_CLEARANCE, font, radius, space, type } from '../../src/theme/tokens';
import type { Palette } from '../../src/theme/palettes';

export default function Home() {
  const { palette } = useHaki();

  const styles = useMemo(() => makeStyles(palette), [palette]);
  const router = useRouter();
  const { db } = useStore();
  const { reserve, cascade, intensity, day, t, read, training, next, quote, refresh } =
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
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refresh} tintColor={palette.inkDim} />
      }
    >
      <Text style={styles.days}>{t.daysAtSea(day)}</Text>

      <QuoteLine quote={quote} />

      <ReserveGauge
        reserve={reserve}
        intensity={intensity}
        label={t.reserveLabel}
        unknownLabel={t.reserveUnknown}
      />

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

      <Pressable
        onPress={() => router.push('/training')}
        style={({ pressed }) => [styles.strip, pressed && styles.ctaPressed]}
      >
        <View>
          <Text style={styles.stripLabel}>{t.trainingTitle}</Text>
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

      <Pressable
        onPress={() => router.push('/read')}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
      >
        <Text style={styles.ctaText}>{read ? t.dailyReadDone : t.dailyReadCta}</Text>
        <Text style={styles.ctaHint}>{read ? 'Tap to change' : '30 seconds'}</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push('/entry/new')}
        style={({ pressed }) => [styles.secondary, pressed && styles.ctaPressed]}
      >
        <Text style={styles.secondaryText}>{t.newEntry}</Text>
      </Pressable>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg, paddingBottom: TAB_BAR_CLEARANCE },
    days: { ...type.label, color: c.inkFaint },

    warning: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.xs },
    warningBreach: { borderColor: c.crimson, backgroundColor: c.crimsonSoft },
    warningWatch: { borderColor: c.warn, backgroundColor: c.warnSoft },
    warningLabel: { ...type.label },
    warningBody: { ...type.body, color: c.ink, lineHeight: 21 },

    cta: {
      backgroundColor: c.violet,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
      gap: 2,
    },
    ctaPressed: { opacity: 0.75 },
    ctaText: { ...type.heading, color: c.onAccent },
    ctaHint: { ...type.small, color: c.onAccent, opacity: 0.7 },

    secondary: {
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    secondaryText: { ...type.heading, color: c.ink },

    strip: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      padding: space.lg,
    },
    stripLabel: { ...type.label, color: c.inkFaint, marginBottom: 2 },
    stripValue: { ...type.body, color: c.ink },
    stripCount: { fontFamily: font.display, fontSize: 22, fontVariant: ['tabular-nums'] },
  });
