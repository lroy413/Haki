import { useEffect, useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Dial } from '../src/components/Dial';
import { useStore } from '../src/db/client';
import { recentSleep, saveRead, saveSleep } from '../src/db/repo';
import { play } from '../src/sound';
import { useSingleFlight } from '../src/state/useSingleFlight';
import { useHaki } from '../src/state/HakiProvider';
import { todayKey } from '../src/domain/date';
import { WEATHER_WORDS } from '../src/domain/weather';
import { radius, space, type } from '../src/theme/tokens';
import { press } from '../src/theme/surfaces';
import type { Palette } from '../src/theme/palettes';

/**
 * The Daily Read. Four dials and a sleep figure.
 *
 * Everything here is optional except the four dials, and nothing blocks saving.
 * A partial read is worth far more than a skipped one.
 */
export default function DailyReadScreen() {
  const router = useRouter();
  const { db } = useStore();
  const { read, t, refresh, showRead, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [energy, setEnergy] = useState<number | null>(read?.energy ?? null);
  const [mood, setMood] = useState<number | null>(read?.mood ?? null);
  const [clarity, setClarity] = useState<number | null>(read?.clarity ?? null);
  const [tension, setTension] = useState<number | null>(read?.tension ?? null);
  const [sleep, setSleep] = useState('');
  const [weather, setWeather] = useState<string | null>(read?.weather ?? null);
  const committing = useSingleFlight();

  // A cold open beats the provider's first load, so the dials seeded above can
  // be four nulls over a day that was already read. Reconcile once the read
  // arrives — but only into dials the finger has not already moved, or the
  // arriving row would overwrite a tap.
  const touched = useRef(false);
  useEffect(() => {
    if (!read || touched.current) return;
    setEnergy(read.energy);
    setMood(read.mood);
    setClarity(read.clarity);
    setTension(read.tension);
    setWeather(read.weather ?? null);
  }, [read]);

  useEffect(() => {
    void (async () => {
      const nights = await recentSleep(db, 1, todayKey());
      if (nights[0]) setSleep(String(nights[0].hours));
    })();
  }, [db]);

  const mark = (set: (value: number) => void) => (value: number) => {
    touched.current = true;
    set(value);
  };

  const remaining = [energy, mood, clarity, tension].filter((v) => v === null).length;
  const complete = remaining === 0;

  async function save() {
    if (energy === null || mood === null || clarity === null || tension === null) return;
    await committing(async () => {
      // The screen answers the finger: sound and dismissal happen in this
      // frame, and the rows land behind the closed door.
      play('observationRead');
      // Say what was written before the door closes — the home screen
      // refreshes on focus, which happens here, before the row below is
      // issued. See `showRead` in HakiProvider.
      showRead({ energy, mood, clarity, tension, weather: weather ?? null });
      router.back();

      await saveRead(db, { energy, mood, clarity, tension }, todayKey(), weather);
      const hours = Number.parseFloat(sleep.replace(',', '.'));
      if (Number.isFinite(hours) && hours >= 0 && hours <= 24) {
        await saveSleep(db, hours);
      }
      await refresh();
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Dial
          label={t.dials.energy}
          value={energy}
          onChange={mark(setEnergy)}
          accent={palette.violet}
        />
        <Dial
          label={t.dials.mood}
          value={mood}
          onChange={mark(setMood)}
          accent={palette.violet}
        />
        <Dial
          label={t.dials.clarity}
          value={clarity}
          onChange={mark(setClarity)}
          accent={palette.violet}
        />
        {/* Violet, like the other three. This dial was crimson, and crimson
            in this app means *something has gone wrong* — so a tension of 2
            on a screen that says "low is better" lit up as a warning about a
            good answer. The four dials are four facets of one reading, not
            four lenses: 見聞色 is the light the Daily Read belongs to, and
            one screen gets one light. */}
        <Dial
          label={t.dials.tension}
          value={tension}
          onChange={mark(setTension)}
          inverted
          accent={palette.violet}
        />

        {/* The one word after the dials. Optional every single day: a read
            saves fine without it, tapping the word again clears it, and
            nothing anywhere counts how often one was given. */}
        <View style={styles.weather}>
          <Text style={styles.weatherLabel}>{t.weatherPrompt}</Text>
          <Text style={styles.weatherHint}>{t.weatherHint}</Text>
          <View style={styles.weatherRow}>
            {WEATHER_WORDS.map((word) => {
              const on = weather === word;
              return (
                <Pressable
                  key={word}
                  onPress={() => setWeather(on ? null : word)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`Weather: ${word}`}
                  style={({ pressed }) => [
                    styles.weatherChip,
                    on && styles.weatherChipOn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.weatherWord, on && styles.weatherWordOn]}>{word}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.sleep}>
          <Text style={styles.sleepLabel}>{t.sleepPrompt}</Text>
          <TextInput
            value={sleep}
            onChangeText={setSleep}
            keyboardType="decimal-pad"
            placeholder="7.5"
            placeholderTextColor={palette.inkFaint}
            style={styles.sleepInput}
            returnKeyType="done"
            accessibilityLabel={t.sleepPrompt}
          />
        </View>

        <Pressable
          onPress={save}
          disabled={!complete}
          accessibilityRole="button"
          accessibilityLabel={complete ? 'Save the read' : `${remaining} still to set`}
          style={({ pressed }) => [
            styles.save,
            !complete && styles.saveDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>
            {complete
              ? read
                ? 'Save the revision'
                : 'Save'
              : `${remaining} ${remaining === 1 ? 'dial' : 'dials'} to go`}
          </Text>
        </Pressable>

        {read ? <Text style={styles.already}>Logged today. Saving revises it.</Text> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },

    weather: { gap: space.xs },
    weatherLabel: { ...type.heading, color: c.ink },
    weatherHint: { ...type.small, color: c.inkFaint, lineHeight: 18 },
    weatherRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.xs },
    weatherChip: {
      borderWidth: 1,
      borderColor: c.line,
      backgroundColor: c.surface,
      borderRadius: radius.pill,
      paddingHorizontal: space.md,
      paddingVertical: space.sm,
    },
    weatherChipOn: { borderColor: c.violet, backgroundColor: c.violetSoft },
    weatherWord: { ...type.small, color: c.inkDim },
    weatherWordOn: { color: c.violet },

    sleep: { gap: space.sm },
    sleepLabel: { ...type.heading, color: c.ink },
    sleepInput: {
      ...type.body,
      color: c.ink,
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.line,
      borderTopColor: c.specular,
      borderRadius: radius.md,
      paddingHorizontal: space.lg,
      height: 54,
    },

    save: {
      backgroundColor: c.violet,
      borderRadius: radius.md,
      paddingVertical: space.lg,
      alignItems: 'center',
    },
    saveDisabled: { backgroundColor: c.surface2 },
    saveText: { ...type.heading, color: c.onAccent },
    already: { ...type.small, color: c.inkFaint, textAlign: 'center' },
    pressed: { ...press },
  });
