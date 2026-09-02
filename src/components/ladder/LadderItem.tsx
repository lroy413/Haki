import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../../state/HakiProvider';
import { LOGGED_BLOCK, progressLine, type Item, type Progress } from '../../domain/ladder';
import {
  GEAR_ORDER,
  availability,
  styleFor,
  type GearName,
  type GearSession,
} from '../../domain/gears';
import { formatMinutes } from '../../domain/tasks';
import { press } from '../../theme/surfaces';
import { font, radius, space, type } from '../../theme/tokens';
import type { Palette } from '../../theme/palettes';

/**
 * One item on the ladder: a practice with a weekly target, or a goal.
 *
 * Closed, it is a row — a mark, the title, and how far it has got this week.
 * Open, it shows the three ways to move it: a tap (one time, a block of
 * minutes, or done), the gears that can be shifted into on it, and the way
 * to edit it. The timers live here now rather than on a list of their own,
 * because the owner's decision was that they are how a thing is practised:
 * _"the focus timers are mixed in with the ladder... for the amount of time
 * I spend practicing."_ A gear started from this row lands its minutes here.
 *
 * The mark answers the finger. A tap shows the new count in the same frame
 * and reconciles when the stored one comes back — the app's own rule, held
 * here because every write goes down the single sqlite channel and a count
 * that waited for it would read as a dead button.
 *
 * `tint` is the screen's light and has no default — the shared-control rule.
 */
export function LadderItem({
  item,
  progress,
  tint,
  open,
  gears,
  running,
  onOpen,
  onTap,
  onUndo,
  onShift,
  onEdit,
}: {
  item: Item;
  progress: Progress;
  tint: string;
  open: boolean;
  /** Today's gear sessions, for what can be shifted into right now. */
  gears: GearSession[];
  /** True while a gear is running anywhere — the chips are the running one's then. */
  running: boolean;
  onOpen: () => void;
  onTap: () => void;
  onUndo: () => void;
  onShift: (gear: GearName) => void;
  onEdit: () => void;
}) {
  const { palette, crew, plainMode, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // Optimistic: the count the finger expects, until the store agrees.
  const [shown, setShown] = useState(progress.done);
  useEffect(() => {
    setShown(progress.done);
  }, [progress.done]);
  const shownProgress: Progress = {
    ...progress,
    done: shown,
    complete: shown >= progress.target,
  };

  const tapLabel =
    item.kind === 'goal'
      ? t.ladderTapGoal
      : item.unit === 'minutes'
        ? t.ladderTapMinutes(LOGGED_BLOCK)
        : t.ladderTapTimes;
  const step = item.unit === 'minutes' ? LOGGED_BLOCK : 1;
  // A goal is met once; a second tap on it would be a second record of the
  // same thing, so the button steps aside for the undo.
  const canTap = !(item.kind === 'goal' && shownProgress.complete);

  const nowMs = Date.now();

  return (
    <View style={[styles.row, open && styles.rowOpen, shownProgress.complete && styles.rowMet]}>
      <Pressable
        onPress={onOpen}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${progressLine(shownProgress, item.kind)}. ${
          open ? 'Close' : 'Open'
        }.`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.head, pressed && styles.pressed]}
      >
        <View
          style={[
            styles.mark,
            { borderColor: tint },
            shownProgress.complete && { backgroundColor: tint },
          ]}
        />
        <View style={styles.body}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, shownProgress.complete && { color: tint }]}>
            {item.kind === 'goal' ? `${t.ladderGoal} · ` : ''}
            {progressLine(shownProgress, item.kind)}
          </Text>
        </View>
        <Text style={styles.go}>{open ? '‹' : '›'}</Text>
      </Pressable>

      {open ? (
        <View style={styles.controls}>
          <View style={styles.actions}>
            {canTap ? (
              <Pressable
                onPress={() => {
                  setShown((n) => n + step);
                  onTap();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${tapLabel}: ${item.title}`}
                style={({ pressed }) => [
                  styles.tap,
                  { borderColor: tint, backgroundColor: palette.surface },
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.tapText, { color: tint }]}>{tapLabel}</Text>
              </Pressable>
            ) : null}
            {shown > 0 ? (
              <Pressable
                onPress={() => {
                  setShown((n) => Math.max(0, n - step));
                  onUndo();
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t.ladderUndo}: ${item.title}`}
                style={({ pressed }) => [styles.quiet, pressed && styles.pressed]}
              >
                <Text style={styles.quietText}>{t.ladderUndo}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={styles.shiftLabel}>{t.ladderShift}</Text>
          <View style={styles.chips}>
            {GEAR_ORDER.map((name) => {
              const gear = styleFor(crew.name, name);
              const state = availability(name, gears, nowMs);
              const ready = state.ready && !running;
              return (
                <Pressable
                  key={name}
                  onPress={() => onShift(name)}
                  disabled={!ready}
                  accessibilityRole="button"
                  accessibilityLabel={`${gear.label}, ${gear.minutes} minutes, on ${item.title}`}
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
            })}
          </View>
          {(() => {
            // One reason, said once: the first gear that is not ready explains
            // why, and it is the same reason for all of them.
            const locked = GEAR_ORDER.map((n) => availability(n, gears, nowMs)).find(
              (s) => !s.ready,
            );
            return locked && !locked.ready ? (
              <Text style={styles.reason}>{locked.reason}</Text>
            ) : null;
          })()}

          <Pressable
            onPress={onEdit}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
            style={({ pressed }) => [styles.edit, pressed && styles.pressed]}
          >
            <Text style={styles.editText}>Edit</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    row: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
    },
    rowOpen: { borderColor: c.line },
    rowMet: { borderColor: c.line },
    head: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      minHeight: 52,
    },
    mark: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    body: { flex: 1, gap: 1 },
    title: { fontFamily: font.displaySemi, fontSize: 17, color: c.ink },
    meta: { ...type.mono, fontSize: 12, color: c.inkDim },
    go: { ...type.heading, fontSize: 18, color: c.inkFaint },

    controls: {
      borderTopWidth: 1,
      borderTopColor: c.lineSoft,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      gap: space.sm,
    },
    actions: { flexDirection: 'row', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' },
    tap: {
      minHeight: 44,
      paddingHorizontal: space.lg,
      borderWidth: 1,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tapText: { ...type.heading, fontSize: 16 },
    quiet: { minHeight: 44, paddingHorizontal: space.md, justifyContent: 'center' },
    quietText: { ...type.mono, fontSize: 13, color: c.inkDim },

    shiftLabel: { ...type.label, color: c.inkFaint, marginTop: space.xs },
    chips: { flexDirection: 'row', gap: space.sm },
    chip: {
      flex: 1,
      minHeight: 48,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.bg,
      paddingHorizontal: space.sm,
      paddingVertical: space.xs,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    chipLocked: { borderColor: c.lineSoft },
    chipTime: { fontFamily: font.displayBold, fontSize: 16, color: c.inkDim },
    chipName: { ...type.mono, fontSize: 12, color: c.inkFaint },
    reason: { ...type.small, color: c.inkDim, lineHeight: 20 },

    edit: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
    editText: { ...type.mono, fontSize: 13, color: c.inkDim },
    pressed: { ...press },
  });
