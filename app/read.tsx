import { useEffect, useMemo, useState } from 'react';
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
import { useHaki } from '../src/state/HakiProvider';
import { todayKey } from '../src/domain/date';
import { radius, space, type } from '../src/theme/tokens';
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
  const { read, t, refresh, palette } = useHaki();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [energy, setEnergy] = useState<number | null>(read?.energy ?? null);
  const [mood, setMood] = useState<number | null>(read?.mood ?? null);
  const [clarity, setClarity] = useState<number | null>(read?.clarity ?? null);
  const [tension, setTension] = useState<number | null>(read?.tension ?? null);
  const [sleep, setSleep] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const nights = await recentSleep(db, 1, todayKey());
      if (nights[0]) setSleep(String(nights[0].hours));
    })();
  }, [db]);

  const remaining = [energy, mood, clarity, tension].filter((v) => v === null).length;
  const complete = remaining === 0;

  async function save() {
    if (saving) return;
    if (energy === null || mood === null || clarity === null || tension === null) return;
    setSaving(true);
    try {
      await saveRead(db, { energy, mood, clarity, tension });

      const hours = Number.parseFloat(sleep.replace(',', '.'));
      if (Number.isFinite(hours) && hours >= 0 && hours <= 24) {
        await saveSleep(db, hours);
      }

      play('observationRead');
      await refresh();
      router.back();
    } finally {
      setSaving(false);
    }
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
          onChange={setEnergy}
          accent={palette.violet}
        />
        <Dial label={t.dials.mood} value={mood} onChange={setMood} accent={palette.violet} />
        <Dial
          label={t.dials.clarity}
          value={clarity}
          onChange={setClarity}
          accent={palette.cyan}
        />
        <Dial
          label={t.dials.tension}
          value={tension}
          onChange={setTension}
          inverted
          accent={palette.crimson}
        />

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
          disabled={!complete || saving}
          style={({ pressed }) => [
            styles.save,
            (!complete || saving) && styles.saveDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.saveText}>
            {complete ? 'Save' : `${remaining} ${remaining === 1 ? 'dial' : 'dials'} to go`}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.bg },
    content: { padding: space.lg, gap: space.xl, paddingBottom: space.xxxl },

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
    pressed: { opacity: 0.75 },
  });
