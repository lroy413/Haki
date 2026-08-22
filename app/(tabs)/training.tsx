import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStore } from '../../src/db/client';
import { recentSessions } from '../../src/db/repo';
import type { TrainingSessionRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { returnMessage } from '../../src/domain/training';
import { TAB_BAR_CLEARANCE, color, font, radius, space, type } from '../../src/theme/tokens';

/**
 * 武装色 — Armament. The first real inhabitant of this tab.
 *
 * Three numbers and a list. No streak, no calendar of red squares, no verdict
 * on the week. Hardness is a rolling four-week figure that dips and recovers,
 * because a number that resets to nothing is what turns a missed week into a
 * missed month.
 */
export default function TrainingScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, training, refresh } = useHaki();
  const [sessions, setSessions] = useState<TrainingSessionRow[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const rows = await recentSessions(db);
        if (!cancelled) setSessions(rows);
        await refresh();
      })();
      return () => {
        cancelled = true;
      };
    }, [db, refresh]),
  );

  const since = training.daysSinceLast;

  return (
    <View style={styles.screen}>
      <FlatList
        data={sessions}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.stats}>
              <Stat
                label={t.trainingThisWeek}
                value={`${training.sessionsThisWeek}/${training.weeklyTarget}`}
                tone={color.crimson}
              />
              <Stat
                label={t.trainingConsistency}
                value={training.consistency === null ? null : `${training.consistency}%`}
                tone={color.violet}
              />
              <Stat
                label={t.trainingSinceLast}
                value={since === null ? null : String(since)}
                tone={training.inGap ? color.warn : color.cyan}
              />
            </View>

            {since === 0 ? <Text style={styles.today}>{t.trainingToday}</Text> : null}

            {training.inGap && since !== null ? (
              <View style={styles.gap}>
                <Text style={styles.gapLabel}>In a gap</Text>
                <Text style={styles.gapBody}>
                  {since} days since the last session. Logging one now lands as a Return.
                </Text>
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t.trainingEmpty}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={styles.rowHead}>
              <Text style={styles.rowKind}>{item.kind}</Text>
              <Text style={styles.rowDay}>{item.day}</Text>
            </View>
            <Text style={styles.rowMeta}>
              {[
                item.minutes ? `${item.minutes} min` : null,
                item.intensity ? `intensity ${item.intensity}/5` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {item.note ? <Text style={styles.rowNote}>{item.note}</Text> : null}
            {item.closedGap > 0 ? (
              <Text style={styles.rowReturn}>{returnMessage(item.closedGap)}</Text>
            ) : null}
          </View>
        )}
      />

      <Pressable
        onPress={() => router.push('/session')}
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
      >
        <Text style={styles.fabText}>{t.trainingLog}</Text>
      </Pressable>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | null; tone: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
      {value === null ? (
        // An em-dash in the display face reads as a filled bar at this weight,
        // which looks like data rather than the absence of it.
        <Text style={styles.statEmpty}>Not yet</Text>
      ) : (
        <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  list: { padding: space.lg, gap: space.sm, paddingBottom: TAB_BAR_CLEARANCE + 72 },
  header: { gap: space.lg, marginBottom: space.sm },

  stats: { flexDirection: 'row', gap: space.sm },
  stat: {
    flex: 1,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space.md,
    gap: space.xs,
  },
  statLabel: { ...type.label, color: color.inkFaint, fontSize: 9 },
  statEmpty: { ...type.small, fontSize: 15, color: color.inkFaint, lineHeight: 30 },
  statValue: {
    fontFamily: font.display,
    fontSize: 26,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },

  today: { ...type.small, color: color.cyan, textAlign: 'center' },

  gap: {
    borderWidth: 1,
    borderColor: color.warn,
    backgroundColor: color.warnSoft,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  gapLabel: { ...type.label, color: color.warn },
  gapBody: { ...type.body, color: color.ink, lineHeight: 21 },

  empty: { ...type.body, color: color.inkDim, textAlign: 'center', marginTop: space.xl },

  row: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.xs,
  },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowKind: { ...type.heading, color: color.ink },
  rowDay: { ...type.mono, color: color.inkFaint },
  rowMeta: { ...type.small, color: color.inkDim },
  rowNote: { ...type.small, color: color.inkDim, fontStyle: 'italic' },
  rowReturn: { ...type.small, color: color.violet, marginTop: space.xs },

  fab: {
    position: 'absolute',
    left: space.lg,
    right: space.lg,
    // Stacked above the floating tab bar rather than under it.
    bottom: TAB_BAR_CLEARANCE,
    backgroundColor: color.crimson,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  fabText: { ...type.heading, color: '#0A0B12' },
  pressed: { opacity: 0.75 },
});
