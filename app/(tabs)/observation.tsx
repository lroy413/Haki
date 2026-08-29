import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { PageHeading, useTabInsets } from '../../src/components/PageHeading';
import { useStore } from '../../src/db/client';
import { listEntries, asternToday } from '../../src/db/repo';
import type { EntryRow } from '../../src/db/schema';
import { useHaki } from '../../src/state/HakiProvider';
import { daysAtSea, shortDay } from '../../src/domain/date';
import { LogLine } from '../../src/components/LogLine';
import { historyForForesight } from '../../src/db/repo';
import {
  findingLine,
  foresight,
  stateMessage as foresightMessage,
  type Foresight,
} from '../../src/domain/foresight';
import { addDays, todayKey } from '../../src/domain/date';
import { futureSight, openness, stateMessage, stateName } from '../../src/domain/observation';
import { Eyes } from '../../src/components/instruments/Eyes';
import { Water } from '../../src/components/instruments/Water';
import { font, radius, space, type } from '../../src/theme/tokens';
import { lit, plate, press, row } from '../../src/theme/surfaces';
import { SectionLabel } from '../../src/components/SectionLabel';
import { asternLine, type Astern } from '../../src/domain/astern';
import type { Palette } from '../../src/theme/palettes';

/** How much the floating button takes on top of the bar's own clearance. */
const FAB_ROOM = 72;

/**
 * 見聞色 — Observation. The mental-health space.
 *
 * The owner's framing, and the tab is organised by it: this is where clarity
 * is built and read. The reading sits at the top — the practice and the
 * condition, and which of them is doing the limiting. Stillness is the
 * practice's door. The journal is the rest of the page, because writing is
 * how a day gets looked at, and it lives here now rather than on a tab of its
 * own. (The home screen keeps a quick line in — the door that asks nothing
 * should be one tap from anywhere the day starts.)
 *
 * The journal's two doors survive the move, and the small one is still the
 * point. The button at the bottom opens the editor — a full screen with a
 * cursor in an empty document, which is a demand for a subject and a length
 * and a reason to have opened it. The field above asks for none of that: one
 * line, typed where you already are, folded into today's entry. See
 * `domain/logbook.ts`.
 */
