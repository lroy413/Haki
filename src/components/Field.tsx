import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * A labelled input, as the settings pages draw one.
 *
 * Lived inline in the settings screen while settings was one screen; now the
 * Keystone and Armament pages both need it, so it moved here unchanged.
 */
export function Field({
  label,
  value,
  onChangeText,
  numeric,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  numeric?: boolean;
  placeholder?: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={numeric ? 'decimal-pad' : 'default'}
        placeholder={placeholder}
        placeholderTextColor={palette.inkFaint}
        style={styles.input}
        accessibilityLabel={label}
      />
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    field: { gap: space.xs },
    fieldLabel: { ...type.label, color: c.inkFaint, fontSize: 11 },
    input: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface2,
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.sm,
      paddingHorizontal: space.md,
      height: 44,
    },
  });
