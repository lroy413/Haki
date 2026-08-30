import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../db/client';
import { logLine } from '../db/repo';
import { CAPTURE_PLACEHOLDER, isWritable } from '../domain/logbook';
import { useHaki } from '../state/HakiProvider';
import { useSingleFlight } from '../state/useSingleFlight';
import { radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The journal's small door: one line, folded into today's entry.
 *
 * A component because it now stands in two places — the Observation tab,
 * where the journal lives, and the home screen, which keeps a quick way in
 * because the door that asks nothing should be one tap from where the day
 * starts. One implementation, or the two drift.
 *
 * **It takes its colour from the screen that mounts it.** This is the rule
 * the app calls *one screen, one light*, and a shared control is the one
 * place it is easy to break: written on the home screen, this button was
 * cyan, and it stayed cyan when it was reused on the violet tab. A teal
 * button on a violet screen is not a small thing — it is the app looking
 * like two apps. So `tint` is required and has no default: a control that
 * cannot be mounted without naming its light cannot drift.
 */
export function LogLine({ onLogged, tint }: { onLogged?: () => void; tint: string }) {
  const { db } = useStore();
  const { t, palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette, tint), [palette, tint]);

  const [line, setLine] = useState('');
  const [saving, setSaving] = useState(false);
  /**
   * A ref, because state is exactly what is too slow here.
   *
   * `saving` was the whole guard, and two taps landing in one frame both read
   * it as false out of the same render's closure — and both read the same
   * `line`, so the second one wrote the entry again. It is the road form's
   * five pillars at one-line scale. The acknowledgement still goes *inside*
   * the flight, where it only happens if the write is actually going to.
   */
  const committing = useSingleFlight();

  function capture() {
    void committing(async () => {
      const text = line;
      if (!isWritable(text)) return;
      setSaving(true);
      try {
        // Cleared inside the flight and before the first await: the line is
        // already the user's, and a field that sits full while a write lands
        // reads as a tap that did nothing.
        setLine('');
        void Haptics.selectionAsync();
        await logLine(db, text);
        await refresh();
        onLogged?.();
      } finally {
        setSaving(false);
      }
    });
  }

  return (
    <View style={styles.capture}>
      <TextInput
        value={line}
        onChangeText={setLine}
        placeholder={CAPTURE_PLACEHOLDER}
        placeholderTextColor={palette.inkFaint}
        style={styles.input}
        returnKeyType="done"
        onSubmitEditing={capture}
        accessibilityLabel={CAPTURE_PLACEHOLDER}
      />
      <Pressable
        onPress={capture}
        disabled={!isWritable(line) || saving}
        accessibilityRole="button"
        accessibilityLabel="Log this line"
        style={({ pressed }) => [
          styles.log,
          !isWritable(line) && styles.logDisabled,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.logText}>{t.logLine}</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c: Palette, tint: string) =>
  StyleSheet.create({
    capture: { flexDirection: 'row', gap: space.sm },
    input: {
      ...type.body,
      flex: 1,
      fontSize: 18,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      height: 48,
    },
    log: {
      justifyContent: 'center',
      paddingHorizontal: space.lg,
      backgroundColor: tint,
      borderRadius: radius.md,
    },
    logDisabled: { opacity: 0.4 },
    logText: { ...type.heading, color: c.onAccent },
    pressed: { ...press },
  });