export default function ObservationScreen() {
  const router = useRouter();
  const { db, settings } = useStore();
  const { t, palette, refresh, observation, acts, plainMode, hardening } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const pad = useTabInsets();
  // A lens's material is a performance: plain mode gets none, and paper
  // catches nothing — a plate on parchment is parchment.
  const material = !plainMode && hardening > 0;

  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [reading, setReading] = useState<Foresight | null>(null);
  const [astern, setAstern] = useState<Astern | null>(null);

  const load = useCallback(async () => {
    const [rows, back] = await Promise.all([listEntries(db), asternToday(db)]);
    setEntries(rows);
    setAstern(back);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void (async () => {
        const [rows, back] = await Promise.all([listEntries(db), asternToday(db)]);
        if (!cancelled) {
          setEntries(rows);
          setAstern(back);
        }
        // A year of history is a real query, so it runs after the list the
        // screen is actually made of rather than racing it.
        const history = await historyForForesight(db, addDays(todayKey(), -365));
        if (!cancelled) setReading(foresight(history, settings.keystone.targetHours));
      })();
      return () => {
        cancelled = true;
      };
    }, [db, settings.keystone.targetHours]),
  );

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id)}
        // The heading scrolls with the list rather than sitting in a band
        // above it, and the bottom padding clears the floating bar *and* the
        // button stacked on top of it.
        contentContainerStyle={[
          styles.list,
          { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom + FAB_ROOM },
        ]}
        // An element, never an inline arrow: a new component type on every
        // render would remount the field and drop the keyboard mid-sentence.
        ListHeaderComponent={
          <View style={styles.head}>
            <PageHeading
              title={t.observationTitle}
              trailing={plainMode ? undefined : '見聞色'}
              tint={palette.violet}
            />

            {/* The gauge: a pair of eyes, open as far as the tool has been
                used today — reach, normalised so fully open and sharp are the
                same moment, at which the glint lights. Closed until the Daily
                Read, because the reading is literally what opens them. */}
            {plainMode ? null : (
              <View
                style={styles.eyes}
                accessibilityRole="image"
                accessibilityLabel={`Observation, ${stateName(observation.state)}`}
              >
                <Eyes
                  ink={palette.ink}
                  iris={palette.violet}
                  ground={palette.bg}
                  openness={openness(observation)}
                  lit={futureSight(observation)}
                />
              </View>
            )}

            {/* The reading: the same card the sit screen leads with, because
                it is the same fact. Practice and condition, reported
                separately, naming whichever is the limit. */}
            <View
              style={[
                styles.reading,
                material && styles.readingWater,
                lit(palette.violet, plainMode ? 0 : hardening),
              ]}
            >
              {/* 見聞色 is still water: a surface you read things off, with
                  the rings spread as far as the day's reading has opened.
                  Paper catches nothing, so on the unhardened palette this is
                  the flat tinted plate it has always been. */}
              {material ? (
                <Water
                  face={palette.waterFace}
                  deep={palette.waterDeep}
                  sheen={palette.waterSheen}
                  openness={openness(observation)}
                />
              ) : null}
              <View style={styles.readingHead}>
                <Text style={styles.readingLabel}>{plainMode ? 'Reading' : '見聞色'}</Text>
                <Text style={styles.readingState}>{stateName(observation.state)}</Text>
              </View>
              <Text style={styles.readingBody}>{stateMessage(observation)}</Text>
            </View>

            {/* 未来視 — what the record has been saying. Shown only once the
                engine has something, or once it is close enough that saying
                what it is waiting for is informative rather than a nag; the
                full readout and its method live on the pushed screen. */}
            {reading && reading.state !== 'watching' ? (
              <Pressable
                onPress={() => router.push('/foresight')}
                accessibilityRole="button"
                accessibilityLabel={t.foresightTitle}
                style={({ pressed }) => [
                  styles.foresight,
                  lit(palette.cyan, plainMode ? 0 : hardening),
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.foresightHead}>
                  <Text style={styles.foresightLabel}>{t.foresightLabel}</Text>
                  {plainMode ? null : <Text style={styles.foresightGlyph}>未来視</Text>}
                </View>
                {reading.state === 'reading' ? (
                  <>
                    <Text style={styles.foresightLine}>
                      {findingLine(reading.findings[0], plainMode)}
                    </Text>
                    {reading.findings.length > 1 ? (
                      <Text style={styles.foresightMore}>
                        {reading.findings.length - 1} more
                      </Text>
                    ) : null}
                  </>
                ) : (
                  <Text style={styles.foresightQuiet}>
                    {foresightMessage(reading, plainMode)}
                  </Text>
                )}
              </Pressable>
            ) : null}

            {/* The loud-day door. The reading above has already said today is
                loud; this gives the sentence one exit — a two-minute settling
                breath, started by the tap itself. Only offered on a clouded
                read: on any other day it would be a nag about nothing. */}
            {observation.state === 'clouded' ? (
              <Pressable
                onPress={() => router.push('/sit?begin=settle')}
                accessibilityRole="button"
                accessibilityLabel={t.settleTitle}
                style={({ pressed }) => [styles.settle, pressed && styles.pressed]}
              >
                <View style={styles.settleHead}>
                  <Text style={styles.settleLabel}>{t.settleTitle}</Text>
                  {plainMode ? null : <Text style={styles.settleGlyph}>息</Text>}
                </View>
                <Text style={styles.settleLine}>{t.settleLine}</Text>
              </Pressable>
            ) : null}

            {/* The practice's door. The line under it is the offer, never the
                absence — the practice card's rule, held here too. */}
            <Pressable
              onPress={() => router.push('/sit')}
              accessibilityRole="button"
              accessibilityLabel={t.stillnessTitle}
              style={({ pressed }) => [styles.still, pressed && styles.pressed]}
            >
              <View style={styles.stillText}>
                <Text style={styles.stillName}>
                  {plainMode ? t.stillnessTitle : `黙想  ${t.stillnessTitle}`}
                </Text>
                <Text style={styles.stillLine}>
                  {acts.satMinutes > 0 ? `${acts.satMinutes} min today` : '5, 10 or 15 minutes'}
                </Text>
              </View>
              <Text style={styles.stillGo}>Sit</Text>
            </Pressable>

            {/* Loose pages, beside the journal but never in it. Writing is
                writing, so the door belongs here; the two lists stay apart
                because a note is not about a day. See app/notes.tsx. */}
            <Pressable
              onPress={() => router.push('/notes')}
              accessibilityRole="button"
              accessibilityLabel={t.notesTitle}
              style={({ pressed }) => [styles.still, pressed && styles.pressed]}
            >
              <View style={styles.stillText}>
                <Text style={styles.stillName}>
                  {plainMode ? t.notesTitle : `雑記  ${t.notesTitle}`}
                </Text>
                <Text style={styles.stillLine}>{t.notesBlurb}</Text>
              </View>
              <Text style={styles.stillGo}>Open</Text>
            </Pressable>

            <SectionLabel label={t.entriesLabel} style={styles.sectionLabel} />

            {/* What you wrote on this date in an earlier year — the feature
                the "memory is a source, never a stick" rule was written for.
                It appears only on the days an earlier year happens to have
                one, which for most of the first year is never, and it counts
                nothing: not the anniversaries, not the years kept up. */}
            {astern ? (
              <Pressable
                onPress={() => router.push(`/entry/${astern.entry.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`${asternLine(astern.years, plainMode)} ${astern.entry.body.trim()}`}
                style={({ pressed }) => [styles.astern, pressed && styles.pressed]}
              >
                <View style={styles.asternHead}>
                  <Text style={styles.asternLabel}>{t.asternLabel}</Text>
                  {plainMode ? null : <Text style={styles.asternGlyph}>過去</Text>}
                </View>
                <Text style={styles.asternWhen}>{asternLine(astern.years, plainMode)}</Text>
                <Text style={styles.asternBody} numberOfLines={3}>
                  {astern.entry.body.trim()}
                </Text>
              </Pressable>
            ) : null}

            {/* 見聞色's own light: this door stands on the violet tab. */}
            <LogLine onLogged={() => void load()} tint={palette.violet} />
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>{t.logEmpty}</Text>}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push(`/entry/${item.id}`)}
            accessibilityRole="button"
            accessibilityLabel={`Open the entry from ${item.day}`}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={styles.rowDay}>
              {/* An entry written before the voyage's start day has no day
                  number — counting back from set sail gave "Day -4 at sea",
                  which is arithmetic showing through. It keeps its date. */}
              {daysAtSea(settings.setSailAt, item.day) >= 1
                ? `${t.daysAtSea(daysAtSea(settings.setSailAt, item.day))} · ${shortDay(item.day)}`
                : shortDay(item.day)}
            </Text>
            <Text style={styles.rowBody} numberOfLines={2}>
              {item.body.trim() || 'Empty entry'}
            </Text>
          </Pressable>
        )}
      />

      {/* Sized to its own words and centred, rather than a slab from edge
          to edge. The screen already has one filled violet button in the
          log line; a second one at full width made the two of them argue
          about which was the action. */}
      <View pointerEvents="box-none" style={[styles.fabDock, { bottom: pad.paddingBottom }]}>
        <Pressable
          onPress={() => router.push('/entry/new')}
          accessibilityRole="button"
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        >
          <Text style={styles.fabText}>{t.newEntry}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    list: { padding: space.lg, gap: space.sm },
    head: { gap: space.sm, marginBottom: space.sm },
    eyes: { width: '100%', height: 84, marginBottom: -space.xs },

    // The lens's own readout, raised and in its colour.
    reading: {
      ...plate(c),
      borderColor: c.violet,
      borderTopColor: c.violet,
      backgroundColor: c.violetSoft,
      padding: space.lg,
      gap: space.xs,
    },
    // On water the plate supplies nothing of its own: the drawing is the
    // ground, and it has to be clipped to the card's corners.
    readingWater: {
      backgroundColor: c.waterFace,
      borderColor: c.waterSheen,
      borderTopColor: c.waterSheen,
      overflow: 'hidden',
      minHeight: 128,
      justifyContent: 'center',
    },
    readingHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    readingLabel: { ...type.label, color: c.violet },
    readingState: { fontFamily: font.displayBold, fontSize: 18, color: c.ink },
    readingBody: { ...type.body, color: c.ink, lineHeight: 22 },

    still: {
      ...row(c),
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      padding: space.lg,
      minHeight: 44,
    },
    stillText: { flex: 1, gap: 2 },
    stillName: { fontFamily: font.displayBold, fontSize: 17, color: c.ink },
    stillLine: { ...type.mono, fontSize: 12, color: c.inkDim },
    stillGo: { ...type.heading, fontSize: 15, color: c.violet },

    foresight: {
      ...plate(c),
      // Neutral edge. Foresight keeps its cyan label and its cyan light —
      // an outline as well made three of the four blocks on this screen
      // shout at once, and a screen where everything is emphasised has no
      // emphasis at all.
      borderColor: c.line,
      borderTopColor: c.specular,
      backgroundColor: c.cyanSoft,
      padding: space.lg,
      gap: space.xs,
      minHeight: 44,
    },
    foresightHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    foresightLabel: { ...type.label, color: c.cyan },
    foresightGlyph: { fontFamily: font.display, fontSize: 15, color: c.cyan },
    foresightLine: { ...type.body, color: c.ink, lineHeight: 22 },
    foresightQuiet: { ...type.body, color: c.inkDim, lineHeight: 22 },
    foresightMore: { ...type.mono, fontSize: 12, color: c.cyan },

    sectionLabel: { marginTop: space.xs },

    settle: {
      ...row(c),
      borderColor: c.line,
      padding: space.lg,
      gap: space.xs,
      minHeight: 44,
    },
    settleHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    settleLabel: { ...type.label, color: c.cyan },
    settleGlyph: { fontFamily: font.display, fontSize: 15, color: c.cyan },
    settleLine: { ...type.body, color: c.ink, lineHeight: 21 },
    empty: { ...type.body, color: c.inkDim, textAlign: 'center', marginTop: space.xxxl },

    // Quiet on purpose: a memory that arrives shouting is a memory you stop
    // wanting. Dashed, because what it holds is not today's material.
    astern: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.line,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
      minHeight: 44,
    },
    asternHead: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
    },
    asternLabel: { ...type.label, color: c.violet },
    asternGlyph: { fontFamily: font.display, fontSize: 15, color: c.violet },
    asternWhen: { ...type.mono, color: c.inkFaint },
    asternBody: { ...type.body, color: c.ink, lineHeight: 22, fontStyle: 'italic' },

    row: {
      ...row(c),
      padding: space.lg,
      gap: space.xs,
    },
    rowDay: { ...type.mono, color: c.inkFaint },
    rowBody: { ...type.body, color: c.ink, lineHeight: 21 },
    pressed: { ...press },

    // The dock spans the screen so the pill inside it can centre; `bottom`
    // comes from the insets at the call site, stacked above the floating
    // tab bar rather than under it, on every phone.
    fabDock: {
      position: 'absolute',
      left: space.lg,
      right: space.lg,
      alignItems: 'center',
    },
    fab: {
      backgroundColor: c.violet,
      borderRadius: radius.pill,
      paddingVertical: space.md,
      paddingHorizontal: space.xl,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: c.shadow,
      shadowOpacity: 1,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 6 },
      elevation: 6,
    },
    fabText: { ...type.heading, color: c.onAccent },
  });
