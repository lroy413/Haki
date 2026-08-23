import { useHaki } from '../state/HakiProvider';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { formatMinutes, type Task } from '../domain/tasks';
import { play } from '../sound';
import { fireImpact } from '../impact';
import { Emission } from './Emission';
import { font, radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * One task, on the home screen, with one button.
 *
 * The whole point is that it shows a single thing. A list is a set of
 * decisions, and the decision is the part that does not happen — so the home
 * screen never shows the list, only the next item on it.
 *
 * Armament Haki is what lets you hit something you otherwise cannot touch.
 * This is that, made literal: the next thing you can actually strike.
 */
export function NextStrike({
  task,
  onDone,
  onOpenList,
  emptyLabel,
}: {
  task: Task | null;
  onDone: (task: Task) => void;
  onOpenList: () => void;
  emptyLabel: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // Striking the last task swaps this card for the empty one. Counting the
  // strikes here and wrapping *both* branches in one Emission keeps that
  // element mounted across the swap, so the corona is never cut off halfway.
  const [strikes, setStrikes] = useState(0);

  if (!task) {
    return (
      <Emission trigger={strikes} radius={radius.md}>
        <Pressable
          onPress={onOpenList}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, styles.empty, pressed && styles.pressed]}
        >
          <Text style={styles.label}>Next strike</Text>
          <Text style={styles.emptyText}>{emptyLabel}</Text>
        </Pressable>
      </Emission>
    );
  }

  return (
    <Emission trigger={strikes} radius={radius.md} style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>Next strike</Text>
        <Text style={styles.minutes}>{formatMinutes(task.minutes)}</Text>
      </View>

      <Text style={styles.title}>{task.title}</Text>

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            play('armamentStrike');
            fireImpact();
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setStrikes((n) => n + 1);
            onDone(task);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Mark done: ${task.title}`}
          style={({ pressed }) => [styles.done, pressed && styles.pressed]}
        >
          <Text style={styles.doneText}>Struck</Text>
        </Pressable>

        <Pressable
          onPress={onOpenList}
          accessibilityRole="button"
          accessibilityLabel="Open the full list"
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        >
          <Text style={styles.moreText}>List</Text>
        </Pressable>
      </View>
    </Emission>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.crimson,
      borderRadius: radius.md,
      padding: space.lg,
      gap: space.md,
    },
    empty: { borderColor: c.line, borderStyle: 'dashed' },
    head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    label: { ...type.label, color: c.crimson },
    minutes: { ...type.mono, color: c.inkDim },
    title: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 28, color: c.ink },
    emptyText: { ...type.body, color: c.inkDim },

    row: { flexDirection: 'row', gap: space.sm },
    done: {
      flex: 2,
      backgroundColor: c.crimson,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    doneText: { ...type.heading, color: c.onAccent },
    more: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingVertical: space.md,
      alignItems: 'center',
    },
    moreText: { ...type.heading, color: c.inkDim },
    pressed: { opacity: 0.75 },
  });
