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
import { useFocusEffect, useLocalSearchParams, useNavigation } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/db/client';
import {
  listPoneglyphs,
  listRoads,
  reopenPoneglyph,
  retireRoad,
  updateRoad,
  wakesFor,
} from '../src/db/repo';
import { reachedLine, stateName, type Poneglyph, type Road } from '../src/domain/logpose';
import { wakeLine } from '../src/domain/tasks';
import { useHaki } from '../src/state/HakiProvider';
import { font, radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
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
  const { t, palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const insets = useSafeAreaInsets();

  const roadId = Number(id);
  const [road, setRoad] = useState<Road | null>(null);
  const [astern, setAstern] = useState<Poneglyph[]>([]);
  const [wakes, setWakes] = useState<Map<number, { struck: number; minutes: number }>>(
    new Map(),
  );
  const [hasOpen, setHasOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [why, setWhy] = useState('');

  const load = useCallback(async () => {
    const [roads, glyphs] = await Promise.all([listRoads(db), listPoneglyphs(db)]);
    const mine = roads.find((r) => r.id === roadId) ?? null;
    setRoad(mine);
    if (mine) {
      setTitle(mine.title);
      setWhy(mine.why ?? '');
      navigation.setOptions({ title: mine.title });
      const under = glyphs.filter((g) => g.roadKey === mine.key);
      setHasOpen(under.some((g) => g.state === 'open'));
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

  if (!road) {
    return (
      <View style={styles.screen}>
        <Text style={styles.gone}>This one is no longer here.</Text>
      </View>
    );
  }

  const dirty = title.trim() !== road.title || why.trim() !== (road.why ?? '');
  const reached = astern.filter((g) => g.state === 'reached').length;

  async function save() {
    if (!title.trim() || !dirty) return;
    await updateRoad(db, roadId, { title: title.trim(), why: why.trim() || null });
    await load();
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, space.md) + space.lg },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {road.retired ? <Text style={styles.retiredFlag}>{t.roadRetired}</Text> : null}

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
          {dirty ? (
            <Pressable
              onPress={() => void save()}
              disabled={!title.trim()}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.filled,
                !title.trim() && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.filledText}>Save</Text>
            </Pressable>
          ) : null}
        </View>

        {/* ------------------------------------------------------------ astern */}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t.islandHistory}</Text>
          <Text style={styles.sectionNote}>{reachedLine(reached, plainMode)}</Text>
        </View>

        {astern.length === 0 ? (
          <Text style={styles.empty}>
            {plainMode
              ? 'Nothing closed under this yet.'
              : 'No islands astern yet. The first one is the one you are sailing to.'}
          </Text>
        ) : null}

        {astern.map((island) => (
          <View key={island.id} style={styles.card}>
            <Text style={styles.islandTitle}>{island.title}</Text>
            {/* State and date on one mono line rather than a stamp floated
                beside the title. "Sailed past" is two words and wrapped into a
                column against a title that was wrapping too, which read as two
                competing headings on one card. */}
            <Text style={island.state === 'reached' ? styles.stampReached : styles.stampPassed}>
              {stateName(island.state, plainMode)} · {island.closedOn}
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

    islandTitle: { fontFamily: font.displayBold, fontSize: 17, color: c.ink, lineHeight: 22 },
    stampReached: { ...type.mono, color: c.violet, fontSize: 11 },
    wake: { ...type.mono, color: c.inkFaint, fontSize: 11 },
    // Not a warning colour. Sailing past is allowed and the record of it is
    // not a mark against anybody — it reads quieter than reaching, and that is
    // the only difference the styling is permitted to make.
    stampPassed: { ...type.mono, color: c.inkFaint, fontSize: 11 },
    quiet: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    quietText: { ...type.mono, color: c.inkDim, fontSize: 12 },
    reason: { ...type.body, color: c.inkDim, lineHeight: 21, fontStyle: 'italic' },

    filled: {
      backgroundColor: c.violet,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filledText: { ...type.heading, fontSize: 15, color: c.onAccent },
    ghost: {
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
