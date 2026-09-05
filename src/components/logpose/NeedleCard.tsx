import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { needleLine, reachedLine, type Needle } from '../../domain/logpose';
import { wakeLine } from '../../domain/tasks';
import { formatSounding, type Sounding } from '../../domain/soundings';
import { useHaki } from '../../state/HakiProvider';
import { parseDay, portLine } from '../../domain/pressing';
import { todayKey, type DayKey } from '../../domain/date';
import { font, radius, space, type } from '../../theme/tokens';
import { press, row } from '../../theme/surfaces';
import { Stone } from '../instruments/Stone';
import { underCrew } from '../../theme/palettes';
import type { Palette } from '../../theme/palettes';

/**
 * One Road Poneglyph, read: what it points at, and the two ways off it.
 *
 * The card is built around a single rule — **there is one island under this
 * pillar or there is none.** No list, no "up next", no backlog of things you
 * might do here one day. A Log Pose points at the next island only and does
 * not recalibrate until you have arrived, and the WIP limit is the treatment
 * for the failure mode this whole feature exists to treat: things do not go
 * unfinished because anyone decided to stop, they go unfinished because the
 * loop never closed and nothing ever made you say so.
 *
 * So closing it is the only way forward, and there are exactly two doors,
 * side by side, both always open:
 *
 *   **Reached** — one tap. Fires the Conqueror's burst upstream.
 *   **Sail past** — one tap, then a reason. Never graded, never called
 *   quitting, but never free either: you have to write the line.
 *
 * The asymmetry is deliberate and it is the only place in this app that makes
 * anything harder on purpose. Arriving is a tap because arriving has already
 * cost you weeks. Sailing past costs one sentence, because a decision you
 * cannot be bothered to write down is not a decision, it is the drift wearing
 * a different coat.
 *
 * ---
 *
 * **The card is the stone.** A Road Poneglyph is red rock in canon and an
 * ordinary Poneglyph is blue, which is a hierarchy this feature already had
 * and was drawing in borders: the pillar is the red slab, and the island at
 * sea under it is a blue slab set into it. Nothing needs explaining after
 * that — the two are never confusable, and the thing you are looking at
 * looks like the thing it is named after. Plain mode drops both back to
 * ordinary cards, because a texture is a performance.
 *
 * The inscription is seeded from the pillar's own title, so each one carries
 * its own permanent glyphs — rename it and the stone is recut, which is
 * correct: it is a different sentence now.
 *
 * **Strike it** is the third door and the one that gets used daily: it takes
 * the island — which is weeks wide and not strikeable — and turns it into one
 * concrete thing on today's list. Vague and enormous in, one strikeable thing
 * out. That is Armament's defining trick, and the Log Pose is where the vague
 * and enormous actually lives.
 */

type Mode = 'idle' | 'naming' | 'passing' | 'striking' | 'porting';

/**
 * The head: what pillar this is, and why the dream needs it.
 *
 * `named` is false on the pillar's own screen, where the navigation header
 * is already carrying the title — the same words twice, a hundred points
 * apart and both at display weight, is the tab-labels-drawn-twice bug with
 * a different label in it. The reason stays, because the header does not
 * carry that, and it is the only thing this card says about the pillar
 * there.
 */
function Head({
  needle,
  styles,
  plainMode,
  named,
}: {
  needle: Needle;
  styles: ReturnType<typeof makeStyles>;
  plainMode: boolean;
  named: boolean;
}) {
  return (
    <>
      <View style={styles.headText}>
        {named ? <Text style={styles.title}>{needle.road.title}</Text> : null}
        {needle.road.why ? (
          <Text style={styles.why} numberOfLines={2}>
            {needle.road.why}
          </Text>
        ) : null}
      </View>
      {plainMode ? null : <Text style={styles.glyph}>道</Text>}
    </>
  );
}

