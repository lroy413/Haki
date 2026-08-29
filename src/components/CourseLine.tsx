import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { noCourse, type Course } from '../domain/course';
import { font, radius, space, type } from '../theme/tokens';
import { offer, press, row } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The day's heading, at the top of the home screen.
 *
 * It sits directly under the day count because that is what it is: the line
 * that says what this particular day at sea is for. Newsreader rather than the
 * display face — this is a sentence someone wrote, not a heading the app
 * generated, and it should read like one.
 *
 * Unset, it is a dashed outline saying what would go there. Deliberately not
 * a prompt, a nudge, or a question: an empty course is a normal state of a
 * morning, and the app has nothing to say about it beyond where to tap.
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
      style={({ pressed }) => [
        styles.frame,
        !course && styles.empty,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={course ? styles.heading : styles.placeholder}>
        {course ? course.heading : noCourse()}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    frame: {
      ...row(c),
      paddingVertical: space.md,
      paddingHorizontal: space.md,
      gap: space.xs,
    },
    empty: { ...offer(c), backgroundColor: 'transparent', borderColor: c.lineSoft },
    label: { ...type.label, color: c.cyan },
    heading: {
      fontFamily: font.body,
      fontSize: 21,
      lineHeight: 26,
      color: c.ink,
    },
    placeholder: { ...type.body, fontSize: 18, color: c.inkFaint },
    pressed: { ...press },
  });
