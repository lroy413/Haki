import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import { endGear, openGearSession } from '../src/db/repo';
import {
  GEARS,
  abandonMessage,
  completionMessage,
  durationMs,
  isRipe,
  remainingMs,
  type GearName,
  type GearSession,
} from '../src/domain/gears';
import { useHaki } from '../src/state/HakiProvider';
import { font, radius, space, type } from '../src/theme/tokens';
import type { Palette } from '../src/theme/palettes';

/**
 * A gear, running.
 *
 * The clock is the only source of truth. The interval below moves the digits;
 * it does not own the time. Kill the app mid-gear, come back forty minutes
 * later, and the screen is simply right — which is the whole reason elapsed
 * time is derived from `startedAt` rather than counted up.
 *
 * The screen is deliberately empty. Something that exists to help you look
 * away from a phone has no business being interesting.
 */
export default function GearScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { refresh, plainMode, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const params = useLocalSearchParams<{ gear?: string }>();

  const [session, setSession] = useState<GearSession | null>(null);
  const [rowId, setRowId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<string | null>(null);
  const closing = useRef(false);

  const load = useCallback(async () => {
    const open = await openGearSession(db);
    if (open) {
      setRowId(open.id);
      setSession(open.session);
    }
    setNow(Date.now());
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  // Coming back from the background can skip hours. Re-read the clock rather
  // than trusting however many ticks happened to fire while we were away.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const finish = useCallback(
    async (completed: boolean, message: string) => {
      if (closing.current || rowId === null) return;
      closing.current = true;
      await endGear(db, rowId, completed);
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOutcome(message);
    },
    [db, refresh, rowId],
  );

  // Running out is an event the screen has to notice on its own, because
  // nothing else is going to be looking.
  useEffect(() => {
    if (!session || outcome) return;
    if (isRipe(session, now)) void finish(true, completionMessage(session.gear));
  }, [session, now, outcome, finish]);

  const gearName = (session?.gear ?? params.gear ?? 'second') as GearName;
  const gear = GEARS[gearName];
  const tint = tintFor(palette, gearName);

  if (outcome) {
    return (
      <View style={styles.screen}>
        {!plainMode && <Text style={[styles.kanji, { color: tint }]}>{gear.kanji}</Text>}
        <Text style={styles.doneTitle}>{gear.label}</Text>
        <Text style={styles.doneBody}>{outcome}</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: tint },
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.buttonText}>Good</Text>
        </Pressable>
      </View>
    );
  }

  if (!session) {
    return (
      <View style={styles.screen}>
        <Text style={styles.doneBody}>No gear running.</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>Back</Text>
        </Pressable>
      </View>
    );
  }

  const left = remainingMs(session, now);
  const elapsed = durationMs(gearName) - left;
  const progress = Math.min(1, Math.max(0, elapsed / durationMs(gearName)));

  return (
    <View style={styles.screen}>
      {!plainMode && <Text style={[styles.kanji, { color: tint }]}>{gear.kanji}</Text>}
      <Text style={styles.label}>{gear.label}</Text>

      <Text style={[styles.clock, { color: tint }]} accessibilityLabel={spoken(left)}>
        {clockFace(left)}
      </Text>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: tint }]} />
      </View>

      <Pressable
        onPress={() => void finish(false, abandonMessage(Math.floor(elapsed / 60_000)))}
        accessibilityRole="button"
        accessibilityLabel="Ease off and end this gear"
        style={({ pressed }) => [styles.button, styles.quiet, pressed && styles.pressed]}
      >
        <Text style={styles.quietText}>Ease off</Text>
      </Pressable>

      <Text style={styles.footnote}>Ending early costs nothing.</Text>
    </View>
  );
}

/** Escalating heat. Gears are not Haki, so the three Haki hues stay unclaimed. */
function tintFor(c: Palette, gear: GearName): string {
  return { second: c.cyan, third: c.warn, fourth: c.crimson }[gear];
}

function clockFace(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function spoken(ms: number): string {
  const minutes = Math.ceil(ms / 60_000);
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} left`;
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
      gap: space.lg,
    },
    kanji: { fontFamily: font.display, fontSize: 64 },
    label: { ...type.label, color: c.inkDim },
    clock: {
      fontFamily: font.displayBold,
      fontSize: 76,
      // Tabular figures would be ideal; failing that a fixed line box at least
      // stops the digits jumping the layout every second.
      lineHeight: 84,
      fontVariant: ['tabular-nums'],
    },
    track: {
      width: '100%',
      maxWidth: 320,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: c.line,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: radius.pill },

    doneTitle: { ...type.display, color: c.ink },
    doneBody: {
      ...type.body,
      color: c.inkDim,
      textAlign: 'center',
      lineHeight: 23,
      maxWidth: 320,
    },

    button: {
      borderRadius: radius.md,
      paddingVertical: space.lg,
      paddingHorizontal: space.xxxl,
      minWidth: 180,
      alignItems: 'center',
      marginTop: space.sm,
    },
    buttonText: { ...type.heading, color: c.onAccent },
    quiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: c.line },
    quietText: { ...type.heading, color: c.inkDim },
    pressed: { opacity: 0.75 },
    footnote: { ...type.mono, color: c.inkFaint, fontSize: 11 },
  });
