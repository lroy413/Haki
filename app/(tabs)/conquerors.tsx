import { useCallback, useMemo, useState } from 'react';
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
  listCarried,
  listPoneglyphs,
  listRoads,
  openPoneglyph,
  setDream,
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
import { todayKey } from '../../src/domain/date';
import { fireConquerors } from '../../src/impact';
import { play } from '../../src/sound';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { NeedleCard } from '../../src/components/logpose/NeedleCard';
import { useHaki } from '../../src/state/HakiProvider';
import { font, radius, space, type } from '../../src/theme/tokens';
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
export default function ConquerorsScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { t, palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();

  const [dream, setDreamState] = useState<{ text: string; setOn: string } | null>(null);
  const [roads, setRoads] = useState<Road[]>([]);
  const [glyphs, setGlyphs] = useState<Poneglyph[]>([]);
  const [crew, setCrew] = useState<string[]>([]);

  const [editingDream, setEditingDream] = useState(false);
  const [dreamDraft, setDreamDraft] = useState('');
  const [addingRoad, setAddingRoad] = useState(false);
  const [roadTitle, setRoadTitle] = useState('');
  const [roadWhy, setRoadWhy] = useState('');
  /** The one line that speaks after something closes. Cleared on the next act. */
  const [said, setSaid] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, r, g, people] = await Promise.all([
      getDream(db),
      listRoads(db),
      listPoneglyphs(db),
      listCarried(db),
    ]);
    setDreamState(d);
    setRoads(r);
    setGlyphs(g);
    setCrew(people.map((p) => p.name));
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

  async function saveDream() {
    if (!dreamDraft.trim()) return;
    await setDream(db, dreamDraft);
    setEditingDream(false);
    setSaid(null);
    await load();
  }

  async function saveRoad() {
    if (!roadTitle.trim()) return;
    await addRoad(db, roadTitle, roadWhy || null);
    setRoadTitle('');
    setRoadWhy('');
    setAddingRoad(false);
    setSaid(null);
    await load();
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

  async function strike(title: string) {
    // Straight onto today, not the backlog. The point of striking an island is
    // that the enormous thing produced one move you can make before tonight.
    await addTask(db, title, 15, todayKey());
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
        <PageHeading title={t.logPoseTitle} trailing={plainMode ? undefined : '覇王色'} />

        <Text style={styles.bearing}>{bearing(pose, plainMode)}</Text>
        {said ? <Text style={styles.said}>{said}</Text> : null}

        {/* ------------------------------------------------------- the dream */}

        <View style={styles.dreamCard}>
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
                  <Text style={styles.dreamMeta}>{t.dreamNamedOn(dream.setOn)}</Text>
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
          <Text style={styles.sectionLabel}>{t.roadLabel}</Text>
          <Text style={styles.room}>{room.note}</Text>
        </View>

        {pose.needles.map((needle) => (
          <NeedleCard
            key={needle.road.id}
            needle={needle}
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
            onStrike={(title) => void strike(title)}
          />
        ))}

        {addingRoad ? (
          <View style={styles.card}>
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
        ) : room.canAdd ? (
          <Pressable
            onPress={() => setAddingRoad(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          >
            <Text style={styles.addText}>{t.roadAdd}</Text>
          </Pressable>
        ) : null}

        {/* ---------------------------------------------------- inherited will */}

        <Pressable
          onPress={() => router.push('/carried')}
          accessibilityRole="button"
          accessibilityLabel={t.carriedTitle}
          style={({ pressed }) => [styles.crew, pressed && styles.pressed]}
        >
          <View style={styles.crewHead}>
            <Text style={styles.sectionLabel}>{t.carriedTitle}</Text>
            {plainMode ? null : <Text style={styles.crewGlyph}>継承</Text>}
          </View>
          <Text style={styles.crewBody}>
            {crew.length > 0 ? crew.join(' · ') : t.carriedEmpty}
          </Text>
        </Pressable>

        <Text style={styles.footnote}>{t.logPoseBlurb}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },

    bearing: { ...type.body, color: c.ink, lineHeight: 23 },
    said: { ...type.mono, color: c.violet, fontSize: 12 },

    dreamCard: {
      backgroundColor: c.violetSoft,
      borderWidth: 1,
      borderColor: c.violet,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.sm,
    },
    dreamLabel: { ...type.label, color: c.violet },
    dreamBody: { gap: space.xs, minHeight: 44, justifyContent: 'center' },
    // The one place in the app that gets display type at this size. It is the
    // largest thing on the screen because it is the largest thing there is.
    dreamText: { fontFamily: font.displayBold, fontSize: 25, lineHeight: 31, color: c.ink },
    dreamMeta: { ...type.mono, color: c.inkFaint, fontSize: 11 },
    dreamOffer: { ...type.body, color: c.inkDim, lineHeight: 22 },
    dreamCta: { ...type.heading, fontSize: 15, color: c.violet },

    section: { gap: space.xs, marginTop: space.sm },
    sectionLabel: { ...type.label, color: c.inkFaint },
    room: { ...type.small, color: c.inkDim, lineHeight: 19 },

    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.sm,
    },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 10 },
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
    filledText: { ...type.heading, fontSize: 15, color: c.onAccent },
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
    ghostText: { ...type.heading, fontSize: 15, color: c.inkDim },
    disabled: { opacity: 0.4 },

    add: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.md,
      paddingVertical: space.lg,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: { ...type.heading, color: c.inkDim },

    crew: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingTop: space.lg,
      marginTop: space.lg,
      gap: space.xs,
      minHeight: 44,
    },
    crewHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    crewGlyph: { fontFamily: font.display, fontSize: 15, color: c.violet },
    crewBody: { ...type.body, color: c.inkDim, lineHeight: 21 },

    footnote: { ...type.small, color: c.inkFaint, lineHeight: 18, marginTop: space.sm },
    pressed: { opacity: 0.75 },
  });
