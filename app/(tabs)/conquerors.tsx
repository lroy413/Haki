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
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '../../src/db/client';
import {
  addRoad,
  addTask,
  closePoneglyph,
  getDream,
  readPose,
  lastSailing,
  listCarried,
  listPoneglyphs,
  listRoads,
  openPoneglyph,
  setPort,
  setDream,
  wakesFor,
  listFlag,
  latestSoundings,
} from '../../src/db/repo';
import {
  ROAD_MAX,
  arrivalMessage,
  bearing,
  logPose,
  passedMessage,
  roadRoom,
  type LogPose,
  type Poneglyph,
  type Road,
} from '../../src/domain/logpose';
import { shortDay, todayKey } from '../../src/domain/date';
import { isDue, offerLine as sailOfferLine } from '../../src/domain/sail';
import { fireConquerors } from '../../src/impact';
import { play } from '../../src/sound';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { NeedleCard } from '../../src/components/logpose/NeedleCard';
import { ChartTable, PillarRow } from '../../src/components/logpose/ChartTable';
import { useHaki } from '../../src/state/HakiProvider';
import { font, radius, space, type } from '../../src/theme/tokens';
import { lit, offer, plate, press, row } from '../../src/theme/surfaces';
import { SectionLabel } from '../../src/components/SectionLabel';
import { flagCheck, type Value } from '../../src/domain/flag';
import { lostLine, poseLine, type EternalPose } from '../../src/domain/eternal';
import { Rise } from '../../src/components/Rise';
import type { Sounding } from '../../src/domain/soundings';
import { underCrew } from '../../src/theme/palettes';
import { Crackle } from '../../src/components/instruments/Crackle';
import type { Palette } from '../../src/theme/palettes';

/**
 * 覇王色 — Conqueror's. The Log Pose.
 *
 * The third lens, and **the one with no meter.** Observation reports a state
 * and Armament reports a hardness; this deliberately reports neither. Canon's
 * line is that Conqueror's cannot be trained, only refined — it is knowing
 * exactly who you are — and a number that went up as you knew yourself better
 * would be a lie about what the thing is. What this screen gives you is a
 * *bearing*: one dream, the pillars it stands on, and the single next island
 * under each. Where the needles point, never how far along you are.
 *
 * That is also why nothing here is counted against a total. A journey has no
 * denominator — nobody sailing knows how many islands are left, so any
 * percentage would be invented — which lands this on the same rule hardening
 * arrived at from the other direction: never display it as a score.
 *
 * Three sizes, and the relationship between them is the design:
 *
 *   one **Dream**, which is never scaled down for a bad month;
 *   four to seven **Road Poneglyphs**, the big things it actually requires;
 *   one **Poneglyph** at a time under each, weeks wide and concrete.
 *
 * Inherited Will sits at the bottom rather than in a tab of its own. The whole
 * argument of the source material is that a dream outlives the person who held
 * it as long as somebody keeps carrying it, which makes the people you carry
 * part of where you are going. It stays a record and never a mechanic: a list
 * of names and a way in, nothing that counts, nags or scores.
 */
/**
 * A reference, as a row.
 *
 * Setting Sail, the Eternal Pose, the Flag and Inherited Will are four facts
 * that are read far more often than they are changed, and each of them used to
 * be a card with a label, a glyph and a paragraph in it. Four of those is the
 * shape this tab's own rework note calls the worst screen in the app for words
 * per screen — the chart replaced the pillars' cards and then four more grew
 * back around it.
 *
 * A row holds all of it: the glyph, the name, and what is currently true said
 * once. `due` is the only state any of them has, and it belongs to Setting
 * Sail alone — an offer that always shouts is a nag, and this one has to
 * survive being skipped for a month.
 */