export function NeedleCard({
  needle,
  wake = null,
  depth = null,
  onOpen,
  onReached,
  onPass,
  onStrike,
  onPort,
  onDetail,
}: {
  needle: Needle;
  /** What has been struck under the open island so far, if anything. */
  wake?: { struck: number; minutes: number } | null;
  /** The island's most recent sounding, when it is one that takes them. */
  depth?: Sounding | null;
  onOpen: (title: string) => void;
  onReached: () => void;
  onPass: (reason: string) => void;
  onStrike: (title: string) => void;
  /**
   * Set or clear the island's port of call. Left off where the card is read
   * only — a control that cannot be honoured should not be drawn.
   */
  onPort?: (portBy: DayKey | null) => void;
  /**
   * The way through to the pillar's own screen. Left off when the card is
   * already mounted *on* that screen — a header that navigates to where you
   * are standing is a dead control, and it takes a 44pt target with it.
   */
  onDetail?: () => void;
}) {
  const { t, palette, plainMode, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  // Stone is a ground of its own: it does not move with the palette, so
  // everything written on it takes its colours from the stone rather than
  // from the day.
  const styles = useMemo(() => makeStyles(lens, !plainMode), [lens, plainMode]);

  const [mode, setMode] = useState<Mode>('idle');
  const [draft, setDraft] = useState('');

  const today = todayKey();
  const port = needle.next ? portLine(needle.next.portBy, today, plainMode) : null;

  /**
   * Whether this card is standing on the pillar's own screen.
   *
   * `onDetail` is the tell: a card that can navigate to the pillar is not
   * already on it. There the screen says several of these things better —
   * the header carries the title, the Astern section carries the count, and
   * the soundings card carries the reading at four times this size — so the
   * card stops repeating them. Everywhere else it is the only thing on
   * screen and says the lot.
   */
  const onOwnScreen = onDetail === undefined;

  const ready = draft.trim().length > 0;
  function commit(run: (value: string) => void) {
    if (!ready) return;
    run(draft.trim());
    setDraft('');
    setMode('idle');
  }
  function open(next: Mode) {
    setDraft('');
    setMode(next);
  }

  return (
    <View style={[styles.card, !plainMode && styles.stoneCard]}>
      {plainMode ? null : (
        <Stone
          seed={needle.road.title}
          body={palette.stoneRoad}
          carve={palette.stoneRoadCarve}
          lip={palette.stoneRoadLip}
          moss={palette.moss}
        />
      )}
      {/* The header is the way into the pillar's own screen: its history, its
          reasons, and the only place it can be retired. On that screen it is
          a plain heading instead — see `onDetail`. */}
      {onDetail ? (
        <Pressable
          onPress={onDetail}
          accessibilityRole="button"
          accessibilityLabel={`${needle.road.title}, history and settings`}
          style={({ pressed }) => [styles.head, pressed && styles.pressed]}
        >
          <Head needle={needle} styles={styles} plainMode={plainMode} named />
        </Pressable>
      ) : (
        <View style={styles.head}>
          <Head needle={needle} styles={styles} plainMode={plainMode} named={false} />
        </View>
      )}

      <View style={styles.rule} />

      {needle.next ? (
        <View style={[styles.island, !plainMode && styles.islandStone]}>
          {plainMode ? null : (
            <Stone
              seed={`${needle.road.title}~${needle.next.title}`}
              body={palette.stoneIsle}
              carve={palette.stoneIsleCarve}
              lip={palette.stoneIsleLip}
              moss={palette.moss}
              round={radius.sm}
            />
          )}
          {/* Two Texts, not one string. The label face is IBM Plex Mono,
              which has no CJK — a kanji inside it falls through to whatever
              the system has and lands on a different baseline at a different
              size. The glyph gets the display face and its own box. */}
          <View style={styles.islandLabelRow}>
            {plainMode ? null : <Text style={styles.islandGlyph}>島</Text>}
            <Text style={styles.islandLabel}>{t.islandLabel}</Text>
          </View>
          <Text style={styles.islandTitle}>{needle.next.title}</Text>
          <Text style={styles.atSea}>{needleLine(needle, plainMode)}</Text>
          {/* The port of call: a real day this has to be reached by, when
              there is one. Counting toward and still counting after — never
              red, because a port you have not made is not a breach. Drawn in
              the stone's own light, like everything else cut into it. */}
          {port ? <Text style={styles.port}>{port}</Text> : null}
          {/* The wake so far: strikes under this island, visible while the
              work happens rather than only at arrival. Absent until
              something has actually been struck. */}
          {wake && wakeLine(wake) ? <Text style={styles.wake}>{wakeLine(wake)}</Text> : null}
          {/* Where the line last touched bottom. A reading, with nothing
              beside it saying whether it is the right one. */}
          {depth && needle.next.unit ? (
            <Text style={styles.depth}>{formatSounding(depth.value, needle.next.unit)}</Text>
          ) : null}

          {mode === 'porting' ? (
            <View style={styles.form}>
              {/* Reads 15, 9/15, sep 15 — the same parser the task dates use,
                  and it refuses rather than guessing. */}
              <Text style={styles.fieldLabel}>{t.portField}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus={Platform.OS !== 'web'}
                style={styles.input}
                placeholder="15, 9/15, sep 15"
                placeholderTextColor={palette.inkFaint}
                accessibilityLabel={t.portField}
              />
              <Text style={styles.portEcho}>
                {draft.trim().length === 0
                  ? t.portClearHint
                  : (portLine(parseDay(draft, today), today, plainMode) ?? 'Not a date')}
              </Text>
              <View style={styles.row}>
                <Pressable
                  onPress={() => setMode('idle')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    // Empty clears it, which costs nothing — a date you
                    // decided was arbitrary is not a decision worth a line.
                    const next = draft.trim().length === 0 ? null : parseDay(draft, today);
                    if (draft.trim().length > 0 && next === null) return;
                    setDraft('');
                    setMode('idle');
                    onPort?.(next);
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>
                    {draft.trim().length === 0 ? t.portClear : t.portSet}
                  </Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          {mode === 'passing' ? (
            <View style={styles.form}>
              {/* The reason is required, and this is the one place in the app
                  where a button stays disabled until something is typed. */}
              <Text style={styles.fieldLabel}>{t.islandPassReason}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                multiline
                autoFocus={Platform.OS !== 'web'}
                style={[styles.input, styles.inputTall]}
                placeholder="It stopped being the right thing."
                placeholderTextColor={palette.inkFaint}
                accessibilityLabel={t.islandPassReason}
              />
              <View style={styles.row}>
                <Pressable
                  onPress={() => setMode('idle')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => commit(onPass)}
                  disabled={!ready}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.ghost,
                    styles.danger,
                    !ready && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.dangerText}>{t.islandPassConfirm}</Text>
                </Pressable>
              </View>
            </View>
          ) : mode === 'striking' ? (
            <View style={styles.form}>
              <Text style={styles.fieldLabel}>{t.strikeIt}</Text>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                autoFocus={Platform.OS !== 'web'}
                style={styles.input}
                placeholder={t.strikePlaceholder}
                placeholderTextColor={palette.inkFaint}
                accessibilityLabel={t.strikePlaceholder}
                onSubmitEditing={() => commit(onStrike)}
                returnKeyType="done"
              />
              <View style={styles.row}>
                <Pressable
                  onPress={() => setMode('idle')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={() => commit(onStrike)}
                  disabled={!ready}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.filled,
                    !ready && styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.filledText}>{t.addToToday}</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <Pressable
                  onPress={onReached}
                  accessibilityRole="button"
                  accessibilityLabel={`${t.islandReached}: ${needle.next.title}`}
                  style={({ pressed }) => [styles.filled, pressed && styles.pressed]}
                >
                  <Text style={styles.filledText}>{t.islandReached}</Text>
                </Pressable>
                <Pressable
                  onPress={() => open('passing')}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
                >
                  <Text style={styles.ghostText}>{t.islandPass}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => open('striking')}
                accessibilityRole="button"
                style={({ pressed }) => [styles.strike, pressed && styles.pressed]}
              >
                <Text style={styles.strikeText}>{t.strikeIt}</Text>
              </Pressable>
              {/* Quiet, and below the acts: a date is optional on an island
                  and most will never carry one. Reaching it stays the loud
                  thing on this card. */}
              {onPort ? (
                <Pressable
                  onPress={() => {
                    setDraft('');
                    setMode('porting');
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.portDoor, pressed && styles.pressed]}
                >
                  <Text style={styles.portDoorText}>{port ? t.portChange : t.portAdd}</Text>
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      ) : mode === 'naming' ? (
        <View style={styles.form}>
          <Text style={styles.fieldLabel}>{t.islandAdd}</Text>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            autoFocus={Platform.OS !== 'web'}
            style={styles.input}
            placeholder={t.islandPlaceholder}
            placeholderTextColor={palette.inkFaint}
            accessibilityLabel={t.islandAdd}
            onSubmitEditing={() => commit(onOpen)}
            returnKeyType="done"
          />
          <View style={styles.row}>
            <Pressable
              onPress={() => setMode('idle')}
              accessibilityRole="button"
              style={({ pressed }) => [styles.ghost, pressed && styles.pressed]}
            >
              <Text style={styles.ghostText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={() => commit(onOpen)}
              disabled={!ready}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.filled,
                !ready && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.filledText}>Set it</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.island}>
          {/* The offer, never the absence — the same rule the practice card
              runs on. An empty pillar says what would go here. */}
          <Text style={styles.spinning}>{needleLine(needle, plainMode)}</Text>
          {/* Outlined rather than filled. Four pillars with nothing under them
              is the ordinary state of a fresh Log Pose, and four full-width
              violet slabs down the screen reads as four things overdue. An
              offer should look like an offer. */}
          <Pressable
            onPress={() => open('naming')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.ghost, styles.invite, pressed && styles.pressed]}
          >
            <Text style={styles.inviteText}>{t.islandAdd}</Text>
          </Pressable>
        </View>
      )}

      {needle.reached > 0 && !onOwnScreen ? (
        <Text style={styles.astern}>{reachedLine(needle.reached, plainMode)}</Text>
      ) : null}
    </View>
  );
}

/**
 * Two grounds, one card.
 *
 * On stone every colour comes from the slab — `onStone` at a few opacities
 * for the hierarchy, and the lens colour kept for exactly two things: the
 * kanji marks and the filled button. A violet label on dark red rock
 * measures under the text floor and looks like a mistake; a violet *button*
 * on it is the brightest thing on the card, which is what a call to action
 * is for.
 *
 * In plain mode there is no stone and this is the ordinary card it always
 * was, unchanged.
 */
const makeStyles = (c: Palette, stone: boolean) => {
  const ink = stone ? c.onStone : c.ink;
  const dim = stone ? c.onStone : c.inkDim;
  const faint = stone ? c.onStone : c.inkFaint;
  // Hierarchy on stone is opacity, because the slab only supplies one ink.
  const dimO = stone ? 0.78 : 1;
  const faintO = stone ? 0.62 : 1;

  return StyleSheet.create({
    card: {
      ...row(c),
      padding: space.lg,
      gap: space.md,
    },
    // The slab is an absolutely-filled SVG, so the card has to clip it and
    // supply nothing of its own behind it.
    stoneCard: {
      backgroundColor: c.stoneRoad,
      borderColor: c.stoneRoadCarve,
      overflow: 'hidden',
      // Rock has weight. This is the one place a card in this app is
      // allowed to sit off the page rather than on it.
      shadowColor: c.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 5,
    },

    head: { flexDirection: 'row', gap: space.md, minHeight: 44 },
    headText: { flex: 1, gap: space.xs, justifyContent: 'center' },
    title: { fontFamily: font.displayBold, fontSize: 21, color: ink, lineHeight: 24 },
    why: { ...type.small, color: faint, opacity: faintO, lineHeight: 18 },
    glyph: {
      fontFamily: font.display,
      fontSize: 24,
      color: stone ? c.onStone : c.violet,
      opacity: stone ? 0.55 : 1,
      alignSelf: 'center',
    },

    rule: { height: 1, backgroundColor: stone ? c.stoneRoadCarve : c.lineSoft, opacity: 0.7 },

    // The rail marks the needle's live edge: this is the one part of the
    // card that is at sea rather than on record. On stone the island is a
    // slab of its own, so the rail becomes the seam around it.
    island: {
      gap: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.violet,
      paddingLeft: space.md,
    },
    islandStone: {
      borderLeftWidth: 0,
      padding: space.md,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.stoneIsleCarve,
      borderTopColor: c.stoneIsleLip,
      backgroundColor: c.stoneIsle,
      overflow: 'hidden',
    },
    islandLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
    islandGlyph: {
      fontFamily: font.display,
      fontSize: 14,
      color: stone ? c.onStone : c.violet,
    },
    islandLabel: {
      ...type.label,
      color: stone ? c.onStone : c.violet,
      opacity: stone ? 0.72 : 1,
      fontSize: 12,
    },
    islandTitle: { ...type.title, fontSize: 23, color: ink, lineHeight: 27 },
    atSea: { ...type.mono, color: faint, opacity: faintO, fontSize: 13 },
    // Cut in the stone's own light, like everything else on the slab — a
    // lens colour on dark rock measures under the contrast floor.
    port: { ...type.mono, color: faint, opacity: 1, fontSize: 13, marginTop: 2 },
    portEcho: { ...type.mono, color: faint, opacity: faintO, fontSize: 12 },
    portDoor: { minHeight: 44, justifyContent: 'center', alignItems: 'center' },
    portDoorText: { ...type.mono, color: faint, opacity: faintO, fontSize: 13 },
    wake: { ...type.mono, color: stone ? c.onStone : c.violet, opacity: dimO, fontSize: 13 },
    depth: {
      fontFamily: font.displayBold,
      fontSize: 19,
      color: ink,
      fontVariant: ['tabular-nums'],
    },
    spinning: { ...type.body, color: dim, opacity: dimO, lineHeight: 22 },
    astern: { ...type.mono, color: faint, opacity: faintO, fontSize: 13 },

    form: { gap: space.sm },
    fieldLabel: { ...type.label, color: faint, opacity: faintO, fontSize: 12 },
    input: {
      ...type.body,
      color: ink,
      backgroundColor: stone ? c.stoneIsleCarve : c.surface2,
      borderWidth: 1,
      borderColor: stone ? c.stoneIsleLip : c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
      minHeight: 44,
    },
    inputTall: { minHeight: 76, textAlignVertical: 'top' },

    row: { flexDirection: 'row', gap: space.sm },
    // On stone the call to action is bone, not violet. A bright violet slab
    // on blue rock is two loud materials arguing; the same button cut in the
    // stone's own light reads as part of the object, and is still the
    // brightest thing on the card — which is all a primary action needs to
    // be. Plain mode has no stone and keeps the lens colour.
    filled: {
      flex: 1,
      backgroundColor: stone ? c.onStone : c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: {
      ...type.heading,
      fontSize: 16,
      color: stone ? c.stoneIsleCarve : c.onAccent,
    },
    ghost: {
      flex: 1,
      borderWidth: 1,
      borderColor: stone ? c.onStone : c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ghostText: { ...type.heading, fontSize: 16, color: dim, opacity: dimO },
    // Not a warning colour and not red-for-failure: sailing past is allowed.
    // It is bordered rather than filled so the two doors are visibly not the
    // same weight, which is the only ranking this card does.
    danger: { borderColor: stone ? c.onStone : c.violet },
    dangerText: { ...type.heading, fontSize: 16, color: stone ? c.onStone : c.violet },
    invite: { borderColor: stone ? c.onStone : c.violet, borderStyle: 'dashed' },
    inviteText: { ...type.heading, fontSize: 16, color: stone ? c.onStone : c.violet },
    disabled: { opacity: 0.4 },

    strike: {
      borderWidth: 1,
      borderColor: stone ? c.stoneIsleLip : c.line,
      borderStyle: 'dashed',
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    strikeText: { ...type.mono, color: dim, opacity: dimO, fontSize: 13 },
    pressed: { ...press },
  });
};
