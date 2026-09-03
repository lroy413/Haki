import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { noCourse, type Course } from '../domain/course';
import { font, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The day's heading, in the masthead.
 *
 * It sits beside the wordmark, where the day count used to be. The owner:
 * _"That doesn't matter as much to me. I'm 37, I've been on the sea awhile
 * already."_ The count meant nothing to him, and the course is the one line
 * that says what this particular day is for — so it took the corner, and the
 * card it used to stand in under the quote is gone. Newsreader rather than
 * the display face: this is a sentence someone wrote, not a heading the app
 * generated, and it should read like one.
 *
 * Unset, it says where to tap and nothing more. Deliberately not a prompt, a
 * nudge, or a question: an empty course is a normal state of a morning, and
 * the app has nothing to say about it. No frame either way — a dashed box in
 * a corner is furniture, and the label already says what the words are.
 */
export function CourseLine({
  course,
  label,
  onPress,
}: {
  course: Course | null;
  label: string;
  onPress: () => void;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={course ? `${label}: ${course.heading}` : `Set the day's ${label}`}
      hitSlop={8}
      style={({ pressed }) => [styles.mark, pressed && styles.pressed]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={course ? styles.heading : styles.placeholder} numberOfLines={2}>
        {course ? course.heading : noCourse()}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    // Shrinks before the wordmark does, and never past two lines of heading.
    mark: {
      flexShrink: 1,
      maxWidth: '64%',
      minHeight: 44,
      alignItems: 'flex-end',
      // The label's cap lands level with the wordmark's rather than above it.
      paddingTop: 5,
      gap: 2,
    },
    label: { ...type.label, color: c.cyan, textAlign: 'right' },
    heading: {
      fontFamily: font.body,
      fontSize: 17,
      lineHeight: 21,
      color: c.ink,
      textAlign: 'right',
    },
    placeholder: {
      ...type.body,
      fontSize: 16,
      lineHeight: 21,
      color: c.inkFaint,
      textAlign: 'right',
    },
    pressed: { ...press },
  });
