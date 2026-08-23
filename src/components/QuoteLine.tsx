import { useHaki } from '../state/HakiProvider';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Quote } from '../domain/quotes';
import { font, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The line at the top of the home screen.
 *
 * Set quietly on purpose — it sits above the Reserve, and if it competes with
 * the number it becomes decoration you stop reading by week two.
 */
export function QuoteLine({ quote }: { quote: Quote }) {
  const { palette } = useHaki();

  const styles = useMemo(() => makeStyles(palette), [palette]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{quote.text}</Text>
      <Text style={styles.who}>{quote.who}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.xs, paddingVertical: space.xs },
    text: {
      fontFamily: font.bodyItalic,
      fontSize: 17,
      lineHeight: 25,
      color: c.inkDim,
    },
    who: { ...type.label, fontSize: 9, color: c.inkFaint },
  });
