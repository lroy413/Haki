import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { useStore } from '../../src/db/client';
import { recentSessions } from '../../src/db/repo';
import type { TrainingSessionRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { returnMessage } from '../../src/domain/training';
import { color, radius, space, type } from '../../src/theme/tokens';

/**
 * 武装色 — Armament. The first real inhabitant of this tab.
 *
 * Three numbers and a list. No streak, no calendar of red squares, no verdict
 * on the week. Hardness is a rolling four-week figure that dips and recovers,
 * because a number that resets to nothing is what turns a missed week into a
 * missed month.
 */
export default function TrainingScreen() {
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
                value={training.consistency === null ? '—' : `${training.consistency}%`}
                tone={color.violet}
              />
              <Stat
                label={t.trainingSinceLast}
                value={since === null ? '—' : String(since)}
                tone={training.inGap ? color.warn : color.cyan}
              />
            </View>

            {since === 0 ? (
              <Text style={styles.today}>{t.trainingToday}</Text>
            ) : null}

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

      <Link href="/session" asChild>
        <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]}>
          <Text style={styles.fabText}>{t.trainingLog}</Text>
        </Pressable>
      </Link>
    </View>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  list: { padding: space.lg, gap: space.sm, paddingBottom: 96 },
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
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -1, fontVariant: ['tabular-nums'] },

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
    bottom: space.lg,
    backgroundColor: color.crimson,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
  },
  fabText: { ...type.heading, color: '#0A0B12', fontWeight: '800' },
  pressed: { opacity: 0.75 },
});
