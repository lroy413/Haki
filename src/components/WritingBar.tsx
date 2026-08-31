import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useHaki } from '../state/HakiProvider';
import {
  MARK_NAMES,
  PREFIX_NAMES,
  activeMarks,
  activePrefixes,
  insertRule,
  toggleMark,
  togglePrefix,
  type Edit,
  type LinePrefix,
  type Mark,
  type Selection,
} from '../domain/markdown';
import { WritingIcon, type IconName } from './WritingIcons';
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
 * What lives here is the row of buttons and three rules:
 *
 * **The selection comes back with the edit.** A toolbar that formats and then
 * drops the caret at the end of the field is a toolbar you press once.
 *
 * **The marks are drawn, not typed** — see `WritingIcons.tsx`. The bar shipped
 * with five characters standing in for icons and the owner's verdict was the
 * only one that matters: *"This is not a toolbar I understand."* Bold and
 * italic were fine, because B and I are letters in every toolbar ever built.
 * The rest were a backtick, a dot, a hollow square, a left-half-block and an
 * em-dash, and the block in particular rendered as a solid teal bar
 * indistinguishable from a missing glyph.
 *
 * **And every key says whether it is on.** That is the half that teaches the
 * bar: a row that looks identical wherever the caret is can only be learned by
 * pressing things and reading the syntax that falls out, while a row where
 * Bold lights up when you tap into bold text has explained itself and, at the
 * same time, said that pressing it again takes the bold off.
 */
export function WritingBar({
  tint,
  tintSoft,
  value,
  selection,
  onEdit,
}: {
  /** The screen's own light. No default — see the one-light rule. */
  tint: string;
  /** The same light, to fill a key that is on. Also the screen's to name. */
  tintSoft: string;
  value: string;
  selection: Selection;
  onEdit: (edit: Edit) => void;
}) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  // Keyed on the numbers rather than the object: `selection` is rebuilt every
  // render by the screen above, so memoising on it memoises nothing.
  const { start, end } = selection;
  const on = useMemo(
    () => ({
      marks: new Set<Mark>(activeMarks(value, { start, end })),
      prefixes: new Set<LinePrefix>(activePrefixes(value, { start, end })),
    }),
    [value, start, end],
  );

  function run(edit: Edit) {
    // Formatting is a small mechanical act, so it gets the small mechanical
    // acknowledgement and nothing else. No sound: a toolbar that chimes is a
    // toolbar you turn off.
    if (!plainMode) void Haptics.selectionAsync();
    onEdit(edit);
  }

  const shared = { styles, tint, tintSoft, ink: palette.ink };

  return (
    <View style={styles.bar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="always"
        contentContainerStyle={styles.row}
      >
        {MARK_KEYS.map(({ mark, letter, face, icon }) => (
          <Key
            key={mark}
            {...shared}
            name={MARK_NAMES[mark]}
            letter={letter}
            face={face}
            icon={icon}
            lit={on.marks.has(mark)}
            onPress={() => run(toggleMark(value, selection, mark))}
          />
        ))}
        <View style={styles.divider} />
        {PREFIX_KEYS.map(({ prefix, letter, face, icon }) => (
          <Key
            key={prefix}
            {...shared}
            name={PREFIX_NAMES[prefix]}
            letter={letter}
            face={face}
            icon={icon}
            lit={on.prefixes.has(prefix)}
            onPress={() => run(togglePrefix(value, selection, prefix))}
          />
        ))}
        <View style={styles.divider} />
        {/* A rule is the one control with nothing to be on or off about: it
            goes *between* things rather than around them, so it is an insert
            and never a toggle. */}
        <Key
          {...shared}
          name="Divider"
          icon="rule"
          lit={false}
          onPress={() => run(insertRule(value, selection))}
        />
      </ScrollView>
    </View>
  );
}

/** Which face a letter key is set in. Never a `fontWeight` — see the tokens. */
type Face = 'heavy' | 'italic';

/**
 * The three letters and the five drawings, in the order they are pressed.
 *
 * B, I and H stay as type on purpose. They are letters in every editor
 * anybody has used, they are the ones the owner could already read, and a
 * Latin capital is the one glyph no loaded face is missing — which is more
 * than could be said for the five that have been redrawn.
 */
const MARK_KEYS: Array<{ mark: Mark; letter?: string; face?: Face; icon?: IconName }> = [
  { mark: 'bold', letter: 'B', face: 'heavy' },
  { mark: 'italic', letter: 'I', face: 'italic' },
  { mark: 'code', icon: 'code' },
];

const PREFIX_KEYS: Array<{
  prefix: LinePrefix;
  letter?: string;
  face?: Face;
  icon?: IconName;
}> = [
  { prefix: 'heading', letter: 'H', face: 'heavy' },
  { prefix: 'bullet', icon: 'bullet' },
  { prefix: 'task', icon: 'task' },
  { prefix: 'quote', icon: 'quote' },
];

function Key({
  name,
  letter,
  face,
  icon,
  lit,
  styles,
  tint,
  tintSoft,
  ink,
  onPress,
}: {
  name: string;
  letter?: string;
  face?: Face;
  icon?: IconName;
  /** Whether this format is on where the caret is. */
  lit: boolean;
  styles: ReturnType<typeof makeStyles>;
  tint: string;
  tintSoft: string;
  ink: string;
  onPress: () => void;
}) {
  // Off is the app's ordinary text colour, not the lens: a toolbar is
  // furniture and should be quiet until it has something to say. Eight keys
  // all burning the screen's light said nothing eight times over — and left
  // the bar with no colour in reserve for the one thing it needed to say.
  const colour = lit ? tint : ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={name}
      accessibilityState={{ selected: lit }}
      style={({ pressed }) => [
        styles.key,
        lit && { backgroundColor: tintSoft, borderColor: tint },
        pressed && styles.pressed,
      ]}
    >
      {letter ? (
        <Text
          style={[
            styles.letter,
            face === 'heavy' && styles.heavy,
            face === 'italic' && styles.italic,
            { color: colour },
          ]}
        >
          {letter}
        </Text>
      ) : icon ? (
        <WritingIcon name={icon} colour={colour} />
      ) : null}
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
      borderRadius: radius.md,
      paddingHorizontal: space.sm,
      // Carried always, in the bar's own colour, so a key that lights up does
      // not also change size. The rim is what makes the lit state readable on
      // the second palette, where the soft fill and the bar sit at almost the
      // same lightness (1.05:1) and differ only in hue.
      borderWidth: 1,
      borderColor: c.surface,
    },
    letter: { ...type.body, fontSize: 19, lineHeight: 24 },
    heavy: { fontFamily: font.displayBold },
    italic: { fontFamily: font.bodyItalic },
    divider: { width: 1, height: 20, backgroundColor: c.line, marginHorizontal: space.xs },
    pressed: { ...press },
  });
