import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useStore } from '../src/db/client';
import { setCourse, upcomingCourses } from '../src/db/repo';
import { useHaki } from '../src/state/HakiProvider';
import { COURSE_PROMPT, MAX_HEADING, courseFor, normaliseHeading } from '../src/domain/course';
import { addDays, todayKey } from '../src/domain/date';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * Set the day's course.
 *
 * Two buttons, not one. "Tomorrow" is not a convenience here — setting the
 * heading the night before is the version of this that actually works, and an
 * app that only offered "today" would be quietly insisting you do it in the
 * morning, which is the part that keeps not happening.
 *
 * Saving an empty field clears the heading. There is no separate delete: the
 * way to unset something should be to erase it.
 */
export default function CourseScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { refresh, palette, t } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const today = todayKey();
  const tomorrow = addDays(today, 1);

  const [heading, setHeading] = useState('');
  const [tomorrowHeading, setTomorrowHeading] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const courses = await upcomingCourses(db, today);
    setHeading(courseFor(courses, today)?.heading ?? '');
    setTomorrowHeading(courseFor(courses, tomorrow)?.heading ?? null);
    setLoaded(true);
  }, [db, today, tomorrow]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(day: string) {
    if (saving) return;
    setSaving(true);
    try {
      void Haptics.selectionAsync();
      await setCourse(db, day, heading);
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
  }

  const clearing = normaliseHeading(heading).length === 0;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.prompt}>{COURSE_PROMPT}</Text>

        <TextInput
          value={heading}
          onChangeText={setHeading}
          placeholder={t.coursePlaceholder}
          placeholderTextColor={palette.inkFaint}
          style={styles.input}
          maxLength={MAX_HEADING}
          multiline
          // Native only: iOS opens the keyboard for gesture-driven focus but
          // never for programmatic focus.
          autoFocus={Platform.OS !== 'web' && loaded}
          accessibilityLabel={COURSE_PROMPT}
        />

        <Text style={styles.note}>
          It is never marked. Nothing asks at the end of the day whether you held it.
        </Text>

        <View style={styles.row}>
          <Pressable
            onPress={() => void save(today)}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
          >
            <Text style={styles.primaryText}>{clearing ? 'Clear today' : 'Today'}</Text>
          </Pressable>
          <Pressable
            onPress={() => void save(tomorrow)}
            disabled={saving}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
          >
            <Text style={styles.secondaryText}>{clearing ? 'Clear tomorrow' : 'Tomorrow'}</Text>
          </Pressable>
        </View>

        {tomorrowHeading ? (
          <View style={styles.ahead}>
            <Text style={styles.aheadLabel}>Already set for tomorrow</Text>
            <Text style={styles.aheadBody}>{tomorrowHeading}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.md },
    prompt: { ...type.label, color: c.inkFaint },
    input: {
      ...type.body,
      fontSize: 20,
      lineHeight: 28,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      padding: space.md,
      minHeight: 96,
      textAlignVertical: 'top',
    },
    note: { ...type.small, color: c.inkFaint, lineHeight: 19 },

    row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs },
    primary: {
      flex: 1,
      backgroundColor: c.violet,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      paddingHorizontal: space.md,
      alignItems: 'center',
    },
    primaryText: { ...type.heading, color: c.onAccent },
    secondary: {
      flex: 1,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      paddingHorizontal: space.md,
      alignItems: 'center',
    },
    secondaryText: { ...type.heading, color: c.inkDim },
    pressed: { ...press },

    ahead: {
      borderWidth: 1,
      borderColor: c.lineSoft,
      borderRadius: radius.md,
      padding: space.md,
      gap: space.xs,
      marginTop: space.sm,
    },
    aheadLabel: { ...type.label, color: c.inkFaint },
    aheadBody: { ...type.body, color: c.inkDim, lineHeight: 22 },
  });
