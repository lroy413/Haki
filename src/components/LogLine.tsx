import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStore } from '../db/client';
import { logLine } from '../db/repo';
import { CAPTURE_PLACEHOLDER, isWritable } from '../domain/logbook';
import { useHaki } from '../state/HakiProvider';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The journal's small door: one line, folded into today's entry.
 *
 * A component because it now stands in two places — the Observation tab,
 * where the journal lives, and the home screen, which keeps a quick way in
 * because the door that asks nothing should be one tap from where the day
 * starts. One implementation, or the two drift.
 */
export function LogLine({ onLogged }: { onLogged?: () => void }) {
  const { db } = useStore();
  const { t, palette, refresh } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [line, setLine] = useState('');
  const [saving, setSaving] = useState(false);

  async function capture() {
    if (!isWritable(line) || saving) return;
    setSaving(true);
    try {
      // Cleared first: the line is already the user's, and a field that sits
      // full while a write lands reads as a tap that did nothing.
      const text = line;
      setLine('');
      void Haptics.selectionAsync();
      await logLine(db, text);
      await refresh();
      onLogged?.();
    } finally {
      setSaving(false);
    }
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
        onSubmitEditing={() => void capture()}
        accessibilityLabel={CAPTURE_PLACEHOLDER}
      />
      <Pressable
        onPress={() => void capture()}
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

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    capture: { flexDirection: 'row', gap: space.sm },
    input: {
      ...type.body,
      flex: 1,
      fontSize: 16,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      paddingHorizontal: space.md,
      height: 48,
    },
    log: {
      justifyContent: 'center',
      paddingHorizontal: space.lg,
      backgroundColor: c.cyan,
      borderRadius: radius.md,
    },
    logDisabled: { opacity: 0.4 },
    logText: { ...type.heading, color: c.onAccent },
    pressed: { opacity: 0.75 },
  });
