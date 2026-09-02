import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { play } from '../sound';
import { fireConquerors } from '../impact';
import { useStore } from '../db/client';
import {
  addItem,
  addTrack,
  gearSessionsOn,
  listItems,
  listTracks,
  renameTrack,
  retireItem,
  retireTrack,
  settleLadder,
  startGear,
  tickItem,
  ticksBetween,
  timedBetween,
  untickItem,
  updateItem,
} from '../db/repo';
import {
  readBurstWeek,
  readLadderMinimums,
  writeBurstWeek,
  writeLadderMinimums,
} from '../db/settings';
import {
  FLOOR,
  LOGGED_BLOCK,
  STEPS,
  TOP,
  activeItems,
  canLower,
  completedIn,
  ladderBlurb,
  lowerRung,
  mondayOf,
  onItemLine,
  progressOf,
  raiseRung,
  reachedRung,
  rungName,
  wornRung,
  type Item,
  type Minimums,
  type Rung,
  type Step,
  type Tick,
  type Timed,
  type Track,
  type WeekRecord,
} from '../domain/ladder';
import {
  GEAR_ORDER,
  GEAR_SOUND,
  availability,
  focusBlurb,
  runningSession,
  styleFor,
  type GearName,
  type GearSession,
} from '../domain/gears';
import { addDays, todayKey } from '../domain/date';
import { formatMinutes } from '../domain/tasks';
import { useHaki } from '../state/HakiProvider';
import { useSingleFlight } from '../state/useSingleFlight';
import { darkest, underCrew } from '../theme/palettes';
import { font, radius, space, type } from '../theme/tokens';
import { offer, press } from '../theme/surfaces';
import { GearPlate } from './ladder/GearPlate';
import { LadderItem } from './ladder/LadderItem';
import {
  EMPTY_ITEM,
  ItemForm,
  TrackForm,
  isItemReady,
  type ItemDraftState,
} from './ladder/LadderForms';
import { SectionLabel } from './SectionLabel';
import { Steam } from './instruments/Steam';
import { Flame } from './instruments/Flame';
import type { Palette } from '../theme/palettes';

/**
 * The Gears, as a ladder.
 *
 * They were a list of three timers. The owner made them his career ladder:
 * _"basically a career, business goal tracker and planner... strictly career
 * goals and aspiration focused. I want to make it game like."_ So the pane is
 * the plate that says which rung the week wears, then what is being mastered
 * — tracks, each with its practices and goals — then the rungs themselves,
 * which can be raised and never lowered under the floor. The timers live on
 * the items now: a gear is shifted into *on* a thing, and its minutes land
 * there. `domain/ladder.ts` holds every rule; this is only the room.
 *
 * Three things this pane does that nothing else in the app does:
 *
 * - **It settles the week on load.** The first open of a week writes the
 *   week's record — what is held going into it, read from what the week
 *   before reached — and the plate reads from that record all week. Weeks
 *   the app was not opened in are written down on the way past, one rung
 *   given back each. See `settleLadder`.
 * - **It fires the Conqueror's burst**, on reaching the top rung, once a week
 *   at most. The burst had exactly one caller — an island reached — and now
 *   has two; this one is at most weekly by construction and only at the top
 *   of a ladder the owner raises himself. The week is written before it
 *   fires, so it cannot fire twice.
 * - **It changes the page at the top.** Luffy's fifth gear turns the pane
 *   white with clouds; Zoro's King of Hell runs it black with green fire.
 *   The owner's brief, exactly — and the one place an Armament screen wears
 *   覇王色's colour, because King of Hell *is* Conqueror's down the blade.
 *
 * Plain mode gets the ladder and none of the weather, like everything else.
 */
