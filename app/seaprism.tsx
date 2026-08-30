import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import { hitsBetween, letGoStone, listStones, nameStone, setHit } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { SectionLabel } from '../src/components/SectionLabel';
import { Rise } from '../src/components/Rise';
import { useSingleFlight } from '../src/state/useSingleFlight';
import {
  KINDS,
  KIND_MARK,
  LET_GO_LABEL,
  LET_GO_NOTE,
  MAX_NAME,
  byKind,
  emptyLine,
  firstTimeLine,
  kindLabel,
  live,
  nameReady,
  namedToday,
  readBack,
  todayLine,
  type Hit,
  type Kind,
  type Stone,
} from '../src/domain/seaPrism';
import { addDays, shortDay, todayKey } from '../src/domain/date';
import { usableBottom } from '../src/theme/viewport';
import { press } from '../src/theme/surfaces';
import { radius, space, type } from '../src/theme/tokens';
import type { Palette } from '../src/theme/palettes';

/** How far the log reads back. Long enough to be a record, short enough to read. */
const ASTERN_DAYS = 60;

/**
 * The Sea Prism Log — what takes the will away.
 *
 * Kairoseki nullifies power while you are in contact with it, and that is the
 * whole framing: **naming something here is not an accusation.** The person on
 * this list is not a bad person and the room is not a bad room; they are
 * things that, for you, cost something to be near. `domain/seaPrism.ts` holds
 * the rules that keep it that way, and two of them shape this screen:
 *
 * **Nothing is counted per stone.** No tally beside a name, no ordering by how
 * often, no "your worst". A count next to a person is a rap sheet, and the
 * fact that you would have written it yourself does not make it one you should
 * have to look at.
 *
 * **Logging is one tap.** This gets opened on the days there is least will
 * available to open it, so the common act is a chip and the rare act — naming
 * a new one — is the only thing that costs a word.
 *
 * 見聞色's light, because reading your own state is what this is.
 */
