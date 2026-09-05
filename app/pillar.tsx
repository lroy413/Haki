import { useCallback, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import {
  addTask,
  closePoneglyph,
  listPoneglyphs,
  listRoads,
  openPoneglyph,
  setPort,
  reopenPoneglyph,
  retireRoad,
  updateRoad,
  wakesFor,
  setIslandUnit,
  soundingsFor,
  takeSounding,
} from '../src/db/repo';
import {
  arrivalMessage,
  logPose,
  passedMessage,
  reachedLine,
  stateName,
  type Poneglyph,
  type Road,
} from '../src/domain/logpose';
import { shortDay, todayKey } from '../src/domain/date';
import { fireConquerors } from '../src/impact';
import { play } from '../src/sound';
import { NeedleCard } from '../src/components/logpose/NeedleCard';
import { wakeLine } from '../src/domain/tasks';
import {
  formatSounding,
  latest,
  newestFirst,
  parseSounding,
  soundingLine,
  type Sounding,
} from '../src/domain/soundings';
import { SoundingLine } from '../src/components/logpose/SoundingLine';
import { SectionLabel } from '../src/components/SectionLabel';
import { useHaki } from '../src/state/HakiProvider';
import { font, radius, space, type } from '../src/theme/tokens';
import { usableBottom } from '../src/theme/viewport';
import { press } from '../src/theme/surfaces';
import { underCrew } from '../src/theme/palettes';
import type { Palette } from '../src/theme/palettes';

/**
 * One Road Poneglyph, in full.
 *
 * The tab shows a pillar's *present tense* — the one island under it and the
 * two ways off. Everything that is not the present tense lives here: what it
 * is, why the dream needs it, everything astern of it with the reasons
 * attached, and the only place it can be retired.
 *
 * **The reasons are the point of this screen.** Sailing past an island costs a
 * written line, and a line written once and never seen again is a toll rather
 * than a record. Read six of them together and they say something no single
 * one does — that the same thing keeps getting set down, or that a pillar has
 * had four islands and none of them stuck. Nothing here draws that conclusion
 * for you; it just refuses to hide the material.
 *
 * Retiring is not deleting, and never can be. Islands reached under a front
 * you have stepped away from stay reached — a year has the shape it had.
 */
export default function PillarScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const navigation = useNavigation();
  const { db } = useStore();
  const { t, palette, plainMode, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const insets = useSafeAreaInsets();

  const roadId = Number(id);
  const [road, setRoad] = useState<Road | null>(null);
  const [astern, setAstern] = useState<Poneglyph[]>([]);
  const [wakes, setWakes] = useState<Map<number, { struck: number; minutes: number }>>(
    new Map(),
  );
  const [hasOpen, setHasOpen] = useState(false);
  const [open, setOpen] = useState<Poneglyph | null>(null);
  const [soundings, setSoundings] = useState<Sounding[]>([]);
  const [reading, setReading] = useState('');
  const [unitDraft, setUnitDraft] = useState('');
  const [settingUnit, setSettingUnit] = useState(false);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');
  /**
   * Whether the pillar's words are open for editing.
   *
   * Closed by default, and that is the whole point: the title is already in
   * the navigation header and the reason is already cut into the stone at
   * the top of this screen, so two filled text fields carrying the same two
   * sentences made the screen say everything twice. The owner: _"there is
   * repeated information we probably don't need."_ Editing is a thing you
   * come here to do, so it sits behind a door with the other administration.
   */
  const [editing, setEditing] = useState(false);
  /** Every poneglyph, kept so this screen can build its own needle. */
  const [glyphs, setGlyphs] = useState<Poneglyph[]>([]);
  /** The one line that speaks after something closes. Cleared on the next act. */
  const [said, setSaid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [roads, glyphs] = await Promise.all([listRoads(db), listPoneglyphs(db)]);
    const mine = roads.find((r) => r.id === roadId) ?? null;
    setRoad(mine);
    setGlyphs(glyphs);
    if (mine) {
      setTitle(mine.title);
      setWhy(mine.why ?? '');
      // Long pillar names are the ordinary case, and a header that
      // truncates one to "…whoever is n…" is not carrying it.
      navigation.setOptions({ title: mine.title, headerTitleStyle: { fontSize: 19 } });
      const under = glyphs.filter((g) => g.roadKey === mine.key);
      const live = under.find((g) => g.state === 'open') ?? null;
      setHasOpen(live !== null);
      setOpen(live);
      setSoundings(live ? await soundingsFor(db, live.key) : []);
      setAstern(
        under
          .filter((g) => g.state !== 'open')
          .sort((a, b) => (b.closedOn ?? '').localeCompare(a.closedOn ?? '')),
      );
      setWakes(
        await wakesFor(
          db,
          under.map((g) => g.key),
        ),
      );
    }
  }, [db, roadId, navigation]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const dropping = useRef(false);
  async function drop() {
    const value = parseSounding(reading);
    if (value === null || !open || dropping.current) return;
    // Clear in the same frame as the tap — a field that empties is the
    // acknowledgement — and hold the ref so a second tap cannot land the
    // same reading twice while the first write is still in flight.
    dropping.current = true;
    setReading('');
    try {
      await takeSounding(db, open.key, value);
      await load();
    } finally {
      dropping.current = false;
    }
  }

  async function saveUnit() {
    if (!unitDraft.trim() || !open) return;
    await setIslandUnit(db, open.id, unitDraft);
    setUnitDraft('');
    setSettingUnit(false);
    await load();
  }

  if (!road) {
    return (
      <View style={styles.screen}>
        <Text style={styles.gone}>This one is no longer here.</Text>
      </View>
    );
  }

  const dirty = title.trim() !== road.title || why.trim() !== (road.why ?? '');
  const reached = astern.filter((g) => g.state === 'reached').length;

  /**
   * This pillar's own needle.
   *
   * Built through `logPose` rather than by hand so the days-at-sea count and
   * the ordering come from the same tested place the tab's do — a second
   * implementation of "what is under this pillar" is a second thing to get
   * wrong. `logPose` drops retired roads, which is why the card below is
   * gated on it: a pillar you have stepped away from does not take new
   * islands, and the history under it stays exactly as it was.
   */
  const needle = logPose(null, [road], glyphs, todayKey()).needles[0] ?? null;

  async function save() {
    if (!title.trim() || !dirty) return;
    setEditing(false);
    await updateRoad(db, roadId, { title: title.trim(), why: why.trim() || null });
    await load();
  }

  /** Put the fields back to what is stored and shut the door. */
  function cancelEdit() {
    setTitle(road?.title ?? '');
    setWhy(road?.why ?? '');
    setEditing(false);
  }

  /**
   * Arrival, and it fires from here now.
   *
   * The tab used to own this because the tab held the cards. The chart holds
   * no acts — it is a drawing — so the burst, the drums and the one line that
   * speaks moved to the screen the act actually happens on. Still the only
   * caller in the app, still rare by construction.
   */
  async function reachedIsland(glyphId: number) {
    await closePoneglyph(db, glyphId, 'reached');
    fireConquerors();
    play('returnDrums');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaid(arrivalMessage(reached + 1, plainMode));
    await load();
  }

  async function passIsland(glyphId: number, reason: string) {
    await closePoneglyph(db, glyphId, 'passed', reason);
    void Haptics.selectionAsync();
    setSaid(passedMessage(plainMode));
    await load();
  }

  async function strike(text: string, islandKey: number | null) {
    // Straight onto today, not the backlog — the point of striking an island
    // is that the enormous thing produced one move you can make before
    // tonight. The task remembers the island, so an arrival can say what it
    // took.
    await addTask(db, text, 15, todayKey(), { islandKey });
    void Haptics.selectionAsync();
    setSaid(t.strikeAdded);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(usableBottom(insets.bottom), space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {road.retired ? <Text style={styles.retiredFlag}>{t.roadRetired}</Text> : null}

        {/* ------------------------------------------------------ the present tense */}
        {/* The full path, opened. The Journey tab draws the pillar as a
            stone on a chart and says nothing else about it; everything you
            can *do* to it is here, on the screen that stone opens. Same
            control the plain-mode list mounts, so there is one island card
            in this app rather than two that drift. */}
        {needle ? (
          <>
            <NeedleCard
              needle={needle}
              wake={needle.next ? (wakes.get(needle.next.key) ?? null) : null}
              // No depth here: the soundings card below carries the same
              // figure at four times the size. On the tab, where there is no
              // such card, the slab is the only place it can appear.
              depth={null}
              onOpen={(text) => {
                setSaid(null);
                void openPoneglyph(db, road!.key, text).then(load);
              }}
              onReached={() => {
                if (needle.next) void reachedIsland(needle.next.id);
              }}
              onPass={(reason) => {
                if (needle.next) void passIsland(needle.next.id, reason);
              }}
              onStrike={(text) => void strike(text, needle.next?.key ?? null)}
              onPort={(portBy) => {
                if (needle.next) void setPort(db, needle.next.id, portBy).then(load);
              }}
            />
            {said ? <Text style={styles.said}>{said}</Text> : null}
            {/* Why there is no "add another" here. The limit is the treatment
                for the failure this feature exists to treat, and a rule the
                app enforces without saying reads as a missing button — the
                owner went looking for one. Said once, quietly, on the screen
                where the acts are. */}
            {open ? <Text style={styles.limitNote}>{t.islandOneAtATime}</Text> : null}
          </>
        ) : null}

        {/* --------------------------------------------------------- at sea */}
        {/* Soundings live here rather than on the needle card: the tab is
            where you act on the island, and this is where you look at it.
            The section exists at all only once the island has a unit —
            most islands are done-or-not, and a number field on those is an
            invitation to invent a metric. */}
        {open ? (
          <>
            <SectionLabel
              label={t.soundingsLabel}
              trailing={plainMode ? undefined : '測深'}
              tint={lens.violet}
            />
            {/* The island is named on the slab directly above, at display
                weight. Naming it again at the head of this card was the same
                words twice, four inches apart — and with the name gone, a
                card holding one quiet link was a large empty box. So the
                offer is a bare line and the card arrives with the readings. */}
            {open.unit === null ? (
              settingUnit ? (
                <View style={styles.card}>
                  <>
                    <Text style={styles.fieldLabel}>{t.soundingUnitField}</Text>
                    <TextInput
                      value={unitDraft}
                      onChangeText={setUnitDraft}
                      autoFocus={Platform.OS !== 'web'}
                      style={styles.input}
                      placeholder="kg"
                      placeholderTextColor={palette.inkFaint}
                      accessibilityLabel={t.soundingUnitField}
                      returnKeyType="done"
                      onSubmitEditing={() => void saveUnit()}
                    />
                    <View style={styles.row}>
                      <Pressable
                        onPress={() => setSettingUnit(false)}
                        accessibilityRole="button"
                        style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                      >
                        <Text style={styles.ghostText}>Cancel</Text>
                      </Pressable>
                      <Pressable
                        onPress={() => void saveUnit()}
                        disabled={!unitDraft.trim()}
                        accessibilityRole="button"
                        style={({ pressed }) => [
                          styles.filled,
                          !unitDraft.trim() && styles.disabled,
                          pressed && styles.pressed,
                        ]}
                      >
                        <Text style={styles.filledText}>Save</Text>
                      </Pressable>
                    </View>
                  </>
                </View>
              ) : (
                <Pressable
                  onPress={() => setSettingUnit(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t.soundingUnitCta}
                  style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
                >
                  <Text style={styles.quietText}>{t.soundingUnitCta}</Text>
                </Pressable>
              )
            ) : (
              <View style={styles.card}>
                <>
                  {soundings.length > 0 ? (
                    <View style={styles.depth}>
                      <Text style={styles.depthValue}>
                        {formatSounding(latest(soundings)!.value, open.unit)}
                      </Text>
                      <SoundingLine soundings={soundings} tint={lens.violet} />
                    </View>
                  ) : null}

                  <Text style={styles.sectionNote}>
                    {soundingLine(soundings.length, plainMode)}
                  </Text>

                  <TextInput
                    value={reading}
                    onChangeText={setReading}
                    keyboardType="decimal-pad"
                    style={styles.input}
                    placeholder={open.unit}
                    placeholderTextColor={palette.inkFaint}
                    accessibilityLabel={t.soundingField}
                    returnKeyType="done"
                    onSubmitEditing={() => void drop()}
                  />
                  {/* Its own row. Beside the field the label clipped mid-word
                      on a narrow phone, and shortening it would have left a
                      button that does not say what it does. */}
                  <Pressable
                    onPress={() => void drop()}
                    disabled={parseSounding(reading) === null}
                    accessibilityRole="button"
                    accessibilityLabel={t.soundingTake}
                    style={({ pressed }) => [
                      styles.filled,
                      parseSounding(reading) === null && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.filledText}>{t.soundingTake}</Text>
                  </Pressable>

                  {/* The readings themselves, newest first. Just the figures
                      and their dates — no change between them, because a
                      delta is a pace and a pace invites the question of
                      whether it was fast enough. */}
                  {newestFirst(soundings)
                    .slice(0, 6)
                    .map((s) => (
                      <View key={s.id} style={styles.readingRow}>
                        <Text style={styles.readingValue}>
                          {formatSounding(s.value, open.unit)}
                        </Text>
                        <Text style={styles.readingDay}>{shortDay(s.day)}</Text>
                      </View>
                    ))}
                </>
              </View>
            )}
          </>
        ) : null}

        {/* ------------------------------------------------------------ astern */}

        <SectionLabel label={t.islandHistory} />

        {/* One sentence, not two. `reachedLine` already says "no islands
            astern yet" at zero, and the empty state said it again directly
            underneath — the same words twice, which reads as a stutter
            rather than an empty state. */}
        {astern.length === 0 ? (
          <Text style={styles.empty}>
            {plainMode
              ? 'Nothing closed under this yet.'
              : 'No islands astern yet. The first one is the one you are sailing to.'}
          </Text>
        ) : (
          <Text style={styles.sectionNote}>{reachedLine(reached, plainMode)}</Text>
        )}

        {astern.map((island) => (
          <View key={island.id} style={styles.card}>
            <Text style={styles.islandTitle}>{island.title}</Text>
            {/* State and date on one mono line rather than a stamp floated
                beside the title. "Sailed past" is two words and wrapped into a
                column against a title that was wrapping too, which read as two
                competing headings on one card. */}
            <Text style={island.state === 'reached' ? styles.stampReached : styles.stampPassed}>
              {stateName(island.state, plainMode)}
              {island.closedOn ? ` · ${shortDay(island.closedOn)}` : ''}
            </Text>
            {/* What the island actually took — counts with no denominator,
                shown only when something was struck under it. See wakeLine. */}
            {wakeLine(wakes.get(island.key) ?? { struck: 0, minutes: 0 }) ? (
              <Text style={styles.wake}>
                {wakeLine(wakes.get(island.key) ?? { struck: 0, minutes: 0 })}
              </Text>
            ) : null}
            {island.reason ? <Text style={styles.reason}>{island.reason}</Text> : null}
            {/* Only offered while the needle is free: putting one back to sea
                while another is open would break the one-at-a-time rule from
                the side door.

                A quiet text button, not a bordered one. This screen is the
                record, and a column of full-width buttons down it turns a
                history into a list of things to do. */}
            {hasOpen ? null : (
              <Pressable
                onPress={() => void reopenPoneglyph(db, island.id).then(load)}
                accessibilityRole="button"
                accessibilityLabel={`${t.islandReopen}: ${island.title}`}
                style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
              >
                <Text style={styles.quietText}>{t.islandReopen}</Text>
              </Pressable>
            )}
          </View>
        ))}

        {/* ------------------------------------------------- the pillar itself */}
        {/* Administration, at the foot: the words, and the way to retire it.
            Both are things you come to this screen on purpose to do, and
            neither belongs above the island you are actually sailing to. */}

        <SectionLabel label={t.roadEditLabel} />

        {editing ? (
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>{t.roadTitleField}</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              style={styles.input}
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.roadTitleField}
            />
            <Text style={styles.fieldLabel}>{t.roadWhyField}</Text>
            <TextInput
              value={why}
              onChangeText={setWhy}
              multiline
              style={[styles.input, styles.inputTall]}
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.roadWhyField}
            />
            <View style={styles.row}>
              <Pressable
                onPress={cancelEdit}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void save()}
                disabled={!title.trim() || !dirty}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.filled,
                  (!title.trim() || !dirty) && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.filledText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setEditing(true)}
            accessibilityRole="button"
            accessibilityLabel={`${t.roadEditCta}: ${road.title}`}
            style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
          >
            <Text style={styles.quietText}>{t.roadEditCta}</Text>
          </Pressable>
        )}

        {/* ----------------------------------------------------------- retire */}

        <View style={styles.retireBlock}>
          <Text style={styles.retireNote}>
            {road.retired
              ? 'Retired. It keeps everything under it and takes no room.'
              : 'Retiring keeps every island under it and frees a place. Nothing is deleted.'}
          </Text>
          <Pressable
            onPress={() => void retireRoad(db, roadId, !road.retired).then(load)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
          >
            <Text style={styles.ghostText}>{road.retired ? t.roadUnretire : t.roadRetire}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },
    gone: { ...type.body, color: c.inkFaint, padding: space.xl, textAlign: 'center' },
    retiredFlag: { ...type.label, color: c.inkFaint },
    // What the act said, in the lens's own colour and at label weight. It
    // is a receipt, not a verdict — see `arrivalMessage`.
    said: { ...type.mono, color: c.violet, fontSize: 13 },

    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.sm,
    },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 12 },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    inputTall: { minHeight: 76, textAlignVertical: 'top' },

    section: { gap: space.xs, marginTop: space.sm },
    sectionLabel: { ...type.label, color: c.inkFaint },
    sectionNote: { ...type.small, color: c.inkDim },
    empty: { ...type.body, color: c.inkFaint, lineHeight: 21 },

    islandTitle: { fontFamily: font.displayBold, fontSize: 19, color: c.ink, lineHeight: 22 },
    stampReached: { ...type.mono, color: c.violet, fontSize: 13 },
    wake: { ...type.mono, color: c.inkFaint, fontSize: 13 },

    row: { flexDirection: 'row', gap: space.sm, alignItems: 'stretch' },
    // Why there is no second island on offer. Faint, one line, said once.
    limitNote: { ...type.small, color: c.inkFaint, lineHeight: 19 },

    depth: { gap: space.xs, marginTop: space.xs },
    // The one figure this screen is actually about, at the size of a figure
    // that matters. It is a reading, never a result: nothing beside it says
    // whether it is good.
    depthValue: {
      fontFamily: font.display,
      fontSize: 34,
      letterSpacing: -1,
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    readingRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.lineSoft,
      paddingTop: space.sm,
    },
    readingValue: { ...type.mono, color: c.ink, fontVariant: ['tabular-nums'] },
    readingDay: { ...type.mono, color: c.inkFaint },
    // Not a warning colour. Sailing past is allowed and the record of it is
    // not a mark against anybody — it reads quieter than reaching, and that is
    // the only difference the styling is permitted to make.
    stampPassed: { ...type.mono, color: c.inkFaint, fontSize: 13 },
    quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    quietText: { ...type.mono, color: c.inkDim, fontSize: 13 },
    reason: { ...type.body, color: c.inkDim, lineHeight: 21, fontStyle: 'italic' },

    filled: {
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 16, color: c.onAccent },
    ghost: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { ...type.heading, fontSize: 16, color: c.inkDim },
    disabled: { opacity: 0.4 },

    retireBlock: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.lg,
      marginTop: space.lg,
      gap: space.md,
    },
    retireNote: { ...type.small, color: c.inkFaint, lineHeight: 18 },
    pressed: { ...press },
  });
