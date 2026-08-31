import { useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useHaki } from '../state/HakiProvider';
import { skyEmptyLine, skyLine, type Sky } from '../domain/weather';
import { shortDay } from '../domain/date';
import { radius, space, type } from '../theme/tokens';
import { press } from '../theme/surfaces';
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
 *
 * **Every column opens its day.** The weather shifts, and until this opened
 * there was nowhere to say so: the word was asked for once, on waking, and the
 * afternoon it turned had no row to go in. A column shows what the day *came
 * to* — the last thing you called it, never an average of eight words that
 * have no numbers behind them — and a day that got there by more than one
 * reading wears a leaf behind it. **A leaf, not a figure**: "your weather
 * moved five times today" is a steadiness score with a nautical hat on, and
 * the whole vocabulary was picked for having no scale in it.
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
            <Pressable
              key={sky.day}
              onPress={() => router.push(`/weather/${sky.day}`)}
              accessibilityRole="button"
              accessibilityLabel={
                sky.word
                  ? `${sky.word} on ${sky.day}. Open the day.`
                  : `Nothing named on ${sky.day}. Open the day.`
              }
              style={({ pressed }) => [styles.day, pressed && styles.pressed]}
            >
              {/* The word in the screen's light where there is one, and a
                  quiet rule where there is not. Every column the same width,
                  so the run reads as a run rather than as a ragged list. */}
              {sky.word ? (
                <View style={styles.chip}>
                  {/* The leaf: a day that moved is drawn as more than one
                      page, offset behind the word. It says "there is more
                      inside" and refuses to say how much. */}
                  {sky.moved ? <View style={styles.leaf} /> : null}
                  <Text style={[styles.word, { color: tint }]} numberOfLines={1}>
                    {sky.word}
                  </Text>
                </View>
              ) : (
                <View style={styles.chip}>
                  <View style={styles.gap} />
                </View>
              )}
              <Text style={[styles.when, sky.day === today && styles.now]} numberOfLines={1}>
                {sky.day === today ? 'Today' : shortDay(sky.day, today)}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {said ? (
        <Text style={styles.line}>{said}</Text>
      ) : (
        // A run with nothing in it draws no columns, and a column is the only
        // door to a day — so on a fresh install the one thing you could not do
        // was name the weather at four in the afternoon. The offer is the door.
        <Pressable
          onPress={() => router.push(`/weather/${today}`)}
          accessibilityRole="button"
          accessibilityLabel="Name the weather now"
          style={({ pressed }) => [styles.offer, pressed && styles.pressed]}
        >
          <Text style={styles.line}>{skyEmptyLine(plainMode)}</Text>
          <Text style={[styles.now, { color: tint }]}>{plainMode ? 'Add one' : 'Name it'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const WIDTH = 76;

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    wrap: { gap: space.sm },
    run: { gap: space.xs, paddingVertical: space.xs },
    // 44 is the floor for anything you tap, and every column is one now.
    day: { width: WIDTH, alignItems: 'center', gap: space.xs, minHeight: 44, paddingTop: 4 },
    chip: { width: '100%' },
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
    leaf: {
      position: 'absolute',
      top: -4,
      left: 4,
      right: -4,
      height: 34,
      borderRadius: radius.sm,
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface2,
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
    offer: { minHeight: 44, justifyContent: 'center', gap: space.xs },
    pressed: { ...press },
  });
