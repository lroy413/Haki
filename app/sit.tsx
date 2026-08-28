import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BreathRing } from '../src/components/BreathRing';
import { useStore } from '../src/db/client';
import { endSit, openSitSession, startSit } from '../src/db/repo';
import { play } from '../src/sound';
import {
  SITS,
  SIT_BELL,
  SIT_ORDER,
  abandonMessage,
  completionMessage,
  durationMs,
  isRipe,
  remainingMs,
  type PracticeDepth,
  type SitSession,
} from '../src/domain/stillness';
import {
  BREATHS,
  BREATH_ORDER,
  breathCompletionMessage,
  isBreathKey,
} from '../src/domain/breath';
import { stateMessage, stateName } from '../src/domain/observation';
import { SectionLabel } from '../src/components/SectionLabel';
import { useHaki } from '../src/state/HakiProvider';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { font, radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * 見聞色 — Observation, sat down.
 *
 * One screen doing two jobs, the same way the Gears are a list on the training
 * tab and a clock on `/gear`: pick a length, then sit. They are together here
 * because stillness has no costs to explain and no availability to check, so
 * the list is three cards and putting it on a tab of its own would be building
 * a room for a chair.
 *
 * While a sit is running the screen is the ring, the clock and one way out.
 * Nothing else — the whole thing is a device for not looking at this.
 */
function practiceOf(depth: PracticeDepth) {
  if (isBreathKey(depth)) {
    const breath = BREATHS[depth];
    return {
      kanji: breath.cadence,
      label: breath.label,
      done: breathCompletionMessage(depth),
      pattern: breath.phases,
    };
  }
  const sit = SITS[depth];
  return {
    kanji: sit.kanji,
    label: sit.label,
    done: completionMessage(depth),
    pattern: undefined,
  };
}

export default function SitScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ begin?: string }>();
  const { db } = useStore();
  const { refresh, plainMode, palette, observation, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [session, setSession] = useState<SitSession | null>(null);
  const [rowId, setRowId] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [outcome, setOutcome] = useState<string | null>(null);
  const closing = useRef(false);

  const load = useCallback(async () => {
    const open = await openSitSession(db);
    if (open) {
      setRowId(open.id);
      setSession(open.session);
    }
    setNow(Date.now());
  }, [db]);

  useEffect(() => {
    void load();
  }, [load]);

  // A locked phone in a pocket is the normal case here, so coming back has to
  // re-read the clock rather than trust whatever ticks happened to fire.
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
      if (completed) play(SIT_BELL);
      await endSit(db, rowId, completed);
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setOutcome(message);
    },
    [db, refresh, rowId],
  );

  // Running out is an event this screen has to notice for itself; by design
  // nobody is looking at it when it happens.
  useEffect(() => {
    if (!session || outcome) return;
    if (isRipe(session, now)) void finish(true, practiceOf(session.depth).done);
  }, [session, now, outcome, finish]);

  /**
   * The loud-day door arrives with `?begin=settle`: one tap on the offer and
   * the person is already breathing, no second menu. Consumed once, so
   * navigating back to this screen later does not restart anything.
   */
  const consumedBegin = useRef(false);
  useEffect(() => {
    if (consumedBegin.current || session || outcome) return;
    const asked = typeof params.begin === 'string' ? params.begin : '';
    if (!isBreathKey(asked)) return;
    consumedBegin.current = true;
    void begin(asked);
    // `begin` is stable enough for a fire-once effect; listing it would
    // re-run this on every render it is recreated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.begin, session, outcome]);

  const starting = useSingleFlight();
  async function begin(depth: PracticeDepth) {
    // Two quick taps on a depth used to start two sits — the second row
    // orphaned, never finished, and counted nowhere. The haptic answers the
    // finger; the guard holds the door.
    await starting(async () => {
      void Haptics.selectionAsync();
      const started = await startSit(db, depth);
      setRowId(started.id);
      setSession(started.session);
      setNow(Date.now());
      await refresh();
    });
  }

  /* ------------------------------------------------------------- finished */

  if (outcome) {
    const practice = practiceOf(session?.depth ?? 'presence');
    return (
      <View style={styles.centred}>
        {!plainMode && <Text style={styles.kanji}>{practice.kanji}</Text>}
        <Text style={styles.doneTitle}>{practice.label}</Text>
        <Text style={styles.doneBody}>{outcome}</Text>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, styles.filled, pressed && styles.pressed]}
        >
          <Text style={styles.filledText}>Good</Text>
        </Pressable>
      </View>
    );
  }

  /* -------------------------------------------------------------- sitting */

  if (session) {
    const left = remainingMs(session, now);
    const elapsed = durationMs(session.depth) - left;
    const practice = practiceOf(session.depth);
    return (
      <View style={styles.centred}>
        {/* Still breathes in plain mode. Plain mode kills the app's Haki —
            the glow, the corona, the sound — and this is not that: it is the
            face of the timer, and a frozen circle would make the screen
            useless in the one place someone might most want to use it. */}
        <BreathRing color={palette.violet} size={248} pattern={practice.pattern} />

        {/* A pattern needs its instruction visible; a sit needs nothing. The
            cadence is the whole instruction, so it is the caption. */}
        {practice.pattern ? <Text style={styles.cadence}>{practice.kanji}</Text> : null}

        {/* Quieter than the gear screen's clock on purpose: there the number
            is the thing you are working against, here it is the thing you are
            trying to stop checking. */}
        <Text style={styles.clock} accessibilityLabel={spoken(left)}>
          {clockFace(left)}
        </Text>

        <Pressable
          onPress={() => void finish(false, abandonMessage(Math.floor(elapsed / 60_000)))}
          accessibilityRole="button"
          accessibilityLabel="End this sit"
          style={({ pressed }) => [styles.button, styles.quiet, pressed && styles.pressed]}
        >
          <Text style={styles.quietText}>That&apos;s enough</Text>
        </Pressable>

        <Text style={styles.footnote}>Getting up early costs nothing.</Text>
      </View>
    );
  }

  /* --------------------------------------------------------- choose a depth */

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {/*
        The lens this screen belongs to, and the two halves of it side by side.
        Sitting is the practice and clarity is what lets you use it — so the
        state names whichever of them is doing the limiting, which is the one
        genuinely useful thing to be told here. See `domain/observation.ts`.
      */}
      <View style={styles.reading}>
        <View style={styles.readingHead}>
          <Text style={styles.readingLabel}>{plainMode ? 'Reading' : '見聞色'}</Text>
          <Text style={styles.readingState}>{stateName(observation.state)}</Text>
        </View>
        <Text style={styles.readingBody}>{stateMessage(observation)}</Text>
      </View>

      <Text style={styles.blurb}>
        Armament is what you push out. This is the other one — five, ten or fifteen minutes of
        not pushing anything. Nothing here is scored, and there is no daily maximum.
      </Text>

      {SIT_ORDER.map((depth) => {
        const sit = SITS[depth];
        return (
          <Pressable
            key={depth}
            onPress={() => void begin(depth)}
            accessibilityRole="button"
            accessibilityLabel={`${sit.label}, ${sit.minutes} minutes`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardName}>
                {plainMode ? sit.label : `${sit.kanji}  ${sit.label}`}
              </Text>
              <Text style={styles.cardMinutes}>{sit.minutes} min</Text>
            </View>
            <Text style={styles.cardBlurb}>{sit.blurb}</Text>
          </Pressable>
        );
      })}

      {/* ------------------------------------------------------ the breath */}
      <SectionLabel label={t.breathLabel} style={styles.breathLabel} />
      <Text style={styles.breathBlurb}>{t.breathBlurb}</Text>

      {BREATH_ORDER.map((key) => {
        const breath = BREATHS[key];
        return (
          <Pressable
            key={key}
            onPress={() => void begin(key)}
            accessibilityRole="button"
            accessibilityLabel={`${breath.label}, ${breath.minutes} minutes`}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <View style={styles.cardHead}>
              <Text style={styles.cardName}>{breath.label}</Text>
              <Text style={styles.cardMinutes}>
                {breath.cadence} · {breath.minutes} min
              </Text>
            </View>
            <Text style={styles.cardBlurb}>{breath.blurb}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
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
    centred: {
      flex: 1,
      backgroundColor: c.bg,
      alignItems: 'center',
      justifyContent: 'center',
      padding: space.xl,
      gap: space.lg,
    },
    kanji: { fontFamily: font.display, fontSize: 64, color: c.violet },
    clock: {
      fontFamily: font.display,
      fontSize: 44,
      lineHeight: 52,
      color: c.inkDim,
      fontVariant: ['tabular-nums'],
    },
    cadence: { ...type.mono, fontSize: 13, color: c.inkFaint, letterSpacing: 2 },
    breathLabel: { marginTop: space.lg },
    breathBlurb: { ...type.small, color: c.inkDim, lineHeight: 19 },

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
    filled: { backgroundColor: c.violet },
    filledText: { ...type.heading, color: c.onAccent },
    quiet: { borderWidth: 1, borderColor: c.line },
    quietText: { ...type.heading, color: c.inkDim },
    pressed: { ...press },
    footnote: { ...type.mono, color: c.inkFaint, fontSize: 12 },

    list: { padding: space.lg, gap: space.sm },
    reading: {
      borderWidth: 1,
      borderColor: c.violet,
      backgroundColor: c.violetSoft,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    readingHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    readingLabel: { ...type.label, color: c.violet },
    readingState: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    readingBody: { ...type.body, color: c.ink, lineHeight: 22 },
    blurb: {
      ...type.body,
      color: c.inkDim,
      lineHeight: 22,
      marginBottom: space.xs,
    },
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    cardName: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    cardMinutes: { ...type.mono, color: c.inkDim },
    cardBlurb: { ...type.body, color: c.inkDim, lineHeight: 21 },
  });
