import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { ReserveGauge } from '../../src/components/ReserveGauge';
import { useHaki } from '../../src/state/HakiProvider';
import { color, radius, space, type } from '../../src/theme/tokens';

export default function Home() {
  const { reserve, cascade, intensity, day, t, read, refresh } = useHaki();

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
      refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={color.inkDim} />}
    >
      <Text style={styles.days}>{t.daysAtSea(day)}</Text>

      <ReserveGauge
        reserve={reserve}
        intensity={intensity}
        label={t.reserveLabel}
        unknownLabel={t.reserveUnknown}
      />

      {cascade.message ? (
        <View
          style={[
            styles.warning,
            breach ? styles.warningBreach : styles.warningWatch,
          ]}
        >
          <Text style={[styles.warningLabel, { color: breach ? color.crimson : color.warn }]}>
            {breach ? 'Keystone slipping' : 'Keystone'}
          </Text>
          <Text style={styles.warningBody}>{cascade.message}</Text>
        </View>
      ) : null}

      <Link href="/read" asChild>
        <Pressable style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}>
          <Text style={styles.ctaText}>{read ? t.dailyReadDone : t.dailyReadCta}</Text>
          <Text style={styles.ctaHint}>{read ? 'Tap to change' : '30 seconds'}</Text>
        </Pressable>
      </Link>

      <Link href="/entry/new" asChild>
        <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.ctaPressed]}>
          <Text style={styles.secondaryText}>{t.newEntry}</Text>
        </Pressable>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  content: { padding: space.lg, gap: space.lg },
  days: { ...type.label, color: color.inkFaint },

  warning: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  warningBreach: { borderColor: color.crimson, backgroundColor: color.crimsonSoft },
  warningWatch: { borderColor: color.warn, backgroundColor: color.warnSoft },
  warningLabel: { ...type.label },
  warningBody: { ...type.body, color: color.ink, lineHeight: 21 },

  cta: {
    backgroundColor: color.violet,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    gap: 2,
  },
  ctaPressed: { opacity: 0.75 },
  ctaText: { ...type.heading, color: '#0A0B12', fontWeight: '800' },
  ctaHint: { ...type.small, color: '#0A0B12', opacity: 0.7 },

  secondary: {
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  secondaryText: { ...type.heading, color: color.ink },
});
