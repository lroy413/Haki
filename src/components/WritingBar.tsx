import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHaki } from '../state/HakiProvider';
import {
  MARK_LABELS,
  MARK_NAMES,
  PREFIX_LABELS,
  PREFIX_NAMES,
  insertRule,
  toggleMark,
  togglePrefix,
  type Edit,
  type LinePrefix,
  type Mark,
  type Selection,
} from '../domain/markdown';
import { font, radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
import type { Palette } from '../theme/palettes';

/**
 * The writing bar — formatting for the journal and for notes.
 *
 * The app has always stored plain Markdown, on the grounds that nothing here
 * should need an export button to get your own words back out. That is still
 * true; this only means you no longer have to remember the syntax.
 *
 * **It edits text, it does not own it.** Every button hands back a new string
 * and a new selection and the screen decides what to do with them — which is
 * what lets the same bar sit under the journal, under a note, and under
 * anything written later, with no knowledge of where the words are going.
 *
 * The operations themselves are in `domain/markdown.ts`, tested on plain Node.
 * What lives here is the row of buttons and one rule: **the selection comes
 * back with the edit.** A toolbar that formats and then drops the caret at the
 * end of the field is a toolbar you press once.
 */
export function WritingBar({
  tint,
  value,
  selection,
  onEdit,
}: {
  /** The screen's own light. No default — see the one-light rule. */
  tint: string;
  value: string;
  selection: Selection;
  onEdit: (edit: Edit) => void;
}) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  function run(edit: Edit) {
    // Formatting is a small mechanical act, so it gets the small mechanical
    // acknowledgement and nothing else. No sound: a toolbar that chimes is a
    // toolbar you turn off.
    if (!plainMode) void Haptics.selectionAsync();
    onEdit(edit);
  }

  const marks: Mark[] = ['bold', 'italic', 'code'];
  const prefixes: LinePrefix[] = ['heading', 'bullet', 'task', 'quote'];

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.row}
      >
        {marks.map((mark) => (
          <Key
            key={mark}
            label={MARK_LABELS[mark]}
            name={MARK_NAMES[mark]}
            styles={styles}
            heavy={mark === 'bold'}
            italic={mark === 'italic'}
            mono={mark === 'code'}
            tint={tint}
            onPress={() => run(toggleMark(value, selection, mark))}
          />
        ))}
        <View style={styles.divider} />
        {prefixes.map((prefix) => (
          <Key
            key={prefix}
            label={PREFIX_LABELS[prefix]}
            name={PREFIX_NAMES[prefix]}
            styles={styles}
            heavy={prefix === 'heading'}
            tint={tint}
            onPress={() => run(togglePrefix(value, selection, prefix))}
          />
        ))}
        <View style={styles.divider} />
        <Key
          label="—"
          name="Divider"
          styles={styles}
          tint={tint}
          onPress={() => run(insertRule(value, selection))}
        />
      </ScrollView>
    </View>
  );
}

function Key({
  label,
  name,
  styles,
  tint,
  heavy,
  italic,
  mono,
  onPress,
}: {
  label: string;
  name: string;
  styles: ReturnType<typeof makeStyles>;
  tint: string;
  heavy?: boolean;
  italic?: boolean;
  mono?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      style={({ pressed }) => [styles.key, pressed && styles.pressed]}
    >
      <Text
        style={[
          styles.keyText,
          heavy && styles.heavy,
          italic && styles.italic,
          mono && styles.mono,
          { color: tint },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    bar: {
      borderTopWidth: 1,
      borderTopColor: c.line,
      backgroundColor: c.surface,
    },
    row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.sm, gap: 2 },
    // 44 is the floor for anything you tap, and this row sits right above a
    // keyboard — the least forgiving place on the screen to aim at.
    key: {
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.sm,
      paddingHorizontal: space.sm,
    },
    keyText: { ...type.body, fontSize: 17 },
    heavy: { fontFamily: font.displayBold },
    italic: { fontFamily: font.bodyItalic },
    mono: { fontFamily: font.mono, fontSize: 15 },
    divider: { width: 1, height: 20, backgroundColor: c.line, marginHorizontal: space.xs },
    pressed: { ...press },
  });
