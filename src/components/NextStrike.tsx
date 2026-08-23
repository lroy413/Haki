import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { formatMinutes, type Task } from '../domain/tasks';
import { play } from '../sound';
import { color, font, radius, space, type } from '../theme/tokens';

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
  if (!task) {
    return (
      <Pressable
        onPress={onOpenList}
        accessibilityRole="button"
        style={({ pressed }) => [styles.card, styles.empty, pressed && styles.pressed]}
      >
        <Text style={styles.label}>Next strike</Text>
        <Text style={styles.emptyText}>{emptyLabel}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Text style={styles.label}>Next strike</Text>
        <Text style={styles.minutes}>{formatMinutes(task.minutes)}</Text>
      </View>

      <Text style={styles.title}>{task.title}</Text>

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            play('armamentStrike');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.crimson,
    borderRadius: radius.md,
    padding: space.lg,
    gap: space.md,
  },
  empty: { borderColor: color.line, borderStyle: 'dashed' },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  label: { ...type.label, color: color.crimson },
  minutes: { ...type.mono, color: color.inkDim },
  title: { fontFamily: font.displayBold, fontSize: 22, lineHeight: 28, color: color.ink },
  emptyText: { ...type.body, color: color.inkDim },

  row: { flexDirection: 'row', gap: space.sm },
  done: {
    flex: 2,
    backgroundColor: color.crimson,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  doneText: { ...type.heading, color: '#0A0B12' },
  more: {
    flex: 1,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  moreText: { ...type.heading, color: color.inkDim },
  pressed: { opacity: 0.75 },
});