export function GearsPane() {
  const router = useRouter();
  const { db } = useStore();
  const { t, refresh, plainMode, palette, crew, conquerors } = useHaki();
  const lens = useMemo(() => underCrew(palette, crew), [palette, crew]);
  const tint = lens.crimson;
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [tracks, setTracks] = useState<Track[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [timed, setTimed] = useState<Timed[]>([]);
  const [gears, setGears] = useState<GearSession[]>([]);
  const [minimums, setMinimums] = useState<Minimums>({ ...FLOOR });
  const [week, setWeek] = useState<WeekRecord | null>(null);
  const [burstWeek, setBurstWeek] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [openKey, setOpenKey] = useState<number | null>(null);
  const [trackForm, setTrackForm] = useState<{ editing: Track | null; name: string } | null>(
    null,
  );
  const [itemForm, setItemForm] = useState<{
    trackKey: number;
    editing: Item | null;
    draft: ItemDraftState;
  } | null>(null);

  // Only the newest load may write — the provider's `refreshes` rule, held
  // here because a tap and a focus can start two of these at once.
  const loads = useRef(0);
  const load = useCallback(async () => {
    const mine = (loads.current += 1);
    const today = todayKey();
    const monday = mondayOf(today);
    const rungs = await readLadderMinimums(db);
    const [trackRows, itemRows, tickRows, timedRows, gearRows, record, burst] =
      await Promise.all([
        listTracks(db),
        listItems(db),
        ticksBetween(db, monday, addDays(monday, 6)),
        timedBetween(db, monday, addDays(monday, 6)),
        gearSessionsOn(db),
        settleLadder(db, today, rungs),
        readBurstWeek(db),
      ]);
    if (mine !== loads.current) return;
    setMinimums(rungs);
    setTracks(trackRows);
    setItems(itemRows);
    setTicks(tickRows);
    setTimed(timedRows);
    setGears(gearRows);
    setWeek(record);
    setBurstWeek(burst);
    setLoaded(true);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const today = todayKey();
  const monday = mondayOf(today);
  const active = useMemo(() => activeItems(items, monday), [items, monday]);
  const completed = completedIn(active, ticks, timed, monday);
  const reached = reachedRung(completed, minimums);
  const held: Rung = week?.held ?? 0;
  const worn = wornRung(reached, held);
  const performing = !plainMode;
  const atTop = performing && worn >= TOP;
  const luffy = crew.instrument === 'fist';
  const nowMs = Date.now();
  const running = runningSession(gears, nowMs);
  const runningOn = running ? (items.find((i) => i.key === running.itemKey) ?? null) : null;
  const liveTracks = tracks.filter((track) => !track.retired);
  const empty = active.length === 0;

  // At the top the page is its own object, and the free text on it — the
  // section labels, the hints — has to be read on that ground rather than
  // on the palette's. The rows keep their surfaces and their own ink.
  const inkOn = atTop ? (luffy ? darkest(palette) : palette.onStone) : null;

  // The burst. Written down first, then fired: a second load landing in the
  // same frame reads the week as already burst and does nothing.
  useEffect(() => {
    if (!loaded || reached < TOP || burstWeek === monday) return;
    setBurstWeek(monday);
    void writeBurstWeek(db, monday).then(() => {
      fireConquerors();
      play('returnDrums');
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, [loaded, reached, burstWeek, monday, db]);

  async function shiftInto(gear: GearName, item: Item | null) {
    play(GEAR_SOUND[gear]);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await startGear(db, gear, item?.key ?? null);
    await refresh();
    router.push({ pathname: '/gear', params: { gear } });
  }

  async function tap(item: Item) {
    void Haptics.selectionAsync();
    await tickItem(db, item, today, item.unit === 'minutes' ? LOGGED_BLOCK : 1);
    await load();
  }

  async function undo(item: Item) {
    await untickItem(db, item, monday);
    await load();
  }

  const committing = useSingleFlight();

  async function saveTrack() {
    if (!trackForm || trackForm.name.trim().length === 0) return;
    const form = trackForm;
    await committing(async () => {
      setTrackForm(null);
      if (form.editing) await renameTrack(db, form.editing.id, form.name);
      else await addTrack(db, form.name);
      await load();
    });
  }

  async function letTrackGo() {
    if (!trackForm?.editing) return;
    const id = trackForm.editing.id;
    await committing(async () => {
      setTrackForm(null);
      await retireTrack(db, id, true);
      await load();
    });
  }

  async function saveItem() {
    if (!itemForm || !isItemReady(itemForm.draft)) return;
    const form = itemForm;
    await committing(async () => {
      setItemForm(null);
      if (form.editing) await updateItem(db, form.editing.id, form.draft);
      else await addItem(db, form.trackKey, form.draft);
      await load();
    });
  }

  async function letItemGo() {
    if (!itemForm?.editing) return;
    const id = itemForm.editing.id;
    await committing(async () => {
      setItemForm(null);
      setOpenKey(null);
      await retireItem(db, id, true);
      await load();
    });
  }

  async function moveRung(step: Step, up: boolean) {
    const next = up ? raiseRung(minimums, step) : lowerRung(minimums, step);
    setMinimums(next);
    void Haptics.selectionAsync();
    await writeLadderMinimums(db, next);
  }

  function editItem(item: Item) {
    setItemForm({
      trackKey: item.trackKey,
      editing: item,
      draft: { title: item.title, kind: item.kind, unit: item.unit, target: item.target },
    });
  }

  const gearChip = (name: GearName, ready: boolean, onPress: () => void, label: string) => {
    const gear = styleFor(crew.name, name);
    return (
      <Pressable
        key={name}
        onPress={onPress}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityLabel={label}
        style={({ pressed }) => [
          styles.chip,
          ready && { borderColor: tint },
          !ready && styles.chipLocked,
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.chipTime, ready && { color: tint }]}>
          {formatMinutes(gear.minutes)}
        </Text>
        <Text style={styles.chipName} numberOfLines={1}>
          {plainMode ? gear.label : `${gear.kanji} ${gear.label}`}
        </Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.content}>
      {/* The page at the top rung: white and clouded for Luffy, black and
          burning for Zoro. Behind everything, bleeding to the screen's
          edges, and gone in plain mode. */}
      {atTop ? (
        <View
          style={[styles.page, { backgroundColor: luffy ? palette.onStone : darkest(palette) }]}
          pointerEvents="none"
        >
          {luffy ? (
            <Steam amount={1} full colour={palette.onStone} shade={darkest(palette)} seed={5} />
          ) : (
            <Flame amount={1} full colour={conquerors} core={palette.onStone} seed={9} />
          )}
        </View>
      ) : null}

      <GearPlate
        worn={worn}
        held={held}
        reached={reached}
        completed={completed}
        minimums={minimums}
        empty={empty}
        tint={tint}
      />

      {running ? (
        <Pressable
          onPress={() => router.push({ pathname: '/gear', params: { gear: running.gear } })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.running, pressed && styles.pressed]}
        >
          <Text style={styles.runningLabel}>
            {styleFor(crew.name, running.gear).label} is running
          </Text>
          <Text style={styles.runningHint}>
            {runningOn ? `${onItemLine(runningOn.title)} · ` : ''}Tap to go back to it
          </Text>
        </Pressable>
      ) : null}

      {liveTracks.length === 0 ? (
        <Text style={[styles.blurb, inkOn ? { color: inkOn } : null]}>
          {ladderBlurb(crew.name)}
        </Text>
      ) : null}

      {liveTracks.map((track) => {
        const mine = active.filter((i) => i.trackKey === track.key);
        const editingThis = trackForm?.editing?.key === track.key;
        return (
          <View key={track.key} style={styles.track}>
            <Pressable
              onPress={() =>
                setTrackForm(editingThis ? null : { editing: track, name: track.name })
              }
              accessibilityRole="button"
              accessibilityLabel={`${track.name}. Open to rename it.`}
              style={({ pressed }) => [styles.trackHead, pressed && styles.pressed]}
            >
              <Text
                style={[styles.trackName, inkOn ? { color: inkOn } : null]}
                numberOfLines={1}
              >
                {track.name}
              </Text>
              <View style={styles.trackRule} />
              <Text style={[styles.trackGo, inkOn ? { color: inkOn } : null]}>
                {editingThis ? '‹' : '›'}
              </Text>
            </Pressable>

            {editingThis && trackForm ? (
              <TrackForm
                name={trackForm.name}
                onChange={(name) => setTrackForm({ ...trackForm, name })}
                onSave={() => void saveTrack()}
                onCancel={() => setTrackForm(null)}
                onRetire={() => void letTrackGo()}
                tint={tint}
              />
            ) : null}

            {mine.map((item) => (
              <LadderItem
                key={item.key}
                item={item}
                progress={progressOf(item, ticks, timed, monday)}
                tint={tint}
                open={openKey === item.key}
                gears={gears}
                running={running !== null}
                onOpen={() => setOpenKey(openKey === item.key ? null : item.key)}
                onTap={() => void tap(item)}
                onUndo={() => void undo(item)}
                onShift={(gear) => void shiftInto(gear, item)}
                onEdit={() => editItem(item)}
              />
            ))}

            {itemForm && itemForm.trackKey === track.key ? (
              <ItemForm
                draft={itemForm.draft}
                onChange={(draft) => setItemForm({ ...itemForm, draft })}
                onSave={() => void saveItem()}
                onCancel={() => setItemForm(null)}
                onRetire={itemForm.editing ? () => void letItemGo() : undefined}
                tint={tint}
              />
            ) : (
              <Pressable
                onPress={() =>
                  setItemForm({ trackKey: track.key, editing: null, draft: EMPTY_ITEM })
                }
                accessibilityRole="button"
                accessibilityLabel={`${t.ladderAddItem}: ${track.name}`}
                style={({ pressed }) => [styles.offer, pressed && styles.pressed]}
              >
                <Text style={[styles.offerText, inkOn ? { color: inkOn } : null]}>
                  {t.ladderAddItem}
                </Text>
                <Text style={[styles.offerPlus, { color: tint }]}>+</Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {trackForm && trackForm.editing === null ? (
        <TrackForm
          name={trackForm.name}
          onChange={(name) => setTrackForm({ editing: null, name })}
          onSave={() => void saveTrack()}
          onCancel={() => setTrackForm(null)}
          tint={tint}
        />
      ) : (
        <Pressable
          onPress={() => setTrackForm({ editing: null, name: '' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.offer, styles.offerTrack, pressed && styles.pressed]}
        >
          <Text style={[styles.offerText, inkOn ? { color: inkOn } : null]}>
            {t.ladderAddTrack}
          </Text>
          <Text style={[styles.offerPlus, { color: tint }]}>+</Text>
        </Pressable>
      )}

      {/* The rungs. What each asks of a week; raise any, never under the
          floor. The rungs the week has reached wear the light. */}
      <SectionLabel label={t.ladderRungs} tint={inkOn ?? undefined} style={styles.section} />
      <Text style={[styles.hint, inkOn ? { color: inkOn } : null]}>{t.ladderRungsBlurb}</Text>
      <View style={styles.rungs}>
        {STEPS.map((step) => {
          const name = rungName(crew.name, step);
          const lit = step <= reached;
          return (
            <View key={step} style={[styles.rung, step < TOP && styles.rungRuled]}>
              {!plainMode ? (
                <Text style={[styles.rungKanji, lit && { color: tint }]}>{name.kanji}</Text>
              ) : null}
              <Text style={[styles.rungName, lit && { color: tint }]} numberOfLines={1}>
                {name.label}
              </Text>
              <Text style={styles.rungAsks}>{t.ladderRungAsks(minimums[step])}</Text>
              <Pressable
                onPress={() => void moveRung(step, false)}
                disabled={!canLower(minimums, step)}
                accessibilityRole="button"
                accessibilityLabel={`${name.label}: one fewer`}
                style={({ pressed }) => [
                  styles.step,
                  !canLower(minimums, step) && styles.stepLocked,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Pressable
                onPress={() => void moveRung(step, true)}
                accessibilityRole="button"
                accessibilityLabel={`${name.label}: one more`}
                style={({ pressed }) => [styles.step, pressed && styles.pressed]}
              >
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* A gear on nothing in particular. The practice card's door still
          promises twenty-five minutes, and a fresh install has no item to
          shift on yet. */}
      <SectionLabel label={t.ladderLoose} tint={inkOn ?? undefined} style={styles.section} />
      <View style={styles.chips}>
        {GEAR_ORDER.map((name) =>
          gearChip(
            name,
            availability(name, gears, nowMs).ready && running === null,
            () => void shiftInto(name, null),
            `${styleFor(crew.name, name).label}, ${styleFor(crew.name, name).minutes} minutes`,
          ),
        )}
      </View>
      <Text style={[styles.hint, inkOn ? { color: inkOn } : null]}>
        {focusBlurb(crew.name)}
      </Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    content: { gap: space.sm, position: 'relative' },
    page: {
      position: 'absolute',
      top: -space.md,
      left: -space.lg,
      right: -space.lg,
      bottom: -(space.lg + 60),
      overflow: 'hidden',
    },
    blurb: { ...type.body, color: c.inkDim, lineHeight: 24, marginTop: space.xs },
    hint: { ...type.small, color: c.inkFaint, lineHeight: 20 },
    section: { marginTop: space.md },

    running: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.cyan,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.xs,
    },
    runningLabel: { fontFamily: font.displayBold, fontSize: 20, color: c.ink },
    runningHint: { ...type.mono, color: c.inkDim },

    track: { gap: space.sm, marginTop: space.sm },
    trackHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      minHeight: 44,
    },
    trackName: { fontFamily: font.displayBold, fontSize: 18, color: c.ink, flexShrink: 1 },
    trackRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: c.line },
    trackGo: { ...type.heading, fontSize: 18, color: c.inkFaint },

    offer: {
      ...offer(c),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      minHeight: 48,
      paddingHorizontal: space.md,
    },
    offerTrack: { marginTop: space.sm },
    offerText: { ...type.small, color: c.inkDim },
    offerPlus: { ...type.heading, fontSize: 18 },

    rungs: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
    },
    rung: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.sm,
      paddingLeft: space.md,
      paddingRight: space.xs,
      minHeight: 48,
    },
    rungRuled: { borderBottomWidth: 1, borderBottomColor: c.lineSoft },
    rungKanji: { fontFamily: font.display, fontSize: 16, color: c.inkDim, width: 44 },
    rungName: { fontFamily: font.displaySemi, fontSize: 16, color: c.ink, flex: 1 },
    rungAsks: { ...type.mono, fontSize: 12, color: c.inkDim, marginRight: space.xs },
    step: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
    },
    stepLocked: { opacity: 0.35 },
    stepText: { fontFamily: font.displayBold, fontSize: 20, color: c.ink },

    chips: { flexDirection: 'row', gap: space.sm },
    chip: {
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    chipLocked: { borderColor: c.lineSoft },
    chipTime: { fontFamily: font.displayBold, fontSize: 16, color: c.inkDim },
    chipName: { ...type.mono, fontSize: 12, color: c.inkFaint },

    pressed: { ...press },
  });