export default function SeaPrismScreen() {
  const { db } = useStore();
  const { palette, plainMode, t, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();
  const flight = useSingleFlight();

  const today = todayKey();
  const [stones, setStones] = useState<Stone[]>([]);
  const [hits, setHits] = useState<Hit[]>([]);
  const [naming, setNaming] = useState(false);
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<Kind>('someone');
  const [managing, setManaging] = useState(false);

  /**
   * What the finger has just done, before the database agrees.
   *
   * A tap here goes through the whole provider on one sqlite channel; without
   * this the chip sits inert long enough that a second tap is a reasonable
   * thing to do — and on a toggle a second tap is an undo, so the stone would
   * come straight back off. Keyed by stone so several can be in flight at
   * once: a bad afternoon is rarely one thing.
   */
  const [wish, setWish] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    const [allStones, recent] = await Promise.all([
      listStones(db),
      hitsBetween(db, addDays(today, -ASTERN_DAYS), today),
    ]);
    setStones(allStones);
    setHits(recent);
  }, [db, today]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onList = useMemo(() => live(stones), [stones]);
  const groups = useMemo(() => byKind(onList), [onList]);
  const stored = useMemo(() => namedToday(hits, today), [hits, today]);
  const astern = useMemo(
    () => readBack(hits, stones).filter((d) => d.day !== today),
    [hits, stones, today],
  );

  /** The stored answer, unless the finger has said otherwise more recently. */
  const isNamed = (stone: Stone) => wish[stone.id] ?? stored.has(stone.createdAt);
  const count = onList.filter(isNamed).length;

  /**
   * One tap, acknowledged in its own frame, and the same tap takes it back.
   *
   * `next` is passed down rather than derived inside — never read-modify-write
   * from a row the screen is holding, or two quick taps both read the same
   * stale state and both write the same thing.
   */
  function toggle(stone: Stone, next: boolean) {
    void flight(async () => {
      // Inside the flight, not above it. The guard drops a call that arrives
      // while one is running, so a chip lit on the line above would stay lit
      // over a write that never happened.
      setWish((w) => ({ ...w, [stone.id]: next }));
      void Haptics.selectionAsync();
      await setHit(db, stone.createdAt, next, today);
      await load();
      // The Reserve reads the day's drains, so the gauge behind this screen is
      // out of date the moment a chip is tapped.
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
      await nameStone(db, kind, text);
      await load();
    });
  }

  function letGo(stone: Stone) {
    void flight(async () => {
      setStones((rows) =>
        rows.map((s) => (s.id === stone.id ? { ...s, retiredAt: Date.now() } : s)),
      );
      await letGoStone(db, stone.id);
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
            {count > 0 ? todayLine(count, plainMode) : emptyLine(plainMode)}
          </Text>
          {onList.length === 0 ? (
            <Text style={styles.blurb}>{firstTimeLine(plainMode)}</Text>
          ) : null}
        </View>
      </Rise>

      {/* The list. Grouped by kind and never by how often — the order a stone
          sits in is the order it was named, which carries no verdict. */}
      <Rise delay={80}>
        <View style={styles.group}>
          <View style={styles.listHead}>
            <SectionLabel
              label={t.prismList}
              trailing={plainMode ? undefined : '海楼石'}
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
          {groups.map((group) => (
            <View key={group.kind} style={styles.kind}>
              <Text style={styles.kindName}>
                {plainMode
                  ? kindLabel(group.kind, true)
                  : `${KIND_MARK[group.kind]}  ${kindLabel(group.kind)}`}
              </Text>
              <View style={styles.chips}>
                {group.stones.map((stone) => {
                  const named = isNamed(stone);
                  return (
                    <View key={stone.id} style={styles.chipRow}>
                      <Pressable
                        onPress={() => toggle(stone, !named)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: named }}
                        accessibilityLabel={stone.name}
                        style={({ pressed }) => [
                          styles.chip,
                          named && styles.chipNamed,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={[styles.chipText, named && styles.chipTextNamed]}>
                          {stone.name}
                        </Text>
                      </Pressable>
                      {managing ? (
                        <Pressable
                          onPress={() => letGo(stone)}
                          accessibilityRole="button"
                          accessibilityLabel={`${LET_GO_LABEL}: ${stone.name}`}
                          style={({ pressed }) => [styles.letGo, pressed && styles.pressed]}
                        >
                          <Text style={styles.letGoText}>✕</Text>
                        </Pressable>
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ))}

          {managing ? <Text style={styles.blurb}>{LET_GO_NOTE}</Text> : null}

          {naming ? (
            <View style={styles.form}>
              <View style={styles.kindPick}>
                {KINDS.map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => setKind(k)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: kind === k }}
                    accessibilityLabel={kindLabel(k, plainMode)}
                    style={({ pressed }) => [
                      styles.pick,
                      kind === k && styles.pickOn,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={[styles.pickText, kind === k && styles.pickTextOn]}>
                      {kindLabel(k, plainMode)}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="What is it?"
                placeholderTextColor={palette.inkFaint}
                maxLength={MAX_NAME}
                style={styles.input}
                onSubmitEditing={add}
                returnKeyType="done"
                autoFocus
                accessibilityLabel={t.prismName}
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
                    {t.prismName}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => setNaming(true)}
              accessibilityRole="button"
              accessibilityLabel={t.prismName}
              style={({ pressed }) => [styles.addRow, pressed && styles.pressed]}
            >
              <Text style={styles.addText}>+ {t.prismName}</Text>
            </Pressable>
          )}
        </View>
      </Rise>

      {/* The log, read back. Chronological and never aggregated: you may read
          what you wrote, and the app may not turn it into a finding. */}
      {astern.length > 0 ? (
        <Rise delay={120}>
          <View style={styles.group}>
            <SectionLabel label={t.prismAstern} trailing={plainMode ? undefined : '航跡'} />
            {astern.map((day) => (
              <View key={day.day} style={styles.asternRow}>
                <Text style={styles.when}>{shortDay(day.day, today)}</Text>
                <View style={styles.asternBody}>
                  {day.named.map((stone, i) => (
                    <Text key={`${stone.id}-${i}`} style={styles.asternName}>
                      {stone.name}
                    </Text>
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
      gap: space.xs,
    },
    said: { ...type.body, color: c.ink, lineHeight: 26 },
    blurb: { ...type.small, color: c.inkDim, lineHeight: 21 },

    group: { gap: space.sm },
    listHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    listLabel: { flex: 1 },
    kind: { gap: space.xs },
    kindName: { ...type.mono, fontSize: 12, color: c.inkFaint },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
    chipRow: { flexDirection: 'row', alignItems: 'center' },
    chip: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    // Named today reads as *held*, not as scored: the chip fills with the
    // lens's own soft ground and the word goes to full ink. Nothing counts how
    // many times, here or anywhere.
    chipNamed: { backgroundColor: c.violetSoft, borderColor: c.violet },
    chipText: { ...type.body, fontSize: 17, color: c.inkDim },
    chipTextNamed: { color: c.ink },
    // 44 on both axes. A 36-wide box with a 44-tall one is still under the floor.
    letGo: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    letGoText: { ...type.mono, fontSize: 13, color: c.inkFaint },

    addRow: { minHeight: 44, justifyContent: 'center' },
    addText: { ...type.mono, fontSize: 13, color: c.violet },

    form: { gap: space.sm, paddingTop: space.xs },
    kindPick: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
    pick: {
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: space.md,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: c.line,
    },
    pickOn: { borderColor: c.violet, backgroundColor: c.violetSoft },
    pickText: { ...type.mono, fontSize: 13, color: c.inkDim },
    pickTextOn: { color: c.ink },
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
      backgroundColor: c.violet,
    },
    // An unfilled button is a surface, and it says "not yet" by being one — a
    // faded accent comes out a wash under the app's own contrast floor.
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
    asternBody: { flex: 1, gap: 2 },
    asternName: { ...type.body, color: c.ink, lineHeight: 25 },
    pressed: { ...press },
  });
