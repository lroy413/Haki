import { StyleSheet, Text, View } from 'react-native';
import type { Quote } from '../domain/quotes';
import { color, font, space, type } from '../theme/tokens';

/**
 * The line at the top of the home screen.
 *
 * Set quietly on purpose — it sits above the Reserve, and if it competes with
 * the number it becomes decoration you stop reading by week two.
 */
export function QuoteLine({ quote }: { quote: Quote }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{quote.text}</Text>
      <Text style={styles.who}>{quote.who}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.xs, paddingVertical: space.xs },
  text: {
    fontFamily: font.bodyItalic,
    fontSize: 17,
    lineHeight: 25,
    color: color.inkDim,
  },
  who: { ...type.label, fontSize: 9, color: color.inkFaint },
});
