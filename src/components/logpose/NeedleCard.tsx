import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { needleLine, reachedLine, type Needle } from '../../domain/logpose';
import { wakeLine } from '../../domain/tasks';
import { formatSounding, type Sounding } from '../../domain/soundings';
import { useHaki } from '../../state/HakiProvider';
import { font, radius, space, type } from '../../theme/tokens';
import { press, row } from '../../theme/surfaces';
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
 * **Strike it** is the third door and the one that gets used daily: it takes
 * the island — which is weeks wide and not strikeable — and turns it into one
 * concrete thing on today's list. Vague and enormous in, one strikeable thing
 * out. That is Armament's defining trick, and the Log Pose is where the vague
 * and enormous actually lives.
 */

type Mode = 'idle' | 'naming' | 'passing' | 'striking';

export function NeedleCard({
  needle,
  wake = null,
  depth = null,
  onOpen,
  onReached,
  onPass,
  onStrike,
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
  onDetail: () => void;
}) {
  const { t, palette, plainMode, crew } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew.conquerors), [palette, crew]);
  const styles = useMemo(() => makeStyles(lens), [lens]);

  const [mode, setMode] = useState<Mode>('idle');
  const [draft, setDraft] = useState('');

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
    <View style={styles.card}>
      {/* The header is the way into the pillar's own screen: its history, its
          reasons, and the only place it can be retired. */}
      <Pressable
        onPress={onDetail}
        accessibilityRole="button"
        accessibilityLabel={`${needle.road.title}, history and settings`}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View style={styles.headText}>
          <Text style={styles.title}>{needle.road.title}</Text>
          {needle.road.why ? (
            <Text style={styles.why} numberOfLines={2}>
              {needle.road.why}
            </Text>
          ) : null}
        </View>
        {plainMode ? null : <Text style={styles.glyph}>道</Text>}
      </Pressable>

      <View style={styles.rule} />

      {needle.next ? (
        <View style={styles.island}>
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
          {/* The wake so far: strikes under this island, visible while the
              work happens rather than only at arrival. Absent until
              something has actually been struck. */}
          {wake && wakeLine(wake) ? <Text style={styles.wake}>{wakeLine(wake)}</Text> : null}
          {/* Where the line last touched bottom. A reading, with nothing
              beside it saying whether it is the right one. */}
          {depth && needle.next.unit ? (
            <Text style={styles.depth}>{formatSounding(depth.value, needle.next.unit)}</Text>
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

      {needle.reached > 0 ? (
        <Text style={styles.astern}>{reachedLine(needle.reached, plainMode)}</Text>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      ...row(c),
      padding: space.lg,
      gap: space.md,
    },
    // The row is 44 tall whatever is in it, and a pillar with no "why" under a
    // one-line title only fills 24 of that. Left top-aligned, the slack all
    // fell below the title and opened a hole above the rule on exactly the
    // cards with the least in them. Stretching the text block and centring
    // inside it splits the slack instead, so short and tall cards space the
    // same.
    head: { flexDirection: 'row', gap: space.md, minHeight: 44 },
    headText: { flex: 1, gap: space.xs, justifyContent: 'center' },
    title: { fontFamily: font.displayBold, fontSize: 19, color: c.ink, lineHeight: 24 },
    why: { ...type.small, color: c.inkFaint, lineHeight: 18 },
    glyph: { fontFamily: font.display, fontSize: 22, color: c.violet, alignSelf: 'center' },

    rule: { height: 1, backgroundColor: c.lineSoft },

    // The rail marks the needle's live edge: this is the one part of the
    // card that is at sea rather than on record.
    island: {
      gap: space.sm,
      borderLeftWidth: 2,
      borderLeftColor: c.violet,
      paddingLeft: space.md,
    },
    islandLabelRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
    islandGlyph: { fontFamily: font.display, fontSize: 13, color: c.violet },
    islandLabel: { ...type.label, color: c.violet, fontSize: 11 },
    islandTitle: { ...type.title, fontSize: 21, color: c.ink, lineHeight: 27 },
    atSea: { ...type.mono, color: c.inkFaint, fontSize: 12 },
    wake: { ...type.mono, color: c.violet, fontSize: 12 },
    depth: {
      fontFamily: font.displayBold,
      fontSize: 17,
      color: c.ink,
      fontVariant: ['tabular-nums'],
    },
    spinning: { ...type.body, color: c.inkDim, lineHeight: 22 },
    astern: { ...type.mono, color: c.inkFaint, fontSize: 12 },

    form: { gap: space.sm },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 11 },
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
    // Not a warning colour and not red-for-failure: sailing past is allowed.
    // It is bordered rather than filled so the two doors are visibly not the
    // same weight, which is the only ranking this card does.
    danger: { borderColor: c.violet },
    dangerText: { ...type.heading, fontSize: 15, color: c.violet },
    invite: { borderColor: c.violet, borderStyle: 'dashed' },
    inviteText: { ...type.heading, fontSize: 15, color: c.violet },
    disabled: { opacity: 0.4 },

    strike: {
      borderWidth: 1,
      borderColor: c.line,
      borderStyle: 'dashed',
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    strikeText: { ...type.mono, color: c.inkDim, fontSize: 12 },
    pressed: { ...press },
  });
