import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { calmLine, returnLine, type Voyage } from '../domain/voyage';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * The two sentences the app has never been able to say.
 *
 * A Return on the day it happens, and the Calm Belt when the water has been
 * flat for long enough to have a name. Never both — a day that ends a gap is
 * by definition not the sixth easy day in a row, and the domain guarantees it.
 *
 * **The Return keeps the signature violet under both flags.** It is not a
 * lens's light: coming back is not an act of Observation or of Armament, it
 * is the voyage itself, so it does not take the crew's coating the way
 * 覇王色 does. The Calm Belt takes `warn` — the app's one warmth, the same
 * lamplight the settings chart and the chart table's buoys burn — because it
 * is a light held up to look at something, not a breach. **Crimson would be
 * wrong here and the choice is the whole design:** nothing has gone wrong on
 * an easy week, which is exactly why the sentence has to ask rather than tell.
 *
 * Neither card can appear on paper, and that falls out of the rule rather
 * than being enforced here: both require today to have been used, and a day
 * that has been used is a day that has hardened. Level 0 is the morning
 * before anything, and the app has nothing to say about the run yet.
 */
export function VoyageNote({ voyage }: { voyage: Voyage }) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const calm = voyage.becalmed ? calmLine(voyage.calmDays, plainMode) : null;
  const back = voyage.today ? returnLine(voyage.today, plainMode) : null;
  if (!back && !calm) return null;

  return (
    <View style={[styles.card, back ? styles.onReturn : styles.onCalm]}>
      <Text style={[styles.label, back ? styles.labelReturn : styles.labelCalm]}>
        {back
          ? plainMode
            ? 'Back'
            : 'The Return'
          : plainMode
            ? 'A quiet run'
            : 'The Calm Belt'}
      </Text>
      <Text style={styles.body}>{back ?? calm}</Text>
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    card: { borderWidth: 1, borderRadius: radius.md, padding: space.lg, gap: space.xs },
    onReturn: { borderColor: c.violet, backgroundColor: c.violetSoft },
    onCalm: { borderColor: c.warn, backgroundColor: c.warnSoft },
    label: { ...type.label },
    labelReturn: { color: c.violet },
    labelCalm: { color: c.warn },
    body: { ...type.body, color: c.ink, lineHeight: 22 },
  });
