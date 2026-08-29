import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { excerpt as cut } from '../domain/search';
import { press } from '../theme/surfaces';
import { font, radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * One field, and the excerpt that goes under a result.
 *
 * Both stand on more than one screen — the Logbook and Loose Pages — so
 * **`tint` has no default**: a shared control that can be mounted without
 * naming its light is a control that drifts, which is how the Do tab spent
 * months crimson with teal chips in it.
 */
export function SearchField({
  value,
  onChange,
  placeholder,
  tint,
  found,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
  tint: string;
  /** What the query turned up, or null while nothing is being searched for. */
  found: string | null;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={palette.inkFaint}
          style={styles.input}
          accessibilityLabel={placeholder}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {/* Clearing is one tap and it is the only way out that does not
            involve deleting a word at a time. */}
        {value.length > 0 ? (
          <Pressable
            onPress={() => onChange('')}
            accessibilityRole="button"
            accessibilityLabel="Clear the search"
            style={({ pressed }) => [styles.clear, pressed && styles.pressed]}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>
      {found ? <Text style={[styles.found, { color: tint }]}>{found}</Text> : null}
    </View>
  );
}

/**
 * A window of the entry around what was searched for, with the match marked.
 *
 * Showing an entry's first two lines under a search for "dentist" is not a
 * result — it is the same list, shorter. The point is to see the sentence the
 * word is in, so the match is separated out and drawn in the screen's light.
 *
 * Marked by weight and colour, never by a background: a highlight block behind
 * running text at this size reads as a rendering fault, and the app has no
 * colour that means "here" without also meaning something else.
 */
export function Excerpt({
  text,
  query,
  tint,
  fallback,
}: {
  text: string;
  query: string;
  tint: string;
  /** Drawn when the query does not actually appear — a title match, say. */
  fallback: string;
}) {
  const { palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const piece = useMemo(() => cut(text, query), [text, query]);

  if (!piece) {
    return (
      <Text style={styles.body} numberOfLines={2}>
        {fallback}
      </Text>
    );
  }
  return (
    <Text style={styles.body} numberOfLines={2}>
      {piece.before}
      <Text style={[styles.hit, { color: tint }]}>{piece.hit}</Text>
      {piece.after}
    </Text>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.xs },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: c.line,
      borderRadius: radius.md,
      backgroundColor: c.surface2,
      paddingLeft: space.md,
      paddingRight: space.xs,
    },
    input: { ...type.body, color: c.ink, flex: 1, minHeight: 48 },
    clear: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
    clearText: { ...type.mono, fontSize: 13, color: c.inkFaint },
    found: { ...type.mono, fontSize: 13 },
    pressed: { ...press },

    body: { ...type.body, color: c.inkDim, lineHeight: 24 },
    // A heavier face, never `fontWeight` — pairing one with an already-bold
    // family makes React Native synthesise a bolder face on top of it and
    // Android renders the result as smeared letterforms.
    hit: { fontFamily: font.bodyMedium },
  });
