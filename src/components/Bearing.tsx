import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { play } from '../sound';
import { fireImpact } from '../impact';
import { useHaki } from '../state/HakiProvider';
import { SectionLabel } from './SectionLabel';
import {
  BEARING_SHOWN,
  PRIORITY_LABEL,
  dueLine,
  moreLine,
  heatOf,
  pressingLabel,
  planNote,
  daysUntil,
} from '../domain/pressing';
import { formatMinutes, type Task } from '../domain/tasks';
import { todayKey } from '../domain/date';
import { font, radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * What is bearing down — on the home screen, above everything.
 *
 * The owner's ask was specific: *"If I set a date I want to have something
 * done by I need it to be in my face and emphasized if labeled priority."*
 * This is the in-your-face part, and where it sits is most of the design: the
 * top of the screen you open, above the day itself.
 *
 * **It reads across every day, not just today.** That is the whole reason it
 * exists rather than being a sort order on the Do tab. A task due today that
 * you planned for Saturday lives in Saturday's list — the one list you will
 * not open today — so a card that filtered by `committedFor` would hide
 * precisely the case this feature was built to catch.
 *
 * **It is absent when nothing presses**, like the Day's End door and for the
 * same reason: a card that is always there is a card you learn to scroll
 * past, and then it is furniture rather than a warning.
 *
 * Loud by position, weight and the app's one warmth. It does not ring, badge,
 * or count how many dates have gone by — `warn`, never crimson, because a
 * date arriving is not a breach.
 */
export function Bearing({
  tasks,
  onStrike,
  onOpenList,
}: {
  tasks: Task[];
  onStrike: (task: Task) => void;
  onOpenList: () => void;
}) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const today = todayKey();

  if (tasks.length === 0) return null;

  // Capped, and the remainder counted rather than hidden — see BEARING_SHOWN.
  const shown = tasks.slice(0, BEARING_SHOWN);
  const more = moreLine(tasks.length, shown.length, plainMode);

  return (
    <View style={styles.group}>
      <SectionLabel
        label={pressingLabel(tasks.length, plainMode)}
        trailing={plainMode ? undefined : '迫る'}
        tint={palette.warn}
      />
      {shown.map((task) => (
        <Row key={task.id} task={task} today={today} onStrike={() => onStrike(task)} />
      ))}
      {more ? (
        <Pressable
          onPress={onOpenList}
          accessibilityRole="button"
          accessibilityLabel={more}
          style={({ pressed }) => [styles.more, pressed && styles.pressed]}
        >
          <Text style={styles.moreText}>{more}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Row({ task, today, onStrike }: { task: Task; today: string; onStrike: () => void }) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const days = daysUntil(task.dueBy, today);
  const heat = heatOf(days);
  const hot = heat === 'past' || heat === 'today';
  const due = dueLine(task.dueBy, today);
  const plan = planNote(task, today, plainMode);

  function strike() {
    void Haptics.selectionAsync();
    play('armamentStrike');
    fireImpact();
    onStrike();
  }

  return (
    <Pressable
      onPress={strike}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: false }}
      accessibilityLabel={`Done: ${task.title}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.box} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {task.title}
        </Text>
        <View style={styles.marks}>
          {task.priority ? (
            <Text style={[styles.mark, styles.flag]}>{PRIORITY_LABEL}</Text>
          ) : null}
          {due ? (
            <Text style={[styles.mark, hot ? styles.hot : styles.cool]}>{due}</Text>
          ) : null}
          <Text style={[styles.mark, styles.cool]}>{formatMinutes(task.minutes)}</Text>
        </View>
        {plan ? <Text style={styles.plan}>{plan}</Text> : null}
      </View>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    group: { gap: space.sm },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space.md,
      minHeight: 44,
      borderWidth: 1,
      borderColor: c.line,
      borderLeftWidth: 3,
      borderLeftColor: c.warn,
      borderRadius: radius.md,
      backgroundColor: c.surface,
      paddingHorizontal: space.md,
      paddingVertical: space.md,
    },
    box: {
      width: 26,
      height: 26,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: c.line,
    },
    body: { flex: 1, gap: 3 },
    // Weight, not size. Nothing in this app grows to shout.
    title: {
      ...type.body,
      fontFamily: font.bodyMedium,
      fontSize: 19,
      color: c.ink,
      lineHeight: 23,
    },
    marks: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
    mark: { ...type.mono, fontSize: 12 },
    flag: { color: c.warn },
    hot: { color: c.warn },
    cool: { color: c.inkFaint },
    plan: { ...type.mono, fontSize: 12, color: c.inkFaint },
    more: { minHeight: 44, justifyContent: 'center', paddingHorizontal: space.md },
    moreText: { ...type.mono, fontSize: 13, color: c.inkDim },
    pressed: { ...press },
  });
