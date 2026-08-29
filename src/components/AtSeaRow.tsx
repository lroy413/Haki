import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { play } from '../sound';
import { fireImpact } from '../impact';
import { useHaki } from '../state/HakiProvider';
import {
  atSeaLine,
  moveDescription,
  movePrompt,
  needsLine,
  reasonReady,
  CARRY_LABEL,
  MAX_REASON,
  WAIT_LABEL,
  type AtSea,
} from '../domain/atSea';
import { formatMinutes } from '../domain/tasks';
import { shortDay } from '../domain/date';
import { press } from '../theme/surfaces';
import { font, radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * One task still at sea, and the two ways it can leave.
 *
 * The asymmetry is the feature and it is the Log Pose's, one size down:
 * **striking it is always a single tap, and a move can cost a written line.**
 * Doing the thing is never made harder. Taking it off the day for good always
 * costs a line, because that is the decision. Carrying it forward costs one
 * only once it has been carried a while — a first-day carry is a Tuesday, and
 * a writing tax on every leftover is how a list becomes expensive enough to
 * abandon, which is the failure this whole feature exists to treat.
 *
 * The days it has been out are stated and nothing else is done with them — no
 * colour turns as the number grows, nothing is ranked by it, and there is no
 * total anywhere of how much has been carried. It is the same figure an island
 * at sea wears, and it reads the same way: a fact about the thing, not a
 * verdict on the person.
 *
 * Shaped like the task rows above it on purpose. The first cut made each one a
 * card with its own action bar, and three of them pushed the day itself off
 * the screen — a list of what you have not done, taller than the list of what
 * you might.
 */
export function AtSeaRow({
  item,
  tint,
  onStrike,
  onMove,
}: {
  item: AtSea;
  tint: string;
  onStrike: () => void;
  onMove: (to: 'today' | null, reason: string) => void;
}) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const [asking, setAsking] = useState<'today' | 'go' | null>(null);
  const [reason, setReason] = useState('');
  // The tick answers the finger. The row leaves on the reload, but the box
  // must not wait for eleven queries to come back down the sqlite channel.
  const [struck, setStruck] = useState(false);

  const ready = reasonReady(reason);

  function strike() {
    if (struck) return;
    setStruck(true);
    void Haptics.selectionAsync();
    play('armamentStrike');
    fireImpact();
    onStrike();
  }

  /** Ask, or just do it — `needsLine` owns which moves arrive with words. */
  function move(to: 'today' | null) {
    if (needsLine(item.days, to)) {
      setAsking(to === 'today' ? 'today' : 'go');
      return;
    }
    onMove(to, '');
  }

  function commit() {
    if (!ready || asking === null) return;
    const to = asking === 'today' ? 'today' : null;
    const line = reason;
    // The form closes in the tap's own frame; the write lands behind it.
    setAsking(null);
    setReason('');
    onMove(to, line);
  }

  function cancel() {
    setAsking(null);
    setReason('');
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        {/* The whole left side is the target, not the 26pt box inside it —
            44pt is the floor, and a checklist you have to aim at gets
            abandoned. */}
        <Pressable
          onPress={strike}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: struck }}
          accessibilityLabel={`Done: ${item.task.title}`}
          style={({ pressed }) => [styles.strike, pressed && styles.pressed]}
        >
          <View style={[styles.box, struck && { backgroundColor: tint, borderColor: tint }]}>
            {struck ? <Text style={styles.tick}>✓</Text> : null}
          </View>
          <View style={styles.body}>
            <Text style={[styles.title, struck && styles.titleDone]} numberOfLines={2}>
              {item.task.title}
            </Text>
            <Text style={styles.meta}>
              {[
                atSeaLine(item.days, plainMode),
                shortDay(item.from),
                formatMinutes(item.task.minutes),
              ].join(' · ')}
            </Text>
          </View>
        </Pressable>

        {asking === null && !struck ? (
          <View style={styles.moves}>
            <Pressable
              onPress={() => move('today')}
              accessibilityRole="button"
              accessibilityLabel={moveDescription(item.task.title, 'today')}
              style={({ pressed }) => [styles.move, pressed && styles.pressed]}
            >
              <Text style={[styles.moveText, { color: tint }]}>{CARRY_LABEL}</Text>
            </Pressable>
            <Pressable
              onPress={() => move(null)}
              accessibilityRole="button"
              accessibilityLabel={moveDescription(item.task.title, null)}
              style={({ pressed }) => [styles.move, pressed && styles.pressed]}
            >
              <Text style={styles.moveText}>{WAIT_LABEL}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {asking !== null ? (
        <View style={styles.form}>
          <Text style={styles.prompt}>{movePrompt(asking === 'today', plainMode)}</Text>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={asking === 'today' ? 'Ran out of day.' : 'Not this week.'}
            placeholderTextColor={palette.inkFaint}
            maxLength={MAX_REASON}
            style={styles.input}
            onSubmitEditing={commit}
            returnKeyType="done"
            autoFocus
            accessibilityLabel={movePrompt(asking === 'today', plainMode)}
          />
          <View style={styles.formRow}>
            <Pressable
              onPress={cancel}
              accessibilityRole="button"
              style={({ pressed }) => [styles.move, pressed && styles.pressed]}
            >
              <Text style={styles.moveText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={commit}
              disabled={!ready}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.confirm,
                ready ? { backgroundColor: tint } : styles.confirmWaiting,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.confirmText, !ready && styles.confirmTextWaiting]}>
                {asking === 'today' ? 'Bring it in' : 'Set it waiting'}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
      backgroundColor: c.surface,
    },
    head: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
    strike: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 44,
    },
    box: {
      width: 26,
      height: 26,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.line,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tick: { color: c.onAccent, fontSize: 16, fontFamily: font.displayBold },
    body: { flex: 1, gap: 1 },
    title: { ...type.body, fontSize: 19, color: c.ink, lineHeight: 22 },
    titleDone: { color: c.inkFaint, textDecorationLine: 'line-through' },
    meta: { ...type.mono, fontSize: 12, color: c.inkFaint },

    moves: { alignItems: 'flex-end' },
    // Two stacked words rather than a row: side by side they wrap the title to
    // two lines on a narrow phone, and the row grows to hold the wrap.
    move: { minHeight: 22, justifyContent: 'center', paddingHorizontal: space.xs },
    moveText: { ...type.mono, fontSize: 13, color: c.inkDim },

    form: { gap: space.sm, paddingTop: space.sm },
    prompt: { ...type.small, color: c.inkDim },
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
    confirm: {
      borderRadius: radius.sm,
      paddingHorizontal: space.lg,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
    },
    // Not a faded accent: white on 40%-opacity crimson comes out a wash that
    // measures under the app's own contrast floor. An unfilled button is a
    // surface, and it says "not yet" by being one.
    confirmWaiting: { backgroundColor: c.surface2, borderWidth: 1, borderColor: c.line },
    confirmText: { ...type.mono, fontSize: 13, color: c.onAccent },
    confirmTextWaiting: { color: c.inkFaint },
    pressed: { ...press },
  });
