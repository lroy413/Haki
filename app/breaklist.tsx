import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import {
  listBreaks,
  logUrge,
  nameBreak,
  retireBreak,
  settleUrge,
  unlogUrge,
  urgesBetween,
} from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { SectionLabel } from '../src/components/SectionLabel';
import { Rise } from '../src/components/Rise';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { underCrew, type Palette } from '../src/theme/palettes';
import {
  LET_GO_LABEL,
  LET_GO_NOTE,
  MAX_NAME,
  dayLine,
  emptyListLine,
  live,
  nameReady,
  outcomeLabel,
  quietDayLine,
  readBack,
  urgesOn,
  type Break,
  type Outcome,
  type Urge,
} from '../src/domain/breakList';
import { addDays, shortDay, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { press } from '../src/theme/surfaces';
import { radius, space, type } from '../src/theme/tokens';

/** How far the log reads back. Long enough to be a record, short enough to read. */
const ASTERN_DAYS = 60;

/**
 * The Break List — urges, not failures.
 *
 * The concept doc's line and the reason this exists: *most apps only let you
 * record the loss.* Every quit-tracker is a counter that climbs while you hold
 * and resets when you do not, so the only thing it can say about the hardest
 * thing you did all week is that you eventually stopped doing it. There was
 * nowhere in this app to record a win that consists of **not** doing
 * something.
 *
 * So: **there is no streak here and nowhere to put one.** No "14 days clean",
 * no longest run, no days-since. That figure is the shame machine, and it is
 * worse here than anywhere else in the app — a number whose only move is to
 * zero turns one bad hour into the erasure of a month.
 *
 * A slip is written down in the same list, in the same words, at the same
 * weight. The one asymmetry allowed is that a hold gets *named* as one, because
 * a win nobody records is a win nobody had.
 *
 * 武装色's light: this is the tool for what you do, and it is the lens the
 * concept doc files this under. It moves with the crew, so the tint comes
 * through `underCrew`.
 */
export default function BreakListScreen() {
  const { db } = useStore();
  const { palette, plainMode, crew, t, refresh } = useHaki();
  // 武装色 moves with the crew: crimson under Luffy, the amethyst coating
  // under Zoro. The screen goes on writing `c.crimson` meaning "the lens".
  const c = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(c), [c]);
  const insets = useSafeAreaInsets();
  const flight = useSingleFlight();

  const today = todayKey();
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [urges, setUrges] = useState<Urge[]>([]);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [managing, setManaging] = useState(false);

  const load = useCallback(async () => {
    const [all, recent] = await Promise.all([
      listBreaks(db),
      urgesBetween(db, addDays(today, -ASTERN_DAYS), today),
    ]);
    setBreaks(all);
    setUrges(recent);
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onList = useMemo(() => live(breaks), [breaks]);
  const todays = useMemo(() => urgesOn(urges, breaks, today), [urges, breaks, today]);
  const astern = useMemo(
    () => readBack(urges, breaks).filter((d) => d.day !== today),
    [urges, breaks, today],
  );
  const said = todays.length > 0 ? dayLine(todays, plainMode) : null;

  /**
   * One tap, and the row appears in the same frame.
   *
   * The optimistic row carries a negative id so it can never collide with a
   * real one, and it is dropped when the reload brings the stored row back.
   */
  function log(item: Break, outcome: Outcome) {
    const pending: Urge = {
      id: -Date.now(),
      breakKey: item.createdAt,
      day: today,
      outcome,
      createdAt: Date.now(),
    };
    void flight(async () => {
      // Inside the flight — a row shown above it would survive a dropped
      // write and read as an urge that was never logged.
      setUrges((rows) => [pending, ...rows]);
      void Haptics.selectionAsync();
      await logUrge(db, item.createdAt, outcome, today);
      await load();
      // The Reserve counts today's urges, so the gauge behind this is stale
      // the moment one is logged.
      await refresh();
    });
  }

  /** How one that was ridden out ended. The only thing about an urge that changes. */
  function settle(id: number, outcome: Outcome) {
    void flight(async () => {
      setUrges((rows) => rows.map((u) => (u.id === id ? { ...u, outcome } : u)));
      void Haptics.selectionAsync();
      await settleUrge(db, id, outcome);
      await load();
      await refresh();
    });
  }

  /** A mis-tap must be as cheap as the tap was. */
  function unlog(id: number) {
    void flight(async () => {
      setUrges((rows) => rows.filter((u) => u.id !== id));
      await unlogUrge(db, id);
      await load();
      await refresh();
    });
  }

  function add() {
    if (!nameReady(draft)) return;
    void flight(async () => {
      const text = draft;
      // The form closes in the tap's own frame; the write lands behind it.
      setDraft('');
      setNaming(false);
      await nameBreak(db, text);
      await load();
    });
  }

  function retire(item: Break) {
    void flight(async () => {
      setBreaks((rows) =>
        rows.map((b) => (b.id === item.id ? { ...b, retiredAt: Date.now() } : b)),
      );
      await retireBreak(db, item.id);
      await load();
    });
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: usableBottom(insets.bottom) + space.xxxl },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Rise>
        <View style={styles.card}>
          <Text style={styles.said}>
            {said ?? (onList.length === 0 ? emptyListLine(plainMode) : quietDayLine(plainMode))}
          </Text>
        </View>
      </Rise>

      {/* Today's urges. Each one names the break, what happened, and nothing
          else — no time of day, no strength, no note. */}
      {todays.length > 0 ? (
        <Rise delay={40}>
          <View style={styles.group}>
            <SectionLabel label={t.breakToday} trailing={plainMode ? undefined : '本日'} />
            {todays.map((u) => (
              <View key={u.id} style={styles.row}>
                <View style={styles.rowBody}>
                  <Text style={styles.rowName} numberOfLines={2}>
                    {u.of.name}
                  </Text>
                  {/* An urge still running offers its two endings here rather
                      than sitting as an open item somewhere — it is one row,
                      and nothing ever nags it. */}
                  {u.outcome === 'riding' ? (
                    <View style={styles.settle}>
                      {(['held', 'went'] as const).map((out) => (
                        <Pressable
                          key={out}
                          onPress={() => settle(u.id, out)}
                          accessibilityRole="button"
                          // Said apart from the list's buttons below, which
                          // start a *new* urge under the same words. Two
                          // controls with one name on one screen is how a row
                          // gets mis-tapped — and a screen reader would hear
                          // "Held: the vape" twice with different effects.
                          accessibilityLabel={`It ended — ${outcomeLabel(out, plainMode)}: ${u.of.name}`}
                          style={({ pressed }) => [styles.small, pressed && styles.pressed]}
                        >
                          <Text style={styles.smallText}>{outcomeLabel(out, plainMode)}</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                {/* Named, never coloured by which way it went: green for a
                    hold and red for a slip is a scoreboard, and this list is
                    a record. */}
                <Text style={styles.outcome}>{outcomeLabel(u.outcome, plainMode)}</Text>
                <Pressable
                  onPress={() => unlog(u.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Take back: ${u.of.name}`}
                  style={({ pressed }) => [styles.undo, pressed && styles.pressed]}
                >
                  <Text style={styles.undoText}>✕</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}

      <Rise delay={80}>
        <View style={styles.group}>
          <View style={styles.listHead}>
            <SectionLabel
              label={t.breakList}
              trailing={plainMode ? undefined : '断ち'}
              style={styles.listLabel}
            />
            {onList.length > 0 ? (
              <Pressable
                onPress={() => setManaging((m) => !m)}
                accessibilityRole="button"
                accessibilityLabel={managing ? 'Done editing the list' : 'Edit the list'}
                style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
              >
                <Text style={styles.quietText}>{managing ? 'Done' : 'Edit'}</Text>
              </Pressable>
            ) : null}
          </View>

          {/* Three buttons, all one tap and all the same size. "Went with it"
              is not smaller, greyer or further away than "Held" — a list you
              can only be honest in one direction is a list that lies. */}
          {onList.map((item) => (
            <View key={item.id} style={styles.item}>
              <View style={styles.itemHead}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name}
                </Text>
                {managing ? (
                  <Pressable
                    onPress={() => retire(item)}
                    accessibilityRole="button"
                    accessibilityLabel={`${LET_GO_LABEL}: ${item.name}`}
                    style={({ pressed }) => [styles.undo, pressed && styles.pressed]}
                  >
                    <Text style={styles.undoText}>✕</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.buttons}>
                {(['held', 'went', 'riding'] as const).map((out) => (
                  <Pressable
                    key={out}
                    onPress={() => log(item, out)}
                    accessibilityRole="button"
                    accessibilityLabel={`Log ${outcomeLabel(out, plainMode)}: ${item.name}`}
                    style={({ pressed }) => [styles.button, pressed && styles.pressed]}
                  >
                    <Text style={styles.buttonText}>{outcomeLabel(out, plainMode)}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          {managing ? <Text style={styles.blurb}>{LET_GO_NOTE}</Text> : null}

          {naming ? (
            <View style={styles.form}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="What are you trying not to do?"
                placeholderTextColor={c.inkFaint}
                maxLength={MAX_NAME}
                style={styles.input}
                onSubmitEditing={add}
                returnKeyType="done"
                autoFocus
                accessibilityLabel={t.breakName}
              />
              <View style={styles.formRow}>
                <Pressable
                  onPress={() => {
                    setNaming(false);
                    setDraft('');
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
                >
                  <Text style={styles.quietText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={add}
                  disabled={!nameReady(draft)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.confirm,
                    !nameReady(draft) && styles.confirmWaiting,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[styles.confirmText, !nameReady(draft) && styles.confirmTextWaiting]}
                  >
                    {t.breakName}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setNaming(true)}
              accessibilityRole="button"
              accessibilityLabel={t.breakName}
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
            >
              <Text style={styles.addText}>+ {t.breakName}</Text>
            </Pressable>
          )}
        </View>
      </Rise>

      {/* The log, read back. Days newest first, every urge in the same list at
          the same weight. Nothing here totals, ranks or runs. */}
      {astern.length > 0 ? (
        <Rise delay={120}>
          <View style={styles.group}>
            <SectionLabel label={t.breakAstern} trailing={plainMode ? undefined : '航跡'} />
            {astern.map((day) => (
              <View key={day.day} style={styles.asternRow}>
                <Text style={styles.when}>{shortDay(day.day, today)}</Text>
                <View style={styles.asternBody}>
                  {/* Two columns rather than one sentence: run inline, a long
                      name wraps through the outcome and leaves "with it" alone
                      on a line of its own. */}
                  {day.urges.map((u) => (
                    <View key={u.id} style={styles.asternLine}>
                      <Text style={styles.asternName}>{u.of.name}</Text>
                      <Text style={styles.asternOutcome}>
                        {outcomeLabel(u.outcome, plainMode)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </Rise>
      ) : null}
    </ScrollView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.lg },

    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      padding: space.md,
    },
    said: { ...type.body, color: c.ink, lineHeight: 26 },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 21 },

    group: { gap: space.sm },
    listHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    listLabel: { flex: 1 },

    item: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.xs,
    },
    itemHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    itemName: { ...type.body, color: c.ink, flex: 1 },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
    // Every ending the same size and the same colour. A green Held beside a
    // red Went is a scoreboard; this is a record.
    button: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
    },
    buttonText: { ...type.mono, fontSize: 13, color: c.inkDim },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingLeft: space.md,
      paddingRight: space.xs,
      paddingVertical: space.sm,
      minHeight: 44,
    },
    rowBody: { flex: 1, gap: space.xs },
    rowName: { ...type.body, color: c.ink },
    settle: { flexDirection: 'row', gap: space.xs },
    small: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
    },
    smallText: { ...type.mono, fontSize: 13, color: c.inkDim },
    // Ink, never the lens and never a colour per outcome. Crimson is this
    // app's "something has gone wrong", and a hold printed in it says the
    // opposite of what happened; a green Held beside a red Went is a
    // scoreboard. All three read at the same weight, in the same colour.
    outcome: { ...type.mono, fontSize: 13, color: c.inkDim },
    undo: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    undoText: { ...type.mono, fontSize: 13, color: c.inkFaint },

    addRow: { minHeight: 44, justifyContent: 'center' },
    addText: { ...type.mono, fontSize: 13, color: c.crimson },

    form: { gap: space.sm, paddingTop: space.xs },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      minHeight: 48,
    },
    formRow: { flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' },
    quiet: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md },
    quietText: { ...type.mono, fontSize: 13, color: c.inkDim },
    confirm: {
      borderRadius: radius.sm,
      paddingHorizontal: space.lg,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: c.crimson,
    },
    confirmWaiting: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line },
    confirmText: { ...type.mono, fontSize: 13, color: c.onAccent },
    confirmTextWaiting: { color: c.inkFaint },

    asternRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: space.md,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    when: { ...type.mono, fontSize: 13, color: c.inkFaint, minWidth: 58, marginTop: 3 },
    asternBody: { flex: 1, gap: space.xs },
    asternLine: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
    asternName: { ...type.body, color: c.ink, lineHeight: 25, flex: 1 },
    asternOutcome: { ...type.mono, fontSize: 13, color: c.inkDim },
    pressed: { ...press },
  });
