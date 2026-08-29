import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useHaki } from '../state/HakiProvider';
import { skyEmptyLine, skyLine, type Sky } from '../domain/weather';
import { shortDay } from '../domain/date';
import { radius, space, type } from '../theme/tokens';
import type { Palette } from '../theme/palettes';

/**
 * Inner Weather — the run of words you have given the mornings.
 *
 * The word was asked for every day and shown nowhere but that morning's own
 * read row, which made it a question with no answer behind it. This is the
 * answer, and it is the whole feature: a run you can look along.
 *
 * Everything it refuses is in `domain/weather.ts`'s header — no tally, no most
 * common, no average, no trend, nothing fed to Foresight. What is left is the
 * order the words came in, which is the only true thing there is to show.
 *
 * A day with no word is drawn as a gap rather than as a value, because
 * "nothing said" is not "Calm", and the word was optional on purpose.
 */
export function SkyRun({ run, tint, today }: { run: Sky[]; tint: string; today: string }) {
  const { palette, plainMode } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const said = skyLine(run, plainMode);
  const strip = useRef<ScrollView>(null);

  return (
    <View style={styles.wrap}>
      {said ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.run}
          ref={strip}
          // The run reads left to right in time, so the informative end is
          // the right-hand one. Without this the strip opens on a fortnight
          // ago — which on a new install is a screen of empty columns, and
          // reads as a broken chart rather than as a quiet one.
          onContentSizeChange={() => strip.current?.scrollToEnd({ animated: false })}
        >
          {run.map((sky) => (
            <View key={sky.day} style={styles.day}>
              {/* The word in the screen's light where there is one, and a
                  quiet rule where there is not. Every column the same width,
                  so the run reads as a run rather than as a ragged list. */}
              {sky.word ? (
                <Text style={[styles.word, { color: tint }]} numberOfLines={1}>
                  {sky.word}
                </Text>
              ) : (
                <View style={styles.gap} />
              )}
              <Text style={[styles.when, sky.day === today && styles.now]} numberOfLines={1}>
                {sky.day === today ? 'Today' : shortDay(sky.day, today)}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : null}
      <Text style={styles.line}>{said ?? skyEmptyLine(plainMode)}</Text>
    </View>
  );
}

const WIDTH = 76;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    run: { gap: space.xs, paddingVertical: space.xs },
    day: { width: WIDTH, alignItems: 'center', gap: space.xs },
    word: {
      ...type.mono,
      fontSize: 12,
      textAlign: 'center',
      width: '100%',
      minHeight: 34,
      lineHeight: 34,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
    },
    // Not a dash and not an empty box with a border: an unnamed morning is a
    // morning nothing was said about, and a bordered blank reads as a value.
    gap: {
      width: '100%',
      height: 34,
      borderBottomWidth: 1,
      borderBottomColor: c.lineSoft,
    },
    when: { ...type.mono, fontSize: 12, color: c.inkFaint },
    now: { color: c.inkDim },
    line: { ...type.small, color: c.inkDim, lineHeight: 21 },
  });
