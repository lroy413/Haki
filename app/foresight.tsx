import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import { historyForForesight } from '../src/db/repo';
import {
  MIN_READ_DAYS,
  directionNote,
  findingEvidence,
  findingLine,
  foresight,
  stateMessage,
  type Foresight,
} from '../src/domain/foresight';
import { addDays, todayKey } from '../src/domain/date';
import { useHaki } from '../src/state/HakiProvider';
import { font, radius, space, type } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import { lit, plate } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * 未来視 — Foresight, in full.
 *
 * Everything the engine found, each with the evidence under it and, where it
 * applies, the caveat about which way the thing runs. The caveat is set at the
 * same weight as the finding rather than shrunk into fine print, because it is
 * not a disclaimer — it is half of what is actually known.
 *
 * The bottom of the screen says how the reading is done. Somebody reading a
 * sentence about their own mind is owed the method that produced it, and the
 * method here is genuinely simple enough to state in four lines. An engine
 * that cannot explain itself in a paragraph should not be telling anyone
 * anything about themselves.
 */

/** A year is plenty to read over, and keeps the query bounded. */
const WINDOW_DAYS = 365;

export default function ForesightScreen() {
  const { db, settings } = useStore();
  const { palette, plainMode, hardening, crew } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const [reading, setReading] = useState<Foresight | null>(null);

  const load = useCallback(async () => {
    const days = await historyForForesight(db, addDays(todayKey(), -WINDOW_DAYS));
    setReading(foresight(days, settings.keystone.targetHours));
  }, [db, settings.keystone.targetHours]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!reading) return <View style={styles.screen} />;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
      ]}
    >
      <Text style={styles.lead}>{stateMessage(reading, plainMode)}</Text>

      {reading.state === 'reading'
        ? reading.findings.map((finding) => {
            const note = directionNote(finding, plainMode);
            return (
              <View
                key={`${finding.source}-${finding.dial}`}
                style={[styles.card, lit(palette.cyan, plainMode ? 0 : hardening)]}
              >
                <Text style={styles.finding}>{findingLine(finding, plainMode, crew.name)}</Text>
                {/* Not fine print. Which way a pattern runs is half of what is
                    known about it, so it reads at the same weight. */}
                {note ? <Text style={styles.note}>{note}</Text> : null}
                <Text style={styles.evidence}>{findingEvidence(finding)}</Text>
              </View>
            );
          })
        : null}

      {reading.state === 'watching' ? (
        <View style={styles.waiting}>
          <Text style={styles.waitingBody}>
            {plainMode
              ? 'Every check-in adds to what this can see. Nothing here needs doing on its own account.'
              : 'Every Daily Read adds to what this can see. Nothing here needs doing for its sake — it reads what the days already hold.'}
          </Text>
        </View>
      ) : null}

      {/* ------------------------------------------------------- the method */}
      <Text style={styles.methodLabel}>{plainMode ? 'How this works' : 'How it reads'}</Text>
      <Text style={styles.method}>
        {plainMode
          ? `Days are split in two — with the thing and without it — and the check-in dials compared. A difference is only shown when both sides have enough days behind them, the gap is at least half a point, and it is large against how much those days varied. It stays quiet far more often than not, on purpose.`
          : `Every question has one shape: split the days in two and compare the dial. A difference is only ever shown when both sides carry enough days, the gap is at least half a point, and it stands up against how much those days scattered. Set to miss real things rather than invent them — quiet is the ordinary answer.`}
      </Text>
      <Text style={styles.method}>
        {plainMode
          ? `It needs about ${MIN_READ_DAYS} check-ins before it will say anything, and it never tells you what to do about what it finds.`
          : `It needs about ${MIN_READ_DAYS} reads before it will say anything at all, and it will never tell you what to do about what it finds. That part is not its job.`}
      </Text>
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.sm },
    lead: { ...type.body, color: c.ink, lineHeight: 23, marginBottom: space.xs },

    card: {
      ...plate(c),
      padding: space.lg,
      gap: space.xs,
    },
    finding: { fontFamily: font.displayBold, fontSize: 19, color: c.ink, lineHeight: 23 },
    note: { ...type.body, color: c.inkDim, lineHeight: 21 },
    evidence: { ...type.mono, fontSize: 13, color: c.inkFaint },

    waiting: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      padding: space.lg,
    },
    waitingBody: { ...type.body, color: c.inkDim, lineHeight: 22 },

    methodLabel: { ...type.label, color: c.inkFaint, marginTop: space.xl },
    method: { ...type.small, color: c.inkFaint, lineHeight: 19 },
  });