function Door({
  styles,
  glyph,
  name,
  line,
  note,
  due,
  onPress,
}: {
  styles: ReturnType<typeof makeStyles>;
  glyph: string | null;
  name: string;
  line: string;
  /** A second line, shown only in the rare state that earns one. */
  note?: string | null;
  due?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}: ${line}`}
      style={({ pressed }) => [styles.door, due && styles.doorDue, pressed && styles.pressed]}
    >
      <View style={styles.doorHead}>
        {glyph ? <Text style={styles.doorGlyph}>{glyph}</Text> : null}
        <Text style={styles.doorName} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.doorGo}>›</Text>
      </View>
      <Text style={styles.doorLine} numberOfLines={2}>
        {line}
      </Text>
      {note ? <Text style={styles.doorNote}>{note}</Text> : null}
    </Pressable>
  );
}

export default function ConquerorsScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, palette, plainMode, hardening, charge, crew: flying } = useHaki();
  const lens = useMemo(() => underCrew(palette, flying), [palette, flying]);
  const styles = useMemo(() => makeStyles(lens), [lens]);
  const pad = useTabInsets();

  const [dream, setDreamState] = useState<{ text: string; setOn: string } | null>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [glyphs, setGlyphs] = useState<Poneglyph[]>([]);
  const [crew, setCrew] = useState<string[]>([]);
  const [lastSail, setLastSail] = useState<string | null>(null);
  const [wakes, setWakes] = useState<Map<number, { struck: number; minutes: number }>>(
    new Map(),
  );

  const [editingDream, setEditingDream] = useState(false);
  const [dreamDraft, setDreamDraft] = useState('');
  const [addingRoad, setAddingRoad] = useState(false);
  const [roadTitle, setRoadTitle] = useState('');
  const [roadWhy, setRoadWhy] = useState('');
  /** The one line that speaks after something closes. Cleared on the next act. */
  const [said, setSaid] = useState<string | null>(null);
  const [flag, setFlag] = useState<Value[]>([]);
  const [eternal, setEternal] = useState<EternalPose>({ held: null, carried: [] });
  const [depths, setDepths] = useState<Map<number, Sounding>>(new Map());
  // The chart's width, measured once. The water spans it and the stones
  // anchor to its columns, neither of which a percentage can do in an SVG.
  const [chartW, setChartW] = useState(0);

  const load = useCallback(async () => {
    const [d, r, g, people, sail, values, bearing] = await Promise.all([
      getDream(db),
      listRoads(db),
      listPoneglyphs(db),
      listCarried(db),
      lastSailing(db),
      listFlag(db),
      readPose(db),
    ]);
    setDreamState(d);
    setRoads(r);
    setGlyphs(g);
    setCrew(people.map((p) => p.name));
    setLastSail(sail?.day ?? null);
    setFlag(values);
    setEternal(bearing);
    const openKeys = g.filter((x) => x.state === 'open').map((x) => x.key);
    setDepths(await latestSoundings(db, openKeys));
    // The open islands' wakes: what has been struck under each so far.
    setWakes(
      await wakesFor(
        db,
        g.filter((x) => x.state === 'open').map((x) => x.key),
      ),
    );
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pose: LogPose = useMemo(
    () => logPose(dream?.text ?? null, roads, glyphs, todayKey()),
    [dream, roads, glyphs],
  );
  const room = roadRoom(pose.needles.length, plainMode);
  // Every needle turning: no island at sea anywhere. The ordinary state of a
  // week that came apart, and the one the Eternal Pose was built for.
  const allSpinning =
    pose.needles.length > 0 && pose.needles.every((needle) => needle.next === null);

  /**
   * The screen answers the finger, and that includes Save.
   *
   * The first cut closed these forms only after the write and the reload
   * came back — which on the web all runs down expo-sqlite's single
   * synchronous channel. The button read as dead, a perfectly reasonable
   * second tap queued a second insert, and one pillar arrived five times.
   * So: capture the draft, close the form in the same frame as the tap, and
   * hold a ref against re-entry until the write lands. The ref rather than
   * state, because state is exactly what is too slow here.
   */
  const savingDream = useRef(false);
  async function saveDream() {
    const text = dreamDraft.trim();
    if (!text || savingDream.current) return;
    savingDream.current = true;
    setEditingDream(false);
    setSaid(null);
    try {
      await setDream(db, text);
      await load();
    } finally {
      savingDream.current = false;
    }
  }

  const savingRoad = useRef(false);
  async function saveRoad() {
    const title = roadTitle.trim();
    if (!title || savingRoad.current) return;
    savingRoad.current = true;
    const why = roadWhy;
    setRoadTitle('');
    setRoadWhy('');
    setAddingRoad(false);
    setSaid(null);
    try {
      await addRoad(db, title, why || null);
      await load();
    } finally {
      savingRoad.current = false;
    }
  }

  /**
   * Arrival. The one loud moment in the app, and the only thing that fires the
   * Conqueror's burst.
   *
   * It stays rare by construction rather than by a rule: an island is weeks of
   * work and there is at most one open per pillar, so this cannot fire more
   * than a handful of times a year without the Log Pose being used dishonestly.
   */
  async function reached(id: number) {
    await closePoneglyph(db, id, 'reached');
    fireConquerors();
    // The drums, and the only music in the app. Cut for the Return, which is
    // the other event here rare enough to deserve six seconds.
    play('returnDrums');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const next = pose.reached + 1;
    setSaid(arrivalMessage(next, plainMode));
    await load();
  }

  async function passed(id: number, reason: string) {
    await closePoneglyph(db, id, 'passed', reason);
    void Haptics.selectionAsync();
    setSaid(passedMessage(plainMode));
    await load();
  }

  async function strike(title: string, islandKey: number | null) {
    // Straight onto today, not the backlog. The point of striking an island is
    // that the enormous thing produced one move you can make before tonight.
    // The task remembers the island it came from, so an arrival can say what
    // it actually took — see `islandWake` in domain/tasks.ts.
    await addTask(db, title, 15, todayKey(), { islandKey });
    void Haptics.selectionAsync();
    setSaid(t.strikeAdded);
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.content, pad]}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeading
          title={t.logPoseTitle}
          trailing={plainMode ? undefined : '覇王色'}
          tint={lens.violet}
        />

        <Text style={styles.bearing}>{bearing(pose, plainMode)}</Text>
        {said ? <Text style={styles.said}>{said}</Text> : null}

        {/* The weekly ritual, offered rather than demanded — and offered from
            here because it is Conqueror's own act. Always reachable; the card
            only brightens once a week has passed, so skipping one costs
            nothing and nothing nags. */}
        <Door
          styles={styles}
          glyph={plainMode ? null : '出航'}
          name={t.sailTitle}
          line={sailOfferLine(lastSail, todayKey(), plainMode)}
          due={isDue(lastSail, todayKey())}
          onPress={() => router.push('/sail')}
        />

        {/* ------------------------------------------------------- the dream */}

        {/* The one thing on this screen that is never scaled down gets the
            king's colour thrown into the air around it. */}
        <View style={[styles.dreamCard, lit(lens.violet, plainMode ? 0 : hardening, charge)]}>
          {/* The day's charge — see `domain/hardening.ts`. */}
          <Crackle charge={charge} tint={lens.violet} seed={11} />
          {plainMode ? null : <Text style={styles.dreamWatermark}>夢</Text>}
          <Text style={styles.dreamLabel}>{t.dreamLabel}</Text>

          {editingDream ? (
            <View style={styles.form}>
              <TextInput
                value={dreamDraft}
                onChangeText={setDreamDraft}
                multiline
                autoFocus={Platform.OS !== 'web'}
                style={[styles.input, styles.inputTall]}
                placeholder={t.dreamPlaceholder}
                placeholderTextColor={palette.inkFaint}
                accessibilityLabel={t.dreamLabel}
              />
              <View style={styles.row}>
                <Pressable
                  onPress={() => setEditingDream(false)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => void saveDream()}
                  disabled={!dreamDraft.trim()}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.filled,
                    !dreamDraft.trim() && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.filledText}>Save</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              onPress={() => {
                setDreamDraft(dream?.text ?? '');
                setEditingDream(true);
              }}
              accessibilityRole="button"
              accessibilityLabel={dream ? `${t.dreamLabel}: ${dream.text}` : t.dreamSetCta}
              style={({ pressed }) => [styles.dreamBody, pressed && styles.pressed]}
            >
              {dream ? (
                <>
                  <Text style={styles.dreamText}>{dream.text}</Text>
                  <Text style={styles.dreamMeta}>
                    {/* Said, not stored. The ISO form sorts and belongs in
                        the database; printed under the dream it is a schema
                        showing through the app's own voice. */}
                    {t.dreamNamedOn(shortDay(dream.setOn, todayKey()))}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.dreamOffer}>{t.dreamPlaceholder}</Text>
                  <Text style={styles.dreamCta}>{t.dreamSetCta}</Text>
                </>
              )}
            </Pressable>
          )}
        </View>

        {/* -------------------------------------------- the road poneglyphs */}

        <View style={styles.section}>
          <SectionLabel label={t.roadLabel} />
          <Text style={styles.room}>{room.note}</Text>
        </View>

        {/* The chart, or the list.

            Four stacked stone cards were the worst screen in the app for
            words per screen — four paragraphs, four sets of buttons, and the
            shape of the journey nowhere in sight. The chart says the same
            thing in one picture: a stone per pillar, taller for what is
            astern of it, lit at the waterline when an island is at sea. Tap
            one and its full path opens, which is where the words and the
            acts live now.

            Plain mode gets the list it always had, unchanged. Same law as
            the settings archipelago: the chart is a performance, and plain
            mode is the switch that stops the app performing. */}
        {plainMode ? (
          pose.needles.map((needle, i) => (
            <Rise key={needle.road.id} delay={40 * i}>
              <NeedleCard
                needle={needle}
                wake={needle.next ? (wakes.get(needle.next.key) ?? null) : null}
                depth={needle.next ? (depths.get(needle.next.key) ?? null) : null}
                onDetail={() => router.push(`/pillar?id=${needle.road.id}`)}
                onOpen={(title) => {
                  setSaid(null);
                  void openPoneglyph(db, needle.road.key, title).then(load);
                }}
                onReached={() => {
                  if (needle.next) void reached(needle.next.id);
                }}
                onPass={(reason) => {
                  if (needle.next) void passed(needle.next.id, reason);
                }}
                onStrike={(title) => void strike(title, needle.next?.key ?? null)}
                onPort={(portBy) => {
                  if (needle.next) void setPort(db, needle.next.id, portBy).then(load);
                }}
              />
            </Rise>
          ))
        ) : (
          <>
            <View onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
              {chartW > 0 ? (
                <ChartTable
                  needles={pose.needles}
                  level={hardening}
                  canAdd={room.canAdd && !addingRoad}
                  w={chartW}
                  onStone={(roadId) => router.push(`/pillar?id=${roadId}`)}
                  onRaise={() => setAddingRoad(true)}
                />
              ) : null}
            </View>
            {/* The names the drawing does not carry. Rows, not cards — four
                cards down a screen is four paragraphs whether or not they
                have borders, which is the thing this rework was for. */}
            <View style={styles.rows}>
              {pose.needles.map((needle, i) => (
                <Rise key={needle.road.id} delay={40 * i}>
                  <PillarRow
                    needle={needle}
                    onPress={() => router.push(`/pillar?id=${needle.road.id}`)}
                  />
                </Rise>
              ))}
            </View>
          </>
        )}

        {addingRoad ? (
          <View style={styles.card}>
            {/* The flag, asked rather than enforced. There is no wrong answer,
                nothing records what you decided, and naming the pillar anyway
                costs exactly nothing. It is four seconds of thinking against
                something you already wrote down. */}
            {flagCheck(flag.length, plainMode) ? (
              <View style={styles.check}>
                <Text style={styles.checkAsk}>{flagCheck(flag.length, plainMode)}</Text>
                <Text style={styles.checkValues}>{flag.map((v) => v.text).join(' · ')}</Text>
              </View>
            ) : null}
            <Text style={styles.fieldLabel}>{t.roadTitleField}</Text>
            <TextInput
              value={roadTitle}
              onChangeText={setRoadTitle}
              autoFocus={Platform.OS !== 'web'}
              style={styles.input}
              placeholder="Strong enough for whoever is next"
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.roadTitleField}
            />
            <Text style={styles.fieldLabel}>{t.roadWhyField}</Text>
            <TextInput
              value={roadWhy}
              onChangeText={setRoadWhy}
              multiline
              style={[styles.input, styles.inputTall]}
              placeholderTextColor={palette.inkFaint}
              accessibilityLabel={t.roadWhyField}
            />
            <View style={styles.row}>
              <Pressable
                onPress={() => setAddingRoad(false)}
                accessibilityRole="button"
                style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
              >
                <Text style={styles.ghostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void saveRoad()}
                disabled={!roadTitle.trim()}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.filled,
                  !roadTitle.trim() && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.filledText}>Save</Text>
              </Pressable>
            </View>
          </View>
        ) : room.canAdd && plainMode ? (
          <Pressable
            onPress={() => setAddingRoad(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>{t.roadAdd}</Text>
          </Pressable>
        ) : null}

        {/* --------------------------------------------------- what is fixed */}
        {/* Three references, at the foot, as doors.
            They were three stacked cards up beside the Dream — a label, a
            glyph and a paragraph each, `padding: lg`, one of them saying
            "Nothing raised yet." at body size. Three hundred points of
            screen above the chart to report that two features had not been
            used yet, on the tab whose own rework note calls four stacked
            paragraph cards "the worst screen in the app for words per
            screen". They are the same three facts; a row is enough to hold
            one, and the chart earns the room. */}
        <View style={styles.doors}>
          <Door
            styles={styles}
            glyph={plainMode ? null : '不変'}
            name={t.eternalTitle}
            line={eternal.held?.text ?? poseLine(eternal, todayKey(), plainMode)}
            /* The moment this instrument exists for: nothing open under any
               pillar, and a Log Pose with nothing to point at. */
            note={allSpinning ? lostLine(eternal) : null}
            onPress={() => router.push('/eternal')}
          />
          <Door
            styles={styles}
            glyph={plainMode ? null : '旗'}
            name={t.flagTitle}
            line={flag.length === 0 ? t.flagEmpty : flag.map((v) => v.text).join(' · ')}
            onPress={() => router.push('/flag')}
          />
          <Door
            styles={styles}
            glyph={plainMode ? null : '継承'}
            name={t.carriedTitle}
            line={crew.length > 0 ? crew.join(' · ') : t.carriedEmpty}
            onPress={() => router.push('/carried')}
          />
        </View>

        {/* The model, explained — once, to somebody who has not built it yet.
            A paragraph describing the shape of the screen, standing under a
            screen that is already showing the shape, is onboarding copy that
            never leaves. */}
        {pose.needles.length === 0 ? (
          <Text style={styles.footnote}>{t.logPoseBlurb}</Text>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },

    bearing: { ...type.body, color: c.ink, lineHeight: 23 },
    said: { ...type.mono, color: c.violet, fontSize: 13 },

    dreamCard: {
      ...plate(c),
      borderColor: c.violet,
      borderTopColor: c.violet,
      backgroundColor: c.violetSoft,
      padding: space.lg,
      gap: space.sm,
      overflow: 'hidden',
    },
    // Decoration, clipped by the card. Low opacity keeps it a texture: it
    // must never compete with the dream's own words for contrast.
    dreamWatermark: {
      position: 'absolute',
      right: -space.xs,
      bottom: -space.xl,
      fontFamily: font.display,
      fontSize: 110,
      color: c.violet,
      opacity: 0.09,
    },
    dreamLabel: { ...type.label, color: c.violet },
    dreamBody: { gap: space.xs, minHeight: 44, justifyContent: 'center' },
    // The one place in the app that gets display type at this size. It is the
    // largest thing on the screen because it is the largest thing there is.
    dreamText: { fontFamily: font.displayBold, fontSize: 27, lineHeight: 31, color: c.ink },
    dreamMeta: { ...type.mono, color: c.inkFaint, fontSize: 13 },
    dreamOffer: { ...type.body, color: c.inkDim, lineHeight: 22 },
    dreamCta: { ...type.heading, fontSize: 16, color: c.violet },

    doors: {
      gap: space.sm,
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.lg,
      marginTop: space.md,
    },
    door: {
      ...row(c),
      borderColor: c.line,
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      gap: 2,
      minHeight: 56,
    },
    // Brighter only when it has come round. An offer that always shouts is a
    // nag, and this one has to survive being skipped for a month.
    doorDue: { borderColor: c.violet, backgroundColor: c.violetSoft },
    doorHead: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
    doorGlyph: { fontFamily: font.display, fontSize: 15, color: c.violet },
    doorName: { ...type.heading, fontSize: 16, color: c.ink, flex: 1 },
    doorGo: { ...type.mono, fontSize: 15, color: c.violet },
    doorLine: { ...type.small, color: c.inkDim, lineHeight: 20 },
    // Only ever shown when every needle is spinning. Quiet on purpose: it
    // is a fact about the instrument, not a nudge about the week.
    doorNote: { ...type.mono, fontSize: 13, color: c.violet, marginTop: space.xs },

    // The question rides a violet rail, the same mark the live island wears:
    // this is the flag speaking, not the form.
    check: {
      borderLeftWidth: 2,
      borderLeftColor: c.violet,
      paddingLeft: space.md,
      gap: space.xs,
      marginBottom: space.xs,
    },
    checkAsk: { ...type.body, color: c.ink, lineHeight: 21 },
    checkValues: { ...type.mono, color: c.violet },

    section: { gap: space.xs, marginTop: space.sm },
    // The rows carry their own rule; the screen's gap would double it.
    rows: { marginTop: -space.xs },
    sectionLabel: { ...type.label, color: c.inkFaint },
    room: { ...type.small, color: c.inkDim, lineHeight: 19 },

    card: {
      ...row(c),
      padding: space.lg,
      gap: space.sm,
    },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 12 },
    form: { gap: space.sm },
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

    row: { flexDirection: 'row', gap: space.sm },
    filled: {
      flex: 1,
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 16, color: c.onAccent },
    ghost: {
      flex: 1,
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

    add: {
      ...offer(c),
      paddingVertical: space.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: { ...type.heading, color: c.inkDim },

    footnote: { ...type.small, color: c.inkFaint, lineHeight: 18, marginTop: space.sm },
    pressed: { ...press },
  });
